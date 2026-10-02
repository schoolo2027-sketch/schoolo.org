import { Student, Course, ScheduleSlot, GradeEntry, AttendanceRecord, Announcement } from '../types';
import { getLetterGrade, calculateCourseAverage, getCurrentPeriod } from '../utils/schoolUtils';
import { 
  ArrowUpRight, 
  Clock, 
  Calendar, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  MapPin, 
  User, 
  BookOpen, 
  Award,
  Video
} from 'lucide-react';

interface DashboardViewProps {
  student: Student;
  courses: Course[];
  schedule: ScheduleSlot[];
  grades: GradeEntry[];
  attendance: AttendanceRecord[];
  announcements: Announcement[];
  simulatedDay: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  simulatedTime: string;
  onNavigateTab: (tab: string) => void;
  onOpenVirtualClass: (course: Course, slot?: ScheduleSlot) => void;
  onSelectCourse: (course: Course) => void;
}

export default function DashboardView({
  student,
  courses,
  schedule,
  grades,
  attendance,
  announcements,
  simulatedDay,
  simulatedTime,
  onNavigateTab,
  onOpenVirtualClass,
  onSelectCourse
}: DashboardViewProps) {
  // Compute metrics
  const studentGrades = grades.filter(g => g.studentId === student.id);
  const studentAttendance = attendance.filter(a => a.studentId === student.id);

  // Today's schedule slots for this day
  const todaySlots = schedule
    .filter(s => s.day === simulatedDay)
    .sort((a, b) => a.period - b.period);

  // Real-time period calculation
  const periodStatus = getCurrentPeriod(simulatedTime);
  
  // Find current course slot if in period
  const activeSlot = periodStatus.currentPeriod && !periodStatus.currentPeriod.isBreak
    ? todaySlots.find(s => s.period === periodStatus.currentPeriod?.period)
    : undefined;
  const activeCourse = activeSlot ? courses.find(c => c.id === activeSlot.courseId) : undefined;

  // Find next upcoming course slot
  const nextSlot = periodStatus.nextPeriod && !periodStatus.nextPeriod.isBreak
    ? todaySlots.find(s => s.period === periodStatus.nextPeriod?.period)
    : undefined;
  const nextCourse = nextSlot ? courses.find(c => c.id === nextSlot.courseId) : undefined;

  // Highlight card course (either currently active or next)
  const alertCourse = activeCourse || nextCourse || courses[0];
  const alertSlot = activeSlot || nextSlot || todaySlots[0];
  const isCurrentlyInClass = !!activeCourse;

  // Recent grades for this student (last 4 sorted by date desc)
  const recentGrades = [...studentGrades]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  // Format full day name
  const dayFullNames: Record<string, string> = {
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday'
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full max-w-7xl mx-auto">
      {/* 4 Hero Metric Geometric Cards */}
      <div className="grid grid-cols-12 gap-6">
        {/* Card 1: Current GPA */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cumulative GPA</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                Top 5%
              </span>
            </div>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-4xl font-black text-slate-900 leading-none tracking-tight">
                {student.gpa.toFixed(2)}
              </span>
              <span className="text-xs text-emerald-600 font-bold mb-1 flex items-center">
                +0.12 ↑
              </span>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1.5 mt-4">
              <span>Unweighted Scale</span>
              <span>4.00 Max</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-700"
                style={{ width: `${(student.gpa / 4.0) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Attendance Rate */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Rate</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                Semester 1
              </span>
            </div>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-4xl font-black text-slate-900 leading-none tracking-tight">
                {student.attendanceRate}%
              </span>
              <span className="text-xs text-slate-400 font-medium mb-1">
                (42 of 44 Days)
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex gap-1.5">
              <div className="h-1.5 flex-1 bg-emerald-500 rounded-full" title="Mon: 100%" />
              <div className="h-1.5 flex-1 bg-emerald-500 rounded-full" title="Tue: 100%" />
              <div className="h-1.5 flex-1 bg-emerald-500 rounded-full" title="Wed: 100%" />
              <div className="h-1.5 flex-1 bg-emerald-500 rounded-full" title="Thu: 100%" />
              <div className={`h-1.5 flex-1 ${student.attendanceRate > 90 ? 'bg-emerald-500' : 'bg-amber-400'} rounded-full`} title="Fri: Active" />
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-1.5 text-right">0 Unexcused</p>
          </div>
        </div>

        {/* Card 3: Total Credits & Course Load */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Academic Credits</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">
                5 Enrolled
              </span>
            </div>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-4xl font-black text-slate-900 leading-none tracking-tight">
                21
              </span>
              <span className="text-xs text-slate-400 font-medium mb-1">
                / 24 Req.
              </span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[10px] text-slate-500 italic">
              3 credits remaining for Advanced Honors Diploma
            </p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: '87.5%' }} />
            </div>
          </div>
        </div>

        {/* Card 4: Real-time Alert & Live Bell */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-blue-600 p-6 rounded-xl shadow-md flex flex-col justify-between text-white border border-blue-500 relative overflow-hidden">
          {/* Subtle geometric pattern overlay */}
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {isCurrentlyInClass ? 'Live Bell • In Session' : 'Up Next'}
              </p>
              <span className="text-[10px] font-mono bg-blue-700/80 px-2 py-0.5 rounded text-blue-100">
                {alertSlot ? `Period ${alertSlot.period}` : 'Period 1'}
              </span>
            </div>
            
            <div className="mt-2.5">
              <p className="font-black text-lg leading-tight text-white line-clamp-1">
                {alertCourse ? alertCourse.name : 'Physics Lab'}
              </p>
              <p className="text-xs text-blue-100/90 mt-1 font-mono">
                {isCurrentlyInClass
                  ? `Remaining: ${periodStatus.minutesRemaining} mins • ${alertSlot?.room}`
                  : `Starts in: ${periodStatus.minutesRemaining} mins • ${alertSlot?.room || 'Room 304'}`}
              </p>
            </div>
          </div>

          <button
            id="enter-virtual-hub-btn"
            onClick={() => onOpenVirtualClass(alertCourse, alertSlot)}
            className="w-full bg-white text-blue-600 hover:bg-blue-50 text-[11px] font-black py-2.5 px-3 rounded-lg mt-4 uppercase tracking-tight flex items-center justify-center gap-2 transition-all shadow-xs active:scale-98"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Enter Class Hub & Notes</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 7-col Timeline & 5-col Recent Performance */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Today's Timeline (col-span-7) */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <h2 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                Today's Live Schedule
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                {dayFullNames[simulatedDay]}, {simulatedDay === 'Mon' ? 'Aug 24' : simulatedDay === 'Tue' ? 'Aug 25' : simulatedDay === 'Wed' ? 'Aug 26' : simulatedDay === 'Thu' ? 'Aug 27' : 'Aug 28'}
              </span>
              <button
                onClick={() => onNavigateTab('schedule')}
                className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-tight ml-2"
              >
                Full Week →
              </button>
            </div>
          </div>

          {/* Schedule slots list */}
          <div className="p-6 space-y-3.5 flex-1">
            {todaySlots.map((slot) => {
              const course = courses.find(c => c.id === slot.courseId);
              if (!course) return null;

              const isCurrent = periodStatus.currentPeriod?.period === slot.period;
              const isPast = (periodStatus.currentPeriod?.period || 0) > slot.period;

              return (
                <div
                  key={slot.id}
                  onClick={() => onSelectCourse(course)}
                  className={`flex gap-4 items-center group cursor-pointer transition-all ${
                    isPast ? 'opacity-50 hover:opacity-100' : ''
                  }`}
                >
                  {/* Time badge */}
                  <div className="w-20 text-right shrink-0">
                    <p className={`text-[11px] font-black font-mono ${isCurrent ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                      {slot.startTime}
                    </p>
                    <p className="text-[9px] font-mono text-slate-400">
                      P{slot.period}
                    </p>
                  </div>

                  {/* Slot box with left accent border */}
                  <div
                    className={`flex-1 p-3.5 rounded-r-xl border-l-4 transition-all flex items-center justify-between ${
                      isCurrent
                        ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500/20'
                        : slot.period % 3 === 1
                        ? 'bg-indigo-50/40 border-indigo-500 hover:bg-indigo-50/70'
                        : slot.period % 3 === 2
                        ? 'bg-cyan-50/40 border-cyan-500 hover:bg-cyan-50/70'
                        : 'bg-amber-50/40 border-amber-500 hover:bg-amber-50/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {course.name}
                        </p>
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-600 text-white rounded font-mono">
                            LIVE NOW
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {slot.room}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {course.teacherName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-1 bg-white/80 rounded border border-slate-200/60 text-slate-700">
                        {course.code}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Midday break indicator */}
            <div className="flex gap-4 items-center opacity-40">
              <div className="w-20 text-right shrink-0">
                <p className="text-[11px] font-black font-mono text-slate-400">12:20 PM</p>
                <p className="text-[9px] font-mono text-slate-400">Break</p>
              </div>
              <div className="flex-1 border-l-4 border-slate-200 p-3 bg-slate-50/40 rounded-r-xl flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-600 italic">Campus Lunch & Recess</p>
                <span className="text-[10px] text-slate-400 font-mono">45 mins</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Performance (col-span-5) */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <h2 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                Recent Performance
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('grades')}
              className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-tight"
            >
              Gradebook →
            </button>
          </div>

          {/* List of recent graded items */}
          <div className="flex-1 divide-y divide-slate-100">
            {recentGrades.map((grade) => {
              const course = courses.find(c => c.id === grade.courseId);
              const percentage = (grade.score / grade.maxScore) * 100;
              const { letter, colorClass } = getLetterGrade(percentage);
              const codePrefix = course ? course.code.split('-')[0] : 'GEN';

              return (
                <div
                  key={grade.id}
                  className="p-4 sm:p-5 flex justify-between items-center hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center font-black text-white text-[11px] font-mono shrink-0 shadow-xs">
                      {codePrefix}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate" title={grade.title}>
                        {grade.title}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase font-mono tracking-tighter truncate mt-0.5">
                        {course?.name} • {grade.category} ({grade.weight}%)
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <p className="text-lg font-black text-slate-900 leading-none">
                      {letter}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold font-mono mt-1">
                      {grade.score}/{grade.maxScore} pts
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick What-If Grade Simulation CTA */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-700">Need to calculate target GPA?</span>
            </div>
            <button
              onClick={() => onNavigateTab('grades')}
              className="text-xs font-black text-blue-600 hover:text-blue-800 underline"
            >
              Open Simulator
            </button>
          </div>
        </div>
      </div>

      {/* Announcements Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Campus Announcements & Faculty Bulletins
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">{announcements.length} Notices</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`p-3.5 rounded-lg border text-xs ${
                ann.priority === 'urgent'
                  ? 'bg-rose-50/50 border-rose-200'
                  : ann.priority === 'high'
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-slate-50/60 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 line-clamp-1">{ann.title}</span>
                {ann.priority === 'high' && (
                  <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                    High
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">{ann.content}</p>
              <p className="text-[9px] text-slate-400 mt-2 font-mono">{ann.author} • {ann.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
