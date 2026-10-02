import { useState, useRef, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Printer, ClipboardList, LayoutGrid, Users2, FileSpreadsheet, Plus, Trash2,
  IdCard, Calendar, Clock, MapPin, Search, CheckCircle2, Shield, Settings2,
  SlidersHorizontal, CheckSquare, Square, Palette, AlertCircle, RefreshCw,
  Edit3, HelpCircle, Check, ArrowUpDown, ArrowUp, ArrowDown, Sparkles, BookOpen
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ALL_CLASSES, ALL_SHIFTS, ALL_VERSIONS, ALL_YEARS, getSectionsForClass, getSubjectsForClass } from "@/utils/subjectConfig";
import { printHtmlDocument } from "@/utils/safePrint";
import { resolveSchoolLogoUrl, resolveSignatureUrl } from "@/utils/printImageUtils";
import ManualSheetTab from "./ManualSheetTab";
import { useLanguage } from "@/contexts/LanguageContext";

interface Filters {
  year: string;
  className: string;
  shift: string;
  section: string;
  version: string;
  examTitle: string;
}

const useSchool = (schoolId: string | null) =>
  useQuery({
    queryKey: ["exam-school", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data } = await supabase.from("schools").select("*").eq("id", schoolId).single();
      return data;
    },
    enabled: !!schoolId,
  });

const useStudents = (schoolId: string | null, f: Filters) => {
  const { data: dbClasses = [] } = useQuery({
    queryKey: ["exam-classes", schoolId],
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("*").eq("school_id", schoolId!);
      return data || [];
    },
    enabled: !!schoolId,
  });
  const { data: dbSections = [] } = useQuery({
    queryKey: ["exam-sections", schoolId],
    queryFn: async () => {
      const { data } = await supabase.from("sections").select("*").eq("school_id", schoolId!);
      return data || [];
    },
    enabled: !!schoolId,
  });
  const { data: students = [] } = useQuery({
    queryKey: ["exam-students", schoolId, f.className, f.section, f.shift, f.version, f.year],
    queryFn: async () => {
      const matches = dbClasses.filter((c: any) =>
        c.class_name === f.className &&
        (!f.shift || c.shift === f.shift) &&
        (!f.version || c.version === f.version) &&
        (!f.year || c.academic_year === Number(f.year))
      );
      const classIds = matches.map((c: any) => c.id);
      if (!classIds.length) return [];
      let q = supabase.from("students").select("*")
        .eq("school_id", schoolId!).eq("is_active", true).in("class_id", classIds);
      if (f.section) {
        const secIds = dbSections
          .filter((s: any) => s.section_name === f.section && classIds.includes(s.class_id))
          .map((s: any) => s.id);
        if (!secIds.length) return [];
        q = q.in("section_id", secIds);
      }
      const { data } = await q.order("roll");
      return data || [];
    },
    enabled: !!schoolId && !!f.className && dbClasses.length > 0,
  });
  return students;
};

const schoolHeaderHtml = (school: any, subtitle: string) => {
  const logo = resolveSchoolLogoUrl(school?.school_logo);
  return `
  <div style="text-align:center;border-bottom:2px solid #1a1a2e;padding-bottom:10px;margin-bottom:16px">
    ${logo ? `<img src="${logo}" style="width:60px;height:60px;object-fit:contain;margin-bottom:6px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;"/>` : ""}
    <div style="font-size:22px;font-weight:800;text-transform:uppercase">${school?.school_name || "School Name"}</div>
    <div style="font-size:11px;color:#555">${school?.school_address || ""}${school?.eiin ? ` | EIIN: ${school.eiin}` : ""}</div>
    <div style="font-size:14px;font-weight:700;margin-top:6px;text-transform:uppercase">${subtitle}</div>
  </div>
`;
};

const principalBlock = (school: any) => {
  const sig = resolveSignatureUrl(school?.principal_signature, "signatures");
  return `
  <div style="margin-top:60px;text-align:right;font-size:12px">
    ${sig ? `<img src="${sig}" style="height:35px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;"/><br/>` : ""}
    <div style="border-top:1px solid #333;display:inline-block;padding-top:4px;min-width:180px">
      ${school?.principal_name || "Principal"}<br/>
      <span style="font-weight:600">Principal</span><br/>
      ${school?.school_name || ""}
    </div>
  </div>
`;
};

// ============= Tab: Admit Cards =============
interface SubjectScheduleItem {
  name: string;
  code?: string;
  date: string;
  time: string;
}

const EXAM_PRESETS = [
  "1st Term Examination",
  "2nd Term Examination",
  "Half Yearly Examination",
  "Pre-Test Examination",
  "Test Examination",
  "Annual Examination",
  "Final Examination",
  "Model Test Examination",
  "Special Evaluation Examination",
];

const THEME_STYLES: Record<string, { border: string; headerBg: string; text: string; badgeBg: string; lightBg: string }> = {
  navy: { border: "#1e3a8a", headerBg: "#1e3a8a", text: "#0f172a", badgeBg: "#1e3a8a", lightBg: "#eff6ff" },
  black: { border: "#18181b", headerBg: "#18181b", text: "#09090b", badgeBg: "#18181b", lightBg: "#f4f4f5" },
  green: { border: "#065f46", headerBg: "#065f46", text: "#064e3b", badgeBg: "#065f46", lightBg: "#ecfdf5" },
  maroon: { border: "#881337", headerBg: "#881337", text: "#4c0519", badgeBg: "#881337", lightBg: "#fff1f2" },
};

const AdmitCardTab = ({ school, filters, students }: any) => {
  const { schoolId } = useAuth();

  // Basic Meta Settings
  const [examTitle, setExamTitle] = useState(filters.examTitle || "Annual Examination");
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [examEndDate, setExamEndDate] = useState("");
  const [examTime, setExamTime] = useState("10:00 AM - 01:00 PM");
  const [examCenter, setExamCenter] = useState(school?.school_name || "Main Campus");
  const [roomHall, setRoomHall] = useState("");

  // Print & Layout Options
  const [layoutMode, setLayoutMode] = useState<"double" | "single">("double");
  const [colorTheme, setColorTheme] = useState<"navy" | "black" | "green" | "maroon">("navy");

  // Filtering & Eligibility Options (ভিত্তি / শর্তাবলী)
  const [eligibilityFilter, setEligibilityFilter] = useState<"all" | "paid" | "due">("all");
  const [rollFrom, setRollFrom] = useState("");
  const [rollTo, setRollTo] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});

  // Visibility Toggles (কার্ড উপাদান নিয়ন্ত্রণ)
  const [showPhoto, setShowPhoto] = useState(true);
  const [showRoutine, setShowRoutine] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showTeacherSign, setShowTeacherSign] = useState(true);
  const [showPrincipalSign, setShowPrincipalSign] = useState(true);
  const [showGuardianSign, setShowGuardianSign] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);

  // Active Preview Student
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);

  // Custom Instructions
  const [instructions, setInstructions] = useState<string[]>([
    "১. পরীক্ষার্থীকে অবশ্যই মূল প্রবেশপত্র (Admit Card) সাথে নিয়ে পরীক্ষা কক্ষে প্রবেশ করতে হবে।",
    "২. পরীক্ষা শুরুর অন্তত ৩০ মিনিট পূর্বে পরীক্ষার্থীকে নির্ধারিত আসন গ্রহণ করতে হবে।",
    "৩. পরীক্ষা কক্ষে মোবাইল ফোন, ক্যালকুলেটর (অননুমোদিত) বা ইলেকট্রনিক ডিভাইস সম্পূর্ণ নিষিদ্ধ।",
    "৪. প্রবেশপত্রে কোনো প্রকার কাটাকাটি, দাগাদাগি বা বিকৃত করা সম্পূর্ণ নিষেধ।",
    "৫. উত্তরপত্রে রোল নম্বর, রেজিস্ট্রেশন ও বিষয় কোড সঠিকভাবে পূরণ করতে হবে।",
  ]);

  // Realtime Student Ledger Dues
  const { data: studentLedgers = [] } = useQuery({
    queryKey: ["admit-student-ledgers", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_ledger")
        .select("student_id, amount, paid_amount, status")
        .eq("school_id", schoolId!)
        .is("deleted_at", null);
      if (error) return [];
      return data ?? [];
    },
  });

  const studentDueMap = useMemo(() => {
    const map: Record<string, { due: number; isPaid: boolean }> = {};
    studentLedgers.forEach((row: any) => {
      const due = Math.max(0, (Number(row.amount) || 0) - (Number(row.paid_amount) || 0));
      if (!map[row.student_id]) {
        map[row.student_id] = { due: 0, isPaid: true };
      }
      map[row.student_id].due += due;
      if (due > 0 || row.status === "due" || row.status === "partial") {
        map[row.student_id].isPaid = false;
      }
    });
    return map;
  }, [studentLedgers]);

  // Standard class subjects
  const availableClassSubjects = useMemo(() => {
    return getSubjectsForClass(filters.className, filters.section);
  }, [filters.className, filters.section]);

  // Generate initial routine items for a class
  const generateInitialRoutine = (className: string, section: string, startDate: string, defaultTime: string) => {
    const subs = getSubjectsForClass(className, section);
    return subs.map((sub, i) => {
      const baseDate = new Date(startDate || new Date());
      baseDate.setDate(baseDate.getDate() + i);
      if (baseDate.getDay() === 5) baseDate.setDate(baseDate.getDate() + 1);

      return {
        name: sub.name,
        code: String(101 + i),
        date: baseDate.toISOString().slice(0, 10),
        time: defaultTime || "10:00 AM - 01:00 PM",
      };
    });
  };

  const [routineSchedule, setRoutineSchedule] = useState<SubjectScheduleItem[]>(() =>
    generateInitialRoutine(filters.className, filters.section, examDate, examTime)
  );

  const prevClassKeyRef = useRef(`${filters.className}-${filters.section}`);

  // Re-sync routine schedule ONLY when class or section changes (not on every date/time change)
  useEffect(() => {
    const currentKey = `${filters.className}-${filters.section}`;
    if (prevClassKeyRef.current !== currentKey) {
      prevClassKeyRef.current = currentKey;
      setRoutineSchedule(generateInitialRoutine(filters.className, filters.section, examDate, examTime));
    }
  }, [filters.className, filters.section, examDate, examTime]);

  // Handler functions for routine customization
  const handleResetToDefault = () => {
    setRoutineSchedule(generateInitialRoutine(filters.className, filters.section, examDate, examTime));
  };

  const handleAddSubject = (customName?: string) => {
    const lastItem = routineSchedule[routineSchedule.length - 1];
    let nextDate = examDate;
    if (lastItem && lastItem.date) {
      const nextD = new Date(lastItem.date);
      nextD.setDate(nextD.getDate() + 1);
      if (nextD.getDay() === 5) nextD.setDate(nextD.getDate() + 1);
      nextDate = nextD.toISOString().slice(0, 10);
    }
    const nextCode = String(101 + routineSchedule.length);
    setRoutineSchedule(prev => [
      ...prev,
      {
        name: customName || "",
        code: nextCode,
        date: nextDate,
        time: examTime || "10:00 AM - 01:00 PM",
      },
    ]);
  };

  const handleUpdateSubject = (idx: number, field: keyof SubjectScheduleItem, value: string) => {
    setRoutineSchedule(prev =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleDeleteSubject = (idx: number) => {
    setRoutineSchedule(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMoveSubject = (idx: number, direction: "up" | "down") => {
    setRoutineSchedule(prev => {
      const copy = [...prev];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= copy.length) return prev;
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleAutoFillRoutine = () => {
    const base = new Date(examDate || new Date());
    setRoutineSchedule(prev =>
      prev.map((item, idx) => {
        const d = new Date(base);
        d.setDate(base.getDate() + idx);
        if (d.getDay() === 5) d.setDate(d.getDate() + 1);
        return {
          ...item,
          date: d.toISOString().slice(0, 10),
        };
      })
    );
  };

  const handleApplyTimeToAll = (timeValue?: string) => {
    const applyTime = timeValue || examTime;
    setRoutineSchedule(prev =>
      prev.map(item => ({
        ...item,
        time: applyTime,
      }))
    );
  };

  // Find class subjects not yet in the routine
  const unaddedClassSubjects = useMemo(() => {
    const existingNames = new Set(routineSchedule.map(r => r.name.trim().toLowerCase()));
    return availableClassSubjects.filter(sub => !existingNames.has(sub.name.trim().toLowerCase()));
  }, [availableClassSubjects, routineSchedule]);

  // Filtered Students based on search, roll range, and dues criteria
  const eligibleStudents = useMemo(() => {
    return students.filter((s: any) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = (s.student_name || "").toLowerCase().includes(q);
        const matchesRoll = String(s.roll || "").includes(q);
        const matchesId = (s.student_id || "").toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesId) return false;
      }

      // Roll Range
      const r = Number(s.roll);
      if (rollFrom && !isNaN(Number(rollFrom)) && r < Number(rollFrom)) return false;
      if (rollTo && !isNaN(Number(rollTo)) && r > Number(rollTo)) return false;

      // Fee/Due Status Criteria
      const dueInfo = studentDueMap[s.id];
      if (eligibilityFilter === "paid") {
        if (dueInfo && !dueInfo.isPaid && dueInfo.due > 0) return false;
      } else if (eligibilityFilter === "due") {
        if (!dueInfo || dueInfo.due === 0) return false;
      }

      return true;
    });
  }, [students, search, rollFrom, rollTo, eligibilityFilter, studentDueMap]);

  // Initialize selected student IDs
  const allEligibleSelected = useMemo(() => {
    if (!eligibleStudents.length) return false;
    return eligibleStudents.every((s: any) => selectedStudentIds[s.id] !== false);
  }, [eligibleStudents, selectedStudentIds]);

  const selectedStudents = useMemo(() => {
    return eligibleStudents.filter((s: any) => selectedStudentIds[s.id] !== false);
  }, [eligibleStudents, selectedStudentIds]);

  const toggleSelectAll = () => {
    if (allEligibleSelected) {
      const next: Record<string, boolean> = {};
      eligibleStudents.forEach((s: any) => { next[s.id] = false; });
      setSelectedStudentIds(next);
    } else {
      const next: Record<string, boolean> = {};
      eligibleStudents.forEach((s: any) => { next[s.id] = true; });
      setSelectedStudentIds(next);
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }));
  };

  const activeStudent = useMemo(() => {
    if (previewStudentId) {
      return students.find((s: any) => s.id === previewStudentId) || eligibleStudents[0] || students[0];
    }
    return eligibleStudents[0] || students[0];
  }, [students, eligibleStudents, previewStudentId]);

  // Theme Colors
  const theme = THEME_STYLES[colorTheme] || THEME_STYLES.navy;

  // Single HTML Generator for Print
  const generateSingleAdmitCardHtml = (s: any, isHalf = false) => {
    const studentPhoto = s.photo
      ? (s.photo.startsWith("http") ? s.photo : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/student-photos/${s.photo}`)
      : null;

    const logoUrl = resolveSchoolLogoUrl(school?.school_logo);
    const principalSig = resolveSignatureUrl(school?.principal_signature, "signatures");

    const dueInfo = studentDueMap[s.id];
    const isDue = dueInfo && dueInfo.due > 0;

    return `
      <div class="admit-card ${isHalf ? 'half-page' : 'full-page'}">
        ${showWatermark && logoUrl ? `<img src="${logoUrl}" class="watermark-img" alt="Watermark"/>` : ''}
        <div class="inner-border">
          <!-- Header -->
          <div class="admit-header">
            <div class="header-content">
              ${logoUrl ? `<img src="${logoUrl}" class="school-logo" alt="Logo"/>` : '<div class="school-logo-placeholder"></div>'}
              <div class="school-text">
                <div class="school-name">${school?.school_name || "SCHOOL / COLLEGE NAME"}</div>
                <div class="school-info">${school?.school_address || ""}${school?.eiin ? ` | EIIN: ${school.eiin}` : ""}${school?.school_phone ? ` | Ph: ${school.school_phone}` : ""}</div>
                <div class="admit-badge">
                  <span>ADMIT CARD / প্রবেশপত্র</span>
                </div>
              </div>
              <div class="header-right-box">
                <div class="session-tag">${filters.year}</div>
                ${showBarcode ? `
                  <div class="barcode-box">
                    <div class="barcode-bars">||||| | |||| |||</div>
                    <div class="barcode-num">${s.student_id || s.roll || "000"}</div>
                  </div>
                ` : ''}
              </div>
            </div>
            <div class="exam-title-bar">
              <span>${examTitle} - ${filters.year}</span>
            </div>
          </div>

          <!-- Student Information & Photo Grid -->
          <div class="info-grid">
            <div class="info-table-wrap">
              <table class="student-info-table">
                <tr>
                  <td class="lbl">Student Name:</td>
                  <td class="val highlight">${s.student_name || ""}</td>
                  <td class="lbl">Roll / ID:</td>
                  <td class="val highlight">${s.roll ? `Roll: ${s.roll}` : ""}${s.student_id ? ` (ID: ${s.student_id})` : ""}</td>
                </tr>
                <tr>
                  <td class="lbl">Father's Name:</td>
                  <td class="val">${s.father_name || s.guardian_name || "-"}</td>
                  <td class="lbl">Class & Section:</td>
                  <td class="val">${filters.className} ${filters.section ? `(${filters.section})` : ""}</td>
                </tr>
                <tr>
                  <td class="lbl">Mother's Name:</td>
                  <td class="val">${s.mother_name || "-"}</td>
                  <td class="lbl">Shift / Version:</td>
                  <td class="val" style="text-transform:capitalize">${filters.shift || "-"} / ${filters.version || "-"}</td>
                </tr>
                <tr>
                  <td class="lbl">Exam Center:</td>
                  <td class="val">${examCenter}${roomHall ? ` (${roomHall})` : ''}</td>
                  <td class="lbl">Exam Time:</td>
                  <td class="val">${examTime}</td>
                </tr>
                ${isDue && eligibilityFilter === "due" ? `
                  <tr>
                    <td class="lbl" style="color:#b91c1c;">Account Status:</td>
                    <td class="val" colspan="3" style="color:#b91c1c;font-weight:700;">DUE NOTICE: ৳${dueInfo.due} (Conditional Permit)</td>
                  </tr>
                ` : ''}
              </table>
            </div>
            ${showPhoto ? `
              <div class="photo-container">
                ${studentPhoto 
                  ? `<img src="${studentPhoto}" class="student-img" alt="${s.student_name}"/>`
                  : `<div class="photo-placeholder"><span>Affix Photo /<br/>ছবি</span></div>`
                }
              </div>
            ` : ''}
          </div>

          <!-- Subjects Routine Table -->
          ${showRoutine && routineSchedule.length > 0 ? `
            <div class="routine-title">EXAMINATION SCHEDULE & SUBJECTS</div>
            <table class="subjects-table">
              <thead>
                <tr>
                  <th style="width:7%">SL</th>
                  <th style="width:12%">Code</th>
                  <th style="width:36%">Subject Name</th>
                  <th style="width:16%">Date</th>
                  <th style="width:16%">Time</th>
                  <th style="width:13%">Invigilator</th>
                </tr>
              </thead>
              <tbody>
                ${routineSchedule.slice(0, isHalf ? 8 : 14).map((sub, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${sub.code || "-"}</td>
                    <td style="text-align:left;font-weight:600">${sub.name}</td>
                    <td>${sub.date || examDate}</td>
                    <td>${sub.time || examTime}</td>
                    <td></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          ` : ''}

          <!-- Instructions -->
          ${showInstructions && instructions.length > 0 ? `
            <div class="instructions-box">
              <div class="inst-title">পরীক্ষার্থীদের জন্য সাধারণ নির্দেশাবলী:</div>
              <ol class="inst-list">
                ${instructions.slice(0, isHalf ? 4 : 6).map(inst => `<li>${inst}</li>`).join("")}
              </ol>
            </div>
          ` : ''}

          <!-- Signatures -->
          <div class="signatures-row">
            ${showTeacherSign ? `
              <div class="sig-box">
                <div class="sig-line">শ্রেণি শিক্ষকের স্বাক্ষর</div>
                <div class="sig-sub">Class Teacher's Sign</div>
              </div>
            ` : '<div></div>'}

            <div class="seal-box">
              <div class="seal-circle">SEAL</div>
            </div>

            ${showGuardianSign ? `
              <div class="sig-box">
                <div class="sig-line">অভিভাবকের স্বাক্ষর</div>
                <div class="sig-sub">Guardian's Sign</div>
              </div>
            ` : ''}

            ${showPrincipalSign ? `
              <div class="sig-box">
                ${principalSig ? `<img src="${principalSig}" class="principal-sig-img"/><br/>` : `<div style="height:26px"></div>`}
                <div class="sig-line">প্রধান শিক্ষক / অধ্যক্ষের স্বাক্ষর</div>
                <div class="sig-sub">${school?.principal_name || "Headmaster / Principal"}</div>
              </div>
            ` : '<div></div>'}
          </div>
        </div>
      </div>
    `;
  };

  const executePrint = async (studentsList: any[]) => {
    if (!studentsList.length) return;

    let pagesHtml = "";
    if (layoutMode === "double") {
      for (let i = 0; i < studentsList.length; i += 2) {
        const s1 = studentsList[i];
        const s2 = studentsList[i + 1];
        pagesHtml += `
          <div class="print-page double-mode">
            ${generateSingleAdmitCardHtml(s1, true)}
            ${s2 ? generateSingleAdmitCardHtml(s2, true) : '<div class="half-page empty"></div>'}
          </div>
        `;
      }
    } else {
      pagesHtml = studentsList.map((s: any) => `
        <div class="print-page single-mode">
          ${generateSingleAdmitCardHtml(s, false)}
        </div>
      `).join("");
    }

    await printHtmlDocument({
      title: `Admit_Cards_${filters.className}_${filters.year}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Admit Cards - ${filters.className}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 6mm;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: ${theme.text};
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-page {
              width: 100%;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              gap: 6mm;
            }
            .print-page:last-child {
              page-break-after: auto;
            }
            .print-page.single-mode {
              min-height: 280mm;
              justify-content: flex-start;
            }
            .print-page.double-mode {
              min-height: 280mm;
              justify-content: space-between;
            }
            .admit-card {
              border: 3px double ${theme.border};
              padding: 4px;
              background: #fff;
              position: relative;
              overflow: hidden;
            }
            .watermark-img {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 220px;
              opacity: 0.05;
              pointer-events: none;
              z-index: 0;
            }
            .admit-card.half-page {
              height: 135mm;
            }
            .admit-card.full-page {
              height: 275mm;
            }
            .inner-border {
              border: 1px solid ${theme.border};
              padding: 7px 9px;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
              z-index: 1;
            }
            .admit-header {
              text-align: center;
              border-bottom: 2px solid ${theme.border};
              padding-bottom: 3px;
              margin-bottom: 4px;
            }
            .header-content {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 6px;
            }
            .school-logo {
              width: 44px;
              height: 44px;
              object-fit: contain;
            }
            .school-logo-placeholder {
              width: 44px;
              height: 44px;
            }
            .school-text {
              flex: 1;
              text-align: center;
            }
            .school-name {
              font-size: 15px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: ${theme.headerBg};
            }
            .school-info {
              font-size: 8.5px;
              color: #444;
              margin-top: 1px;
            }
            .admit-badge {
              display: inline-block;
              background: ${theme.badgeBg};
              color: #fff;
              font-weight: 800;
              font-size: 10.5px;
              padding: 1.5px 12px;
              border-radius: 10px;
              margin-top: 2px;
              letter-spacing: 1px;
            }
            .header-right-box {
              width: 55px;
              text-align: right;
            }
            .session-tag {
              border: 1px solid ${theme.border};
              padding: 1.5px 4px;
              font-weight: 700;
              font-size: 9.5px;
              border-radius: 3px;
              display: inline-block;
            }
            .barcode-box {
              margin-top: 2px;
              text-align: right;
            }
            .barcode-bars {
              font-size: 7px;
              letter-spacing: 0.5px;
              font-family: monospace;
              font-weight: 900;
            }
            .barcode-num {
              font-size: 7px;
              font-weight: 700;
              color: #555;
            }
            .exam-title-bar {
              margin-top: 3px;
              font-size: 10.5px;
              font-weight: 700;
              text-transform: uppercase;
              color: ${theme.headerBg};
              background: ${theme.lightBg};
              padding: 2px 6px;
              border-radius: 3px;
              border: 1px solid #d0d5dd;
            }
            .info-grid {
              display: flex;
              gap: 6px;
              margin-bottom: 4px;
              align-items: stretch;
            }
            .info-table-wrap {
              flex: 1;
            }
            .student-info-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 9px;
            }
            .student-info-table td {
              padding: 2px 3.5px;
              border: 1px solid #ccc;
            }
            .student-info-table td.lbl {
              font-weight: 700;
              color: #333;
              width: 19%;
              background: #fafafa;
              text-transform: uppercase;
              font-size: 8px;
            }
            .student-info-table td.val {
              font-weight: 600;
              width: 31%;
            }
            .student-info-table td.val.highlight {
              font-size: 10px;
              font-weight: 800;
              color: ${theme.text};
            }
            .photo-container {
              width: 65px;
              height: 75px;
              border: 1px dashed ${theme.border};
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fdfdfd;
              flex-shrink: 0;
            }
            .student-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .photo-placeholder {
              text-align: center;
              font-size: 7px;
              color: #777;
              font-weight: 600;
              line-height: 1.2;
            }
            .routine-title {
              font-size: 8px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
              color: ${theme.headerBg};
            }
            .subjects-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 4px;
              font-size: 8.5px;
            }
            .subjects-table th, .subjects-table td {
              border: 1px solid ${theme.border};
              padding: 2px 3.5px;
              text-align: center;
            }
            .subjects-table th {
              background: ${theme.lightBg};
              font-weight: 700;
              text-transform: uppercase;
              font-size: 7.5px;
            }
            .instructions-box {
              border: 1px solid #d0d5dd;
              background: #fcfcfd;
              padding: 3px 5px;
              font-size: 7.5px;
              margin-bottom: 4px;
              border-radius: 3px;
            }
            .inst-title {
              font-weight: 700;
              margin-bottom: 1.5px;
              color: #0f172a;
            }
            .inst-list {
              list-style-type: none;
              padding-left: 0;
            }
            .inst-list li {
              margin-bottom: 1px;
              line-height: 1.2;
              color: #334155;
            }
            .signatures-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 3px;
              padding-top: 2px;
            }
            .sig-box {
              text-align: center;
              min-width: 110px;
            }
            .sig-line {
              border-top: 1px solid ${theme.border};
              font-size: 8px;
              font-weight: 700;
              padding-top: 2px;
            }
            .sig-sub {
              font-size: 7px;
              color: #555;
            }
            .principal-sig-img {
              height: 22px;
              max-width: 90px;
              object-fit: contain;
              margin-bottom: 1px;
            }
            .seal-box {
              text-align: center;
            }
            .seal-circle {
              width: 32px;
              height: 32px;
              border: 1px dashed #999;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 6.5px;
              color: #888;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
        </body>
        </html>
      `,
    });
  };

  return (
    <div className="space-y-6">
      {/* ================= SECTION 1: ADMIT CARD OPTIONS & CRITERIA ================= */}
      <div className="stat-card p-5 bg-card border rounded-2xl shadow-sm space-y-5">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <IdCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-heading uppercase tracking-wide">
                  Admit Card Generator & Options (প্রবেশপত্র তৈরি ও সেটিংস)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Generate, customize options, eligibility criteria, routine schedule & batch print formal admit cards.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Select value={layoutMode} onValueChange={(v: any) => setLayoutMode(v)}>
              <SelectTrigger className="w-44 h-9 text-xs">
                <SelectValue placeholder="Layout Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="double">2 Cards / Page (A4 Half)</SelectItem>
                <SelectItem value="single">1 Card / Page (A4 Full)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={colorTheme} onValueChange={(v: any) => setColorTheme(v)}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="navy">🔵 Classic Navy</SelectItem>
                <SelectItem value="black">⚫ Monochrome (B&W)</SelectItem>
                <SelectItem value="green">🟢 Emerald Green</SelectItem>
                <SelectItem value="maroon">🔴 Royal Maroon</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => executePrint(selectedStudents)}
              disabled={!selectedStudents.length}
              className="gap-2 bg-primary text-primary-foreground shadow-sm h-9 px-4 font-bold"
            >
              <Printer className="h-4 w-4" /> Print Selected ({selectedStudents.length})
            </Button>
          </div>
        </div>

        {/* Option Grid: Generation Criteria, Dates, Schedule, and Eligibility */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Option 1: Exam Preset & Title */}
          <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              ১. পরীক্ষার নাম (Exam Title)
            </label>
            <Select value={examTitle} onValueChange={v => setExamTitle(v)}>
              <SelectTrigger className="h-8 text-xs bg-card">
                <SelectValue placeholder="Select Exam" />
              </SelectTrigger>
              <SelectContent>
                {EXAM_PRESETS.map(preset => (
                  <SelectItem key={preset} value={preset}>{preset}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={examTitle}
              onChange={e => setExamTitle(e.target.value)}
              placeholder="Or type custom exam title..."
              className="h-7 text-xs bg-card mt-1"
            />
          </div>

          {/* Option 2: Exam Timing & Center */}
          <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              ২. সময়সূচী ও ভেন্যু (Schedule & Venue)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <span className="text-[10px] text-muted-foreground block">শুরুর তারিখ</span>
                <Input
                  type="date"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">পরীক্ষার শিফট/সময়</span>
                <Input
                  value={examTime}
                  onChange={e => setExamTime(e.target.value)}
                  placeholder="10:00 AM - 01:00 PM"
                  className="h-7 text-xs bg-card"
                />
              </div>
            </div>
            <Input
              value={examCenter}
              onChange={e => setExamCenter(e.target.value)}
              placeholder="Exam Center / Campus"
              className="h-7 text-xs bg-card"
            />
          </div>

          {/* Option 3: Eligibility & Payment Condition (ভিত্তি / শর্তাবলী) */}
          <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              ৩. যোগ্যতার শর্ত (Eligibility Filter)
            </label>
            <Select value={eligibilityFilter} onValueChange={(v: any) => setEligibilityFilter(v)}>
              <SelectTrigger className="h-8 text-xs bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব শিক্ষার্থী (All Students)</SelectItem>
                <SelectItem value="paid">শুধুমাত্র ফি পরিশোধিত (Paid / No Due)</SelectItem>
                <SelectItem value="due">শুধুমাত্র বকেয়া আছে (Due Students)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5 pt-1">
              <Input
                placeholder="Roll From"
                value={rollFrom}
                onChange={e => setRollFrom(e.target.value)}
                className="h-7 text-xs bg-card"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                placeholder="Roll To"
                value={rollTo}
                onChange={e => setRollTo(e.target.value)}
                className="h-7 text-xs bg-card"
              />
            </div>
          </div>

          {/* Option 4: Card Elements Visibility Control */}
          <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5 text-primary" />
              ৪. উপাদান প্রদর্শন (Card Elements)
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox checked={showPhoto} onCheckedChange={(v: any) => setShowPhoto(!!v)} />
                <span>ছবি (Photo)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox checked={showRoutine} onCheckedChange={(v: any) => setShowRoutine(!!v)} />
                <span>রুটিন (Routine)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox checked={showInstructions} onCheckedChange={(v: any) => setShowInstructions(!!v)} />
                <span>নিয়মাবলী (Rules)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox checked={showBarcode} onCheckedChange={(v: any) => setShowBarcode(!!v)} />
                <span>বারকোড (Barcode)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox checked={showTeacherSign} onCheckedChange={(v: any) => setShowTeacherSign(!!v)} />
                <span>শিক্ষক স্বাক্ষর</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <Checkbox checked={showPrincipalSign} onCheckedChange={(v: any) => setShowPrincipalSign(!!v)} />
                <span>অধ্যক্ষ স্বাক্ষর</span>
              </label>
            </div>
          </div>
        </div>

        {/* Routine Schedule Setup (বিষয়ভিত্তিক পরীক্ষার রুটিন কাস্টমাইজেশন ও অপশন) */}
        {showRoutine && (
          <div className="pt-4 border-t space-y-3">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                  বিষয় ও পরীক্ষার রুটিন কাস্টমাইজার (Subject & Routine Manager)
                </span>
                <Badge variant="outline" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20">
                  {routineSchedule.length} Subjects
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAutoFillRoutine}
                  className="h-7 text-xs gap-1.5"
                  title="পরীক্ষার শুরুর তারিখ থেকে পর পর তারিখ বসান (শুক্রবার বাদ)"
                >
                  <Sparkles className="h-3 w-3 text-amber-500" /> Auto Sequence Dates
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyTimeToAll()}
                  className="h-7 text-xs gap-1.5"
                  title="সকল বিষয়ে পরীক্ষার বর্তমান সময় বসান"
                >
                  <Clock className="h-3 w-3" /> Apply Time to All
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetToDefault}
                  className="h-7 text-xs gap-1.5"
                  title="এই শ্রেণির মূল সিলেবাসের ডিফল্ট বিষয়সমূহে ফিরিয়ে নিন"
                >
                  <RefreshCw className="h-3 w-3" /> Reset Default
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleAddSubject()}
                  className="h-7 text-xs gap-1 bg-primary text-primary-foreground shadow-sm"
                >
                  <Plus className="h-3 w-3" /> Add Subject
                </Button>
              </div>
            </div>

            {/* Quick-add unadded class subjects */}
            {unaddedClassSubjects.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-muted/40 border text-[11px]">
                <span className="font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                  <Plus className="h-3 w-3 text-primary" /> Quick Add Class Subjects:
                </span>
                {unaddedClassSubjects.map((sub, i) => (
                  <button
                    key={i}
                    onClick={() => handleAddSubject(sub.name)}
                    className="px-2 py-0.5 rounded-md bg-card hover:bg-primary/10 hover:text-primary border text-[11px] font-medium transition-colors flex items-center gap-1"
                  >
                    <span>+ {sub.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Datalist for fast subject auto-completion */}
            <datalist id="bd-subjects-list">
              <option value="Bangla" />
              <option value="Bangla 1st Paper" />
              <option value="Bangla 2nd Paper" />
              <option value="English" />
              <option value="English 1st Paper" />
              <option value="English 2nd Paper" />
              <option value="Mathematics" />
              <option value="Higher Mathematics" />
              <option value="Science" />
              <option value="General Science" />
              <option value="Physics" />
              <option value="Chemistry" />
              <option value="Biology" />
              <option value="Bangladesh and Global Studies" />
              <option value="ICT (Information and Communication Technology)" />
              <option value="Islam & Moral Education" />
              <option value="Hindu Religion & Moral Education" />
              <option value="Buddhist Religion & Moral Education" />
              <option value="Christian Religion & Moral Education" />
              <option value="Accounting" />
              <option value="Business Entrepreneurship" />
              <option value="Finance and Banking" />
              <option value="Economics" />
              <option value="Civics and Citizenship" />
              <option value="Geography and Environment" />
              <option value="History of Bangladesh & World Civilization" />
              <option value="Agriculture Studies" />
              <option value="Home Science" />
              <option value="Arts and Crafts" />
              <option value="Physical Education & Health" />
              <option value="Career Education" />
              <option value="Arabic" />
            </datalist>

            {/* Subject Customization Cards / Rows */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1">
              {routineSchedule.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border bg-card hover:border-primary/40 transition-colors space-y-2 text-xs relative group shadow-sm"
                >
                  {/* Row Header: SL, Name Input, Reorder, Delete */}
                  <div className="flex items-center gap-1.5">
                    <span className="h-5 w-5 rounded-md bg-muted text-muted-foreground font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    {/* Subject Name Input with Datalist */}
                    <div className="flex-1 min-w-0">
                      <Input
                        list="bd-subjects-list"
                        value={item.name}
                        onChange={e => handleUpdateSubject(idx, "name", e.target.value)}
                        placeholder="Subject Name (e.g. Mathematics)"
                        className="h-7 text-xs font-semibold bg-card px-2"
                      />
                    </div>

                    {/* Subject Code Input */}
                    <div className="w-16 shrink-0">
                      <Input
                        value={item.code || ""}
                        onChange={e => handleUpdateSubject(idx, "code", e.target.value)}
                        placeholder="Code"
                        className="h-7 text-xs text-center font-mono bg-card px-1"
                        title="Subject Code"
                      />
                    </div>

                    {/* Reorder Buttons */}
                    <div className="flex items-center shrink-0">
                      <button
                        onClick={() => handleMoveSubject(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleMoveSubject(idx, "down")}
                        disabled={idx === routineSchedule.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(idx)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                        title="Delete Subject"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Row Body: Exam Date & Exam Time Inputs */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5 text-primary" /> তারিখ (Date)
                      </span>
                      <Input
                        type="date"
                        value={item.date}
                        onChange={e => handleUpdateSubject(idx, "date", e.target.value)}
                        className="h-7 text-xs px-1.5 bg-card"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 text-primary" /> সময় (Time)
                      </span>
                      <Input
                        value={item.time}
                        onChange={e => handleUpdateSubject(idx, "time", e.target.value)}
                        placeholder="10:00 AM - 01:00 PM"
                        className="h-7 text-xs px-1.5 bg-card"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {routineSchedule.length === 0 && (
                <div className="col-span-full py-6 text-center border rounded-xl bg-muted/20 space-y-2">
                  <p className="text-xs text-muted-foreground">কোনো বিষয় যোগ করা হয়নি। নিচে ক্লিক করে বিষয় যোগ করুন।</p>
                  <Button size="sm" onClick={() => handleAddSubject()} className="h-8 text-xs gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add First Subject
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= SECTION 2: STUDENT SELECTION LIST & LIVE CARD PREVIEW ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filtered Students Table with Checkboxes */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={toggleSelectAll}
                className="h-8 text-xs gap-1.5 px-2.5 font-semibold"
              >
                {allEligibleSelected ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5" />}
                {allEligibleSelected ? "Deselect All" : "Select All"}
              </Button>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                ({selectedStudents.length} / {eligibleStudents.length} Selected)
              </span>
            </div>

            <div className="relative w-40">
              <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>

          <div className="border rounded-2xl bg-card divide-y max-h-[620px] overflow-y-auto shadow-sm">
            {eligibleStudents.map((s: any) => {
              const isSelected = selectedStudentIds[s.id] !== false;
              const isPreview = activeStudent?.id === s.id;
              const dueInfo = studentDueMap[s.id];
              const hasDue = dueInfo && dueInfo.due > 0;

              return (
                <div
                  key={s.id}
                  onClick={() => setPreviewStudentId(s.id)}
                  className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                    isPreview ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectStudent(s.id);
                      }}
                      className="cursor-pointer p-1 -m-1"
                    >
                      <Checkbox checked={isSelected} />
                    </div>

                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                      {s.roll || "#"}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold truncate text-foreground">{s.student_name}</p>
                        {hasDue ? (
                          <Badge variant="outline" className="h-4 text-[9px] px-1 bg-destructive/10 text-destructive border-destructive/20">
                            Due ৳{dueInfo.due}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-4 text-[9px] px-1 bg-success/10 text-success border-success/20">
                            Paid
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        ID: {s.student_id || "-"} &bull; {filters.className} ({s.roll ? `Roll ${s.roll}` : "No Roll"})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px] gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        executePrint([s]);
                      }}
                    >
                      <Printer className="h-3 w-3" /> Print
                    </Button>
                  </div>
                </div>
              );
            })}

            {!eligibleStudents.length && (
              <div className="p-10 text-center text-xs text-muted-foreground space-y-1">
                <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground/60" />
                <p className="font-semibold">কোনো শিক্ষার্থী পাওয়া যায়নি</p>
                <p className="text-[11px]">ফিল্টার বা ক্লাসের তথ্য পরিবর্তন করে পুনরায় চেষ্টা করুন।</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Visual Admit Card Preview */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Live Card Preview ({activeStudent ? activeStudent.student_name : "None"})
            </span>
            {activeStudent && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 font-bold"
                onClick={() => executePrint([activeStudent])}
              >
                <Printer className="h-3.5 w-3.5" /> Print This Card
              </Button>
            )}
          </div>

          {activeStudent ? (
            <div
              className="border-2 rounded-2xl p-5 bg-white text-slate-900 shadow-md space-y-3 relative overflow-hidden"
              style={{ borderColor: theme.border }}
            >
              {/* Preview Watermark */}
              {showWatermark && school?.school_logo && (
                <img
                  src={resolveSchoolLogoUrl(school.school_logo)}
                  alt=""
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 opacity-[0.06] pointer-events-none"
                />
              )}

              {/* Preview Header */}
              <div className="text-center border-b pb-3 space-y-1" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between gap-2">
                  {school?.school_logo ? (
                    <img
                      src={resolveSchoolLogoUrl(school.school_logo)}
                      alt=""
                      className="h-11 w-11 object-contain"
                    />
                  ) : (
                    <div className="w-11 h-11" />
                  )}
                  <div className="flex-1 text-center">
                    <h4 className="text-base font-extrabold uppercase tracking-wide" style={{ color: theme.headerBg }}>
                      {school?.school_name || "SCHOOL NAME"}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {school?.school_address || "School Address"}{school?.eiin ? ` | EIIN: ${school.eiin}` : ""}
                    </p>
                    <div
                      className="inline-block text-white text-[10.5px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider mt-1"
                      style={{ backgroundColor: theme.badgeBg }}
                    >
                      ADMIT CARD / প্রবেশপত্র
                    </div>
                  </div>
                  <div className="w-14 text-right">
                    <div className="border border-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold inline-block">
                      {filters.year}
                    </div>
                    {showBarcode && (
                      <div className="text-[8px] font-mono mt-1 text-slate-500">
                        ||||||||||<br />
                        {activeStudent.student_id || activeStudent.roll || "000"}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className="text-xs font-bold uppercase py-1 px-3 rounded mt-2 border"
                  style={{ backgroundColor: theme.lightBg, color: theme.headerBg, borderColor: theme.border }}
                >
                  {examTitle} - {filters.year}
                </div>
              </div>

              {/* Student Info & Photo */}
              <div className="flex gap-3 items-start">
                <div className="flex-1 grid grid-cols-2 gap-x-2.5 gap-y-1 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div><span className="text-[9px] uppercase font-bold text-slate-500 block">Examinee Name</span> <strong className="text-slate-900">{activeStudent.student_name}</strong></div>
                  <div><span className="text-[9px] uppercase font-bold text-slate-500 block">Class & Roll</span> <strong>{filters.className} {filters.section && `(${filters.section})`} &bull; Roll: {activeStudent.roll || "-"}</strong></div>
                  <div><span className="text-[9px] uppercase font-bold text-slate-500 block">Father's Name</span> <span>{activeStudent.father_name || activeStudent.guardian_name || "-"}</span></div>
                  <div><span className="text-[9px] uppercase font-bold text-slate-500 block">Student ID</span> <span>{activeStudent.student_id || "-"}</span></div>
                  <div><span className="text-[9px] uppercase font-bold text-slate-500 block">Shift / Version</span> <span className="capitalize">{filters.shift} / {filters.version}</span></div>
                  <div><span className="text-[9px] uppercase font-bold text-slate-500 block">Exam Venue</span> <span>{examCenter}</span></div>
                </div>

                {showPhoto && (
                  <div className="w-18 h-22 border-2 border-dashed border-slate-300 rounded flex items-center justify-center bg-slate-50 shrink-0 overflow-hidden text-center">
                    {activeStudent.photo ? (
                      <img
                        src={activeStudent.photo.startsWith("http") ? activeStudent.photo : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/student-photos/${activeStudent.photo}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[8px] text-slate-400 font-semibold p-1">Affix Photo</span>
                    )}
                  </div>
                )}
              </div>

              {/* Routine Table Preview */}
              {showRoutine && routineSchedule.length > 0 && (
                <div>
                  <div className="text-[9px] font-bold uppercase text-slate-600 mb-1" style={{ color: theme.headerBg }}>
                    Exam Schedule & Subjects ({routineSchedule.length})
                  </div>
                  <div className="border rounded overflow-hidden" style={{ borderColor: theme.border }}>
                    <table className="w-full text-xs text-center">
                      <thead style={{ backgroundColor: theme.lightBg }} className="text-[9px] uppercase font-bold text-slate-700">
                        <tr>
                          <th className="p-1 w-8 border-r">#</th>
                          <th className="p-1 w-12 border-r">Code</th>
                          <th className="p-1 text-left border-r">Subject Name</th>
                          <th className="p-1 border-r">Date</th>
                          <th className="p-1 border-r">Time</th>
                          <th className="p-1">Sign</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-700 text-[10.5px]">
                        {routineSchedule.slice(0, 5).map((sub, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-1 border-r text-[9px]">{i + 1}</td>
                            <td className="p-1 border-r text-[9px]">{sub.code || "-"}</td>
                            <td className="p-1 text-left font-medium border-r">{sub.name}</td>
                            <td className="p-1 border-r text-[10px]">{sub.date}</td>
                            <td className="p-1 border-r text-[9px]">{sub.time}</td>
                            <td className="p-1 text-slate-300">&mdash;</td>
                          </tr>
                        ))}
                        {routineSchedule.length > 5 && (
                          <tr>
                            <td colSpan={6} className="p-1 text-center text-[9px] text-slate-400 italic">
                              + {routineSchedule.length - 5} more subjects included in final printout
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Instructions Box Preview */}
              {showInstructions && instructions.length > 0 && (
                <div className="bg-slate-50 border rounded p-2 text-[9px] text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-800">পরীক্ষার্থীদের জন্য সাধারণ নির্দেশাবলী:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[8.5px]">
                    {instructions.slice(0, 3).map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Signatures Preview */}
              <div className="flex justify-between items-end pt-3 text-center">
                {showTeacherSign && (
                  <div>
                    <div className="border-t border-slate-400 pt-1 text-[10px] font-bold text-slate-800">শ্রেণি শিক্ষক</div>
                    <div className="text-[8px] text-slate-400">Class Teacher</div>
                  </div>
                )}
                <div className="w-8 h-8 border border-dashed border-slate-300 rounded-full flex items-center justify-center text-[7px] text-slate-400">
                  SEAL
                </div>
                {showGuardianSign && (
                  <div>
                    <div className="border-t border-slate-400 pt-1 text-[10px] font-bold text-slate-800">অভিভাবকের স্বাক্ষর</div>
                    <div className="text-[8px] text-slate-400">Guardian Sign</div>
                  </div>
                )}
                {showPrincipalSign && (
                  <div>
                    {school?.principal_signature && (
                      <img
                        src={school.principal_signature.startsWith("http") ? school.principal_signature : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/signatures/${school.principal_signature}`}
                        alt=""
                        className="h-5 mx-auto object-contain"
                      />
                    )}
                    <div className="border-t border-slate-400 pt-1 text-[10px] font-bold text-slate-800">প্রধান শিক্ষক / অধ্যক্ষ</div>
                    <div className="text-[8px] text-slate-400">{school?.principal_name || "Principal"}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border rounded-2xl p-12 text-center text-muted-foreground text-xs">
              Select a student from the left list to preview their admit card.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============= Tab: Exam Attendance Sheet =============
const AttendanceSheetTab = ({ school, filters, students }: any) => {
  const rows = 12;
  const handlePrint = async () => {
    const html = students.map((s: any) => `
      <div class="page">
        ${schoolHeaderHtml(school, `${filters.examTitle || "Examination"} - ${filters.year}<br/>Students Attendance`)}
        <div class="info-box">
          <div class="row"><span class="label">Name of the Examinee:</span> <span class="val">${s.student_name || ""}</span></div>
          <div class="row-split">
            <div><span class="label">Father's Name:</span> <span class="val">${s.father_name || ""}</span></div>
            <div><span class="label">Mother's Name:</span> <span class="val">${s.mother_name || ""}</span></div>
          </div>
          <div class="row-split three">
            <div><span class="label">Class:</span> <span class="val">${filters.className} ${filters.section ? `(${filters.section})` : ""}</span></div>
            <div><span class="label">Roll/ID:</span> <span class="val">${s.roll || ""}</span></div>
            <div><span class="label">Mobile:</span> <span class="val">${s.guardian_phone || s.mobile || ""}</span></div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:18%">Exam Date</th>
              <th style="width:22%">Subject Name</th>
              <th style="width:25%">Student's Name</th>
              <th style="width:20%">Examiner's Signature</th>
              <th style="width:15%">Comments</th>
            </tr>
          </thead>
          <tbody>${Array.from({ length: rows }).map(() => `<tr><td></td><td></td><td></td><td></td><td></td></tr>`).join("")}</tbody>
        </table>
        ${principalBlock(school)}
      </div>
    `).join("");

    await printHtmlDocument({
      title: "Exam Attendance Sheet",
      html: `<html><head><title>Exam Attendance Sheet</title><style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e}
        .page{padding:30px;page-break-after:always}
        .page:last-child{page-break-after:auto}
        .info-box{border:1.5px solid #333;padding:8px;margin-bottom:12px;font-size:12px}
        .info-box .row{padding:6px;border-bottom:1px solid #ccc}
        .info-box .row:last-child{border-bottom:none}
        .row-split{display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid #ccc}
        .row-split.three{grid-template-columns:1fr 1fr 1fr;border-bottom:none}
        .row-split > div{padding:6px;border-right:1px solid #ccc}
        .row-split > div:last-child{border-right:none}
        .label{font-weight:700;text-transform:uppercase;font-size:10px;color:#555;letter-spacing:.5px}
        .val{font-weight:600;font-size:13px}
        table{width:100%;border-collapse:collapse;margin-top:8px}
        th,td{border:1px solid #333;padding:10px 6px;font-size:12px;text-align:center;height:32px}
        th{background:#f2f2f2;text-transform:uppercase;font-weight:700}
      </style></head><body>${html || `<div class="page">${schoolHeaderHtml(school, "No students found")}</div>`}</body></html>`,
    });
  };

  return (
    <div className="stat-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Exam Attendance Sheet</h3>
          <p className="text-sm text-muted-foreground">One page per student — with rows for exam dates & examiner signatures.</p>
        </div>
        <Button onClick={handlePrint} disabled={!students.length} className="gap-2">
          <Printer className="h-4 w-4" /> Print ({students.length} students)
        </Button>
      </div>
      <div className="border rounded-lg p-4 bg-muted/30">
        <p className="text-sm"><strong>Preview:</strong> Each student gets one full A4 page with their name, class, roll, guardian details, and a 12-row table for daily exam attendance & examiner signatures.</p>
      </div>
    </div>
  );
};

// ============= Tab: Seat Plan Cards =============
const SeatPlanTab = ({ school, filters, students }: any) => {
  const handlePrint = async () => {
    const cards = students.map((s: any) => `
      <div class="card">
        <div class="hdr">${(filters.examTitle || "Examination")} - ${filters.year}</div>
        <div class="line"><span class="lbl">Name:</span> <span class="dot">${s.student_name || ""}</span></div>
        <div class="line"><span class="lbl">Class:</span> <span class="dot short">${filters.className}${filters.section ? ` (${filters.section})` : ""}</span> <span class="lbl">Roll/ID:</span> <span class="dot short">${s.roll || ""}</span></div>
      </div>
    `).join("");

    await printHtmlDocument({
      title: "Exam Seat Plan Cards",
      html: `<html><head><title>Seat Plan</title><style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;padding:20px}
        .school-title{text-align:center;font-size:18px;font-weight:800;margin-bottom:6px;text-transform:uppercase}
        .school-sub{text-align:center;font-size:11px;color:#555;margin-bottom:14px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .card{border:1.5px solid #333;padding:14px;min-height:100px;page-break-inside:avoid}
        .hdr{text-transform:uppercase;font-weight:700;font-size:12px;border-bottom:1px solid #333;padding-bottom:6px;margin-bottom:10px;text-align:center}
        .line{font-size:13px;margin-bottom:8px;display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
        .lbl{font-weight:700}
        .dot{flex:1;border-bottom:1px dotted #333;padding:2px 4px;min-height:18px;font-weight:600}
        .dot.short{flex:0 1 auto;min-width:80px}
      </style></head><body>
        <div class="school-title">${school?.school_name || "School Name"}</div>
        <div class="school-sub">${school?.school_address || ""}${school?.eiin ? ` | EIIN: ${school.eiin}` : ""}</div>
        <div class="grid">${cards || `<div>No students found</div>`}</div>
      </body></html>`,
    });
  };

  return (
    <div className="stat-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Exam Seat Plan Cards</h3>
          <p className="text-sm text-muted-foreground">Printable seat cards — Name, Class, Roll/ID for each student (2 per row).</p>
        </div>
        <Button onClick={handlePrint} disabled={!students.length} className="gap-2">
          <Printer className="h-4 w-4" /> Print ({students.length} cards)
        </Button>
      </div>
      <div className="border rounded-lg p-4 bg-muted/30 grid grid-cols-2 gap-3">
        {students.slice(0, 4).map((s: any) => (
          <div key={s.id} className="border p-3 rounded bg-white">
            <div className="text-xs font-bold uppercase text-center border-b pb-1 mb-2">{(filters.examTitle || "Exam")} - {filters.year}</div>
            <div className="text-sm"><b>Name:</b> {s.student_name}</div>
            <div className="text-sm"><b>Class:</b> {filters.className} {filters.section && `(${filters.section})`} &nbsp; <b>Roll:</b> {s.roll}</div>
          </div>
        ))}
        {!students.length && <div className="col-span-2 text-sm text-muted-foreground">No students found for the selected filters.</div>}
      </div>
    </div>
  );
};

// ============= Tab: Teacher Duty Roster =============
interface DutyRow { room: string; teachers: string; subject: string; count: string }
const TeacherDutyTab = ({ school, filters }: any) => {
  const [dutyDate, setDutyDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<DutyRow[]>([
    { room: "", teachers: "", subject: "", count: "" },
    { room: "", teachers: "", subject: "", count: "" },
    { room: "", teachers: "", subject: "", count: "" },
    { room: "", teachers: "", subject: "", count: "" },
  ]);

  const updateRow = (i: number, key: keyof DutyRow, v: string) => {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [key]: v } : row));
  };

  const handlePrint = async () => {
    const body = rows.map((r, i) => `
      <tr>
        <td>${r.room || ""}</td>
        <td style="text-align:left">${(r.teachers || "").split(/\n|,/).map((t, ti) => `${ti + 1}) ${t.trim()}`).filter(t => t !== `${t.split(") ")[0]}) `).join("<br/>")}</td>
        <td>${r.subject || ""}</td>
        <td>${r.count || ""}</td>
        <td></td>
      </tr>
    `).join("");

    await printHtmlDocument({
      title: "Exam Room Invigilator List",
      html: `<html><head><title>Invigilator List</title><style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;padding:30px}
        .meta{display:flex;justify-content:space-between;font-size:12px;margin-bottom:14px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #333;padding:10px;font-size:12px;text-align:center;vertical-align:top}
        th{background:#f2f2f2;text-transform:uppercase;font-weight:700}
      </style></head><body>
        ${schoolHeaderHtml(school, `${filters.examTitle || "Examination"} - ${filters.year}<br/>Room Invigilator List (Duty Roster)`)}
        <div class="meta">
          <div><b>Date:</b> ${dutyDate}</div>
          <div><b>Class:</b> ${filters.className}${filters.section ? ` (${filters.section})` : ""}</div>
        </div>
        <table>
          <thead><tr>
            <th style="width:12%">Room No.</th>
            <th style="width:35%">Invigilator's Name</th>
            <th style="width:20%">Subject</th>
            <th style="width:13%">Student Count</th>
            <th style="width:20%">Signature</th>
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
        ${principalBlock(school)}
      </body></html>`,
    });
  };

  return (
    <div className="stat-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Teacher Duty (Invigilator) Roster</h3>
          <p className="text-sm text-muted-foreground">Assign rooms, invigilators, subject & student count for the exam.</p>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={dutyDate} onChange={e => setDutyDate(e.target.value)} className="w-40" />
          <Button onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" /> Print</Button>
        </div>
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left w-24">Room No.</th>
              <th className="p-2 text-left">Invigilator Names (one per line or comma-separated)</th>
              <th className="p-2 text-left w-40">Subject</th>
              <th className="p-2 text-left w-24">Count</th>
              <th className="p-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-1"><Input value={r.room} onChange={e => updateRow(i, "room", e.target.value)} placeholder="106" /></td>
                <td className="p-1"><Input value={r.teachers} onChange={e => updateRow(i, "teachers", e.target.value)} placeholder="Alam, Rashid, Moumi" /></td>
                <td className="p-1"><Input value={r.subject} onChange={e => updateRow(i, "subject", e.target.value)} placeholder="Bangla 1st" /></td>
                <td className="p-1"><Input value={r.count} onChange={e => updateRow(i, "count", e.target.value)} placeholder="57" /></td>
                <td className="p-1 text-center">
                  <button onClick={() => setRows(rs => rs.filter((_, x) => x !== i))} className="text-destructive"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" onClick={() => setRows(r => [...r, { room: "", teachers: "", subject: "", count: "" }])} className="gap-2">
        <Plus className="h-4 w-4" /> Add Row
      </Button>
    </div>
  );
};

// ============= Main Page =============
const ExamToolsPage = () => {
  const { schoolId } = useAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState("admitcard");
  const [showManual, setShowManual] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    year: String(new Date().getFullYear()),
    className: "Play",
    shift: "morning",
    section: "A",
    version: "bangla",
    examTitle: "Summer Semester Examination",
  });

  const { data: school } = useSchool(schoolId);
  const students = useStudents(schoolId, filters);
  const sectionOptions = filters.className ? getSectionsForClass(filters.className) : [];

  if (showManual) {
    return <ManualSheetTab onBack={() => setShowManual(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-navy text-white p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold font-heading uppercase tracking-wide">{t("nav.exam")}</h1>
            <p className="text-xs uppercase tracking-widest text-white/50">Admit Card, Seat Plan, Attendance Sheet, Duty Roster & Manual Sheets</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Exam Title</label>
            <Input className="h-9 bg-white/10 border-white/20 text-white" value={filters.examTitle}
              onChange={e => setFilters(f => ({ ...f, examTitle: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Year</label>
            <Select value={filters.year} onValueChange={v => setFilters(f => ({ ...f, year: v }))}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{ALL_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Class</label>
            <Select value={filters.className} onValueChange={v => setFilters(f => ({ ...f, className: v, section: getSectionsForClass(v)[0] || "" }))}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{ALL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Section</label>
            <Select value={filters.section} onValueChange={v => setFilters(f => ({ ...f, section: v }))}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{sectionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Shift</label>
            <Select value={filters.shift} onValueChange={v => setFilters(f => ({ ...f, shift: v }))}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{ALL_SHIFTS.map(s => <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Version</label>
            <Select value={filters.version} onValueChange={v => setFilters(f => ({ ...f, version: v }))}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{ALL_VERSIONS.map(v => <SelectItem key={v} value={v.toLowerCase()}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1 gap-1">
          <TabsTrigger value="admitcard" className="gap-2 py-2.5"><IdCard className="h-4 w-4" /> Admit Card</TabsTrigger>
          <TabsTrigger value="seatplan" className="gap-2 py-2.5"><LayoutGrid className="h-4 w-4" /> Seat Plan Cards</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2 py-2.5"><ClipboardList className="h-4 w-4" /> Attendance Sheet</TabsTrigger>
          <TabsTrigger value="duty" className="gap-2 py-2.5"><Users2 className="h-4 w-4" /> Teacher Duty</TabsTrigger>
          <TabsTrigger value="manual" onClick={() => setShowManual(true)} className="gap-2 py-2.5"><FileSpreadsheet className="h-4 w-4" /> Manual Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="admitcard" className="mt-4">
          <AdmitCardTab school={school} filters={filters} students={students} />
        </TabsContent>
        <TabsContent value="seatplan" className="mt-4">
          <SeatPlanTab school={school} filters={filters} students={students} />
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
          <AttendanceSheetTab school={school} filters={filters} students={students} />
        </TabsContent>
        <TabsContent value="duty" className="mt-4">
          <TeacherDutyTab school={school} filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExamToolsPage;
