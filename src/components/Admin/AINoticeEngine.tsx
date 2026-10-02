import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Brain, Filter, Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from "react-markdown";

type Tone = "professional" | "urgent" | "friendly";

const AINoticeEngine = () => {
  const { schoolId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [intent, setIntent] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [yearFilter, setYearFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [versionFilter, setVersionFilter] = useState("all");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const years = Array.from({ length: 25 }, (_, i) => 2020 + i);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("classes").select("*, sections(*)").eq("school_id", schoolId).order("numeric_level");
      return data || [];
    },
    enabled: !!schoolId,
  });

  const filteredClasses = classes.filter((c: any) => {
    if (yearFilter !== "all" && String(c.academic_year) !== yearFilter) return false;
    if (shiftFilter !== "all" && c.shift !== shiftFilter) return false;
    if (versionFilter !== "all" && c.version !== versionFilter) return false;
    return true;
  });

  const selectedClassData = classes.find((c: any) => c.id === classFilter);
  const sections = selectedClassData?.sections || [];

  const handleGenerate = async () => {
    if (!intent.trim()) {
      toast({ title: "Message intent is required", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent("");

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-notice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            intent,
            tone,
            target: {
              year: yearFilter === "all" ? null : yearFilter,
              class: classFilter === "all" ? null : filteredClasses.find((c: any) => c.id === classFilter)?.class_name,
              shift: shiftFilter === "all" ? null : shiftFilter,
              section: sectionFilter === "all" ? null : sections.find((s: any) => s.id === sectionFilter)?.section_name,
              version: versionFilter === "all" ? null : versionFilter,
            },
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Generation failed");
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setGeneratedContent(fullContent);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendNotice = async () => {
    if (!generatedContent.trim()) {
      toast({ title: "Generate content first", variant: "destructive" });
      return;
    }
    setIsSending(true);
    try {
      const titleMatch = generatedContent.match(/#+\s*(.+?)[\n\r]/);
      const title = titleMatch ? titleMatch[1].replace(/\*+/g, "").trim() : intent.slice(0, 100);

      const { error } = await supabase.from("notices").insert({
        title,
        content: generatedContent,
        school_id: schoolId,
        posted_by: user?.id,
      } as any);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["notices"] });
      toast({ title: "Notice sent successfully!" });
      setIntent("");
      setGeneratedContent("");
    } catch (e: any) {
      toast({ title: "Error sending notice", description: e.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendManual = () => {
    if (!intent.trim()) {
      toast({ title: "Write your notice content first", variant: "destructive" });
      return;
    }
    setGeneratedContent(intent);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-navy p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black font-heading uppercase tracking-wide text-white">
              AI Notice Engine
            </h1>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Cognitive Communication Suite
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Intent + Tone */}
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Message Intent
            </label>
            <Textarea
              placeholder="e.g. Results declaration for first term 2026..."
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={7}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Emotional Resonance
            </label>
            <div className="inline-flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              {(["professional", "urgent", "friendly"] as Tone[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-colors ${
                    tone === t
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Target + Actions */}
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Filter className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Target Demographic</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cycle Year</label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Academic Level</label>
                <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setSectionFilter("all"); }}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {filteredClasses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shift</label>
                <Select value={shiftFilter} onValueChange={setShiftFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Section / Group</label>
                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.section_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Medium / Version</label>
              <Select value={versionFilter} onValueChange={setVersionFilter}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Versions</SelectItem>
                  <SelectItem value="bangla">Bangla</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !intent.trim()}
              className="w-full gap-2 h-12 bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
              variant="outline"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="text-xs font-bold uppercase tracking-widest">
                {isGenerating ? "Generating..." : "Generate Content"}
              </span>
            </Button>

            <Button
              onClick={handleSendManual}
              className="w-full gap-2 h-12"
              disabled={!intent.trim()}
            >
              <Send className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Send Manual Notice</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Generated Content Preview */}
      {generatedContent && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Generated Notice</h3>
              </div>
              <Button onClick={handleSendNotice} disabled={isSending} size="sm" className="gap-2">
                <Send className="h-3.5 w-3.5" />
                {isSending ? "Sending..." : "Post This Notice"}
              </Button>
            </div>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{generatedContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AINoticeEngine;
