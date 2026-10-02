import { useState, useId, FormEvent } from 'react';
import { Student, Course, GradeEntry, GradeCategory } from '../types';
import { getLetterGrade, calculateCourseAverage, calculateStudentGPA } from '../utils/schoolUtils';
import { 
  Plus, 
  Sparkles, 
  Printer, 
  TrendingUp, 
  Calculator, 
  CheckCircle2, 
  Trash2, 
  Sliders, 
  BookOpen, 
  Award, 
  X,
  FileText
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface GradesViewProps {
  student: Student;
  courses: Course[];
  grades: GradeEntry[];
  role: 'admin' | 'teacher' | 'student' | 'parent';
  onAddGrade: (grade: Omit<GradeEntry, 'id'>) => void;
  onDeleteGrade: (gradeId: string) => void;
}

export default function GradesView({
  student,
  courses,
  grades,
  role,
  onAddGrade,
  onDeleteGrade
}: GradesViewProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [showAddGradeModal, setShowAddGradeModal] = useState(false);
  const [showReportCardModal, setShowReportCardModal] = useState(false);
  const [whatIfTargetCourseId, setWhatIfTargetCourseId] = useState<string>(courses[0]?.id || '');
  const [simulatedFinalScore, setSimulatedFinalScore] = useState<number>(85);

  // Form state for adding a grade
  const [newGradeTitle, setNewGradeTitle] = useState('');
  const [newGradeCourseId, setNewGradeCourseId] = useState(courses[0]?.id || '');
  const [newGradeCategory, setNewGradeCategory] = useState<GradeCategory>('quiz');
  const [newGradeScore, setNewGradeScore] = useState(90);
  const [newGradeMaxScore, setNewGradeMaxScore] = useState(100);
  const [newGradeWeight, setNewGradeWeight] = useState(15);
  const [newGradeFeedback, setNewGradeFeedback] = useState('');

  // Student specific grades
  const studentGrades = grades.filter(g => g.studentId === student.id);

  // Filtered grades based on course selection
  const filteredGrades = selectedCourseId === 'all'
    ? studentGrades
    : studentGrades.filter(g => g.courseId === selectedCourseId);

  // Compute calculated GPA
  const computedGPA = calculateStudentGPA(student.id, courses, grades);

  // Performance data for chart
  const coursePerformanceData = courses
    .filter(c => student.enrolledCourseIds.includes(c.id))
    .map(c => {
      const avg = calculateCourseAverage(student.id, c.id, grades);
      return {
        name: c.code,
        courseName: c.name,
        average: avg,
        credits: c.credits
      };
    });

  // What-if simulator calculation
  const targetCourse = courses.find(c => c.id === whatIfTargetCourseId) || courses[0];
  const currentTargetAvg = targetCourse ? calculateCourseAverage(student.id, targetCourse.id, grades) : 0;
  
  // Hypothetical new grade addition (Final Exam weight 30%)
  const simulatedAverage = Math.round((currentTargetAvg * 0.7 + simulatedFinalScore * 0.3) * 10) / 10;
  const currentLetter = getLetterGrade(currentTargetAvg);
  const simulatedLetter = getLetterGrade(simulatedAverage);

  const handleCreateGrade = (e: FormEvent) => {
    e.preventDefault();
    if (!newGradeTitle.trim()) return;

    onAddGrade({
      studentId: student.id,
      courseId: newGradeCourseId,
      title: newGradeTitle.trim(),
      category: newGradeCategory,
      score: Number(newGradeScore),
      maxScore: Number(newGradeMaxScore),
      weight: Number(newGradeWeight),
      date: new Date().toISOString().split('T')[0],
      feedback: newGradeFeedback.trim() || undefined
    });

    setNewGradeTitle('');
    setNewGradeFeedback('');
    setShowAddGradeModal(false);
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xs">
            {computedGPA.toFixed(2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Academic Gradebook</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Honor Roll Status
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {student.name} • {student.rollNumber} • {student.grade}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="print-report-card-btn"
            onClick={() => setShowReportCardModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Official Report Card</span>
          </button>

          {(role === 'teacher' || role === 'admin') && (
            <button
              id="add-grade-btn"
              onClick={() => setShowAddGradeModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Record Grade</span>
            </button>
          )}
        </div>
      </div>

      {/* Course Selector Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedCourseId('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedCourseId === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Subjects ({studentGrades.length})
        </button>
        {courses
          .filter(c => student.enrolledCourseIds.includes(c.id))
          .map(course => {
            const isSelected = selectedCourseId === course.id;
            const avg = calculateCourseAverage(student.id, course.id, grades);
            const { letter } = getLetterGrade(avg);
            return (
              <button
                key={course.id}
                onClick={() => setSelectedCourseId(course.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{course.name}</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded font-mono ${
                  isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {avg}% ({letter})
                </span>
              </button>
            );
          })}
      </div>

      {/* Grid: Course Overview Cards & Performance Bar Chart */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Grade Cards & Entries (col-span-8) */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                Assessment Log ({filteredGrades.length} Entries)
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Weighted Averages Applied</span>
            </div>

            {filteredGrades.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No recorded grades found for this filter.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredGrades.map(entry => {
                  const course = courses.find(c => c.id === entry.courseId);
                  const percentage = Math.round((entry.score / entry.maxScore) * 100);
                  const { letter, colorClass } = getLetterGrade(percentage);

                  return (
                    <div key={entry.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-slate-500 uppercase font-mono">{entry.category.slice(0, 3)}</span>
                          <span className="text-[9px] font-mono text-slate-400">{entry.weight}%</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{entry.title}</h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {course?.code}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {course?.name} • Graded on {entry.date}
                          </p>
                          {entry.feedback && (
                            <p className="text-xs text-blue-700 bg-blue-50/60 p-2 rounded-lg mt-2 border border-blue-100/60">
                              💬 Teacher Feedback: "{entry.feedback}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 ml-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className={`text-xs font-black px-2 py-0.5 rounded border font-mono ${colorClass}`}>
                              {letter}
                            </span>
                            <span className="text-base font-black text-slate-900 font-mono">
                              {entry.score}/{entry.maxScore}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {percentage}% raw score
                          </p>
                        </div>

                        {(role === 'teacher' || role === 'admin') && (
                          <button
                            onClick={() => onDeleteGrade(entry.id)}
                            className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Grade"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive What-If Simulator & Course Charts (col-span-4) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* What-If GPA Simulator Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                What-If Grade Simulator
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Project your course outcome based on your anticipated Final Exam score.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Target Subject</label>
                <select
                  value={whatIfTargetCourseId}
                  onChange={(e) => setWhatIfTargetCourseId(e.target.value)}
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
                >
                  {courses
                    .filter(c => student.enrolledCourseIds.includes(c.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Simulated Final Exam</label>
                  <span className="text-sm font-black font-mono text-blue-600">{simulatedFinalScore}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={simulatedFinalScore}
                  onChange={(e) => setSimulatedFinalScore(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                  <span>40% (F)</span>
                  <span>75% (C)</span>
                  <span>100% (A+)</span>
                </div>
              </div>

              {/* Projected Result Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Projected Course Mark</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {simulatedAverage}% <span className="text-blue-600">({simulatedLetter.letter})</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Current: {currentTargetAvg}% ({currentLetter.letter})
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 text-xs font-black rounded-lg border font-mono ${simulatedLetter.colorClass}`}>
                    {simulatedLetter.letter}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Course Performance Bar Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Course Averages Comparison
              </h3>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coursePerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} />
                  <YAxis domain={[50, 100]} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                  />
                  <Bar dataKey="average" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Add Grade Modal */}
      {showAddGradeModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-black text-slate-900">Record New Assessment Grade</h3>
              <button onClick={() => setShowAddGradeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGrade} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Assessment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 3 Trigonometry Exam"
                  value={newGradeTitle}
                  onChange={(e) => setNewGradeTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Course</label>
                  <select
                    value={newGradeCourseId}
                    onChange={(e) => setNewGradeCourseId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newGradeCategory}
                    onChange={(e) => setNewGradeCategory(e.target.value as GradeCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="homework">Homework</option>
                    <option value="quiz">Quiz</option>
                    <option value="project">Project / Lab</option>
                    <option value="midterm">Midterm Exam</option>
                    <option value="final">Final Exam</option>
                    <option value="participation">Participation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Score</label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    required
                    value={newGradeScore}
                    onChange={(e) => setNewGradeScore(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Max Score</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={newGradeMaxScore}
                    onChange={(e) => setNewGradeMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Weight %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newGradeWeight}
                    onChange={(e) => setNewGradeWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Teacher Feedback / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional constructive comments..."
                  value={newGradeFeedback}
                  onChange={(e) => setNewGradeFeedback(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddGradeModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Save Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Report Card Printable Modal */}
      {showReportCardModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b-2 border-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-sm rotate-45 flex items-center justify-center">
                  <div className="w-5 h-5 bg-white rounded-full"></div>
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">SCHOOLLO ACADEMY</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Official Academic Transcript & Term Report</p>
                </div>
              </div>
              <button
                onClick={() => setShowReportCardModal(false)}
                className="text-slate-400 hover:text-slate-600 print:hidden"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Student metadata */}
            <div className="grid grid-cols-2 gap-4 my-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <p className="text-slate-500 font-mono text-[10px] uppercase">Student Name</p>
                <p className="font-bold text-slate-900 text-sm">{student.name}</p>
                <p className="text-slate-500 font-mono text-[10px] uppercase mt-2">Student ID / Roll #</p>
                <p className="font-bold font-mono text-slate-900">{student.rollNumber}</p>
              </div>
              <div>
                <p className="text-slate-500 font-mono text-[10px] uppercase">Grade & Section</p>
                <p className="font-bold text-slate-900">{student.grade} • {student.section}</p>
                <p className="text-slate-500 font-mono text-[10px] uppercase mt-2">Term & Date</p>
                <p className="font-bold text-slate-900">Fall Semester 2026 • {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Table of courses & grades */}
            <table className="w-full text-xs text-left mb-6">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-black uppercase text-[10px]">
                  <th className="pb-2">Course Code</th>
                  <th className="pb-2">Course Name</th>
                  <th className="pb-2 text-center">Credits</th>
                  <th className="pb-2 text-center">Score %</th>
                  <th className="pb-2 text-right">Letter Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {courses
                  .filter(c => student.enrolledCourseIds.includes(c.id))
                  .map(c => {
                    const avg = calculateCourseAverage(student.id, c.id, grades);
                    const { letter } = getLetterGrade(avg);
                    return (
                      <tr key={c.id} className="py-2.5">
                        <td className="py-2.5 font-mono font-bold text-slate-600">{c.code}</td>
                        <td className="py-2.5 font-bold text-slate-900">{c.name}</td>
                        <td className="py-2.5 text-center font-mono">{c.credits}</td>
                        <td className="py-2.5 text-center font-mono font-bold">{avg}%</td>
                        <td className="py-2.5 text-right font-black font-mono text-blue-600 text-sm">{letter}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            {/* Bottom summary and GPA */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">Cumulative GPA</p>
                <p className="text-2xl font-black text-slate-900">{computedGPA.toFixed(2)} / 4.00</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase">Attendance Standing</p>
                <p className="text-base font-bold text-emerald-600">{student.attendanceRate}% Present</p>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-dashed border-slate-300 flex justify-between text-[11px] text-slate-400">
              <span>Authorized Signature: _______________________</span>
              <span>Registrar Seal Verified</span>
            </div>

            <div className="mt-6 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-slate-800"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
