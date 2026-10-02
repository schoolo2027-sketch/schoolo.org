import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Layers, Sparkles, ChevronRight } from "lucide-react";
import { ALL_CLASSES, getSectionsForClass } from "@/utils/subjectConfig";

const getNextClass = (current: string): string => {
  const idx = ALL_CLASSES.findIndex(c => c === current);
  if (idx >= 0 && idx < ALL_CLASSES.length - 1) return ALL_CLASSES[idx + 1];
  return current;
};

const YEARS = Array.from({ length: 25 }, (_, i) => 2026 + i);
const SHIFTS: Array<"morning" | "day" | "evening"> = ["morning", "day", "evening"];
const VERSIONS: Array<"bangla" | "english"> = ["bangla", "english"];

const PromotionPage = () => {
  const { schoolId } = useAuth();
  const queryClient = useQueryClient();

  // Source filters
  const [srcYear, setSrcYear] = useState("2026");
  const [srcClassId, setSrcClassId] = useState("");
  const [srcShift, setSrcShift] = useState<string>("morning");
  const [srcSectionId, setSrcSectionId] = useState("");
  const [srcVersion, setSrcVersion] = useState<string>("bangla");

  // Target filters - use class NAME instead of ID
  const [tgtYear, setTgtYear] = useState("2027");
  const [tgtClassName, setTgtClassName] = useState("");
  const [tgtShift, setTgtShift] = useState<string>("morning");
  const [tgtSectionName, setTgtSectionName] = useState("");
  const [tgtVersion, setTgtVersion] = useState<string>("bangla");

  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Target section options based on selected target class name
  const tgtSectionOptions = tgtClassName ? getSectionsForClass(tgtClassName) : [];

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("classes").select("*").eq("school_id", schoolId);
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Source classes filtered by year/shift/version
  const srcClasses = useMemo(
    () => classes.filter(c => c.academic_year === Number(srcYear) && c.shift === srcShift && c.version === srcVersion),
    [classes, srcYear, srcShift, srcVersion]
  );

  // Fetch sections for source class
  const { data: srcSections = [] } = useQuery({
    queryKey: ["sections", srcClassId],
    queryFn: async () => {
      if (!srcClassId) return [];
      const { data } = await supabase.from("sections").select("*").eq("class_id", srcClassId);
      return data || [];
    },
    enabled: !!srcClassId,
  });

  // Fetch students for source
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["promotion-students", schoolId, srcClassId, srcSectionId],
    queryFn: async () => {
      if (!schoolId || !srcClassId) return [];
      let q = supabase
        .from("students")
        .select("*, classes(class_name, academic_year), sections(section_name)")
        .eq("school_id", schoolId)
        .eq("class_id", srcClassId)
        .eq("is_active", true);
      if (srcSectionId) q = q.eq("section_id", srcSectionId);
      const { data } = await q.order("roll", { ascending: true });
      return data || [];
    },
    enabled: !!schoolId && !!srcClassId,
  });

  // Auto-set target class name when source class changes
  useEffect(() => {
    if (srcClassId) {
      const srcClass = classes.find(c => c.id === srcClassId);
      if (srcClass) {
        setTgtClassName(getNextClass(srcClass.class_name));
      }
    }
    setSelected(new Set());
  }, [srcClassId, classes]);

  // Auto-set target year
  useEffect(() => {
    setTgtYear(String(Number(srcYear) + 1));
  }, [srcYear]);

  const toggleAll = () => {
    if (selected.size === students.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(students.map(s => s.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  // Helper: find or create class & section records
  const findOrCreateClassAndSection = async (): Promise<{ classId: string; sectionId: string | null }> => {
    if (!schoolId || !tgtClassName) throw new Error("Target class not selected");

    // Find existing class
    let classRecord = classes.find(
      c => c.class_name === tgtClassName && c.academic_year === Number(tgtYear) && c.shift === tgtShift && c.version === tgtVersion
    );

    // Create if not exists
    if (!classRecord) {
      const numericLevel = ALL_CLASSES.indexOf(tgtClassName);
      const { data, error } = await supabase.from("classes").insert({
        school_id: schoolId,
        class_name: tgtClassName,
        academic_year: Number(tgtYear),
        shift: tgtShift as any,
        version: tgtVersion as any,
        numeric_level: numericLevel >= 0 ? numericLevel : null,
      }).select().single();
      if (error) throw new Error("Failed to create target class: " + error.message);
      classRecord = data;
    }

    let sectionId: string | null = null;
    if (tgtSectionName) {
      // Find existing section
      const { data: existingSections } = await supabase.from("sections")
        .select("*")
        .eq("class_id", classRecord!.id)
        .eq("section_name", tgtSectionName);

      if (existingSections && existingSections.length > 0) {
        sectionId = existingSections[0].id;
      } else {
        // Create section
        const { data: newSection, error } = await supabase.from("sections").insert({
          school_id: schoolId,
          class_id: classRecord!.id,
          section_name: tgtSectionName,
        }).select().single();
        if (error) throw new Error("Failed to create target section: " + error.message);
        sectionId = newSection.id;
      }
    }

    return { classId: classRecord!.id, sectionId };
  };

  const promoteMutation = useMutation({
    mutationFn: async () => {
      if (!tgtClassName) throw new Error("Target class not selected");
      const { classId, sectionId } = await findOrCreateClassAndSection();
      const ids = Array.from(selected);
      const updates = ids.map(id =>
        supabase
          .from("students")
          .update({
            class_id: classId,
            section_id: sectionId,
          })
          .eq("id", id)
      );
      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw new Error(`${errors.length} students failed to promote`);
    },
    onSuccess: () => {
      toast({ title: "✅ Promotion Successful", description: `${selected.size} students promoted successfully.` });
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["promotion-students"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const srcClassName = classes.find(c => c.id === srcClassId)?.class_name || "";

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Student Promotion</h1>
        <p className="page-description">Promote students from one class to the next academic batch</p>
      </div>

      {/* Source & Target Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SOURCE */}
        <div className="rounded-xl p-4 sm:p-5 space-y-4" style={{ background: "hsl(var(--navy))" }}>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold tracking-widest uppercase text-sidebar-foreground">Source: Current Batch</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-sidebar-foreground/60 font-medium">Year</label>
              <Select value={srcYear} onValueChange={setSrcYear}>
                <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-sidebar-foreground/60 font-medium">Class</label>
              <Select value={srcClassId} onValueChange={setSrcClassId}>
                <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{srcClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-sidebar-foreground/60 font-medium">Shift</label>
              <Select value={srcShift} onValueChange={setSrcShift}>
                <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>{SHIFTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-sidebar-foreground/60 font-medium">Section</label>
              <Select value={srcSectionId || "all"} onValueChange={v => setSrcSectionId(v === "all" ? "" : v)}>
                <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {srcSections.map(s => <SelectItem key={s.id} value={s.id}>{s.section_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-sidebar-foreground/60 font-medium">Version</label>
              <Select value={srcVersion} onValueChange={setSrcVersion}>
                <SelectTrigger className="bg-sidebar-accent border-sidebar-border text-sidebar-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>{VERSIONS.map(v => <SelectItem key={v} value={v} className="capitalize">{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* TARGET */}
        <div className="rounded-xl p-4 sm:p-5 space-y-4 bg-primary">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary-foreground" />
            <h2 className="text-sm font-bold tracking-widest uppercase text-primary-foreground">Target: Next Batch</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-primary-foreground/70 font-medium">Promote to Year</label>
              <Select value={tgtYear} onValueChange={setTgtYear}>
                <SelectTrigger className="bg-primary-foreground/15 border-primary-foreground/20 text-primary-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-primary-foreground/70 font-medium">Target Class</label>
              <Select value={tgtClassName} onValueChange={setTgtClassName}>
                <SelectTrigger className="bg-primary-foreground/15 border-primary-foreground/20 text-primary-foreground"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{ALL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-primary-foreground/70 font-medium">Target Shift</label>
              <Select value={tgtShift} onValueChange={setTgtShift}>
                <SelectTrigger className="bg-primary-foreground/15 border-primary-foreground/20 text-primary-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>{SHIFTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-primary-foreground/70 font-medium">Target Section</label>
              <Select value={tgtSectionName || "all"} onValueChange={v => setTgtSectionName(v === "all" ? "" : v)}>
                <SelectTrigger className="bg-primary-foreground/15 border-primary-foreground/20 text-primary-foreground"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">No Section</SelectItem>
                  {tgtSectionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-primary-foreground/70 font-medium">Target Version</label>
              <Select value={tgtVersion} onValueChange={setTgtVersion}>
                <SelectTrigger className="bg-primary-foreground/15 border-primary-foreground/20 text-primary-foreground"><SelectValue /></SelectTrigger>
                <SelectContent>{VERSIONS.map(v => <SelectItem key={v} value={v} className="capitalize">{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Student Registry Table */}
      <div className="stat-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold font-heading text-base sm:text-lg uppercase tracking-wide">Student Registry</h3>
            <span className="text-xs sm:text-sm text-muted-foreground">({students.length} Students)</span>
          </div>
          <Button
            onClick={() => promoteMutation.mutate()}
            disabled={selected.size === 0 || !tgtClassName || promoteMutation.isPending}
            className="gap-2 w-full sm:w-auto"
          >
            <Sparkles className="h-4 w-4" />
            Promote {selected.size} Students
          </Button>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 px-2 w-10">
                  <Checkbox
                    checked={students.length > 0 && selected.size === students.length}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="text-left py-3 px-2 text-muted-foreground font-medium uppercase text-xs tracking-wider">Identity</th>
                <th className="text-center py-3 px-2 text-muted-foreground font-medium uppercase text-xs tracking-wider">Current Roll</th>
                <th className="text-center py-3 px-2 text-muted-foreground font-medium uppercase text-xs tracking-wider">Batch Info</th>
                <th className="text-right py-3 px-2 text-muted-foreground font-medium uppercase text-xs tracking-wider">Preview</th>
              </tr>
            </thead>
            <tbody>
              {studentsLoading ? (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Loading students...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">
                  {srcClassId ? "No students found in this batch" : "Select a source class to view students"}
                </td></tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2">
                      <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleOne(s.id)} />
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {s.student_name?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold uppercase text-sm">{s.student_name}</p>
                          {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="font-bold text-primary">#{s.roll || "—"}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{srcYear}</Badge>
                        <Badge variant="secondary" className="text-xs">{(s as any).classes?.class_name || srcClassName}</Badge>
                        <Badge variant="secondary" className="text-xs">{(s as any).sections?.section_name || "—"}</Badge>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm">
                        <span className="text-muted-foreground">{srcClassName}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-primary font-semibold">{tgtClassName || "—"}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PromotionPage;
