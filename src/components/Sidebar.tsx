import { Student } from '../types';
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  CalendarCheck, 
  Users, 
  Clock, 
  Sparkles,
  ShieldCheck,
  UserCircle,
  GraduationCap as TeacherIcon,
  HeartHandshake
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  selectedStudent: Student;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  setRole: (role: 'admin' | 'teacher' | 'student' | 'parent') => void;
  activePeriodName: string;
  nextPeriodName: string;
  nextPeriodTime: string;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  selectedStudent,
  role,
  setRole,
  activePeriodName,
  nextPeriodName,
  nextPeriodTime
}: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schedule', label: 'Live Schedule', icon: Clock },
    { id: 'grades', label: 'Grades & GPA', icon: GraduationCap },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'courses', label: 'My Courses', icon: BookOpen },
    { id: 'students', label: 'Student Directory', icon: Users },
  ];

  return (
    <aside className="w-64 bg-[#0F172A] flex flex-col border-r border-slate-800 text-slate-300 select-none shrink-0 h-full">
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-sm rotate-45 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black text-white tracking-tight">Schoollo</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">v2.6</span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">Academy OS</p>
          </div>
        </div>
      </div>

      {/* Role Switcher */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-slate-900/90 p-1 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
          <button
            id="role-student-btn"
            onClick={() => setRole('student')}
            className={`flex-1 py-1.5 rounded-md font-semibold text-[11px] transition-all flex items-center justify-center gap-1 ${
              role === 'student'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Student Perspective"
          >
            <UserCircle className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>
          <button
            id="role-teacher-btn"
            onClick={() => setRole('teacher')}
            className={`flex-1 py-1.5 rounded-md font-semibold text-[11px] transition-all flex items-center justify-center gap-1 ${
              role === 'teacher'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Teacher Perspective"
          >
            <TeacherIcon className="w-3.5 h-3.5" />
            <span>Teacher</span>
          </button>
          <button
            id="role-admin-btn"
            onClick={() => setRole('admin')}
            className={`flex-1 py-1.5 rounded-md font-semibold text-[11px] transition-all flex items-center justify-center gap-1 ${
              role === 'admin'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Admin Perspective"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-1 mt-3 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Academic Portal
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full px-4 py-2.5 flex items-center gap-3 rounded-lg text-sm font-medium transition-all text-left group ${
                isActive
                  ? 'bg-blue-600/10 border-l-4 border-blue-500 text-blue-400 pl-3 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full transition-all ${
                  isActive ? 'bg-blue-500 ring-4 ring-blue-500/20' : 'bg-slate-700 group-hover:bg-slate-500'
                }`}
              />
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Geometric Highlight Card */}
      <div className="p-4 border-t border-slate-800/80 mt-auto">
        <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Live Bell Status
            </span>
            <span className="text-[10px] font-mono text-slate-400">{activePeriodName || 'Between Periods'}</span>
          </div>
          <p className="text-xs text-white font-bold truncate">{nextPeriodName ? `Next: ${nextPeriodName}` : 'Classes Concluded'}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{nextPeriodTime ? `Starts at ${nextPeriodTime}` : 'See tomorrow schedule'}</p>
        </div>

        {/* Selected Student Micro Profile */}
        <div className="mt-3 flex items-center gap-3 px-1">
          <img
            src={selectedStudent.avatar}
            alt={selectedStudent.name}
            className="w-8 h-8 rounded-lg object-cover border border-slate-700"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{selectedStudent.name}</p>
            <p className="text-[10px] font-mono text-slate-400 truncate">{selectedStudent.rollNumber}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
