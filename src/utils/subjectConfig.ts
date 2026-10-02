// Bangladesh Curriculum Subject Configuration
// Maps subjects to class levels, groups, and optional (4th) subjects

export interface SubjectConfig {
  name: string;
  group?: "Compulsory" | "Common" | "Science" | "Business Studies" | "Humanities";
  isPaper?: boolean;
  paperNumber?: 1 | 2;
  parentSubject?: string;
  isOptional?: boolean;
  defaultFullMarks?: number;
}

export interface ClassGroupStructure {
  id: "all" | "Science" | "Business Studies" | "Humanities" | "Optional";
  name: string;
  nameBn: string;
  description: string;
}

const PLAY_NURSERY_KG: SubjectConfig[] = [
  { name: "Bangla", defaultFullMarks: 100 },
  { name: "English", defaultFullMarks: 100 },
  { name: "Mathematics", defaultFullMarks: 100 },
  { name: "General Knowledge", defaultFullMarks: 50 },
  { name: "Drawing", defaultFullMarks: 50 },
  { name: "Arabic / Religion", defaultFullMarks: 50 },
];

const CLASS_1_TO_3: SubjectConfig[] = [
  { name: "Bangla", defaultFullMarks: 100 },
  { name: "English", defaultFullMarks: 100 },
  { name: "Mathematics", defaultFullMarks: 100 },
  { name: "Bangladesh and Global Studies", defaultFullMarks: 100 },
  { name: "Science", defaultFullMarks: 100 },
  { name: "Religion", defaultFullMarks: 100 },
  { name: "Drawing", defaultFullMarks: 50 },
];

const CLASS_4_TO_5: SubjectConfig[] = [
  { name: "Bangla", defaultFullMarks: 100 },
  { name: "English", defaultFullMarks: 100 },
  { name: "Mathematics", defaultFullMarks: 100 },
  { name: "Bangladesh and Global Studies", defaultFullMarks: 100 },
  { name: "Primary Science", defaultFullMarks: 100 },
  { name: "Religion & Moral Education", defaultFullMarks: 100 },
  { name: "ICT", defaultFullMarks: 50 },
];

const CLASS_6_TO_8: SubjectConfig[] = [
  { name: "Bangla", defaultFullMarks: 100 },
  { name: "English", defaultFullMarks: 100 },
  { name: "Mathematics", defaultFullMarks: 100 },
  { name: "General Science", defaultFullMarks: 100 },
  { name: "Bangladesh and Global Studies", defaultFullMarks: 100 },
  { name: "Religion & Moral Education", defaultFullMarks: 100 },
  { name: "ICT", defaultFullMarks: 50 },
  { name: "Agriculture Studies / Home Science", defaultFullMarks: 100 },
  { name: "Physical Education & Health", defaultFullMarks: 50 },
  { name: "Arts and Crafts", defaultFullMarks: 50 },
];

// Class 9-10 (SSC) Common Subjects for all groups (Combined)
export const SSC_COMMON_SUBJECTS: SubjectConfig[] = [
  { name: "Bangla 1st Paper", group: "Common", isPaper: true, paperNumber: 1, parentSubject: "Bangla", defaultFullMarks: 100 },
  { name: "Bangla 2nd Paper", group: "Common", isPaper: true, paperNumber: 2, parentSubject: "Bangla", defaultFullMarks: 100 },
  { name: "English 1st Paper", group: "Common", isPaper: true, paperNumber: 1, parentSubject: "English", defaultFullMarks: 100 },
  { name: "English 2nd Paper", group: "Common", isPaper: true, paperNumber: 2, parentSubject: "English", defaultFullMarks: 100 },
  { name: "Mathematics", group: "Common", defaultFullMarks: 100 },
  { name: "Information & Communication Technology (ICT)", group: "Common", defaultFullMarks: 50 },
  { name: "Religion & Moral Education", group: "Common", defaultFullMarks: 100 },
  { name: "Physical Education, Health & Sports", group: "Common", defaultFullMarks: 100 },
  { name: "Career Education", group: "Common", defaultFullMarks: 50 },
];

// Class 9-10 Science Group Core Subjects
export const SSC_SCIENCE_CORE: SubjectConfig[] = [
  { name: "Physics", group: "Science", defaultFullMarks: 100 },
  { name: "Chemistry", group: "Science", defaultFullMarks: 100 },
  { name: "Biology", group: "Science", defaultFullMarks: 100 },
  { name: "Higher Mathematics", group: "Science", defaultFullMarks: 100 },
  { name: "Bangladesh and Global Studies", group: "Science", defaultFullMarks: 100 },
];

// Class 9-10 Science Group Optional (4th) Subjects
export const SSC_SCIENCE_OPTIONAL: SubjectConfig[] = [
  { name: "Higher Mathematics", group: "Science", isOptional: true, defaultFullMarks: 100 },
  { name: "Biology", group: "Science", isOptional: true, defaultFullMarks: 100 },
  { name: "Agriculture Studies", group: "Science", isOptional: true, defaultFullMarks: 100 },
  { name: "Home Science", group: "Science", isOptional: true, defaultFullMarks: 100 },
  { name: "Computer Studies", group: "Science", isOptional: true, defaultFullMarks: 100 },
];

// Class 9-10 Business Studies Group Core Subjects
export const SSC_BUSINESS_CORE: SubjectConfig[] = [
  { name: "Accounting", group: "Business Studies", defaultFullMarks: 100 },
  { name: "Finance and Banking", group: "Business Studies", defaultFullMarks: 100 },
  { name: "Business Entrepreneurship", group: "Business Studies", defaultFullMarks: 100 },
  { name: "General Science", group: "Business Studies", defaultFullMarks: 100 },
];

// Class 9-10 Business Studies Optional (4th) Subjects
export const SSC_BUSINESS_OPTIONAL: SubjectConfig[] = [
  { name: "Agriculture Studies", group: "Business Studies", isOptional: true, defaultFullMarks: 100 },
  { name: "Home Science", group: "Business Studies", isOptional: true, defaultFullMarks: 100 },
  { name: "Economics", group: "Business Studies", isOptional: true, defaultFullMarks: 100 },
  { name: "Geography and Environment", group: "Business Studies", isOptional: true, defaultFullMarks: 100 },
  { name: "Finance and Banking", group: "Business Studies", isOptional: true, defaultFullMarks: 100 },
];

// Class 9-10 Humanities Group Core Subjects
export const SSC_HUMANITIES_CORE: SubjectConfig[] = [
  { name: "History of Bangladesh & World Civilization", group: "Humanities", defaultFullMarks: 100 },
  { name: "Geography and Environment", group: "Humanities", defaultFullMarks: 100 },
  { name: "Civics and Citizenship", group: "Humanities", defaultFullMarks: 100 },
  { name: "Economics", group: "Humanities", defaultFullMarks: 100 },
  { name: "General Science", group: "Humanities", defaultFullMarks: 100 },
];

// Class 9-10 Humanities Optional (4th) Subjects
export const SSC_HUMANITIES_OPTIONAL: SubjectConfig[] = [
  { name: "Agriculture Studies", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Home Science", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Economics", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Civics and Citizenship", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Islamic History and Culture", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Logic", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Music", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
];

// Class 11-12 (HSC) Common Subjects
export const HSC_COMMON_SUBJECTS: SubjectConfig[] = [
  { name: "Bangla 1st Paper", group: "Common", isPaper: true, paperNumber: 1, parentSubject: "Bangla", defaultFullMarks: 100 },
  { name: "Bangla 2nd Paper", group: "Common", isPaper: true, paperNumber: 2, parentSubject: "Bangla", defaultFullMarks: 100 },
  { name: "English 1st Paper", group: "Common", isPaper: true, paperNumber: 1, parentSubject: "English", defaultFullMarks: 100 },
  { name: "English 2nd Paper", group: "Common", isPaper: true, paperNumber: 2, parentSubject: "English", defaultFullMarks: 100 },
  { name: "Information & Communication Technology (ICT)", group: "Common", defaultFullMarks: 100 },
];

// Class 11-12 Science
export const HSC_SCIENCE_CORE: SubjectConfig[] = [
  { name: "Physics 1st Paper", group: "Science", isPaper: true, paperNumber: 1, parentSubject: "Physics", defaultFullMarks: 100 },
  { name: "Physics 2nd Paper", group: "Science", isPaper: true, paperNumber: 2, parentSubject: "Physics", defaultFullMarks: 100 },
  { name: "Chemistry 1st Paper", group: "Science", isPaper: true, paperNumber: 1, parentSubject: "Chemistry", defaultFullMarks: 100 },
  { name: "Chemistry 2nd Paper", group: "Science", isPaper: true, paperNumber: 2, parentSubject: "Chemistry", defaultFullMarks: 100 },
  { name: "Biology 1st Paper", group: "Science", isPaper: true, paperNumber: 1, parentSubject: "Biology", defaultFullMarks: 100 },
  { name: "Biology 2nd Paper", group: "Science", isPaper: true, paperNumber: 2, parentSubject: "Biology", defaultFullMarks: 100 },
  { name: "Higher Mathematics 1st Paper", group: "Science", isPaper: true, paperNumber: 1, parentSubject: "Higher Mathematics", defaultFullMarks: 100 },
  { name: "Higher Mathematics 2nd Paper", group: "Science", isPaper: true, paperNumber: 2, parentSubject: "Higher Mathematics", defaultFullMarks: 100 },
];

export const HSC_SCIENCE_OPTIONAL: SubjectConfig[] = [
  { name: "Higher Mathematics", group: "Science", isOptional: true, defaultFullMarks: 100 },
  { name: "Biology", group: "Science", isOptional: true, defaultFullMarks: 100 },
  { name: "Statistics", group: "Science", isOptional: true, defaultFullMarks: 100 },
  { name: "Agriculture Studies", group: "Science", isOptional: true, defaultFullMarks: 100 },
  { name: "Geography", group: "Science", isOptional: true, defaultFullMarks: 100 },
];

// Class 11-12 Business Studies
export const HSC_BUSINESS_CORE: SubjectConfig[] = [
  { name: "Accounting 1st Paper", group: "Business Studies", isPaper: true, paperNumber: 1, parentSubject: "Accounting", defaultFullMarks: 100 },
  { name: "Accounting 2nd Paper", group: "Business Studies", isPaper: true, paperNumber: 2, parentSubject: "Accounting", defaultFullMarks: 100 },
  { name: "Finance, Banking & Insurance 1st Paper", group: "Business Studies", isPaper: true, paperNumber: 1, parentSubject: "Finance", defaultFullMarks: 100 },
  { name: "Finance, Banking & Insurance 2nd Paper", group: "Business Studies", isPaper: true, paperNumber: 2, parentSubject: "Finance", defaultFullMarks: 100 },
  { name: "Business Organization & Management 1st Paper", group: "Business Studies", isPaper: true, paperNumber: 1, parentSubject: "Management", defaultFullMarks: 100 },
  { name: "Business Organization & Management 2nd Paper", group: "Business Studies", isPaper: true, paperNumber: 2, parentSubject: "Management", defaultFullMarks: 100 },
  { name: "Production Management & Marketing 1st Paper", group: "Business Studies", isPaper: true, paperNumber: 1, defaultFullMarks: 100 },
  { name: "Production Management & Marketing 2nd Paper", group: "Business Studies", isPaper: true, paperNumber: 2, defaultFullMarks: 100 },
];

export const HSC_BUSINESS_OPTIONAL: SubjectConfig[] = [
  { name: "Economics", group: "Business Studies", isOptional: true, defaultFullMarks: 100 },
  { name: "Statistics", group: "Business Studies", isOptional: true, defaultFullMarks: 100 },
  { name: "Agriculture Studies", group: "Business Studies", isOptional: true, defaultFullMarks: 100 },
  { name: "Geography", group: "Business Studies", isOptional: true, defaultFullMarks: 100 },
  { name: "Finance, Banking & Insurance", group: "Business Studies", isOptional: true, defaultFullMarks: 100 },
];

// Class 11-12 Humanities
export const HSC_HUMANITIES_CORE: SubjectConfig[] = [
  { name: "History 1st Paper", group: "Humanities", isPaper: true, paperNumber: 1, parentSubject: "History", defaultFullMarks: 100 },
  { name: "History 2nd Paper", group: "Humanities", isPaper: true, paperNumber: 2, parentSubject: "History", defaultFullMarks: 100 },
  { name: "Islamic History & Culture 1st Paper", group: "Humanities", isPaper: true, paperNumber: 1, defaultFullMarks: 100 },
  { name: "Islamic History & Culture 2nd Paper", group: "Humanities", isPaper: true, paperNumber: 2, defaultFullMarks: 100 },
  { name: "Civics & Good Governance 1st Paper", group: "Humanities", isPaper: true, paperNumber: 1, parentSubject: "Civics", defaultFullMarks: 100 },
  { name: "Civics & Good Governance 2nd Paper", group: "Humanities", isPaper: true, paperNumber: 2, parentSubject: "Civics", defaultFullMarks: 100 },
  { name: "Economics 1st Paper", group: "Humanities", isPaper: true, paperNumber: 1, parentSubject: "Economics", defaultFullMarks: 100 },
  { name: "Economics 2nd Paper", group: "Humanities", isPaper: true, paperNumber: 2, parentSubject: "Economics", defaultFullMarks: 100 },
  { name: "Logic 1st Paper", group: "Humanities", isPaper: true, paperNumber: 1, parentSubject: "Logic", defaultFullMarks: 100 },
  { name: "Logic 2nd Paper", group: "Humanities", isPaper: true, paperNumber: 2, parentSubject: "Logic", defaultFullMarks: 100 },
  { name: "Geography 1st Paper", group: "Humanities", isPaper: true, paperNumber: 1, parentSubject: "Geography", defaultFullMarks: 100 },
  { name: "Geography 2nd Paper", group: "Humanities", isPaper: true, paperNumber: 2, parentSubject: "Geography", defaultFullMarks: 100 },
  { name: "Social Work 1st Paper", group: "Humanities", isPaper: true, paperNumber: 1, defaultFullMarks: 100 },
  { name: "Social Work 2nd Paper", group: "Humanities", isPaper: true, paperNumber: 2, defaultFullMarks: 100 },
];

export const HSC_HUMANITIES_OPTIONAL: SubjectConfig[] = [
  { name: "Logic", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Islamic History and Culture", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Civics and Good Governance", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Economics", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Geography", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Social Work", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Agriculture Studies", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
  { name: "Home Science", group: "Humanities", isOptional: true, defaultFullMarks: 100 },
];

export const ALL_CLASSES = [
  "Play", "Nursery", "KG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8",
  "Class 9", "Class 10", "Class 11", "Class 12",
];

export const LOWER_CLASSES = [
  "Play", "Nursery", "KG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8",
];

export const UPPER_CLASSES = ["Class 9", "Class 10", "Class 11", "Class 12"];

export const ALL_SHIFTS = ["Morning", "Day", "Evening"];
export const ALL_VERSIONS = ["Bangla", "English"];
export const ALL_YEARS = Array.from({ length: 25 }, (_, i) => 2020 + i);

/**
 * Normalizes class strings so "Class 10", "10", "Class-10", "Grade 10" all normalize to "10".
 */
export function normalizeClassName(name: string | null | undefined): string {
  if (!name) return "";
  let clean = String(name).toLowerCase().trim();
  // Strip common prefixes: class, grade, shreni, শ্রেণি, standard, std
  clean = clean.replace(/^(class|grade|shreni|শ্রেণি|standard|std)\s*[-_.]?\s*/i, "").trim();
  // Strip whitespace and dashes/underscores
  clean = clean.replace(/[\s_-]+/g, "");
  return clean;
}

/**
 * Robustly checks if two class identifiers represent the same class.
 * Matches "Class 10" with "10", "Class 9" with "9", "KG" with "kg", etc.
 */
export function isMatchingClass(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const strA = String(a).toLowerCase().trim();
  const strB = String(b).toLowerCase().trim();
  if (strA === strB) return true;
  const normA = normalizeClassName(strA);
  const normB = normalizeClassName(strB);
  if (normA && normB && normA === normB) return true;
  return false;
}

export function isGroupBasedClass(className: string): boolean {
  if (!className) return false;
  return UPPER_CLASSES.some(c => isMatchingClass(c, className));
}

export function isLowerClass(className: string): boolean {
  if (!className) return false;
  return LOWER_CLASSES.some(c => isMatchingClass(c, className));
}

export function getSectionsForClass(cls: string): string[] {
  if (!cls) return [];
  if (isGroupBasedClass(cls)) return ["Science", "Business Studies", "Humanities"];
  return ["A", "B", "C"];
}

/**
 * Get curriculum subjects for a given class and optional section/group.
 */
export function getSubjectsForClass(className: string, section?: string): SubjectConfig[] {
  const cls = className?.trim() || "";

  if (["Play", "Nursery", "KG"].includes(cls)) return PLAY_NURSERY_KG;
  if (["Class 1", "Class 2", "Class 3"].includes(cls)) return CLASS_1_TO_3;
  if (["Class 4", "Class 5"].includes(cls)) return CLASS_4_TO_5;
  if (["Class 6", "Class 7", "Class 8"].includes(cls)) return CLASS_6_TO_8;

  if (["Class 9", "Class 10"].includes(cls)) {
    const list: SubjectConfig[] = [...SSC_COMMON_SUBJECTS];
    if (!section || section === "Science") list.push(...SSC_SCIENCE_CORE);
    if (!section || section === "Business Studies" || section === "Business") list.push(...SSC_BUSINESS_CORE);
    if (!section || section === "Humanities" || section === "Arts") list.push(...SSC_HUMANITIES_CORE);
    return list;
  }

  if (["Class 11", "Class 12"].includes(cls)) {
    const list: SubjectConfig[] = [...HSC_COMMON_SUBJECTS];
    if (!section || section === "Science") list.push(...HSC_SCIENCE_CORE);
    if (!section || section === "Business Studies" || section === "Business") list.push(...HSC_BUSINESS_CORE);
    if (!section || section === "Humanities" || section === "Arts") list.push(...HSC_HUMANITIES_CORE);
    return list;
  }

  return [];
}

/**
 * Get subject names list for a class.
 */
export function getSubjectNamesForClass(className: string, section?: string): string[] {
  return getSubjectsForClass(className, section).map(s => s.name);
}

/**
 * Get optional (4th) subject options for a class and section/group.
 */
export function getOptionalSubjectOptions(className: string, section?: string): string[] {
  const cls = className?.trim() || "";
  const sec = (section || "").trim().toLowerCase();

  if (["Class 9", "Class 10"].includes(cls)) {
    if (sec.includes("sci")) {
      return SSC_SCIENCE_OPTIONAL.map(s => s.name);
    }
    if (sec.includes("bus")) {
      return SSC_BUSINESS_OPTIONAL.map(s => s.name);
    }
    if (sec.includes("hum") || sec.includes("art")) {
      return SSC_HUMANITIES_OPTIONAL.map(s => s.name);
    }
    // All unique SSC optional subjects
    const all = [
      ...SSC_SCIENCE_OPTIONAL.map(s => s.name),
      ...SSC_BUSINESS_OPTIONAL.map(s => s.name),
      ...SSC_HUMANITIES_OPTIONAL.map(s => s.name),
    ];
    return Array.from(new Set(all));
  }

  if (["Class 11", "Class 12"].includes(cls)) {
    if (sec.includes("sci")) {
      return HSC_SCIENCE_OPTIONAL.map(s => s.name);
    }
    if (sec.includes("bus")) {
      return HSC_BUSINESS_OPTIONAL.map(s => s.name);
    }
    if (sec.includes("hum") || sec.includes("art")) {
      return HSC_HUMANITIES_OPTIONAL.map(s => s.name);
    }
    const all = [
      ...HSC_SCIENCE_OPTIONAL.map(s => s.name),
      ...HSC_BUSINESS_OPTIONAL.map(s => s.name),
      ...HSC_HUMANITIES_OPTIONAL.map(s => s.name),
    ];
    return Array.from(new Set(all));
  }

  if (["Class 6", "Class 7", "Class 8"].includes(cls)) {
    return ["Agriculture Studies", "Home Science", "Arabic", "Physical Education and Health"];
  }

  return ["Higher Mathematics", "Biology", "Agriculture Studies", "Home Science", "Economics", "Geography"];
}

/**
 * Get hierarchical group details for Class 9-12
 */
export function getClassGroupDetails(className: string) {
  const cls = className?.trim() || "";
  const isSSC = ["Class 9", "Class 10"].includes(cls);
  const isHSC = ["Class 11", "Class 12"].includes(cls);

  if (!isSSC && !isHSC) {
    return null;
  }

  return {
    common: isSSC ? SSC_COMMON_SUBJECTS : HSC_COMMON_SUBJECTS,
    science: {
      core: isSSC ? SSC_SCIENCE_CORE : HSC_SCIENCE_CORE,
      optional: isSSC ? SSC_SCIENCE_OPTIONAL : HSC_SCIENCE_OPTIONAL,
    },
    business: {
      core: isSSC ? SSC_BUSINESS_CORE : HSC_BUSINESS_CORE,
      optional: isSSC ? SSC_BUSINESS_OPTIONAL : HSC_BUSINESS_OPTIONAL,
    },
    humanities: {
      core: isSSC ? SSC_HUMANITIES_CORE : HSC_HUMANITIES_CORE,
      optional: isSSC ? SSC_HUMANITIES_OPTIONAL : HSC_HUMANITIES_OPTIONAL,
    },
  };
}

/**
 * Standard group normalizer
 */
export function normalizeGroupName(groupName?: string): "Science" | "Business Studies" | "Humanities" | null {
  if (!groupName) return null;
  const g = groupName.trim().toLowerCase();
  if (g.includes("sci")) return "Science";
  if (g.includes("bus")) return "Business Studies";
  if (g.includes("hum") || g.includes("art")) return "Humanities";
  return null;
}

/**
 * Get Combined/Common compulsory subjects for Class 9-12
 */
export function getCombinedSubjects(className: string): SubjectConfig[] {
  const cls = className?.trim() || "";
  if (["Class 9", "Class 10"].includes(cls)) return SSC_COMMON_SUBJECTS;
  if (["Class 11", "Class 12"].includes(cls)) return HSC_COMMON_SUBJECTS;
  return getSubjectsForClass(className);
}

/**
 * Get Group Core (mandatory) subjects for a specific group in Class 9-12
 */
export function getGroupCoreSubjects(className: string, groupName: string): SubjectConfig[] {
  const cls = className?.trim() || "";
  const normGroup = normalizeGroupName(groupName);
  if (!normGroup) return [];

  if (["Class 9", "Class 10"].includes(cls)) {
    if (normGroup === "Science") return SSC_SCIENCE_CORE;
    if (normGroup === "Business Studies") return SSC_BUSINESS_CORE;
    if (normGroup === "Humanities") return SSC_HUMANITIES_CORE;
  }

  if (["Class 11", "Class 12"].includes(cls)) {
    if (normGroup === "Science") return HSC_SCIENCE_CORE;
    if (normGroup === "Business Studies") return HSC_BUSINESS_CORE;
    if (normGroup === "Humanities") return HSC_HUMANITIES_CORE;
  }

  return [];
}

/**
 * Get Group 4th / Optional subjects specific to that group in Class 9-12
 */
export function getGroupFourthSubjects(className: string, groupName: string): SubjectConfig[] {
  const cls = className?.trim() || "";
  const normGroup = normalizeGroupName(groupName);
  if (!normGroup) return [];

  if (["Class 9", "Class 10"].includes(cls)) {
    if (normGroup === "Science") return SSC_SCIENCE_OPTIONAL;
    if (normGroup === "Business Studies") return SSC_BUSINESS_OPTIONAL;
    if (normGroup === "Humanities") return SSC_HUMANITIES_OPTIONAL;
  }

  if (["Class 11", "Class 12"].includes(cls)) {
    if (normGroup === "Science") return HSC_SCIENCE_OPTIONAL;
    if (normGroup === "Business Studies") return HSC_BUSINESS_OPTIONAL;
    if (normGroup === "Humanities") return HSC_HUMANITIES_OPTIONAL;
  }

  return [];
}

export interface StudentSubjectPackage {
  className: string;
  groupName: string | null;
  combinedSubjects: string[];
  groupCoreSubjects: string[];
  fourthSubject: string | null;
  totalSubjects: string[];
  totalCount: number;
  formulaDescription: string;
}

/**
 * Calculate total student subjects following Bangladesh Education Board formula:
 * Total Subjects = Combined / Common + Group Core + Selected 4th Subject
 */
export function calculateStudentSubjectPackage(
  className: string,
  sectionOrGroup: string,
  selectedFourthSubject?: string | null,
  customSetups?: any[],
  strictCustomOnly = true,
  selectedGroupSubjects?: string[] | null
): StudentSubjectPackage {
  const cls = className?.trim() || "";
  const normGroup = normalizeGroupName(sectionOrGroup);

  if (!isGroupBasedClass(cls) || !normGroup) {
    // For Class Play to 8 or general classes
    let rawSubjects: string[] = [];
    if (customSetups && customSetups.length > 0) {
      const matched = customSetups.filter((s: any) => {
        const classesArr: string[] = Array.isArray(s.classes) ? s.classes : [s.classes];
        return classesArr.some(c => (c || "").trim().toLowerCase() === cls.toLowerCase());
      });
      if (matched.length > 0) {
        rawSubjects = Array.from(new Set(matched.map((s: any) => s.subject_name).filter(Boolean)));
      }
    }
    // Only fallback to hardcoded curriculum if strictCustomOnly is false and no custom setups provided
    if (rawSubjects.length === 0 && !strictCustomOnly && !customSetups) {
      rawSubjects = getSubjectNamesForClass(cls, sectionOrGroup);
    }

    return {
      className: cls,
      groupName: null,
      combinedSubjects: rawSubjects,
      groupCoreSubjects: [],
      fourthSubject: null,
      totalSubjects: rawSubjects,
      totalCount: rawSubjects.length,
      formulaDescription: rawSubjects.length > 0 
        ? `Standard Class Subjects: ${rawSubjects.length} subjects`
        : `No subjects configured for ${cls || "this class"} in Subject Setup.`,
    };
  }

  // 1. Combined / Common subjects
  let combinedList: string[] = [];
  if (customSetups && customSetups.length > 0) {
    const customCombined = customSetups.filter((s: any) => {
      const classesArr: string[] = Array.isArray(s.classes) ? s.classes : [s.classes];
      const sectionsArr: string[] = Array.isArray(s.sections) ? s.sections : [s.sections];
      const matchClass = classesArr.some(c => (c || "").trim().toLowerCase() === cls.toLowerCase());
      if (!matchClass) return false;
      const isCommonSec = sectionsArr.length === 0 || sectionsArr.some(sec => {
        const l = (sec || "").toLowerCase();
        return l.includes("common") || l.includes("combined") || l === "all";
      });
      return isCommonSec && !s.is_optional;
    });
    if (customCombined.length > 0) {
      combinedList = Array.from(new Set(customCombined.map((s: any) => s.subject_name).filter(Boolean)));
    }
  }
  // Only fallback if customSetups is not provided and strictCustomOnly is false
  if (combinedList.length === 0 && !strictCustomOnly && !customSetups) {
    combinedList = getCombinedSubjects(cls).map(s => s.name);
  }

  // 2. Group Core subjects
  let coreList: string[] = [];
  if (selectedGroupSubjects && selectedGroupSubjects.length > 0) {
    // Explicitly selected group subjects for this student
    coreList = Array.from(new Set(selectedGroupSubjects.map(s => (s || "").trim()).filter(Boolean)));
  } else if (customSetups && customSetups.length > 0) {
    const customCore = customSetups.filter((s: any) => {
      const classesArr: string[] = Array.isArray(s.classes) ? s.classes : [s.classes];
      const sectionsArr: string[] = Array.isArray(s.sections) ? s.sections : [s.sections];
      const matchClass = classesArr.some(c => (c || "").trim().toLowerCase() === cls.toLowerCase());
      if (!matchClass) return false;
      const matchSec = sectionsArr.some(sec => {
        const l = (sec || "").toLowerCase();
        const g = normGroup.toLowerCase();
        if (g === "science") return l === "science";
        if (g === "business studies" || g === "business") return l === "business studies" || l === "business";
        if (g === "humanities" || g === "arts") return l === "humanities" || l === "arts";
        return l === g;
      });
      return matchSec && !s.is_optional;
    });
    if (customCore.length > 0) {
      coreList = Array.from(new Set(customCore.map((s: any) => s.subject_name).filter(Boolean)));
    }
  }
  // Only fallback if customSetups is not provided and strictCustomOnly is false
  if (coreList.length === 0 && !strictCustomOnly && !customSetups && (!selectedGroupSubjects || selectedGroupSubjects.length === 0)) {
    coreList = getGroupCoreSubjects(cls, normGroup).map(s => s.name);
  }

  // 3. Selected 4th subject
  const fourth = selectedFourthSubject?.trim() || null;

  // Filter out duplicate if the selected 4th subject was also in coreList
  // (e.g. Biology was in group subjects and selected as 4th subject -> it moves to 4th subject, leaving Physics, Chemistry, Higher Math in group core!)
  const filteredCore = coreList.filter(cName => {
    if (!fourth) return true;
    return cName.trim().toLowerCase() !== fourth.trim().toLowerCase();
  });

  const filteredCombined = combinedList.filter(cName => {
    if (!fourth) return true;
    return cName.trim().toLowerCase() !== fourth.trim().toLowerCase();
  });

  const allSubjectsSet = new Set<string>();
  filteredCombined.forEach(s => allSubjectsSet.add(s));
  filteredCore.forEach(s => allSubjectsSet.add(s));
  if (fourth) {
    allSubjectsSet.add(fourth);
  }

  const allSubjects = Array.from(allSubjectsSet);
  const formulaDesc = allSubjects.length > 0
    ? `${filteredCombined.length} (Combined) + ${filteredCore.length} (Group Core) + ${fourth ? `1 (4th: ${fourth})` : '0 (No 4th Subject)'} = ${allSubjects.length} Total Subjects`
    : `No subjects configured for ${cls || "this class"} in Subject Setup.`;

  return {
    className: cls,
    groupName: normGroup,
    combinedSubjects: filteredCombined,
    groupCoreSubjects: filteredCore,
    fourthSubject: fourth,
    totalSubjects: allSubjects,
    totalCount: allSubjects.length,
    formulaDescription: formulaDesc,
  };
}
