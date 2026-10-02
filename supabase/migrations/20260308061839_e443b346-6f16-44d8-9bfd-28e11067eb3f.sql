
-- ============================================
-- SHIKKHA MULTI-TENANT SCHOOL MANAGEMENT SYSTEM
-- Full Database Schema
-- ============================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('master_admin', 'school_admin', 'sub_admin', 'teacher', 'student');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE public.payment_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE public.payment_method AS ENUM ('bkash', 'nagad', 'bank_transfer', 'cash');
CREATE TYPE public.shift_type AS ENUM ('morning', 'day', 'evening');
CREATE TYPE public.version_type AS ENUM ('bangla', 'english');

-- 2. TIMESTAMP TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. SCHOOLS TABLE
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  school_address TEXT,
  school_email TEXT,
  school_phone TEXT,
  school_logo TEXT,
  principal_signature TEXT,
  established_year INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. PROFILES TABLE (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. USER ROLES TABLE (separate from profiles per security best practice)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role, school_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. SECURITY DEFINER FUNCTIONS (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_school(_user_id UUID, _role app_role, _school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role AND school_id = _school_id
  )
$$;

-- 7. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. CLASSES TABLE
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  numeric_level INTEGER,
  shift shift_type NOT NULL DEFAULT 'morning',
  version version_type NOT NULL DEFAULT 'bangla',
  academic_year INTEGER NOT NULL DEFAULT 2026,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. SECTIONS TABLE
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON public.sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. SUBJECTS TABLE
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. STUDENTS TABLE
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  student_name TEXT NOT NULL,
  student_id TEXT,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  roll TEXT,
  guardian_name TEXT,
  phone TEXT,
  address TEXT,
  photo TEXT,
  date_of_birth DATE,
  gender TEXT,
  blood_group TEXT,
  admission_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_students_school ON public.students(school_id);
CREATE INDEX idx_students_class ON public.students(class_id);

-- 12. TEACHERS TABLE
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_name TEXT NOT NULL,
  subject TEXT,
  phone TEXT,
  email TEXT,
  photo TEXT,
  designation TEXT,
  joining_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_teachers_school ON public.teachers(school_id);

-- 13. ATTENDANCE TABLE
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'present',
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_attendance_school_date ON public.attendance(school_id, date);

-- 14. HOMEWORK TABLE
CREATE TABLE public.homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_homework_updated_at BEFORE UPDATE ON public.homework FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 15. HOMEWORK SUBMISSIONS
CREATE TABLE public.homework_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  submission_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  grade TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_hw_submissions_updated_at BEFORE UPDATE ON public.homework_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 16. RESULTS TABLE (exam definitions)
CREATE TABLE public.results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  academic_year INTEGER NOT NULL DEFAULT 2026,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_results_updated_at BEFORE UPDATE ON public.results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 17. MARKS TABLE
CREATE TABLE public.marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  result_id UUID NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(5,2),
  total_marks NUMERIC(5,2) DEFAULT 100,
  grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_marks_updated_at BEFORE UPDATE ON public.marks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 18. FEES TABLE (fee type definitions)
CREATE TABLE public.fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_year INTEGER NOT NULL DEFAULT 2026,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_fees_updated_at BEFORE UPDATE ON public.fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 19. PAYMENTS TABLE
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_id UUID REFERENCES public.fees(id) ON DELETE SET NULL,
  fee_type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'bkash',
  transaction_id TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  verified_by UUID REFERENCES auth.users(id),
  receipt_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_payments_school ON public.payments(school_id);
CREATE INDEX idx_payments_student ON public.payments(student_id);

-- 20. NOTICES TABLE
CREATE TABLE public.notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  target_schools UUID[] DEFAULT '{}',
  posted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 21. AGREEMENTS TABLE
CREATE TABLE public.agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT,
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON public.agreements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- SCHOOLS: master_admin sees all, others see their own school
CREATE POLICY "Master admins can manage all schools" ON public.schools
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "Users can view their own school" ON public.schools
  FOR SELECT TO authenticated
  USING (id = public.get_user_school_id(auth.uid()));

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view school profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'sub_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ));

-- USER ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Master admins manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

CREATE POLICY "School admins manage school roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    school_id = public.get_user_school_id(auth.uid()) AND
    public.has_role(auth.uid(), 'school_admin')
  )
  WITH CHECK (
    school_id = public.get_user_school_id(auth.uid()) AND
    public.has_role(auth.uid(), 'school_admin')
  );

-- TENANT-ISOLATED TABLES (same pattern for all school_id-based tables)
-- Students
CREATE POLICY "School members can view students" ON public.students
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Admins can manage students" ON public.students
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'sub_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'sub_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ));

-- Teachers
CREATE POLICY "School members can view teachers" ON public.teachers
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Admins can manage teachers" ON public.teachers
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ));

-- Classes
CREATE POLICY "School members can view classes" ON public.classes
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Admins can manage classes" ON public.classes
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ));

-- Sections
CREATE POLICY "School members can view sections" ON public.sections
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Admins can manage sections" ON public.sections
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ));

-- Subjects
CREATE POLICY "School members can view subjects" ON public.subjects
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Admins can manage subjects" ON public.subjects
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ));

-- Attendance
CREATE POLICY "School members can view attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Teachers and admins can manage attendance" ON public.attendance
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ));

-- Homework
CREATE POLICY "School members can view homework" ON public.homework
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Teachers and admins can manage homework" ON public.homework
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ));

-- Homework Submissions
CREATE POLICY "Students can view own submissions" ON public.homework_submissions
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Students can submit homework" ON public.homework_submissions
  FOR INSERT TO authenticated
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Teachers can manage submissions" ON public.homework_submissions
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'school_admin')
  ))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'school_admin')
  ));

-- Results
CREATE POLICY "School members can view results" ON public.results
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Admins and teachers can manage results" ON public.results
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ));

-- Marks
CREATE POLICY "School members can view marks" ON public.marks
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Teachers and admins can manage marks" ON public.marks
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'teacher') OR
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ));

-- Fees
CREATE POLICY "School members can view fees" ON public.fees
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Admins can manage fees" ON public.fees
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ));

-- Payments
CREATE POLICY "School members can view payments" ON public.payments
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Students can create payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()));

CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'sub_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin') OR
    public.has_role(auth.uid(), 'sub_admin') OR
    public.has_role(auth.uid(), 'master_admin')
  ));

-- Notices
CREATE POLICY "Users can view relevant notices" ON public.notices
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_user_school_id(auth.uid())
    OR is_broadcast = true
    OR public.has_role(auth.uid(), 'master_admin')
  );

CREATE POLICY "Admins can manage notices" ON public.notices
  FOR ALL TO authenticated
  USING (
    (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'school_admin'))
    OR public.has_role(auth.uid(), 'master_admin')
  )
  WITH CHECK (
    (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'school_admin'))
    OR public.has_role(auth.uid(), 'master_admin')
  );

-- Agreements
CREATE POLICY "Schools can view agreements" ON public.agreements
  FOR SELECT TO authenticated
  USING (
    school_id = public.get_user_school_id(auth.uid())
    OR public.has_role(auth.uid(), 'master_admin')
  );

CREATE POLICY "Master admins can manage agreements" ON public.agreements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'master_admin'));

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('school-logos', 'school-logos', true),
  ('student-photos', 'student-photos', true),
  ('teacher-photos', 'teacher-photos', true),
  ('documents', 'documents', false),
  ('homework-files', 'homework-files', false),
  ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public can view school logos" ON storage.objects FOR SELECT USING (bucket_id = 'school-logos');
CREATE POLICY "Admins can upload school logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'school-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Admins can update school logos" ON storage.objects FOR UPDATE USING (bucket_id = 'school-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Public can view student photos" ON storage.objects FOR SELECT USING (bucket_id = 'student-photos');
CREATE POLICY "Authenticated can upload student photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'student-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Public can view teacher photos" ON storage.objects FOR SELECT USING (bucket_id = 'teacher-photos');
CREATE POLICY "Authenticated can upload teacher photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'teacher-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can view documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated can upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated can view homework files" ON storage.objects FOR SELECT USING (bucket_id = 'homework-files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated can upload homework files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'homework-files' AND auth.role() = 'authenticated');

CREATE POLICY "Public can view signatures" ON storage.objects FOR SELECT USING (bucket_id = 'signatures');
CREATE POLICY "Authenticated can upload signatures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'signatures' AND auth.role() = 'authenticated');
