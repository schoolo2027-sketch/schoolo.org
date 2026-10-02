export type Role = 'admin' | 'teacher' | 'student' | 'parent';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type GradeCategory = 'homework' | 'quiz' | 'project' | 'midterm' | 'final' | 'participation';

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  avatar: string;
  grade: string; // e.g. "10th Grade"
  section: string; // e.g. "Section A"
  email: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  address: string;
  enrolledCourseIds: string[];
  attendanceRate: number; // e.g. 96.5
  gpa: number; // e.g. 3.85
  status: 'active' | 'at-risk' | 'honor-roll' | 'probation';
  notes?: string;
}

export interface Course {
  id: string;
  code: string; // e.g. "MTH-301"
  name: string; // e.g. "AP Calculus BC"
  department: string; // "Mathematics"
  teacherName: string;
  teacherEmail: string;
  room: string;
  credits: number;
  gradeLevel: string;
  color: string; // Tailwind color token or hex
  accentColor: string;
  iconName: string;
}

export interface ScheduleSlot {
  id: string;
  courseId: string;
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  period: number; // 1 to 7
  startTime: string; // "08:30"
  endTime: string; // "09:20"
  room: string;
  gradeLevel: string;
  section: string;
}

export interface GradeEntry {
  id: string;
  studentId: string;
  courseId: string;
  title: string;
  category: GradeCategory;
  score: number; // e.g. 92
  maxScore: number; // e.g. 100
  weight: number; // e.g. 15 (%)
  date: string; // YYYY-MM-DD
  feedback?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  period: number;
  status: AttendanceStatus;
  notes?: string;
  timestamp: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  role: string;
  date: string;
  priority: 'normal' | 'high' | 'urgent';
  targetAudience: 'all' | 'students' | 'teachers' | 'parents';
}

export interface PeriodInfo {
  period: number;
  name: string;
  startTime: string; // "08:30"
  endTime: string; // "09:20"
  isBreak?: boolean;
}

export interface SimulatedTime {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  time: string; // "HH:MM"
  isManual: boolean;
}
