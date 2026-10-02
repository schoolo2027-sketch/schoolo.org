import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Edit, Trash2, BookOpen, Layers,
  Pencil, Sparkles, Filter, Folder, FolderOpen, Award, CheckCircle2, Info
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import SubjectSetupDialog from "./SubjectSetupDialog";
import {
  getSubjectsForClass,
  isGroupBasedClass,
  isLowerClass,
  ALL_CLASSES,
  LOWER_CLASSES,
  UPPER_CLASSES,
  getClassGroupDetails,
  getOptionalSubjectOptions,
  getGroupFourthSubjects,
  getGroupCoreSubjects,
  getCombinedSubjects
} from "@/utils/subjectConfig";

interface ClassForm {
  class_name: string;
  shift: string;
  version: string;
  academic_year: number;
}

const emptyForm: ClassForm = {
  class_name: "", shift: "morning", version: "bangla", academic_year: 2026,
};

const ClassesPage = () => {
  const { schoolId, roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("classes");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sectionDialog, setSectionDialog] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ClassForm>(emptyForm);

  // Subject Setup states
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [editingSubjectSetup, setEditingSubjectSetup] = useState<any>(null);
  const [subjectFilterClass, setSubjectFilterClass] = useState<string>("Class 9");
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>("all");
  const [groupSubView, setGroupSubView] = useState<"all" | "core" | "fourth">("all");
  const [subjectSearch, setSubjectSearch] = useState<string>("");
  const [subjectToDelete, setSubjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [clearConfirmDialog, setClearConfirmDialog] = useState<{
    open: boolean;
    type: "class" | "all";
    count: number;
    title: string;
    description: string;
    ids: string[];
  } | null>(null);

  const canManage = roles.some(r => ["master_admin", "school_admin"].includes(r));

  // Query Classes
  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from("classes")
        .select("*, sections(*)")
        .eq("school_id", schoolId)
        .order("class_name");
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  // Query Custom Subject Setups
  const { data: subjectSetups = [], isLoading: isSubjectsLoading } = useQuery({
    queryKey: ["subject-setups", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from("subject_setups" as any)
        .select("*")
        .eq("school_id", schoolId)
        .order("subject_name");
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!schoolId,
  });

  // Class Mutations
  const createMutation = useMutation({
    mutationFn: async (f: ClassForm) => {
      if (!schoolId) throw new Error("No school");
      const { error } = await supabase.from("classes").insert({
        school_id: schoolId, class_name: f.class_name, shift: f.shift as any,
        version: f.version as any, academic_year: f.academic_year,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({ title: "Class created successfully" });
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: ClassForm }) => {
      const { error } = await supabase.from("classes").update({
        class_name: f.class_name, shift: f.shift as any,
        version: f.version as any, academic_year: f.academic_year,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({ title: "Class updated successfully" });
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({ title: "Class deleted successfully" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addSectionMutation = useMutation({
    mutationFn: async ({ classId, name }: { classId: string; name: string }) => {
      if (!schoolId) throw new Error("No school");
      const { error } = await supabase.from("sections").insert({ school_id: schoolId, class_id: classId, section_name: name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast({ title: "Section added successfully" });
      setSectionDialog(null);
      setSectionName("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Subject Setup Delete Mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subject_setups" as any).delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-setups"] });
      setSubjectToDelete(null);
      toast({ title: "Subject configuration deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Bulk Delete Subject Setups
  const deleteMultipleSubjectsMutation = useMutation({
    mutationFn: async ({ ids, label }: { ids: string[]; label: string }) => {
      if (!ids || ids.length === 0) return { count: 0, label };
      const { error } = await supabase.from("subject_setups" as any).delete().in("id", ids);
      if (error) throw error;
      return { count: ids.length, label };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["subject-setups"] });
      setClearConfirmDialog(null);
      toast({
        title: "Subjects removed successfully",
        description: `Removed ${res?.count} subject(s) (${res?.label}). No subjects are pre-added.`,
      });
    },
    onError: (e: any) => toast({ title: "Error deleting subjects", description: e.message, variant: "destructive" }),
  });

  // Automatically clean up any corrupt blank/empty subject rows in database
  useEffect(() => {
    if (!schoolId || !subjectSetups || subjectSetups.length === 0) return;
    const blankIds = (subjectSetups as any[])
      .filter((ss: any) => !ss.subject_name || ss.subject_name.trim() === "")
      .map((ss: any) => ss.id);
    if (blankIds.length > 0) {
      supabase
        .from("subject_setups" as any)
        .delete()
        .in("id", blankIds)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["subject-setups"] });
        });
    }
  }, [schoolId, subjectSetups, queryClient]);

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({ class_name: c.class_name, shift: c.shift, version: c.version, academic_year: c.academic_year });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.class_name.trim()) { toast({ title: "Class name is required", variant: "destructive" }); return; }
    if (editId) updateMutation.mutate({ id: editId, f: form });
    else createMutation.mutate(form);
  };

  const filteredClasses = (classes || []).filter((c: any) =>
    (c?.class_name || "").toLowerCase().includes(search.toLowerCase())
  );

  // Subject tab calculations
  const isSelectedUpperClass = isGroupBasedClass(subjectFilterClass);

  // Configured subjects for the selected class from database
  const classConfiguredSetups = useMemo(() => {
    const cls = (subjectFilterClass || "").trim().toLowerCase();
    return ((subjectSetups as any[]) || []).filter((ss: any) => {
      if (!ss.subject_name || !ss.subject_name.trim()) return false;
      const classesArr: string[] = Array.isArray(ss.classes)
        ? ss.classes
        : typeof ss.classes === "string"
        ? [ss.classes]
        : [];
      return classesArr.some((c: string) => (c || "").trim().toLowerCase() === cls);
    });
  }, [subjectSetups, subjectFilterClass]);

  // Filtered by selected group tab
  const activeClassSubjects = useMemo(() => {
    const list = classConfiguredSetups.map((ss: any) => {
      const secs: string[] = Array.isArray(ss.sections)
        ? ss.sections
        : typeof ss.sections === "string"
        ? [ss.sections]
        : [];

      let groupLabel = "Combined / Common";
      if (secs.some((s: string) => s.toLowerCase() === "science")) groupLabel = "Science";
      else if (secs.some((s: string) => s.toLowerCase().includes("business"))) groupLabel = "Business Studies";
      else if (secs.some((s: string) => s.toLowerCase().includes("humanities") || s.toLowerCase().includes("arts"))) groupLabel = "Humanities";
      else if (secs.length > 0) groupLabel = secs.join(", ");

      return {
        id: ss.id,
        name: ss.subject_name?.trim() || "Unnamed Subject",
        fullMarks: ss.full_marks || 100,
        group: groupLabel,
        sections: secs,
        isOptional: !!ss.is_optional,
        rawSetup: ss,
      };
    });

    if (!isSelectedUpperClass) {
      return list;
    }

    // Filter by group tab
    if (selectedGroupTab === "common") {
      return list.filter(s => s.group === "Combined / Common" || s.sections.length === 0);
    }
    if (selectedGroupTab === "science") {
      const sciList = list.filter(s => s.sections.some((sec: string) => sec.toLowerCase() === "science") || (s.group === "Combined / Common" && !s.isOptional));
      if (groupSubView === "core") {
        return sciList.filter(s => !s.isOptional);
      }
      if (groupSubView === "fourth") {
        return list.filter(s => s.isOptional && s.sections.some((sec: string) => sec.toLowerCase() === "science"));
      }
      return sciList;
    }
    if (selectedGroupTab === "business") {
      const busList = list.filter(s => s.sections.some((sec: string) => sec.toLowerCase().includes("business")) || (s.group === "Combined / Common" && !s.isOptional));
      if (groupSubView === "core") {
        return busList.filter(s => !s.isOptional);
      }
      if (groupSubView === "fourth") {
        return list.filter(s => s.isOptional && s.sections.some((sec: string) => sec.toLowerCase().includes("business")));
      }
      return busList;
    }
    if (selectedGroupTab === "humanities") {
      const humList = list.filter(s => s.sections.some((sec: string) => sec.toLowerCase().includes("humanities") || sec.toLowerCase().includes("arts")) || (s.group === "Combined / Common" && !s.isOptional));
      if (groupSubView === "core") {
        return humList.filter(s => !s.isOptional);
      }
      if (groupSubView === "fourth") {
        return list.filter(s => s.isOptional && s.sections.some((sec: string) => sec.toLowerCase().includes("humanities") || sec.toLowerCase().includes("arts")));
      }
      return humList;
    }
    if (selectedGroupTab === "optional") {
      return list.filter(s => s.isOptional);
    }

    return list;
  }, [classConfiguredSetups, isSelectedUpperClass, selectedGroupTab, groupSubView]);

  const filteredCurriculumSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return activeClassSubjects;
    return activeClassSubjects.filter(s =>
      s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
      (s.group && s.group.toLowerCase().includes(subjectSearch.toLowerCase()))
    );
  }, [activeClassSubjects, subjectSearch]);

  // Count configured subjects for this class
  const classConfiguredCount = classConfiguredSetups.length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> Classes & Subject Setup
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage academic classes, class sections, NCTB curriculum subject rules, and 4th/Optional subjects.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setEditingSubjectSetup({
                  subject_name: "",
                  classes: [subjectFilterClass],
                  sections: [],
                  class_group: isSelectedUpperClass ? "9_10" : "play_8",
                  full_marks: 100,
                  cq_total: 70, cq_pass: 23,
                  mcq_total: 30, mcq_pass: 10,
                  practical_enabled: false, practical_total: 0, practical_pass: 0,
                  ct_enabled: false, ct_total: 0,
                  mt_enabled: false, mt_total: 0,
                  is_optional: selectedGroupTab === "optional",
                });
                setSubjectDialogOpen(true);
              }}
              variant="outline"
              className="gap-1.5 h-9 text-xs"
            >
              <Sparkles className="h-4 w-4 text-amber-500" /> Setup Subject
            </Button>
            <Button
              onClick={() => { setEditId(null); setForm(emptyForm); setDialogOpen(true); }}
              className="gap-1.5 h-9 text-xs bg-primary shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Class
            </Button>
          </div>
        )}
      </div>

      {/* Main Mode Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="bg-muted p-1 rounded-xl grid grid-cols-2 max-w-md h-10">
          <TabsTrigger value="classes" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background">
            <Layers className="h-3.5 w-3.5 mr-1.5" /> Classes & Sections
          </TabsTrigger>
          <TabsTrigger value="subjects" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" /> Subject Setup (Play – Class 12)
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: CLASSES & SECTIONS ================= */}
        <TabsContent value="classes" className="space-y-4 mt-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {isClassesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-7 w-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="stat-card text-center py-12 space-y-2">
              <p className="text-muted-foreground text-sm">No classes found.</p>
              {canManage && (
                <Button size="sm" onClick={() => { setEditId(null); setForm(emptyForm); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Your First Class
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map((c: any) => {
                const standardSubs = getSubjectsForClass(c.class_name);
                const configuredForClass = subjectSetups.filter((ss: any) =>
                  (ss.classes || []).some((cls: string) => cls.toLowerCase() === c.class_name.toLowerCase())
                );

                return (
                  <div key={c.id} className="stat-card p-4 flex flex-col justify-between border hover:border-primary/40 transition-all shadow-sm">
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                            {c.class_name}
                            {isGroupBasedClass(c.class_name) && (
                              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                                SSC/HSC Groups
                              </Badge>
                            )}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="capitalize">{c.shift} Shift</span>
                            <span>&bull;</span>
                            <span className="capitalize">{c.version} Version</span>
                            <span>&bull;</span>
                            <span>{c.academic_year}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sections List */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-muted-foreground">Sections / Groups</span>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-xs text-primary font-medium"
                              onClick={() => { setSectionDialog(c.id); setSectionName(""); }}
                            >
                              + Add Section
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                          {(c.sections || []).length === 0 ? (
                            <span className="text-xs text-muted-foreground/60 italic">No custom sections added</span>
                          ) : (
                            c.sections.map((s: any) => (
                              <Badge key={s.id} variant="secondary" className="text-xs font-medium">
                                {s.section_name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Subjects Overview Badge for this Class */}
                      <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between mb-3 text-xs">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <span className="font-medium text-foreground">
                              {standardSubs.length > 0 ? `${standardSubs.length} Curriculum Subjects` : "Curriculum Subjects"}
                            </span>
                            {configuredForClass.length > 0 && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                                &bull; {configuredForClass.length} Custom Rule{configuredForClass.length > 1 ? 's' : ''} Configured
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2 text-primary hover:text-primary hover:bg-primary/15 font-semibold"
                          onClick={() => {
                            setSubjectFilterClass(c.class_name);
                            setActiveTab("subjects");
                          }}
                        >
                          Manage &rarr;
                        </Button>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    {canManage && (
                      <div className="flex items-center justify-between pt-3 border-t border-border/60">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => {
                            setEditingSubjectSetup({
                              subject_name: "",
                              classes: [c.class_name],
                              sections: [],
                              class_group: isGroupBasedClass(c.class_name) ? "9_10" : "play_8",
                              full_marks: 100,
                              cq_total: 70, cq_pass: 23,
                              mcq_total: 30, mcq_pass: 10,
                              practical_enabled: false, practical_total: 0, practical_pass: 0,
                              ct_enabled: false, ct_total: 0,
                              mt_enabled: false, mt_total: 0,
                              is_optional: false,
                            });
                            setSubjectDialogOpen(true);
                          }}
                        >
                          <Sparkles className="h-3 w-3 text-amber-500" /> Setup Subject
                        </Button>

                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(c)} title="Edit Class">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(c.id)} title="Delete Class">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ================= TAB 2: SUBJECT SETUP (PLAY TO CLASS 12) ================= */}
        <TabsContent value="subjects" className="space-y-5 mt-0">
          {/* Class Folder Grid (Play to Class 12) */}
          <div className="stat-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Folder className="h-4 w-4 text-amber-500" /> Select Class Folder (Play – Class 12)
              </span>
              <span className="text-[11px] text-muted-foreground">Click any class folder to inspect and configure mark rules</span>
            </div>

            {/* Folder Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-8 gap-2">
              {ALL_CLASSES.map(cls => {
                const isSelected = subjectFilterClass === cls;
                const isUpper = isGroupBasedClass(cls);
                const classRulesCount = subjectSetups.filter((ss: any) =>
                  (ss.classes || []).some((c: string) => c.toLowerCase() === cls.toLowerCase())
                ).length;

                return (
                  <button
                    key={cls}
                    onClick={() => {
                      setSubjectFilterClass(cls);
                      setSelectedGroupTab("all");
                    }}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                        : "bg-background hover:bg-muted/60 border-border text-foreground hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      {isSelected ? (
                        <FolderOpen className="h-4 w-4 text-primary-foreground" />
                      ) : (
                        <Folder className="h-4 w-4 text-amber-500" />
                      )}
                      {classRulesCount > 0 && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}>
                          {classRulesCount} rule{classRulesCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold truncate w-full">{cls}</span>
                    <span className={`text-[10px] ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {isUpper ? "Group System" : "Single Subjects"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upper Classes Group Sub-Tabs (Class 9-12) */}
          {isSelectedUpperClass && (
            <div className="stat-card p-3 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> {subjectFilterClass} Group & Optional Folders
                </span>
                <span className="text-[11px] text-muted-foreground">Select a group folder to filter subjects</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={selectedGroupTab === "all" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  onClick={() => { setSelectedGroupTab("all"); setGroupSubView("all"); }}
                >
                  📁 All Subjects
                </Button>
                <Button
                  type="button"
                  variant={selectedGroupTab === "common" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  onClick={() => { setSelectedGroupTab("common"); setGroupSubView("all"); }}
                >
                  📂 Combined / Common (All Groups)
                </Button>
                <Button
                  type="button"
                  variant={selectedGroupTab === "science" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  onClick={() => { setSelectedGroupTab("science"); setGroupSubView("all"); }}
                >
                  🧪 Science
                </Button>
                <Button
                  type="button"
                  variant={selectedGroupTab === "business" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  onClick={() => { setSelectedGroupTab("business"); setGroupSubView("all"); }}
                >
                  💼 Business Studies
                </Button>
                <Button
                  type="button"
                  variant={selectedGroupTab === "humanities" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  onClick={() => { setSelectedGroupTab("humanities"); setGroupSubView("all"); }}
                >
                  🎨 Arts / Humanities
                </Button>
                <Button
                  type="button"
                  variant={selectedGroupTab === "optional" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs font-semibold border-amber-400 text-amber-900 dark:text-amber-300"
                  onClick={() => { setSelectedGroupTab("optional"); setGroupSubView("all"); }}
                >
                  ⭐ All 4th / Optional Subjects
                </Button>
              </div>

              {/* Group-specific sub-folders (Core Subjects vs 4th Subject Folder) */}
              {["science", "business", "humanities"].includes(selectedGroupTab) && (
                <div className="pt-2 border-t border-border/50 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                    📂 {selectedGroupTab === "science" ? "Science" : selectedGroupTab === "business" ? "Business Studies" : "Humanities"} Folders:
                  </span>
                  <Button
                    type="button"
                    variant={groupSubView === "all" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs font-medium"
                    onClick={() => setGroupSubView("all")}
                  >
                    📁 All Group Subjects
                  </Button>
                  <Button
                    type="button"
                    variant={groupSubView === "core" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs font-medium"
                    onClick={() => setGroupSubView("core")}
                  >
                    🔬 Group Core Subjects
                  </Button>
                  <Button
                    type="button"
                    variant={groupSubView === "fourth" ? "default" : "outline"}
                    size="sm"
                    className={`h-7 text-xs font-bold gap-1.5 ${
                      groupSubView === "fourth"
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "border-amber-400 text-amber-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    }`}
                    onClick={() => setGroupSubView("fourth")}
                  >
                    ⭐ {selectedGroupTab === "science" ? "Science" : selectedGroupTab === "business" ? "Business Studies" : "Humanities"} 4th Subject Folder
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Group 4th Subject Folder Active Banner */}
          {isSelectedUpperClass && ["science", "business", "humanities"].includes(selectedGroupTab) && groupSubView === "fourth" && (
            <div className="p-4 rounded-xl border border-amber-400/80 bg-amber-500/10 dark:bg-amber-950/30 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-600 text-white font-bold text-xs uppercase">
                    ⭐ 4th Subject Folder
                  </Badge>
                  <span className="font-bold text-sm text-foreground">
                    {selectedGroupTab === "science" ? "Science" : selectedGroupTab === "business" ? "Business Studies" : "Humanities"} Group 4th Subject Folder
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Subjects in this folder can be selected as the 4th subject by <strong>{selectedGroupTab === "science" ? "Science" : selectedGroupTab === "business" ? "Business Studies" : "Humanities"}</strong> students. Total Subject Formula: <strong>Combined + Group Core + Selected 4th Subject</strong>.
                </p>
              </div>

              {canManage && (
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 shrink-0"
                  onClick={() => {
                    const groupName = selectedGroupTab === "science" ? "Science" : selectedGroupTab === "business" ? "Business Studies" : "Humanities";
                    setEditingSubjectSetup({
                      subject_name: "",
                      classes: [subjectFilterClass],
                      sections: [groupName],
                      class_group: isSelectedUpperClass ? "9_10" : "play_8",
                      full_marks: 100,
                      cq_total: 70, cq_pass: 23,
                      mcq_total: 30, mcq_pass: 10,
                      practical_enabled: false, practical_total: 0, practical_pass: 0,
                      ct_enabled: false, ct_total: 0,
                      mt_enabled: false, mt_total: 0,
                      is_optional: true,
                    });
                    setSubjectDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Add 4th Subject to this Group
                </Button>
              )}
            </div>
          )}

          {/* Search & Actions Bar */}
          <div className="stat-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={`Search in ${subjectFilterClass}...`}
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="h-9 pl-8 text-xs w-[220px]"
                />
              </div>
              <span className="text-xs text-muted-foreground">
                Showing {filteredCurriculumSubjects.length} subjects for <strong>{subjectFilterClass}</strong>
              </span>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                {classConfiguredCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                    onClick={() => {
                      const ids = classConfiguredSetups.map((s: any) => s.id);
                      setClearConfirmDialog({
                        open: true,
                        type: "class",
                        count: ids.length,
                        title: `Clear all subjects for ${subjectFilterClass}?`,
                        description: `This will remove all ${ids.length} configured subjects from ${subjectFilterClass}. No subjects will remain pre-added for this class.`,
                        ids,
                      });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear All for {subjectFilterClass} ({classConfiguredCount})
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setEditingSubjectSetup({
                      subject_name: "",
                      classes: [subjectFilterClass],
                      sections: selectedGroupTab === "science" ? ["Science"] : selectedGroupTab === "business" ? ["Business Studies"] : selectedGroupTab === "humanities" ? ["Humanities"] : [],
                      class_group: isSelectedUpperClass ? "9_10" : "play_8",
                      full_marks: 100,
                      cq_total: 70, cq_pass: 23,
                      mcq_total: 30, mcq_pass: 10,
                      practical_enabled: false, practical_total: 0, practical_pass: 0,
                      ct_enabled: false, ct_total: 0,
                      mt_enabled: false, mt_total: 0,
                      is_optional: selectedGroupTab === "optional" || groupSubView === "fourth",
                    });
                    setSubjectDialogOpen(true);
                  }}
                  className="h-9 text-xs gap-1.5 bg-primary shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Setup Subject for {subjectFilterClass}
                </Button>
              </div>
            )}
          </div>

          {/* Special Result Logic Note for Class 9-10 & 11-12 */}
          {isSelectedUpperClass && (
            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-2.5 text-xs text-foreground">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-primary block">
                  {subjectFilterClass} Result & Board Grading Rules:
                </span>
                <p className="text-muted-foreground">
                  <strong>Bangla:</strong> Bangla 1st and 2nd papers are passed/failed separately, but the combined average forms a single "Bangla" GPA in final results.<br />
                  <strong>English:</strong> English 1st and 2nd papers are passed/failed separately, combined average forms a single "English" GPA.<br />
                  <strong>4th Subject (Optional Subject):</strong> Grade points above 2.00 are added as bonus points to overall GPA. Failing this subject does not cause overall result failure.
                </p>
              </div>
            </div>
          )}

          {/* Configured Subjects Table */}
          <div className="stat-card overflow-x-auto p-0 border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-12 text-center text-xs font-bold uppercase">#</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Subject Name</TableHead>
                  <TableHead className="text-xs font-bold uppercase">Group / Scope</TableHead>
                  <TableHead className="text-center text-xs font-bold uppercase">Full Marks</TableHead>
                  <TableHead className="text-center text-xs font-bold uppercase">Marks Breakdown (CQ / MCQ / Prac / CT / MT)</TableHead>
                  <TableHead className="text-center text-xs font-bold uppercase">Type</TableHead>
                  {canManage && (
                    <TableHead className="text-right text-xs font-bold uppercase w-32">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isSubjectsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredCurriculumSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="max-w-md mx-auto space-y-3">
                        <BookOpen className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            {classConfiguredCount === 0
                              ? `No subjects configured for ${subjectFilterClass} yet.`
                              : `No subjects matching "${selectedGroupTab}" group filter in ${subjectFilterClass}.`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {classConfiguredCount === 0
                              ? "Add subjects one by one to configure marks and group rules for this class."
                              : "Switch group tabs or click below to add a new subject."}
                          </p>
                        </div>
                        {canManage && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setEditingSubjectSetup({
                                subject_name: "",
                                classes: [subjectFilterClass],
                                sections: selectedGroupTab === "science" ? ["Science"] : selectedGroupTab === "business" ? ["Business Studies"] : selectedGroupTab === "humanities" ? ["Humanities"] : [],
                                class_group: isSelectedUpperClass ? "9_10" : "play_8",
                                full_marks: 100,
                                cq_total: 70, cq_pass: 23,
                                mcq_total: 30, mcq_pass: 10,
                                practical_enabled: false, practical_total: 0, practical_pass: 0,
                                ct_enabled: false, ct_total: 0,
                                mt_enabled: false, mt_total: 0,
                                is_optional: selectedGroupTab === "optional" || groupSubView === "fourth",
                              });
                              setSubjectDialogOpen(true);
                            }}
                            className="h-8 text-xs gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" /> Setup Subject for {subjectFilterClass}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCurriculumSubjects.map((sub: any, idx: number) => {
                    const setup = sub.rawSetup;
                    const fullMarks = setup?.full_marks || sub.fullMarks || 100;
                    const isOpt = sub.isOptional;

                    return (
                      <TableRow key={`${sub.id || sub.name}-${idx}`} className="hover:bg-muted/20">
                        <TableCell className="text-center text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                        <TableCell className="font-semibold text-sm">
                          <div className="flex items-center gap-2">
                            <span>{sub.name}</span>
                            {isOpt && (
                              <Badge variant="secondary" className="text-[10px] h-4.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                                4th Subject
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${
                            sub.group === "Combined / Common" || sub.group === "Common" ? "bg-primary/10 text-primary" :
                            sub.group === "Science" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                            sub.group === "Business Studies" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
                            sub.group === "Humanities" ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {sub.group || "Combined / Common"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-bold text-foreground font-mono">
                          {fullMarks}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {setup ? (
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {setup.cq_total > 0 && <Badge variant="outline" className="text-[10px] font-mono">CQ: {setup.cq_total} (P: {setup.cq_pass})</Badge>}
                              {setup.mcq_total > 0 && <Badge variant="outline" className="text-[10px] font-mono">MCQ: {setup.mcq_total} (P: {setup.mcq_pass})</Badge>}
                              {setup.practical_enabled && <Badge variant="outline" className="text-[10px] font-mono bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">Prac: {setup.practical_total}</Badge>}
                              {setup.ct_enabled && <Badge variant="outline" className="text-[10px] font-mono">CT: {setup.ct_total}</Badge>}
                              {setup.mt_enabled && <Badge variant="outline" className="text-[10px] font-mono">MT: {setup.mt_total}</Badge>}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60 text-xs">Standard (Pass: 33%)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isOpt ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                              Optional (4th)
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                              Compulsory
                            </span>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {setup && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                    onClick={() => {
                                      setEditingSubjectSetup(setup);
                                      setSubjectDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" /> Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      setSubjectToDelete({ id: setup.id, name: sub.name?.trim() || "Unnamed Subject" });
                                    }}
                                    title="Delete Subject"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* School-wide Custom Setups Table */}
          {subjectSetups.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                  <span>All Custom Configured Rules in Institution</span>
                  <Badge variant="secondary" className="text-xs">{subjectSetups.length}</Badge>
                </h3>
                {canManage && subjectSetups.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                    onClick={() => {
                      const ids = (subjectSetups as any[]).map((s: any) => s.id);
                      setClearConfirmDialog({
                        open: true,
                        type: "all",
                        count: ids.length,
                        title: "Delete all pre-added subjects in the school?",
                        description: `This will delete all ${ids.length} custom configured subjects across all classes in the institution. You will have a clean slate with 0 subjects.`,
                        ids,
                      });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear All Pre-Added Subjects ({subjectSetups.length})
                  </Button>
                )}
              </div>

              <div className="stat-card overflow-x-auto p-0 border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-bold uppercase">Subject</TableHead>
                      <TableHead className="text-xs font-bold uppercase">Applicable Classes</TableHead>
                      <TableHead className="text-center text-xs font-bold uppercase">Full Marks</TableHead>
                      <TableHead className="text-center text-xs font-bold uppercase">CQ / MCQ / Prac</TableHead>
                      <TableHead className="text-center text-xs font-bold uppercase">Optional (4th)</TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectSetups.map((ss: any) => (
                      <TableRow key={ss.id} className="hover:bg-muted/20">
                        <TableCell className="font-bold text-xs">{ss.subject_name?.trim() || "(Unnamed Subject)"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(ss.classes || []).map((c: string) => (
                              <Badge key={c} variant="outline" className="text-[10px] px-1.5 py-0">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs">{ss.full_marks}</TableCell>
                        <TableCell className="text-center text-xs font-mono">
                          {ss.cq_total}/{ss.mcq_total}{ss.practical_enabled ? `/${ss.practical_total}` : ""}
                        </TableCell>
                        <TableCell className="text-center">
                          {ss.is_optional ? (
                            <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs">No</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditingSubjectSetup(ss);
                                setSubjectDialogOpen(true);
                              }}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => {
                                setSubjectToDelete({ id: ss.id, name: ss.subject_name?.trim() || "Unnamed Subject" });
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ================= DIALOGS ================= */}

      {/* Subject Setup Dialog */}
      <SubjectSetupDialog
        open={subjectDialogOpen}
        onOpenChange={(open) => {
          setSubjectDialogOpen(open);
          if (!open) setEditingSubjectSetup(null);
        }}
        editData={editingSubjectSetup}
      />

      {/* Class Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-heading">
              {editId ? "Edit Class" : "Add New Class"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class Name *</label>
              <Select value={form.class_name || "none"} onValueChange={v => setForm(p => ({ ...p, class_name: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Class</SelectItem>
                  {ALL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shift</label>
                <Select value={form.shift} onValueChange={v => setForm(p => ({ ...p, shift: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Version</label>
                <Select value={form.version} onValueChange={v => setForm(p => ({ ...p, version: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bangla">Bangla</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Academic Year</label>
              <Input
                type="number"
                value={form.academic_year}
                onChange={e => setForm(p => ({ ...p, academic_year: Number(e.target.value) || 2026 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId ? "Update Class" : "Create Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Section Dialog */}
      <Dialog open={!!sectionDialog} onOpenChange={(open) => !open && setSectionDialog(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-heading">Add Section / Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Section Name *</label>
              <Input
                placeholder="e.g. A, B, Science, Commerce..."
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSectionDialog(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => {
                if (!sectionName.trim() || !sectionDialog) return;
                addSectionMutation.mutate({ classId: sectionDialog, name: sectionName.trim() });
              }}
              disabled={addSectionMutation.isPending}
            >
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Class Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this class?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the class and its associated sections. Students and marks records linked to this class may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subject Setup Confirmation */}
      <AlertDialog open={!!subjectToDelete} onOpenChange={(open) => !open && setSubjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete custom rule for {subjectToDelete?.name || "Unnamed Subject"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this custom subject configuration rule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubjectMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSubjectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => subjectToDelete && deleteSubjectMutation.mutate(subjectToDelete.id)}
            >
              {deleteSubjectMutation.isPending ? "Deleting..." : "Delete Rule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Multiple / All Subjects Confirmation */}
      <AlertDialog open={!!clearConfirmDialog} onOpenChange={(open) => !open && setClearConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5 text-destructive" />
              {clearConfirmDialog?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm">
              <p>{clearConfirmDialog?.description}</p>
              <p className="font-semibold text-foreground">
                Confirming this action will delete all selected subjects so you can configure custom subjects from scratch. (All selected pre-added subjects will be deleted, leaving 0 subjects so you can add exactly what you need.)
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMultipleSubjectsMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMultipleSubjectsMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
              onClick={() => {
                if (clearConfirmDialog && clearConfirmDialog.ids.length > 0) {
                  deleteMultipleSubjectsMutation.mutate({
                    ids: clearConfirmDialog.ids,
                    label: clearConfirmDialog.type === "class" ? subjectFilterClass : "All School",
                  });
                }
              }}
            >
              {deleteMultipleSubjectsMutation.isPending ? "Deleting..." : `Yes, Delete All (${clearConfirmDialog?.count || 0})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ClassesPage;
