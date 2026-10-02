import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, ShieldCheck, Award, CheckCircle2, FileText, Check } from "lucide-react";
import { format } from "date-fns";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import shikkhaLogo from "@/assets/shikkha-logo.png";
import { printHtmlDocument } from "@/utils/safePrint";

interface Props {
  school: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

import { resolveSchoolLogoUrl } from "@/utils/printImageUtils";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const getFullUrl = (path: string | null, bucket: string) => {
  if (!path) return null;
  if (bucket === "school-logos") return resolveSchoolLogoUrl(path) || null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

const SchoolAgreementDialog = ({ school, open, onOpenChange }: Props) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { appName, appLogoUrl, ownerName, ownerDesignation } = useAppSettings();

  // Build platform logo URL
  const platformLogo = appLogoUrl
    ? (appLogoUrl.startsWith("http") ? appLogoUrl : `${SUPABASE_URL}/storage/v1/object/public/platform-assets/${appLogoUrl}`)
    : shikkhaLogo;

  const { data: ownerSignature } = useQuery({
    queryKey: ["owner-signature"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "owner_signature")
        .maybeSingle();
      return data?.value || null;
    },
  });

  const sigUrl = getFullUrl(ownerSignature, "platform-assets");
  const schoolLogoUrl = school?.school_logo ? getFullUrl(school.school_logo, "school-logos") : null;

  const agreementDate = format(new Date(), "dd MMMM, yyyy");
  const agreementRef = `AGR-${(school?.school_code || school?.id?.slice(0, 8) || "SCH").toUpperCase()}-${new Date().getFullYear()}`;

  const modules = [
    { title: "Student Information System (SIS)", desc: "Enrollment, profiles, roll numbers & batch tracking" },
    { title: "Faculty & Staff Management", desc: "Teacher credentials, subject allocations & staff logs" },
    { title: "Academic & Exam Processing", desc: "Exam control, GPA/grading algorithms & marksheet generation" },
    { title: "Fees & Digital Accounts", desc: "Automated student invoicing, fee receipts & dues reports" },
    { title: "Daily Attendance & Tracking", desc: "Classroom roll-call attendance, absentees list & analytics" },
    { title: "Notice Board & Communications", desc: "Targeted circulars, broadcast bulletins & parent updates" },
    { title: "Homework & Academic Tasks", desc: "Subject-wise assignment submissions & evaluation records" },
    { title: "Analytical Reports & Exports", desc: "Institutional summaries, tabular spreadsheets & printable docs" },
  ];

  const handlePrint = async () => {
    const content = printRef.current;
    if (!content || !school) return;

    await printHtmlDocument({
      title: `Agreement - ${school.school_name}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Service Agreement - ${school.school_name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #fff; line-height: 1.45; }
    
    .no-print { display: none !important; }
    .page-container { width: 100%; margin: 0 auto; }

    .agreement-sheet {
      box-sizing: border-box;
      border: 2px solid #0f172a;
      border-radius: 6px;
      padding: 16px 20px;
      background: #ffffff;
      margin-bottom: 24px;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
    }
    
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print { display: none !important; }
      .page-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .agreement-sheet {
        box-sizing: border-box !important;
        border: 2px solid #0f172a !important;
        border-radius: 6px !important;
        padding: 14px 18px !important;
        margin: 0 !important;
        background: #ffffff !important;
        height: 258mm !important;
        max-height: 258mm !important;
        min-height: 258mm !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: always !important;
        break-after: page !important;
        -webkit-box-decoration-break: clone !important;
        box-decoration-break: clone !important;
      }
      .agreement-sheet:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  </style>
</head>
<body>
  ${content.innerHTML}
</body>
</html>`,
    });
  };

  if (!school) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border border-border/80 shadow-2xl">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base font-semibold">Institutional Service Agreement & License</DialogTitle>
          </div>
          <Button size="sm" onClick={handlePrint} className="gap-1.5 shadow-sm">
            <Printer className="h-4 w-4" /> Print / Download Agreement
          </Button>
        </DialogHeader>

        <div ref={printRef} className="px-6 py-6 text-slate-800 bg-slate-100/60 dark:bg-slate-900/40">
          <div className="page-container" style={{ maxWidth: 840, margin: "0 auto" }}>
            
            {/* ======================================================== */}
            {/* PAGE 1: INSTITUTION DETAILS, LICENSING & CORE MODULES   */}
            {/* ======================================================== */}
            <div className="agreement-sheet" style={{
              border: "2px solid #0f172a",
              borderRadius: 8,
              padding: "24px 28px",
              background: "#ffffff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              position: "relative",
              minHeight: 880,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                {/* Security Header Watermark Bar */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "2px solid #0f172a",
                  paddingBottom: 14,
                  marginBottom: 16,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={platformLogo}
                      alt={appName}
                      style={{
                        height: 48,
                        width: 48,
                        objectFit: "contain",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        padding: 3,
                        background: "#fff",
                      }}
                      onError={(e) => { (e.target as HTMLImageElement).src = shikkhaLogo; }}
                    />
                    <div>
                      <h1 style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#0f172a",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        lineHeight: 1.1,
                      }}>
                        {appName}
                      </h1>
                      <p style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#0284c7",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        marginTop: 2,
                      }}>
                        Cloud School Management & Institutional Licensing
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      background: "#0f172a",
                      color: "#ffffff",
                      fontSize: 9,
                      fontWeight: 700,
                      borderRadius: 3,
                      letterSpacing: "0.5px",
                    }}>
                      OFFICIAL CONTRACT
                    </div>
                    <div style={{ fontSize: 9.5, color: "#475569", fontWeight: 600, marginTop: 3 }}>
                      Ref: <strong style={{ color: "#0f172a" }}>{agreementRef}</strong>
                    </div>
                    <div style={{ fontSize: 9, color: "#64748b", marginTop: 1 }}>
                      Executed: <strong>{agreementDate}</strong>
                    </div>
                  </div>
                </div>

                {/* Title Section */}
                <div style={{
                  textAlign: "center",
                  padding: "10px 14px",
                  marginBottom: 16,
                  background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                }}>
                  <h2 style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}>
                    Master Institutional Service Agreement & Software License
                  </h2>
                  <p style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
                    Legally Binding Educational Technology & Cloud Management Service Contract
                  </p>
                </div>

                {/* Preamble / Parties */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 16,
                }}>
                  {/* First Party (Platform Provider) */}
                  <div style={{
                    border: "1px solid #bfdbfe",
                    background: "#eff6ff",
                    borderRadius: 6,
                    padding: "10px 12px",
                  }}>
                    <div style={{
                      fontSize: 8.5,
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      color: "#1d4ed8",
                      marginBottom: 4,
                    }}>
                      FIRST PARTY (SERVICE PROVIDER & PLATFORM AUTHORITY)
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                      {appName} Platform Authority
                    </div>
                    <div style={{ fontSize: 10.5, color: "#334155", marginTop: 2 }}>
                      Authorized Signatory: <strong>{ownerName}</strong>
                    </div>
                    <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 1 }}>
                      Role: {ownerDesignation}
                    </div>
                    <div style={{ fontSize: 9.5, color: "#0284c7", marginTop: 2, fontWeight: 600 }}>
                      Status: Verified Central Platform Licensor
                    </div>
                  </div>

                  {/* Second Party (Institution) */}
                  <div style={{
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    borderRadius: 6,
                    padding: "10px 12px",
                  }}>
                    <div style={{
                      fontSize: 8.5,
                      fontWeight: 800,
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      color: "#334155",
                      marginBottom: 4,
                    }}>
                      SECOND PARTY (LICENSED EDUCATIONAL INSTITUTION)
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                      {school.school_name}
                    </div>
                    <div style={{ fontSize: 10.5, color: "#334155", marginTop: 2 }}>
                      Admin / Head: <strong>{school.principal_name || school.admin_name || "Head of Institution"}</strong>
                    </div>
                    <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 1 }}>
                      EIIN: {school.eiin || "N/A"} • Code: {school.school_code || "N/A"}
                    </div>
                    <div style={{ fontSize: 9.5, color: "#059669", marginTop: 2, fontWeight: 600 }}>
                      Status: Verified Institutional Licensee
                    </div>
                  </div>
                </div>

                {/* Section 1: Institution Particulars */}
                <div style={{ marginBottom: 14 }}>
                  <SectionHeader num="01" title="Institutional Registration & Administrative Particulars" />
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                    <tbody>
                      {[
                        [
                          { label: "Institution Name", value: school.school_name },
                          { label: "School EIIN", value: school.eiin || "Not Specified" },
                        ],
                        [
                          { label: "Institutional Code", value: school.school_code || "N/A" },
                          { label: "Established Year", value: school.established_year || "N/A" },
                        ],
                        [
                          { label: "Principal / Head", value: school.principal_name || "N/A" },
                          { label: "Account Administrator", value: school.admin_name || "N/A" },
                        ],
                        [
                          { label: "Institutional Email", value: school.school_email || school.admin_email || "N/A" },
                          { label: "Contact Hotline", value: school.school_phone || "N/A" },
                        ],
                        [
                          { label: "Campus Address", value: school.school_address || "Registered Campus", colSpan: 3 },
                        ],
                      ].map((row, rIdx) => (
                        <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? "#f8fafc" : "#ffffff" }}>
                          {row.map((col: any, cIdx) => (
                            col.colSpan ? (
                              <td key={cIdx} colSpan={col.colSpan + 1} style={{ padding: "5px 10px", border: "1px solid #e2e8f0" }}>
                                <span style={{ color: "#64748b", fontWeight: 600, marginRight: 8 }}>{col.label}:</span>
                                <strong style={{ color: "#0f172a" }}>{col.value}</strong>
                              </td>
                            ) : (
                              <td key={cIdx} style={{ padding: "5px 10px", border: "1px solid #e2e8f0", width: "50%" }}>
                                <span style={{ color: "#64748b", fontWeight: 600, marginRight: 6 }}>{col.label}:</span>
                                <strong style={{ color: "#0f172a" }}>{col.value}</strong>
                              </td>
                            )
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section 2: Plan & Capacity Allocation */}
                <div style={{ marginBottom: 14 }}>
                  <SectionHeader num="02" title="Software Licensing & Capacity Entitlements" />
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                    <thead>
                      <tr style={{ background: "#0f172a", color: "#ffffff" }}>
                        <th style={{ padding: "6px 10px", textAlign: "left", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px" }}>License Tier</th>
                        <th style={{ padding: "6px 10px", textAlign: "center", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px" }}>Authorized Student Quota</th>
                        <th style={{ padding: "6px 10px", textAlign: "center", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px" }}>Faculty & Staff Seats</th>
                        <th style={{ padding: "6px 10px", textAlign: "center", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px" }}>Student Portal</th>
                        <th style={{ padding: "6px 10px", textAlign: "center", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px" }}>Teacher Portal</th>
                        <th style={{ padding: "6px 10px", textAlign: "right", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.5px" }}>Account State</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: "#ffffff" }}>
                        <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", fontWeight: 700, color: "#1d4ed8" }}>
                          {(school.plan_name || "Standard").toUpperCase()} EDITION
                        </td>
                        <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", textAlign: "center", fontWeight: 700, color: "#0f172a" }}>
                          {school.max_students ?? 1000} Active Students
                        </td>
                        <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", textAlign: "center", fontWeight: 700, color: "#0f172a" }}>
                          {school.max_teachers ?? 100} Staff Members
                        </td>
                        <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", textAlign: "center", fontWeight: 700, color: school.student_login_enabled ? "#059669" : "#dc2626" }}>
                          {school.student_login_enabled ? "✓ Enabled" : "✕ Disabled"}
                        </td>
                        <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", textAlign: "center", fontWeight: 700, color: school.teacher_login_enabled ? "#059669" : "#dc2626" }}>
                          {school.teacher_login_enabled ? "✓ Enabled" : "✕ Disabled"}
                        </td>
                        <td style={{ padding: "6px 10px", border: "1px solid #e2e8f0", textAlign: "right", fontWeight: 700, color: school.is_active ? "#059669" : "#dc2626" }}>
                          {school.is_active ? "● ACTIVE & LICENSED" : "● SUSPENDED"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 3: Licensed Modules */}
                <div style={{ marginBottom: 10 }}>
                  <SectionHeader num="03" title="Scope of Integrated Management Modules" />
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "5px 10px",
                  }}>
                    {modules.map((m, idx) => (
                      <div key={idx} style={{
                        padding: "5px 8px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                      }}>
                        <div style={{
                          marginTop: 2,
                          height: 13,
                          width: 13,
                          borderRadius: "50%",
                          background: "#dbeafe",
                          color: "#1d4ed8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 8.5,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}>
                          ✓
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#0f172a" }}>{m.title}</div>
                          <div style={{ fontSize: 8.5, color: "#64748b" }}>{m.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Page 1 Footer */}
              <div style={{
                textAlign: "center",
                marginTop: 14,
                paddingTop: 8,
                borderTop: "1px dashed #cbd5e1",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div style={{ fontSize: 8, color: "#64748b", letterSpacing: "0.5px" }}>
                  SYSTEM GENERATED LEGAL INSTRUMENT • LICENSED UNDER {appName.toUpperCase()} ENTERPRISE POLICY
                </div>
                <div style={{ fontSize: 8, color: "#0284c7", fontWeight: 700, letterSpacing: "1px" }}>
                  PAGE 1 OF 2 • INSTITUTIONAL RECORD
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* ON-SCREEN PAGE DIVIDER (VISIBLE ONLY ON SCREEN)          */}
            {/* ======================================================== */}
            <div className="no-print my-6 flex items-center justify-center gap-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <span className="h-px bg-border flex-1" />
              <span className="px-3 py-1 bg-background border border-border rounded-full shadow-sm text-foreground/80">
                Page 2 of 2 • Legal Terms, SLA & Execution
              </span>
              <span className="h-px bg-border flex-1" />
            </div>

            {/* ======================================================== */}
            {/* PAGE 2: LEGAL TERMS, SLA & DUAL AUTHORIZATION SIGNATURES */}
            {/* ======================================================== */}
            <div className="agreement-sheet" style={{
              border: "2px solid #0f172a",
              borderRadius: 8,
              padding: "24px 28px",
              background: "#ffffff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              position: "relative",
              minHeight: 880,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}>
              <div>
                {/* Page 2 Continuation Header */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1.5px solid #0f172a",
                  paddingBottom: 10,
                  marginBottom: 16,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img
                      src={platformLogo}
                      alt={appName}
                      style={{
                        height: 36,
                        width: 36,
                        objectFit: "contain",
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        padding: 2,
                        background: "#fff",
                      }}
                      onError={(e) => { (e.target as HTMLImageElement).src = shikkhaLogo; }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textTransform: "uppercase" }}>
                        {appName} • Institutional Service Agreement
                      </div>
                      <div style={{ fontSize: 9.5, color: "#0284c7", fontWeight: 600 }}>
                        Legal Terms, Cloud Sovereignty & Dual Signatory Execution
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: "#0f172a" }}>
                      Ref: {agreementRef}
                    </div>
                    <div style={{ fontSize: 8.5, color: "#64748b" }}>
                      Licensee: <strong>{school.school_name}</strong>
                    </div>
                  </div>
                </div>

                {/* Section 4: Terms of Service & SLA */}
                <div style={{ marginBottom: 16 }}>
                  <SectionHeader num="04" title="Standard Legal Terms, Data Privacy & SLA" />
                  <div style={{
                    fontSize: 9.5,
                    color: "#334155",
                    lineHeight: 1.5,
                    background: "#f8fafc",
                    padding: "12px 14px",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                  }}>
                    <ol style={{ paddingLeft: 16, margin: 0 }}>
                      <li style={{ marginBottom: 6 }}>
                        <strong>Data Ownership & Institutional Sovereignty:</strong> All educational, student, teacher, marksheet, and financial ledger data stored in the {appName} platform remains the 100% exclusive intellectual property of {school.school_name}. The platform authority acts strictly as a secure data processor.
                      </li>
                      <li style={{ marginBottom: 6 }}>
                        <strong>Privacy & Cloud Security Standards:</strong> {appName} guarantees automated backups, industry-standard 256-bit encryption, and strict database isolation. No student or faculty records shall ever be sold, monetized, or shared with third parties without explicit legal consent.
                      </li>
                      <li style={{ marginBottom: 6 }}>
                        <strong>Service Level Agreement (SLA):</strong> The platform guarantees an operational uptime target of 99.9% with scheduled off-peak maintenance notices. Emergency technical support and troubleshooting assistance are provided during official school working hours.
                      </li>
                      <li>
                        <strong>Validity, Termination & Portability:</strong> This bilateral service agreement remains fully valid during the institutional subscription term. Either party may terminate with 30 days prior written notice, upon which full database backup archives will be provided for seamless migration.
                      </li>
                    </ol>
                  </div>
                </div>

                {/* Section 5: Institutional Cloud Guarantees */}
                <div style={{ marginBottom: 18 }}>
                  <SectionHeader num="05" title="Cloud Infrastructure, Security & Compliance Standards" />
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 10,
                  }}>
                    <div style={{
                      padding: "10px 12px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", marginBottom: 3 }}>
                        🛡️ 99.9% Cloud Uptime
                      </div>
                      <div style={{ fontSize: 8.5, color: "#15803d", lineHeight: 1.4 }}>
                        Distributed high-availability hosting with automated failover and zero-data-loss architecture.
                      </div>
                    </div>

                    <div style={{
                      padding: "10px 12px",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", marginBottom: 3 }}>
                        🔒 Enterprise Isolation
                      </div>
                      <div style={{ fontSize: 8.5, color: "#1d4ed8", lineHeight: 1.4 }}>
                        Multi-tenant security boundaries protecting student identities, financials, and transcripts.
                      </div>
                    </div>

                    <div style={{
                      padding: "10px 12px",
                      background: "#fdf4ff",
                      border: "1px solid #f5d0fe",
                      borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#86198f", marginBottom: 3 }}>
                        💾 Automated Backups
                      </div>
                      <div style={{ fontSize: 8.5, color: "#a21caf", lineHeight: 1.4 }}>
                        Continuous daily snapshots with on-demand CSV and Excel tabular data exports for administrators.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dual Signature & Seal Authorization Section */}
                <div style={{
                  marginTop: 16,
                  paddingTop: 14,
                  borderTop: "1.5px solid #0f172a",
                }}>
                  <div style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    color: "#0f172a",
                    marginBottom: 10,
                  }}>
                    Dual Signature & Official Authorization
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 20,
                  }}>
                    
                    {/* FIRST PARTY: App Owner Signature */}
                    <div style={{
                      border: "1px solid #bfdbfe",
                      background: "#f0f9ff",
                      borderRadius: 6,
                      padding: "12px 14px",
                      position: "relative",
                    }}>
                      <div style={{
                        fontSize: 8.5,
                        fontWeight: 800,
                        letterSpacing: "0.5px",
                        color: "#0284c7",
                        textTransform: "uppercase",
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}>
                        <span>FIRST PARTY AUTHORIZATION</span>
                        {sigUrl ? (
                          <span style={{
                            background: "#0284c7",
                            color: "#ffffff",
                            fontSize: 7.5,
                            padding: "1px 6px",
                            borderRadius: 3,
                            fontWeight: 700,
                          }}>
                            DIGITALLY CERTIFIED
                          </span>
                        ) : (
                          <span style={{
                            background: "#f1f5f9",
                            color: "#64748b",
                            fontSize: 7.5,
                            padding: "1px 6px",
                            borderRadius: 3,
                            fontWeight: 700,
                            border: "1px solid #cbd5e1",
                          }}>
                            AWAITING SIGNATURE
                          </span>
                        )}
                      </div>

                      {/* Signature Image or Empty Signature Space */}
                      <div style={{
                        height: 52,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 8,
                      }}>
                        {sigUrl ? (
                          <img
                            src={sigUrl}
                            alt="Owner Signature"
                            style={{
                              maxHeight: 46,
                              maxWidth: 180,
                              objectFit: "contain",
                            }}
                          />
                        ) : (
                          <div style={{
                            fontSize: 9.5,
                            color: "#94a3b8",
                            fontStyle: "italic",
                            borderBottom: "1px dashed #cbd5e1",
                            paddingBottom: 4,
                            width: "100%",
                            textAlign: "center",
                          }}>
                            [ Authorized Signature & Seal ]
                          </div>
                        )}
                      </div>

                      <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>
                          {ownerName || "Ridoy Khan"}
                        </div>
                        <div style={{ fontSize: 9, color: "#0284c7", fontWeight: 600 }}>
                          {ownerDesignation || "Platform Director & Authorized Authority"}
                        </div>
                        <div style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>
                          {appName} Central Authority • {agreementDate}
                        </div>
                      </div>
                    </div>

                    {/* SECOND PARTY: School Principal / Authority Signature */}
                    <div style={{
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      borderRadius: 6,
                      padding: "12px 14px",
                      position: "relative",
                    }}>
                      <div style={{
                        fontSize: 8.5,
                        fontWeight: 800,
                        letterSpacing: "0.5px",
                        color: "#475569",
                        textTransform: "uppercase",
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}>
                        <span>SECOND PARTY ACCEPTANCE</span>
                        <span style={{
                          background: "#f1f5f9",
                          color: "#475569",
                          fontSize: 7.5,
                          padding: "1px 6px",
                          borderRadius: 3,
                          fontWeight: 700,
                          border: "1px solid #cbd5e1",
                        }}>
                          INSTITUTION SEAL
                        </span>
                      </div>

                      {/* Empty signature space for Principal */}
                      <div style={{
                        height: 52,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 8,
                      }}>
                        <span style={{ fontSize: 9.5, color: "#94a3b8", fontStyle: "italic", borderBottom: "1px dashed #cbd5e1", paddingBottom: 4, width: "100%", textAlign: "center" }}>
                          [ Authorized Signature & Official Seal ]
                        </span>
                      </div>

                      <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: 6 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#0f172a" }}>
                          {school.principal_name || school.admin_name || "Head of Institution"}
                        </div>
                        <div style={{ fontSize: 9, color: "#475569", fontWeight: 600 }}>
                          Principal / Authorized Signatory
                        </div>
                        <div style={{ fontSize: 8, color: "#64748b", marginTop: 2 }}>
                          {school.school_name}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Page 2 Footer */}
              <div style={{
                textAlign: "center",
                marginTop: 14,
                paddingTop: 8,
                borderTop: "1px dashed #cbd5e1",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div style={{ fontSize: 8, color: "#64748b", letterSpacing: "0.5px" }}>
                  SYSTEM GENERATED LEGAL INSTRUMENT • LICENSED UNDER {appName.toUpperCase()} ENTERPRISE POLICY
                </div>
                <div style={{ fontSize: 8, color: "#0284c7", fontWeight: 700, letterSpacing: "1px" }}>
                  PAGE 2 OF 2 • EXECUTED & CERTIFIED
                </div>
              </div>
            </div>

          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {sigUrl ? (
              <>Signed by <strong>{ownerName}</strong> ({ownerDesignation})</>
            ) : (
              <>Platform Authority: <strong>{ownerName}</strong> ({ownerDesignation})</>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handlePrint} className="gap-1.5 shadow-sm">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SectionHeader = ({ num, title }: { num: string; title: string }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    borderBottom: "1.5px solid #0f172a",
    paddingBottom: 4,
  }}>
    <span style={{
      background: "#0f172a",
      color: "#ffffff",
      fontSize: 9,
      fontWeight: 800,
      padding: "1px 5px",
      borderRadius: 3,
    }}>
      {num}
    </span>
    <span style={{
      fontSize: 11,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      color: "#0f172a",
    }}>
      {title}
    </span>
  </div>
);

export default SchoolAgreementDialog;
