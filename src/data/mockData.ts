import { Student, Course, ScheduleSlot, GradeEntry, AttendanceRecord, Announcement, PeriodInfo } from '../types';

export const PERIOD_DEFINITIONS: PeriodInfo[] = [
  { period: 1, name: 'Period 1', startTime: '08:30', endTime: '09:20' },
  { period: 2, name: 'Period 2', startTime: '09:25', endTime: '10:15' },
  { period: 3, name: 'Period 3', startTime: '10:20', endTime: '11:10' },
  { period: 0, name: 'Morning Break', startTime: '11:10', endTime: '11:30', isBreak: true },
  { period: 4, name: 'Period 4', startTime: '11:30', endTime: '12:20' },
  { period: 99, name: 'Lunch Hour', startTime: '12:20', endTime: '13:05', isBreak: true },
  { period: 5, name: 'Period 5', startTime: '13:05', endTime: '13:55' },
  { period: 6, name: 'Period 6', startTime: '14:00', endTime: '14:50' },
  { period: 7, name: 'Period 7', startTime: '14:55', endTime: '15:45' },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'c-calc',
    code: 'MTH-401',
    name: 'AP Calculus BC',
    department: 'Mathematics',
    teacherName: 'Dr. Eleanor Vance',
    teacherEmail: 'e.vance@schoollo.com',
    room: 'Room 304',
    credits: 4,
    gradeLevel: '12th Grade',
    color: 'emerald',
    accentColor: '#10B981',
    iconName: 'Calculator'
  },
  {
    id: 'c-phys',
    code: 'SCI-302',
    name: 'AP Physics C: Mechanics',
    department: 'Science',
    teacherName: 'Prof. Marcus Chen',
    teacherEmail: 'm.chen@schoollo.com',
    room: 'Lab B-12',
    credits: 4,
    gradeLevel: '11th Grade',
    color: 'indigo',
    accentColor: '#6366F1',
    iconName: 'Atom'
  },
  {
    id: 'c-eng',
    code: 'ENG-201',
    name: 'American Literature & Composition',
    department: 'English',
    teacherName: 'Ms. Sarah Jenkins',
    teacherEmail: 's.jenkins@schoollo.com',
    room: 'Room 118',
    credits: 3,
    gradeLevel: '10th Grade',
    color: 'amber',
    accentColor: '#F59E0B',
    iconName: 'BookOpen'
  },
  {
    id: 'c-cs',
    code: 'CS-204',
    name: 'Data Structures & Python',
    department: 'Computer Science',
    teacherName: 'Mr. David Morales',
    teacherEmail: 'd.morales@schoollo.com',
    room: 'Tech Lab 4',
    credits: 3,
    gradeLevel: '10th Grade',
    color: 'cyan',
    accentColor: '#06B6D4',
    iconName: 'Code2'
  },
  {
    id: 'c-hist',
    code: 'HST-101',
    name: 'World History & Civilizations',
    department: 'Social Studies',
    teacherName: 'Dr. Arthur Pendelton',
    teacherEmail: 'a.pendelton@schoollo.com',
    room: 'Room 205',
    credits: 3,
    gradeLevel: '9th Grade',
    color: 'rose',
    accentColor: '#F43F5E',
    iconName: 'Globe'
  },
  {
    id: 'c-chem',
    code: 'SCI-201',
    name: 'Honors Organic Chemistry',
    department: 'Science',
    teacherName: 'Dr. Rebecca Alcott',
    teacherEmail: 'r.alcott@schoollo.com',
    room: 'Chem Lab 1',
    credits: 4,
    gradeLevel: '10th Grade',
    color: 'purple',
    accentColor: '#A855F7',
    iconName: 'FlaskConical'
  },
  {
    id: 'c-art',
    code: 'ART-105',
    name: 'Studio Arts & Visual Design',
    department: 'Fine Arts',
    teacherName: 'Ms. Clara Evans',
    teacherEmail: 'c.evans@schoollo.com',
    room: 'Studio A',
    credits: 2,
    gradeLevel: '10th Grade',
    color: 'teal',
    accentColor: '#14B8A6',
    iconName: 'Palette'
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std-1',
    name: 'Lucas Sterling',
    rollNumber: 'SCH-2026-081',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    grade: '10th Grade',
    section: 'Section A',
    email: 'lucas.sterling@student.schoollo.com',
    gender: 'Male',
    dob: '2010-04-12',
    parentName: 'Robert Sterling',
    parentEmail: 'robert.sterling@example.com',
    parentPhone: '+1 (555) 234-5678',
    address: '428 Elmhurst Avenue, Oakridge',
    enrolledCourseIds: ['c-calc', 'c-cs', 'c-eng', 'c-chem', 'c-art'],
    attendanceRate: 98.2,
    gpa: 3.94,
    status: 'honor-roll',
    notes: 'Excelling in algorithmic reasoning and mathematical synthesis. Captain of robotics team.'
  },
  {
    id: 'std-2',
    name: 'Maya Lin Rodriguez',
    rollNumber: 'SCH-2026-082',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    grade: '10th Grade',
    section: 'Section A',
    email: 'maya.rodriguez@student.schoollo.com',
    gender: 'Female',
    dob: '2010-08-25',
    parentName: 'Elena Rodriguez',
    parentEmail: 'elena.rodriguez@example.com',
    parentPhone: '+1 (555) 345-6789',
    address: '714 Pinecrest Way, Oakridge',
    enrolledCourseIds: ['c-phys', 'c-cs', 'c-eng', 'c-chem', 'c-art'],
    attendanceRate: 95.8,
    gpa: 3.88,
    status: 'honor-roll',
    notes: 'Strong participation in group science lab investigations. Co-editor of the literary journal.'
  },
  {
    id: 'std-3',
    name: 'Ethan Cole Becker',
    rollNumber: 'SCH-2026-083',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    grade: '10th Grade',
    section: 'Section A',
    email: 'ethan.becker@student.schoollo.com',
    gender: 'Male',
    dob: '2010-01-19',
    parentName: 'David & Karen Becker',
    parentEmail: 'karen.becker@example.com',
    parentPhone: '+1 (555) 456-7890',
    address: '109 Maple Ridge Rd, Oakridge',
    enrolledCourseIds: ['c-calc', 'c-phys', 'c-eng', 'c-chem'],
    attendanceRate: 83.4,
    gpa: 2.74,
    status: 'at-risk',
    notes: 'Needs additional mentoring in Chemistry lab reports. Frequent morning tardiness flagged.'
  },
  {
    id: 'std-4',
    name: 'Sophia Patel',
    rollNumber: 'SCH-2026-084',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    grade: '10th Grade',
    section: 'Section A',
    email: 'sophia.patel@student.schoollo.com',
    gender: 'Female',
    dob: '2010-09-03',
    parentName: 'Vikram Patel',
    parentEmail: 'v.patel@example.com',
    parentPhone: '+1 (555) 567-8901',
    address: '335 Willowbrook Lane, Oakridge',
    enrolledCourseIds: ['c-calc', 'c-cs', 'c-eng', 'c-chem', 'c-art'],
    attendanceRate: 99.0,
    gpa: 4.00,
    status: 'honor-roll',
    notes: 'Rank #1 in Class. National Merit Semifinalist contender.'
  },
  {
    id: 'std-5',
    name: 'Julian Alexander Hayes',
    rollNumber: 'SCH-2026-085',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    grade: '10th Grade',
    section: 'Section A',
    email: 'julian.hayes@student.schoollo.com',
    gender: 'Male',
    dob: '2010-11-14',
    parentName: 'Christine Hayes',
    parentEmail: 'c.hayes@example.com',
    parentPhone: '+1 (555) 678-9012',
    address: '88 Cedar Creek Blvd, Oakridge',
    enrolledCourseIds: ['c-phys', 'c-eng', 'c-hist', 'c-art'],
    attendanceRate: 91.5,
    gpa: 3.42,
    status: 'active',
    notes: 'Creative writing award recipient. Steady upward trajectory in midterm assessments.'
  },
  {
    id: 'std-6',
    name: 'Amara Grace Washington',
    rollNumber: 'SCH-2026-086',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    grade: '10th Grade',
    section: 'Section A',
    email: 'amara.washington@student.schoollo.com',
    gender: 'Female',
    dob: '2010-06-30',
    parentName: 'Marcus Washington',
    parentEmail: 'm.washington@example.com',
    parentPhone: '+1 (555) 789-0123',
    address: '502 Highland Vista, Oakridge',
    enrolledCourseIds: ['c-calc', 'c-cs', 'c-eng', 'c-chem', 'c-hist'],
    attendanceRate: 96.0,
    gpa: 3.79,
    status: 'honor-roll',
    notes: 'Outstanding leadership in student council. Consistent high scores across STEM subjects.'
  },
  {
    id: 'std-7',
    name: 'Oliver James Bennett',
    rollNumber: 'SCH-2026-087',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    grade: '10th Grade',
    section: 'Section A',
    email: 'oliver.bennett@student.schoollo.com',
    gender: 'Male',
    dob: '2010-03-22',
    parentName: 'Thomas Bennett',
    parentEmail: 't.bennett@example.com',
    parentPhone: '+1 (555) 890-1234',
    address: '210 Beacon Hill Road, Oakridge',
    enrolledCourseIds: ['c-calc', 'c-phys', 'c-cs', 'c-eng', 'c-art'],
    attendanceRate: 93.2,
    gpa: 3.55,
    status: 'active',
    notes: 'Solid test performer with great collaboration in computer science pair programming.'
  },
  {
    id: 'std-8',
    name: 'Chloe Isabella Vance',
    rollNumber: 'SCH-2026-088',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    grade: '10th Grade',
    section: 'Section A',
    email: 'chloe.vance@student.schoollo.com',
    gender: 'Female',
    dob: '2010-07-09',
    parentName: 'Diane Vance',
    parentEmail: 'diane.vance@example.com',
    parentPhone: '+1 (555) 901-2345',
    address: '94 Sunset Terrace, Oakridge',
    enrolledCourseIds: ['c-eng', 'c-chem', 'c-hist', 'c-art'],
    attendanceRate: 88.6,
    gpa: 3.12,
    status: 'active',
    notes: 'Artistic talent recognized in state gallery exhibition. Improving chemistry coursework.'
  }
];

export const INITIAL_SCHEDULE_SLOTS: ScheduleSlot[] = [
  // Monday
  { id: 's-m1', courseId: 'c-calc', day: 'Mon', period: 1, startTime: '08:30', endTime: '09:20', room: 'Room 304', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-m2', courseId: 'c-phys', day: 'Mon', period: 2, startTime: '09:25', endTime: '10:15', room: 'Lab B-12', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-m3', courseId: 'c-cs', day: 'Mon', period: 3, startTime: '10:20', endTime: '11:10', room: 'Tech Lab 4', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-m4', courseId: 'c-eng', day: 'Mon', period: 4, startTime: '11:30', endTime: '12:20', room: 'Room 118', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-m5', courseId: 'c-chem', day: 'Mon', period: 5, startTime: '13:05', endTime: '13:55', room: 'Chem Lab 1', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-m6', courseId: 'c-hist', day: 'Mon', period: 6, startTime: '14:00', endTime: '14:50', room: 'Room 205', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-m7', courseId: 'c-art', day: 'Mon', period: 7, startTime: '14:55', endTime: '15:45', room: 'Studio A', gradeLevel: '10th Grade', section: 'Section A' },

  // Tuesday
  { id: 's-t1', courseId: 'c-cs', day: 'Tue', period: 1, startTime: '08:30', endTime: '09:20', room: 'Tech Lab 4', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-t2', courseId: 'c-calc', day: 'Tue', period: 2, startTime: '09:25', endTime: '10:15', room: 'Room 304', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-t3', courseId: 'c-chem', day: 'Tue', period: 3, startTime: '10:20', endTime: '11:10', room: 'Chem Lab 1', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-t4', courseId: 'c-phys', day: 'Tue', period: 4, startTime: '11:30', endTime: '12:20', room: 'Lab B-12', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-t5', courseId: 'c-eng', day: 'Tue', period: 5, startTime: '13:05', endTime: '13:55', room: 'Room 118', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-t6', courseId: 'c-art', day: 'Tue', period: 6, startTime: '14:00', endTime: '14:50', room: 'Studio A', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-t7', courseId: 'c-hist', day: 'Tue', period: 7, startTime: '14:55', endTime: '15:45', room: 'Room 205', gradeLevel: '10th Grade', section: 'Section A' },

  // Wednesday
  { id: 's-w1', courseId: 'c-eng', day: 'Wed', period: 1, startTime: '08:30', endTime: '09:20', room: 'Room 118', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-w2', courseId: 'c-chem', day: 'Wed', period: 2, startTime: '09:25', endTime: '10:15', room: 'Chem Lab 1', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-w3', courseId: 'c-calc', day: 'Wed', period: 3, startTime: '10:20', endTime: '11:10', room: 'Room 304', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-w4', courseId: 'c-cs', day: 'Wed', period: 4, startTime: '11:30', endTime: '12:20', room: 'Tech Lab 4', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-w5', courseId: 'c-phys', day: 'Wed', period: 5, startTime: '13:05', endTime: '13:55', room: 'Lab B-12', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-w6', courseId: 'c-hist', day: 'Wed', period: 6, startTime: '14:00', endTime: '14:50', room: 'Room 205', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-w7', courseId: 'c-art', day: 'Wed', period: 7, startTime: '14:55', endTime: '15:45', room: 'Studio A', gradeLevel: '10th Grade', section: 'Section A' },

  // Thursday
  { id: 's-th1', courseId: 'c-calc', day: 'Thu', period: 1, startTime: '08:30', endTime: '09:20', room: 'Room 304', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-th2', courseId: 'c-phys', day: 'Thu', period: 2, startTime: '09:25', endTime: '10:15', room: 'Lab B-12', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-th3', courseId: 'c-eng', day: 'Thu', period: 3, startTime: '10:20', endTime: '11:10', room: 'Room 118', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-th4', courseId: 'c-chem', day: 'Thu', period: 4, startTime: '11:30', endTime: '12:20', room: 'Chem Lab 1', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-th5', courseId: 'c-cs', day: 'Thu', period: 5, startTime: '13:05', endTime: '13:55', room: 'Tech Lab 4', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-th6', courseId: 'c-art', day: 'Thu', period: 6, startTime: '14:00', endTime: '14:50', room: 'Studio A', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-th7', courseId: 'c-hist', day: 'Thu', period: 7, startTime: '14:55', endTime: '15:45', room: 'Room 205', gradeLevel: '10th Grade', section: 'Section A' },

  // Friday
  { id: 's-f1', courseId: 'c-cs', day: 'Fri', period: 1, startTime: '08:30', endTime: '09:20', room: 'Tech Lab 4', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-f2', courseId: 'c-calc', day: 'Fri', period: 2, startTime: '09:25', endTime: '10:15', room: 'Room 304', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-f3', courseId: 'c-phys', day: 'Fri', period: 3, startTime: '10:20', endTime: '11:10', room: 'Lab B-12', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-f4', courseId: 'c-chem', day: 'Fri', period: 4, startTime: '11:30', endTime: '12:20', room: 'Chem Lab 1', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-f5', courseId: 'c-eng', day: 'Fri', period: 5, startTime: '13:05', endTime: '13:55', room: 'Room 118', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-f6', courseId: 'c-hist', day: 'Fri', period: 6, startTime: '14:00', endTime: '14:50', room: 'Room 205', gradeLevel: '10th Grade', section: 'Section A' },
  { id: 's-f7', courseId: 'c-art', day: 'Fri', period: 7, startTime: '14:55', endTime: '15:45', room: 'Studio A', gradeLevel: '10th Grade', section: 'Section A' }
];

export const INITIAL_GRADES: GradeEntry[] = [
  // Lucas Sterling (std-1)
  { id: 'g-1', studentId: 'std-1', courseId: 'c-calc', title: 'Derivatives & Chain Rule Quiz', category: 'quiz', score: 98, maxScore: 100, weight: 10, date: '2026-08-12', feedback: 'Impeccable execution and notation.' },
  { id: 'g-2', studentId: 'std-1', courseId: 'c-calc', title: 'Integration Problem Set #3', category: 'homework', score: 95, maxScore: 100, weight: 15, date: '2026-08-18', feedback: 'Well justified steps.' },
  { id: 'g-3', studentId: 'std-1', courseId: 'c-calc', title: 'Calculus Midterm Examination', category: 'midterm', score: 96, maxScore: 100, weight: 25, date: '2026-08-22', feedback: 'Top score in class.' },
  { id: 'g-4', studentId: 'std-1', courseId: 'c-cs', title: 'Binary Trees & Graphs Project', category: 'project', score: 100, maxScore: 100, weight: 20, date: '2026-08-15', feedback: 'Clean code architecture and thorough unit tests.' },
  { id: 'g-5', studentId: 'std-1', courseId: 'c-cs', title: 'Algorithm Complexity Quiz', category: 'quiz', score: 94, maxScore: 100, weight: 10, date: '2026-08-20', feedback: 'Good Big-O calculations.' },
  { id: 'g-6', studentId: 'std-1', courseId: 'c-eng', title: 'The Great Gatsby Critical Analysis', category: 'homework', score: 91, maxScore: 100, weight: 15, date: '2026-08-14', feedback: 'Nuanced thematic exploration.' },
  { id: 'g-7', studentId: 'std-1', courseId: 'c-chem', title: 'Molecular Spectroscopy Lab', category: 'project', score: 93, maxScore: 100, weight: 20, date: '2026-08-19', feedback: 'Accurate error analysis.' },

  // Maya Rodriguez (std-2)
  { id: 'g-8', studentId: 'std-2', courseId: 'c-phys', title: 'Rotational Kinematics Lab', category: 'project', score: 96, maxScore: 100, weight: 20, date: '2026-08-16', feedback: 'Excellent experimental design.' },
  { id: 'g-9', studentId: 'std-2', courseId: 'c-phys', title: 'Thermodynamics Quiz', category: 'quiz', score: 92, maxScore: 100, weight: 10, date: '2026-08-21', feedback: 'Solid grasp of heat transfer.' },
  { id: 'g-10', studentId: 'std-2', courseId: 'c-cs', title: 'Binary Trees & Graphs Project', category: 'project', score: 95, maxScore: 100, weight: 20, date: '2026-08-15', feedback: 'Well documented recursion methods.' },
  { id: 'g-11', studentId: 'std-2', courseId: 'c-eng', title: 'The Great Gatsby Critical Analysis', category: 'homework', score: 97, maxScore: 100, weight: 15, date: '2026-08-14', feedback: 'Expressive thesis and prose.' },
  { id: 'g-12', studentId: 'std-2', courseId: 'c-chem', title: 'Molecular Spectroscopy Lab', category: 'project', score: 90, maxScore: 100, weight: 20, date: '2026-08-19', feedback: 'Good data visuals.' },

  // Ethan Becker (std-3)
  { id: 'g-13', studentId: 'std-3', courseId: 'c-calc', title: 'Derivatives & Chain Rule Quiz', category: 'quiz', score: 68, maxScore: 100, weight: 10, date: '2026-08-12', feedback: 'Needs review on trigonometric differentiation.' },
  { id: 'g-14', studentId: 'std-3', courseId: 'c-calc', title: 'Integration Problem Set #3', category: 'homework', score: 72, maxScore: 100, weight: 15, date: '2026-08-18', feedback: 'Late submission (-5 pts).' },
  { id: 'g-15', studentId: 'std-3', courseId: 'c-phys', title: 'Rotational Kinematics Lab', category: 'project', score: 76, maxScore: 100, weight: 20, date: '2026-08-16', feedback: 'Missing secondary data charts.' },
  { id: 'g-16', studentId: 'std-3', courseId: 'c-chem', title: 'Molecular Spectroscopy Lab', category: 'project', score: 65, maxScore: 100, weight: 20, date: '2026-08-19', feedback: 'Incomplete conclusion section.' },

  // Sophia Patel (std-4)
  { id: 'g-17', studentId: 'std-4', courseId: 'c-calc', title: 'Derivatives & Chain Rule Quiz', category: 'quiz', score: 100, maxScore: 100, weight: 10, date: '2026-08-12', feedback: 'Flawless work.' },
  { id: 'g-18', studentId: 'std-4', courseId: 'c-calc', title: 'Calculus Midterm Examination', category: 'midterm', score: 100, maxScore: 100, weight: 25, date: '2026-08-22', feedback: 'Perfect score.' },
  { id: 'g-19', studentId: 'std-4', courseId: 'c-cs', title: 'Binary Trees & Graphs Project', category: 'project', score: 100, maxScore: 100, weight: 20, date: '2026-08-15', feedback: 'Exceptional algorithm efficiency.' },
  { id: 'g-20', studentId: 'std-4', courseId: 'c-eng', title: 'The Great Gatsby Critical Analysis', category: 'homework', score: 99, maxScore: 100, weight: 15, date: '2026-08-14', feedback: 'College-level literary discourse.' },
  { id: 'g-21', studentId: 'std-4', courseId: 'c-chem', title: 'Molecular Spectroscopy Lab', category: 'project', score: 98, maxScore: 100, weight: 20, date: '2026-08-19', feedback: 'Comprehensive analysis.' }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  // Today (2026-08-26) - Period 1
  { id: 'att-1', studentId: 'std-1', courseId: 'c-calc', date: '2026-08-26', period: 1, status: 'present', timestamp: '08:31:12' },
  { id: 'att-2', studentId: 'std-2', courseId: 'c-calc', date: '2026-08-26', period: 1, status: 'present', timestamp: '08:32:05' },
  { id: 'att-3', studentId: 'std-3', courseId: 'c-calc', date: '2026-08-26', period: 1, status: 'late', notes: 'Arrived 12 mins late with bus pass', timestamp: '08:42:19' },
  { id: 'att-4', studentId: 'std-4', courseId: 'c-calc', date: '2026-08-26', period: 1, status: 'present', timestamp: '08:29:40' },
  { id: 'att-5', studentId: 'std-5', courseId: 'c-calc', date: '2026-08-26', period: 1, status: 'present', timestamp: '08:30:15' },
  { id: 'att-6', studentId: 'std-6', courseId: 'c-calc', date: '2026-08-26', period: 1, status: 'present', timestamp: '08:31:00' },
  { id: 'att-7', studentId: 'std-7', courseId: 'c-calc', date: '2026-08-26', period: 1, status: 'present', timestamp: '08:30:45' },
  { id: 'att-8', studentId: 'std-8', courseId: 'c-calc', date: '2026-08-26', period: 1, status: 'absent', notes: 'Parent called: Medical checkup', timestamp: '08:35:00' },

  // Period 2 Today
  { id: 'att-9', studentId: 'std-1', courseId: 'c-phys', date: '2026-08-26', period: 2, status: 'present', timestamp: '09:26:10' },
  { id: 'att-10', studentId: 'std-2', courseId: 'c-phys', date: '2026-08-26', period: 2, status: 'present', timestamp: '09:25:30' },
  { id: 'att-11', studentId: 'std-3', courseId: 'c-phys', date: '2026-08-26', period: 2, status: 'present', timestamp: '09:27:00' },
  { id: 'att-12', studentId: 'std-4', courseId: 'c-phys', date: '2026-08-26', period: 2, status: 'present', timestamp: '09:24:50' },
  { id: 'att-13', studentId: 'std-5', courseId: 'c-phys', date: '2026-08-26', period: 2, status: 'present', timestamp: '09:25:12' },
  { id: 'att-14', studentId: 'std-6', courseId: 'c-phys', date: '2026-08-26', period: 2, status: 'present', timestamp: '09:26:00' },
  { id: 'att-15', studentId: 'std-7', courseId: 'c-phys', date: '2026-08-26', period: 2, status: 'present', timestamp: '09:25:40' },
  { id: 'att-16', studentId: 'std-8', courseId: 'c-phys', date: '2026-08-26', period: 2, status: 'excused', notes: 'Doctor appointment verified', timestamp: '09:25:00' },

  // Yesterday (2026-08-25)
  { id: 'att-17', studentId: 'std-1', courseId: 'c-calc', date: '2026-08-25', period: 1, status: 'present', timestamp: '08:30:00' },
  { id: 'att-18', studentId: 'std-2', courseId: 'c-calc', date: '2026-08-25', period: 1, status: 'present', timestamp: '08:30:00' },
  { id: 'att-19', studentId: 'std-3', courseId: 'c-calc', date: '2026-08-25', period: 1, status: 'absent', notes: 'Unexcused absence', timestamp: '08:35:00' },
  { id: 'att-20', studentId: 'std-4', courseId: 'c-calc', date: '2026-08-25', period: 1, status: 'present', timestamp: '08:30:00' }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Midterm Grade Reports Available for Review',
    content: 'Fall term midterm grades have been calculated and synced across teacher gradebooks. Parents can review updated marks in the Parent Portal.',
    author: 'Principal Henderson',
    role: 'Administration',
    date: '2026-08-25',
    priority: 'high',
    targetAudience: 'all'
  },
  {
    id: 'ann-2',
    title: 'AP Science Laboratory Safety Inspection',
    content: 'All science labs in Wing B will undergo quarterly ventilation calibration on Thursday afternoon. Period 6 & 7 will relocate to Lecture Hall 1.',
    author: 'Dr. Rebecca Alcott',
    role: 'Science Dept Head',
    date: '2026-08-24',
    priority: 'normal',
    targetAudience: 'teachers'
  },
  {
    id: 'ann-3',
    title: 'Schedule Change: Robotics & Math Olympiad Tryouts',
    content: 'Math Olympiad team selection rounds begin this Friday at 15:45 in Room 304. Open to Grades 9 through 12.',
    author: 'Dr. Eleanor Vance',
    role: 'Faculty Advisor',
    date: '2026-08-23',
    priority: 'normal',
    targetAudience: 'students'
  }
];
