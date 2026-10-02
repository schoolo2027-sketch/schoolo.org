import { useState, FormEvent } from 'react';
import { Student, Course, GradeEntry, AttendanceRecord } from '../types';
import { calculateStudentGPA, calculateAttendanceStats } from '../utils/schoolUtils';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  Award, 
  CalendarCheck, 
  ChevronRight, 
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface StudentsViewProps {
  students: Student[];
  courses: Course[];
  grades: GradeEntry[];
  attendance: AttendanceRecord[];
  selectedStudent: Student;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  onSelectStudent: (student: Student) => void;
  onAddStudent: (student: Omit<Student, 'id'>) => void;
}

export default function StudentsView({
  students,
  courses,
  grades,
  attendance,
  selectedStudent,
  role,
  onSelectStudent,
  onAddStudent
}: StudentsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'honor-roll' | 'active' | 'at-risk'>('all');
  const [inspectStudent, setInspectStudent] = useState<Student | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Student Form
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [gradeLevel, setGradeLevel] = useState('10th Grade');
  const [section, setSection] = useState('Section A');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateStudent = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddStudent({
      name: name.trim(),
      rollNumber: rollNumber.trim() || `SCH-2026-${Math.floor(100 + Math.random() * 900)}`,
      avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150&auto=format&fit=crop&q=80`,
      grade: gradeLevel,
      section: section,
      email: email.trim() || `${name.toLowerCase().replace(' ', '.')}@student.schoollo.com`,
      gender: gender,
      dob: '2010-05-15',
      parentName: parentName.trim() || 'Parent/Guardian',
      parentEmail: 'parent@example.com',
      parentPhone: parentPhone.trim() || '+1 (555) 000-0000',
      address: 'Oakridge Campus Residential Area',
      enrolledCourseIds: ['c-calc', 'c-phys', 'c-eng', 'c-cs'],
      attendanceRate: 98.0,
      gpa: 3.85,
      status: 'active',
      notes: notes.trim()
    });

    setName('');
    setShowAddModal(false);
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Student Directory & Academic Records</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {students.length} Enrolled
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Grade 10 • Academic Cohort 2026-2027
            </p>
          </div>
        </div>

        {(role === 'admin' || role === 'teacher') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Admit New Student</span>
          </button>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, ID, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All ({students.length})
          </button>
          <button
            onClick={() => setStatusFilter('honor-roll')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === 'honor-roll' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Honor Roll
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === 'active' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-blue-700 hover:bg-blue-50'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('at-risk')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === 'at-risk' ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
            }`}
          >
            At Risk
          </button>
        </div>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredStudents.map((std) => {
          const isSelected = std.id === selectedStudent.id;
          const stdAttendance = calculateAttendanceStats(std.id, attendance);

          return (
            <div
              key={std.id}
              className={`bg-white rounded-2xl border p-5 flex flex-col justify-between transition-all hover:shadow-md ${
                isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="relative">
                    <img
                      src={std.avatar}
                      alt={std.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-xs"
                    />
                    {std.status === 'honor-roll' && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs" title="Honor Roll">
                        ★
                      </span>
                    )}
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                    std.status === 'honor-roll'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : std.status === 'at-risk'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {std.status}
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="font-black text-slate-900 text-sm leading-tight">{std.name}</h3>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{std.rollNumber}</p>
                </div>

                {/* Micro metrics */}
                <div className="grid grid-cols-2 gap-2 my-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">GPA</p>
                    <p className="text-sm font-black text-slate-900">{std.gpa.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Attendance</p>
                    <p className="text-sm font-black text-emerald-600">{std.attendanceRate}%</p>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{std.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{std.parentPhone}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => onSelectStudent(std)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isSelected ? 'Active Profile' : 'Select'}
                </button>
                <button
                  onClick={() => setInspectStudent(std)}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200"
                  title="View Full Student Dossier"
                >
                  Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspect Student Dossier Modal */}
      {inspectStudent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <img src={inspectStudent.avatar} alt={inspectStudent.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-200" />
                <div>
                  <h3 className="text-lg font-black text-slate-900">{inspectStudent.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{inspectStudent.rollNumber} • {inspectStudent.grade}</p>
                </div>
              </div>
              <button onClick={() => setInspectStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-slate-400 font-black uppercase text-[9px]">Parent / Guardian</p>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">{inspectStudent.parentName}</p>
                  <p className="text-slate-500 font-mono mt-0.5">{inspectStudent.parentPhone}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-black uppercase text-[9px]">Residential Address</p>
                  <p className="font-medium text-slate-700 mt-0.5">{inspectStudent.address}</p>
                </div>
              </div>

              {inspectStudent.notes && (
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 text-slate-700">
                  <p className="font-black text-blue-900 uppercase text-[9px] mb-1">Counselor & Faculty Notes</p>
                  <p className="italic">"{inspectStudent.notes}"</p>
                </div>
              )}

              {/* Enrolled subjects pills */}
              <div>
                <p className="text-slate-400 font-black uppercase text-[9px] mb-2">Enrolled Curriculum</p>
                <div className="flex flex-wrap gap-1.5">
                  {courses
                    .filter(c => inspectStudent.enrolledCourseIds.includes(c.id))
                    .map(c => (
                      <span key={c.id} className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-800 font-semibold font-mono text-[11px]">
                        {c.code}: {c.name}
                      </span>
                    ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  onSelectStudent(inspectStudent);
                  setInspectStudent(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Switch Current App View to this Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900">Enroll New Student</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Miller"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Grade Level</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="9th Grade">9th Grade</option>
                    <option value="10th Grade">10th Grade</option>
                    <option value="11th Grade">11th Grade</option>
                    <option value="12th Grade">12th Grade</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Section</label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Parent/Guardian</label>
                  <input
                    type="text"
                    placeholder="Parent Name"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / Academic History</label>
                <textarea
                  rows={2}
                  placeholder="Optional admission notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-xs"
                >
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
