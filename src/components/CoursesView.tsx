import { useState } from 'react';
import { Course, Student, GradeEntry, ScheduleSlot } from '../types';
import { calculateCourseAverage, getLetterGrade } from '../utils/schoolUtils';
import { 
  BookOpen, 
  User, 
  MapPin, 
  Award, 
  Clock, 
  Plus, 
  Sparkles, 
  CheckCircle2,
  Users,
  Video,
  FileCheck
} from 'lucide-react';

interface CoursesViewProps {
  courses: Course[];
  student: Student;
  grades: GradeEntry[];
  schedule: ScheduleSlot[];
  role: 'admin' | 'teacher' | 'student' | 'parent';
  onOpenVirtualClass: (course: Course) => void;
  onNavigateToGrades: (courseId: string) => void;
}

export default function CoursesView({
  courses,
  student,
  grades,
  schedule,
  role,
  onOpenVirtualClass,
  onNavigateToGrades
}: CoursesViewProps) {
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<Course | null>(null);

  const departments = ['all', ...Array.from(new Set(courses.map(c => c.department)))];

  const filteredCourses = selectedDept === 'all'
    ? courses
    : courses.filter(c => c.department === selectedDept);

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full max-w-7xl mx-auto">
      {/* Header card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Academic Curriculum & Courses</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Fall 2026 Catalog
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {courses.length} Active Courses Offered • Advanced Placement & Honors
            </p>
          </div>
        </div>

        {/* Dept Filter */}
        <div className="flex items-center gap-2">
          {departments.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDept(d)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedDept === d
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d === 'all' ? 'All Departments' : d}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const isEnrolled = student.enrolledCourseIds.includes(course.id);
          const courseGrades = grades.filter(g => g.studentId === student.id && g.courseId === course.id);
          const avg = calculateCourseAverage(student.id, course.id, grades);
          const { letter } = getLetterGrade(avg);
          
          // Slots for this course
          const courseSlots = schedule.filter(s => s.courseId === course.id);

          return (
            <div
              key={course.id}
              className={`bg-white rounded-2xl border transition-all p-6 flex flex-col justify-between hover:shadow-md ${
                isEnrolled ? 'border-slate-200 shadow-xs ring-1 ring-slate-100' : 'border-slate-200/60 opacity-80'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-black text-xs rounded-lg shadow-xs">
                    {course.code}
                  </span>
                  {isEnrolled ? (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3" />
                      Enrolled ({letter})
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400">Not Enrolled</span>
                  )}
                </div>

                <h3 className="font-black text-slate-900 text-base leading-snug">{course.name}</h3>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mt-1">{course.department}</p>

                {/* Course Metadata Details */}
                <div className="mt-4 space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Instructor:
                    </span>
                    <span className="font-bold text-slate-800">{course.teacherName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Classroom:
                    </span>
                    <span className="font-mono font-bold text-slate-800">{course.room}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      Credit Units:
                    </span>
                    <span className="font-mono font-bold text-slate-800">{course.credits} Credits</span>
                  </div>
                </div>

                {/* Schedule Days */}
                <div className="mt-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] text-slate-500 font-mono">
                    Meets: {courseSlots.map(s => s.day).join(', ') || 'Mon-Fri'}
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => onOpenVirtualClass(course)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Class Hub</span>
                </button>
                {isEnrolled && (
                  <button
                    onClick={() => onNavigateToGrades(course.id)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    title="View Grades"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
