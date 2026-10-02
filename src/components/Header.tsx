import { useState } from 'react';
import { Student } from '../types';
import { Clock, Play, Pause, FastForward, RotateCcw, ChevronDown, Bell, Search, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  selectedStudent: Student;
  students: Student[];
  onSelectStudent: (student: Student) => void;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  simulatedDay: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  setSimulatedDay: (day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri') => void;
  simulatedTime: string;
  setSimulatedTime: (time: string) => void;
  isLiveClockRunning: boolean;
  setIsLiveClockRunning: (running: boolean) => void;
  onOpenNotifications?: () => void;
}

export default function Header({
  currentTab,
  selectedStudent,
  students,
  onSelectStudent,
  role,
  simulatedDay,
  setSimulatedDay,
  simulatedTime,
  setSimulatedTime,
  isLiveClockRunning,
  setIsLiveClockRunning,
}: HeaderProps) {
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showTimeControls, setShowTimeControls] = useState(false);

  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return role === 'student' ? 'Student Dashboard' : role === 'teacher' ? 'Faculty Command Center' : 'Administrative Overview';
      case 'schedule':
        return 'Real-Time Class Timetable';
      case 'grades':
        return 'Academic Performance & Gradebook';
      case 'attendance':
        return 'Live Attendance & Roll Call';
      case 'courses':
        return 'Enrolled Courses & Curriculum';
      case 'students':
        return 'Student Directory & Records';
      default:
        return 'School Management';
    }
  };

  const days: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 relative z-20">
      {/* Title & Term info */}
      <div className="space-y-0.5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{getTabTitle()}</h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Sync
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-[0.2em]">
          Fall Term 2026 • {selectedStudent.grade} {selectedStudent.section}
        </p>
      </div>

      {/* Center/Right Controls */}
      <div className="flex items-center gap-4">
        {/* Real-time Clock Simulator Pill */}
        <div className="relative">
          <button
            id="time-simulator-btn"
            onClick={() => setShowTimeControls(!showTimeControls)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition-all shadow-xs"
            title="Configure Real-Time Simulation Clock"
          >
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-mono text-blue-700 font-black">{simulatedDay} {simulatedTime}</span>
            <span className="text-[10px] text-slate-400 font-normal uppercase hidden sm:inline">Simulated Time</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Time controls flyout */}
          {showTimeControls && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Clock Controller</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold">
                  {simulatedDay} {simulatedTime}
                </span>
              </div>

              {/* Day selector */}
              <div className="mb-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">School Day</label>
                <div className="grid grid-cols-5 gap-1">
                  {days.map((d) => (
                    <button
                      key={d}
                      onClick={() => setSimulatedDay(d)}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        simulatedDay === d
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Period presets */}
              <div className="mb-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Jump to Period</label>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => setSimulatedTime('08:45')}
                    className="py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md"
                  >
                    P1 (08:45)
                  </button>
                  <button
                    onClick={() => setSimulatedTime('09:40')}
                    className="py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md"
                  >
                    P2 (09:40)
                  </button>
                  <button
                    onClick={() => setSimulatedTime('10:40')}
                    className="py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md"
                  >
                    P3 (10:40)
                  </button>
                  <button
                    onClick={() => setSimulatedTime('11:45')}
                    className="py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md"
                  >
                    P4 (11:45)
                  </button>
                  <button
                    onClick={() => setSimulatedTime('12:35')}
                    className="py-1 text-[11px] font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md"
                  >
                    Lunch
                  </button>
                  <button
                    onClick={() => setSimulatedTime('13:20')}
                    className="py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md"
                  >
                    P5 (13:20)
                  </button>
                  <button
                    onClick={() => setSimulatedTime('14:20')}
                    className="py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md"
                  >
                    P6 (14:20)
                  </button>
                  <button
                    onClick={() => setSimulatedTime('15:10')}
                    className="py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md"
                  >
                    P7 (15:10)
                  </button>
                </div>
              </div>

              {/* Time slider */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Custom Time</label>
                  <span className="font-mono text-xs font-bold text-slate-700">{simulatedTime}</span>
                </div>
                <input
                  type="time"
                  value={simulatedTime}
                  onChange={(e) => setSimulatedTime(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-mono font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Auto increment toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setIsLiveClockRunning(!isLiveClockRunning)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                    isLiveClockRunning
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {isLiveClockRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isLiveClockRunning ? 'Pause Real-Time' : 'Auto Tick (1s = 1m)'}
                </button>
                <button
                  onClick={() => {
                    setSimulatedTime('08:30');
                    setSimulatedDay('Mon');
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                  title="Reset to Monday 08:30"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Student Switcher Dropdown */}
        <div className="relative">
          <button
            id="student-switcher-btn"
            onClick={() => setShowStudentDropdown(!showStudentDropdown)}
            className="flex items-center gap-3 pl-2 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
          >
            <div className="flex flex-col items-end">
              <p className="text-sm font-bold text-slate-900 leading-tight">{selectedStudent.name}</p>
              <p className="text-[10px] font-mono text-slate-400">{selectedStudent.rollNumber}</p>
            </div>
            <div className="w-10 h-10 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center font-bold text-blue-600 overflow-hidden shrink-0">
              {selectedStudent.avatar ? (
                <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
              ) : (
                selectedStudent.name.split(' ').map(n => n[0]).join('')
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showStudentDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Switch Student Record</span>
                <span className="text-[10px] text-slate-400 font-mono">{students.length} Enrolled</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                {students.map((std) => (
                  <button
                    key={std.id}
                    onClick={() => {
                      onSelectStudent(std);
                      setShowStudentDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left ${
                      std.id === selectedStudent.id ? 'bg-blue-50/70' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={std.avatar} alt={std.name} className="w-8 h-8 rounded-lg object-cover" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">{std.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">GPA {std.gpa.toFixed(2)} • {std.attendanceRate}% Att.</p>
                      </div>
                    </div>
                    {std.id === selectedStudent.id && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
