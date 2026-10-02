import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTeacherAssignedClasses } from "@/hooks/useTeacherAssignedClasses";
import { BookOpen, Layers, AlertCircle, CheckCircle2, CheckSquare, Square, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ImageUpload from "@/components/Common/ImageUpload";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  getOptionalSubjectOptions,
  getSubjectNamesForClass,
  calculateStudentSubjectPackage,
  isGroupBasedClass,
  normalizeGroupName,
  isMatchingClass,
} from "@/utils/subjectConfig";

const CLASSES = ["Play", "Nursery", "KG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
const SHIFTS = ["morning", "day", "evening"] as const;
const VERSIONS = ["bangla", "english"] as const;
const getSectionsForClass = (cls: string): string[] => {
  const upper = ["Class 9", "Class 10", "Class 11", "Class 12"];
  if (upper.includes(cls)) return ["Science", "Business Studies", "Humanities"];
  return ["A", "B", "C"];
};

interface StudentForm {
  student_name: string;
  student_id: string;
  roll: string;
  class_name: string;
  shift: string;
  version: string;
  section_name: string;
  group_subjects: string[];
  optional_subject: string;
  guardian_name: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  address: string;
  blood_group: string;
  photo: string;
  admission_date: string;
}

const emptyForm: StudentForm = {
  student_name: "", student_id: "", roll: "", class_name: "", shift: "morning", version: "bangla",
  section_name: "", group_subjects: [], optional_subject: "", guardian_name: "", phone: "", gender: "", date_of_birth: "",
  address: "", blood_group: "", photo: "",
  admission_date: new Date().toISOString().split("T")[0],
};

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 25 }, (_, i) => 2020 + i);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editStudent: any | null;
}

const StudentFormDialog = ({ open, onOpenChange, editStudent }: Props) => {
  const { schoolId } = useAuth();
  const { assignedClassIds, assignedSectionIds, isRestricted } = useTeacherAssignedClasses();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StudentForm>(emptyForm);
  const [academicYear, setAcademicYear] = useState(String(currentYear));
  const [isCustomOptional, setIsCustomOptional] = useState(false);

  // Fetch all classes & sections from DB to resolve IDs
  const { data: dbClasses = [] } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("classes").select("*").eq("school_id", schoolId);
      return data || [];
    },
    enabled: !!schoolId && open,
  });

  const { data: dbSections = [] } = useQuery({
    queryKey: ["all-sections-form", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("sections").select("*").eq("school_id", schoolId);
      return data || [];
    },
    enabled: !!schoolId && open,
  });

  // Fetch subject setups to know available subjects & marked optional subjects
  const { data: subjectSetups = [] } = useQuery({
    queryKey: ["subject-setups", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("subject_setups").select("*").eq("school_id", schoolId);
      return data || [];
    },
    enabled: !!schoolId && open,
  });

  // Live real-time sync when subjects are added/edited/deleted
  useRealtimeSync("subject_setups", [["subject-setups"], ["subject-setups", schoolId], ["subject-setups-student-form", schoolId]]);

  useEffect(() => {
    if (editStudent) {
      const cls = Array.isArray(dbClasses) ? dbClasses.find((c: any) => c.id === editStudent.class_id) : null;
      const sec = Array.isArray(dbSections) ? dbSections.find((s: any) => s.id === editStudent.section_id) : null;
      const optSub = editStudent.optional_subject || "";
      const yearVal = cls?.academic_year || editStudent.classes?.academic_year || currentYear;
      const shiftVal = (cls?.shift || editStudent.classes?.shift || "morning").toLowerCase();
      const versionVal = (cls?.version || editStudent.classes?.version || "bangla").toLowerCase();

      const cachedGroup = editStudent?.id ? localStorage.getItem(`schoolo_student_group_subjects_${editStudent.id}`) : null;
      const rawGroup = editStudent?.group_subjects || cachedGroup || "";
      let parsedGroup: string[] = [];
      if (Array.isArray(rawGroup)) {
        parsedGroup = rawGroup;
      } else if (typeof rawGroup === "string" && rawGroup.trim()) {
        parsedGroup = rawGroup.split(",").map((s: string) => s.trim()).filter(Boolean);
      }

      setForm({
        student_name: editStudent.student_name || "",
        student_id: editStudent.student_id || "",
        roll: editStudent.roll != null ? String(editStudent.roll) : "",
        class_name: cls?.class_name || editStudent.classes?.class_name || "",
        shift: shiftVal,
        version: versionVal,
        section_name: sec?.section_name || editStudent.sections?.section_name || "",
        group_subjects: parsedGroup,
        optional_subject: optSub,
        guardian_name: editStudent.guardian_name || "",
        phone: editStudent.phone || "",
        gender: editStudent.gender || "",
        date_of_birth: editStudent.date_of_birth || "",
        address: editStudent.address || "",
        blood_group: editStudent.blood_group || "",
        photo: editStudent.photo || "",
        admission_date: editStudent.admission_date || new Date().toISOString().split("T")[0],
      });
      setIsCustomOptional(false);
      setAcademicYear(String(yearVal));
    } else {
      setForm(emptyForm);
      setIsCustomOptional(false);
      setAcademicYear(String(currentYear));
    }
  }, [editStudent, open, dbClasses, dbSections]);

  // If teacher is restricted, only show classes/sections they're assigned to
  const allowedClassNames = useMemo(() => {
    if (!isRestricted || !assignedClassIds) return CLASSES;
    const names = new Set(
      (Array.isArray(dbClasses) ? dbClasses : [])
        .filter((c: any) => Array.isArray(assignedClassIds) && assignedClassIds.includes(c.id))
        .map((c: any) => c.class_name)
    );
    return CLASSES.filter(c => names.has(c));
  }, [isRestricted, assignedClassIds, dbClasses]);

  const sectionOptions = useMemo(() => {
    const allSecs = form.class_name ? getSectionsForClass(form.class_name) : [];
    if (!isRestricted || !assignedSectionIds || assignedSectionIds.length === 0) return allSecs;
    const allowed = new Set(
      (Array.isArray(dbSections) ? dbSections : [])
        .filter((s: any) => Array.isArray(assignedSectionIds) && assignedSectionIds.includes(s.id))
        .map((s: any) => s.section_name)
    );
    const filtered = allSecs.filter(s => allowed.has(s));
    return filtered.length > 0 ? filtered : allSecs;
  }, [isRestricted, assignedSectionIds, dbSections, form.class_name]);

  // Available Group Subjects configured for this class & group in Subject Setup (non-optional folder)
  const availableGroupFolderSubjects = useMemo(() => {
    if (!form.class_name || !form.section_name) return [];
    const isGroup = isGroupBasedClass(form.class_name);
    const normGroup = normalizeGroupName(form.section_name);
    if (!isGroup || !normGroup) return [];

    const list: { name: string; fullMarks: number }[] = [];
    const seen = new Set<string>();

    (Array.isArray(subjectSetups) ? subjectSetups : []).forEach((s: any) => {
      // Must not be explicitly in 4th subject folder
      if (s?.is_optional) return;

      const classesArr: string[] = Array.isArray(s?.classes)
        ? s.classes
        : typeof s?.classes === "string"
        ? [s.classes]
        : [];
      if (!classesArr.some((c: string) => isMatchingClass(c, form.class_name))) return;

      const sectionsArr: string[] = Array.isArray(s?.sections)
        ? s.sections
        : typeof s?.sections === "string"
        ? [s.sections]
        : [];

      if (sectionsArr.length === 0) return;

      const matchesGroup = sectionsArr.some((sec: string) => {
        const l = (sec || "").trim().toLowerCase();
        if (normGroup === "Science") return l === "science";
        if (normGroup === "Business Studies") return l.includes("business");
        if (normGroup === "Humanities") return l.includes("humanities") || l.includes("arts");
        return false;
      });

      if (matchesGroup) {
        const name = (s?.subject_name || "").trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          list.push({ name, fullMarks: s.full_marks || 100 });
        }
      }
    });

    return list;
  }, [form.class_name, form.section_name, subjectSetups]);

  // Available 4th / Optional subject options strictly from the selected class & group's 4th Subject Folder
  const availableOptionalSubjects = useMemo(() => {
    if (!form.class_name) return [];
    const isGroup = isGroupBasedClass(form.class_name);
    const normGroup = normalizeGroupName(form.section_name);

    if (isGroup && !normGroup) {
      return [];
    }

    const matchingFolderSetups = (Array.isArray(subjectSetups) ? subjectSetups : []).filter((s: any) => {
      if (!s?.is_optional) return false;

      const classesArr: string[] = Array.isArray(s?.classes)
        ? s.classes
        : typeof s?.classes === "string"
        ? [s.classes]
        : [];
      const matchesClass = classesArr.some((c: string) => isMatchingClass(c, form.class_name));
      if (!matchesClass) return false;

      if (isGroup) {
        const sectionsArr: string[] = Array.isArray(s?.sections)
          ? s.sections
          : typeof s?.sections === "string"
          ? [s.sections]
          : [];

        if (sectionsArr.length === 0) return true;

        const matchesGroup = sectionsArr.some((sec: string) => {
          const l = (sec || "").trim().toLowerCase();
          if (normGroup === "Science") return l === "science";
          if (normGroup === "Business Studies") return l.includes("business");
          if (normGroup === "Humanities") return l.includes("humanities") || l.includes("arts");
          return false;
        });

        return matchesGroup;
      }

      return true;
    });

    const list: string[] = [];
    const seen = new Set<string>();

    matchingFolderSetups.forEach((s: any) => {
      const name = (s?.subject_name || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push(name);
      }
    });

    return list;
  }, [form.class_name, form.section_name, subjectSetups]);

  // Combined selectable 4th subjects: subjects in 4th subject folder + subjects in group folder
  // (e.g. Biology & Higher Math can exist in both, or student can choose a group subject as their 4th subject)
  const selectableOptionalSubjects = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    // First, 4th subject folder items
    availableOptionalSubjects.forEach(sub => {
      const n = (sub || "").trim();
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        list.push(n);
      }
    });

    // Second, group subjects that could be selected as 4th
    availableGroupFolderSubjects.forEach(g => {
      const n = (g.name || "").trim();
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        list.push(n);
      }
    });

    return list;
  }, [availableOptionalSubjects, availableGroupFolderSubjects]);

  // Default-select group subjects if student has none selected yet
  useEffect(() => {
    if (isGroupBasedClass(form.class_name) && form.section_name && availableGroupFolderSubjects.length > 0) {
      if (!form.group_subjects || form.group_subjects.length === 0) {
        setForm(p => ({
          ...p,
          group_subjects: availableGroupFolderSubjects.map(s => s.name),
        }));
      }
    }
  }, [form.class_name, form.section_name, availableGroupFolderSubjects]);

  // Determine the effective 4th subject
  const effectiveOptionalSubject = useMemo(() => {
    if (selectableOptionalSubjects.length === 0) return "";
    if (isCustomOptional) return (form.optional_subject || "").trim();
    if (
      form.optional_subject &&
      selectableOptionalSubjects.some(
        s => s.toLowerCase() === form.optional_subject.trim().toLowerCase()
      )
    ) {
      return form.optional_subject.trim();
    }
    return "";
  }, [isCustomOptional, form.optional_subject, selectableOptionalSubjects]);

  // Compute student subject package: Combined + Group Core + 4th Subject = Total
  // (If effectiveOptionalSubject is also in group_subjects, calculateStudentSubjectPackage moves it to 4th subject)
  const studentPackage = useMemo(() => {
    return calculateStudentSubjectPackage(
      form.class_name,
      form.section_name,
      effectiveOptionalSubject,
      subjectSetups,
      true,
      form.group_subjects
    );
  }, [form.class_name, form.section_name, effectiveOptionalSubject, subjectSetups, form.group_subjects]);

  // Automatically clear stale or non-existent 4th subject if not in selectable list
  useEffect(() => {
    if (isGroupBasedClass(form.class_name) && form.section_name) {
      if (selectableOptionalSubjects.length === 0) {
        if (form.optional_subject) {
          setForm(p => ({ ...p, optional_subject: "" }));
        }
        if (isCustomOptional) {
          setIsCustomOptional(false);
        }
      } else if (!isCustomOptional && form.optional_subject) {
        const existsInFolder = selectableOptionalSubjects.some(
          s => s.toLowerCase() === form.optional_subject.trim().toLowerCase()
        );
        if (!existsInFolder) {
          setForm(p => ({ ...p, optional_subject: "" }));
        }
      }
    }
  }, [form.class_name, form.section_name, selectableOptionalSubjects, isCustomOptional, form.optional_subject]);

  // Resolve static names to DB IDs — auto-create if missing
  const resolveIds = async () => {
    if (!schoolId || !form.class_name) return { classId: null, sectionId: null };

    // Find or create class
    const matchedClass = dbClasses.find((c: any) =>
      c.class_name === form.class_name &&
      c.academic_year === Number(academicYear) &&
      c.shift === form.shift &&
      c.version === form.version
    );

    let classId = matchedClass?.id || null;
    if (!classId) {
      const { data: newClass, error } = await supabase.from("classes").insert({
        school_id: schoolId,
        class_name: form.class_name,
        academic_year: Number(academicYear),
        shift: form.shift as any,
        version: form.version as any,
      }).select("id").single();
      if (error) throw new Error(`Class creation failed: ${error.message}`);
      classId = newClass.id;
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    }

    // Find or create section
    let sectionId: string | null = null;
    if (classId && form.section_name) {
      const matchedSection = dbSections.find((s: any) =>
        s.class_id === classId && s.section_name === form.section_name
      );
      sectionId = matchedSection?.id || null;
      if (!sectionId) {
        const { data: newSection, error } = await supabase.from("sections").insert({
          school_id: schoolId,
          class_id: classId,
          section_name: form.section_name,
        }).select("id").single();
        if (error) throw new Error(`Section creation failed: ${error.message}`);
        sectionId = newSection.id;
        queryClient.invalidateQueries({ queryKey: ["all-sections-form"] });
      }
    }
    return { classId, sectionId };
  };

  const createMutation = useMutation({
    mutationFn: async (f: StudentForm) => {
      if (!schoolId) throw new Error("No school");
      const { classId, sectionId } = await resolveIds();
      
      const groupSubjectsStr = f.group_subjects && f.group_subjects.length > 0
        ? f.group_subjects.join(", ")
        : null;

      const payload: any = {
        school_id: schoolId,
        student_name: f.student_name,
        student_id: f.student_id || null,
        roll: f.roll || null,
        class_id: classId,
        section_id: sectionId,
        group_subjects: groupSubjectsStr,
        optional_subject: f.optional_subject?.trim() || null,
        guardian_name: f.guardian_name || null,
        phone: f.phone || null,
        gender: f.gender || null,
        date_of_birth: f.date_of_birth || null,
        address: f.address || null,
        blood_group: f.blood_group || null,
        photo: f.photo || null,
        admission_date: f.admission_date || null,
      };

      let { data, error } = await supabase.from("students").insert(payload).select().single();
      if (error && (error.message?.includes("group_subjects") || error.code === "42703")) {
        delete payload.group_subjects;
        const retry = await supabase.from("students").insert(payload).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (error && (error.message?.includes("optional_subject") || error.code === "42703")) {
        delete payload.optional_subject;
        const retry = await supabase.from("students").insert(payload).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      if (data?.id && groupSubjectsStr) {
        localStorage.setItem(`schoolo_student_group_subjects_${data.id}`, groupSubjectsStr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Student added successfully" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (f: StudentForm) => {
      if (!editStudent?.id) throw new Error("No student");
      const { classId, sectionId } = await resolveIds();

      const groupSubjectsStr = f.group_subjects && f.group_subjects.length > 0
        ? f.group_subjects.join(", ")
        : null;

      const payload: any = {
        student_name: f.student_name,
        student_id: f.student_id || null,
        roll: f.roll || null,
        class_id: classId,
        section_id: sectionId,
        group_subjects: groupSubjectsStr,
        optional_subject: f.optional_subject?.trim() || null,
        guardian_name: f.guardian_name || null,
        phone: f.phone || null,
        gender: f.gender || null,
        date_of_birth: f.date_of_birth || null,
        address: f.address || null,
        blood_group: f.blood_group || null,
        photo: f.photo || null,
        admission_date: f.admission_date || null,
      };

      let { error } = await supabase.from("students").update(payload).eq("id", editStudent.id);
      if (error && (error.message?.includes("group_subjects") || error.code === "42703")) {
        delete payload.group_subjects;
        const retry = await supabase.from("students").update(payload).eq("id", editStudent.id);
        error = retry.error;
      }
      if (error && (error.message?.includes("optional_subject") || error.code === "42703")) {
        delete payload.optional_subject;
        const retry = await supabase.from("students").update(payload).eq("id", editStudent.id);
        error = retry.error;
      }
      if (error) throw error;
      if (editStudent?.id && groupSubjectsStr) {
        localStorage.setItem(`schoolo_student_group_subjects_${editStudent.id}`, groupSubjectsStr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Student updated" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!form.student_name.trim()) {
      toast({ title: "Student name is required", variant: "destructive" });
      return;
    }
    if (editStudent) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  const isSelectedInList = Boolean(
    form.optional_subject &&
    availableOptionalSubjects.some(
      s => (s || "").toLowerCase() === (form.optional_subject || "").toLowerCase()
    )
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-heading uppercase tracking-wide">
            {editStudent ? "Edit Student Profile" : "Student Enrollment"}
          </DialogTitle>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Institutional Registry & 4th Subject Setup
          </p>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Photo + Basic Info */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col items-center gap-2 min-w-[140px]">
              <ImageUpload
                bucket="student-photos"
                currentUrl={form.photo || null}
                onUpload={(path) => setForm(p => ({ ...p, photo: path }))}
                onRemove={() => setForm(p => ({ ...p, photo: "" }))}
                label="Upload Photo"
                fallback={form.student_name || "?"}
              />
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name *</label>
                  <Input placeholder="Full Name" value={form.student_name} onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student ID (Optional)</label>
                  <Input placeholder="e.g. STD001" value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Roll Number</label>
                  <Input placeholder="Roll" value={form.roll} onChange={e => setForm(p => ({ ...p, roll: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender</label>
                  <Select value={form.gender || "none"} onValueChange={v => setForm(p => ({ ...p, gender: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Academic Info - Static dropdowns */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
                  <Select value={academicYear} onValueChange={setAcademicYear}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class</label>
                  <Select value={form.class_name || "none"} onValueChange={v => setForm(p => ({ ...p, class_name: v === "none" ? "" : v, section_name: "", optional_subject: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select</SelectItem>
                      {allowedClassNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Section</label>
                  <Select value={form.section_name || "none"} onValueChange={v => setForm(p => ({ ...p, section_name: v === "none" ? "" : v, optional_subject: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select</SelectItem>
                      {sectionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shift</label>
                  <Select value={form.shift} onValueChange={v => setForm(p => ({ ...p, shift: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SHIFTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Version</label>
                  <Select value={form.version} onValueChange={v => setForm(p => ({ ...p, version: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VERSIONS.map(v => <SelectItem key={v} value={v} className="capitalize">{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Group Subjects Selection (For Class 9-12 with selected section/group) */}
          {isGroupBasedClass(form.class_name) && form.section_name && (
            <div className="border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      {form.section_name} Group Subjects Selection
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Select group subjects for this student. The selected subjects act as their Group Core subjects.
                    </p>
                  </div>
                </div>
                {availableGroupFolderSubjects.length > 0 && (
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2.5 bg-background hover:bg-muted font-medium"
                      onClick={() => setForm(p => ({ ...p, group_subjects: availableGroupFolderSubjects.map(s => s.name) }))}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setForm(p => ({ ...p, group_subjects: [] }))}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {availableGroupFolderSubjects.length === 0 ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-semibold text-foreground">
                      No group subjects configured for {form.section_name} yet
                    </p>
                    <p className="text-muted-foreground mt-0.5 leading-relaxed">
                      Go to Classes &gt; <strong>Subject Setup</strong> &gt; {form.section_name} to add group subjects.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {availableGroupFolderSubjects.map((sub) => {
                    const isChosenAs4th = Boolean(
                      effectiveOptionalSubject &&
                      sub.name.toLowerCase() === effectiveOptionalSubject.toLowerCase()
                    );
                    const isChecked = form.group_subjects.some(g => g.toLowerCase() === sub.name.toLowerCase());

                    return (
                      <div
                        key={sub.name}
                        onClick={() => {
                          setForm(p => {
                            const exists = p.group_subjects.some(g => g.toLowerCase() === sub.name.toLowerCase());
                            const next = exists
                              ? p.group_subjects.filter(g => g.toLowerCase() !== sub.name.toLowerCase())
                              : [...p.group_subjects, sub.name];
                            return { ...p, group_subjects: next };
                          });
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all text-xs select-none ${
                          isChosenAs4th
                            ? "bg-amber-500/15 border-amber-500/50 text-amber-950 dark:text-amber-200 shadow-xs"
                            : isChecked
                            ? "bg-primary/10 border-primary/40 text-foreground font-medium"
                            : "bg-background/80 border-border/70 text-muted-foreground hover:border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-muted-foreground/40 bg-background"
                          }`}>
                            {isChecked && <CheckCircle2 className="h-3 w-3 stroke-[2.5]" />}
                          </div>
                          <span className="truncate font-semibold">{sub.name}</span>
                        </div>
                        <div>
                          {isChosenAs4th ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-[10px] whitespace-nowrap">
                              ⭐ 4th Subject
                            </span>
                          ) : isChecked ? (
                            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold text-[10px] whitespace-nowrap">
                              Group Core
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Excluded</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {effectiveOptionalSubject && availableGroupFolderSubjects.some(s => s.name.toLowerCase() === effectiveOptionalSubject.toLowerCase()) && (
                <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/40 p-2.5 rounded-md border border-amber-300/70 dark:border-amber-900/60 flex items-center gap-1.5">
                  <span className="font-bold">⭐ Note:</span>
                  <span>
                    <strong>{effectiveOptionalSubject}</strong> is selected as the 4th Subject. It will act as the 4th Subject and is automatically excluded from Group Core for this student so it is not double-counted.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 4th Subject / Optional Subject Selection (Only shown for upper group-based classes or if class has optional subjects configured) */}
          {(isGroupBasedClass(form.class_name) || selectableOptionalSubjects.length > 0 || effectiveOptionalSubject) && (
            <div className="border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      4th Subject (Optional Subject)
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Board Grading Rule: Grade points above 2.00 in this subject are added as bonus points to total GPA
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Select 4th Subject
                    </label>
                    {form.section_name && isGroupBasedClass(form.class_name) && (
                      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                        {form.section_name} Options ({selectableOptionalSubjects.length})
                      </span>
                    )}
                  </div>
                  <Select
                    disabled={isGroupBasedClass(form.class_name) && (!form.section_name || selectableOptionalSubjects.length === 0)}
                    value={
                      selectableOptionalSubjects.length === 0
                        ? "none"
                        : isCustomOptional
                        ? "custom"
                        : effectiveOptionalSubject || "none"
                    }
                    onValueChange={(val) => {
                      if (val === "none") {
                        setForm(p => ({ ...p, optional_subject: "" }));
                        setIsCustomOptional(false);
                      } else if (val === "custom") {
                        setIsCustomOptional(true);
                        setForm(p => ({ ...p, optional_subject: "" }));
                      } else {
                        setForm(p => ({ ...p, optional_subject: val }));
                        setIsCustomOptional(false);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={
                        isGroupBasedClass(form.class_name) && !form.section_name
                          ? "-- Select Section / Group First --"
                          : selectableOptionalSubjects.length === 0
                          ? "no added any 4th subject for this group"
                          : "-- None (No 4th Subject) --"
                      }>
                        {isGroupBasedClass(form.class_name) && !form.section_name
                          ? "-- Select Section / Group First --"
                          : selectableOptionalSubjects.length === 0
                          ? "no added any 4th subject for this group"
                          : isCustomOptional
                          ? (form.optional_subject || "Custom Subject")
                          : (effectiveOptionalSubject || "-- None (No 4th Subject) --")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {selectableOptionalSubjects.length === 0 ? (
                        <SelectItem value="none">no added any 4th subject for this group</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="none">-- None (No 4th Subject) --</SelectItem>
                          {selectableOptionalSubjects.map((sub) => (
                            <SelectItem key={sub} value={sub}>
                              {sub}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">+ Custom / Other Subject...</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>

                  {/* Dynamic Status & Guidance */}
                  {isGroupBasedClass(form.class_name) && !form.section_name ? (
                    <p className="text-[11px] text-muted-foreground">
                      Please select a Section / Group (e.g. Science) above to view and assign 4th subjects.
                    </p>
                  ) : selectableOptionalSubjects.length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2 mt-1">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-semibold text-foreground">
                          no added any 4th subject for this group
                        </p>
                        <p className="text-muted-foreground mt-0.5 leading-relaxed">
                          Go to Classes &gt; <strong>Subject Setup</strong> &gt; {form.section_name || "Group"} &gt; <strong>4th Subject Folder</strong> to add subjects. Added subjects will appear here automatically.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {selectableOptionalSubjects.length} option(s) available for {form.section_name}
                    </p>
                  )}
                </div>

                {isCustomOptional && selectableOptionalSubjects.length > 0 && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Custom 4th Subject Name
                    </label>
                    <Input
                      placeholder="e.g. Higher Mathematics, Biology, Agriculture..."
                      value={form.optional_subject}
                      onChange={(e) => setForm(p => ({ ...p, optional_subject: e.target.value }))}
                      className="bg-background"
                    />
                  </div>
                )}
              </div>

              {effectiveOptionalSubject && (
                <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium bg-emerald-100/60 dark:bg-emerald-900/40 px-3 py-1.5 rounded-md">
                  <span className="font-bold">✓ Selected 4th Subject:</span> {effectiveOptionalSubject} (Board 4th Subject Formula Applied)
                </div>
              )}

              {/* Total Student Subject Package Breakdown: Combined + Group Core + 4th Subject */}
              {isGroupBasedClass(form.class_name) && form.section_name && (
                <div className="rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 bg-background/95 p-3.5 space-y-3 mt-2">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {form.section_name} Subject Package & Total Calculation
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                      Total Subjects = {studentPackage.totalCount}
                    </span>
                  </div>

                  {studentPackage.totalCount === 0 ? (
                    <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-semibold text-foreground">No subjects configured for this class yet</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Go to Classes &gt; <strong>Subject Setup</strong> tab to configure subjects. Any added subjects will reflect here immediately.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs">
                      {/* 1. Combined Subjects */}
                      {studentPackage.combinedSubjects.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="font-semibold text-foreground">1. Compulsory Subjects (Combined / Common):</span>
                            <span className="font-mono font-semibold text-foreground">{studentPackage.combinedSubjects.length} Subject(s)</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {studentPackage.combinedSubjects.map((sub) => (
                              <span key={sub} className="px-2 py-0.5 rounded bg-muted text-[11px] font-medium text-foreground">
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 2. Group Core Subjects */}
                      {studentPackage.groupCoreSubjects.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="font-semibold text-foreground">2. {form.section_name} Core Subjects (Group Core):</span>
                            <span className="font-mono font-semibold text-primary">{studentPackage.groupCoreSubjects.length} Subject(s)</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {studentPackage.groupCoreSubjects.map((sub) => (
                              <span key={sub} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium">
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. Selected 4th Subject */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="font-semibold text-foreground">3. Selected 4th Subject (Optional):</span>
                          <span className="font-mono font-semibold text-amber-700 dark:text-amber-300">
                            {studentPackage.fourthSubject ? "1 Subject" : availableOptionalSubjects.length === 0 ? "None (No 4th subject added for this group)" : "0 (None Selected)"}
                          </span>
                        </div>
                        <div>
                          {studentPackage.fourthSubject ? (
                            <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold inline-flex items-center gap-1.5">
                              ⭐ {studentPackage.fourthSubject} (Assigned as 4th Subject)
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px] italic">
                              {availableOptionalSubjects.length === 0
                                ? "No 4th subject added for this group"
                                : "No 4th subject assigned. Select a 4th subject from the dropdown above if needed."}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Formula Summary Box */}
                      <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg">
                        <span className="font-medium">
                          Formula: Combined ({studentPackage.combinedSubjects.length}) + Group Core ({studentPackage.groupCoreSubjects.length}) + 4th Subject ({studentPackage.fourthSubject ? 1 : 0})
                        </span>
                        <span className="font-bold text-foreground">
                          = Total {studentPackage.totalCount} Subject(s)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guardian Name</label>
              <Input placeholder="Guardian name" value={form.guardian_name} onChange={e => setForm(p => ({ ...p, guardian_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</label>
              <Input placeholder="Phone number" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date of Birth</label>
              <Input type="date" value={form.date_of_birth} onChange={e => setForm(p => ({ ...p, date_of_birth: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blood Group</label>
              <Select value={form.blood_group || "none"} onValueChange={v => setForm(p => ({ ...p, blood_group: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select</SelectItem>
                  {bloodGroups.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admission Date</label>
              <Input type="date" value={form.admission_date} onChange={e => setForm(p => ({ ...p, admission_date: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</label>
            <Input placeholder="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="min-w-[180px]">
            Save Student Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentFormDialog;

