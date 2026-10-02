import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Award, Printer, Search, Save, Send, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getGradeFromMarks, calculateFinalGPA, calculateFinalGPAWithOptional, calculateBangladeshBoardResult, getGradeFromGPA, getGradeColor } from "@/utils/gradingUtils";
import { printWithSchoolHeader } from "@/utils/printUtils";
import { ALL_CLASSES, getSectionsForClass, isMatchingClass, isGroupBasedClass } from "@/utils/subjectConfig";

const FinalResultTab = () => {
  const { schoolId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [examWeights, setExamWeights] = useState<Record<string, number>>({});
  const [finalName, setFinalName] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [search, setSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const filterSectionOptions = filterClass ? getSectionsForClass(filterClass) : [];

  // Fetch classes, sections, students, subjects lookup
  const { data: dbClasses = [] } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("classes").select("*").eq("school_id", schoolId);
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

  // Fetch all exams
  const { data: results = [] } = useQuery({
    queryKey: ["results", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("results").select("*, classes(class_name), sections(section_name)").eq("school_id", schoolId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Fetch marks for all selected exams
  const { data: optionalSetups = [] } = useQuery({
    queryKey: ["final-subject-setups", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("subject_setups").select("subject_name, classes, sections, is_optional").eq("school_id", schoolId);
      return data || [];
    },
    enabled: !!schoolId,
  });

  const isOptionalSubject = useCallback((className: string, subjectName: string) =>
    (optionalSetups as any[]).some((ss: any) =>
      ss.is_optional &&
      (ss.subject_name || "").toLowerCase() === (subjectName || "").toLowerCase() &&
      (ss.classes || []).some((c: string) => (c || "").toLowerCase() === (className || "").toLowerCase())
    ), [optionalSetups]);

  const { data: allMarks = [], isLoading: marksLoading } = useQuery({
    queryKey: ["final-result-marks", schoolId, selectedExamIds],
    queryFn: async () => {
      if (!schoolId || selectedExamIds.length === 0) return [];
      try {
        const { data, error } = await supabase.from("marks")
          .select("*, students(id, student_name, roll, student_id, class_id, section_id, optional_subject, classes(class_name), sections(section_name)), subjects(id, subject_name)")
          .eq("school_id", schoolId)
          .in("result_id", selectedExamIds);
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn("Nested final marks query error, falling back to simple select:", err);
      }

      const { data: simpleData, error: simpleError } = await supabase.from("marks")
        .select("*")
        .eq("school_id", schoolId)
        .in("result_id", selectedExamIds);
      if (simpleError) throw simpleError;
      return simpleData || [];
    },
    enabled: !!schoolId && selectedExamIds.length > 0,
  });

  const toggleExam = (id: string) => {
    setSelectedExamIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      setExamWeights(w => {
        const nw = { ...w };
        if (!next.includes(id)) delete nw[id];
        else if (nw[id] === undefined) {
          // default: distribute evenly
          const even = Math.round(100 / next.length);
          next.forEach(eid => { nw[eid] = even; });
        }
        return nw;
      });
      return next;
    });
    setShowPreview(false);
  };

  const totalWeight = useMemo(
    () => selectedExamIds.reduce((s, id) => s + (Number(examWeights[id]) || 0), 0),
    [selectedExamIds, examWeights]
  );

  // Combine marks across exams per student per subject (weight-aware)
  const combinedData = useMemo(() => {
    if (allMarks.length === 0) return [];

    // Use equal weights if user hasn't set or weights don't sum > 0
    const sumW = selectedExamIds.reduce((s, id) => s + (Number(examWeights[id]) || 0), 0);
    const useEqual = sumW <= 0;
    const weightFor = (examId: string) => {
      if (useEqual) return selectedExamIds.length > 0 ? 100 / selectedExamIds.length : 0;
      return ((Number(examWeights[examId]) || 0) / sumW) * 100;
    };

    const isSubjectConfiguredForStudent = (
      className: string,
      sectionName: string,
      optionalSubject: string,
      subjectName: string,
      groupSubjects?: string[] | string | null
    ): boolean => {
      if (!optionalSetups || (optionalSetups as any[]).length === 0) return true;

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

      // If subject was explicitly chosen as student's 4th/optional subject
      if (optNorm && (optNorm === subNorm || optNorm.includes(subNorm) || subNorm.includes(optNorm))) {
        return true;
      }

      const classSetups = (optionalSetups as any[]).filter((ss: any) =>
        (ss.classes || []).some((c: string) => isMatchingClass(c, className))
      );

      if (classSetups.length > 0) {
        return classSetups.some((ss: any) => {
          const ssSubName = norm(ss.subject_name);
          if (ssSubName !== subNorm) return false;

          const ssSections: string[] = Array.isArray(ss.sections) ? ss.sections : [];
          if (ssSections.length === 0) return true;

          const matchesSection = ssSections.some((sec: string) => {
            const l = norm(sec);
            if (secNorm === "science") return l === "science";
            if (secNorm.includes("business")) return l.includes("business");
            if (secNorm.includes("humanities") || secNorm.includes("arts")) return l.includes("humanities") || l.includes("arts");
            return l === secNorm;
          });

          if (matchesSection) {
            if (parsedGroupSubs.length > 0) {
              return parsedGroupSubs.some(gs => gs === ssSubName || gs.includes(ssSubName) || ssSubName.includes(gs));
            }
            return true;
          }

          return false;
        });
      }

      return false;
    };

    // Group: student -> subject -> per-exam entries
    const studentMap: Record<string, {
      student_id: string; student_name: string; roll: string; sid: string;
      className: string; section: string; optional_subject: string;
      subjects: Record<string, { name: string; entries: { examId: string; obtained: number; total: number }[] }>;
    }> = {};

    allMarks.forEach((m: any) => {
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
      const subName = sub?.subject_name || "Unknown";

      const studentClass = cls?.class_name || "";
      const studentSec = sec?.section_name || "";
      const studentOpt = student?.optional_subject || "";
      const studentGroup = student?.group_subjects || (sid ? localStorage.getItem(`schoolo_student_group_subjects_${sid}`) : null);

      // Exclude unconfigured subject marks
      if (!isSubjectConfiguredForStudent(studentClass, studentSec, studentOpt, subName, studentGroup)) {
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
          optional_subject: studentOpt,
          subjects: {},
        };
      }
      if (!studentMap[sid].subjects[subName]) {
        studentMap[sid].subjects[subName] = { name: subName, entries: [] };
      }
      studentMap[sid].subjects[subName].entries.push({
        examId: m.result_id,
        obtained: m.marks_obtained || 0,
        total: m.total_marks || 100,
      });
    });

    const isStudentOptional = (studentOpt: string | null | undefined, className: string, subjectName: string) => {
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

    const studentList = Object.values(studentMap).map(s => {
      const subjectResults = Object.values(s.subjects).map(sub => {
        // Weighted percentage per subject across exams
        let weightedPct = 0;
        let weightSumPresent = 0;
        let totalObtained = 0;
        let totalFull = 0;
        sub.entries.forEach(e => {
          const w = weightFor(e.examId);
          const pct = e.total > 0 ? (e.obtained / e.total) * 100 : 0;
          weightedPct += pct * w;
          weightSumPresent += w;
          totalObtained += e.obtained;
          totalFull += e.total;
        });
        const finalPct = weightSumPresent > 0 ? weightedPct / weightSumPresent : 0;
        // Represent as marks out of 100 for grading
        const { grade, gpa } = getGradeFromMarks(finalPct, 100);
        return {
          name: sub.name,
          totalObtained,
          totalFull,
          avg: Math.round(finalPct * 100) / 100,
          avgFull: 100,
          examCount: sub.entries.length,
          grade,
          gpa,
          isOptional: isStudentOptional(s.optional_subject, s.className, sub.name),
        };
      });

      const grandTotal = subjectResults.reduce((a, b) => a + b.totalObtained, 0);
      const grandFull = subjectResults.reduce((a, b) => a + b.totalFull, 0);
      const mainSubjects = subjectResults.filter(sub => !sub.isOptional);
      const avgBase = mainSubjects.length > 0 ? mainSubjects : subjectResults;
      const avgTotal = avgBase.length > 0
        ? avgBase.reduce((a, b) => a + b.avg, 0) / avgBase.length
        : 0;
      const avgFull = 100;
      
      const boardRes = calculateBangladeshBoardResult(
        subjectResults.map(sub => ({
          name: sub.name,
          obtained: sub.avg,
          total: sub.avgFull,
          grade: sub.grade,
          gpa: sub.gpa,
          isOptional: sub.isOptional,
        })),
        (name) => isStudentOptional(s.optional_subject, s.className, name)
      );

      const finalGPA = boardRes.finalGPA;
      const finalGrade = boardRes.finalGrade;

      return {
        ...s,
        subjectResults,
        grandTotal,
        grandFull,
        avgTotal: Math.round(avgTotal * 100) / 100,
        avgFull,
        finalGPA,
        finalGrade,
        boardResult: boardRes,
        subjectCount: subjectResults.length,
      };
    });

    studentList.sort((a, b) => b.avgTotal - a.avgTotal);
    return studentList.map((s, i) => ({ ...s, position: i + 1 }));
  }, [allMarks, selectedExamIds, examWeights, isOptionalSubject, optionalSetups, dbClasses, dbSections, dbStudents, dbSubjects]);


  // Apply filters
  const filteredData = useMemo(() => {
    let data = combinedData;
    if (filterClass) data = data.filter(s => s.className === filterClass);
    if (filterSection) data = data.filter(s => s.section === filterSection);
    if (search) data = data.filter(s => s.student_name.toLowerCase().includes(search.toLowerCase()) || s.roll.includes(search));
    data.sort((a, b) => b.avgTotal - a.avgTotal);
    return data.map((s, i) => ({ ...s, position: i + 1 }));
  }, [combinedData, filterClass, filterSection, search]);

  const selectedExamNames = results
    .filter((r: any) => selectedExamIds.includes(r.id))
    .map((r: any) => r.exam_name);

  const handlePrintFinalResult = () => {
    if (!schoolId || filteredData.length === 0) return;

    const allSubjects = Array.from(new Set(filteredData.flatMap(s => s.subjectResults.map(sub => sub.name))));
    const headerCells = allSubjects.map(s => `<th style="font-size:9px;padding:4px 3px;text-align:center">${s}</th>`).join("");

    const rows = filteredData.map(s => {
      const subjectCells = allSubjects.map(subName => {
        const sub = s.subjectResults.find(x => x.name === subName);
        return `<td style="text-align:center;font-size:10px">${sub ? `${sub.avg.toFixed(0)}` : "-"}</td>`;
      }).join("");
      return `<tr>
        <td style="font-size:10px">${s.position}</td>
        <td style="font-size:10px;font-weight:500">${s.student_name}</td>
        <td style="text-align:center;font-size:10px">${s.roll}</td>
        ${subjectCells}
        <td style="text-align:center;font-weight:600;font-size:10px">${s.avgTotal.toFixed(0)}</td>
        <td style="text-align:center;font-size:10px"><span style="padding:2px 6px;border-radius:8px;font-size:9px;font-weight:600;background:${s.finalGrade === 'F' ? '#fecaca' : '#d1fae5'};color:${s.finalGrade === 'F' ? '#991b1b' : '#065f46'}">${s.finalGrade}</span></td>
        <td style="text-align:center;font-weight:600;font-size:10px">${s.finalGPA.toFixed(2)}</td>
      </tr>`;
    }).join("");

    const content = `
      <div style="font-size:11px;color:#666;margin-bottom:8px;text-align:center">
        Combined Exams: ${selectedExamNames.join(" + ")} | Total Students: ${filteredData.length}
      </div>
      <table>
        <thead><tr>
          <th style="font-size:9px;padding:4px 3px">#</th>
          <th style="font-size:9px;padding:4px 3px;text-align:left">Student</th>
          <th style="font-size:9px;padding:4px 3px">Roll</th>
          ${headerCells}
          <th style="font-size:9px;padding:4px 3px">Avg Total</th>
          <th style="font-size:9px;padding:4px 3px">Grade</th>
          <th style="font-size:9px;padding:4px 3px">GPA</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    printWithSchoolHeader({
      schoolId,
      title: `Final Result — ${selectedExamNames.join(" + ")}`,
      subtitle: [filterClass && `Class: ${filterClass}`, filterSection && `Section: ${filterSection}`].filter(Boolean).join(" | "),
      content,
    });
  };

  // Saved final results (with publish state)
  const { data: savedFinals = [] } = useQuery({
    queryKey: ["final-results", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await (supabase as any)
        .from("final_results")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Match an already-saved final result for current selection (order-independent)
  const matchingFinal = useMemo(() => {
    const sortedSel = [...selectedExamIds].sort().join(",");
    return savedFinals.find((f: any) =>
      [...(f.exam_ids || [])].sort().join(",") === sortedSel
    );
  }, [savedFinals, selectedExamIds]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { publish: boolean }) => {
      if (!schoolId) throw new Error("No school");
      if (selectedExamIds.length < 2) throw new Error("Select at least 2 exams");
      const name = finalName.trim() || `Final Result — ${selectedExamNames.join(" + ")}`;
      const weights = selectedExamIds.map(id => Number(examWeights[id]) || 0);
      const academic_year = results.find((r: any) => r.id === selectedExamIds[0])?.academic_year || null;
      const row: any = {
        school_id: schoolId,
        name,
        academic_year,
        exam_ids: selectedExamIds,
        weights,
        is_published: payload.publish,
        published_at: payload.publish ? new Date().toISOString() : null,
      };
      if (matchingFinal) {
        const { error } = await (supabase as any).from("final_results").update(row).eq("id", matchingFinal.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("final_results").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["final-results", schoolId] });
      toast({ title: vars.publish ? "Final Result Published" : "Final Result Saved", description: vars.publish ? "Students can now view this final result." : "Saved as draft." });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const unpublishMutation = useMutation({
    mutationFn: async () => {
      if (!matchingFinal) return;
      const { error } = await (supabase as any)
        .from("final_results")
        .update({ is_published: false, published_at: null })
        .eq("id", matchingFinal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-results", schoolId] });
      toast({ title: "Unpublished" });
    },
  });

  const deleteFinalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("final_results").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["final-results", schoolId] });
      toast({ title: "Deleted" });
    },
  });

  // When user clicks a saved final → load its selection
  const loadSavedFinal = (f: any) => {
    setSelectedExamIds(f.exam_ids || []);
    const w: Record<string, number> = {};
    (f.exam_ids || []).forEach((id: string, i: number) => { w[id] = Number(f.weights?.[i]) || 0; });
    setExamWeights(w);
    setFinalName(f.name || "");
    setShowPreview(true);
  };


  return (
    <div className="space-y-4">
      {/* Exam Selection */}
      <div className="stat-card p-5 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" /> Select Exams to Combine
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((r: any) => (
            <label
              key={r.id}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                selectedExamIds.includes(r.id)
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Checkbox
                checked={selectedExamIds.includes(r.id)}
                onCheckedChange={() => toggleExam(r.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{r.exam_name}</div>
                <div className="text-[11px] text-muted-foreground">{r.academic_year}</div>
              </div>
              {r.is_published && <Badge variant="default" className="text-[9px] h-5">Published</Badge>}
            </label>
          ))}
        </div>
        {selectedExamIds.length >= 2 && (
          <div className="space-y-3 pt-2 border-t border-border/60">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Exam Weights (%) — Total: <span className={totalWeight === 100 ? "text-emerald-600" : "text-amber-600"}>{totalWeight}%</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {selectedExamIds.map(id => {
                  const r = results.find((x: any) => x.id === id);
                  return (
                    <div key={id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/60">
                      <span className="text-xs font-medium flex-1 truncate">{r?.exam_name || "—"}</span>
                      <Input
                        type="number" min={0} max={100} step={1}
                        value={examWeights[id] ?? ""}
                        onChange={e => setExamWeights(w => ({ ...w, [id]: Number(e.target.value) }))}
                        className="h-8 w-20 text-xs text-center"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  );
                })}
              </div>
              {totalWeight !== 100 && totalWeight > 0 && (
                <p className="text-[11px] text-amber-600">Tip: weights will be normalized automatically if total ≠ 100%.</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Final Result Name</label>
                <Input
                  placeholder={`e.g. Annual Result ${new Date().getFullYear()}`}
                  value={finalName}
                  onChange={e => setFinalName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setShowPreview(true)} variant="outline" className="gap-1.5">Preview</Button>
                <Button onClick={() => saveMutation.mutate({ publish: false })} variant="outline" className="gap-1.5" disabled={saveMutation.isPending}>
                  <Save className="h-4 w-4" /> Save Draft
                </Button>
                {matchingFinal?.is_published ? (
                  <Button onClick={() => unpublishMutation.mutate()} variant="outline" className="gap-1.5" disabled={unpublishMutation.isPending}>
                    <EyeOff className="h-4 w-4" /> Unpublish
                  </Button>
                ) : (
                  <Button onClick={() => saveMutation.mutate({ publish: true })} className="gap-1.5 shadow-md" disabled={saveMutation.isPending}>
                    <Send className="h-4 w-4" /> Publish Final
                  </Button>
                )}
              </div>
            </div>

            {matchingFinal && (
              <p className="text-xs text-muted-foreground">
                {matchingFinal.is_published
                  ? <>✅ This combination is <strong className="text-emerald-600">Published</strong> as "{matchingFinal.name}" — visible to students.</>
                  : <>📝 Saved as draft: "{matchingFinal.name}"</>}
              </p>
            )}
          </div>
        )}
        {selectedExamIds.length === 1 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Select at least 2 exams to generate a combined final result.</p>
        )}
      </div>

      {/* Saved Final Results */}
      {savedFinals.length > 0 && (
        <div className="stat-card p-5 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Saved Final Results
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedFinals.map((f: any) => (
              <div key={f.id} className="flex items-center gap-2 p-3 rounded-xl border-2 border-border hover:border-primary/30 transition-all">
                <button onClick={() => loadSavedFinal(f)} className="flex-1 min-w-0 text-left">
                  <div className="font-semibold text-sm truncate">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground">{(f.exam_ids || []).length} exams • {f.academic_year || ""}</div>
                </button>
                {f.is_published
                  ? <Badge variant="default" className="text-[9px] h-5">Published</Badge>
                  : <Badge variant="secondary" className="text-[9px] h-5">Draft</Badge>}
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteFinalMutation.mutate(f.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Section */}
      {showPreview && selectedExamIds.length >= 2 && (
        <>
          {/* Filters */}
          <div className="stat-card p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Name or roll..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" />
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          {filteredData.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="stat-card p-4 text-center">
                <div className="text-2xl font-bold text-primary">{filteredData.length}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">Total Students</div>
              </div>
              <div className="stat-card p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{filteredData.filter(s => s.finalGPA >= 5).length}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">A+ (GPA 5)</div>
              </div>
              <div className="stat-card p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{filteredData.filter(s => s.finalGPA === 0).length}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">Failed</div>
              </div>
              <div className="stat-card p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{filteredData.length > 0 ? (filteredData.reduce((a, b) => a + b.finalGPA, 0) / filteredData.length).toFixed(2) : "0"}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-1">Avg GPA</div>
              </div>
            </div>
          )}

          {/* Print Button */}
          {filteredData.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={handlePrintFinalResult} variant="outline" className="gap-1.5 border-2 border-foreground/80 font-semibold hover:bg-foreground hover:text-background transition-all">
                <Printer className="h-4 w-4" /> Print Final Result Sheet
              </Button>
            </div>
          )}

          {/* Result Table */}
          <div className="stat-card overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4">Rank</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4">Student</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4">Roll</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4">Class</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-center">Avg Total</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-center">Grand Total</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-center">GPA</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-center">Grade</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-primary py-4 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marksLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <p className="text-muted-foreground font-medium">No combined results found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((s, i) => (
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
                      <TableCell className="text-center font-bold">{s.avgTotal.toFixed(0)}/{s.avgFull.toFixed(0)}</TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">{s.grandTotal}/{s.grandFull}</TableCell>
                      <TableCell className="text-center font-bold text-lg">{s.finalGPA.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${getGradeColor(s.finalGrade)}`}>{s.finalGrade}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${s.finalGPA > 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"}`}>
                          {s.finalGPA > 0 ? "Passed" : "Failed"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default FinalResultTab;
