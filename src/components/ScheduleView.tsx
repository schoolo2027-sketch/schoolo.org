import { useState } from 'react';
import { Course, ScheduleSlot, Student, PeriodInfo } from '../types';
import { PERIOD_DEFINITIONS } from '../data/mockData';
import { getCurrentPeriod } from '../utils/schoolUtils';
import { 
  Clock, 
  MapPin, 
  User, 
  Calendar, 
  Sparkles, 
  BookOpen, 
  Video, 
  Filter, 
  Plus, 
  ChevronRight,
  Info
} from 'lucide-react';

interface ScheduleViewProps {
  schedule: ScheduleSlot[];
  courses: Course[];
  student: Student;
  simulatedDay: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  simulatedTime: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  onOpenVirtualClass: (course: Course, slot: ScheduleSlot) => void;
  onSelectCourse: (course: Course) => void;
}

export default function ScheduleView({
  schedule,
  courses,
  student,
  simulatedDay,
  simulatedTime,
  role,
  onOpenVirtualClass,
  onSelectCourse
}: ScheduleViewProps) {
  const [selectedDayTab, setSelectedDayTab] = useState<'all' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [activeSlotModal, setActiveSlotModal] = useState<{ slot: ScheduleSlot; course: Course } | null>(null);

  const days: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dayNames: Record<string, string> = {
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday'
  };

  const periodStatus = getCurrentPeriod(simulatedTime);

  // Departments list for filter
  const departments = ['all', ...Array.from(new Set(courses.map(c => c.department)))];

  // Helper to find slot
  const getSlot = (day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri', period: number): ScheduleSlot | undefined => {
    return schedule.find(s => s.day === day && s.period === period);
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full max-w-7xl mx-auto">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Academic Timetable</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Live Period Sync Active
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Grade 10 • Section A • 7 Periods Daily
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.filter(d => d !== 'all').map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Day Filter Pills for Mobile / Compact View */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedDayTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedDayTab === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Full 5-Day Week Matrix
        </button>
        {days.map(d => (
          <button
            key={d}
            onClick={() => setSelectedDayTab(d)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedDayTab === d
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{dayNames[d]}</span>
            {simulatedDay === d && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Full Timetable Matrix (Table Grid) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-black uppercase text-[10px]">
                <th className="py-4 px-4 w-32 border-r border-slate-200 text-center font-mono">
                  Period / Time
                </th>
                {(selectedDayTab === 'all' ? days : [selectedDayTab]).map(d => (
                  <th
                    key={d}
                    className={`py-4 px-4 font-sans text-center transition-colors ${
                      simulatedDay === d ? 'bg-blue-50/80 text-blue-700 font-black' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{dayNames[d]}</span>
                      {simulatedDay === d && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-blue-600 text-white rounded font-mono font-bold">
                          TODAY
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {PERIOD_DEFINITIONS.map(pInfo => {
                if (pInfo.isBreak) {
                  return (
                    <tr key={`break-${pInfo.startTime}`} className="bg-slate-50/50">
                      <td className="py-2.5 px-4 font-mono font-bold text-[10px] text-slate-400 text-center border-r border-slate-200 bg-slate-100/60">
                        {pInfo.startTime} - {pInfo.endTime}
                      </td>
                      <td
                        colSpan={selectedDayTab === 'all' ? 5 : 1}
                        className="py-2.5 px-6 text-center text-[11px] font-semibold italic text-slate-400 font-mono tracking-wider"
                      >
                        ☕ {pInfo.name} ({pInfo.startTime} – {pInfo.endTime})
                      </td>
                    </tr>
                  );
                }

                const isCurrentPeriodNow = periodStatus.currentPeriod?.period === pInfo.period;

                return (
                  <tr key={`period-${pInfo.period}`} className="hover:bg-slate-50/30 transition-colors">
                    {/* Period header */}
                    <td className={`py-4 px-4 border-r border-slate-200 text-center font-mono ${
                      isCurrentPeriodNow ? 'bg-blue-50/60 font-bold' : 'bg-slate-50/40'
                    }`}>
                      <p className="font-black text-slate-900 text-xs">{pInfo.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{pInfo.startTime} - {pInfo.endTime}</p>
                      {isCurrentPeriodNow && (
                        <span className="inline-block mt-1 text-[9px] font-black uppercase text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded font-mono">
                          ACTIVE
                        </span>
                      )}
                    </td>

                    {/* Day Cells */}
                    {(selectedDayTab === 'all' ? days : [selectedDayTab]).map(d => {
                      const slot = getSlot(d, pInfo.period);
                      const course = slot ? courses.find(c => c.id === slot.courseId) : undefined;
                      const isLiveCell = simulatedDay === d && isCurrentPeriodNow;

                      if (!slot || !course) {
                        return (
                          <td key={`${d}-${pInfo.period}`} className="p-3 text-center text-slate-300 italic">
                            Free Period
                          </td>
                        );
                      }

                      // Check department filter
                      if (selectedDepartment !== 'all' && course.department !== selectedDepartment) {
                        return (
                          <td key={`${d}-${pInfo.period}`} className="p-2 opacity-25">
                            <div className="p-3 bg-slate-100 rounded-xl text-[10px] text-slate-400 font-mono text-center">
                              {course.code}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={`${d}-${pInfo.period}`}
                          className={`p-2.5 transition-all ${
                            isLiveCell ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div
                            onClick={() => setActiveSlotModal({ slot, course })}
                            className={`p-3 rounded-xl border-l-4 transition-all cursor-pointer shadow-2xs group hover:shadow-sm ${
                              isLiveCell
                                ? 'bg-blue-100/90 border-blue-600 ring-2 ring-blue-500/20'
                                : slot.period % 3 === 1
                                ? 'bg-indigo-50/50 border-indigo-500 hover:bg-indigo-50'
                                : slot.period % 3 === 2
                                ? 'bg-cyan-50/50 border-cyan-500 hover:bg-cyan-50'
                                : 'bg-amber-50/50 border-amber-500 hover:bg-amber-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-white/90 rounded text-slate-700 border border-slate-200/50">
                                {course.code}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 font-semibold">
                                {slot.room}
                              </span>
                            </div>
                            <p className="font-bold text-slate-900 text-xs mt-1.5 group-hover:text-blue-600 transition-colors line-clamp-1">
                              {course.name}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1 truncate">
                              {course.teacherName}
                            </p>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course Slot Details Modal */}
      {activeSlotModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase font-mono px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                  {activeSlotModal.course.code} • {activeSlotModal.course.department}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">{activeSlotModal.course.name}</h3>
              </div>
              <button
                onClick={() => setActiveSlotModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 my-5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Scheduled Slot:
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {dayNames[activeSlotModal.slot.day]} • Period {activeSlotModal.slot.period} ({activeSlotModal.slot.startTime} – {activeSlotModal.slot.endTime})
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Classroom Location:
                </span>
                <span className="font-bold text-slate-900">{activeSlotModal.slot.room}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" />
                  Instructor:
                </span>
                <span className="font-bold text-slate-900">{activeSlotModal.course.teacherName}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  onSelectCourse(activeSlotModal.course);
                  setActiveSlotModal(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
              >
                View Syllabus
              </button>
              <button
                onClick={() => {
                  onOpenVirtualClass(activeSlotModal.course, activeSlotModal.slot);
                  setActiveSlotModal(null);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Enter Class Hub</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
