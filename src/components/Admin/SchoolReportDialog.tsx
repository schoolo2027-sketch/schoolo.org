import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import shikkhaLogo from "@/assets/shikkha-logo.png";
import { printHtmlDocument } from "@/utils/safePrint";

interface Props {
  school: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const getOwnerSignatureUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/platform-assets/${path}`;
};

import { resolveSchoolLogoUrl } from "@/utils/printImageUtils";

const getLogoUrl = (path: string | null) => {
  return resolveSchoolLogoUrl(path) || null;
};

const SchoolReportDialog = ({ school, open, onOpenChange }: Props) => {
  const printRef = useRef<HTMLDivElement>(null);
  const { appName, appLogoUrl } = useAppSettings();
  const platformLogo = appLogoUrl || shikkhaLogo;

  const { data: stats } = useQuery({
    queryKey: ["school-report", school?.id],
    queryFn: async () => {
      const [students, teachers, classes, activeStudents, activeTeachers, staff] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", school.id),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", school.id),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", school.id),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("is_active", true),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("is_active", true),
        supabase.from("staff").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("is_active", true),
      ]);
      return {
        totalStudents: students.count || 0,
        totalTeachers: teachers.count || 0,
        activeClasses: classes.count || 0,
        activeStudents: activeStudents.count || 0,
        activeTeachers: activeTeachers.count || 0,
        activeStaff: staff.count || 0,
      };
    },
    enabled: !!school?.id,
  });

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

  if (!school) return null;

  const handlePrint = async () => {
    const content = printRef.current;
    if (!content) return;

    await printHtmlDocument({
      title: `Report - ${school.school_name}`,
      html: `
        <html><head><title>Report - ${school.school_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', 'Segoe UI', sans-serif; background: #fff; color: #111827; }
          .report-page { max-width: 800px; margin: 0 auto; padding: 32px 40px; }
          .report-header { display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 3px double #1e293b; margin-bottom: 24px; }
          .report-header img { height: 56px; width: 56px; object-fit: contain; border-radius: 10px; border: 1px solid #e2e8f0; padding: 4px; background: #fff; }
          .report-header-text { flex: 1; }
          .report-header-text h1 { font-size: 22px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; color: #0f172a; }
          .report-header-text p { font-size: 10px; letter-spacing: 3px; color: #64748b; margin-top: 2px; text-transform: uppercase; }
          .report-date { font-size: 9px; color: #94a3b8; letter-spacing: 1px; text-align: right; white-space: nowrap; }
          .school-banner { text-align: center; padding: 18px 0; margin-bottom: 20px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; border: 1px solid #e2e8f0; }
          .school-banner .school-logo { height: 48px; width: 48px; object-fit: contain; border-radius: 50%; margin-bottom: 8px; border: 2px solid #e2e8f0; }
          .school-banner h2 { font-size: 18px; font-weight: 800; letter-spacing: 2px; color: #0f172a; }
          .school-banner .sub { font-size: 9px; letter-spacing: 3px; color: #64748b; margin-top: 4px; text-transform: uppercase; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 10px; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; color: #334155; padding: 6px 12px; background: #f1f5f9; border-left: 3px solid #3b82f6; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th { padding: 6px 12px; text-align: left; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #64748b; background: #fafafa; border-bottom: 2px solid #e2e8f0; }
          td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
          td.label { color: #64748b; font-weight: 500; width: 35%; }
          td.value { font-weight: 700; color: #0f172a; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
          .stat-box { text-align: center; padding: 14px 8px; border-radius: 8px; border: 1px solid #e2e8f0; background: #fafafa; }
          .stat-box .num { font-size: 22px; font-weight: 900; color: #0f172a; }
          .stat-box .lbl { font-size: 8px; font-weight: 600; letter-spacing: 2px; color: #64748b; text-transform: uppercase; margin-top: 2px; }
          .sig-section { margin-top: 48px; display: flex; justify-content: space-between; align-items: flex-end; }
          .sig-block { text-align: center; width: 180px; }
          .sig-block img { max-height: 44px; margin-bottom: 4px; }
          .sig-block .sig-line { border-top: 1.5px solid #1e293b; padding-top: 6px; font-size: 9px; color: #64748b; letter-spacing: 2px; font-weight: 600; text-transform: uppercase; }
          .report-footer { text-align: center; margin-top: 28px; padding-top: 12px; border-top: 2px double #1e293b; }
          .report-footer p { font-size: 8px; color: #94a3b8; letter-spacing: 3px; text-transform: uppercase; }
          @media print { body { padding: 0; } .report-page { padding: 20px 30px; } }
        </style></head><body>
        ${content.innerHTML}
        </body></html>
      `,
    });
  };

  const schoolLogoUrl = getLogoUrl(school.school_logo);
  const sigUrl = getOwnerSignatureUrl(ownerSignature);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Institutional Report</DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="px-8 py-6 text-sm">
          <div className="report-page">
            {/* Header — Logo on LEFT */}
            <div className="report-header" style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 16, borderBottom: "3px double #1e293b", marginBottom: 24 }}>
              <img
                src={platformLogo}
                alt={appName}
                style={{ height: 56, width: 56, objectFit: "contain", borderRadius: 10, border: "1px solid #e2e8f0", padding: 4, background: "#fff" }}
                onError={(e) => { (e.target as HTMLImageElement).src = shikkhaLogo; }}
              />
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: 4, textTransform: "uppercase", color: "#0f172a" }}>
                  {appName}
                </h1>
                <p style={{ fontSize: 10, letterSpacing: 3, color: "#64748b", marginTop: 2, textTransform: "uppercase" }}>
                  Official Institutional Report
                </p>
              </div>
              <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1, textAlign: "right", whiteSpace: "nowrap" }}>
                <div>REPORT ID: {school.id?.slice(0, 8).toUpperCase()}</div>
                <div style={{ marginTop: 2 }}>{format(new Date(), "dd MMM yyyy • hh:mm a").toUpperCase()}</div>
              </div>
            </div>

            {/* School Banner */}
            <div style={{ textAlign: "center", padding: "18px 0", marginBottom: 20, background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              {schoolLogoUrl && (
                <img
                  src={schoolLogoUrl}
                  alt={school.school_name}
                  style={{ height: 48, width: 48, objectFit: "contain", borderRadius: "50%", marginBottom: 8, border: "2px solid #e2e8f0" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2, color: "#0f172a" }}>
                {school.school_name}
              </h2>
              {school.school_address && (
                <p style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>{school.school_address}</p>
              )}
              <p style={{ fontSize: 9, letterSpacing: 3, color: "#94a3b8", marginTop: 4, textTransform: "uppercase" }}>
                {school.eiin ? `EIIN: ${school.eiin}` : "Institutional Overview"}
              </p>
            </div>

            {/* Quick Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
              {[
                { num: stats?.activeStudents ?? "—", lbl: "Active Students" },
                { num: stats?.activeTeachers ?? "—", lbl: "Active Teachers" },
                { num: stats?.activeClasses ?? "—", lbl: "Classes" },
              ].map((s) => (
                <div key={s.lbl} style={{ textAlign: "center", padding: "14px 8px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fafafa" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{s.num}</div>
                  <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: 2, color: "#64748b", textTransform: "uppercase", marginTop: 2 }}>{s.lbl}</div>
                </div>
              ))}
            </div>

            {/* Admin Details */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: "#334155", padding: "6px 12px", background: "#f1f5f9", borderLeft: "3px solid #3b82f6", marginBottom: 10 }}>
                Administrative Details
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["School Code", school.school_code || "N/A"],
                    ["EIIN", school.eiin || "N/A"],
                    ["Admin Name", school.admin_name || "N/A"],
                    ["Admin Email", school.admin_email || "N/A"],
                    ["Phone", school.school_phone || "N/A"],
                    ["Email", school.school_email || "N/A"],
                    ["Principal", school.principal_name || "N/A"],
                    ["Established", school.established_year || "N/A"],
                  ].map(([label, value]) => (
                    <tr key={label as string}>
                      <td style={{ padding: "7px 12px", fontSize: 11, color: "#64748b", fontWeight: 500, width: "35%", borderBottom: "1px solid #f1f5f9" }}>{label}</td>
                      <td style={{ padding: "7px 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Full Statistics */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: "#334155", padding: "6px 12px", background: "#f1f5f9", borderLeft: "3px solid #10b981", marginBottom: 10 }}>
                Enrollment Statistics
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "6px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#64748b", background: "#fafafa", borderBottom: "2px solid #e2e8f0" }}>Category</th>
                    <th style={{ padding: "6px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#64748b", background: "#fafafa", borderBottom: "2px solid #e2e8f0" }}>Total</th>
                    <th style={{ padding: "6px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#64748b", background: "#fafafa", borderBottom: "2px solid #e2e8f0" }}>Active</th>
                    <th style={{ padding: "6px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#64748b", background: "#fafafa", borderBottom: "2px solid #e2e8f0" }}>Limit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}>Students</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>{stats?.totalStudents ?? "—"}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>{stats?.activeStudents ?? "—"}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>{school.max_students}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}>Teachers</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>{stats?.totalTeachers ?? "—"}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>{stats?.activeTeachers ?? "—"}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>{school.max_teachers}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}>Staff</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>{stats?.activeStaff ?? "—"}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>{stats?.activeStaff ?? "—"}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>—</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}>Classes</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>{stats?.activeClasses ?? "—"}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>{stats?.activeClasses ?? "—"}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid #f1f5f9" }}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Subscription */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase", color: "#334155", padding: "6px 12px", background: "#f1f5f9", borderLeft: "3px solid #f59e0b", marginBottom: 10 }}>
                Subscription & Plan
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    ["Plan", (school.plan_name || "free").toUpperCase()],
                    ["Status", school.is_active ? "✅ ACTIVE" : "⛔ SUSPENDED"],
                    ["Student Login", school.student_login_enabled ? "Enabled" : "Disabled"],
                    ["Teacher Login", school.teacher_login_enabled ? "Enabled" : "Disabled"],
                    ["Expiry", school.subscription_expiry ? format(new Date(school.subscription_expiry), "dd MMM yyyy") : "No Expiry"],
                  ].map(([label, value]) => (
                    <tr key={label as string}>
                      <td style={{ padding: "7px 12px", fontSize: 11, color: "#64748b", fontWeight: 500, width: "35%", borderBottom: "1px solid #f1f5f9" }}>{label}</td>
                      <td style={{ padding: "7px 12px", fontSize: 12, fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature — Master Panel: Platform Owner only */}
            <div style={{ marginTop: 48, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ textAlign: "center", width: 180 }}>
                {sigUrl && (
                  <img src={sigUrl} alt="Platform Owner" style={{ maxHeight: 44, marginBottom: 4, marginLeft: "auto", marginRight: "auto", display: "block" }} />
                )}
                <div style={{ borderTop: "1.5px solid #1e293b", paddingTop: 6 }}>
                  <p style={{ fontSize: 9, color: "#64748b", letterSpacing: 2, fontWeight: 600, textTransform: "uppercase" }}>Platform Owner</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: "center", marginTop: 28, paddingTop: 12, borderTop: "2px double #1e293b" }}>
              <p style={{ fontSize: 8, color: "#94a3b8", letterSpacing: 3, textTransform: "uppercase" }}>
                © {new Date().getFullYear()} {appName} • Confidential Document • Generated Automatically
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="outline" className="gap-1" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Print Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SchoolReportDialog;
