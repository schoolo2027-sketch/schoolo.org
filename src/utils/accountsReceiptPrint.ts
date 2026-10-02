import { printHtmlDocument } from "./safePrint";
import { resolveSchoolLogoUrl, preloadImageAsDataUrl } from "./printImageUtils";

export interface ReceiptLine {
  label: string;
  period?: string | null;
  amount: number;
}

export interface ReceiptData {
  receiptNo: string;
  date: string;
  schoolName: string;
  schoolAddress?: string | null;
  schoolLogo?: string | null;
  studentName: string;
  studentId?: string | null;
  className?: string | null;
  roll?: string | null;
  method?: string | null;
  accountName?: string | null;
  reference?: string | null;
  notes?: string | null;
  lines: ReceiptLine[];
  total: number;
  currency?: string;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

const body = (d: ReceiptData, compact: boolean, logoUrl?: string) => {
  const cur = d.currency || "৳";
  const finalLogo = logoUrl || resolveSchoolLogoUrl(d.schoolLogo);
  return `
  <div class="sheet ${compact ? "thermal" : "a4"}">
    <div class="head">
      ${finalLogo ? `<img class="logo" src="${esc(finalLogo)}" alt="Logo" />` : ""}
      <div>
        <h1>${esc(d.schoolName)}</h1>
        ${d.schoolAddress ? `<p class="muted">${esc(d.schoolAddress)}</p>` : ""}
        <p class="title">Money Receipt</p>
      </div>
    </div>
    <div class="meta">
      <div><b>Receipt No:</b> ${esc(d.receiptNo)}</div>
      <div><b>Date:</b> ${esc(d.date)}</div>
      <div><b>Student:</b> ${esc(d.studentName)}</div>
      <div><b>ID / Roll:</b> ${esc(d.studentId || "—")} / ${esc(d.roll || "—")}</div>
      ${d.className ? `<div><b>Class:</b> ${esc(d.className)}</div>` : ""}
      <div><b>Method:</b> ${esc(d.method || "cash")}${d.accountName ? ` (${esc(d.accountName)})` : ""}</div>
      ${d.reference ? `<div><b>Reference:</b> ${esc(d.reference)}</div>` : ""}
    </div>
    <table>
      <thead><tr><th>#</th><th>Particulars</th><th>Period</th><th class="r">Amount (${cur})</th></tr></thead>
      <tbody>
        ${d.lines
          .map(
            (l, i) =>
              `<tr><td>${i + 1}</td><td>${esc(l.label)}</td><td>${esc(l.period || "—")}</td><td class="r">${Number(
                l.amount
              ).toLocaleString()}</td></tr>`
          )
          .join("")}
      </tbody>
      <tfoot><tr><td colspan="3" class="r"><b>Total Paid</b></td><td class="r"><b>${cur} ${Number(
        d.total
      ).toLocaleString()}</b></td></tr></tfoot>
    </table>
    ${d.notes ? `<p class="muted">Note: ${esc(d.notes)}</p>` : ""}
    <div class="sign">
      <div>Received By</div>
      <div>Authorised Signature</div>
    </div>
  </div>`;
};

export const printAccountsReceipt = async (d: ReceiptData, size: "a4" | "thermal" = "a4") => {
  const rawLogo = resolveSchoolLogoUrl(d.schoolLogo);
  const inlinedLogo = rawLogo ? await preloadImageAsDataUrl(rawLogo) : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${esc(d.receiptNo)}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;margin:0;color:#0f172a;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
    .sheet{padding:24px}
    .sheet.thermal{width:80mm;padding:8px;font-size:11px}
    .head{display:flex;gap:12px;align-items:center;border-bottom:2px solid #0f172a;padding-bottom:10px}
    .logo{height:56px;width:56px;object-fit:contain;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
    h1{margin:0;font-size:20px}
    .title{margin:4px 0 0;font-weight:700;letter-spacing:1px;text-transform:uppercase;font-size:13px}
    .muted{color:#64748b;margin:2px 0;font-size:12px}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin:14px 0;font-size:12px}
    .sheet.thermal .meta{grid-template-columns:1fr}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}
    th{background:#f1f5f9}
    .r{text-align:right}
    .sign{display:flex;justify-content:space-between;margin-top:48px;font-size:12px}
    .sign div{border-top:1px solid #0f172a;padding-top:4px;width:180px;text-align:center}
    .sheet.thermal .sign{margin-top:24px}
    @page{size:${size === "thermal" ? "80mm auto" : "A4"};margin:${size === "thermal" ? "4mm" : "12mm"}}
  </style></head><body>${body(d, size === "thermal", inlinedLogo)}</body></html>`;
  await printHtmlDocument({ html, title: `Receipt ${d.receiptNo}` });
};
