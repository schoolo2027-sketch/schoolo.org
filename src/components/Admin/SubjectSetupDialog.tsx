import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { X, Plus, Sparkles, BookOpen, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ALL_CLASSES, LOWER_CLASSES, UPPER_CLASSES } from "@/utils/subjectConfig";

const GROUP_1_CLASSES = LOWER_CLASSES; // Play to Class 8
const GROUP_2_CLASSES = ["Class 9", "Class 10"];
const GROUP_3_CLASSES = ["Class 11", "Class 12"];

const ALL_SECTIONS_LOWER = ["A", "B", "C"];
const ALL_SECTIONS_UPPER = ["Science", "Business Studies", "Humanities"];

interface SubjectForm {
  subject_names: string[];
  full_marks: number;
  group1_classes: string[];
  group2_classes: string[];
  group3_classes: string[];
  sections: string[];
  cq_total: number;
  cq_pass: number;
  mcq_total: number;
  mcq_pass: number;
  ct_enabled: boolean;
  ct_total: number;
  mt_enabled: boolean;
  mt_total: number;
  practical_enabled: boolean;
  practical_total: number;
  practical_pass: number;
  is_optional: boolean;
}

const emptyForm: SubjectForm = {
  subject_names: [],
  full_marks: 100,
  group1_classes: [],
  group2_classes: [],
  group3_classes: [],
  sections: [],
  cq_total: 70,
  cq_pass: 23,
  mcq_total: 30,
  mcq_pass: 10,
  ct_enabled: false,
  ct_total: 0,
  mt_enabled: false,
  mt_total: 0,
  practical_enabled: false,
  practical_total: 0,
  practical_pass: 0,
  is_optional: false,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
}

const SubjectSetupDialog = ({ open, onOpenChange, editData }: Props) => {
  const { schoolId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SubjectForm>(emptyForm);
  const [subjectInput, setSubjectInput] = useState("");

  const isEditing = !!editData && !!editData.id;

  // Populate form when editing or opening with initial defaults
  useEffect(() => {
    if (editData && open) {
      const classes: string[] = Array.isArray(editData.classes)
        ? editData.classes
        : typeof editData.classes === "string"
        ? [editData.classes]
        : [];
      const sections: string[] = Array.isArray(editData.sections)
        ? editData.sections
        : typeof editData.sections === "string"
        ? [editData.sections]
        : [];
      const g1 = classes.filter((c: string) => GROUP_1_CLASSES.includes(c));
      const g2 = classes.filter((c: string) => GROUP_2_CLASSES.includes(c));
      const g3 = classes.filter((c: string) => GROUP_3_CLASSES.includes(c));

      setForm({
        subject_names: editData.subject_name ? [editData.subject_name] : (Array.isArray(editData.subject_names) ? editData.subject_names : []),
        full_marks: editData.full_marks ?? 100,
        group1_classes: g1,
        group2_classes: g2,
        group3_classes: g3,
        sections: sections,
        cq_total: editData.cq_total ?? 70,
        cq_pass: editData.cq_pass ?? 23,
        mcq_total: editData.mcq_total ?? 30,
        mcq_pass: editData.mcq_pass ?? 10,
        ct_enabled: editData.ct_enabled || false,
        ct_total: editData.ct_total || 0,
        mt_enabled: editData.mt_enabled || false,
        mt_total: editData.mt_total || 0,
        practical_enabled: editData.practical_enabled || false,
        practical_total: editData.practical_total || 0,
        practical_pass: editData.practical_pass || 0,
        is_optional: editData.is_optional || false,
      });
      setSubjectInput("");
    } else if (!open) {
      setForm(emptyForm);
      setSubjectInput("");
    }
  }, [editData, open]);

  const hasUpperClasses = form.group2_classes.length > 0 || form.group3_classes.length > 0;
  const hasLowerClasses = form.group1_classes.length > 0;

  const availableSections = [
    ...(hasLowerClasses ? ALL_SECTIONS_LOWER : []),
    ...(hasUpperClasses ? ALL_SECTIONS_UPPER : []),
  ];

  const calculatedTotal = form.cq_total + form.mcq_total +
    (form.ct_enabled ? form.ct_total : 0) +
    (form.mt_enabled ? form.mt_total : 0) +
    (form.practical_enabled ? form.practical_total : 0);

  const toggleClass = (group: "group1_classes" | "group2_classes" | "group3_classes", cls: string) => {
    setForm(p => ({
      ...p,
      [group]: p[group].includes(cls) ? p[group].filter(c => c !== cls) : [...p[group], cls],
    }));
  };

  const selectAllGroup = (group: "group1_classes" | "group2_classes" | "group3_classes", classes: string[]) => {
    setForm(p => ({
      ...p,
      [group]: p[group].length === classes.length ? [] : [...classes],
    }));
  };

  const toggleSection = (sec: string) => {
    setForm(p => ({
      ...p,
      sections: p.sections.includes(sec) ? p.sections.filter(s => s !== sec) : [...p.sections, sec],
    }));
  };

  const addSubjectName = () => {
    const name = subjectInput.trim();
    if (!name) return;
    if (form.subject_names.some(n => n.toLowerCase() === name.toLowerCase())) {
      toast({ title: `"${name}" is already in the list`, variant: "destructive" });
      return;
    }
    setForm(p => ({ ...p, subject_names: [...p.subject_names, name] }));
    setSubjectInput("");
  };

  const removeSubjectName = (name: string) => {
    setForm(p => ({ ...p, subject_names: p.subject_names.filter(n => n !== name) }));
  };

  // Quick Preset Handlers
  const applyPreset = (type: "cq70_mcq30" | "cq50_mcq25_prac25" | "written100" | "half50") => {
    if (type === "cq70_mcq30") {
      setForm(p => ({
        ...p,
        full_marks: 100,
        cq_total: 70,
        cq_pass: 23,
        mcq_total: 30,
        mcq_pass: 10,
        practical_enabled: false,
        practical_total: 0,
        practical_pass: 0,
      }));
    } else if (type === "cq50_mcq25_prac25") {
      setForm(p => ({
        ...p,
        full_marks: 100,
        cq_total: 50,
        cq_pass: 17,
        mcq_total: 25,
        mcq_pass: 8,
        practical_enabled: true,
        practical_total: 25,
        practical_pass: 8,
      }));
    } else if (type === "written100") {
      setForm(p => ({
        ...p,
        full_marks: 100,
        cq_total: 100,
        cq_pass: 33,
        mcq_total: 0,
        mcq_pass: 0,
        practical_enabled: false,
        practical_total: 0,
        practical_pass: 0,
      }));
    } else if (type === "half50") {
      setForm(p => ({
        ...p,
        full_marks: 50,
        cq_total: 30,
        cq_pass: 10,
        mcq_total: 20,
        mcq_pass: 7,
        practical_enabled: false,
        practical_total: 0,
        practical_pass: 0,
      }));
    }
  };

  const createMutation = useMutation({
    mutationFn: async (submittedNames?: string[]) => {
      if (!schoolId) throw new Error("No school");

      const names = (submittedNames || form.subject_names).map(s => s.trim()).filter(Boolean);
      if (names.length === 0) throw new Error("Subject name is required");

      if (isEditing && editData?.id) {
        // Update existing record
        const allClasses = [...form.group1_classes, ...form.group2_classes, ...form.group3_classes];
        const classGroup = form.group3_classes.length > 0 ? "11_12" : form.group2_classes.length > 0 ? "9_10" : "play_8";
        const { error } = await supabase.from("subject_setups" as any).update({
          subject_name: names[0],
          full_marks: form.full_marks,
          class_group: classGroup,
          classes: allClasses,
          sections: form.sections,
          cq_total: form.cq_total,
          cq_pass: form.cq_pass,
          mcq_total: form.mcq_total,
          mcq_pass: form.mcq_pass,
          ct_enabled: form.ct_enabled,
          ct_total: form.ct_enabled ? form.ct_total : 0,
          mt_enabled: form.mt_enabled,
          mt_total: form.mt_enabled ? form.mt_total : 0,
          practical_enabled: form.practical_enabled,
          practical_total: form.practical_enabled ? form.practical_total : 0,
          practical_pass: form.practical_enabled ? form.practical_pass : 0,
          is_optional: hasUpperClasses ? form.is_optional : false,
        }).eq("id", editData.id);
        if (error) throw error;
        return;
      }

      const records: any[] = [];

      for (const subjectName of names) {
        if (form.group1_classes.length > 0) {
          records.push({
            school_id: schoolId,
            subject_name: subjectName,
            full_marks: form.full_marks,
            class_group: "play_8",
            classes: form.group1_classes,
            sections: form.sections.filter(s => ALL_SECTIONS_LOWER.includes(s)),
            cq_total: form.cq_total,
            cq_pass: form.cq_pass,
            mcq_total: form.mcq_total,
            mcq_pass: form.mcq_pass,
            ct_enabled: form.ct_enabled,
            ct_total: form.ct_enabled ? form.ct_total : 0,
            mt_enabled: form.mt_enabled,
            mt_total: form.mt_enabled ? form.mt_total : 0,
            practical_enabled: form.practical_enabled,
            practical_total: form.practical_enabled ? form.practical_total : 0,
            practical_pass: form.practical_enabled ? form.practical_pass : 0,
            is_optional: false,
          });
        }
        if (form.group2_classes.length > 0) {
          records.push({
            school_id: schoolId,
            subject_name: subjectName,
            full_marks: form.full_marks,
            class_group: "9_10",
            classes: form.group2_classes,
            sections: form.sections.filter(s => ALL_SECTIONS_UPPER.includes(s)),
            cq_total: form.cq_total,
            cq_pass: form.cq_pass,
            mcq_total: form.mcq_total,
            mcq_pass: form.mcq_pass,
            ct_enabled: form.ct_enabled,
            ct_total: form.ct_enabled ? form.ct_total : 0,
            mt_enabled: form.mt_enabled,
            mt_total: form.mt_enabled ? form.mt_total : 0,
            practical_enabled: form.practical_enabled,
            practical_total: form.practical_enabled ? form.practical_total : 0,
            practical_pass: form.practical_enabled ? form.practical_pass : 0,
            is_optional: form.is_optional,
          });
        }
        if (form.group3_classes.length > 0) {
          records.push({
            school_id: schoolId,
            subject_name: subjectName,
            full_marks: form.full_marks,
            class_group: "11_12",
            classes: form.group3_classes,
            sections: form.sections.filter(s => ALL_SECTIONS_UPPER.includes(s)),
            cq_total: form.cq_total,
            cq_pass: form.cq_pass,
            mcq_total: form.mcq_total,
            mcq_pass: form.mcq_pass,
            ct_enabled: form.ct_enabled,
            ct_total: form.ct_enabled ? form.ct_total : 0,
            mt_enabled: form.mt_enabled,
            mt_total: form.mt_enabled ? form.mt_total : 0,
            practical_enabled: form.practical_enabled,
            practical_total: form.practical_enabled ? form.practical_total : 0,
            practical_pass: form.practical_enabled ? form.practical_pass : 0,
            is_optional: form.is_optional,
          });
        }
      }

      if (records.length === 0) throw new Error("Select at least one class");

      const { error } = await supabase.from("subject_setups" as any).insert(records);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-setups"] });
      toast({ title: isEditing ? "Subject updated successfully" : "Subject(s) configured successfully" });
      setForm(emptyForm);
      setSubjectInput("");
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    let finalNames = form.subject_names.map(s => s.trim()).filter(Boolean);
    if (!isEditing && subjectInput.trim() && !finalNames.some(n => n.toLowerCase() === subjectInput.trim().toLowerCase())) {
      finalNames = [...finalNames, subjectInput.trim()];
      setForm(p => ({ ...p, subject_names: finalNames }));
      setSubjectInput("");
    }

    if (finalNames.length === 0) {
      toast({ title: "Please enter a valid subject name", variant: "destructive" });
      return;
    }
    if (form.group1_classes.length === 0 && form.group2_classes.length === 0 && form.group3_classes.length === 0) {
      toast({ title: "Select at least one class", variant: "destructive" });
      return;
    }
    createMutation.mutate(finalNames);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-heading">
                {isEditing ? "Edit Subject & Marks Setup" : "Setup Subject & Marks Rule"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {isEditing ? "Update marks distribution and group rules" : "Add subjects and configure NCTB board mark distribution"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Quick Presets Bar */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Mark Distribution Presets
              </span>
              <span className="text-[11px] text-muted-foreground">Click to auto-fill CQ / MCQ / Practical</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-primary/10 hover:text-primary font-medium"
                onClick={() => applyPreset("cq70_mcq30")}
              >
                100 Marks (CQ 70 + MCQ 30)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-primary/10 hover:text-primary font-medium"
                onClick={() => applyPreset("cq50_mcq25_prac25")}
              >
                100 Marks (CQ 50 + MCQ 25 + Prac 25)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-primary/10 hover:text-primary font-medium"
                onClick={() => applyPreset("written100")}
              >
                100 Marks (Written/CQ 100)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-background hover:bg-primary/10 hover:text-primary font-medium"
                onClick={() => applyPreset("half50")}
              >
                50 Marks (CQ 30 + MCQ 20)
              </Button>
            </div>
          </div>

          {/* Subject Names */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto_120px] gap-3 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject Name *</label>
                {isEditing ? (
                  <Input
                    placeholder="e.g. Bangla 1st Paper, Physics, Higher Mathematics..."
                    value={form.subject_names[0] || ""}
                    onChange={e => setForm(p => ({ ...p, subject_names: [e.target.value] }))}
                  />
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Bangla 1st Paper, Physics, Higher Mathematics..."
                      value={subjectInput}
                      onChange={e => setSubjectInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubjectName(); } }}
                    />
                    <Button type="button" size="sm" onClick={addSubjectName} className="shrink-0 gap-1">
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                )}
              </div>
              <div />
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Marks</label>
                <Input
                  type="number"
                  value={form.full_marks}
                  onChange={e => setForm(p => ({ ...p, full_marks: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            {!isEditing && form.subject_names.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.subject_names.map(name => (
                  <Badge key={name} variant="secondary" className="gap-1 text-sm py-1 px-2.5 bg-primary/10 text-primary border border-primary/20">
                    {name}
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeSubjectName(name)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Class Selection Folders */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" /> Target Classes
            </h3>

            {/* Play to Class 8 */}
            <div className="border border-border/80 rounded-xl p-3.5 space-y-2.5 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Play – Class 8 (Primary & Junior)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2 text-primary font-medium"
                  onClick={() => selectAllGroup("group1_classes", GROUP_1_CLASSES)}
                >
                  {form.group1_classes.length === GROUP_1_CLASSES.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {GROUP_1_CLASSES.map(cls => (
                  <label key={cls} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all ${
                    form.group1_classes.includes(cls) ? "bg-primary text-primary-foreground border-primary font-medium" : "bg-background hover:bg-muted text-muted-foreground border-border"
                  }`}>
                    <Checkbox
                      checked={form.group1_classes.includes(cls)}
                      onCheckedChange={() => toggleClass("group1_classes", cls)}
                      className="hidden"
                    />
                    <span>{cls}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Class 9-10 */}
            <div className="border border-border/80 rounded-xl p-3.5 space-y-2.5 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Class 9 – 10 (Secondary / SSC)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2 text-primary font-medium"
                  onClick={() => selectAllGroup("group2_classes", GROUP_2_CLASSES)}
                >
                  {form.group2_classes.length === GROUP_2_CLASSES.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {GROUP_2_CLASSES.map(cls => (
                  <label key={cls} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs cursor-pointer transition-all ${
                    form.group2_classes.includes(cls) ? "bg-primary text-primary-foreground border-primary font-medium" : "bg-background hover:bg-muted text-muted-foreground border-border"
                  }`}>
                    <Checkbox
                      checked={form.group2_classes.includes(cls)}
                      onCheckedChange={() => toggleClass("group2_classes", cls)}
                      className="hidden"
                    />
                    <span>{cls}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Class 11-12 */}
            <div className="border border-border/80 rounded-xl p-3.5 space-y-2.5 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Class 11 – 12 (Higher Secondary / HSC)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2 text-primary font-medium"
                  onClick={() => selectAllGroup("group3_classes", GROUP_3_CLASSES)}
                >
                  {form.group3_classes.length === GROUP_3_CLASSES.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {GROUP_3_CLASSES.map(cls => (
                  <label key={cls} className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs cursor-pointer transition-all ${
                    form.group3_classes.includes(cls) ? "bg-primary text-primary-foreground border-primary font-medium" : "bg-background hover:bg-muted text-muted-foreground border-border"
                  }`}>
                    <Checkbox
                      checked={form.group3_classes.includes(cls)}
                      onCheckedChange={() => toggleClass("group3_classes", cls)}
                      className="hidden"
                    />
                    <span>{cls}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Upper Classes Group Selection & 4th Subject Folder */}
          {hasUpperClasses && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" /> Group & Folder Configuration (Class 9–12)
                </h3>
                <span className="text-[11px] text-muted-foreground">Select group and specify if it belongs to 4th Subject folder</span>
              </div>

              <div className="border border-border/80 rounded-xl p-3.5 space-y-3 bg-muted/20">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Select Target Group Folder:
                  </label>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Leave unselected for <strong>Combined / Common (Compulsory - All Groups)</strong> such as Bangla, English, General Math, ICT. Or select specific groups:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SECTIONS_UPPER.map(sec => (
                      <label key={sec} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        form.sections.includes(sec) ? "bg-primary text-primary-foreground border-primary font-medium" : "bg-background hover:bg-muted text-muted-foreground border-border"
                      }`}>
                        <Checkbox
                          checked={form.sections.includes(sec)}
                          onCheckedChange={() => toggleSection(sec)}
                          className="hidden"
                        />
                        <span>{sec === "Science" ? "🧪 Science" : sec === "Business Studies" ? "💼 Business Studies" : "🎨 Humanities"}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 4th Subject Folder Switch */}
                <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      ⭐ Place in 4th Subject Folder (Optional Subject)
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {form.sections.length > 0
                        ? `Students of ${form.sections.join(", ")} group will be able to select this subject as their 4th subject.`
                        : "Students of all groups will be able to select this subject as their 4th subject."}
                      {" "}Board Rule: Grade points above 2.00 in this subject are added as bonus points to total GPA.
                    </p>
                  </div>
                  <Switch
                    checked={form.is_optional}
                    onCheckedChange={v => setForm(p => ({ ...p, is_optional: v }))}
                  />
                </div>

                {form.is_optional && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>
                      This subject will be saved into the <strong>4th Subject Folder</strong> for <strong>{form.sections.length > 0 ? form.sections.join(", ") : "Combined / All Groups"}</strong>.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mark Distribution Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Mark Distribution</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* CQ */}
              <div className="border border-border rounded-xl p-3.5 space-y-2 bg-background">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">CQ (Creative / Theory)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Total Marks</label>
                    <Input
                      type="number"
                      value={form.cq_total}
                      onChange={e => setForm(p => ({ ...p, cq_total: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Pass Marks</label>
                    <Input
                      type="number"
                      value={form.cq_pass}
                      onChange={e => setForm(p => ({ ...p, cq_pass: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>

              {/* MCQ */}
              <div className="border border-border rounded-xl p-3.5 space-y-2 bg-background">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">MCQ</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Total Marks</label>
                    <Input
                      type="number"
                      value={form.mcq_total}
                      onChange={e => setForm(p => ({ ...p, mcq_total: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Pass Marks</label>
                    <Input
                      type="number"
                      value={form.mcq_pass}
                      onChange={e => setForm(p => ({ ...p, mcq_pass: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Practical (Science) */}
            <div className="border border-border rounded-xl p-3.5 space-y-2.5 bg-background">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Practical Marks (Science)</span>
                <Switch
                  checked={form.practical_enabled}
                  onCheckedChange={v => setForm(p => ({ ...p, practical_enabled: v }))}
                />
              </div>
              {form.practical_enabled && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Practical Total</label>
                    <Input
                      type="number"
                      value={form.practical_total}
                      onChange={e => setForm(p => ({ ...p, practical_total: Number(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Practical Pass</label>
                    <Input
                      type="number"
                      value={form.practical_pass}
                      onChange={e => setForm(p => ({ ...p, practical_pass: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* CT & MT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-border rounded-xl p-3.5 space-y-2 bg-background">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">CT (Class Test)</span>
                  <Switch checked={form.ct_enabled} onCheckedChange={v => setForm(p => ({ ...p, ct_enabled: v }))} />
                </div>
                {form.ct_enabled && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] text-muted-foreground">Total Marks</label>
                    <Input
                      type="number"
                      value={form.ct_total}
                      onChange={e => setForm(p => ({ ...p, ct_total: Number(e.target.value) || 0 }))}
                    />
                  </div>
                )}
              </div>

              <div className="border border-border rounded-xl p-3.5 space-y-2 bg-background">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">MT (Monthly Test)</span>
                  <Switch checked={form.mt_enabled} onCheckedChange={v => setForm(p => ({ ...p, mt_enabled: v }))} />
                </div>
                {form.mt_enabled && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] text-muted-foreground">Total Marks</label>
                    <Input
                      type="number"
                      value={form.mt_total}
                      onChange={e => setForm(p => ({ ...p, mt_total: Number(e.target.value) || 0 }))}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Calculated Total Validation */}
            <div className="flex items-center justify-between bg-muted/60 rounded-xl p-3 border border-border">
              <span className="text-xs font-bold text-foreground">Calculated Breakdown Total:</span>
              <span className={`text-base font-bold font-mono ${calculatedTotal === form.full_marks ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {calculatedTotal} / {form.full_marks} Marks
              </span>
            </div>
            {calculatedTotal !== form.full_marks && (
              <p className="text-xs text-destructive font-medium">
                ⚠ Breakdown sum ({calculatedTotal}) does not match full marks ({form.full_marks}). Please adjust CQ, MCQ, or Practical marks.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-primary shadow-sm">
            <Plus className="h-4 w-4 mr-1.5" /> {isEditing ? "Update Subject" : "Save Subject Setup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubjectSetupDialog;
