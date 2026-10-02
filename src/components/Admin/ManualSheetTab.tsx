import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Printer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_CLASSES, ALL_SHIFTS, ALL_VERSIONS, ALL_YEARS, getSectionsForClass, getSubjectNamesForClass, isGroupBasedClass } from "@/utils/subjectConfig";
import { printHtmlDocument } from "@/utils/safePrint";
import { resolveSchoolLogoUrl } from "@/utils/printImageUtils";

interface Props {
  onBack: () => void;
}

const ManualSheetTab = ({ onBack }: Props) => {
  const { schoolId } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);

  const [year, setYear] = useState("2026");
  const [className, setClassName] = useState("Play");
  const [shift, setShift] = useState("morning");
  const [section, setSection] = useState("A");
  const [version, setVersion] = useState("bangla");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [fullMark, setFullMark] = useState("100");

  const sectionOptions = className ? getSectionsForClass(className) : [];

  // Fetch school info
  const { data: school } = useQuery({
    queryKey: ["school-info", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data } = await supabase.from("schools").select("*").eq("id", schoolId).single();
      return data;
    },
    enabled: !!schoolId,
  });

  // Fetch subject setups
  const { data: subjectSetups = [] } = useQuery({
    queryKey: ["subject-setups", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("subject_setups").select("*").eq("school_id", schoolId);
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Fetch DB classes & sections for ID resolution
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

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ["students-manual", schoolId, className, section, shift, version, year],
    queryFn: async () => {
      if (!schoolId || !className) return [];
      const matchingClasses = dbClasses.filter((c: any) => {
        let match = c.class_name === className;
        if (shift) match = match && c.shift === shift;
        if (version) match = match && c.version === version;
        if (year) match = match && c.academic_year === Number(year);
        return match;
      });
      const classIds = matchingClasses.map((c: any) => c.id);
      if (classIds.length === 0) return [];

      let query = supabase.from("students").select("*")
        .eq("school_id", schoolId).eq("is_active", true).in("class_id", classIds);

      if (section) {
        const matchingSections = dbSections.filter((s: any) => s.section_name === section && classIds.includes(s.class_id));
        const sectionIds = matchingSections.map((s: any) => s.id);
        if (sectionIds.length > 0) {
          query = query.in("section_id", sectionIds);
        } else {
          return [];
        }
      }

      const { data } = await query.order("roll");
      return data || [];
    },
    enabled: !!schoolId && !!className,
  });

  const selectedSubjectSetup = subjectSetups.find((s: any) => s.id === selectedSubject) as any;

  // Curriculum subjects for selected class + section
  const curriculumSubjects = useMemo(() => {
    if (!className) return [];
    const sec = isGroupBasedClass(className) ? section : undefined;
    return getSubjectNamesForClass(className, sec);
  }, [className, section]);

  const subjectOptions = useMemo(() => {
    const fromSetups = subjectSetups.filter((s: any) => {
      const arr: string[] = s.classes || [];
      return arr.some((c: string) => c.toLowerCase() === className.toLowerCase());
    });
    if (fromSetups.length > 0) return fromSetups.map((s: any) => ({ id: s.id, name: s.subject_name }));
    return curriculumSubjects.map(name => ({ id: `cur_${name}`, name }));
  }, [subjectSetups, className, curriculumSubjects]);

  const subjectName = selectedSubjectSetup?.subject_name || subjectOptions.find(s => s.id === selectedSubject)?.name || "—";
  const showPractical = selectedSubjectSetup?.practical_enabled;

  const handlePrint = async () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;

    await printHtmlDocument({
      title: "Manual Marks Entry Sheet",
      html: `
        <html><head><title>Manual Marks Entry Sheet</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a2e; }
          .sheet { max-width: 900px; margin: auto; border: 2px solid #e0e0e0; border-radius: 8px; padding: 30px; }
          .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
          .header-left { display: flex; align-items: center; gap: 15px; }
          .school-logo { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; }
          .school-name { font-size: 22px; font-weight: 800; text-transform: uppercase; }
          .school-details { font-size: 11px; color: #666; }
          .eiin-badge { background: #1a1a2e; color: white; padding: 6px 16px; border-radius: 6px; font-weight: 700; font-size: 13px; }
          .exam-title { text-align: center; font-size: 18px; font-weight: 800; margin: 20px 0 15px; text-transform: uppercase; }
          .info-row { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; border: 1.5px solid #333; margin-bottom: 20px; }
          .info-cell { padding: 8px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; border-right: 1.5px solid #333; }
          .info-cell:last-child { border-right: none; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: center; font-size: 12px; }
          th { background: #f8f9fa; font-weight: 700; text-transform: uppercase; color: #1a1a2e; letter-spacing: 0.5px; }
          td.name { text-align: left; font-weight: 500; }
          td.roll { color: #3b82f6; font-weight: 600; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 30px; }
          .sig-block { text-align: center; }
          .sig-line { width: 150px; border-top: 1.5px solid #333; margin-bottom: 5px; }
          .sig-label { font-size: 12px; font-weight: 700; text-transform: uppercase; }
          @media print { body { padding: 10px; } .sheet { border: none; } }
        </style></head><body>${printContent}</body></html>
      `,
    });
  };

  return (
    <div className="space-y-0">
      {/* Dark Header */}
      <div className="bg-navy text-white p-6 rounded-b-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold font-heading uppercase tracking-wide">Manual Marks Entry Sheet</h1>
              <p className="text-xs uppercase tracking-widest text-white/50">Print Sheets for Manual Recording</p>
            </div>
          </div>
          <Button onClick={handlePrint} className="gap-2 bg-primary hover:bg-primary/90 text-white border-0">
            <Printer className="h-4 w-4" /> Print Sheets
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Year</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Class</label>
            <Select value={className} onValueChange={v => { setClassName(v); setSection(getSectionsForClass(v)[0] || ""); }}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Shift</label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_SHIFTS.map(s => <SelectItem key={s} value={s.toLowerCase()}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Section</label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sectionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Version</label>
            <Select value={version} onValueChange={setVersion}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_VERSIONS.map(v => <SelectItem key={v} value={v.toLowerCase()}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Subject</label>
            <Select value={selectedSubject || "none"} onValueChange={v => setSelectedSubject(v === "none" ? "" : v)}>
              <SelectTrigger className="h-9 bg-white/10 border-white/20 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select</SelectItem>
                {subjectOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Full Mark</label>
            <Input className="h-9 bg-white/10 border-white/20 text-white" value={fullMark}
              onChange={e => setFullMark(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Print Preview */}
      <div className="p-6">
        <div className="stat-card p-8" ref={printRef}>
          <div className="sheet">
            {/* School Header */}
            <div className="header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                {school?.school_logo && (
                  <img src={resolveSchoolLogoUrl(school.school_logo)} alt="Logo" className="school-logo" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "contain" as const }} />
                )}
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, textTransform: "uppercase" as const }}>{school?.school_name || "School Name"}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>
                    {school?.school_address || ""}
                    {school?.school_phone && <><br />Phone: {school.school_phone}</>}
                    {school?.school_email && <> | Email: {school.school_email}</>}
                  </div>
                </div>
              </div>
              {school?.eiin && (
                <div style={{ background: "#1a1a2e", color: "white", padding: "6px 16px", borderRadius: 6, fontWeight: 700, fontSize: 13 }}>
                  EIIN: {school.eiin}
                </div>
              )}
            </div>

            {/* Exam Title */}
            <div style={{ textAlign: "center" as const, fontSize: 18, fontWeight: 800, margin: "20px 0 15px", textTransform: "uppercase" as const }}>
              Marks Entry : Exam - {year}
            </div>

            {/* Info Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", border: "1.5px solid #333", marginBottom: 20 }}>
              <div style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, borderRight: "1.5px solid #333" }}>
                Subject : {subjectName}
              </div>
              <div style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, borderRight: "1.5px solid #333" }}>
                Medium : {version.charAt(0).toUpperCase() + version.slice(1)}
              </div>
              <div style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, borderRight: "1.5px solid #333" }}>
                Class : {className} ({section})
              </div>
              <div style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const }}>
                Full Mark : {fullMark}
              </div>
            </div>

            {/* Students Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" as const, marginBottom: 30 }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ccc", padding: "8px 10px", background: "#f8f9fa", fontWeight: 700, textTransform: "uppercase" as const, fontSize: 12, width: 40 }}>Sl</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px 10px", background: "#f8f9fa", fontWeight: 700, textTransform: "uppercase" as const, fontSize: 12, textAlign: "left" as const }}>Student</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px 10px", background: "#f8f9fa", fontWeight: 700, textTransform: "uppercase" as const, fontSize: 12, width: 60 }}>Roll</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px 10px", background: "#f8f9fa", fontWeight: 700, textTransform: "uppercase" as const, fontSize: 12, width: 70 }}>MCQ</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px 10px", background: "#f8f9fa", fontWeight: 700, textTransform: "uppercase" as const, fontSize: 12, width: 80 }}>Written</th>
                  {showPractical && (
                    <th style={{ border: "1px solid #ccc", padding: "8px 10px", background: "#f8f9fa", fontWeight: 700, textTransform: "uppercase" as const, fontSize: 12, width: 80 }}>Practical</th>
                  )}
                  <th style={{ border: "1px solid #ccc", padding: "8px 10px", background: "#f8f9fa", fontWeight: 700, textTransform: "uppercase" as const, fontSize: 12, width: 90 }}>Attendance</th>
                  <th style={{ border: "1px solid #ccc", padding: "8px 10px", background: "#f8f9fa", fontWeight: 700, textTransform: "uppercase" as const, fontSize: 12, width: 70 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={showPractical ? 8 : 7} style={{ border: "1px solid #ccc", padding: "20px", textAlign: "center" as const, color: "#999" }}>
                      No students found
                    </td>
                  </tr>
                ) : (
                  students.map((s: any, i: number) => (
                    <tr key={s.id}>
                      <td style={{ border: "1px solid #ccc", padding: "8px 10px", textAlign: "center" as const, fontSize: 12 }}>{i + 1}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px 10px", textAlign: "left" as const, fontSize: 12, fontWeight: 500 }}>{s.student_name}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px 10px", textAlign: "center" as const, fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>{s.roll || ""}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px 10px", fontSize: 12 }}></td>
                      <td style={{ border: "1px solid #ccc", padding: "8px 10px", fontSize: 12 }}></td>
                      {showPractical && <td style={{ border: "1px solid #ccc", padding: "8px 10px", fontSize: 12 }}></td>}
                      <td style={{ border: "1px solid #ccc", padding: "8px 10px", fontSize: 12 }}></td>
                      <td style={{ border: "1px solid #ccc", padding: "8px 10px", fontSize: 12 }}></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Signatures */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 50, padding: "0 30px" }}>
              <div style={{ textAlign: "center" as const }}>
                <div style={{ width: 150, borderTop: "1.5px solid #333", marginBottom: 5 }}></div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const }}>Teacher</div>
              </div>
              <div style={{ textAlign: "center" as const }}>
                {school?.principal_signature && (
                  <img src={school.principal_signature} alt="Signature" style={{ height: 40, marginBottom: 5 }} />
                )}
                <div style={{ width: 150, borderTop: "1.5px solid #333", marginBottom: 5 }}></div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const }}>Principal</div>
              </div>
              <div style={{ textAlign: "center" as const }}>
                <div style={{ width: 150, borderTop: "1.5px solid #333", marginBottom: 5 }}></div>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const }}>Date</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualSheetTab;
