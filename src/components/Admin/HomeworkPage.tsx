import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, FileText, Calendar, Upload, X, Loader2, ImageIcon } from "lucide-react";
import { useTeacherAssignedClasses } from "@/hooks/useTeacherAssignedClasses";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CLASSES = ["Play", "Nursery", "KG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
const SHIFTS = ["morning", "day", "evening"] as const;
const VERSIONS = ["bangla", "english"] as const;
const YEARS = Array.from({ length: 25 }, (_, i) => 2026 + i);
const getSectionsForClass = (cls: string): string[] => {
  if (!cls) return [];
  const upper = ["Class 9", "Class 10", "Class 11", "Class 12"];
  if (upper.includes(cls)) return ["Science", "Business Studies", "Humanities"];
  return ["A", "B", "C"];
};

interface HWForm {
  title: string;
  description: string;
  class_id: string;
  section_id: string;
  deadline: string;
  image_url: string;
  form_year: string;
  form_class: string;
  form_shift: string;
  form_version: string;
  form_section: string;
}

const emptyForm: HWForm = { title: "", description: "", class_id: "", section_id: "", deadline: "", image_url: "", form_year: "", form_class: "", form_shift: "", form_version: "", form_section: "" };

const HomeworkPage = () => {
  const { schoolId, roles, user, teacherPermissions } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterVersion, setFilterVersion] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const getImageFullUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/homework-files/${path}`;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("homework-files").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      setForm(p => ({ ...p, image_url: path }));
      toast({ title: "Photo uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<HWForm>(emptyForm);

  const isAdmin = roles.some(r => ["master_admin", "school_admin"].includes(r));
  const isTeacher = roles.includes("teacher" as any);
  const canManage = isAdmin || (isTeacher && teacherPermissions.can_manage_homework);
  const { assignedClassIds, isRestricted } = useTeacherAssignedClasses();

  const { data: teacherProfile } = useQuery({
    queryKey: ["teacher-hw-profile", user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) return null;
      const { data } = await supabase.from("teachers").select("id").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: isTeacher && !!user?.id && !!schoolId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes", schoolId, assignedClassIds],
    queryFn: async () => {
      if (!schoolId) return [];
      let query = supabase.from("classes").select("*").eq("school_id", schoolId).order("class_name");
      if (isRestricted && assignedClassIds && assignedClassIds.length > 0) {
        query = query.in("id", assignedClassIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (isRestricted && assignedClassIds?.length === 0) ? [] : data || [];
    },
    enabled: !!schoolId,
  });

  const { data: dbSections = [] } = useQuery({
    queryKey: ["all-sections", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase.from("sections").select("*").eq("school_id", schoolId);
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  // Derive class_id and section_id from form selections
  const formMatchedClass = classes.find((c: any) =>
    c.class_name === form.form_class &&
    (!form.form_shift || c.shift === form.form_shift) &&
    (!form.form_version || c.version === form.form_version) &&
    (!form.form_year || c.academic_year === Number(form.form_year))
  );
  const derivedClassId = formMatchedClass?.id || "";
  const formSectionOptions = derivedClassId ? dbSections.filter((s: any) => s.class_id === derivedClassId) : [];
  const formSectionsList = form.form_class ? getSectionsForClass(form.form_class) : [];

  const { data: homework = [], isLoading } = useQuery({
    queryKey: ["homework", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase.from("homework").select("*, classes(class_name, shift, version, academic_year), sections(section_name)").eq("school_id", schoolId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const filterSectionOptions = filterClass ? getSectionsForClass(filterClass) : [];

  const createMutation = useMutation({
    mutationFn: async (f: HWForm) => {
      if (!schoolId) throw new Error("No school");
      const { error } = await supabase.from("homework").insert({
        school_id: schoolId, title: f.title, description: f.description || null,
        class_id: f.class_id || null, section_id: f.section_id || null,
        deadline: f.deadline || null, teacher_id: teacherProfile?.id || null, image_url: f.image_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      toast({ title: "Homework created" });
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: string; f: HWForm }) => {
      const { error } = await supabase.from("homework").update({
        title: f.title, description: f.description || null, class_id: f.class_id || null,
        section_id: f.section_id || null, deadline: f.deadline || null, image_url: f.image_url || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      toast({ title: "Homework updated" });
      setDialogOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homework").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      toast({ title: "Homework deleted" });
      setDeleteId(null);
    },
  });

  const openEdit = (hw: any) => {
    setEditId(hw.id);
    setForm({
      title: hw.title, description: hw.description || "",
      class_id: hw.class_id || "", section_id: hw.section_id || "",
      deadline: hw.deadline || "", image_url: hw.image_url || "",
      form_year: hw.classes?.academic_year ? String(hw.classes.academic_year) : "",
      form_class: hw.classes?.class_name || "",
      form_shift: hw.classes?.shift || "",
      form_version: hw.classes?.version || "",
      form_section: hw.sections?.section_name || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    const submitForm = { ...form, class_id: derivedClassId, section_id: "" };
    const matchedSection = formSectionOptions.find((s: any) => s.section_name === form.form_section);
    if (matchedSection) submitForm.section_id = matchedSection.id;
    if (editId) updateMutation.mutate({ id: editId, f: submitForm });
    else createMutation.mutate(submitForm);
  };

  const filtered = homework.filter((h: any) => {
    const matchSearch = h.title.toLowerCase().includes(search.toLowerCase());
    const matchClass = !filterClass || h.classes?.class_name === filterClass;
    const matchShift = !filterShift || h.classes?.shift === filterShift;
    const matchSection = !filterSection || h.sections?.section_name === filterSection;
    const matchVersion = !filterVersion || h.classes?.version === filterVersion;
    const matchYear = !filterYear || h.classes?.academic_year === Number(filterYear);
    return matchSearch && matchClass && matchShift && matchSection && matchVersion && matchYear;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Homework</h1>
          <p className="page-description">Assign and track homework submissions.</p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditId(null); setForm(emptyForm); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Homework
          </Button>
        )}
      </div>

      {/* Filter Bar — matching Results page style */}
      <div className="stat-card flex flex-col lg:flex-row lg:items-end gap-4 p-4">
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
            <Select value={filterYear || "all"} onValueChange={v => setFilterYear(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class</label>
            <Select value={filterClass || "all"} onValueChange={v => { setFilterClass(v === "all" ? "" : v); setFilterSection(""); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shift</label>
            <Select value={filterShift || "all"} onValueChange={v => setFilterShift(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                {SHIFTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Section</label>
            <Select value={filterSection || "all"} onValueChange={v => setFilterSection(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {filterSectionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Version</label>
            <Select value={filterVersion || "all"} onValueChange={v => setFilterVersion(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Versions</SelectItem>
                {VERSIONS.map(v => <SelectItem key={v} value={v} className="capitalize">{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search homework..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="stat-card flex items-center justify-center min-h-[200px]">
          <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card flex flex-col items-center justify-center min-h-[200px] gap-3">
          <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground">No homework found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((hw: any) => {
            const isOverdue = hw.deadline && new Date(hw.deadline) < new Date();
            return (
              <div key={hw.id} className="stat-card group hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                {hw.image_url && (
                  <div className="-mx-4 -mt-4 mb-3">
                    <img src={getImageFullUrl(hw.image_url)} alt={hw.title} className="w-full h-32 object-cover" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold font-heading text-sm leading-tight truncate">{hw.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {hw.classes?.class_name && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {hw.classes.class_name}
                          </span>
                        )}
                        {hw.sections?.section_name && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">
                            {hw.sections.section_name}
                          </span>
                        )}
                        {hw.classes?.shift && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium capitalize">
                            {hw.classes.shift}
                          </span>
                        )}
                      </div>
                      {hw.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{hw.description}</p>
                      )}
                      {hw.deadline && (
                        <div className={`flex items-center gap-1.5 mt-2.5 text-xs font-medium ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{isOverdue ? "Overdue" : "Due"}: {new Date(hw.deadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openEdit(hw)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive" onClick={() => setDeleteId(hw.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading">{editId ? "Edit Homework" : "Add Homework"}</DialogTitle>
            <p className="text-sm text-muted-foreground">Fill in the details to {editId ? "update" : "create"} a homework assignment.</p>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title *</label>
              <Input placeholder="e.g. Math Chapter 5 Exercise" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} className="h-10" />
            </div>

            {/* Filter-style selector bar */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assign To</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
                  <Select value={form.form_year || "all"} onValueChange={(v) => setForm(p => ({ ...p, form_year: v === "all" ? "" : v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Class</label>
                  <Select value={form.form_class || "all"} onValueChange={(v) => setForm(p => ({ ...p, form_class: v === "all" ? "" : v, form_section: "" }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Classes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Shift</label>
                  <Select value={form.form_shift || "all"} onValueChange={(v) => setForm(p => ({ ...p, form_shift: v === "all" ? "" : v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Shifts" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shifts</SelectItem>
                      {SHIFTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Section</label>
                  <Select value={form.form_section || "all"} onValueChange={(v) => setForm(p => ({ ...p, form_section: v === "all" ? "" : v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Sections" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {formSectionsList.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Version</label>
                  <Select value={form.form_version || "all"} onValueChange={(v) => setForm(p => ({ ...p, form_version: v === "all" ? "" : v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Versions" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Versions</SelectItem>
                      {VERSIONS.map(v => <SelectItem key={v} value={v} className="capitalize">{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deadline</label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm(p => ({ ...p, deadline: e.target.value }))} className="h-10 max-w-[220px]" />
            </div>

            {/* Photo Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Photo (Optional)</label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              {form.image_url ? (
                <div className="relative rounded-xl border overflow-hidden bg-muted/30 group">
                  <img src={getImageFullUrl(form.image_url)} alt="Homework" className="w-full h-40 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <Upload className="h-3.5 w-3.5" /> Change
                    </Button>
                    <Button type="button" variant="destructive" size="sm" className="gap-1.5" onClick={() => setForm(p => ({ ...p, image_url: "" }))}>
                      <X className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-28 rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 bg-muted/20 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                  )}
                  <span className="text-xs text-muted-foreground">{uploading ? "Uploading..." : "Click to upload homework photo"}</span>
                </button>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
              <Textarea placeholder="Write homework details, instructions..." value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className="resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editId ? "Update" : "Create"} Homework</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Homework?</AlertDialogTitle>
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

export default HomeworkPage;
