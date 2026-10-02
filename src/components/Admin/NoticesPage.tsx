import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, Bell, Calendar, Send, Sparkles, Loader2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImageUpload from "@/components/Common/ImageUpload";
import ReactMarkdown from "react-markdown";
import { useTeacherAssignedClasses } from "@/hooks/useTeacherAssignedClasses";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Tone = "professional" | "urgent" | "friendly";

const YEARS = Array.from({ length: 25 }, (_, i) => 2026 + i);
const CLASSES = ["Play", "Nursery", "KG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
const SHIFTS = ["Morning", "Day", "Evening"];
const VERSIONS = ["Bangla", "English"];

const getSectionsForClass = (cls: string): string[] => {
  const upper = ["Class 9", "Class 10", "Class 11", "Class 12"];
  if (upper.includes(cls)) return ["Science", "Business Studies", "Humanities"];
  return ["A", "B", "C"];
};

const NoticeFilters = ({
  year, setYear, cls, setCls, shift, setShift, section, setSection, version, setVersion,
}: {
  year: string; setYear: (v: string) => void;
  cls: string; setCls: (v: string) => void;
  shift: string; setShift: (v: string) => void;
  section: string; setSection: (v: string) => void;
  version: string; setVersion: (v: string) => void;
}) => {
  const sections = cls !== "all" ? getSectionsForClass(cls) : [];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wider">Target Filter</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cls} onValueChange={(v) => { setCls(v); setSection("all"); }}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={shift} onValueChange={setShift}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Shift" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shifts</SelectItem>
            {SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={section} onValueChange={setSection}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={version} onValueChange={setVersion}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Version" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Versions</SelectItem>
            {VERSIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const NoticesPage = () => {
  const { schoolId, roles, user, teacherPermissions } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Filter state (shared between manual & AI)
  const [yearFilter, setYearFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [versionFilter, setVersionFilter] = useState("all");

  // AI generation state
  const [activeTab, setActiveTab] = useState("manual");
  const [aiIntent, setAiIntent] = useState("");
  const [aiTone, setAiTone] = useState<Tone>("professional");
  const [isGenerating, setIsGenerating] = useState(false);

  const isMasterAdmin = roles.includes("master_admin");
  const isTeacher = roles.includes("teacher" as any);
  const canManage = roles.some(r => ["master_admin", "school_admin"].includes(r)) || (isTeacher && teacherPermissions.can_send_notices);
  const { assignedClassIds, isRestricted } = useTeacherAssignedClasses();

  const { data: schools = [] } = useQuery({
    queryKey: ["schools-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schools").select("id, school_name, school_code").eq("is_active", true).order("school_name");
      if (error) throw error;
      return data;
    },
    enabled: isMasterAdmin,
  });

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ["notices", schoolId, isMasterAdmin, user?.id],
    queryFn: async () => {
      let query = supabase.from("notices").select("*").order("created_at", { ascending: false });
      if (isMasterAdmin) {
        // Master admin only sees notices they sent
        if (user?.id) query = query.eq("posted_by", user.id);
      } else if (schoolId) {
        // Show only notices belonging to this school, or broadcasts that target this school
        query = query.or(`school_id.eq.${schoolId},and(is_broadcast.eq.true),and(target_schools.cs.{${schoolId}})`);
      }
      const { data, error } = await query;
      if (error) throw error;
      // For non-master users, filter broadcasts to only show those that actually target their school
      if (!isMasterAdmin && schoolId && data) {
        return data.filter((n: any) => {
          if (n.school_id === schoolId) return true;
          if (n.is_broadcast && (!n.target_schools || n.target_schools.length === 0)) return true;
          if (n.target_schools && n.target_schools.includes(schoolId)) return true;
          return false;
        });
      }
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (isMasterAdmin) {
        const { error } = await supabase.from("notices").insert({
          title, content, school_id: null, posted_by: user?.id,
          is_broadcast: isBroadcast, target_schools: isBroadcast ? [] : selectedSchools, image_url: imageUrl,
        } as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notices").insert({
          title, content, school_id: schoolId, posted_by: user?.id, image_url: imageUrl,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      toast({ title: "Notice posted" });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const updateData: any = { title, content, image_url: imageUrl };
      if (isMasterAdmin) {
        updateData.is_broadcast = isBroadcast;
        updateData.target_schools = isBroadcast ? [] : selectedSchools;
      }
      const { error } = await supabase.from("notices").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      toast({ title: "Notice updated" });
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notices"] });
      toast({ title: "Notice deleted" });
      setDeleteId(null);
    },
  });

  const resetForm = () => {
    setDialogOpen(false);
    setEditId(null);
    setTitle("");
    setContent("");
    setIsBroadcast(false);
    setSelectedSchools([]);
    setImageUrl(null);
    setAiIntent("");
    setIsGenerating(false);
    setActiveTab("manual");
  };

  const openEdit = (notice: any) => {
    setEditId(notice.id);
    setTitle(notice.title);
    setContent(notice.content);
    setIsBroadcast(notice.is_broadcast || false);
    setSelectedSchools(notice.target_schools || []);
    setImageUrl(notice.image_url || null);
    setActiveTab("manual");
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditId(null);
    setTitle("");
    setContent("");
    setIsBroadcast(false);
    setSelectedSchools([]);
    setImageUrl(null);
    setAiIntent("");
    setActiveTab("manual");
    setDialogOpen(true);
  };

  const toggleSchool = (id: string) => {
    setSelectedSchools(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const selectAllSchools = () => {
    if (selectedSchools.length === schools.length) setSelectedSchools([]);
    else setSelectedSchools(schools.map((s: any) => s.id));
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }
    if (isMasterAdmin && !isBroadcast && selectedSchools.length === 0) {
      toast({ title: "Select at least one school or use broadcast", variant: "destructive" });
      return;
    }
    if (editId) updateMutation.mutate(editId);
    else createMutation.mutate();
  };

  const handleAIGenerate = async () => {
    if (!aiIntent.trim()) {
      toast({ title: "Write what the notice is about", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
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
            intent: aiIntent,
            tone: aiTone,
            target: {
              year: yearFilter === "all" ? null : yearFilter,
              class: classFilter === "all" ? null : classFilter,
              shift: shiftFilter === "all" ? null : shiftFilter,
              section: sectionFilter === "all" ? null : sectionFilter,
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
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) fullContent += c;
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Extract title from generated content
      const titleMatch = fullContent.match(/#+\s*(.+?)[\n\r]/);
      const extractedTitle = titleMatch ? titleMatch[1].replace(/\*+/g, "").trim() : aiIntent.slice(0, 100);

      setTitle(extractedTitle);
      setContent(fullContent);
      setActiveTab("manual");
      toast({ title: "✅ Notice generated! Review and post." });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const getTargetLabel = (notice: any) => {
    if (notice.is_broadcast) return "All Schools";
    if (notice.target_schools && notice.target_schools.length > 0) {
      const names = notice.target_schools.map((id: string) => {
        const s = schools.find((sc: any) => sc.id === id);
        return s ? s.school_name : "Unknown";
      });
      return names.length <= 2 ? names.join(", ") : `${names.length} schools`;
    }
    return null;
  };

  const filtered = notices.filter((n: any) => n.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Notices</h1>
          <p className="page-description">
            {isMasterAdmin ? "Send notices to specific schools or broadcast to all." : "Create and broadcast school notices."}
          </p>
        </div>
        {canManage && (
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> {isMasterAdmin ? "Send Notice" : "Post Notice"}
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search notices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="stat-card flex items-center justify-center min-h-[200px]">
          <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card flex flex-col items-center justify-center min-h-[200px] gap-2">
          <Bell className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No notices found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((n: any) => (
            <div key={n.id} className="stat-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold font-heading text-lg">{n.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 mb-3">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                    {n.is_broadcast && <Badge variant="secondary" className="text-[10px]">📢 Broadcast</Badge>}
                    {isMasterAdmin && !n.is_broadcast && n.target_schools?.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">🎯 {getTargetLabel(n)}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{n.content}</ReactMarkdown>
                  </div>
                  {(n as any).image_url && (
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/documents/${(n as any).image_url}`}
                      alt="Notice"
                      className="mt-3 rounded-lg max-h-48 object-cover"
                    />
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(n)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(n.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog with AI Tab */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); else setDialogOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Notice" : isMasterAdmin ? "Send Notice to Schools" : "Post New Notice"}</DialogTitle>
          </DialogHeader>

          {!editId && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="gap-2">
                  <Send className="h-3.5 w-3.5" /> Manual
                </TabsTrigger>
                <TabsTrigger value="ai" className="gap-2">
                  <Sparkles className="h-3.5 w-3.5" /> AI Generate
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ai" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">What is the notice about? *</label>
                  <Textarea
                    placeholder="e.g. Results declaration for first term 2026, school will be closed for Eid vacation..."
                    value={aiIntent}
                    onChange={(e) => setAiIntent(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tone</label>
                  <div className="inline-flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                    {(["professional", "urgent", "friendly"] as Tone[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setAiTone(t)}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                          aiTone === t
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {!isMasterAdmin && (
                  <NoticeFilters
                    year={yearFilter} setYear={setYearFilter}
                    cls={classFilter} setCls={setClassFilter}
                    shift={shiftFilter} setShift={setShiftFilter}
                    section={sectionFilter} setSection={setSectionFilter}
                    version={versionFilter} setVersion={setVersionFilter}
                  />
                )}

                <Button
                  onClick={handleAIGenerate}
                  disabled={isGenerating || !aiIntent.trim()}
                  className="w-full gap-2"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isGenerating ? "Generating..." : "Generate Notice"}
                </Button>
              </TabsContent>

              <TabsContent value="manual" className="pt-2" />
            </Tabs>
          )}

          {/* Manual form - always visible when manual tab or editing */}
          {(activeTab === "manual" || editId) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input placeholder="Notice title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content *</label>
                <Textarea placeholder="Notice content..." value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
              </div>
              {content && (
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Preview</p>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                </div>
              )}
              {!isMasterAdmin && (
                <NoticeFilters
                  year={yearFilter} setYear={setYearFilter}
                  cls={classFilter} setCls={setClassFilter}
                  shift={shiftFilter} setShift={setShiftFilter}
                  section={sectionFilter} setSection={setSectionFilter}
                  version={versionFilter} setVersion={setVersionFilter}
                />
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Attach Image</label>
                <ImageUpload
                  bucket="documents"
                  currentUrl={imageUrl}
                  onUpload={(path) => setImageUrl(path)}
                  onRemove={() => setImageUrl(null)}
                  label="Upload Image"
                  fallback="📷"
                  size="sm"
                />
              </div>

              {isMasterAdmin && (
                <div className="space-y-3 border-t border-border pt-4">
                  <label className="text-sm font-semibold">Send To</label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="broadcast"
                      checked={isBroadcast}
                      onCheckedChange={(v) => { setIsBroadcast(!!v); if (v) setSelectedSchools([]); }}
                    />
                    <label htmlFor="broadcast" className="text-sm font-medium cursor-pointer">📢 Broadcast to All Schools</label>
                  </div>
                  {!isBroadcast && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{selectedSchools.length} of {schools.length} selected</span>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={selectAllSchools}>
                          {selectedSchools.length === schools.length ? "Deselect All" : "Select All"}
                        </Button>
                      </div>
                      <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
                        {schools.map((s: any) => (
                          <div key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 cursor-pointer border-b border-border last:border-0" onClick={() => toggleSchool(s.id)}>
                            <Checkbox checked={selectedSchools.includes(s.id)} />
                            <span className="text-sm">{s.school_name}</span>
                            {s.school_code && <span className="text-xs text-muted-foreground ml-auto">{s.school_code}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(activeTab === "manual" || editId) && (
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
                <Send className="h-4 w-4" />
                {editId ? "Update" : isMasterAdmin ? "Send" : "Post"} Notice
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notice?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NoticesPage;
