import { printHtmlDocument } from "./safePrint";
import { resolveSchoolLogoUrl, preloadImageAsDataUrl } from "./printImageUtils";

export interface PayslipData {
  payslipNo?: string | null;
  month: string;
  schoolName: string;
  schoolAddress?: string | null;
  schoolLogo?: string | null;
  employeeName: string;
  designation?: string | null;
  employeeType: "Teacher" | "Staff";
  basic: number;
  bonus: number;
  advance: number;
  deduction: number;
  net: number;
  status: string;
  paidOn?: string | null;
  accountName?: string | null;
  notes?: string | null;
  currency?: string;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

export const printPayslip = async (d: PayslipData) => {
  const rawLogo = resolveSchoolLogoUrl(d.schoolLogo);
  const inlinedLogo = rawLogo ? await preloadImageAsDataUrl(rawLogo) : "";
  const cur = d.currency || "৳";
  const row = (l: string, v: number, neg = false) =>
    `<tr><td>${esc(l)}</td><td class="r">${neg ? "-" : ""}${Number(v || 0).toLocaleString()}</td></tr>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Payslip ${esc(d.payslipNo || d.month)}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;margin:0;color:#0f172a;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
    .sheet{padding:24px}
    .head{display:flex;gap:12px;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:10px}
    .logo{height:56px;width:56px;object-fit:contain;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
    h1{margin:0;font-size:20px}
    .title{margin:4px 0 0;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-size:13px}
    .muted{color:#64748b;margin:2px 0;font-size:12px}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin:14px 0;font-size:12px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}
    th{background:#f1f5f9}
    .r{text-align:right}
    .net td{background:#f8fafc;font-weight:700}
    .sign{display:flex;justify-content:space-between;margin-top:56px;font-size:12px}
    .sign div{border-top:1px solid #0f172a;padding-top:4px;width:180px;text-align:center}
    @page{size:A4;margin:12mm}
  </style></head><body>
  <div class="sheet">
    <div class="head">
      ${inlinedLogo ? `<img class="logo" src="${esc(inlinedLogo)}" alt="Logo" />` : ""}
      <div>
        <h1>${esc(d.schoolName)}</h1>
        ${d.schoolAddress ? `<p class="muted">${esc(d.schoolAddress)}</p>` : ""}
        <p class="title">Salary Payslip</p>
      </div>
    </div>
    <div class="meta">
      <div><b>Payslip No:</b> ${esc(d.payslipNo || "—")}</div>
      <div><b>Month:</b> ${esc(d.month)}</div>
      <div><b>Name:</b> ${esc(d.employeeName)}</div>
      <div><b>Type:</b> ${esc(d.employeeType)}</div>
      <div><b>Designation:</b> ${esc(d.designation || "—")}</div>
      <div><b>Status:</b> ${esc(d.status)}</div>
      <div><b>Paid On:</b> ${esc(d.paidOn || "—")}</div>
      <div><b>Account:</b> ${esc(d.accountName || "—")}</div>
    </div>
    <table>
      <thead><tr><th>Description</th><th class="r">Amount (${cur})</th></tr></thead>
      <tbody>
        ${row("Basic Salary", d.basic)}
        ${row("Bonus / Allowance", d.bonus)}
        ${row("Advance Adjustment", d.advance, true)}
        ${row("Deduction", d.deduction, true)}
        <tr class="net"><td>Net Payable</td><td class="r">${cur} ${Number(d.net || 0).toLocaleString()}</td></tr>
      </tbody>
    </table>
    ${d.notes ? `<p class="muted">Note: ${esc(d.notes)}</p>` : ""}
    <div class="sign">
      <div>Received By</div>
      <div>Authorised Signature</div>
    </div>
  </div>
  </body></html>`;

  await printHtmlDocument({ html, title: `Payslip ${d.payslipNo || d.month}` });
};
