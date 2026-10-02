-- ============================================================================
-- SHIKKHA.COM / SCHOOLO - FULL PRODUCTION SUPABASE DATABASE SCHEMA
-- Multi-Tenant Bangladesh Education Board & NCTB Compliant School Management System
-- Updated to 100% match the frontend application, types, and all migrations
-- ============================================================================
-- Instructions: Run this script in your Supabase SQL Editor to set up the complete
-- database from scratch, or apply with Supabase CLI (`supabase db reset / push`).
-- ============================================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. CUSTOM ENUMS
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('master_admin', 'school_admin', 'sub_admin', 'teacher', 'student', 'accounts');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('bkash', 'nagad', 'bank_transfer', 'cash');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.shift_type AS ENUM ('morning', 'day', 'evening');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.version_type AS ENUM ('bangla', 'english');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================================
-- CORE PLATFORM & SCHOOLS
-- ============================================================================

-- 3. PLATFORM SETTINGS (Master Admin)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_name TEXT NOT NULL DEFAULT 'Schoolo',
  app_name_bn TEXT DEFAULT 'শিক্ষা',
  tagline TEXT DEFAULT 'Next-Gen School Management Platform',
  logo_url TEXT,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  allow_registration BOOLEAN NOT NULL DEFAULT true,
  default_language TEXT DEFAULT 'bn',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  terms_conditions TEXT,
  privacy_policy TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 4. SCHOOLS TABLE
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  school_code TEXT UNIQUE,
  eiin TEXT,
  admin_name TEXT,
  admin_email TEXT,
  admin_id_number TEXT,
  principal_name TEXT,
  principal_signature TEXT,
  registrar_signature TEXT,
  school_address TEXT,
  school_phone TEXT,
  school_email TEXT,
  school_logo TEXT,
  established_year INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  board TEXT DEFAULT 'Dhaka',
  theme_color TEXT DEFAULT '#2563eb',
  academic_session TEXT DEFAULT '2026',
  max_students INTEGER NOT NULL DEFAULT 1000,
  max_teachers INTEGER NOT NULL DEFAULT 50,
  plan_name TEXT NOT NULL DEFAULT 'free',
  subscription_expiry TIMESTAMPTZ,
  student_login_enabled BOOLEAN NOT NULL DEFAULT true,
  teacher_login_enabled BOOLEAN NOT NULL DEFAULT true,
  bank_details TEXT,
  bkash_merchant TEXT,
  nagad_merchant TEXT,
  mobile_banking_number TEXT,
  sslcommerz_store_id TEXT,
  website TEXT,
  default_version TEXT DEFAULT 'bangla',
  short_name TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_schools_is_active ON public.schools(is_active);
CREATE INDEX IF NOT EXISTS idx_schools_code ON public.schools(school_code);

-- 5. SCHOOL SETTINGS
CREATE TABLE IF NOT EXISTS public.school_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE UNIQUE,
  weekend_days TEXT[] DEFAULT ARRAY['Friday', 'Saturday'],
  academic_year TEXT DEFAULT '2026',
  marksheet_template TEXT DEFAULT 'default',
  allow_online_admission BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- 6. PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'bn',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON public.profiles(school_id);

-- 7. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role, school_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_school_id ON public.user_roles(school_id);

-- Helper security functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_role_in_school(_user_id UUID, _role app_role, _school_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND school_id = _school_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_school_id(_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_school_id UUID;
BEGIN
  SELECT school_id INTO v_school_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
  IF v_school_id IS NULL THEN
    SELECT school_id INTO v_school_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  END IF;
  RETURN v_school_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_student_id_for_user(_user_id UUID)
RETURNS UUID AS $$
  SELECT id FROM public.students WHERE user_id = _user_id LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_school_info_safe(_school_id UUID)
RETURNS TABLE(school_name TEXT, school_logo TEXT, school_phone TEXT, school_address TEXT) AS $$
  SELECT school_name, school_logo, school_phone, school_address
  FROM public.schools WHERE id = _school_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- ACADEMIC STRUCTURE (Classes, Sections, Subjects, Students, Teachers, Staff)
-- ============================================================================

-- 8. CLASSES TABLE
CREATE TABLE IF NOT EXISTS public.classes (
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
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes(school_id);

-- 9. SECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sections_school_id ON public.sections(school_id);
CREATE INDEX IF NOT EXISTS idx_sections_class_id ON public.sections(class_id);

-- 10. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON public.subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON public.subjects(class_id);

-- 11. SUBJECT SETUPS (NCTB / CQ / MCQ / Practical / Combined Papers / Groups)
CREATE TABLE IF NOT EXISTS public.subject_setups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  classes TEXT[] NOT NULL DEFAULT '{}',
  sections TEXT[] NOT NULL DEFAULT '{}',
  class_group TEXT NOT NULL DEFAULT 'General',
  full_marks NUMERIC NOT NULL DEFAULT 100,
  cq_total NUMERIC NOT NULL DEFAULT 70,
  cq_pass NUMERIC NOT NULL DEFAULT 23,
  mcq_total NUMERIC NOT NULL DEFAULT 30,
  mcq_pass NUMERIC NOT NULL DEFAULT 10,
  ct_enabled BOOLEAN NOT NULL DEFAULT false,
  ct_total NUMERIC NOT NULL DEFAULT 0,
  mt_enabled BOOLEAN NOT NULL DEFAULT false,
  mt_total NUMERIC NOT NULL DEFAULT 0,
  practical_enabled BOOLEAN NOT NULL DEFAULT false,
  practical_total NUMERIC NOT NULL DEFAULT 0,
  practical_pass NUMERIC NOT NULL DEFAULT 0,
  is_optional BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subject_setups ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_subject_setups_school_id ON public.subject_setups(school_id);

-- 12. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
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
  optional_subject TEXT,
  group_subjects TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_section_id ON public.students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);

-- 13. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_name TEXT NOT NULL,
  subject TEXT,
  designation TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  photo TEXT,
  blood_group TEXT,
  joining_date DATE,
  teacher_id_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  can_manage_attendance BOOLEAN NOT NULL DEFAULT true,
  can_manage_classes BOOLEAN NOT NULL DEFAULT false,
  can_entry_results BOOLEAN NOT NULL DEFAULT true,
  can_manage_homework BOOLEAN NOT NULL DEFAULT true,
  can_send_notices BOOLEAN NOT NULL DEFAULT false,
  can_view_reports BOOLEAN NOT NULL DEFAULT false,
  can_manage_payments BOOLEAN NOT NULL DEFAULT false,
  can_add_students BOOLEAN NOT NULL DEFAULT false,
  can_edit_students BOOLEAN NOT NULL DEFAULT false,
  can_manage_settings BOOLEAN NOT NULL DEFAULT false,
  can_use_ai_tools BOOLEAN NOT NULL DEFAULT true,
  attendance_scope_students BOOLEAN NOT NULL DEFAULT true,
  attendance_scope_teachers BOOLEAN NOT NULL DEFAULT false,
  attendance_scope_staff BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);

-- 14. TEACHER ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL DEFAULT 2026,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school_id ON public.teacher_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher_id ON public.teacher_assignments(teacher_id);

-- 15. STAFF TABLE
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  national_id TEXT,
  joining_date DATE,
  salary NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_staff_school_id ON public.staff(school_id);

-- ============================================================================
-- ATTENDANCE & LEAVES
-- ============================================================================

-- 16. STUDENT ATTENDANCE
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  remarks TEXT,
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON public.attendance(school_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);

-- 17. STAFF ATTENDANCE
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  check_in TIME,
  check_out TIME,
  notes TEXT,
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, date)
);
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_staff_attendance_school_date ON public.staff_attendance(school_id, date);

-- 18. TEACHER ATTENDANCE
CREATE TABLE IF NOT EXISTS public.teacher_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  marked_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, date)
);
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_school_date ON public.teacher_attendance(school_id, date);

-- ============================================================================
-- EXAMS, RESULTS & MARKS (NCTB & BANGLADESH BOARD COMPLIANT)
-- ============================================================================

-- 19. RESULTS TABLE (Exam session definitions)
CREATE TABLE IF NOT EXISTS public.results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  exam_name TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  academic_year INTEGER NOT NULL DEFAULT 2026,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_results_school_class ON public.results(school_id, class_id);

-- 20. MARKS TABLE (Individual subject marks)
CREATE TABLE IF NOT EXISTS public.marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  result_id UUID NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  marks_obtained NUMERIC(5,2),
  total_marks NUMERIC(5,2) DEFAULT 100,
  grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(result_id, student_id, subject_id)
);
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_marks_result_id ON public.marks(result_id);
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON public.marks(student_id);

-- 21. FINAL RESULTS (Combined results, GPA, Grades & Merit Position)
CREATE TABLE IF NOT EXISTS public.final_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  exam_name TEXT NOT NULL,
  academic_year INTEGER NOT NULL DEFAULT 2026,
  total_marks NUMERIC(7,2) NOT NULL DEFAULT 0,
  gpa NUMERIC(3,2) NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT 'F',
  is_passed BOOLEAN NOT NULL DEFAULT false,
  failed_subjects TEXT[] DEFAULT '{}',
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, student_id, exam_name, academic_year)
);
ALTER TABLE public.final_results ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_final_results_student ON public.final_results(student_id);
CREATE INDEX IF NOT EXISTS idx_final_results_rank ON public.final_results(school_id, class_id, exam_name, rank);

-- ============================================================================
-- ACCOUNTS & FINANCIAL MANAGEMENT MODULE
-- ============================================================================

-- Helper functions for finance RBAC
CREATE OR REPLACE FUNCTION public.can_manage_finance(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'master_admin'::app_role)
    OR public.has_role_in_school(_user_id, 'school_admin'::app_role, _school_id)
    OR public.has_role_in_school(_user_id, 'sub_admin'::app_role, _school_id)
    OR public.has_role_in_school(_user_id, 'accounts'::app_role, _school_id);
$$;

CREATE OR REPLACE FUNCTION public.can_view_finance(_user_id UUID, _school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.can_manage_finance(_user_id, _school_id)
    OR public.has_role_in_school(_user_id, 'teacher'::app_role, _school_id);
$$;

-- 22. FEE CATEGORIES
CREATE TABLE IF NOT EXISTS public.fee_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('one_time','monthly','yearly','custom')),
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fee_categories_school ON public.fee_categories(school_id);

-- 23. FEE STRUCTURES
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.fee_categories(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  version TEXT,
  shift TEXT,
  student_group TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_day INTEGER DEFAULT 10,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fee_structures_school ON public.fee_structures(school_id);

-- 24. STUDENT LEDGER
CREATE TABLE IF NOT EXISTS public.student_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.fee_categories(id) ON DELETE SET NULL,
  structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  period TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  fine NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'due' CHECK (status IN ('due','partial','paid','waived','cancelled')),
  due_date DATE,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_ledger ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_student_ledger_school ON public.student_ledger(school_id);
CREATE INDEX IF NOT EXISTS idx_student_ledger_student ON public.student_ledger(student_id);

-- 25. FINANCIAL ACCOUNTS (Cash / Banks / Mobile Wallets)
CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash','bank','bkash','nagad','rocket','other')),
  account_number TEXT,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_financial_accounts_school ON public.financial_accounts(school_id);

-- 26. INCOME CATEGORIES & TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.income_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.income_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.income_categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT,
  reference TEXT,
  description TEXT,
  attachment_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.income_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_income_transactions_school ON public.income_transactions(school_id);

-- 27. EXPENSE CATEGORIES & TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.expense_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  vendor TEXT,
  amount NUMERIC(14,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT,
  voucher_no TEXT,
  reference TEXT,
  description TEXT,
  attachment_url TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_expense_transactions_school ON public.expense_transactions(school_id);

-- 28. SALARY PAYMENTS
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  basic NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance NUMERIC(12,2) NOT NULL DEFAULT 0,
  deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  net NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  payslip_no TEXT,
  account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  paid_on DATE,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((teacher_id IS NOT NULL) OR (staff_id IS NOT NULL))
);
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_salary_payments_school ON public.salary_payments(school_id);

-- 29. RECEIPTS (Money Receipts)
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  receipt_no TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  ledger_ids UUID[],
  amount NUMERIC(14,2) NOT NULL,
  method TEXT,
  account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  reference TEXT,
  notes TEXT,
  issued_by UUID REFERENCES auth.users(id),
  issued_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, receipt_no)
);
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_receipts_school ON public.receipts(school_id);
CREATE INDEX IF NOT EXISTS idx_receipts_student ON public.receipts(student_id);

-- 30. PAYMENT GATEWAY SETTINGS
CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL CHECK (gateway IN ('sslcommerz','bkash','nagad','rocket','card')),
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_sandbox BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, gateway)
);
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;

-- 31. ACCOUNTS SETTINGS
CREATE TABLE IF NOT EXISTS public.accounts_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_session TEXT,
  currency TEXT NOT NULL DEFAULT 'BDT',
  currency_symbol TEXT NOT NULL DEFAULT '৳',
  decimal_places INTEGER NOT NULL DEFAULT 2,
  fiscal_year_start TEXT DEFAULT '01-01',
  receipt_prefix TEXT NOT NULL DEFAULT 'REC',
  voucher_prefix TEXT NOT NULL DEFAULT 'EXP',
  auto_receipt_number BOOLEAN NOT NULL DEFAULT true,
  auto_voucher_number BOOLEAN NOT NULL DEFAULT true,
  fine_rules JSONB DEFAULT '{}'::jsonb,
  late_fee_rules JSONB DEFAULT '{}'::jsonb,
  discount_rules JSONB DEFAULT '{}'::jsonb,
  scholarship_rules JSONB DEFAULT '{}'::jsonb,
  monthly_generation JSONB DEFAULT '{}'::jsonb,
  notification_settings JSONB DEFAULT '{}'::jsonb,
  sms_settings JSONB DEFAULT '{}'::jsonb,
  email_settings JSONB DEFAULT '{}'::jsonb,
  whatsapp_settings JSONB DEFAULT '{}'::jsonb,
  receipt_template JSONB DEFAULT '{}'::jsonb,
  invoice_template JSONB DEFAULT '{}'::jsonb,
  print_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts_settings ENABLE ROW LEVEL SECURITY;

-- 32. FINANCIAL AUDIT LOG
CREATE TABLE IF NOT EXISTS public.financial_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

-- 33. LEGACY FEES & PAYMENTS (For backward compatibility)
CREATE TABLE IF NOT EXISTS public.fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE,
  fee_type TEXT DEFAULT 'monthly',
  academic_year INTEGER NOT NULL DEFAULT 2026,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  fee_id UUID REFERENCES public.fees(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  transaction_id TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id),
  receipt_number TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Auto account balance stored procedure
CREATE OR REPLACE FUNCTION public.apply_account_delta(_account UUID, _delta NUMERIC) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.financial_accounts SET current_balance = current_balance + _delta WHERE id = _account;
$$;

-- ============================================================================
-- NOTICES, HOMEWORK & AGREEMENTS
-- ============================================================================

-- 34. NOTICES TABLE
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  posted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notices_school_id ON public.notices(school_id);

-- 35. HOMEWORK TABLE
CREATE TABLE IF NOT EXISTS public.homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  submission_text TEXT,
  attachment_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'submitted',
  marks NUMERIC,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

-- 36. AGREEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  agreed_by UUID REFERENCES auth.users(id),
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version TEXT NOT NULL DEFAULT '1.0'
);
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR ALL TABLES
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'platform_settings','schools','school_settings','profiles','user_roles',
    'classes','sections','subjects','subject_setups','students','teachers',
    'teacher_assignments','teacher_attendance','staff','staff_attendance',
    'attendance','homework','homework_submissions','results','marks',
    'final_results','fee_categories','fee_structures','student_ledger',
    'financial_accounts','income_categories','income_transactions',
    'expense_categories','expense_transactions','salary_payments','receipts',
    'payment_gateway_settings','accounts_settings','financial_audit_log',
    'fees','payments','notices','agreements'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', tbl);
    
    -- Drop existing open policies if any to avoid duplication
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'policy_authenticated_all_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'policy_anon_select_' || tbl, tbl);
    
    -- Authenticated full access policy
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', 'policy_authenticated_all_' || tbl, tbl);
    
    -- Anonymous read policy for public landing / verification
    IF tbl IN ('platform_settings', 'schools', 'classes', 'sections', 'subject_setups', 'notices') THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon;', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true);', 'policy_anon_select_' || tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- STORAGE BUCKETS SETUP
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('school-assets', 'school-assets', true),
  ('student-photos', 'student-photos', true),
  ('teacher-photos', 'teacher-photos', true),
  ('staff-photos', 'staff-photos', true),
  ('documents', 'documents', true),
  ('homework-attachments', 'homework-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
  CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
