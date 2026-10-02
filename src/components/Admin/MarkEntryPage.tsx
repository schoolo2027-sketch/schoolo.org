import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, BarChart3, FileSpreadsheet, Eye, RotateCcw, AlertCircle, Trash2 } from "lucide-react";
import ExcelImportDialog from "@/components/Common/ExcelImportDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getGradeFromMarks, getGradeColor } from "@/utils/gradingUtils";
import { ALL_CLASSES, ALL_SHIFTS, ALL_VERSIONS, ALL_YEARS, getSectionsForClass, getSubjectsForClass, getSubjectNamesForClass, isGroupBasedClass, isMatchingClass } from "@/utils/subjectConfig";
import { useTeacherAssignedClasses } from "@/hooks/useTeacherAssignedClasses";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface StudentMark {
  student_id: string;
  student_name: string;
  roll: string;
  optional_subject?: string | null;
  cq: string;
  mcq: string;
  practical: string;
  ct: string;
  mt: string;
}

const MarkEntryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const examParam = searchParams.get("exam");
  const classParam = searchParams.get("class");

  const { schoolId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters: default to "all" for shift, version, section so students are never hidden by default
  const [filterYear, setFilterYear] = useState("2026");
  const [filterClass, setFilterClass] = useState(classParam || "");
  const [filterShift, setFilterShift] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterVersion, setFilterVersion] = useState("all");
  const [selectedExam, setSelectedExam] = useState(examParam || "");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteMarksDialogOpen, setDeleteMarksDialogOpen] = useState(false);

  // Realtime subscriptions so freshly added students immediately show in Mark Entry
  useRealtimeSync("students", [["students-marks"], ["students-marks", schoolId]]);
  useRealtimeSync("classes", [["classes"], ["classes", schoolId]]);
  useRealtimeSync("sections", [["all-sections"], ["all-sections", schoolId]]);

  const importMarks = async (rows: Record<string, string>[]) => {
    const errors: string[] = [];
    let inserted = 0;
    setMarks((prev) => {
      const next = [...prev];
      rows.forEach((r, i) => {
        const roll = (r.roll || "").trim();
        const name = (r.student_name || "").trim().toLowerCase();
        const idx = next.findIndex((m) =>
          (roll && String(m.roll).trim() === roll) || (!roll && name && m.student_name.toLowerCase() === name));
        if (idx === -1) {
          errors.push(`Row ${i + 2}: student (${roll || r.student_name || "?"}) not found in class list`);
          return;
        }
        next[idx] = {
          ...next[idx],
          cq: r.cq !== "" ? r.cq : next[idx].cq,
          mcq: r.mcq !== "" ? r.mcq : next[idx].mcq,
          practical: r.practical !== "" ? r.practical : next[idx].practical,
          ct: r.ct !== "" ? r.ct : next[idx].ct,
          mt: r.mt !== "" ? r.mt : next[idx].mt,
        };
        inserted++;
      });
      return next;
    });
    return { inserted, errors };
  };

  // Fetch all DB data
  const { data: exams = [] } = useQuery({
    queryKey: ["results", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("results").select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: subjectSetups = [] } = useQuery({
    queryKey: ["subject-setups", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("subject_setups").select("*").eq("school_id", schoolId);
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { assignedClassIds, isRestricted } = useTeacherAssignedClasses();

  const { data: dbClasses = [] } = useQuery({
    queryKey: ["classes", schoolId, assignedClassIds],
    queryFn: async () => {
      if (!schoolId) return [];
      if (isRestricted && assignedClassIds?.length === 0) return [];
      let query = supabase.from("classes").select("*").eq("school_id", schoolId);
      if (isRestricted && assignedClassIds && assignedClassIds.length > 0) {
        query = query.in("id", assignedClassIds);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: dbSections = [] } = useQuery({
    queryKey: ["all-sections", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("sections").select("*").eq("school_id", schoolId);
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Normalization helper for resilient comparisons
  const normClass = (v: string) => String(v ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");

  // Load all students for the school with joined classes and sections
  const { data: rawStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["students-marks", schoolId, assignedClassIds],
    queryFn: async () => {
      if (!schoolId) return [];
      if (isRestricted && assignedClassIds?.length === 0) return [];

      let query = supabase
        .from("students")
        .select("*, classes(id, class_name, academic_year, shift, version), sections(id, section_name)")
        .eq("school_id", schoolId)
        .neq("is_active", false); // Includes true and null (avoids dropping unassigned active flags)

      if (isRestricted && assignedClassIds && assignedClassIds.length > 0) {
        query = query.in("class_id", assignedClassIds);
      }

      const { data, error } = await query.order("roll");
      if (error) {
        // Safe fallback without join if foreign keys differ
        const fallback = await supabase
          .from("students")
          .select("*")
          .eq("school_id", schoolId)
          .neq("is_active", false);
        return fallback.data || [];
      }
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Available classes: union of standard classes and classes found in DB or student records
  const availableClasses = useMemo(() => {
    const dbClassNames = dbClasses.map((c: any) => c.class_name).filter(Boolean);
    const rawStudentClassNames = rawStudents.map((s: any) => s.classes?.class_name).filter(Boolean);
    const combined = Array.from(new Set([...ALL_CLASSES, ...dbClassNames, ...rawStudentClassNames]));
    if (isRestricted) {
      return combined.filter(c => dbClasses.some((dc: any) => isMatchingClass(dc.class_name, c)));
    }
    return combined;
  }, [dbClasses, rawStudents, isRestricted]);

  // Get matching class IDs for student query
  const matchingClassIds = useMemo(() => {
    if (!filterClass || filterClass === "none") return [];
    return dbClasses.filter((c: any) => isMatchingClass(c.class_name, filterClass)).map((c: any) => c.id);
  }, [filterClass, dbClasses]);

  // Dynamic section options based on curriculum defaults, sections table, and existing student sections
  const sectionOptions = useMemo(() => {
    if (!filterClass || filterClass === "none") return [];
    const base = getSectionsForClass(filterClass);
    const dbSecs = dbSections
      .filter((s: any) => matchingClassIds.includes(s.class_id))
      .map((s: any) => s.section_name)
      .filter(Boolean);
    const studentSecs: string[] = [];
    rawStudents.forEach((st: any) => {
      const clsName = st.classes?.class_name || dbClasses.find((c: any) => c.id === st.class_id)?.class_name;
      if (clsName && isMatchingClass(clsName, filterClass)) {
        const secName = st.sections?.section_name || dbSections.find((s: any) => s.id === st.section_id)?.section_name;
        if (secName) studentSecs.push(secName);
      }
    });
    return Array.from(new Set([...base, ...dbSecs, ...studentSecs])).filter(Boolean);
  }, [filterClass, matchingClassIds, dbSections, rawStudents, dbClasses]);

  // Filter subject_setups by selected class (admin configured)
  const filteredSubjectSetups = useMemo(() => {
    if (!filterClass || filterClass === "none") return [];
    return subjectSetups.filter((s: any) => {
      const classesArr: string[] = Array.isArray(s.classes) ? s.classes : [];
      const inClass = classesArr.some((cls: string) => isMatchingClass(cls, filterClass));
      if (!inClass) return false;

      // If a specific section/group is chosen, filter out subjects restricted to other sections
      if (filterSection && filterSection !== "all") {
        const sectionsArr: string[] = Array.isArray(s.sections) ? s.sections : [];
        if (sectionsArr.length > 0 && !sectionsArr.some((sec: string) => sec.toLowerCase().trim() === filterSection.toLowerCase().trim())) {
          return false;
        }
      }

      return true;
    });
  }, [filterClass, filterSection, subjectSetups]);

  // Show subjects strictly from subject setup when available, only fallback to curriculum if no setup exists anywhere
  const subjectOptions = useMemo(() => {
    if (filteredSubjectSetups.length > 0) {
      return filteredSubjectSetups.map((s: any) => ({
        id: s.id,
        name: s.subject_name,
        fromSetup: true,
        setup: s,
      }));
    }
    // Only fallback if the school has NEVER configured ANY subjects in Subject Setup
    if (subjectSetups.length === 0 && filterClass && filterClass !== "none") {
      const curriculum = getSubjectsForClass(filterClass);
      if (curriculum.length > 0) {
        return curriculum.map((c) => ({
          id: `curriculum_${c.name}`,
          name: c.name,
          fromSetup: false,
          setup: {
            subject_name: c.name,
            full_marks: c.defaultFullMarks || 100,
            cq_total: (c.defaultFullMarks || 100) === 100 ? 70 : (c.defaultFullMarks || 100),
            cq_pass: (c.defaultFullMarks || 100) === 100 ? 23 : Math.round((c.defaultFullMarks || 100) * 0.33),
            mcq_total: (c.defaultFullMarks || 100) === 100 ? 30 : 0,
            mcq_pass: (c.defaultFullMarks || 100) === 100 ? 10 : 0,
            practical_enabled: false,
            ct_enabled: false,
            mt_enabled: false,
          },
        }));
      }
    }
    return [];
  }, [filteredSubjectSetups, filterClass, subjectSetups.length]);

  const selectedSubjectOption = subjectOptions.find(s => s.id === selectedSubject);
  const selectedSubjectSetup = subjectSetups.find((s: any) => s.id === selectedSubject) || selectedSubjectOption?.setup;

  // Clear stale subject selection when class changes / options reload
  useEffect(() => {
    if (selectedSubject && subjectOptions.length > 0 && !subjectOptions.some(s => s.id === selectedSubject)) {
      setSelectedSubject("");
    }
  }, [subjectOptions, selectedSubject]);

  // Filter students reliably for the selected class and optional filters
  const students = useMemo(() => {
    if (!filterClass || filterClass === "none") return [];

    return rawStudents.filter((s: any) => {
      const studentClassObj = s.classes || dbClasses.find((c: any) => c.id === s.class_id);
      const studentClassName = studentClassObj?.class_name || "";

      // 1. Class matching
      const directMatch = isMatchingClass(studentClassName, filterClass);
      const idMatch = matchingClassIds.includes(s.class_id);
      if (!directMatch && !idMatch) return false;

      // 2. Section matching: if "all", do NOT filter out any students
      if (filterSection && filterSection !== "all" && filterSection !== "none") {
        const studentSecObj = s.sections || dbSections.find((sec: any) => sec.id === s.section_id);
        const studentSecName = studentSecObj?.section_name || "";
        const secMatch = normClass(studentSecName) === normClass(filterSection) ||
                         (s.section_id && dbSections.some((sec: any) => sec.id === s.section_id && normClass(sec.section_name) === normClass(filterSection)));
        if (!secMatch) return false;
      }

      // 3. Shift matching: if "all", do NOT filter out
      if (filterShift && filterShift !== "all" && filterShift !== "none") {
        const studentShift = studentClassObj?.shift || "";
        if (studentShift && normClass(studentShift) !== normClass(filterShift)) {
          return false;
        }
      }

      // 4. Version matching: if "all", do NOT filter out
      if (filterVersion && filterVersion !== "all" && filterVersion !== "none") {
        const studentVersion = studentClassObj?.version || "";
        if (studentVersion && studentVersion !== "all" && normClass(studentVersion) !== normClass(filterVersion)) {
          return false;
        }
      }

      // 5. Year matching: if "all", do NOT filter out
      if (filterYear && filterYear !== "all" && filterYear !== "none") {
        const studentYear = studentClassObj?.academic_year;
        if (studentYear && String(studentYear) !== String(filterYear)) {
          return false;
        }
      }

      return true;
    }).sort((a: any, b: any) => {
      const rollA = parseInt(a.roll) || 0;
      const rollB = parseInt(b.roll) || 0;
      if (rollA && rollB) return rollA - rollB;
      if (rollA && !rollB) return -1;
      if (!rollA && rollB) return 1;
      return (a.student_name || "").localeCompare(b.student_name || "");
    });
  }, [rawStudents, filterClass, filterSection, filterShift, filterVersion, filterYear, dbClasses, dbSections, matchingClassIds]);

  // Load existing marks
  const { data: existingMarks = [] } = useQuery({
    queryKey: ["existing-marks", selectedExam, selectedSubject, schoolId],
    queryFn: async () => {
      if (!schoolId || !selectedExam || !selectedSubject) return [];
      const subjectName = selectedSubjectSetup?.subject_name || selectedSubjectOption?.name;
      if (!subjectName) return [];

      const { data: subjectRecords } = await supabase.from("subjects")
        .select("id").eq("school_id", schoolId).eq("subject_name", subjectName);
      if (!subjectRecords || subjectRecords.length === 0) return [];

      const subjectIds = subjectRecords.map(s => s.id);
      const { data } = await supabase.from("marks")
        .select("*").eq("school_id", schoolId).eq("result_id", selectedExam).in("subject_id", subjectIds);
      return data || [];
    },
    enabled: !!schoolId && !!selectedExam && !!selectedSubject,
  });

  // Populate marks when students load while preserving any user-typed inputs
  useEffect(() => {
    if (students.length > 0) {
      setMarks((prev) => {
        return students.map((s: any) => {
          const prevEntry = prev.find(p => p.student_id === s.id);
          const existing = existingMarks.find((m: any) => m.student_id === s.id);
          return {
            student_id: s.id,
            student_name: s.student_name,
            roll: s.roll || "",
            optional_subject: s.optional_subject || null,
            cq: prevEntry?.cq !== undefined && prevEntry.cq !== "" ? prevEntry.cq : (existing ? String(existing.marks_obtained || "") : ""),
            mcq: prevEntry?.mcq || "",
            practical: prevEntry?.practical || "",
            ct: prevEntry?.ct || "",
            mt: prevEntry?.mt || "",
          };
        });
      });
    } else {
      setMarks([]);
    }
  }, [students, existingMarks]);

  const updateMark = (studentId: string, field: keyof Pick<StudentMark, "cq" | "mcq" | "practical" | "ct" | "mt">, value: string) => {
    setMarks(prev => prev.map(m =>
      m.student_id === studentId ? { ...m, [field]: value } : m
    ));
  };

  const showPractical = selectedSubjectSetup?.practical_enabled ?? false;
  const showCT = selectedSubjectSetup?.ct_enabled ?? false;
  const showMT = selectedSubjectSetup?.mt_enabled ?? false;
  const fullMarks = selectedSubjectSetup?.full_marks || 100;

  const getTotal = (mark: StudentMark) => {
    let total = (parseFloat(mark.cq) || 0) + (parseFloat(mark.mcq) || 0);
    if (showPractical) total += (parseFloat(mark.practical) || 0);
    if (showCT) total += (parseFloat(mark.ct) || 0);
    if (showMT) total += (parseFloat(mark.mt) || 0);
    return total;
  };

  const colCount = 6 + (showPractical ? 1 : 0) + (showCT ? 1 : 0) + (showMT ? 1 : 0) + 2;

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId || !selectedExam || !selectedSubject) throw new Error("Select exam and subject first");
      const subjectName = selectedSubjectSetup?.subject_name || selectedSubjectOption?.name;
      if (!subjectName) throw new Error("Invalid subject");

      const { data: existingSubjects } = await supabase.from("subjects")
        .select("id").eq("school_id", schoolId).eq("subject_name", subjectName);
      let subjectId = existingSubjects?.[0]?.id;
      if (!subjectId) {
        const { data: newSubject, error } = await supabase.from("subjects")
          .insert({ school_id: schoolId, subject_name: subjectName })
          .select("id").single();
        if (error) throw error;
        subjectId = newSubject.id;
      }

      const hasValue = (val: any) => val !== "" && val !== null && val !== undefined;
      const marksToInsert = marks
        .filter(m => hasValue(m.cq) || hasValue(m.mcq) || hasValue(m.practical) || hasValue(m.ct) || hasValue(m.mt))
        .map(m => {
          const total = getTotal(m);
          const { grade } = getGradeFromMarks(total, fullMarks);
          return {
            school_id: schoolId,
            result_id: selectedExam,
            student_id: m.student_id,
            subject_id: subjectId,
            marks_obtained: total,
            total_marks: fullMarks,
            grade,
          };
        });

      // Delete existing marks for ALL students in the current view (clearing any emptied rows)
      const allStudentIds = marks.map(m => m.student_id);
      if (allStudentIds.length > 0) {
        await supabase.from("marks")
          .delete()
          .eq("school_id", schoolId)
          .eq("result_id", selectedExam)
          .eq("subject_id", subjectId)
          .in("student_id", allStudentIds);
      }

      if (marksToInsert.length > 0) {
        const { error } = await supabase.from("marks").insert(marksToInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marks"] });
      queryClient.invalidateQueries({ queryKey: ["marks-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["existing-marks"] });
      queryClient.invalidateQueries({ queryKey: ["student-marks"] });
      queryClient.invalidateQueries({ queryKey: ["results"] });
      toast({ 
        title: "Marks saved successfully!", 
        description: "Results are updated with calculated GPA and grades." 
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteSubjectMarksMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId || !selectedExam || !selectedSubject) throw new Error("Select exam and subject first");
      const subjectName = selectedSubjectSetup?.subject_name || selectedSubjectOption?.name;
      if (!subjectName) throw new Error("Invalid subject");

      const { data: existingSubjects } = await supabase.from("subjects")
        .select("id").eq("school_id", schoolId).eq("subject_name", subjectName);
      if (!existingSubjects || existingSubjects.length === 0) return 0;

      const subjectIds = existingSubjects.map(s => s.id);
      let query = supabase.from("marks").delete()
        .eq("school_id", schoolId)
        .eq("result_id", selectedExam)
        .in("subject_id", subjectIds);

      // If class is filtered, delete for students of this class
      if (students.length > 0) {
        const sIds = students.map((s: any) => s.id);
        query = query.in("student_id", sIds);
      }

      const { error } = await query;
      if (error) throw error;
      return existingMarks.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marks"] });
      queryClient.invalidateQueries({ queryKey: ["marks-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["existing-marks"] });
      queryClient.invalidateQueries({ queryKey: ["student-marks"] });
      queryClient.invalidateQueries({ queryKey: ["results"] });
      setDeleteMarksDialogOpen(false);
      toast({
        title: "Marks deleted",
        description: `All marks for "${selectedSubjectSetup?.subject_name || selectedSubjectOption?.name}" have been removed.`
      });
    },
    onError: (e: any) => toast({ title: "Error deleting marks", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-0">
      {/* Dark Header */}
      <div className="bg-sidebar text-sidebar-foreground p-6 rounded-b-2xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(selectedExam ? `/results?exam=${selectedExam}&tab=ledger` : "/results")}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors border border-white/10"
              title="Back to Results"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold font-heading uppercase tracking-wide">Mark Entry Console</h1>
              <p className="text-xs uppercase tracking-widest opacity-50 mt-0.5">Bangladesh Education Board Grading</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedExam && selectedSubject && existingMarks.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setDeleteMarksDialogOpen(true)}
                disabled={deleteSubjectMarksMutation.isPending}
                className="gap-2 bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                <Trash2 className="h-4 w-4" /> Delete Subject Marks
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate(selectedExam ? `/results?exam=${selectedExam}&tab=ledger` : "/results?tab=ledger")}
              className="gap-2 bg-white/10 border-white/15 text-sidebar-foreground hover:bg-white/20"
            >
              <Eye className="h-4 w-4" /> View in Ledger
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              disabled={marks.length === 0}
              className="gap-2 bg-white/10 border-white/15 text-sidebar-foreground hover:bg-white/20"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel Import
            </Button>
            <Button
              onClick={() => commitMutation.mutate()}
              disabled={commitMutation.isPending || !selectedExam || !selectedSubject || marks.length === 0}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
            >
              <Save className="h-4 w-4" /> Commit Records
            </Button>
          </div>
        </div>

        {/* Filters: Year → Class → Shift → Section → Version → Exam → Subject */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Year */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary">Year</label>
            <Select value={filterYear} onValueChange={v => { setFilterYear(v); setMarks([]); }}>
              <SelectTrigger className="h-9 bg-white/10 border-white/15 text-sidebar-foreground rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {ALL_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Class */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary">Class</label>
            <Select value={filterClass || "none"} onValueChange={v => {
              setFilterClass(v === "none" ? "" : v);
              setFilterSection("all");
              setSelectedSubject("");
              setMarks([]);
            }}>
              <SelectTrigger className="h-9 bg-white/10 border-white/15 text-sidebar-foreground rounded-lg"><SelectValue placeholder="Select Class" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select Class</SelectItem>
                {availableClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Shift */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary">Shift</label>
            <Select value={filterShift} onValueChange={v => { setFilterShift(v); setMarks([]); }}>
              <SelectTrigger className="h-9 bg-white/10 border-white/15 text-sidebar-foreground rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                {ALL_SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Section */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary">Section</label>
            <Select value={filterSection || "all"} onValueChange={v => { setFilterSection(v); setMarks([]); }}>
              <SelectTrigger className="h-9 bg-white/10 border-white/15 text-sidebar-foreground rounded-lg"><SelectValue placeholder="Section" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sectionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Version */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary">Version</label>
            <Select value={filterVersion} onValueChange={v => { setFilterVersion(v); setMarks([]); }}>
              <SelectTrigger className="h-9 bg-white/10 border-white/15 text-sidebar-foreground rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Versions</SelectItem>
                {ALL_VERSIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Exam */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary">Exam</label>
            <Select value={selectedExam || "none"} onValueChange={v => setSelectedExam(v === "none" ? "" : v)}>
              <SelectTrigger className="h-9 bg-white/10 border-white/15 text-sidebar-foreground rounded-lg"><SelectValue placeholder="Select Exam" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select Exam</SelectItem>
                {exams.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.exam_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary">Subject</label>
            <Select value={selectedSubject || "none"} onValueChange={v => setSelectedSubject(v === "none" ? "" : v)} disabled={!filterClass}>
              <SelectTrigger className="h-9 bg-white/10 border-white/15 text-sidebar-foreground rounded-lg"><SelectValue placeholder="Select Subject" /></SelectTrigger>
              <SelectContent className="z-[60] max-h-64">
                <SelectItem value="none">Select Subject</SelectItem>
                {subjectOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
                {filterClass && subjectOptions.length === 0 && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">
                    No subjects configured for this class — configure subjects from Results &gt; Subject Setup.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dynamic subject config info */}
        {selectedSubjectSetup && (
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded-full font-semibold bg-blue-500/20 text-blue-300">
              CQ: {selectedSubjectSetup.cq_total} (Pass: {selectedSubjectSetup.cq_pass})
            </span>
            <span className="px-2 py-0.5 rounded-full font-semibold bg-purple-500/20 text-purple-300">
              MCQ: {selectedSubjectSetup.mcq_total} (Pass: {selectedSubjectSetup.mcq_pass})
            </span>
            {showPractical && (
              <span className="px-2 py-0.5 rounded-full font-semibold bg-teal-500/20 text-teal-300">
                Practical: {selectedSubjectSetup.practical_total} (Pass: {selectedSubjectSetup.practical_pass})
              </span>
            )}
            {showCT && (
              <span className="px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-300">
                CT: {selectedSubjectSetup.ct_total}
              </span>
            )}
            {showMT && (
              <span className="px-2 py-0.5 rounded-full font-semibold bg-orange-500/20 text-orange-300">
                MT: {selectedSubjectSetup.mt_total}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-300">
              Full Marks: {fullMarks}
            </span>
          </div>
        )}

        {/* Grading Reference */}
        {!selectedSubjectSetup && (
          <div className="flex flex-wrap gap-2 text-[10px]">
            {[
              { label: "A+ (80-100)", cls: "bg-emerald-500/20 text-emerald-300" },
              { label: "A (70-79)", cls: "bg-green-500/20 text-green-300" },
              { label: "A- (60-69)", cls: "bg-teal-500/20 text-teal-300" },
              { label: "B (50-59)", cls: "bg-blue-500/20 text-blue-300" },
              { label: "C (40-49)", cls: "bg-amber-500/20 text-amber-300" },
              { label: "D (33-39)", cls: "bg-orange-500/20 text-orange-300" },
              { label: "F (0-32)", cls: "bg-red-500/20 text-red-300" },
            ].map(g => (
              <span key={g.label} className={`px-2 py-0.5 rounded-full font-semibold ${g.cls}`}>{g.label}</span>
            ))}
          </div>
        )}
      </div>

      {/* Marks Table */}
      <div className="p-6">
        {filterClass && filterClass !== "none" && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 mb-4 rounded-xl bg-card border border-border/70 shadow-sm text-xs">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <span className="font-semibold text-foreground">Class: <span className="text-primary">{filterClass}</span></span>
              <span>•</span>
              <span>Total Students: <strong className="text-foreground font-bold">{students.length}</strong></span>
              {filterSection && filterSection !== "all" && (
                <>
                  <span>•</span>
                  <span>Section: <strong className="text-foreground">{filterSection}</strong></span>
                </>
              )}
              {filterShift && filterShift !== "all" && (
                <>
                  <span>•</span>
                  <span>Shift: <strong className="text-foreground">{filterShift}</strong></span>
                </>
              )}
              {filterVersion && filterVersion !== "all" && (
                <>
                  <span>•</span>
                  <span>Version: <strong className="text-foreground">{filterVersion}</strong></span>
                </>
              )}
              {filterYear && filterYear !== "all" && (
                <>
                  <span>•</span>
                  <span>Year: <strong className="text-foreground">{filterYear}</strong></span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(!selectedExam || !selectedSubject) && students.length > 0 && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2.5 py-1 rounded-md">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Select Exam & Subject to enter and save marks</span>
                </div>
              )}
              {(filterSection !== "all" || filterShift !== "all" || filterVersion !== "all" || filterYear !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterSection("all");
                    setFilterShift("all");
                    setFilterVersion("all");
                    setFilterYear("all");
                  }}
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3" /> Reset Sub-filters
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="stat-card overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4">#</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4">Student</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 w-20">Roll</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 w-24">CQ Marks</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 w-24">MCQ Marks</TableHead>
                {showPractical && (
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 w-24">Practical</TableHead>
                )}
                {showCT && (
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 w-24">CT</TableHead>
                )}
                {showMT && (
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 w-24">MT</TableHead>
                )}
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 w-20 text-center">Total</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 w-20 text-center">Grade</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 w-20 text-center">GPA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center">
                        <BarChart3 className="h-7 w-7 text-muted-foreground/40" />
                      </div>
                      <p className="text-muted-foreground font-medium text-base">
                        {!filterClass ? "Select class to load students" :
                          studentsLoading ? "Loading students..." :
                            students.length === 0 ? `No students found for class "${filterClass}"` :
                              "Select exam & subject to begin mark entry"}
                      </p>
                      {filterClass && !studentsLoading && (
                        <div className="flex flex-col items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground max-w-md">
                            Students might be filtered out by current Section, Shift, or Version filters.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFilterSection("all");
                              setFilterShift("all");
                              setFilterVersion("all");
                              setFilterYear("all");
                            }}
                            className="gap-1.5 h-8 text-xs"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Reset Filters (Show All Students)
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                marks.map((mark, index) => {
                  const total = getTotal(mark);
                  const { grade, gpa } = getGradeFromMarks(total, fullMarks);
                  const hasMarks = mark.cq || mark.mcq || mark.practical || mark.ct || mark.mt;
                  const currentSubjectName = selectedSubjectSetup?.subject_name || selectedSubjectOption?.name || "";
                  const isStudent4th = !!(mark.optional_subject && currentSubjectName && (
                    mark.optional_subject.toLowerCase().trim() === currentSubjectName.toLowerCase().trim() ||
                    currentSubjectName.toLowerCase().includes(mark.optional_subject.toLowerCase().trim()) ||
                    mark.optional_subject.toLowerCase().includes(currentSubjectName.toLowerCase().trim())
                  ));
                  return (
                    <TableRow key={mark.student_id} className={`hover:bg-muted/20 transition-colors ${index % 2 === 0 ? "bg-muted/5" : ""}`}>
                      <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <span>{mark.student_name}</span>
                          {isStudent4th && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              4th Subject
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{mark.roll}</span>
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-9 w-24 text-center rounded-lg border-2 border-border/60 focus:border-primary transition-colors font-medium"
                          placeholder="0" value={mark.cq} onChange={e => updateMark(mark.student_id, "cq", e.target.value)}
                          max={selectedSubjectSetup?.cq_total || 100} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-9 w-24 text-center rounded-lg border-2 border-border/60 focus:border-primary transition-colors font-medium"
                          placeholder="0" value={mark.mcq} onChange={e => updateMark(mark.student_id, "mcq", e.target.value)}
                          max={selectedSubjectSetup?.mcq_total || 100} />
                      </TableCell>
                      {showPractical && (
                        <TableCell>
                          <Input type="number" className="h-9 w-24 text-center rounded-lg border-2 border-border/60 focus:border-primary transition-colors font-medium"
                            placeholder="0" value={mark.practical} onChange={e => updateMark(mark.student_id, "practical", e.target.value)}
                            max={selectedSubjectSetup?.practical_total || 100} />
                        </TableCell>
                      )}
                      {showCT && (
                        <TableCell>
                          <Input type="number" className="h-9 w-24 text-center rounded-lg border-2 border-border/60 focus:border-primary transition-colors font-medium"
                            placeholder="0" value={mark.ct} onChange={e => updateMark(mark.student_id, "ct", e.target.value)}
                            max={selectedSubjectSetup?.ct_total || 100} />
                        </TableCell>
                      )}
                      {showMT && (
                        <TableCell>
                          <Input type="number" className="h-9 w-24 text-center rounded-lg border-2 border-border/60 focus:border-primary transition-colors font-medium"
                            placeholder="0" value={mark.mt} onChange={e => updateMark(mark.student_id, "mt", e.target.value)}
                            max={selectedSubjectSetup?.mt_total || 100} />
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <span className="font-bold text-primary text-lg">{hasMarks ? total : "-"}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {hasMarks ? (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${getGradeColor(grade)}`}>{grade}</span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {hasMarks ? (
                          <span className="font-bold text-foreground">{gpa.toFixed(2)}</span>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Marks from Excel"
        description="Marks will be matched by Roll number (or Student Name). Click 'Commit Records' after importing."
        templateName="marks"
        columns={[
          { key: "roll", label: "Roll", required: true, example: "1" },
          { key: "student_name", label: "Student Name", example: "Rahim Uddin" },
          { key: "cq", label: "CQ", example: "45" },
          { key: "mcq", label: "MCQ", example: "20" },
          { key: "practical", label: "Practical", example: "20" },
          { key: "ct", label: "CT", example: "10" },
          { key: "mt", label: "MT", example: "5" },
        ]}
        onImport={importMarks}
      />

      {/* Delete Marks Confirmation Dialog */}
      <AlertDialog open={deleteMarksDialogOpen} onOpenChange={setDeleteMarksDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete All Marks for This Subject?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete all marks for <span className="font-semibold text-foreground">&quot;{selectedSubjectSetup?.subject_name || selectedSubjectOption?.name}&quot;</span> in this exam{filterClass ? ` for Class ${filterClass}` : ""}?
              <br /><br />
              This will remove existing scores from the database and recalculate the results ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
            <AlertDialogCancel disabled={deleteSubjectMarksMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium"
              disabled={deleteSubjectMarksMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                deleteSubjectMarksMutation.mutate();
              }}
            >
              {deleteSubjectMarksMutation.isPending ? "Deleting..." : "Yes, Delete Marks"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MarkEntryPage;
