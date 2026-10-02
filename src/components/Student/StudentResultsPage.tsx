import { useState, useEffect, useMemo, useCallback } from "react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentStudent } from "@/hooks/useCurrentStudent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, FileText, ChevronRight, Award, BookOpen } from "lucide-react";
import { getGradeFromMarks, calculateFinalGPA, calculateFinalGPAWithOptional, calculateBangladeshBoardResult, getGradeFromGPA, getGradeColor } from "@/utils/gradingUtils";
import { getSubjectsForClass, isGroupBasedClass, isMatchingClass } from "@/utils/subjectConfig";

const StudentResultsPage = () => {
  const { user } = useAuth();
  const { student, schoolId: effectiveSchoolId, isLoading: studentLoading } = useCurrentStudent();
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [selectedFinal, setSelectedFinal] = useState<any>(null);

  // Realtime sync for results
  useRealtimeSync("results", [["student-exams"]]);
  useRealtimeSync("marks", [["student-marks"], ["student-final-marks"]]);
  useRealtimeSync("final_results", [["student-final-results"]]);

  // Fetch exams - show all published exams for this school
  const { data: exams = [] } = useQuery({
    queryKey: ["student-exams", student?.id, effectiveSchoolId],
    queryFn: async () => {
      const { data } = await supabase
        .from("results")
        .select("*")
        .eq("school_id", effectiveSchoolId!)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      return (data || []).filter((r: any) => !r.class_id || r.class_id === student!.class_id);
    },
    enabled: !!student?.id && !!effectiveSchoolId,
  });

  // Fetch published final results
  const { data: finalResults = [] } = useQuery({
    queryKey: ["student-final-results", effectiveSchoolId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("final_results")
        .select("*")
        .eq("school_id", effectiveSchoolId!)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!effectiveSchoolId,
  });

  // Fetch marks for selected exam
  const { data: marks = [] } = useQuery({
    queryKey: ["student-marks", selectedExam?.id, student?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("marks")
        .select("*, subjects(subject_name, subject_code)")
        .eq("result_id", selectedExam!.id)
        .eq("student_id", student!.id)
        .eq("school_id", effectiveSchoolId!);
      return data || [];
    },
    enabled: !!selectedExam?.id && !!student?.id && !!effectiveSchoolId,
  });

  // Fetch marks for selected FINAL result (across all included exams)
  const { data: finalMarks = [] } = useQuery({
    queryKey: ["student-final-marks", selectedFinal?.id, student?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("marks")
        .select("*, subjects(subject_name, subject_code)")
        .in("result_id", selectedFinal!.exam_ids || [])
        .eq("student_id", student!.id)
        .eq("school_id", effectiveSchoolId!);
      return data || [];
    },
    enabled: !!selectedFinal?.id && !!student?.id && !!effectiveSchoolId,
  });

  // Fetch subject setups for this school to know expected subjects per class
  const { data: subjectSetups = [] } = useQuery({
    queryKey: ["student-subject-setups", effectiveSchoolId],
    queryFn: async () => {
      const { data } = await supabase
        .from("subject_setups")
        .select("subject_name, classes, sections, full_marks, is_optional")
        .eq("school_id", effectiveSchoolId!);
      return data || [];
    },
    enabled: !!effectiveSchoolId,
  });

  // Build expected subjects for the student's class (only from admin's subject setups)
  const expectedSubjects = (() => {
    const className = (Array.isArray(student?.classes) ? student.classes[0]?.class_name : student?.classes?.class_name) as string | undefined;
    const sectionName = (Array.isArray(student?.sections) ? student.sections[0]?.section_name : student?.sections?.section_name) as string | undefined;
    const optSubject = (student?.optional_subject as string | undefined) || "";
    if (!className) return [] as { name: string; fullMarks: number; isOptional: boolean }[];

    const cachedGroup = student?.id ? localStorage.getItem(`schoolo_student_group_subjects_${student.id}`) : null;
    const rawGroup = (student as any)?.group_subjects || cachedGroup || "";
    let parsedGroup: string[] = [];
    if (Array.isArray(rawGroup)) {
      parsedGroup = rawGroup.map((s: string) => (s || "").trim().toLowerCase()).filter(Boolean);
    } else if (typeof rawGroup === "string" && rawGroup.trim()) {
      parsedGroup = rawGroup.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    }

    const norm = (s: string) => (s || "").trim().toLowerCase();
    const secNorm = norm(sectionName || "");
    const optNorm = norm(optSubject);

    return (subjectSetups as any[])
      .filter((s: any) => {
        const inClass = (s.classes || []).some((c: string) => isMatchingClass(c, className));
        if (!inClass) return false;

        const ssSubName = norm(s.subject_name);

        // If it's student's selected 4th subject, always include
        if (optNorm && (optNorm === ssSubName || optNorm.includes(ssSubName) || ssSubName.includes(optNorm))) {
          return true;
        }

        const ssSections: string[] = Array.isArray(s.sections) ? s.sections : [];
        if (ssSections.length === 0) return true;

        const matchesGroup = ssSections.some((sec: string) => {
          const l = norm(sec);
          if (secNorm === "science") return l === "science";
          if (secNorm.includes("business")) return l.includes("business");
          if (secNorm.includes("humanities") || secNorm.includes("arts")) return l.includes("humanities") || l.includes("arts");
          return l === secNorm;
        });

        if (matchesGroup) {
          // If student has explicit group subjects selected, only include if selected
          if (parsedGroup.length > 0) {
            return parsedGroup.some(g => g === ssSubName || g.includes(ssSubName) || ssSubName.includes(g));
          }
          return true;
        }

        return false;
      })
      .map((s: any) => {
        const ssSubName = norm(s.subject_name);
        const isOpt = Boolean(
          optNorm && (optNorm === ssSubName || optNorm.includes(ssSubName) || ssSubName.includes(optNorm))
        );
        return {
          name: s.subject_name as string,
          fullMarks: (s.full_marks as number) || 100,
          isOptional: isOpt || (!optNorm && !!s.is_optional && !isGroupBasedClass(className)),
        };
      });
  })();

  const isOptionalName = useCallback((name: string) => {
    if (!name) return false;
    const subName = name.toLowerCase().trim();
    if (student?.optional_subject) {
      const opt = (student.optional_subject as string).toLowerCase().trim();
      if (opt === subName || subName.includes(opt) || opt.includes(subName)) return true;
      const className = (Array.isArray(student?.classes) ? student.classes[0]?.class_name : student?.classes?.class_name) as string | undefined;
      if (isGroupBasedClass(className || "")) return false;
    }
    return expectedSubjects.some(es => es.isOptional && es.name.toLowerCase() === subName);
  }, [student?.optional_subject, student?.classes, expectedSubjects]);

  // Display marks = entered marks (strictly configured subjects only) + Fail rows for any missing class-subject
  const displayMarks = (() => {
    const validSubjectNames = new Set(expectedSubjects.map(es => es.name.toLowerCase()));

    const rows: any[] = marks
      .filter((m: any) => {
        if (expectedSubjects.length === 0) return true;
        const rawSub = m.subjects;
        const sub = Array.isArray(rawSub) ? rawSub[0] : rawSub;
        const subName = (sub?.subject_name || "").toLowerCase().trim();
        return validSubjectNames.has(subName);
      })
      .map((m: any) => {
        const rawSub = m.subjects;
        const sub = Array.isArray(rawSub) ? rawSub[0] : rawSub;
        const subName = sub?.subject_name || "—";
        return {
          id: m.id,
          subject_name: subName,
          marks_obtained: m.marks_obtained,
          total_marks: m.total_marks,
          grade: m.grade || getGradeFromMarks(m.marks_obtained || 0, m.total_marks || 100).grade,
          isOptional: isOptionalName(subName),
          missing: false,
        };
      });
    if (selectedExam) {
      const entered = new Set(rows.map(r => (r.subject_name || "").toLowerCase()));
      expectedSubjects.forEach(es => {
        if (!entered.has(es.name.toLowerCase())) {
          rows.push({
            id: `missing_${es.name}`,
            subject_name: es.name,
            marks_obtained: 0,
            total_marks: es.fullMarks,
            grade: "F",
            isOptional: es.isOptional,
            missing: true,
          });
        }
      });
    }
    return rows;
  })();

  const totalObtained = displayMarks.reduce((sum: number, m: any) => sum + (m.marks_obtained || 0), 0);
  const totalFull = displayMarks.reduce((sum: number, m: any) => sum + (m.total_marks || 0), 0);
  const percentage = totalFull > 0 ? Math.round((totalObtained / totalFull) * 100) : 0;

  // Single Exam Board Calculation Result
  const examBoardResult = useMemo(() => {
    if (!selectedExam || displayMarks.length === 0) return null;
    return calculateBangladeshBoardResult(
      displayMarks.map((m: any) => ({
        name: m.subject_name,
        obtained: m.marks_obtained || 0,
        total: m.total_marks || 100,
        grade: m.grade,
        isOptional: m.isOptional,
      })),
      isOptionalName,
      (student?.classes as any)?.class_name
    );
  }, [selectedExam, displayMarks, student, isOptionalName]);

  // Combine final marks by subject using weights
  const finalSummary = (() => {
    if (!selectedFinal || finalMarks.length === 0) return null;
    const examIds: string[] = selectedFinal.exam_ids || [];
    const weights: number[] = selectedFinal.weights || [];
    const sumW = weights.reduce((a, b) => a + (Number(b) || 0), 0);
    const useEqual = sumW <= 0;
    const wFor = (eid: string) => {
      const idx = examIds.indexOf(eid);
      if (idx < 0) return 0;
      if (useEqual) return examIds.length ? 100 / examIds.length : 0;
      return ((Number(weights[idx]) || 0) / sumW) * 100;
    };
    const bySubject: Record<string, { name: string; entries: { eid: string; ob: number; tot: number }[] }> = {};
    finalMarks.forEach((m: any) => {
      const n = m.subjects?.subject_name || "—";
      if (!bySubject[n]) bySubject[n] = { name: n, entries: [] };
      bySubject[n].entries.push({ eid: m.result_id, ob: m.marks_obtained || 0, tot: m.total_marks || 100 });
    });
    const rows = Object.values(bySubject).map(s => {
      let wp = 0, ws = 0, ob = 0, tot = 0;
      s.entries.forEach(e => {
        const w = wFor(e.eid);
        const pct = e.tot > 0 ? (e.ob / e.tot) * 100 : 0;
        wp += pct * w; ws += w; ob += e.ob; tot += e.tot;
      });
      const finalPct = ws > 0 ? wp / ws : 0;
      const { grade, gpa } = getGradeFromMarks(finalPct, 100);
      return { name: s.name, percent: finalPct, grade, gpa, obtained: ob, total: tot, isOptional: isOptionalName(s.name) };
    });
    const avgPct = rows.length ? rows.reduce((a, b) => a + b.percent, 0) / rows.length : 0;
    
    const boardRes = calculateBangladeshBoardResult(
      rows.map(r => ({
        name: r.name,
        obtained: r.percent,
        total: 100,
        grade: r.grade,
        gpa: r.gpa,
        isOptional: r.isOptional,
      })),
      (name) => isOptionalName(name)
    );

    return { rows, avgPct, gpa: boardRes.finalGPA, grade: boardRes.finalGrade, boardResult: boardRes };
  })();


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          My Results & Marksheets
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {((Array.isArray(student?.classes) ? student.classes[0]?.class_name : student?.classes?.class_name) || "Class")} • Section: {((Array.isArray(student?.sections) ? student.sections[0]?.section_name : student?.sections?.section_name) || "A")} • Roll: {student?.roll || "N/A"}
        </p>
      </div>

      {!selectedExam && !selectedFinal ? (
        <div className="space-y-6">
          {/* Final Results Section (separate) */}
          {finalResults.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Award className="h-4 w-4" /> Final Results
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {finalResults.map((f: any) => (
                  <Card
                    key={f.id}
                    className="cursor-pointer border-primary/30 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary hover:shadow-md transition-all group"
                    onClick={() => setSelectedFinal(f)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                            <Award className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{f.name}</h3>
                            <Badge variant="default" className="mt-1 text-xs">Final • {(f.exam_ids || []).length} exams</Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Click to view your final result →</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Individual Exams */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Exam Results
            </h2>
            {exams.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No exam results published yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {exams.map((exam: any) => (
                  <Card
                    key={exam.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                    onClick={() => setSelectedExam(exam)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Award className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{exam.exam_name}</h3>
                            <Badge variant="secondary" className="mt-1 text-xs">{exam.academic_year}</Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">Click to view your results →</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : selectedFinal ? (
        /* Final Result Detail */
        <div className="space-y-4">
          <button
            onClick={() => setSelectedFinal(null)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            ← Back to results
          </button>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                {selectedFinal.name}
                <Badge variant="default">Final</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!finalSummary || finalSummary.rows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No marks found yet for this final result</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-center">Weighted %</TableHead>
                        <TableHead className="text-center">Total (Sum)</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {finalSummary.rows.map((r) => (
                        <TableRow key={r.name}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              {r.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">{r.percent.toFixed(2)}%</TableCell>
                          <TableCell className="text-center text-muted-foreground">{r.obtained}/{r.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={
                              r.grade === "A+" ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" :
                              r.grade === "F" ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" :
                              "border-primary/30 bg-primary/5 text-primary"
                            }>
                              {r.grade}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-border">
                    <div className="text-center p-3 rounded-lg bg-primary/5">
                      <p className="text-xs text-muted-foreground">Final %</p>
                      <p className="text-xl font-bold text-primary">{finalSummary.avgPct.toFixed(2)}%</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/5">
                      <p className="text-xs text-muted-foreground">GPA</p>
                      <p className="text-xl font-bold text-foreground">{finalSummary.gpa.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/5">
                      <p className="text-xs text-muted-foreground">Grade</p>
                      <p className="text-xl font-bold text-foreground">{finalSummary.grade}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Result Detail */
        <div className="space-y-4">
          <button
            onClick={() => setSelectedExam(null)}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            ← Back to exams
          </button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                {selectedExam.exam_name}
                <Badge variant="secondary">{selectedExam.academic_year}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayMarks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No marks found for this exam</p>
              ) : (
                <>
                  {/* Detailed Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject / Paper</TableHead>
                        <TableHead className="text-center">Obtained</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayMarks.map((mark: any) => {
                        const grade = mark.grade;
                        return (
                          <TableRow key={mark.id} className={mark.isOptional ? "bg-emerald-50/40 dark:bg-emerald-950/20" : ""}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <span>{mark.subject_name}</span>
                                {mark.isOptional && (
                                  <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border-emerald-300 text-[10px] py-0 px-1.5 font-bold">
                                    4th Subject
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-semibold">{mark.missing ? "—" : (mark.marks_obtained ?? "—")}</TableCell>
                            <TableCell className="text-center text-muted-foreground">{mark.total_marks ?? "—"}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={
                                grade === "A+" ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" :
                                grade === "F" ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" :
                                "border-primary/30 bg-primary/5 text-primary"
                              }>
                                {grade}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Combined Subject Summary if dual papers exist */}
                  {examBoardResult && examBoardResult.subjects.some(s => s.isCombined) && (
                    <div className="mt-6 space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Combined Subject Summary (Board Standard)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {examBoardResult.subjects.map(sub => (
                          <div key={sub.displayName} className="p-3 rounded-lg border border-border bg-card/60 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-semibold text-foreground flex items-center gap-1.5">
                                {sub.displayName}
                                {sub.isOptional && <Badge variant="secondary" className="text-[9px] py-0 px-1">4th</Badge>}
                              </p>
                              <p className="text-muted-foreground text-[11px]">
                                {sub.totalObtained} / {sub.totalFullMarks} ({sub.percentage.toFixed(1)}%)
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-foreground">{sub.grade}</span>
                              <p className="text-[11px] text-muted-foreground">GP: {sub.gpa.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Board Formula / Calculation Info */}
                  {examBoardResult && (
                    <div className={`mt-5 p-3.5 rounded-lg border text-xs leading-relaxed ${
                      !examBoardResult.isPassed
                        ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                        : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    }`}>
                      <p className="font-bold flex items-center gap-1.5">
                        📋 Bangladesh Education Board Result Analysis:
                      </p>
                      <p className="mt-1">
                        • Compulsory Subjects Total GP: <strong>{examBoardResult.compulsorySumGP.toFixed(2)}</strong> (Divisor: <strong>{examBoardResult.compulsoryCount}</strong> subjects)
                      </p>
                      {examBoardResult.optionalBonusGP > 0 && (
                        <p>
                          • 4th / Optional Subject Bonus (Points above 2.00): <strong>+{examBoardResult.optionalBonusGP.toFixed(2)}</strong>
                        </p>
                      )}
                      <p className="mt-0.5 font-mono text-[11px]">
                        Formula: {examBoardResult.formulaText}
                      </p>
                    </div>
                  )}

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-border">
                    <div className="text-center p-3 rounded-lg bg-primary/5">
                      <p className="text-xs text-muted-foreground">Total Marks</p>
                      <p className="text-lg sm:text-xl font-bold text-foreground">{totalObtained}/{totalFull}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/5">
                      <p className="text-xs text-muted-foreground">Percentage</p>
                      <p className="text-lg sm:text-xl font-bold text-primary">{percentage}%</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/5">
                      <p className="text-xs text-muted-foreground">Final GPA</p>
                      <p className="text-lg sm:text-xl font-bold text-foreground">
                        {examBoardResult ? examBoardResult.finalGPA.toFixed(2) : "0.00"}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/5">
                      <p className="text-xs text-muted-foreground">Final Grade</p>
                      <p className="text-lg sm:text-xl font-bold text-foreground">
                        {examBoardResult ? examBoardResult.finalGrade : "—"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentResultsPage;
