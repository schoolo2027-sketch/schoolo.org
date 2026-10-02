// Bangladesh Education Board Grading System (SSC / HSC / NCTB Standard)

export interface GradeInfo {
  grade: string;
  gpa: number;
}

export const getGradeFromMarks = (obtained: number, total: number): GradeInfo => {
  if (total <= 0) return { grade: "F", gpa: 0 };
  const percentage = (obtained / total) * 100;
  return getGradeFromPercentage(percentage);
};

export const getGradeFromPercentage = (percentage: number): GradeInfo => {
  if (percentage >= 80) return { grade: "A+", gpa: 5.0 };
  if (percentage >= 70) return { grade: "A", gpa: 4.0 };
  if (percentage >= 60) return { grade: "A-", gpa: 3.5 };
  if (percentage >= 50) return { grade: "B", gpa: 3.0 };
  if (percentage >= 40) return { grade: "C", gpa: 2.0 };
  if (percentage >= 33) return { grade: "D", gpa: 1.0 };
  return { grade: "F", gpa: 0.0 };
};

export const calculateFinalGPA = (gpas: number[]): number => {
  if (gpas.length === 0) return 0;
  if (gpas.some(g => g === 0)) return 0;
  const avg = gpas.reduce((a, b) => a + b, 0) / gpas.length;
  return Math.min(5, Math.round(avg * 100) / 100);
};

export interface GpaEntry {
  name?: string;
  gpa: number;
  isOptional?: boolean;
}

export interface PaperMarkEntry {
  id?: string;
  name: string;
  obtained: number;
  total: number;
  cq?: number;
  mcq?: number;
  practical?: number;
  ct?: number;
  mt?: number;
  grade?: string;
  gpa?: number;
  isOptional?: boolean;
  missing?: boolean;
}

export interface CombinedSubjectResult {
  parentSubject: string;
  displayName: string;
  papers: PaperMarkEntry[];
  totalObtained: number;
  totalFullMarks: number;
  percentage: number;
  grade: string;
  gpa: number;
  isOptional: boolean;
  isPassed: boolean;
  paperCount: number;
  isCombined: boolean;
  hasPaperFailure?: boolean;
  failedPapers?: string[];
}

export interface BoardCalculationResult {
  subjects: CombinedSubjectResult[];
  compulsorySubjects: CombinedSubjectResult[];
  optionalSubjects: CombinedSubjectResult[];
  compulsoryCount: number;
  compulsorySumGP: number;
  compulsoryPassed: boolean;
  failedCompulsorySubjects: CombinedSubjectResult[];
  optionalBonusGP: number;
  totalPoints: number;
  finalGPA: number;
  finalGrade: string;
  isPassed: boolean;
  totalObtained: number;
  totalFullMarks: number;
  overallPercentage: number;
  formulaText: string;
  summaryNote: string;
}

export interface ExtractedSubjectInfo {
  parentSubject: string;
  paperName: string;
  isPaper: boolean;
  paperNumber?: 1 | 2;
  isOptionalTag?: boolean;
}

const LOWER_CLASS_NAMES = [
  "play", "nursery", "kg",
  "class 1", "class 2", "class 3", "class 4", "class 5",
  "class 6", "class 7", "class 8",
];

export const isLowerClassGrading = (className?: string): boolean => {
  if (!className) return false;
  return LOWER_CLASS_NAMES.includes(className.trim().toLowerCase());
};

/**
 * Normalizes and extracts parent subject and paper info from a raw subject title.
 * Examples:
 *  - "Bangla 1st Paper" -> { parentSubject: "Bangla", paperName: "1st Paper", isPaper: true, paperNumber: 1 }
 *  - "Bangla 2nd Paper" -> { parentSubject: "Bangla", paperName: "2nd Paper", isPaper: true, paperNumber: 2 }
 *  - "বাংলা ১ম পত্র" -> { parentSubject: "বাংলা", paperName: "১ম পত্র", isPaper: true, paperNumber: 1 }
 *  - "English 1st Paper" -> { parentSubject: "English", paperName: "1st Paper", isPaper: true, paperNumber: 1 }
 *  - "Physics 1st Paper" -> { parentSubject: "Physics", paperName: "1st Paper", isPaper: true, paperNumber: 1 }
 */
export const extractSubjectAndPaper = (rawName: string): ExtractedSubjectInfo => {
  let cleaned = (rawName || "").trim();
  let isOptionalTag = false;

  // Detect and strip (4th Subject) / (Optional) / [4th Subject]
  const optTagPattern = /(?:\((?:4th\s*subject|optional|৪র্থ\s*বিষয়|ঐচ্ছিক)\)|\[(?:4th\s*subject|optional|৪র্থ\s*বিষয়|ঐচ্ছিক)\])/i;
  if (optTagPattern.test(cleaned)) {
    isOptionalTag = true;
    cleaned = cleaned.replace(new RegExp(optTagPattern.source, "gi"), " ").trim();
  }

  // Common Paper 1 Regexes
  const paper1Regexes = [
    /^(.*?)\s*[-–:]?\s*(?:1st\s*paper|paper\s*1|first\s*paper|1st|\(1st\s*paper\)|\(paper\s*1\))$/i,
    /^(.*?)\s*[-–:]?\s*(?:১ম\s*পত্র|প্রথম\s*পত্র|১ম|\(১ম\s*পত্র\))$/i,
  ];

  for (const regex of paper1Regexes) {
    const match = cleaned.match(regex);
    if (match && match[1]?.trim()) {
      return {
        parentSubject: match[1].trim(),
        paperName: "1st Paper",
        isPaper: true,
        paperNumber: 1,
        isOptionalTag,
      };
    }
  }

  // Common Paper 2 Regexes
  const paper2Regexes = [
    /^(.*?)\s*[-–:]?\s*(?:2nd\s*paper|paper\s*2|second\s*paper|2nd|\(2nd\s*paper\)|\(paper\s*2\))$/i,
    /^(.*?)\s*[-–:]?\s*(?:২য়\s*পত্র|২য়\s*পত্র|দ্বিতীয়\s*পত্র|দ্বিতীয়\s*পত্র|২য়|২য়|\(২য়\s*পত্র\)|\(২য়\s*পত্র\))$/i,
  ];

  for (const regex of paper2Regexes) {
    const match = cleaned.match(regex);
    if (match && match[1]?.trim()) {
      return {
        parentSubject: match[1].trim(),
        paperName: "2nd Paper",
        isPaper: true,
        paperNumber: 2,
        isOptionalTag,
      };
    }
  }

  return {
    parentSubject: cleaned || "Unknown Subject",
    paperName: "",
    isPaper: false,
    isOptionalTag,
  };
};

/**
 * Checks whether an individual paper is failed.
 */
export const isPaperFailed = (paper: PaperMarkEntry): boolean => {
  const total = Number(paper.total) || 100;
  const obtained = Number(paper.obtained) || 0;
  if (paper.gpa !== undefined && paper.gpa === 0) return true;
  if (paper.grade === "F") return true;
  if (total > 0 && (obtained / total) * 100 < 33) return true;
  return false;
};

/**
 * Groups individual paper entries (e.g., Bangla 1st Paper + Bangla 2nd Paper) into unified Subjects
 * and computes combined marks, percentages, Grades, and Grade Points (GP) per NCTB / Board rules.
 *
 * For Play - Class 8: keeps individual subjects separate without grouping.
 * For Class 9 - 12:
 *  - Groups Bangla 1st & 2nd -> Bangla
 *  - Groups English 1st & 2nd -> English
 *  - If either paper in a group is failed, the combined subject is considered FAILED.
 */
export const groupPapersIntoSubjects = (
  rawPapers: PaperMarkEntry[],
  optionalSubjectChecker?: (subjectName: string) => boolean,
  className?: string
): CombinedSubjectResult[] => {
  // If lower class (Play to Class 8), return subjects individually without combining papers
  if (isLowerClassGrading(className)) {
    return rawPapers.map((paper) => {
      const totalObtained = Number(paper.obtained) || 0;
      const totalFullMarks = Number(paper.total) || 100;
      const percentage = totalFullMarks > 0 ? (totalObtained / totalFullMarks) * 100 : 0;
      const { grade, gpa } = paper.grade && paper.gpa !== undefined
        ? { grade: paper.grade, gpa: paper.gpa }
        : getGradeFromMarks(totalObtained, totalFullMarks);
      const isPassed = grade !== "F" && gpa > 0;
      const isOpt = !!(
        paper.isOptional ||
        (optionalSubjectChecker && optionalSubjectChecker(paper.name))
      );

      return {
        parentSubject: paper.name,
        displayName: paper.name,
        papers: [paper],
        totalObtained,
        totalFullMarks,
        percentage: Math.round(percentage * 100) / 100,
        grade,
        gpa,
        isOptional: isOpt,
        isPassed,
        paperCount: 1,
        isCombined: false,
        hasPaperFailure: !isPassed,
        failedPapers: isPassed ? [] : [paper.name],
      };
    });
  }

  // Class 9-12 or Standard Board Grouping
  const groups: Record<string, { parentSubject: string; papers: PaperMarkEntry[]; isOptional: boolean }> = {};

  rawPapers.forEach((paper) => {
    const info = extractSubjectAndPaper(paper.name);
    const parentKey = info.parentSubject.toLowerCase();

    if (!groups[parentKey]) {
      const isOpt = !!(
        paper.isOptional ||
        info.isOptionalTag ||
        (optionalSubjectChecker && (optionalSubjectChecker(paper.name) || optionalSubjectChecker(info.parentSubject)))
      );
      groups[parentKey] = {
        parentSubject: info.parentSubject,
        papers: [],
        isOptional: isOpt,
      };
    } else if (paper.isOptional || info.isOptionalTag) {
      groups[parentKey].isOptional = true;
    }

    groups[parentKey].papers.push(paper);
  });

  return Object.values(groups).map((group) => {
    const totalObtained = group.papers.reduce((sum, p) => sum + (Number(p.obtained) || 0), 0);
    const totalFullMarks = group.papers.reduce((sum, p) => sum + (Number(p.total) || 100), 0);
    const percentage = totalFullMarks > 0 ? (totalObtained / totalFullMarks) * 100 : 0;
    const rawGradeInfo = getGradeFromMarks(totalObtained, totalFullMarks);

    const paperCount = group.papers.length;
    const isCombined = paperCount > 1;

    // Check if any individual paper in this group failed
    const failedPaperList = group.papers
      .filter((p) => isPaperFailed(p))
      .map((p) => p.name);
    const hasPaperFailure = failedPaperList.length > 0;

    // Per board rules for Class 9-10 & 11-12:
    // If student fails in any paper of Bangla or English, the combined subject is marked F (GPA 0)
    let grade = rawGradeInfo.grade;
    let gpa = rawGradeInfo.gpa;
    let isPassed = rawGradeInfo.grade !== "F" && rawGradeInfo.gpa > 0;

    if (hasPaperFailure) {
      grade = "F";
      gpa = 0.0;
      isPassed = false;
    }

    let displayName = group.parentSubject;
    if (isCombined) {
      displayName = `${group.parentSubject} (Combined ${paperCount} Papers)`;
    } else if (group.papers.length === 1 && group.papers[0].name !== group.parentSubject) {
      displayName = group.papers[0].name;
    }

    return {
      parentSubject: group.parentSubject,
      displayName,
      papers: group.papers,
      totalObtained,
      totalFullMarks,
      percentage: Math.round(percentage * 100) / 100,
      grade,
      gpa,
      isOptional: group.isOptional,
      isPassed,
      paperCount,
      isCombined,
      hasPaperFailure,
      failedPapers: failedPaperList,
    };
  });
};

/**
 * Full Bangladesh Education Board (NCTB / SSC / HSC) Result & GPA Calculation System:
 * 1. Play -> Class 8: Evaluates subjects directly without combined papers.
 * 2. Class 9 -> 12:
 *    - Groups Bangla 1st + 2nd into single "Bangla" subject (average marks/GPA).
 *    - Groups English 1st + 2nd into single "English" subject (average marks/GPA).
 *    - Failing either paper results in subject failure.
 *    - Optional (4th) Subject GP > 2.00 provides bonus points: max(Optional GP - 2.00, 0).
 *    - Failing Optional subject does NOT fail the overall result.
 *    - Failing any Compulsory subject results in overall result FAIL (GPA 0.00, Grade F).
 *    - Divisor is strictly Compulsory subjects count.
 *    - Max GPA capped at 5.00.
 */
export const calculateBangladeshBoardResult = (
  rawPapers: PaperMarkEntry[],
  optionalSubjectChecker?: (subjectName: string) => boolean,
  className?: string
): BoardCalculationResult => {
  const subjects = groupPapersIntoSubjects(rawPapers, optionalSubjectChecker, className);

  const compulsorySubjects = subjects.filter((s) => !s.isOptional);
  const optionalSubjects = subjects.filter((s) => s.isOptional);

  const compulsoryCount = compulsorySubjects.length;
  const optionalCount = optionalSubjects.length;

  const totalObtained = subjects.reduce((sum, s) => sum + s.totalObtained, 0);
  const totalFullMarks = subjects.reduce((sum, s) => sum + s.totalFullMarks, 0);
  const overallPercentage = totalFullMarks > 0 ? Math.round((totalObtained / totalFullMarks) * 10000) / 100 : 0;

  const failedCompulsory = compulsorySubjects.filter((s) => !s.isPassed || s.gpa === 0);
  const compulsoryPassed = compulsoryCount > 0 && failedCompulsory.length === 0;

  // Optional Subject Bonus Points = max(0, Optional GP - 2.00)
  const optionalBonusGP = optionalSubjects.reduce((sum, s) => {
    const bonus = s.gpa > 2.0 ? Math.round((s.gpa - 2.0) * 100) / 100 : 0;
    return sum + bonus;
  }, 0);

  // If no subjects at all
  if (compulsoryCount === 0 && optionalCount === 0) {
    return {
      subjects: [],
      compulsorySubjects: [],
      optionalSubjects: [],
      compulsoryCount: 0,
      compulsorySumGP: 0,
      compulsoryPassed: false,
      failedCompulsorySubjects: [],
      optionalBonusGP: 0,
      totalPoints: 0,
      finalGPA: 0,
      finalGrade: "F",
      isPassed: false,
      totalObtained: 0,
      totalFullMarks: 0,
      overallPercentage: 0,
      formulaText: "No subjects found",
      summaryNote: "No examination records entered.",
    };
  }

  // If only optional subjects exist
  if (compulsoryCount === 0) {
    const rawGpa = optionalSubjects.reduce((sum, o) => sum + o.gpa, 0) / optionalCount;
    const finalGPA = Math.min(5, Math.round(rawGpa * 100) / 100);
    return {
      subjects,
      compulsorySubjects: [],
      optionalSubjects,
      compulsoryCount: 0,
      compulsorySumGP: 0,
      compulsoryPassed: true,
      failedCompulsorySubjects: [],
      optionalBonusGP: 0,
      totalPoints: optionalSubjects.reduce((sum, o) => sum + o.gpa, 0),
      finalGPA,
      finalGrade: getGradeFromGPA(finalGPA),
      isPassed: finalGPA > 0,
      totalObtained,
      totalFullMarks,
      overallPercentage,
      formulaText: `GPA = ${finalGPA.toFixed(2)}`,
      summaryNote: "Calculated based on available subjects.",
    };
  }

  const compulsorySumGP = compulsorySubjects.reduce((sum, s) => sum + (Number(s.gpa) || 0), 0);

  // If any compulsory subject failed, final GPA is 0.00 (F)
  if (!compulsoryPassed) {
    const failedNames = failedCompulsory.map((s) => s.displayName).join(", ");
    return {
      subjects,
      compulsorySubjects,
      optionalSubjects,
      compulsoryCount,
      compulsorySumGP,
      compulsoryPassed: false,
      failedCompulsorySubjects: failedCompulsory,
      optionalBonusGP,
      totalPoints: compulsorySumGP + optionalBonusGP,
      finalGPA: 0,
      finalGrade: "F",
      isPassed: false,
      totalObtained,
      totalFullMarks,
      overallPercentage,
      formulaText: `Failed in ${failedCompulsory.length} compulsory subject(s): ${failedNames}`,
      summaryNote: `Result: FAILED. Must pass all compulsory subjects.`,
    };
  }

  // All compulsory subjects passed
  const totalPoints = Math.round((compulsorySumGP + optionalBonusGP) * 100) / 100;
  const rawFinalGPA = totalPoints / compulsoryCount;
  const finalGPA = Math.min(5.0, Math.round(rawFinalGPA * 100) / 100);
  const finalGrade = getGradeFromGPA(finalGPA);

  let formulaText = "";
  if (optionalBonusGP > 0) {
    formulaText = `(${compulsorySumGP.toFixed(2)} Compulsory GP + ${optionalBonusGP.toFixed(2)} Optional Bonus) / ${compulsoryCount} = ${finalGPA.toFixed(2)}`;
  } else {
    formulaText = `${compulsorySumGP.toFixed(2)} Compulsory GP / ${compulsoryCount} = ${finalGPA.toFixed(2)}`;
  }

  let summaryNote = `PASSED — Grade ${finalGrade} (GPA ${finalGPA.toFixed(2)})`;
  if (optionalBonusGP > 0) {
    summaryNote += ` with +${optionalBonusGP.toFixed(2)} Optional Subject bonus`;
  }

  return {
    subjects,
    compulsorySubjects,
    optionalSubjects,
    compulsoryCount,
    compulsorySumGP,
    compulsoryPassed: true,
    failedCompulsorySubjects: [],
    optionalBonusGP,
    totalPoints,
    finalGPA,
    finalGrade,
    isPassed: true,
    totalObtained,
    totalFullMarks,
    overallPercentage,
    formulaText,
    summaryNote,
  };
};

export interface GpaCalculationBreakdown {
  mainCount: number;
  mainSum: number;
  mainPassed: boolean;
  optionalCount: number;
  optionalBonus: number;
  optionalDetails: { name: string; gpa: number; bonus: number }[];
  totalPoints: number;
  finalGPA: number;
  finalGrade: string;
  isPassed: boolean;
  formulaText: string;
}

export const calculateFinalGPAWithOptional = (entries: GpaEntry[]): number => {
  const breakdown = calculateGpaBreakdown(entries);
  return breakdown.finalGPA;
};

export const calculateGpaBreakdown = (entries: GpaEntry[]): GpaCalculationBreakdown => {
  const main = entries.filter(e => !e.isOptional);
  const optional = entries.filter(e => e.isOptional);

  const mainCount = main.length;
  const optionalCount = optional.length;

  const mainPassed = mainCount > 0 && !main.some(e => e.gpa === 0);
  const mainSum = main.reduce((sum, e) => sum + (Number(e.gpa) || 0), 0);

  const optionalDetails = optional.map(e => {
    const gpa = Number(e.gpa) || 0;
    const bonus = gpa > 2.0 ? Math.round((gpa - 2.0) * 100) / 100 : 0;
    return {
      name: e.name || "Optional Subject",
      gpa,
      bonus,
    };
  });

  const optionalBonus = optionalDetails.reduce((sum, o) => sum + o.bonus, 0);

  if (mainCount === 0 && optionalCount === 0) {
    return {
      mainCount: 0,
      mainSum: 0,
      mainPassed: false,
      optionalCount: 0,
      optionalBonus: 0,
      optionalDetails: [],
      totalPoints: 0,
      finalGPA: 0,
      finalGrade: "F",
      isPassed: false,
      formulaText: "N/A",
    };
  }

  if (mainCount === 0) {
    const rawGpa = optional.reduce((sum, o) => sum + o.gpa, 0) / optionalCount;
    const finalGPA = Math.min(5, Math.round(rawGpa * 100) / 100);
    return {
      mainCount: 0,
      mainSum: 0,
      mainPassed: true,
      optionalCount,
      optionalBonus: 0,
      optionalDetails,
      totalPoints: optional.reduce((sum, o) => sum + o.gpa, 0),
      finalGPA,
      finalGrade: getGradeFromGPA(finalGPA),
      isPassed: finalGPA > 0,
      formulaText: `GPA = ${finalGPA.toFixed(2)}`,
    };
  }

  if (!mainPassed) {
    return {
      mainCount,
      mainSum,
      mainPassed: false,
      optionalCount,
      optionalBonus,
      optionalDetails,
      totalPoints: mainSum + optionalBonus,
      finalGPA: 0,
      finalGrade: "F",
      isPassed: false,
      formulaText: "Failed in compulsory subject(s)",
    };
  }

  const totalPoints = mainSum + optionalBonus;
  const rawGpa = totalPoints / mainCount;
  const finalGPA = Math.min(5, Math.round(rawGpa * 100) / 100);
  const finalGrade = getGradeFromGPA(finalGPA);

  const formulaText = optionalBonus > 0
    ? `(${mainSum.toFixed(2)} + ${optionalBonus.toFixed(2)}) / ${mainCount} = ${finalGPA.toFixed(2)}`
    : `${mainSum.toFixed(2)} / ${mainCount} = ${finalGPA.toFixed(2)}`;

  return {
    mainCount,
    mainSum,
    mainPassed: true,
    optionalCount,
    optionalBonus,
    optionalDetails,
    totalPoints,
    finalGPA,
    finalGrade,
    isPassed: true,
    formulaText,
  };
};

export const getGradeFromGPA = (gpa: number): string => {
  if (gpa >= 5.0) return "A+";
  if (gpa >= 4.0) return "A";
  if (gpa >= 3.5) return "A-";
  if (gpa >= 3.0) return "B";
  if (gpa >= 2.0) return "C";
  if (gpa >= 1.0) return "D";
  return "F";
};

export const getGradeColor = (grade: string): string => {
  switch (grade) {
    case "A+": return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400";
    case "A": return "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400";
    case "A-": return "text-teal-600 bg-teal-50 dark:bg-teal-950/30 dark:text-teal-400";
    case "B": return "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400";
    case "C": return "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400";
    case "D": return "text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400";
    default: return "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400";
  }
};
