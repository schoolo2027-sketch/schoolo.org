import { fetchSchoolInfo, getSignatureUrl } from "./printUtils";
import { printHtmlDocument } from "./safePrint";
import { calculateBangladeshBoardResult, groupPapersIntoSubjects } from "./gradingUtils";
import { resolveSchoolLogoUrl, preloadImageAsDataUrl } from "./printImageUtils";

interface SubjectMark {
  subject_name: string;
  cq: number;
  mcq: number;
  practical: number;
  total: number;
  full_marks: number;
  grade: string;
  gpa: number;
  is_optional?: boolean;
}

interface MarksheetData {
  schoolId: string;
  studentName: string;
  roll: string;
  studentId: string;
  className: string;
  section: string;
  examName: string;
  academicYear: number;
  subjects: SubjectMark[];
  totalMarks: number;
  totalFull: number;
  finalGPA: number;
  finalGrade: string;
  position: number;
  totalStudents: number;
}

export const printMarksheet = async (data: MarksheetData) => {
  const school = await fetchSchoolInfo(data.schoolId);
  const rawLogoUrl = school ? resolveSchoolLogoUrl(school.school_logo) : "";
  const logoUrl = rawLogoUrl ? await preloadImageAsDataUrl(rawLogoUrl) : "";
  const rawSigUrl = school ? getSignatureUrl(school.principal_signature, "signatures") : "";
  const principalSigUrl = rawSigUrl ? await preloadImageAsDataUrl(rawSigUrl) : "";

  // Perform full board result calculation
  const boardResult = calculateBangladeshBoardResult(
    data.subjects.map((s) => ({
      name: s.subject_name,
      obtained: s.total,
      total: s.full_marks,
      cq: s.cq,
      mcq: s.mcq,
      practical: s.practical,
      grade: s.grade,
      gpa: s.gpa,
      isOptional: s.is_optional,
    }))
  );

  const hasCombinedSubjects = boardResult.subjects.some((s) => s.isCombined);
  const hasOptional = boardResult.optionalSubjects.length > 0;

  // Paper-by-paper rows
  const subjectRows = data.subjects
    .map((s) => {
      const isOpt = !!s.is_optional;
      return `
      <tr style="${isOpt ? "background:#f0fdf4 !important;" : ""}">
        <td style="font-weight:500">
          ${s.subject_name}
          ${isOpt ? `<span style="display:inline-block;font-size:9px;background:#10b981;color:#fff;padding:1px 6px;border-radius:4px;margin-left:6px;font-weight:600;text-transform:uppercase;">4th Subject</span>` : ""}
        </td>
        <td style="text-align:center">${s.cq || "-"}</td>
        <td style="text-align:center">${s.mcq || "-"}</td>
        <td style="text-align:center">${s.practical || "-"}</td>
        <td style="text-align:center;font-weight:600">${s.total}</td>
        <td style="text-align:center">${s.full_marks}</td>
        <td style="text-align:center"><span class="grade-badge grade-${(s.grade || "F").replace("+", "p").replace("-", "m")}">${s.grade}</span></td>
        <td style="text-align:center;font-weight:600">${s.gpa.toFixed(2)}</td>
      </tr>
    `;
    })
    .join("");

  // Combined subject summary rows (if 1st + 2nd papers exist)
  const combinedSummaryRows = boardResult.subjects
    .map((s) => {
      const isOpt = s.isOptional;
      const bonusText = isOpt
        ? s.gpa > 2.0
          ? `<span style="color:#059669;font-weight:600;"> (+${(s.gpa - 2.0).toFixed(2)} bonus)</span>`
          : s.gpa === 0
          ? `<span style="color:#64748b;"> (F - no overall penalty)</span>`
          : `<span style="color:#64748b;"> (+0.00 bonus)</span>`
        : "";

      return `
      <tr style="${isOpt ? "background:#f0fdf4 !important;" : ""}">
        <td style="font-weight:600;">
          ${s.displayName}
          ${isOpt ? `<span style="display:inline-block;font-size:9px;background:#10b981;color:#fff;padding:1px 5px;border-radius:4px;margin-left:6px;font-weight:600;">OPTIONAL</span>` : ""}
        </td>
        <td style="text-align:center;font-weight:600;">${s.totalObtained} / ${s.totalFullMarks}</td>
        <td style="text-align:center;">${s.percentage.toFixed(1)}%</td>
        <td style="text-align:center;"><span class="grade-badge grade-${(s.grade || "F").replace("+", "p").replace("-", "m")}">${s.grade}</span></td>
        <td style="text-align:center;font-weight:700;">${s.gpa.toFixed(2)}${bonusText}</td>
      </tr>
    `;
    })
    .join("");

  const html = `<!DOCTYPE html><html><head><title>Marksheet - ${data.studentName}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size:A4; margin:10mm; }
    body { font-family:'Segoe UI',Arial,sans-serif; padding:20px; color:#333; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
    .watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:60%; opacity:0.05; z-index:-1; filter:grayscale(100%); pointer-events:none; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
    .header { display:flex; align-items:center; gap:14px; border-bottom:3px double #1a365d; padding-bottom:12px; margin-bottom:16px; }
    .header img { height:56px; width:56px; object-fit:contain; border-radius:8px; flex-shrink:0; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
    .header .header-text { flex:1; text-align:center; }
    .header h1 { font-size:19px; color:#1a365d; margin-bottom:2px; }
    .header p { font-size:11px; color:#555; }
    .exam-title { text-align:center; font-size:14px; font-weight:700; color:#1a365d; text-transform:uppercase; letter-spacing:0.5px; }
    .exam-sub { text-align:center; font-size:11px; color:#666; margin-bottom:14px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 20px; margin-bottom:16px; padding:10px 14px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; }
    .info-item { display:flex; gap:6px; font-size:11.5px; }
    .info-item .label { font-weight:600; color:#64748b; min-width:85px; }
    .info-item .value { font-weight:500; color:#1e293b; }
    .section-heading { font-size:11px; font-weight:700; text-transform:uppercase; color:#1a365d; margin:12px 0 6px 0; letter-spacing:0.5px; }
    table { width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:12px; }
    th { background:#1a365d; color:#fff; padding:7px 5px; text-align:center; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; }
    th:first-child { text-align:left; }
    td { padding:6px 5px; border-bottom:1px solid #e2e8f0; }
    tr:nth-child(even) { background:#f8fafc; }
    .total-row td { font-weight:700; border-top:2px solid #1a365d; background:#f1f5f9 !important; font-size:12px; }
    .result-box { display:flex; justify-content:space-between; gap:12px; margin-top:14px; margin-bottom:16px; }
    .result-item { flex:1; text-align:center; padding:10px; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc; }
    .result-item .val { font-size:20px; font-weight:700; color:#1a365d; }
    .result-item .lbl { font-size:9.5px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-top:2px; }
    .formula-note { font-size:11px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:8px 12px; margin-bottom:14px; color:#166534; line-height:1.45; }
    .fail-note { font-size:11px; background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:8px 12px; margin-bottom:14px; color:#991b1b; line-height:1.45; }
    .grade-badge { display:inline-block; padding:2px 7px; border-radius:10px; font-size:9.5px; font-weight:600; }
    .grade-Ap { background:#d1fae5; color:#065f46; }
    .grade-A { background:#d1fae5; color:#065f46; }
    .grade-Am { background:#ccfbf1; color:#0f766e; }
    .grade-B { background:#dbeafe; color:#1e40af; }
    .grade-C { background:#fef3c7; color:#92400e; }
    .grade-D { background:#fed7aa; color:#9a3412; }
    .grade-F { background:#fecaca; color:#991b1b; }
    .sig-row { display:flex; justify-content:space-between; margin-top:36px; padding-top:10px; }
    .sig-item { text-align:center; width:30%; }
    .sig-line { border-top:1px solid #333; padding-top:4px; font-size:10.5px; font-weight:500; }
    .footer { text-align:center; margin-top:16px; font-size:8.5px; color:#999; border-top:1px solid #eee; padding-top:6px; }
    @media print {
      body { padding:0; }
      th { background:#1a365d !important; color:#fff !important; }
      tr:nth-child(even) { background:#f8fafc !important; }
      .total-row td { background:#f1f5f9 !important; }
      .result-item { background:#f8fafc !important; }
      .info-grid { background:#f8fafc !important; }
      .formula-note { background:#f0fdf4 !important; }
      .fail-note { background:#fef2f2 !important; }
    }
  </style></head><body>
    ${logoUrl ? `<img class="watermark" src="${logoUrl}" alt="" />` : ""}
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ""}
      <div class="header-text">
        <h1>${school?.school_name || ""}</h1>
        ${school?.school_address ? `<p>${school.school_address}</p>` : ""}
        ${school?.school_phone || school?.school_email ? `<p>${[school?.school_phone ? `📞 ${school.school_phone}` : "", school?.school_email ? `✉️ ${school.school_email}` : ""].filter(Boolean).join(" | ")}</p>` : ""}
      </div>
      ${logoUrl ? `<div style="width:56px;flex-shrink:0"></div>` : ""}
    </div>
    <div class="exam-title">${data.examName} — Academic Transcript</div>
    <div class="exam-sub">Academic Year: ${data.academicYear}</div>
    <div class="info-grid">
      <div class="info-item"><span class="label">Student Name:</span><span class="value">${data.studentName}</span></div>
      <div class="info-item"><span class="label">Class:</span><span class="value">${data.className}</span></div>
      <div class="info-item"><span class="label">Roll:</span><span class="value">${data.roll}</span></div>
      <div class="info-item"><span class="label">Section / Group:</span><span class="value">${data.section}</span></div>
      <div class="info-item"><span class="label">Student ID:</span><span class="value">${data.studentId || "N/A"}</span></div>
      <div class="info-item"><span class="label">Position:</span><span class="value">${data.position} out of ${data.totalStudents}</span></div>
    </div>

    <div class="section-heading">Detailed Subject & Paper Marks</div>
    <table>
      <thead><tr>
        <th style="text-align:left">Subject / Paper</th><th>CQ</th><th>MCQ</th><th>Practical</th><th>Total</th><th>Full Marks</th><th>Grade</th><th>GPA</th>
      </tr></thead>
      <tbody>
        ${subjectRows}
        <tr class="total-row">
          <td colspan="4" style="text-align:right">Grand Total</td>
          <td style="text-align:center">${data.totalMarks}</td>
          <td style="text-align:center">${data.totalFull}</td>
          <td style="text-align:center"><span class="grade-badge grade-${(boardResult.finalGrade || data.finalGrade).replace("+", "p").replace("-", "m")}">${boardResult.finalGrade || data.finalGrade}</span></td>
          <td style="text-align:center">${(boardResult.finalGPA || data.finalGPA).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    ${hasCombinedSubjects ? `
      <div class="section-heading">Board Subject Summary (Combined Papers)</div>
      <table>
        <thead><tr>
          <th style="text-align:left">Final Subject</th>
          <th style="text-align:center">Combined Marks</th>
          <th style="text-align:center">Percentage</th>
          <th style="text-align:center">Final Grade</th>
          <th style="text-align:center">Grade Point (GP)</th>
        </tr></thead>
        <tbody>
          ${combinedSummaryRows}
        </tbody>
      </table>
    ` : ""}

    ${!boardResult.isPassed ? `
      <div class="fail-note">
        <strong>⚠️ Result Status: Fail (Grade F / GPA 0.00)</strong><br/>
        ${boardResult.formulaText}
      </div>
    ` : hasOptional ? `
      <div class="formula-note">
        <strong>📋 Bangladesh Education Board GPA Calculation Breakdown:</strong><br/>
        • Compulsory Subjects Total GP: <strong>${boardResult.compulsorySumGP.toFixed(2)}</strong> (Divisor = <strong>${boardResult.compulsoryCount}</strong> subjects)<br/>
        • 4th / Optional Subject Bonus (Points above 2.00): <strong>+${boardResult.optionalBonusGP.toFixed(2)}</strong><br/>
        • Formula: <code>GPA = ${boardResult.formulaText}</code>
      </div>
    ` : `
      <div class="formula-note">
        <strong>📋 Board GPA Calculation:</strong> Total GP <strong>${boardResult.compulsorySumGP.toFixed(2)}</strong> / <strong>${boardResult.compulsoryCount}</strong> subjects = <strong>${boardResult.finalGPA.toFixed(2)}</strong> (Grade: <strong>${boardResult.finalGrade}</strong>)
      </div>
    `}

    <div class="result-box">
      <div class="result-item"><div class="val">${(boardResult.finalGPA || data.finalGPA).toFixed(2)}</div><div class="lbl">Final GPA</div></div>
      <div class="result-item"><div class="val">${boardResult.finalGrade || data.finalGrade}</div><div class="lbl">Final Grade</div></div>
      <div class="result-item"><div class="val">${data.totalMarks}</div><div class="lbl">Total Marks</div></div>
      <div class="result-item"><div class="val">#${data.position}</div><div class="lbl">Class Position</div></div>
    </div>
    <div class="sig-row">
      <div class="sig-item"><div class="sig-line">Class Teacher</div></div>
      <div class="sig-item"><div class="sig-line">Guardian</div></div>
      <div class="sig-item">
        ${principalSigUrl ? `<img src="${principalSigUrl}" alt="Principal" style="max-height:36px;margin:0 auto 3px;display:block;" />` : ""}
        <div class="sig-line">Principal</div>
      </div>
    </div>
    <div class="footer">Printed on ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })} | Bangladesh Education Board Standard Grading System</div>
  </body></html>`;

  await printHtmlDocument({
    title: `Marksheet - ${data.studentName}`,
    html,
  });
};


