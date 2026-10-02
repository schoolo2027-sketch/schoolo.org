import { supabase } from "@/integrations/supabase/client";
import { printHtmlDocument } from "@/utils/safePrint";
import { resolveSchoolLogoUrl, resolveSignatureUrl, preloadImageAsDataUrl } from "@/utils/printImageUtils";

export const fetchOwnerSignature = async (): Promise<string | null> => {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "owner_signature")
    .maybeSingle();
  if (!data?.value) return null;
  const val = data.value;
  return resolveSignatureUrl(val, "platform-assets");
};

export interface SchoolInfo {
  school_name: string;
  school_logo: string | null;
  school_address: string | null;
  school_phone: string | null;
  school_email: string | null;
  principal_signature: string | null;
}

export const fetchSchoolInfo = async (schoolId: string): Promise<SchoolInfo | null> => {
  if (!schoolId) return null;

  // 1. Try safe RPC function
  try {
    const { data, error } = await supabase.rpc("get_school_info_safe", { _school_id: schoolId });
    if (!error && data && data.length > 0) {
      const raw = data[0] as SchoolInfo;
      return {
        ...raw,
        school_logo: resolveSchoolLogoUrl(raw.school_logo),
      };
    }
  } catch (err) {
    console.warn("RPC get_school_info_safe failed, falling back:", err);
  }

  // 2. Fallback directly to schools table
  try {
    const { data: directSchool } = await supabase
      .from("schools")
      .select("school_name, school_logo, school_address, school_phone, school_email, principal_signature")
      .eq("id", schoolId)
      .maybeSingle();

    if (directSchool) {
      return {
        ...directSchool,
        school_logo: resolveSchoolLogoUrl(directSchool.school_logo),
      } as SchoolInfo;
    }
  } catch (err) {
    console.warn("Direct schools table query failed:", err);
  }

  return null;
};

export const getSignatureUrl = (sig: string | null, bucket = "signatures"): string => {
  return resolveSignatureUrl(sig, bucket);
};

export const getLogoUrl = (logo: string | null): string => {
  return resolveSchoolLogoUrl(logo);
};

const buildWatermarkStyles = (logoUrl: string): string => {
  if (!logoUrl) return "";
  return `
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 65%;
      height: auto;
      opacity: 0.06;
      z-index: -1;
      pointer-events: none;
      filter: grayscale(100%);
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 65%;
        opacity: 0.06;
        z-index: -1;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        filter: grayscale(100%);
      }
    }
  `;
};

const buildPrintStyles = (): string => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: A4; margin: 15mm; }
  body { 
    font-family: 'Segoe UI', Arial, sans-serif; 
    padding: 30px; 
    color: #333; 
    position: relative;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #333; position: relative; z-index: 1; }
  .print-header img { height: 64px; width: 64px; object-fit: contain; border-radius: 8px; flex-shrink: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .print-header .header-text { flex: 1; text-align: center; }
  .print-header h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .print-header p { font-size: 12px; color: #555; margin: 2px 0; }
  .print-header .contact-row { font-size: 11px; color: #666; margin-top: 4px; }
  .print-content { position: relative; z-index: 1; }
  .report-title { text-align: center; font-size: 16px; font-weight: 600; margin-bottom: 4px; }
  .report-subtitle { text-align: center; font-size: 12px; color: #666; margin-bottom: 16px; }
  .count { text-align: center; color: #888; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f4f4f5; padding: 10px 8px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #fafafa; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
  .active { background: #dcfce7; color: #166534; }
  .inactive { background: #f3f4f6; color: #6b7280; }
  .print-footer { text-align: center; margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #999; position: relative; z-index: 1; }
  @media print { 
    body { padding: 0; }
    th { background: #f4f4f5 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    tr:nth-child(even) { background: #fafafa !important; }
    .badge.active { background: #dcfce7 !important; color: #166534 !important; }
    .badge.inactive { background: #f3f4f6 !important; color: #6b7280 !important; }
    img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
`;

const buildSchoolHeader = (school: SchoolInfo, resolvedLogoUrl?: string): string => {
  const logoUrl = resolvedLogoUrl || resolveSchoolLogoUrl(school.school_logo);
  const contactParts = [
    school.school_phone ? `📞 ${school.school_phone}` : "",
    school.school_email ? `✉️ ${school.school_email}` : "",
  ].filter(Boolean).join(" | ");

  return `
    <div class="print-header">
      ${logoUrl ? `<img src="${logoUrl}" alt="School Logo" />` : ""}
      <div class="header-text">
        <h1>${school.school_name}</h1>
        ${school.school_address ? `<p>${school.school_address}</p>` : ""}
        ${contactParts ? `<p class="contact-row">${contactParts}</p>` : ""}
      </div>
      ${logoUrl ? `<div style="width:64px;flex-shrink:0"></div>` : ""}
    </div>
  `;
};

const buildWatermarkHtml = (logoUrl: string): string => {
  if (!logoUrl) return "";
  return `<img class="watermark" src="${logoUrl}" alt="" />`;
};

interface PrintOptions {
  schoolId: string;
  title: string;
  subtitle?: string;
  content: string;
  isMasterPrint?: boolean;
}

export const printWithSchoolHeader = async ({ schoolId, title, subtitle, content, isMasterPrint }: PrintOptions) => {
  const school = await fetchSchoolInfo(schoolId);
  const rawLogoUrl = school ? resolveSchoolLogoUrl(school.school_logo) : "";
  const logoUrl = rawLogoUrl ? await preloadImageAsDataUrl(rawLogoUrl) : "";

  // Determine signature based on context
  let sigHtml = "";
  if (isMasterPrint) {
    const ownerSigUrl = await fetchOwnerSignature();
    const inlinedOwnerSig = ownerSigUrl ? await preloadImageAsDataUrl(ownerSigUrl) : "";
    if (inlinedOwnerSig) {
      sigHtml = `
        <div style="margin-top:48px;display:flex;justify-content:flex-end;">
          <div style="text-align:center;width:180px;">
            <img src="${inlinedOwnerSig}" alt="Owner Signature" style="max-height:44px;margin-bottom:4px;display:block;margin-left:auto;margin-right:auto;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;" />
            <div style="border-top:1.5px solid #333;padding-top:6px;font-size:11px;color:#555;">Platform Owner</div>
          </div>
        </div>
      `;
    }
  } else {
    // School context: show principal signature
    const rawSigUrl = school ? resolveSignatureUrl(school.principal_signature, "signatures") : "";
    const principalSigUrl = rawSigUrl ? await preloadImageAsDataUrl(rawSigUrl) : "";
    if (principalSigUrl) {
      sigHtml = `
        <div style="margin-top:48px;display:flex;justify-content:space-between;align-items:flex-end;">
          <div style="text-align:center;width:180px;">
            <div style="border-top:1.5px solid #333;padding-top:6px;font-size:11px;color:#555;">School Authority</div>
          </div>
          <div style="text-align:center;width:180px;">
            <img src="${principalSigUrl}" alt="Principal Signature" style="max-height:44px;margin-bottom:4px;display:block;margin-left:auto;margin-right:auto;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;" />
            <div style="border-top:1.5px solid #333;padding-top:6px;font-size:11px;color:#555;">Principal</div>
          </div>
        </div>
      `;
    }
  }

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        ${buildPrintStyles()}
        ${buildWatermarkStyles(logoUrl)}
      </style>
    </head>
    <body>
      ${buildWatermarkHtml(logoUrl)}
      ${school ? buildSchoolHeader(school, logoUrl) : ""}
      <div class="print-content">
        <div class="report-title">${title}</div>
        ${subtitle ? `<div class="report-subtitle">${subtitle}</div>` : ""}
        ${content}
      </div>
      ${sigHtml}
      <div class="print-footer">
        Printed on ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} 
        at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </body>
    </html>
  `;

  await printHtmlDocument({
    title,
    html: printContent,
  });
};

