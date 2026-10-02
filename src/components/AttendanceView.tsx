import { useState } from 'react';
import { Student, Course, AttendanceRecord, AttendanceStatus } from '../types';
import { calculateAttendanceStats } from '../utils/schoolUtils';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle, 
  Users, 
  Calendar as CalendarIcon, 
  ShieldCheck, 
  FileText, 
  Sparkles,
  Filter
} from 'lucide-react';

interface AttendanceViewProps {
  students: Student[];
  selectedStudent: Student;
  courses: Course[];
  attendance: AttendanceRecord[];
  role: 'admin' | 'teacher' | 'student' | 'parent';
  simulatedDay: string;
  simulatedTime: string;
  onUpdateAttendance: (studentId: string, courseId: string, status: AttendanceStatus, date: string, period: number, notes?: string) => void;
  onMarkAllPresent: (courseId: string, period: number, date: string) => void;
}

export default function AttendanceView({
  students,
  selectedStudent,
  courses,
  attendance,
  role,
  simulatedDay,
  simulatedTime,
  onUpdateAttendance,
  onMarkAllPresent
}: AttendanceViewProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [filterDate, setFilterDate] = useState<string>('2026-08-26');
  const [quickNoteStudentId, setQuickNoteStudentId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState<string>('');

  // Stats for the selected student
  const studentStats = calculateAttendanceStats(selectedStudent.id, attendance);

  // Class roster for roll call in the selected course
  const classStudents = students.filter(s => s.enrolledCourseIds.includes(selectedCourseId));
  const activeCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  // Helper to get status of a student for current filter
  const getStatusForStudent = (studentId: string): AttendanceRecord | undefined => {
    return attendance.find(
      a => a.studentId === studentId &&
           a.courseId === selectedCourseId &&
           a.date === filterDate &&
           a.period === selectedPeriod
    );
  };

  const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
    const existing = getStatusForStudent(studentId);
    onUpdateAttendance(studentId, selectedCourseId, newStatus, filterDate, selectedPeriod, existing?.notes);
  };

  const handleSaveNote = (studentId: string) => {
    const existing = getStatusForStudent(studentId);
    const status = existing?.status || 'present';
    onUpdateAttendance(studentId, selectedCourseId, status, filterDate, selectedPeriod, tempNote);
    setQuickNoteStudentId(null);
    setTempNote('');
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full max-w-7xl mx-auto">
      {/* Hero Stats for Selected Student */}
      <div className="grid grid-cols-12 gap-6">
        {/* Card 1: Attendance Rate */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Standing</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-4xl font-black text-slate-900 leading-none tracking-tight">
                {studentStats.rate}%
              </span>
              <span className="text-xs text-emerald-600 font-bold mb-1">
                Good Standing
              </span>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${studentStats.rate >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${studentStats.rate}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-1.5">{selectedStudent.name}</p>
          </div>
        </div>

        {/* Card 2: Present Days */}
        <div className="col-span-6 sm:col-span-3 lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Present Periods</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-slate-900">{studentStats.present}</span>
            <span className="text-xs text-slate-400 font-medium ml-1">sessions</span>
          </div>
          <div className="h-1 w-full bg-emerald-500 rounded-full mt-3" />
        </div>

        {/* Card 3: Tardies / Late */}
        <div className="col-span-6 sm:col-span-3 lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tardy / Late</p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-slate-900">{studentStats.late}</span>
            <span className="text-xs text-slate-400 font-medium ml-1">incidents</span>
          </div>
          <div className="h-1 w-full bg-amber-400 rounded-full mt-3" />
        </div>

        {/* Card 4: Absences */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Absences</p>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <div>
              <span className="text-3xl font-black text-slate-900">{studentStats.absent}</span>
              <span className="text-[10px] text-slate-400 uppercase ml-1">Unexcused</span>
            </div>
            <div>
              <span className="text-xl font-bold text-slate-600">{studentStats.excused}</span>
              <span className="text-[10px] text-slate-400 uppercase ml-1">Excused</span>
            </div>
          </div>
          <div className="h-1 w-full bg-rose-500 rounded-full mt-3" />
        </div>
      </div>

      {/* Live Roll Call Station */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                Live Class Roll Call
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Teacher: <span className="font-bold text-slate-700">{activeCourse.teacherName}</span> • Room {activeCourse.room}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Subject Selector */}
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>

            {/* Period Selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value={1}>Period 1 (08:30)</option>
              <option value={2}>Period 2 (09:25)</option>
              <option value={3}>Period 3 (10:20)</option>
              <option value={4}>Period 4 (11:30)</option>
              <option value={5}>Period 5 (13:05)</option>
              <option value={6}>Period 6 (14:00)</option>
              <option value={7}>Period 7 (14:55)</option>
            </select>

            {/* Date selector */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-blue-500"
            />

            {(role === 'teacher' || role === 'admin') && (
              <button
                id="mark-all-present-btn"
                onClick={() => onMarkAllPresent(selectedCourseId, selectedPeriod, filterDate)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark All Present</span>
              </button>
            )}
          </div>
        </div>

        {/* Student Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase text-[10px]">
              <tr>
                <th className="py-3 px-6">Student</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Notes / Excuses</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map((std) => {
                const record = getStatusForStudent(std.id);
                const status = record?.status || 'present';

                return (
                  <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Student details */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <img src={std.avatar} alt={std.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{std.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{std.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                      {std.rollNumber}
                    </td>

                    {/* Status Action Buttons */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          disabled={role === 'student' || role === 'parent'}
                          onClick={() => handleStatusChange(std.id, 'present')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            status === 'present'
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </button>

                        <button
                          disabled={role === 'student' || role === 'parent'}
                          onClick={() => handleStatusChange(std.id, 'late')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            status === 'late'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Late</span>
                        </button>

                        <button
                          disabled={role === 'student' || role === 'parent'}
                          onClick={() => handleStatusChange(std.id, 'absent')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            status === 'absent'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </button>

                        <button
                          disabled={role === 'student' || role === 'parent'}
                          onClick={() => handleStatusChange(std.id, 'excused')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            status === 'excused'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Excused</span>
                        </button>
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-4">
                      {quickNoteStudentId === std.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Add reason/note..."
                            value={tempNote}
                            onChange={(e) => setTempNote(e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded-lg text-xs w-48 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => handleSaveNote(std.id)}
                            className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setQuickNoteStudentId(null)}
                            className="text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {record?.notes ? (
                            <span className="text-slate-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                              {record.notes}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                          {(role === 'teacher' || role === 'admin') && (
                            <button
                              onClick={() => {
                                setQuickNoteStudentId(std.id);
                                setTempNote(record?.notes || '');
                              }}
                              className="text-blue-600 hover:text-blue-800 text-[11px] font-bold"
                            >
                              Edit Note
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Scan Timestamp */}
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                      {record?.timestamp || `${selectedPeriod === 1 ? '08:30' : '09:25'}:00`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
