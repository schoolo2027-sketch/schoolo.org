import { fetchSchoolInfo, getSignatureUrl } from "@/utils/printUtils";
import { printHtmlDocument } from "@/utils/safePrint";
import { resolveSchoolLogoUrl, preloadImageAsDataUrl } from "@/utils/printImageUtils";

const numberToWords = (num: number): string => {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
  };

  const parts: string[] = [];
  if (num >= 10000000) { parts.push(convert(Math.floor(num / 10000000)) + " Crore"); num %= 10000000; }
  if (num >= 100000) { parts.push(convert(Math.floor(num / 100000)) + " Lakh"); num %= 100000; }
  if (num >= 1000) { parts.push(convert(Math.floor(num / 1000)) + " Thousand"); num %= 1000; }
  if (num > 0) parts.push(convert(num));

  return parts.join(" ") + " Taka Only";
};

interface FeeReceiptData {
  schoolId: string;
  student: {
    student_name: string;
    class_name: string;
    section_name: string;
    roll: string;
    student_id: string;
  };
  payments: Array<{
    fee_type: string;
    amount: number;
    receipt_number?: string;
    date: string;
    payment_method: string;
    status: string;
  }>;
  collectedBy: string;
  academicYear?: number;
  shift?: string;
}

export const printFeeReceipt = async (data: FeeReceiptData) => {
  const school = (await fetchSchoolInfo(data.schoolId)) || {
    school_name: "School",
    school_logo: null,
    school_address: null,
    school_phone: null,
    school_email: null,
    principal_signature: null,
  };

  const rawLogoUrl = school.school_logo ? resolveSchoolLogoUrl(school.school_logo) : "";
  const logoUrl = rawLogoUrl ? await preloadImageAsDataUrl(rawLogoUrl) : "";
  // School-level print: use school's principal signature only
  const rawSigUrl = school.principal_signature ? getSignatureUrl(school.principal_signature, "signatures") : "";
  const principalSigUrl = rawSigUrl ? await preloadImageAsDataUrl(rawSigUrl) : "";
  const totalAmount = data.payments.reduce((sum, p) => sum + p.amount, 0);
  const amountInWords = numberToWords(Math.round(totalAmount));
  const receiptNo = data.payments[0]?.receipt_number || `RCP-${Date.now().toString().slice(-8)}`;
  const receiptDate = data.payments[0]?.date
    ? new Date(data.payments[0].date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const paymentMethod = data.payments[0]?.payment_method || "Cash";
  const status = data.payments[0]?.status || "verified";
  const session = data.academicYear || new Date().getFullYear();
  const shift = data.shift || "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fee Receipt - ${data.student.student_name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 18mm; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #222;
          padding: 40px;
          position: relative;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60%;
          opacity: 0.06;
          z-index: -1;
          pointer-events: none;
          filter: grayscale(100%);
        }
        .receipt-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid #2563eb;
          position: relative;
          z-index: 1;
        }
        .receipt-header .school-logo {
          height: 56px;
          width: 56px;
          object-fit: contain;
          border-radius: 6px;
          flex-shrink: 0;
        }
        .receipt-header .header-text {
          flex: 1;
          text-align: center;
        }
        .receipt-header h1 {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 2px;
        }
        .receipt-header p {
          font-size: 12px;
          color: #555;
          margin: 1px 0;
        }
        .content { position: relative; z-index: 1; }
        .receipt-info-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .receipt-title {
          font-size: 20px;
          font-weight: 700;
          color: #2563eb;
          text-decoration: underline;
          text-underline-offset: 4px;
        }
        .receipt-meta {
          text-align: right;
          font-size: 12px;
          color: #444;
          line-height: 1.8;
        }
        .receipt-meta strong { color: #222; }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .info-table {
          width: 60%;
          border-collapse: collapse;
          font-size: 13px;
          margin-bottom: 24px;
        }
        .info-table td {
          padding: 7px 12px;
          border: 1px solid #d1d5db;
        }
        .info-table td:first-child {
          font-weight: 600;
          width: 120px;
          background: #f8fafc;
          color: #374151;
        }
        .payment-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .payment-table th {
          background: #2563eb;
          color: #fff;
          padding: 10px 12px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
        }
        .payment-table th:last-child { text-align: right; }
        .payment-table td {
          padding: 9px 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .payment-table td:last-child { text-align: right; }
        .payment-table .total-row td {
          font-weight: 700;
          font-size: 15px;
          border-top: 2px solid #2563eb;
          padding-top: 10px;
        }
        .payment-table .total-row td:last-child {
          color: #2563eb;
          font-size: 18px;
        }
        .amount-words {
          font-size: 13px;
          margin-bottom: 20px;
        }
        .amount-words strong { color: #1e293b; }
        .payment-info {
          font-size: 13px;
          line-height: 1.9;
          margin-bottom: 28px;
          color: #444;
        }
        .payment-info strong { color: #222; }
        .status-paid { color: #16a34a; font-weight: 600; }
        .status-due { color: #dc2626; font-weight: 600; }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 48px;
          padding-top: 0;
        }
        .sig-block {
          text-align: center;
          width: 30%;
        }
        .sig-line {
          border-top: 1px solid #999;
          margin-top: 40px;
          padding-top: 6px;
          font-size: 12px;
          color: #555;
        }
        @media print {
          body { padding: 0; }
          .watermark {
            position: fixed;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .payment-table th {
            background: #2563eb !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .info-table td:first-child {
            background: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      ${logoUrl ? `<img class="watermark" src="${logoUrl}" alt="" />` : ""}

      <div class="receipt-header">
        ${logoUrl ? `<img class="school-logo" src="${logoUrl}" alt="Logo" />` : ""}
        <div class="header-text">
          <h1>${school.school_name}</h1>
          ${school.school_address ? `<p>${school.school_address}</p>` : ""}
          ${school.school_email ? `<p>Email: ${school.school_email}</p>` : ""}
        </div>
        ${logoUrl ? `<div style="width:56px;flex-shrink:0"></div>` : ""}
      </div>

      <div class="content">
        <div class="receipt-info-row">
          <div class="receipt-title">Fee Receipt</div>
          <div class="receipt-meta">
            <strong>Receipt No:</strong> ${receiptNo}<br/>
            <strong>Date:</strong> ${receiptDate}<br/>
            <strong>Session:</strong> ${session}${shift ? ` &nbsp;·&nbsp; <strong>Shift:</strong> ${shift}` : ""}
          </div>
        </div>

        <div class="section-title">👤 Student Information</div>
        <table class="info-table">
          <tr><td>Name</td><td>${data.student.student_name}</td></tr>
          <tr><td>Class</td><td>${data.student.class_name}</td></tr>
          <tr><td>Section</td><td>${data.student.section_name}</td></tr>
          <tr><td>Roll</td><td>${data.student.roll}</td></tr>
          <tr><td>Student ID</td><td>${data.student.student_id || "—"}</td></tr>
        </table>

        <div class="section-title">💰 Payment Details</div>
        <table class="payment-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount (৳)</th>
            </tr>
          </thead>
          <tbody>
            ${data.payments.map(p => `
              <tr>
                <td style="text-transform: capitalize;">${p.fee_type.replace(/_/g, " ")}</td>
                <td>${p.amount.toLocaleString()}</td>
              </tr>
            `).join("")}
            <tr class="total-row">
              <td>Total Amount</td>
              <td>${totalAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="amount-words">
          <strong>Amount in Words:</strong> ${amountInWords}
        </div>

        <div class="payment-info">
          <strong>Payment Method:</strong> ${paymentMethod.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}<br/>
          <strong>Collected By:</strong> ${data.collectedBy}<br/>
          <strong>Status:</strong> <span class="${status === "verified" ? "status-paid" : "status-due"}">
            ${status === "verified" ? "✅ Paid" : status === "pending" ? "⏳ Pending" : "❌ Rejected"}
          </span>
        </div>

        <div class="signatures">
          <div class="sig-block"><div class="sig-line">Student Signature</div></div>
          <div class="sig-block"><div class="sig-line">Accountant Signature</div></div>
          <div class="sig-block">
            ${principalSigUrl ? `<img src="${principalSigUrl}" alt="Principal" style="max-height:40px;margin:0 auto 4px;display:block;" />` : ""}
            <div class="sig-line">Principal Signature</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await printHtmlDocument({
    title: `Fee Receipt - ${data.student.student_name}`,
    html,
  });
};
