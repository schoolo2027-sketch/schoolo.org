-- ============================================================================
-- FULL APPLICATION BACKEND & SCHEMA SYNCHRONIZATION MIGRATION
-- Multi-Tenant Bangladesh Education Board & NCTB Compliant School Management System
-- Ensures all tables, columns, indexes, and RLS policies for auth linking,
-- permissions, group subjects, optional subjects, and role continuity are 100% active.
-- ============================================================================

-- 1. STUDENTS TABLE UPDATES & INDEXES
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS optional_subject TEXT,
  ADD COLUMN IF NOT EXISTS group_subjects TEXT,
  ADD COLUMN IF NOT EXISTS student_id TEXT,
  ADD COLUMN IF NOT EXISTS roll TEXT,
  ADD COLUMN IF NOT EXISTS blood_group TEXT,
  ADD COLUMN IF NOT EXISTS admission_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_section_id ON public.students(section_id);

-- 2. TEACHERS TABLE UPDATES & PERMISSIONS
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS teacher_id_number TEXT,
  ADD COLUMN IF NOT EXISTS blood_group TEXT,
  ADD COLUMN IF NOT EXISTS joining_date DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_manage_attendance BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_manage_classes BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_entry_results BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_manage_homework BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_send_notices BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_reports BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_payments BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_add_students BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_students BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_settings BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_use_ai_tools BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attendance_scope_students BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attendance_scope_teachers BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attendance_scope_staff BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON public.teachers(school_id);

-- 3. STAFF TABLE UPDATES
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS national_id TEXT,
  ADD COLUMN IF NOT EXISTS joining_date DATE,
  ADD COLUMN IF NOT EXISTS salary NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_school_id ON public.staff(school_id);

-- 4. RLS POLICIES FOR LINKED USERS
-- Ensure students can view their own profile and records
DO $$ BEGIN
  CREATE POLICY "Students can view their own student record" ON public.students
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ensure teachers can view their own record
DO $$ BEGIN
  CREATE POLICY "Teachers can view their own teacher record" ON public.teachers
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ensure staff can view their own record
DO $$ BEGIN
  CREATE POLICY "Staff can view their own staff record" ON public.staff
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
