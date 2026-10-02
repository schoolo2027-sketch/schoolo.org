import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  Plus, Search, BarChart3, ClipboardList, BookOpen, Trophy, FileText, Globe, Printer, Pencil, Trash2, Check, X, Eye, EyeOff, Award, Copy, RotateCcw, AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import SubjectSetupDialog from "./SubjectSetupDialog";
import FinalResultTab from "./FinalResultTab";
import { getGradeFromMarks, calculateFinalGPA, calculateFinalGPAWithOptional, calculateBangladeshBoardResult, getGradeFromGPA, getGradeColor } from "@/utils/gradingUtils";
import { printMarksheet } from "@/utils/marksheetPrint";
import { printWithSchoolHeader } from "@/utils/printUtils";
import { ALL_CLASSES, ALL_SHIFTS, ALL_VERSIONS, ALL_YEARS, getSectionsForClass, getSubjectsForClass, isGroupBasedClass, isMatchingClass } from "@/utils/subjectConfig";
import { useTeacherAssignedClasses } from "@/hooks/useTeacherAssignedClasses";

const ResultsPage = () => {
  const { schoolId, roles, teacherPermissions } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const examParam = searchParams.get("exam");
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tabParam || "exams");
  const [search, setSearch] = useState("");

  // Filters
  const [filterYear, setFilterYear] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterVersion, setFilterVersion] = useState("");
  const [selectedExamId, setSelectedExamId] = useState(examParam || "");

  // Sync realtime changes
  useRealtimeSync("marks", [["marks-ledger"], ["existing-marks"], ["results"]]);
  useRealtimeSync("results", [["results"]]);

  const { assignedClassIds, isRestricted } = useTeacherAssignedClasses();

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (examParam) {
      setSelectedExamId(examParam);
      setActiveTab(tabParam || "ledger");
    }
  }, [examParam, tabParam]);

  // Create Exam dialog
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [examName, setExamName] = useState("");

  // Subject setup dialog
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [editingSubjectSetup, setEditingSubjectSetup] = useState<any>(null);

  // Subject tab filter
  const [subjectFilterClass, setSubjectFilterClass] = useState("Play");

  // Edit/Clone/Delete exam dialogs
  const [editExamDialogOpen, setEditExamDialogOpen] = useState(false);
  const [cloneExamDialogOpen, setCloneExamDialogOpen] = useState(false);
  const [editExamData, setEditExamData] = useState<{ id: string; exam_name: string; academic_year: number } | null>(null);
  const [cloneExamData, setCloneExamData] = useState<{ exam_name: string; academic_year: number } | null>(null);
  const [examToDelete, setExamToDelete] = useState<{ id: string; exam_name: string } | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<{ id: string; subject_name: string } | null>(null);

  const isAdmin = roles.some(r => ["master_admin", "school_admin"].includes(r));
  const isTeacher = roles.includes("teacher" as any);
  const canManage = isAdmin || (isTeacher && teacherPermissions.can_entry_results);
  const filterSectionOptions = filterClass ? getSectionsForClass(filterClass) : [];

  // Curriculum subjects for selected class in subjects tab
  const subjectTabSections = getSectionsForClass(subjectFilterClass);
  const isGroupBased = isGroupBasedClass(subjectFilterClass);


  // DB data
  const { data: dbClasses = [] } = useQuery({
    queryKey: ["classes", schoolId, assignedClassIds],
    queryFn: async () => {
      if (!schoolId) return [];
      let query = supabase.from("classes").select("*").eq("school_id", schoolId);
      if (isRestricted && assignedClassIds && assignedClassIds.length > 0) {
        query = query.in("id", assignedClassIds);
      }
      const { data } = await query;
      return (isRestricted && assignedClassIds?.length === 0) ? [] : data || [];
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

  const { data: dbStudents = [] } = useQuery({
    queryKey: ["all-students-lookup", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("students").select("id, student_name, roll, student_id, class_id, section_id, optional_subject").eq("school_id", schoolId);
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: dbSubjects = [] } = useQuery({
    queryKey: ["all-subjects-lookup", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("subjects").select("id, subject_name").eq("school_id", schoolId);
      return data || [];
    },
    enabled: !!schoolId,
  });

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["results", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase.from("results").select("*, classes(class_name), sections(section_name)").eq("school_id", schoolId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: subjectSetups = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["subject-setups", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase.from("subject_setups").select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Only show subjects admin has explicitly added via subject_setups for this class.
  // No default/curriculum fallback — table starts empty until admin configures.
  const curriculumSubjectsForTab = useMemo(() => {
    if (!subjectFilterClass) return [];
    const matches = (subjectSetups as any[]).filter((ss: any) =>
      (ss.classes || []).some((c: string) => isMatchingClass(c, subjectFilterClass))
    );
    return matches.map((ss: any) => ({ name: ss.subject_name, group: ss.subject_group || "All" }));
  }, [subjectFilterClass, subjectSetups]);

  // Auto-select latest exam if none selected
  useEffect(() => {
    if (!selectedExamId && results.length > 0) {
      setSelectedExamId(results[0].id);
    }
  }, [results, selectedExamId]);

  // Fetch marks for selected exam (ledger)
  const { data: marksData = [], isLoading: marksLoading } = useQuery({
    queryKey: ["marks-ledger", schoolId, selectedExamId],
    queryFn: async () => {
      if (!schoolId || !selectedExamId) return [];
      try {
        const { data, error } = await supabase.from("marks")
          .select("*, students(id, student_name, roll, student_id, class_id, section_id, optional_subject, classes(class_name, shift, version, academic_year), sections(section_name)), subjects(id, subject_name)")
          .eq("school_id", schoolId).eq("result_id", selectedExamId);
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn("Nested marks query error, attempting simple select:", err);
      }

      // Fallback query without complex nested embedding
      const { data: simpleData, error: simpleError } = await supabase.from("marks")
        .select("*")
        .eq("school_id", schoolId).eq("result_id", selectedExamId);
      if (simpleError) throw simpleError;
      return simpleData || [];
    },
    enabled: !!schoolId && !!selectedExamId,
  });

  // Helper: expected subjects for a class (only from admin's subject setups)
  const getExpectedSubjectsForClass = (className: string, _sectionName?: string) => {
    if (!className) return [] as { name: string; fullMarks: number; isOptional: boolean }[];
    return (subjectSetups as any[])
      .filter((s: any) => (s.classes || []).some((c: string) => (c || "").toLowerCase() === className.toLowerCase()))
      .map((s: any) => ({ name: s.subject_name as string, fullMarks: (s.full_marks as number) || 100, isOptional: !!s.is_optional }));
  };

  // Optional (4th) subject names per class — Class 9-12 only
  const isOptionalSubject = (className: string, subjectName: string) =>
    (subjectSetups as any[])?.some((s: any) =>
      s.is_optional &&
      (s.subject_name || "").toLowerCase().trim() === (subjectName || "").toLowerCase().trim() &&
      (s.classes || []).some((c: string) => isMatchingClass(c, className))
    );

  const isStudentOptionalSubject = (studentOpt: string | null | undefined, className: string, subjectName: string) => {
    if (studentOpt && subjectName) {
      const opt = studentOpt.toLowerCase().trim();
      const sub = subjectName.toLowerCase().trim();
      if (opt === sub || sub.includes(opt) || opt.includes(sub)) return true;
      if (isGroupBasedClass(className)) return false;
    }
    if (isGroupBasedClass(className)) {
      return false;
    }
    return isOptionalSubject(className, subjectName);
  };

  // Helper to check if a subject is valid for a given student's class and section/group based on subject_setups and group_subjects
  const isSubjectConfiguredForStudent = useCallback((
    className: string,
    sectionName: string,
    optionalSubject: string,
    subjectName: string,
    groupSubjects?: string[] | string | null
  ): boolean => {
    if (!subjectSetups || (subjectSetups as any[]).length === 0) return true;

    const norm = (s: string) => (s || "").trim().toLowerCase();
    const subNorm = norm(subjectName);
    const secNorm = norm(sectionName);
    const optNorm = norm(optionalSubject);

    // Parse selected group subjects
    let parsedGroupSubs: string[] = [];
    if (Array.isArray(groupSubjects)) {
      parsedGroupSubs = groupSubjects.map(s => norm(s)).filter(Boolean);
    } else if (typeof groupSubjects === "string" && groupSubjects.trim()) {
      parsedGroupSubs = groupSubjects.split(",").map(s => norm(s)).filter(Boolean);
    }

    // 1. If subject was explicitly chosen as student's 4th/optional subject, it is always configured!
    if (optNorm && (optNorm === subNorm || optNorm.includes(subNorm) || subNorm.includes(optNorm))) {
      return true;
    }

    // Find setups for this student's class using robust class matching
    const classSetups = (subjectSetups as any[]).filter((ss: any) =>
      (ss.classes || []).some((c: string) => isMatchingClass(c, className))
    );

    // If subject setups exist for this class, strictly permit ONLY subjects in this setup
    if (classSetups.length > 0) {
      return classSetups.some((ss: any) => {
        const ssSubName = norm(ss.subject_name);
        if (ssSubName !== subNorm) return false;

        // Check section/group restriction if any
        const ssSections: string[] = Array.isArray(ss.sections) ? ss.sections : [];
        if (ssSections.length === 0) return true; // Common/Combined to all sections/groups

        // Matches student's section/group
        const matchesSection = ssSections.some((sec: string) => {
          const l = norm(sec);
          if (secNorm === "science") return l === "science";
          if (secNorm.includes("business")) return l.includes("business");
          if (secNorm.includes("humanities") || secNorm.includes("arts")) return l.includes("humanities") || l.includes("arts");
          return l === secNorm;
        });

        if (matchesSection) {
          // If student has explicit group_subjects selected, only permit if it's in their selected list
          if (parsedGroupSubs.length > 0) {
            return parsedGroupSubs.some(gs => gs === ssSubName || gs.includes(ssSubName) || ssSubName.includes(gs));
          }
          return true;
        }

        return false;
      });
    }

    return false;
  }, [subjectSetups]);

  // Process ledger data: group by student, calculate GPA (missing class-subjects count as Fail)
  const ledgerData = (() => {
    if (marksData.length === 0) return [];
    const studentMap: Record<string, {
      student_id: string; student_name: string; roll: string; sid: string;
      className: string; section: string; shift: string; version: string; year: string; optional_subject: string;
      subjects: { name: string; obtained: number; total: number; grade: string; gpa: number; isOptional?: boolean }[];
      totalObtained: number; totalFull: number;
    }> = {};

    marksData.forEach((m: any) => {
      const sid = m.student_id;
      const rawStudent = m.students;
      const student = (Array.isArray(rawStudent) ? rawStudent[0] : rawStudent) || dbStudents.find((st: any) => st.id === sid);
      const classId = student?.class_id;
      const sectionId = student?.section_id;

      const rawCls = student?.classes;
      const clsFromStudent = Array.isArray(rawCls) ? rawCls[0] : rawCls;
      const cls = (clsFromStudent?.class_name ? clsFromStudent : null) || dbClasses.find((c: any) => c.id === classId);

      const rawSec = student?.sections;
      const secFromStudent = Array.isArray(rawSec) ? rawSec[0] : rawSec;
      const sec = (secFromStudent?.section_name ? secFromStudent : null) || dbSections.find((s: any) => s.id === sectionId);

      const rawSub = m.subjects;
      const subFromMarks = Array.isArray(rawSub) ? rawSub[0] : rawSub;
      const sub = (subFromMarks?.subject_name ? subFromMarks : null) || dbSubjects.find((sb: any) => sb.id === m.subject_id);
      const subjectName = sub?.subject_name || "Subject";

      const studentClass = cls?.class_name || "";
      const studentSec = sec?.section_name || "";
      const studentOpt = student?.optional_subject || "";
      const studentGroup = student?.group_subjects || (sid ? localStorage.getItem(`schoolo_student_group_subjects_${sid}`) : null);

      // Strictly verify that the subject was configured for this student's class/group in subject_setups
      const isConfigured = isSubjectConfiguredForStudent(studentClass, studentSec, studentOpt, subjectName, studentGroup);
      if (!isConfigured) {
        // Exclude unconfigured / orphan subject marks (e.g. Bangla 1st when not in subject setup)
        return;
      }

      if (!studentMap[sid]) {
        studentMap[sid] = {
          student_id: sid,
          student_name: student?.student_name || "Unknown Student",
          roll: student?.roll || "",
          sid: student?.student_id || "",
          className: studentClass,
          section: studentSec,
          shift: cls?.shift || "",
          version: cls?.version || "",
          year: cls?.academic_year ? String(cls.academic_year) : "",
          optional_subject: studentOpt,
          subjects: [],
          totalObtained: 0,
          totalFull: 0,
        };
      }
      const { grade, gpa } = getGradeFromMarks(m.marks_obtained || 0, m.total_marks || 100);
      const isOpt = isStudentOptionalSubject(studentMap[sid].optional_subject, studentMap[sid].className, subjectName);
      studentMap[sid].subjects.push({
        name: subjectName,
        obtained: m.marks_obtained || 0,
        total: m.total_marks || 100,
        grade, gpa,
        isOptional: isOpt,
      });
      studentMap[sid].totalObtained += m.marks_obtained || 0;
      studentMap[sid].totalFull += m.total_marks || 100;
    });

    const studentList = Object.values(studentMap).map(s => {
      // Calculate Bangladesh Board Result based on entered subjects
      const boardRes = calculateBangladeshBoardResult(
        s.subjects.map(sub => ({
          name: sub.name,
          obtained: sub.obtained,
          total: sub.total,
          grade: sub.grade,
          gpa: sub.gpa,
          isOptional: sub.isOptional,
        })),
        (name) => isStudentOptionalSubject(s.optional_subject, s.className, name)
      );
      const finalGPA = boardRes.finalGPA;
      const finalGrade = boardRes.finalGrade;
      return { ...s, finalGPA, finalGrade, boardResult: boardRes, subjectCount: s.subjects.length };
    });

    // Sort by totalObtained desc for ranking
    studentList.sort((a, b) => b.totalObtained - a.totalObtained);
    return studentList.map((s, i) => ({ ...s, position: i + 1 }));
  })();

  // Identify any orphaned marks for the selected exam (marks for subjects not in subject_setups for that class)
  const orphanMarks = useMemo(() => {
    if (!selectedExamId || marksData.length === 0 || (subjectSetups as any[]).length === 0) return [];
    return marksData.filter((m: any) => {
      const sid = m.student_id;
      const rawStudent = m.students;
      const student = (Array.isArray(rawStudent) ? rawStudent[0] : rawStudent) || dbStudents.find((st: any) => st.id === sid);
      const classId = student?.class_id;
      const sectionId = student?.section_id;

      const rawCls = student?.classes;
      const clsFromStudent = Array.isArray(rawCls) ? rawCls[0] : rawCls;
      const cls = (clsFromStudent?.class_name ? clsFromStudent : null) || dbClasses.find((c: any) => c.id === classId);

      const rawSec = student?.sections;
      const secFromStudent = Array.isArray(rawSec) ? rawSec[0] : rawSec;
      const sec = (secFromStudent?.section_name ? secFromStudent : null) || dbSections.find((s: any) => s.id === sectionId);

      const rawSub = m.subjects;
      const subFromMarks = Array.isArray(rawSub) ? rawSub[0] : rawSub;
      const sub = (subFromMarks?.subject_name ? subFromMarks : null) || dbSubjects.find((sb: any) => sb.id === m.subject_id);
      const subjectName = sub?.subject_name || "Subject";

      const className = cls?.class_name || "";
      const sectionName = sec?.section_name || "";
      const optionalSub = student?.optional_subject || "";
      const studentGroup = student?.group_subjects || (sid ? localStorage.getItem(`schoolo_student_group_subjects_${sid}`) : null);

      return !isSubjectConfiguredForStudent(className, sectionName, optionalSub, subjectName, studentGroup);
    });
  }, [marksData, subjectSetups, selectedExamId, dbStudents, dbClasses, dbSections, dbSubjects, isSubjectConfiguredForStudent]);

  const purgeOrphanMarksMutation = useMutation({
    mutationFn: async () => {
      if (orphanMarks.length === 0) return 0;
      const idsToDelete = orphanMarks.map((m: any) => m.id);
      const { error } = await supabase.from("marks").delete().in("id", idsToDelete);
      if (error) throw error;
      return idsToDelete.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["marks-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["marks"] });
      toast({ title: "Unconfigured marks cleaned", description: `Successfully removed ${count} mark(s) from database.` });
    },
    onError: (e: any) => toast({ title: "Error cleaning marks", description: e.message, variant: "destructive" }),
  });

  // Apply filters to ledger
  const filteredLedgerData = useMemo(() => {
    let data = ledgerData;
    const norm = (v: any) => String(v ?? "").trim().toLowerCase();
    if (filterClass) data = data.filter(s => norm(s.className) === norm(filterClass));
    if (filterSection) data = data.filter(s => norm(s.section) === norm(filterSection));
    if (filterShift) data = data.filter(s => !s.shift || norm(s.shift) === norm(filterShift));
    if (filterVersion) data = data.filter(s => !s.version || norm(s.version) === norm(filterVersion));
    if (filterYear) data = data.filter(s => !s.year || s.year === String(filterYear));
    // Recalculate positions based on filtered data
    data.sort((a, b) => b.totalObtained - a.totalObtained);
    return data.map((s, i) => ({ ...s, position: i + 1 }));
  }, [ledgerData, filterClass, filterSection, filterShift, filterVersion, filterYear]);

  // Build filter subtitle for print
  const filterSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (filterYear) parts.push(`Year: ${filterYear}`);
    if (filterClass) parts.push(`Class: ${filterClass}`);
    if (filterShift) parts.push(`Shift: ${filterShift}`);
    if (filterSection) parts.push(`Section: ${filterSection}`);
    if (filterVersion) parts.push(`Version: ${filterVersion}`);
    return parts.length > 0 ? parts.join(" | ") : "";
  }, [filterYear, filterClass, filterShift, filterSection, filterVersion]);

  const selectedExamInfo = results.find((r: any) => r.id === selectedExamId);

  const createExamMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId) throw new Error("No school");
      const { error } = await supabase.from("results").insert({
        school_id: schoolId, exam_name: examName,
        academic_year: new Date().getFullYear(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      toast({ title: "Exam created" });
      setExamDialogOpen(false);
      setExamName("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (setup: any) => {
      const { error } = await supabase.from("subject_setups").delete().eq("id", setup.id);
      if (error) throw error;
      // Clean up any orphaned marks associated with this subject name for this school
      if (setup.subject_name && schoolId) {
        const { data: subs } = await supabase.from("subjects")
          .select("id")
          .eq("school_id", schoolId)
          .eq("subject_name", setup.subject_name);
        if (subs && subs.length > 0) {
          const subIds = subs.map(s => s.id);
          await supabase.from("marks").delete().eq("school_id", schoolId).in("subject_id", subIds);
        }
      }
      return setup.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-setups"] });
      queryClient.invalidateQueries({ queryKey: ["marks-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["marks"] });
      setSubjectToDelete(null);
      toast({ title: "Subject configuration deleted and associated marks cleaned" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Publish/Unpublish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("results").update({ is_published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { is_published }) => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      toast({ title: is_published ? "Result published! Students can now see it." : "Result unpublished." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Delete exam mutation
  const deleteExamMutation = useMutation({
    mutationFn: async (id: string) => {
      // 1. Delete all marks linked to this exam
      const { error: marksErr } = await supabase.from("marks").delete().eq("result_id", id);
      if (marksErr) {
        console.warn("Error deleting marks for exam:", marksErr);
      }
      // 2. Delete the exam record itself
      const { error } = await supabase.from("results").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      queryClient.invalidateQueries({ queryKey: ["marks"] });
      if (selectedExamId === deletedId) {
        setSelectedExamId("");
      }
      setExamToDelete(null);
      toast({ title: "Exam deleted successfully" });
    },
    onError: (e: any) => {
      toast({ title: "Error deleting exam", description: e.message || "Failed to delete exam", variant: "destructive" });
    },
  });

  // Edit exam mutation
  const editExamMutation = useMutation({
    mutationFn: async ({ id, exam_name, academic_year }: { id: string; exam_name: string; academic_year: number }) => {
      const { error } = await supabase.from("results").update({ exam_name, academic_year }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      toast({ title: "Exam updated" });
      setEditExamDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Clone exam mutation
  const cloneExamMutation = useMutation({
    mutationFn: async ({ exam_name, academic_year }: { exam_name: string; academic_year: number }) => {
      if (!schoolId) throw new Error("No school");
      const { error } = await supabase.from("results").insert({
        school_id: schoolId, exam_name, academic_year,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results"] });
      toast({ title: "Exam cloned successfully" });
      setCloneExamDialogOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filteredResults = results.filter((r: any) => r.exam_name.toLowerCase().includes(search.toLowerCase()));

  const groupLabel = (g: string) => {
    if (g === "play_8") return "Play – 8";
    if (g === "9_10") return "Class 9–10";
    if (g === "11_12") return "Class 11–12";
    return g;
  };

  const handlePrintMarksheet = (student: typeof ledgerData[0]) => {
    if (!schoolId || !selectedExamInfo) return;
    printMarksheet({
      schoolId,
      studentName: student.student_name,
      roll: student.roll,
      studentId: student.sid,
      className: student.className,
      section: student.section,
      examName: selectedExamInfo.exam_name,
      academicYear: selectedExamInfo.academic_year,
      subjects: student.subjects.map(s => ({
        subject_name: s.name, cq: s.obtained, mcq: 0, practical: 0,
        total: s.obtained, full_marks: s.total, grade: s.grade, gpa: s.gpa,
        is_optional: s.isOptional,
      })),
      totalMarks: student.totalObtained,
      totalFull: student.totalFull,
      finalGPA: student.finalGPA,
      finalGrade: student.finalGrade,
      position: student.position,
      totalStudents: filteredLedgerData.length,
    });
  };

  const handlePrintTabulation = () => {
    if (!schoolId || !selectedExamInfo || filteredLedgerData.length === 0) return;
    const allSubjects = Array.from(new Set(filteredLedgerData.flatMap(s => s.subjects.map(sub => sub.name))));
    
    const headerCells = allSubjects.map(s => `<th style="font-size:10px;padding:6px 4px">${s}</th>`).join("");
    const rows = filteredLedgerData.map(s => {
      const subjectCells = allSubjects.map(subName => {
        const sub = s.subjects.find(x => x.name === subName);
        return `<td style="text-align:center;font-size:11px">${sub ? sub.obtained : "-"}</td>`;
      }).join("");
      return `<tr>
        <td style="font-size:11px">${s.position}</td>
        <td style="font-size:11px;font-weight:500">${s.student_name}</td>
        <td style="text-align:center;font-size:11px">${s.roll}</td>
        ${subjectCells}
        <td style="text-align:center;font-weight:600;font-size:11px">${s.totalObtained}</td>
        <td style="text-align:center;font-size:11px"><span style="padding:2px 6px;border-radius:8px;font-size:10px;font-weight:600;background:${s.finalGrade === 'F' ? '#fecaca' : '#d1fae5'};color:${s.finalGrade === 'F' ? '#991b1b' : '#065f46'}">${s.finalGrade}</span></td>
        <td style="text-align:center;font-weight:600;font-size:11px">${s.finalGPA.toFixed(2)}</td>
      </tr>`;
    }).join("");

    const content = `
      <div style="font-size:12px;color:#666;margin-bottom:12px;text-align:center">Total Students: ${filteredLedgerData.length}</div>
      <table>
        <thead><tr>
          <th style="font-size:10px;padding:6px 4px">#</th>
          <th style="font-size:10px;padding:6px 4px;text-align:left">Student</th>
          <th style="font-size:10px;padding:6px 4px">Roll</th>
          ${headerCells}
          <th style="font-size:10px;padding:6px 4px">Total</th>
          <th style="font-size:10px;padding:6px 4px">Grade</th>
          <th style="font-size:10px;padding:6px 4px">GPA</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    const subtitleParts = [`Academic Year: ${selectedExamInfo.academic_year}`];
    if (filterSubtitle) subtitleParts.push(filterSubtitle);

    printWithSchoolHeader({
      schoolId,
      title: `Tabulation Sheet — ${selectedExamInfo.exam_name}`,
      subtitle: subtitleParts.join(" | "),
      content,
    });
  };

  // Top students = top 10 from ledger
  const topStudents = filteredLedgerData.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Results</h1>
          <p className="page-description">Manage exam results, subjects, and marksheets.</p>
        </div>
      </div>

      {/* Tabs + Action Buttons */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="stat-card p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Group 1: Exam Management */}
            <div className="rounded-xl border-2 border-border/60 bg-muted/30 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3" /> Exam Management
              </p>
              <TabsList className="bg-transparent h-auto flex-wrap gap-1.5 p-0 rounded-none justify-start">
                <TabsTrigger value="exams" className="gap-1.5 text-xs uppercase tracking-wider font-semibold rounded-lg px-3 py-1.5 bg-background border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                  <BarChart3 className="h-3.5 w-3.5" /> Exams
                </TabsTrigger>
                {canManage && (
                  <TabsTrigger value="subjects" className="gap-1.5 text-xs uppercase tracking-wider font-semibold rounded-lg px-3 py-1.5 bg-background border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                    <BookOpen className="h-3.5 w-3.5" /> Subjects
                  </TabsTrigger>
                )}
              </TabsList>
              {canManage && (
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" onClick={() => setExamDialogOpen(true)} className="gap-1.5 h-8 text-xs shadow-sm">
                    <Plus className="h-3.5 w-3.5" /> Create Exam
                  </Button>
                  <Button size="sm" onClick={() => setSubjectDialogOpen(true)} variant="outline" className="gap-1.5 h-8 text-xs border-2 border-foreground/70 font-semibold">
                    <Plus className="h-3.5 w-3.5" /> Setup Subject
                  </Button>
                </div>
              )}
            </div>

            {/* Group 2: Marks Management */}
            <div className="rounded-xl border-2 border-border/60 bg-muted/30 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Pencil className="h-3 w-3" /> Marks Management
              </p>
              {canManage && (
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" onClick={() => navigate("/results/mark-entry")} className="gap-1.5 h-8 text-xs bg-primary shadow-sm">
                    <BarChart3 className="h-3.5 w-3.5" /> Mark Entry
                  </Button>
                </div>
              )}
            </div>



            {/* Group 3: Reports & Results */}
            <div className="rounded-xl border-2 border-border/60 bg-muted/30 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Award className="h-3 w-3" /> Reports & Results
              </p>
              <TabsList className="bg-transparent h-auto flex-wrap gap-1.5 p-0 rounded-none justify-start">
                <TabsTrigger value="ledger" className="gap-1.5 text-xs uppercase tracking-wider font-semibold rounded-lg px-3 py-1.5 bg-background border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                  <ClipboardList className="h-3.5 w-3.5" /> Ledger
                </TabsTrigger>
                <TabsTrigger value="final-result" className="gap-1.5 text-xs uppercase tracking-wider font-semibold rounded-lg px-3 py-1.5 bg-background border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                  <Award className="h-3.5 w-3.5" /> Final Result
                </TabsTrigger>
                <TabsTrigger value="top-students" className="gap-1.5 text-xs uppercase tracking-wider font-semibold rounded-lg px-3 py-1.5 bg-background border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all">
                  <Trophy className="h-3.5 w-3.5" /> Top Students
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        {/* Exams Tab */}
        <TabsContent value="exams" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search exams..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-lg border-2 border-border/60" />
            </div>
            {canManage && (
              <Button onClick={() => setExamDialogOpen(true)} className="gap-1.5 shadow-md">
                <Plus className="h-4 w-4" /> Create Exam
              </Button>
            )}
          </div>

          {resultsLoading ? (
            <div className="stat-card flex items-center justify-center min-h-[200px]">
              <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center min-h-[240px] gap-3">
              <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-medium">No exams found.</p>
              <p className="text-xs text-muted-foreground/70">Create your first exam to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredResults.map((r: any) => (
                <div key={r.id} className="stat-card group hover:shadow-lg transition-all duration-200 hover:border-primary/30">
                  <div className="flex items-start gap-3 cursor-pointer" onClick={() => { setSelectedExamId(r.id); setActiveTab("ledger"); }}>
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold font-heading text-base truncate">{r.exam_name}</h3>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {r.classes?.class_name && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{r.classes.class_name}</span>
                        )}
                        {r.sections?.section_name && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">{r.sections.section_name}</span>
                        )}
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{r.academic_year}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground/70 mt-2">Click to view results →</p>
                    </div>
                  </div>
                  {canManage && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <Badge variant={r.is_published ? "default" : "secondary"} className="text-[10px]">
                          {r.is_published ? "Published" : "Draft"}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0"
                            title="Edit"
                            onClick={(e) => { e.stopPropagation(); setEditExamData({ id: r.id, exam_name: r.exam_name, academic_year: r.academic_year }); setEditExamDialogOpen(true); }}
                          ><Pencil className="h-3 w-3" /></Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0"
                            title="Clone"
                            onClick={(e) => { e.stopPropagation(); setCloneExamData({ exam_name: `${r.exam_name} (Copy)`, academic_year: r.academic_year + 1 }); setCloneExamDialogOpen(true); }}
                          ><Copy className="h-3 w-3" /></Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExamToDelete({ id: r.id, exam_name: r.exam_name });
                            }}
                          ><Trash2 className="h-3 w-3" /></Button>
                          <Button
                            size="sm"
                            variant={r.is_published ? "outline" : "default"}
                            className="gap-1 h-7 text-xs"
                            onClick={(e) => { e.stopPropagation(); togglePublishMutation.mutate({ id: r.id, is_published: !r.is_published }); }}
                          >
                            {r.is_published ? <><EyeOff className="h-3 w-3" /> Unpublish</> : <><Eye className="h-3 w-3" /> Publish</>}
                          </Button>
                        </div>
                      </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="space-y-4">
          {/* Exam Selector */}
          <div className="stat-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Select Exam</label>
                <Select value={selectedExamId || "none"} onValueChange={v => setSelectedExamId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-10 rounded-lg border-2 border-border/60 focus:border-primary"><SelectValue placeholder="Select an exam" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Exam</SelectItem>
                    {results.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.exam_name} ({r.academic_year})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedExamId && filteredLedgerData.length > 0 && (
                <div className="flex gap-2">
                  <Button onClick={handlePrintTabulation} variant="outline" className="gap-1.5 border-2 border-foreground/80 font-semibold hover:bg-foreground hover:text-background transition-all h-10">
                    <Printer className="h-4 w-4" /> Tabulation Sheet
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Orphan / Unconfigured Marks Detection Banner */}
          {selectedExamId && orphanMarks.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
              <div className="flex items-start sm:items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <div className="text-xs sm:text-sm">
                  <span className="font-bold">{orphanMarks.length} unconfigured mark(s) detected</span> (e.g. &quot;{(orphanMarks[0] as any)?.subjects?.subject_name || 'Subject'}&quot; not in your Subject Setup). These are automatically excluded from marksheets and GPA calculations.
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => purgeOrphanMarksMutation.mutate()}
                disabled={purgeOrphanMarksMutation.isPending}
                className="gap-1.5 shrink-0 text-xs font-semibold"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {purgeOrphanMarksMutation.isPending ? "Purging..." : `Purge (${orphanMarks.length}) from Database`}
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="stat-card p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Year</label>
                <Select value={filterYear || "all"} onValueChange={v => setFilterYear(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-lg border-2 border-border/60 text-xs"><SelectValue placeholder="All Years" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {ALL_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Class</label>
                <Select value={filterClass || "all"} onValueChange={v => { setFilterClass(v === "all" ? "" : v); setFilterSection(""); }}>
                  <SelectTrigger className="h-9 rounded-lg border-2 border-border/60 text-xs"><SelectValue placeholder="All Classes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {ALL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Shift</label>
                <Select value={filterShift || "all"} onValueChange={v => setFilterShift(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-lg border-2 border-border/60 text-xs"><SelectValue placeholder="All Shifts" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    {ALL_SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Section</label>
                <Select value={filterSection || "all"} onValueChange={v => setFilterSection(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-lg border-2 border-border/60 text-xs"><SelectValue placeholder="All Sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {filterSectionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Version</label>
                <Select value={filterVersion || "all"} onValueChange={v => setFilterVersion(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9 rounded-lg border-2 border-border/60 text-xs"><SelectValue placeholder="All Versions" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Versions</SelectItem>
                    {ALL_VERSIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          {/* Summary Stats */}
          {selectedExamId && filteredLedgerData.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="stat-card p-4 text-center">
                <div className="text-2xl font-bold text-primary">{filteredLedgerData.length}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">Total Students</div>
              </div>
              <div className="stat-card p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{filteredLedgerData.filter(s => s.finalGPA >= 5).length}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">A+ (GPA 5)</div>
              </div>
              <div className="stat-card p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{filteredLedgerData.filter(s => s.finalGPA === 0).length}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">Failed</div>
              </div>
              <div className="stat-card p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{filteredLedgerData.length > 0 ? (filteredLedgerData.reduce((a, b) => a + b.finalGPA, 0) / filteredLedgerData.length).toFixed(2) : "0"}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">Avg GPA</div>
              </div>
            </div>
          )}

          <div className="stat-card overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4">Rank</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4">Student</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4">Roll</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4">Class</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-center">Total</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-center">GPA</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-center">Grade</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-center">Status</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!selectedExamId ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center">
                          <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <p className="text-muted-foreground font-medium">Select an exam to view results.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : marksLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredLedgerData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3 max-w-md mx-auto">
                        <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center">
                          <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <p className="text-muted-foreground font-semibold text-base">
                          {marksData.length > 0
                            ? `No students found matching the selected filters.`
                            : `No marks have been committed for "${selectedExamInfo?.exam_name || 'this exam'}" yet.`}
                        </p>
                        <p className="text-xs text-muted-foreground/80 leading-relaxed">
                          {marksData.length > 0
                            ? `There are ${marksData.length} marks recorded in this exam for other classes/sections. Reset the filters to view all.`
                            : `Please navigate to Mark Entry, select this exam, enter student marks, and click "Commit Records".`}
                        </p>
                        {marksData.length > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFilterClass("");
                              setFilterSection("");
                              setFilterShift("");
                              setFilterVersion("");
                              setFilterYear("");
                            }}
                            className="mt-2 gap-1.5 font-medium border-primary/40 text-primary hover:bg-primary/10"
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Clear Filters ({ledgerData.length} students found)
                          </Button>
                        ) : canManage ? (
                          <Button
                            size="sm"
                            onClick={() => navigate(`/results/mark-entry?exam=${selectedExamId}${filterClass ? `&class=${encodeURIComponent(filterClass)}` : ""}`)}
                            className="mt-2 gap-1.5 bg-primary text-primary-foreground font-medium shadow-md"
                          >
                            <Plus className="h-3.5 w-3.5" /> Go to Mark Entry for this Exam
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLedgerData.map((s, i) => (
                    <TableRow key={s.student_id} className={`hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "bg-muted/5" : ""}`}>
                      <TableCell>
                        <span className={`text-sm font-bold ${s.position <= 3 ? "text-amber-500" : "text-muted-foreground"}`}>
                          {s.position <= 3 ? "🏆" : ""} #{s.position}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">{s.student_name}</TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{s.roll}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.className} {s.section && `(${s.section})`}</TableCell>
                      <TableCell className="text-center font-bold">{s.totalObtained}/{s.totalFull}</TableCell>
                      <TableCell className="text-center font-bold text-lg">{s.finalGPA.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${getGradeColor(s.finalGrade)}`}>{s.finalGrade}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s.finalGPA > 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"}`}>
                          {s.finalGPA > 0 ? "Passed" : "Failed"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={() => handlePrintMarksheet(s)}>
                          <Printer className="h-3.5 w-3.5" /> Marksheet
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Subjects Tab */}
        <TabsContent value="subjects" className="space-y-4">
          {/* Class Filter */}
          <div className="stat-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-1.5 flex-1 max-w-xs">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Select Class</label>
                <Select value={subjectFilterClass} onValueChange={setSubjectFilterClass}>
                  <SelectTrigger className="h-10 rounded-lg border-2 border-border/60 focus:border-primary"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 flex-wrap">
                {isGroupBased && subjectTabSections.map(sec => (
                  <Badge key={sec} variant="secondary" className="text-xs py-1 px-3">{sec}</Badge>
                ))}
                {!isGroupBased && subjectTabSections.map(sec => (
                  <Badge key={sec} variant="outline" className="text-xs py-1 px-3">Section {sec}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Curriculum Subjects Table */}
          <div className="stat-card overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 w-10">#</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4">Subject</TableHead>
                  {isGroupBased && (
                    <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4">Group</TableHead>
                  )}
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-center">Full Marks</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-center">Status</TableHead>
                  {canManage && (
                    <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {curriculumSubjectsForTab.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isGroupBased ? (canManage ? 6 : 5) : (canManage ? 5 : 4)} className="text-center py-16">
                      <p className="text-muted-foreground">No subjects added yet. Use "Add Subject Configuration" to add subjects for this class.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  curriculumSubjectsForTab.map((sub, idx) => {
                    // Check if there's a subject_setup override for this subject+class
                    const setupMatch = (subjectSetups as any[]).find((ss: any) =>
                      ss.subject_name === sub.name &&
                      (ss.classes || []).some((c: string) => c.toLowerCase() === subjectFilterClass.toLowerCase())
                    );
                    const fullMarks = setupMatch?.full_marks || 100;

                    return (
                      <TableRow key={`${sub.name}-${sub.group}-${idx}`} className={`hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "bg-muted/5" : ""}`}>
                        <TableCell className="text-sm text-muted-foreground font-medium">{idx + 1}</TableCell>
                        <TableCell className="font-semibold">{sub.name}</TableCell>
                        {isGroupBased && (
                          <TableCell>
                            <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                              sub.group === "Compulsory" ? "bg-primary/10 text-primary" :
                              sub.group === "Science" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                              sub.group === "Business Studies" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                              "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                            }`}>{sub.group}</span>
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <span className="font-bold text-foreground">{fullMarks}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {setupMatch ? (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold">Configured</span>
                          ) : (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">Default</span>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                title="Edit"
                                onClick={() => {
                                  if (setupMatch) {
                                    setEditingSubjectSetup(setupMatch);
                                  } else {
                                    setEditingSubjectSetup({
                                      subject_name: sub.name,
                                      classes: [subjectFilterClass],
                                      sections: [],
                                      class_group: isGroupBased ? "9_10" : "play_8",
                                      full_marks: 100,
                                      cq_total: 0, cq_pass: 0,
                                      mcq_total: 0, mcq_pass: 0,
                                      practical_enabled: false, practical_total: 0, practical_pass: 0,
                                      ct_enabled: false, ct_total: 0,
                                      mt_enabled: false, mt_total: 0,
                                    });
                                  }
                                  setSubjectDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {setupMatch && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  title="Delete"
                                  onClick={() => {
                                    setSubjectToDelete({ id: setupMatch.id, subject_name: sub.name });
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
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

          {/* Custom Subject Setups (overrides) */}
          {(subjectSetups as any[]).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">Custom Subject Configurations</h3>
              <div className="stat-card overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-3">Subject</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-3">Classes</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-3">Full Marks</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-3">CQ/MCQ</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-3">Optional</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-3 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(subjectSetups as any[]).map((sub: any) => (
                      <TableRow key={sub.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell className="font-semibold">{sub.subject_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(sub.classes || []).slice(0, 3).map((c: string) => (
                              <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{c}</span>
                            ))}
                            {(sub.classes || []).length > 3 && <span className="text-[10px] text-muted-foreground">+{(sub.classes || []).length - 3}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">{sub.full_marks}</TableCell>
                        <TableCell className="text-sm">{sub.cq_total}/{sub.mcq_total}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {sub.ct_enabled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium">CT</span>}
                            {sub.mt_enabled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium">MT</span>}
                            {sub.practical_enabled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium">Prac</span>}
                            {!sub.ct_enabled && !sub.mt_enabled && !sub.practical_enabled && <span className="text-muted-foreground/40">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" className="text-xs h-7 px-2 gap-1"
                              onClick={() => { setEditingSubjectSetup(sub); setSubjectDialogOpen(true); }}>
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs h-7 px-2"
                              onClick={() => setSubjectToDelete({ id: sub.id, subject_name: sub.subject_name })}>
                              <Trash2 className="h-3 w-3" />
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

        {/* Top Students Tab */}
        <TabsContent value="top-students" className="space-y-4">
          <div className="stat-card p-5">
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Select Exam</label>
                <Select value={selectedExamId || "none"} onValueChange={v => setSelectedExamId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-10 rounded-lg border-2 border-border/60 focus:border-primary"><SelectValue placeholder="Select exam" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Exam</SelectItem>
                    {results.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.exam_name} ({r.academic_year})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {!selectedExamId || topStudents.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center min-h-[240px] gap-3">
              <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-amber-500" />
              </div>
              <p className="text-muted-foreground font-medium">{!selectedExamId ? "Select an exam to view top students" : "No results available yet"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {topStudents.map((s, i) => (
                <div key={s.student_id} className="stat-card p-5 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                      i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" :
                      i === 1 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" :
                      i === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${s.position}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{s.student_name}</h3>
                      <p className="text-xs text-muted-foreground">{s.className} {s.section && `• ${s.section}`} • Roll: {s.roll}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">{s.finalGPA.toFixed(2)}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getGradeColor(s.finalGrade)}`}>{s.finalGrade}</span>
                    </div>
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                    <span>Total: <strong className="text-foreground">{s.totalObtained}/{s.totalFull}</strong></span>
                    <span>Subjects: <strong className="text-foreground">{s.subjectCount}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>


        {/* Final Result Tab */}
        <TabsContent value="final-result">
          <FinalResultTab />
        </TabsContent>
      </Tabs>

      {/* Create Exam Dialog */}
      <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading">Create Exam</DialogTitle>
            <p className="text-sm text-muted-foreground">Create a new exam for all students.</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exam Name *</label>
              <Input placeholder="e.g. 1st Term, 2nd Term, Annual Exam" value={examName} onChange={(e) => setExamName(e.target.value)} className="h-10" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setExamDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!examName.trim()) { toast({ title: "Exam name required", variant: "destructive" }); return; }
              createExamMutation.mutate();
            }}>Create Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subject Setup Dialog */}
      <SubjectSetupDialog open={subjectDialogOpen} onOpenChange={(open) => { setSubjectDialogOpen(open); if (!open) setEditingSubjectSetup(null); }} editData={editingSubjectSetup} />

      {/* Edit Exam Dialog */}
      <Dialog open={editExamDialogOpen} onOpenChange={setEditExamDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading">Edit Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exam Name *</label>
              <Input value={editExamData?.exam_name || ""} onChange={(e) => setEditExamData(prev => prev ? { ...prev, exam_name: e.target.value } : prev)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Academic Year</label>
              <Select value={String(editExamData?.academic_year || 2026)} onValueChange={v => setEditExamData(prev => prev ? { ...prev, academic_year: Number(v) } : prev)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditExamDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!editExamData?.exam_name.trim()) { toast({ title: "Exam name required", variant: "destructive" }); return; }
              editExamMutation.mutate(editExamData);
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Exam Dialog */}
      <Dialog open={cloneExamDialogOpen} onOpenChange={setCloneExamDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-heading">Clone Exam</DialogTitle>
            <p className="text-sm text-muted-foreground">Create a copy of this exam for another year.</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exam Name *</label>
              <Input value={cloneExamData?.exam_name || ""} onChange={(e) => setCloneExamData(prev => prev ? { ...prev, exam_name: e.target.value } : prev)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Academic Year</label>
              <Select value={String(cloneExamData?.academic_year || 2027)} onValueChange={v => setCloneExamData(prev => prev ? { ...prev, academic_year: Number(v) } : prev)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCloneExamDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!cloneExamData?.exam_name.trim()) { toast({ title: "Exam name required", variant: "destructive" }); return; }
              cloneExamMutation.mutate(cloneExamData);
            }}>Clone Exam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Exam Confirmation AlertDialog */}
      <AlertDialog open={!!examToDelete} onOpenChange={(open) => !open && setExamToDelete(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive text-lg">
              <Trash2 className="h-5 w-5" /> Delete Exam Confirmation
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete <span className="font-semibold text-foreground">"{examToDelete?.exam_name}"</span>? 
              <br className="my-1" />
              All student marks entered for this exam will also be permanently deleted. This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
            <AlertDialogCancel disabled={deleteExamMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium"
              disabled={deleteExamMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (examToDelete) {
                  deleteExamMutation.mutate(examToDelete.id);
                }
              }}
            >
              {deleteExamMutation.isPending ? "Deleting Exam..." : "Yes, Delete Exam"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subject Config Confirmation AlertDialog */}
      <AlertDialog open={!!subjectToDelete} onOpenChange={(open) => !open && setSubjectToDelete(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive text-lg">
              <Trash2 className="h-5 w-5" /> Delete Subject Rule
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to remove the custom configuration for <span className="font-semibold text-foreground">"{subjectToDelete?.subject_name}"</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
            <AlertDialogCancel disabled={deleteSubjectMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium"
              disabled={deleteSubjectMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (subjectToDelete) {
                  deleteSubjectMutation.mutate(subjectToDelete);
                }
              }}
            >
              {deleteSubjectMutation.isPending ? "Deleting..." : "Yes, Delete Rule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ResultsPage;
