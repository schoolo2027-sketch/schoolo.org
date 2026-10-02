import * as XLSX from "xlsx";
import { printHtmlDocument } from "./safePrint";
import { resolveSchoolLogoUrl, preloadImageAsDataUrl } from "./printImageUtils";

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export interface ReportPayload {
  title: string;
  subtitle?: string;
  schoolName?: string;
  schoolLogo?: string | null;
  columns: ReportColumn[];
  rows: Record<string, any>[];
  totals?: Record<string, any>;
}

const cell = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v));

export const exportReportExcel = ({ title, columns, rows, totals }: ReportPayload) => {
  const data = rows.map((r) => {
    const o: Record<string, any> = {};
    columns.forEach((c) => (o[c.label] = r[c.key] ?? ""));
    return o;
  });
  if (totals) {
    const t: Record<string, any> = {};
    columns.forEach((c) => (t[c.label] = totals[c.key] ?? ""));
    data.push(t);
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 28) || "Report");
  XLSX.writeFile(wb, `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export const buildReportHtml = ({ title, subtitle, schoolName, schoolLogo, columns, rows, totals }: ReportPayload, inlinedLogo?: string) => {
  const logo = inlinedLogo || resolveSchoolLogoUrl(schoolLogo);
  return `
<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${title}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #10203c; margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .head { display: flex; align-items: center; justify-content: center; gap: 14px; border-bottom: 2px solid #10203c; padding-bottom: 10px; margin-bottom: 14px; }
  .head img { height: 50px; width: 50px; object-fit: contain; border-radius: 6px; flex-shrink: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .head-text { text-align: center; }
  .head h1 { margin: 0; font-size: 20px; letter-spacing: .5px; }
  .head h2 { margin: 6px 0 0; font-size: 15px; color: #b8860b; }
  .head p { margin: 4px 0 0; font-size: 11px; color: #556; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #10203c; color: #fff; padding: 7px 6px; text-align: left; font-weight: 600; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  td { padding: 6px; border-bottom: 1px solid #e3e7ee; }
  tr:nth-child(even) td { background: #f7f9fc; }
  tfoot td { font-weight: 700; background: #fdf6e3 !important; border-top: 2px solid #b8860b; }
  .r { text-align: right; } .c { text-align: center; }
  .foot { margin-top: 18px; font-size: 10px; color: #778; display:flex; justify-content: space-between; }
  @media print {
    th { background: #10203c !important; color: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style></head><body>
  <div class="head">
    ${logo ? `<img src="${logo}" alt="Logo" />` : ""}
    <div class="head-text">
      <h1>${schoolName || "School"}</h1>
      <h2>${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
    </div>
  </div>
  <table>
    <thead><tr>${columns.map((c) => `<th class="${c.align === "right" ? "r" : c.align === "center" ? "c" : ""}">${c.label}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows.length === 0 ? `<tr><td colspan="${columns.length}" class="c">No records found</td></tr>` : ""}
      ${rows
        .map(
          (r) =>
            `<tr>${columns
              .map((c) => `<td class="${c.align === "right" ? "r" : c.align === "center" ? "c" : ""}">${cell(r[c.key])}</td>`)
              .join("")}</tr>`,
        )
        .join("")}
    </tbody>
    ${
      totals
        ? `<tfoot><tr>${columns
            .map((c) => `<td class="${c.align === "right" ? "r" : c.align === "center" ? "c" : ""}">${cell(totals[c.key])}</td>`)
            .join("")}</tr></tfoot>`
        : ""
    }
  </table>
  <div class="foot"><span>Generated: ${new Date().toLocaleString()}</span><span>Authorised Signature: ____________________</span></div>
</body></html>`;
};

export const printReport = async (payload: ReportPayload) => {
  const rawLogo = resolveSchoolLogoUrl(payload.schoolLogo);
  const inlinedLogo = rawLogo ? await preloadImageAsDataUrl(rawLogo) : "";
  await printHtmlDocument({ html: buildReportHtml(payload, inlinedLogo), title: payload.title });
};

export const exportReportPdf = async (payload: ReportPayload) => {
  // PDF is produced through the browser print dialog ("Save as PDF") using the same A4 layout.
  await printReport(payload);
};
