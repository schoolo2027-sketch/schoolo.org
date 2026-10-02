import { useState, FormEvent } from 'react';
import { Course, ScheduleSlot, Student } from '../types';
import { 
  X, 
  Video, 
  Mic, 
  MicOff, 
  Camera, 
  CameraOff, 
  MessageSquare, 
  FileText, 
  Users, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Hand,
  Download,
  Share2
} from 'lucide-react';
const confetti = (typeof window !== "undefined" && (window as any).confetti) || (() => {});

interface VirtualClassModalProps {
  course: Course;
  slot?: ScheduleSlot;
  student: Student;
  onClose: () => void;
}

interface ChatMsg {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: string;
  isTeacher?: boolean;
}

export default function VirtualClassModal({
  course,
  slot,
  student,
  onClose
}: VirtualClassModalProps) {
  const [activeTab, setActiveTab] = useState<'stream' | 'chat' | 'materials' | 'notes'>('stream');
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [chatInput, setChatInput] = useState('');
  
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      id: 'm1',
      sender: course.teacherName,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      text: `Welcome everyone to ${course.name}. Today we are reviewing key problem sets and laboratory data conclusions.`,
      time: '08:32',
      isTeacher: true
    },
    {
      id: 'm2',
      sender: 'Sophia Patel',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      text: 'Good morning Dr. Vance! Question on problem 4b regarding boundary value integration.',
      time: '08:34'
    }
  ]);

  const [studentNotes, setStudentNotes] = useState(
    `# ${course.name} - Lecture Notes\n\n- Key Formula: d/dx [f(g(x))] = f'(g(x)) * g'(x)\n- Remember to account for domain restrictions on trig functions\n- Homework Problem Set #4 due Friday before Period 7.`
  );

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages(prev => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: student.name,
        avatar: student.avatar,
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setChatInput('');
  };

  const handleRaiseHand = () => {
    setHandRaised(!handRaised);
    if (!handRaised) {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.8 }
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-sm rotate-45 flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight">{course.name}</span>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold">
                  {course.code}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  LIVE STREAM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Instructor: {course.teacherName} • Classroom: {course.room}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body: Left Video/Canvas, Right Interactive Panel */}
        <div className="flex-1 grid grid-cols-12 overflow-hidden bg-slate-900">
          {/* Main Stage (col-span-8) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col border-r border-slate-800 relative bg-slate-950">
            <div className="flex-1 p-6 flex flex-col justify-center items-center text-center relative overflow-hidden">
              {/* Geometric Classroom Whiteboard Visual */}
              <div className="w-full h-full bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-center text-slate-400 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <Sparkles className="w-4 h-4" />
                    Interactive Smart Whiteboard
                  </span>
                  <span>Fall 2026 • Unit 4</span>
                </div>

                <div className="my-auto py-8">
                  <div className="inline-block p-4 bg-slate-950/80 rounded-2xl border border-slate-800 max-w-lg">
                    <p className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1">
                      Today's Live Demonstration
                    </p>
                    <h3 className="text-xl font-black text-white">{course.name}</h3>
                    <div className="mt-3 p-3 bg-slate-900 rounded-xl text-left font-mono text-xs text-slate-300 border border-slate-800">
                      <p className="text-emerald-400 font-bold">// Theorem Verification</p>
                      <p className="mt-1">lim(x→0) [sin(x)/x] = 1</p>
                      <p className="mt-1 text-slate-400">f'(x) = 3x² + 2x - 5</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span className="flex items-center gap-2">
                    <img
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                      alt={course.teacherName}
                      className="w-6 h-6 rounded-full object-cover border border-slate-700"
                    />
                    <span className="text-white font-medium">{course.teacherName} (Presenting)</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">HD 1080p • 60 FPS</span>
                </div>
              </div>
            </div>

            {/* Bottom Stream Controls Bar */}
            <div className="h-16 bg-[#0F172A] border-t border-slate-800 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMicOn(!micOn)}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    micOn ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  <span>{micOn ? 'Mic On' : 'Mute'}</span>
                </button>
                <button
                  onClick={() => setCamOn(!camOn)}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    camOn ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {camOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                  <span>{camOn ? 'Video On' : 'Stop Video'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRaiseHand}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    handRaised
                      ? 'bg-amber-500 text-white animate-bounce'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Hand className="w-4 h-4" />
                  <span>{handRaised ? 'Hand Raised!' : 'Raise Hand'}</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Leave Class Hub
                </button>
              </div>
            </div>
          </div>

          {/* Right Interactive Sidebar (col-span-4) */}
          <div className="col-span-12 lg:col-span-4 bg-white flex flex-col h-full overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
              <button
                onClick={() => setActiveTab('stream')}
                className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                  activeTab === 'stream'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Chat & Q&A
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                  activeTab === 'materials'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Handouts
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                  activeTab === 'notes'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                My Notes
              </button>
            </div>

            {/* Tab 1: Live Chat */}
            {activeTab === 'stream' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-4 space-y-3.5 overflow-y-auto">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-2.5 text-xs">
                      <img src={msg.avatar} alt={msg.sender} className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <span className={`font-bold ${msg.isTeacher ? 'text-blue-600' : 'text-slate-900'}`}>
                            {msg.sender} {msg.isTeacher && '★'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{msg.time}</span>
                        </div>
                        <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask a question in class..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center hover:bg-blue-700"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* Tab 2: Materials */}
            {activeTab === 'materials' && (
              <div className="flex-1 p-4 space-y-3 overflow-y-auto text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-bold text-slate-900">Unit 4 Problem Set.pdf</p>
                      <p className="text-[10px] text-slate-500 font-mono">1.2 MB • Due Friday</p>
                    </div>
                  </div>
                  <button className="p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-white">
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-bold text-slate-900">Laboratory Data Sheet.xlsx</p>
                      <p className="text-[10px] text-slate-500 font-mono">840 KB • Reference</p>
                    </div>
                  </div>
                  <button className="p-2 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-white">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Student Notes */}
            {activeTab === 'notes' && (
              <div className="flex-1 p-4 flex flex-col overflow-hidden">
                <textarea
                  value={studentNotes}
                  onChange={(e) => setStudentNotes(e.target.value)}
                  className="flex-1 w-full p-3 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 resize-none focus:outline-none focus:border-blue-500"
                  placeholder="Take scratch notes during lecture..."
                />
                <div className="mt-2 text-[10px] text-slate-400 font-mono text-right">
                  Auto-saved to your personal binder
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
