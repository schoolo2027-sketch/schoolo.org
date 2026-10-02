import { GradeEntry, Course, PeriodInfo, AttendanceRecord } from '../types';
import { PERIOD_DEFINITIONS } from '../data/mockData';

export function calculateCourseAverage(studentId: string, courseId: string, grades: GradeEntry[]): number {
  const courseGrades = grades.filter(g => g.studentId === studentId && g.courseId === courseId);
  if (courseGrades.length === 0) return 92; // baseline default

  const totalWeight = courseGrades.reduce((acc, g) => acc + g.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = courseGrades.reduce((acc, g) => {
    const percentage = (g.score / g.maxScore) * 100;
    return acc + percentage * g.weight;
  }, 0);

  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

export function getLetterGrade(percentage: number): { letter: string; gpaPoints: number; colorClass: string } {
  if (percentage >= 93) return { letter: 'A', gpaPoints: 4.0, colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (percentage >= 90) return { letter: 'A-', gpaPoints: 3.7, colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (percentage >= 87) return { letter: 'B+', gpaPoints: 3.3, colorClass: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (percentage >= 83) return { letter: 'B', gpaPoints: 3.0, colorClass: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (percentage >= 80) return { letter: 'B-', gpaPoints: 2.7, colorClass: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (percentage >= 77) return { letter: 'C+', gpaPoints: 2.3, colorClass: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (percentage >= 73) return { letter: 'C', gpaPoints: 2.0, colorClass: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (percentage >= 70) return { letter: 'C-', gpaPoints: 1.7, colorClass: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (percentage >= 65) return { letter: 'D', gpaPoints: 1.0, colorClass: 'bg-rose-50 text-rose-700 border-rose-200' };
  return { letter: 'F', gpaPoints: 0.0, colorClass: 'bg-rose-100 text-rose-800 border-rose-300' };
}

export function calculateStudentGPA(studentId: string, courses: Course[], grades: GradeEntry[]): number {
  let totalPoints = 0;
  let totalCredits = 0;

  courses.forEach(course => {
    const avg = calculateCourseAverage(studentId, course.id, grades);
    const { gpaPoints } = getLetterGrade(avg);
    totalPoints += gpaPoints * course.credits;
    totalCredits += course.credits;
  });

  if (totalCredits === 0) return 4.0;
  return Math.round((totalPoints / totalCredits) * 100) / 100;
}

export function calculateAttendanceStats(studentId: string, attendance: AttendanceRecord[]) {
  const records = attendance.filter(a => a.studentId === studentId);
  if (records.length === 0) {
    return { rate: 98.2, present: 45, absent: 1, late: 1, excused: 1 };
  }

  let present = 0;
  let late = 0;
  let absent = 0;
  let excused = 0;

  records.forEach(r => {
    if (r.status === 'present') present++;
    else if (r.status === 'late') late++;
    else if (r.status === 'absent') absent++;
    else if (r.status === 'excused') excused++;
  });

  const total = present + late + absent + excused;
  const effectivePresent = present + late * 0.75 + excused * 0.9;
  const rate = total > 0 ? Math.round((effectivePresent / total) * 1000) / 10 : 100;

  return { rate, present, late, absent, excused };
}

export function getCurrentPeriod(timeStr: string): {
  currentPeriod: PeriodInfo | null;
  nextPeriod: PeriodInfo | null;
  minutesRemaining: number;
} {
  const [h, m] = timeStr.split(':').map(Number);
  const currentMinutes = h * 60 + m;

  for (let i = 0; i < PERIOD_DEFINITIONS.length; i++) {
    const p = PERIOD_DEFINITIONS[i];
    const [startH, startM] = p.startTime.split(':').map(Number);
    const [endH, endM] = p.endTime.split(':').map(Number);

    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    if (currentMinutes >= startMin && currentMinutes < endMin) {
      const nextP = i + 1 < PERIOD_DEFINITIONS.length ? PERIOD_DEFINITIONS[i + 1] : null;
      return {
        currentPeriod: p,
        nextPeriod: nextP,
        minutesRemaining: endMin - currentMinutes
      };
    }
  }

  // If outside periods, find upcoming next period
  for (let i = 0; i < PERIOD_DEFINITIONS.length; i++) {
    const p = PERIOD_DEFINITIONS[i];
    const [startH, startM] = p.startTime.split(':').map(Number);
    const startMin = startH * 60 + startM;

    if (currentMinutes < startMin) {
      return {
        currentPeriod: null,
        nextPeriod: p,
        minutesRemaining: startMin - currentMinutes
      };
    }
  }

  return {
    currentPeriod: null,
    nextPeriod: PERIOD_DEFINITIONS[0],
    minutesRemaining: 0
  };
}
