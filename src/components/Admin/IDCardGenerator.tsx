import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Search, Printer, Download, Filter, CheckSquare, Square,
  Layers, Palette, Shield, User, GraduationCap, UserCheck,
  QrCode, RefreshCw, Eye, Sparkles, Check, School as SchoolIcon,
  Phone, Calendar, Droplet, Hash, BookOpen, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTeacherAssignedClasses } from "@/hooks/useTeacherAssignedClasses";
import { resolveSchoolLogoUrl, resolveSignatureUrl } from "@/utils/printImageUtils";

// Card color themes
const CARD_THEMES = [
  { id: "navy", name: "Royal Navy", primary: "#1e3a8a", secondary: "#3b82f6", accent: "#93c5fd", textLight: "#ffffff", border: "#bfdbfe" },
  { id: "emerald", name: "Emerald Green", primary: "#065f46", secondary: "#10b981", accent: "#a7f3d0", textLight: "#ffffff", border: "#a7f3d0" },
  { id: "crimson", name: "Crimson Maroon", primary: "#831843", secondary: "#f43f5e", accent: "#fecdd3", textLight: "#ffffff", border: "#fecdd3" },
  { id: "amber", name: "Golden Amber", primary: "#78350f", secondary: "#d97706", accent: "#fde68a", textLight: "#ffffff", border: "#fde68a" },
  { id: "purple", name: "Imperial Purple", primary: "#581c87", secondary: "#8b5cf6", accent: "#ddd6fe", textLight: "#ffffff", border: "#ddd6fe" },
  { id: "slate", name: "Modern Dark", primary: "#0f172a", secondary: "#475569", accent: "#cbd5e1", textLight: "#ffffff", border: "#e2e8f0" },
];

// Clean vector SVG QR code representation
const QRVector = ({ value, size = 56, fgColor = "#000000" }: { value: string; size?: number; fgColor?: string }) => {
  // Generate a deterministic pseudo-random QR pattern from the input string
  const hash = value.split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000000, 7);
  const matrixSize = 15;
  const cells: boolean[][] = Array(matrixSize).fill(0).map(() => Array(matrixSize).fill(false));

  // Corner Position Markers (Finder Patterns)
  const drawCorner = (r: number, c: number) => {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (i === 0 || i === 4 || j === 0 || j === 4 || (i >= 1 && i <= 3 && j >= 1 && j <= 3 && (i === 2 && j === 2))) {
          cells[r + i][c + j] = true;
        }
      }
    }
  };
  drawCorner(0, 0);
  drawCorner(0, matrixSize - 5);
  drawCorner(matrixSize - 5, 0);

  // Fill pseudo-data cells
  let seed = hash;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if ((r < 5 && c < 5) || (r < 5 && c >= matrixSize - 5) || (r >= matrixSize - 5 && c < 5)) continue;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      cells[r][c] = seed % 2 === 0;
    }
  }

  const cellSize = size / matrixSize;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 bg-white p-0.5 rounded border border-black/10">
      {cells.map((row, r) =>
        row.map((active, c) =>
          active ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill={fgColor}
            />
          ) : null
        )
      )}
    </svg>
  );
};

// Clean vector Barcode representation
const BarcodeVector = ({ value, height = 24, width = 120 }: { value: string; height?: number; width?: number }) => {
  const hash = value.split("").reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 1000000, 11);
  const bars: number[] = [];
  let seed = hash;
  for (let i = 0; i < 28; i++) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    bars.push((seed % 3) + 1);
  }

  const totalUnits = bars.reduce((a, b) => a + b, 0);
  const unitWidth = width / totalUnits;
  let currentX = 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {bars.map((barWidth, idx) => {
          const isBlack = idx % 2 === 0;
          const x = currentX;
          currentX += barWidth * unitWidth;
          return isBlack ? (
            <rect key={idx} x={x} y={0} width={barWidth * unitWidth} height={height} fill="#0f172a" />
          ) : null;
        })}
      </svg>
      <span className="text-[9px] font-mono tracking-widest text-slate-600 uppercase mt-0.5">{value}</span>
    </div>
  );
};

interface IDCardProps {
  person: any;
  type: "student" | "teacher" | "staff";
  school: any;
  theme: typeof CARD_THEMES[0];
  showBack: boolean;
  options: {
    showQr: boolean;
    showBarcode: boolean;
    showBloodGroup: boolean;
    showEmergencyPhone: boolean;
    showSignature: boolean;
    showAddress: boolean;
    validityYear: string;
    cardTitle?: string;
  };
}

// ==========================================
// SINGLE ID CARD COMPONENT (PORTRAIT & PRINT)
// Standard CR80 Vertical Card (54mm x 86mm ratio)
// ==========================================
const IDCard = ({ person, type, school, theme, showBack, options }: IDCardProps) => {
  const photoUrl = person.photo_url || person.photo || null;
  const name = person.student_name || person.teacher_name || person.staff_name || person.full_name || "Name";
  const idNumber = person.student_id || person.teacher_id_number || person.teacher_id || person.staff_id || person.id?.slice(0, 8) || "ID-001";
  const roll = person.roll || person.roll_number || null;
  const className = person.classes?.class_name || (typeof person.classes === "string" ? person.classes : null);
  const sectionName = person.sections?.section_name || (typeof person.sections === "string" ? person.sections : null);
  const designation = person.designation || person.subject || (type === "teacher" ? "Assistant Teacher" : type === "staff" ? "Staff" : null);
  const department = person.department || person.subject || null;
  const bloodGroup = person.blood_group || null;
  const emergencyPhone = person.guardian_phone || person.phone || school?.school_phone || null;
  const shift = person.classes?.shift || null;
  const version = person.classes?.version || null;

  const initials = (name || "").trim().split(/\s+/).filter(Boolean).map((n: string) => n[0] || "").join("").slice(0, 2).toUpperCase() || "ID";

  const qrData = `${school?.school_name || "School"} | ${name} | ID: ${idNumber} | ${type.toUpperCase()} | Valid: ${options.validityYear}`;

  const schoolLogoUrl = resolveSchoolLogoUrl(school?.school_logo) || null;
  const principalSignatureUrl = resolveSignatureUrl(school?.principal_signature, "signatures") || null;

  const typeLabels = {
    student: "STUDENT IDENTITY CARD",
    teacher: "TEACHER IDENTITY CARD",
    staff: "STAFF IDENTITY CARD",
  };

  const badgeTitle = options.cardTitle || typeLabels[type];

  // FRONT SIDE
  const renderFront = () => (
    <div
      className="id-card-portrait relative w-[240px] h-[360px] bg-white rounded-xl shadow-md overflow-hidden border border-slate-200 flex flex-col select-none text-slate-800"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Top Header with School Branding */}
      <div
        className="relative pt-3 pb-3 px-3 text-center overflow-hidden shrink-0"
        style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)` }}
      >
        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />

        <div className="relative z-10 flex items-center justify-center gap-2">
          {schoolLogoUrl ? (
            <img src={schoolLogoUrl} alt="" className="h-8 w-8 rounded-full object-cover bg-white p-0.5 shadow-sm shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs shrink-0">
              <SchoolIcon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 text-left">
            <h4 className="text-white font-bold text-xs leading-tight line-clamp-1 uppercase tracking-tight">
              {school?.school_name || "SCHOOL NAME"}
            </h4>
            <p className="text-white/80 text-[9px] leading-none line-clamp-1 mt-0.5">
              {school?.school_address || "Bangladesh"}
            </p>
          </div>
        </div>

        {/* Role Banner Ribbon */}
        <div className="mt-2 inline-block bg-white/95 text-slate-900 px-3 py-0.5 rounded-full shadow-sm">
          <span className="text-[9px] font-extrabold tracking-wider" style={{ color: theme.primary }}>
            {badgeTitle}
          </span>
        </div>
      </div>

      {/* Profile Photo and Details */}
      <div className="flex-1 px-3 py-2 flex flex-col items-center justify-between text-center relative z-10">
        {/* Photo with double border */}
        <div className="relative mt-1">
          <Avatar className="h-[74px] w-[74px] ring-3 ring-white shadow-md border-2" style={{ borderColor: theme.secondary }}>
            <AvatarImage src={photoUrl || undefined} className="object-cover" />
            <AvatarFallback
              className="text-lg font-bold text-white"
              style={{ backgroundColor: theme.primary }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          {options.showBloodGroup && bloodGroup && (
            <span
              className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[8px] font-black text-white shadow-sm border border-white"
              style={{ backgroundColor: "#dc2626" }}
              title="Blood Group"
            >
              {bloodGroup}
            </span>
          )}
        </div>

        {/* Person Name & Role */}
        <div className="w-full mt-1">
          <h3 className="font-bold text-slate-900 text-xs line-clamp-1 leading-tight tracking-tight uppercase">
            {name}
          </h3>
          {type === "student" ? (
            <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[10px] font-semibold text-slate-700">
              {className && <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{className}</span>}
              {sectionName && <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Sec: {sectionName}</span>}
              {roll && <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Roll: {roll}</span>}
            </div>
          ) : (
            <p className="text-[10px] font-semibold text-slate-700 line-clamp-1 mt-0.5">
              {designation} {department ? `• ${department}` : ""}
            </p>
          )}
        </div>

        {/* Detailed Grid Info */}
        <div className="w-full bg-slate-50/80 rounded-lg p-1.5 border border-slate-200/80 text-left text-[9px] space-y-0.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">ID Number:</span>
            <span className="font-bold text-slate-900 font-mono">{idNumber}</span>
          </div>
          {type === "student" && (shift || version) && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Shift / Ver:</span>
              <span className="font-semibold text-slate-800 capitalize">{shift || "Morning"} • {version || "Bangla"}</span>
            </div>
          )}
          {options.showEmergencyPhone && emergencyPhone && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Contact:</span>
              <span className="font-semibold text-slate-800">{emergencyPhone}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Session / Valid:</span>
            <span className="font-semibold text-emerald-700">{options.validityYear}</span>
          </div>
        </div>

        {/* Footer: QR Code & Principal Signature */}
        <div className="w-full flex items-end justify-between pt-1 border-t border-slate-100 mt-auto">
          {options.showQr ? (
            <div className="flex flex-col items-center">
              <QRVector value={qrData} size={36} fgColor={theme.primary} />
            </div>
          ) : (
            <div className="text-[8px] text-slate-400 font-mono">EIIN: {school?.eiin || "N/A"}</div>
          )}

          <div className="flex flex-col items-center text-center max-w-[100px]">
            {options.showSignature && (
              <>
                {principalSignatureUrl ? (
                  <img src={principalSignatureUrl} alt="Signature" className="h-6 w-16 object-contain" />
                ) : (
                  <div className="h-5 flex items-end">
                    <span className="font-serif italic text-[9px] text-slate-700 border-b border-slate-400 px-1">
                      Principal
                    </span>
                  </div>
                )}
                <span className="text-[7.5px] font-semibold text-slate-500 uppercase mt-0.5">অধ্যক্ষ / Headmaster</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Color Accent Bar */}
      <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: theme.primary }} />
    </div>
  );

  // BACK SIDE
  const renderBack = () => (
    <div
      className="id-card-portrait relative w-[240px] h-[360px] bg-white rounded-xl shadow-md overflow-hidden border border-slate-200 flex flex-col select-none text-slate-800"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Top Header */}
      <div
        className="py-2.5 px-3 text-center shrink-0"
        style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)` }}
      >
        <h4 className="text-white font-bold text-[10px] tracking-wider uppercase">
          INSTRUCTIONS & TERMS / শর্তাবলী
        </h4>
      </div>

      {/* Instructions list */}
      <div className="flex-1 p-3 flex flex-col justify-between text-left text-[8.5px] text-slate-700 space-y-1.5 leading-relaxed">
        <ul className="list-disc pl-3.5 space-y-1 text-slate-600">
          <li>This card is the property of the institution and must be carried at all times.</li>
          <li>The card is non-transferable. Any alterations make it invalid.</li>
          <li>If lost, report immediately to the administration office.</li>
          <li>If found, please return to the school address below.</li>
        </ul>

        {/* Emergency & School Contact Box */}
        <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-[8.5px] space-y-1">
          <p className="font-bold text-slate-900 text-[9px] border-b border-slate-200 pb-0.5">
            {school?.school_name || "School Office"}
          </p>
          <p className="text-slate-600 line-clamp-2">
            📍 {school?.school_address || "School Campus, Bangladesh"}
          </p>
          <p className="text-slate-600">
            📞 {school?.school_phone || "Contact Authority"}
          </p>
          {school?.school_email && (
            <p className="text-slate-600">
              ✉️ {school.school_email}
            </p>
          )}
        </div>

        {/* Barcode & Return Box */}
        <div className="flex flex-col items-center justify-center pt-1 border-t border-slate-100">
          <BarcodeVector value={idNumber} height={20} width={130} />
          <span className="text-[7.5px] text-slate-400 mt-0.5">School Management System • 2026</span>
        </div>
      </div>

      {/* Bottom Accent */}
      <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: theme.primary }} />
    </div>
  );

  if (showBack) {
    return renderBack();
  }
  return renderFront();
};

// ==========================================
// MAIN ID CARD GENERATOR PAGE FOR ADMIN
// ==========================================
const IDCardGenerator = () => {
  const { schoolId, roles } = useAuth();
  const { t, language } = useLanguage();
  const isBn = language === "bn";

  const [activeTab, setActiveTab] = useState<"student" | "teacher" | "staff">("student");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [selectedThemeId, setSelectedThemeId] = useState("navy");
  const [showSide, setShowSide] = useState<"front" | "back" | "both">("front");
  const [cardsPerPage, setCardsPerPage] = useState<"4" | "8">("8");
  const [validityYear, setValidityYear] = useState("Session 2026");
  const [customTitle, setCustomTitle] = useState("");

  // Toggles
  const [showQr, setShowQr] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showBloodGroup, setShowBloodGroup] = useState(true);
  const [showEmergencyPhone, setShowEmergencyPhone] = useState(true);
  const [showSignature, setShowSignature] = useState(true);

  // Single card preview modal
  const [previewPerson, setPreviewPerson] = useState<any>(null);

  const { assignedClassIds, isRestricted } = useTeacherAssignedClasses();

  // Fetch school details
  const { data: school } = useQuery({
    queryKey: ["school-details-idcard", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data } = await supabase.from("schools").select("*").eq("id", schoolId).maybeSingle();
      return data;
    },
    enabled: !!schoolId,
  });

  // Fetch classes for filter
  const { data: classes = [] } = useQuery({
    queryKey: ["classes-idcard", schoolId, assignedClassIds],
    queryFn: async () => {
      if (!schoolId) return [];
      let query = supabase.from("classes").select("*").eq("school_id", schoolId).order("class_name");
      if (isRestricted && assignedClassIds && assignedClassIds.length > 0) {
        query = query.in("id", assignedClassIds);
      }
      const { data } = await query;
      return (isRestricted && assignedClassIds?.length === 0) ? [] : data || [];
    },
    enabled: !!schoolId,
  });

  // Fetch students
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["students-idcard", schoolId, assignedClassIds],
    queryFn: async () => {
      if (!schoolId) return [];
      if (isRestricted && assignedClassIds?.length === 0) return [];
      let query = supabase
        .from("students")
        .select("*, classes(class_name, shift, version), sections(section_name)")
        .eq("school_id", schoolId)
        .eq("is_active", true);

      if (isRestricted && assignedClassIds && assignedClassIds.length > 0) {
        query = query.in("class_id", assignedClassIds);
      }

      const { data } = await query.order("roll", { ascending: true });
      return data || [];
    },
    enabled: !!schoolId && activeTab === "student",
  });

  // Fetch teachers
  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ["teachers-idcard", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from("teachers")
        .select("*")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("teacher_name", { ascending: true });
      return data || [];
    },
    enabled: !!schoolId && activeTab === "teacher",
  });

  // Fetch staff
  const { data: staffList = [], isLoading: loadingStaff } = useQuery({
    queryKey: ["staff-idcard", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from("staff")
        .select("*")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("staff_name", { ascending: true });
      return data || [];
    },
    enabled: !!schoolId && activeTab === "staff",
  });

  // Filter current list based on tab
  const getFilteredList = () => {
    if (activeTab === "student") {
      return students.filter((s: any) => {
        const matchesSearch =
          s.student_name?.toLowerCase().includes(search.toLowerCase()) ||
          String(s.roll || "").includes(search) ||
          s.student_id?.toLowerCase().includes(search.toLowerCase());
        const matchesClass = classFilter === "all" || s.class_id === classFilter;
        const matchesShift = shiftFilter === "all" || s.classes?.shift === shiftFilter;
        return matchesSearch && matchesClass && matchesShift;
      });
    }
    if (activeTab === "teacher") {
      return teachers.filter((t: any) => {
        return (
          t.teacher_name?.toLowerCase().includes(search.toLowerCase()) ||
          t.designation?.toLowerCase().includes(search.toLowerCase()) ||
          t.phone?.includes(search) ||
          t.teacher_id_number?.toLowerCase().includes(search.toLowerCase())
        );
      });
    }
    if (activeTab === "staff") {
      return staffList.filter((st: any) => {
        return (
          st.staff_name?.toLowerCase().includes(search.toLowerCase()) ||
          st.designation?.toLowerCase().includes(search.toLowerCase()) ||
          st.phone?.includes(search)
        );
      });
    }
    return [];
  };

  const currentList = getFilteredList();
  const selectedTheme = CARD_THEMES.find((t) => t.id === selectedThemeId) || CARD_THEMES[0];

  const handleSelectAll = () => {
    if (selectedIds.length === currentList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentList.map((item: any) => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedPeople = currentList.filter((item: any) => selectedIds.includes(item.id));
  const printItems = selectedPeople.length > 0 ? selectedPeople : currentList.slice(0, 8);

  const cardOptions = {
    showQr,
    showBarcode,
    showBloodGroup,
    showEmergencyPhone,
    showSignature,
    showAddress: true,
    validityYear,
    cardTitle: customTitle || undefined,
  };

  const handlePrint = async () => {
    const printArea = document.getElementById("id-card-printable-area");
    if (printArea) {
      const imgs = Array.from(printArea.querySelectorAll("img"));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 2500);
            const done = () => {
              clearTimeout(timer);
              if ("decode" in img && typeof (img as any).decode === "function") {
                (img as any).decode().then(() => resolve()).catch(() => resolve());
              } else {
                resolve();
              }
            };
            img.onload = done;
            img.onerror = done;
          });
        })
      );
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* Print CSS styles to guarantee flawless PVC/A4 card output */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #id-card-printable-area, #id-card-printable-area * {
            visibility: visible;
          }
          #id-card-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10mm;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .id-card-portrait {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5 no-print">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {isBn ? "আইডি কার্ড জেনারেটর" : "ID Card Generator"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isBn
              ? "শিক্ষার্থী, শিক্ষক ও কর্মচারীদের জন্য প্রফেশনাল পিভিসি স্ট্যান্ডার্ড আইডি কার্ড তৈরি ও প্রিন্ট করুন"
              : "Generate and print professional PVC standard identity cards for students, teachers, and staff"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 shadow-sm font-semibold"
          >
            <Printer className="h-4 w-4" />
            {isBn
              ? `প্রিন্ট করুন (${selectedIds.length > 0 ? selectedIds.length : printItems.length} টি কার্ড)`
              : `Print Cards (${selectedIds.length > 0 ? selectedIds.length : printItems.length})`}
          </Button>
        </div>
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* Left Side: Category Tabs & List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-4">
            {/* Category Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(val: any) => {
                setActiveTab(val);
                setSelectedIds([]);
              }}
            >
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  {isBn ? `শিক্ষার্থী (${students.length})` : `Students (${students.length})`}
                </TabsTrigger>
                <TabsTrigger value="teacher" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  {isBn ? `শিক্ষকবৃন্দ (${teachers.length})` : `Teachers (${teachers.length})`}
                </TabsTrigger>
                <TabsTrigger value="staff" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {isBn ? `কর্মচারী (${staffList.length})` : `Staff (${staffList.length})`}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              <div className="sm:col-span-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    activeTab === "student"
                      ? (isBn ? "নাম, রোল বা আইডি দিয়ে খুঁজুন..." : "Search by name, roll, or ID...")
                      : (isBn ? "নাম বা পদবি দিয়ে খুঁজুন..." : "Search by name or designation...")
                  }
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {activeTab === "student" && (
                <>
                  <div className="sm:col-span-3">
                    <Select value={classFilter} onValueChange={setClassFilter}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={isBn ? "সকল ক্লাস" : "All Classes"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{isBn ? "সকল ক্লাস" : "All Classes"}</SelectItem>
                        {classes.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.class_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-3">
                    <Select value={shiftFilter} onValueChange={setShiftFilter}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder={isBn ? "সকল শিফট" : "All Shifts"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{isBn ? "সকল শিফট" : "All Shifts"}</SelectItem>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Selection Counter & Batch Toggle */}
            <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-8 text-xs flex items-center gap-1.5"
                >
                  {selectedIds.length === currentList.length && currentList.length > 0 ? (
                    <>
                      <CheckSquare className="h-3.5 w-3.5 text-primary" />
                      {isBn ? "সকল আনচেক করুন" : "Deselect All"}
                    </>
                  ) : (
                    <>
                      <Square className="h-3.5 w-3.5 text-muted-foreground" />
                      {isBn ? "সবগুলো নির্বাচন করুন" : "Select All"}
                    </>
                  )}
                </Button>
                <span className="text-muted-foreground font-medium">
                  {isBn
                    ? `${selectedIds.length} জন নির্বাচিত (মোট ${currentList.length})`
                    : `${selectedIds.length} selected (Total ${currentList.length})`}
                </span>
              </div>

              {selectedIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  {isBn ? "ক্লিয়ার করুন" : "Clear Selection"}
                </Button>
              )}
            </div>

            {/* People List Table */}
            <div className="max-h-[380px] overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {currentList.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  {isBn ? "কোনো সদস্য পাওয়া যায়নি" : "No records found"}
                </div>
              ) : (
                currentList.map((person: any) => {
                  const isSelected = selectedIds.includes(person.id);
                  const name = person.student_name || person.teacher_name || person.staff_name || "Name";
                  const subtext =
                    activeTab === "student"
                      ? `${person.classes?.class_name || "No class"} • Roll: ${person.roll || "N/A"} • ID: ${person.student_id || "N/A"}`
                      : `${person.designation || "Staff"} • ${person.phone || "No phone"}`;

                  return (
                    <div
                      key={person.id}
                      onClick={() => toggleSelect(person.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 text-primary">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={person.photo_url || person.photo} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                            {name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{name}</p>
                          <p className="text-xs text-muted-foreground truncate">{subtext}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPerson(person);
                        }}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        {isBn ? "প্রিভিউ" : "Preview"}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Customization Options & Live Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              {isBn ? "কার্ড কাস্টমাইজেশন ও সেটিংস" : "Card Customization & Settings"}
            </h3>

            {/* Theme Colors */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                {isBn ? "কার্ড থিম কালার" : "Theme Color"}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {CARD_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedThemeId(theme.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all ${
                      selectedThemeId === theme.id
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="h-4 w-4 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: theme.primary }} />
                    <span className="truncate text-[11px]">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Side selection */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button
                size="sm"
                variant={showSide === "front" ? "default" : "outline"}
                onClick={() => setShowSide("front")}
                className="h-8 text-xs font-medium"
              >
                {isBn ? "সামনের অংশ" : "Front Side"}
              </Button>
              <Button
                size="sm"
                variant={showSide === "back" ? "default" : "outline"}
                onClick={() => setShowSide("back")}
                className="h-8 text-xs font-medium"
              >
                {isBn ? "পেছনের অংশ" : "Back Side"}
              </Button>
              <Button
                size="sm"
                variant={showSide === "both" ? "default" : "outline"}
                onClick={() => setShowSide("both")}
                className="h-8 text-xs font-medium"
              >
                {isBn ? "উভয় পাশ" : "Both Sides"}
              </Button>
            </div>

            {/* Options Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-border text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{isBn ? "ডিজিটাল QR কোড" : "Digital QR Code"}</span>
                <Switch checked={showQr} onCheckedChange={setShowQr} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{isBn ? "ব্লাড গ্রুপ ব্যাজ" : "Blood Group Badge"}</span>
                <Switch checked={showBloodGroup} onCheckedChange={setShowBloodGroup} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{isBn ? "জরুরি মোবাইল নাম্বার" : "Emergency Contact Phone"}</span>
                <Switch checked={showEmergencyPhone} onCheckedChange={setShowEmergencyPhone} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{isBn ? "অধ্যক্ষের স্বাক্ষর (Signature)" : "Principal Signature"}</span>
                <Switch checked={showSignature} onCheckedChange={setShowSignature} />
              </div>
            </div>

            {/* Validity / Session input */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">{isBn ? "সেশন / মেয়াদ:" : "Session / Validity:"}</Label>
                <Input
                  value={validityYear}
                  onChange={(e) => setValidityYear(e.target.value)}
                  placeholder="Session 2026"
                  className="h-7 text-xs w-36"
                />
              </div>
            </div>

            {/* Live Sample Card Preview */}
            <div className="pt-3 border-t border-border flex flex-col items-center justify-center">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {isBn ? "লাইভ প্রিভিউ (নমুনা)" : "Live Preview (Sample)"}
              </p>
              <div className="scale-90 origin-top shadow-lg rounded-xl">
                {currentList[0] ? (
                  <IDCard
                    person={currentList[0]}
                    type={activeTab}
                    school={school}
                    theme={selectedTheme}
                    showBack={showSide === "back"}
                    options={cardOptions}
                  />
                ) : (
                  <div className="w-[240px] h-[360px] bg-muted/40 rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                    {isBn ? "কোনো সদস্য নেই" : "No records to preview"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          PRINTABLE AREA (A4 Standard Grid)
          Only visible when printing or in print preview
      ========================================== */}
      <div id="id-card-printable-area" className="bg-white p-4 rounded-xl border border-slate-200 mt-6">
        <div className="no-print mb-4 flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {isBn ? "প্রিন্ট প্রিভিউ গ্রিড (A4 শীট)" : "Print Preview Grid (A4 Sheet)"}
            </h3>
            <p className="text-xs text-slate-500">
              {isBn
                ? "প্রিন্ট করার সময় এই কার্ডগুলো স্বয়ংক্রিয়ভাবে A4 কাগজে সুন্দরভাবে সাজানো থাকবে।"
                : "During printing, these cards are automatically aligned for standard A4 sheets."}
            </p>
          </div>
          <Button onClick={handlePrint} size="sm" className="bg-primary text-white font-medium flex items-center gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            {isBn ? "সরাসরি প্রিন্ট করুন" : "Direct Print"}
          </Button>
        </div>

        {/* Multi-card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
          {printItems.map((person: any) => (
            <div key={person.id} className="flex flex-col items-center gap-3">
              {(showSide === "front" || showSide === "both") && (
                <IDCard
                  person={person}
                  type={activeTab}
                  school={school}
                  theme={selectedTheme}
                  showBack={false}
                  options={cardOptions}
                />
              )}
              {(showSide === "back" || showSide === "both") && (
                <IDCard
                  person={person}
                  type={activeTab}
                  school={school}
                  theme={selectedTheme}
                  showBack={true}
                  options={cardOptions}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Single Card Dialog Preview */}
      {previewPerson && (
        <Dialog open={!!previewPerson} onOpenChange={() => setPreviewPerson(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                {isBn ? "আইডি কার্ড প্রিভিউ" : "ID Card Preview"}
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 flex flex-col items-center gap-4">
              <div className="flex gap-4 flex-wrap justify-center">
                <IDCard
                  person={previewPerson}
                  type={activeTab}
                  school={school}
                  theme={selectedTheme}
                  showBack={false}
                  options={cardOptions}
                />
                <IDCard
                  person={previewPerson}
                  type={activeTab}
                  school={school}
                  theme={selectedTheme}
                  showBack={true}
                  options={cardOptions}
                />
              </div>

              <div className="flex gap-2 w-full justify-end pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setPreviewPerson(null)}>
                  {isBn ? "বন্ধ করুন" : "Close"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedIds([previewPerson.id]);
                    setPreviewPerson(null);
                    setTimeout(handlePrint, 250);
                  }}
                  className="bg-primary text-white flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {isBn ? "এই কার্ডটি প্রিন্ট করুন" : "Print This Card"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default IDCardGenerator;
