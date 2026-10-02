-- ============================================================================
-- 2026-09-06: SYNC FULL APP SCHEMA & COLUMNS
-- Ensures all tables, columns, indexes, and RLS policies align 100% with the frontend app
-- ============================================================================

-- 1. Ensure subject_setups has all breakdown columns and class_group
ALTER TABLE IF EXISTS public.subject_setups 
  ADD COLUMN IF NOT EXISTS class_group text NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS classes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sections text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS full_marks numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS cq_total numeric NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS cq_pass numeric NOT NULL DEFAULT 23,
  ADD COLUMN IF NOT EXISTS mcq_total numeric NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS mcq_pass numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS ct_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ct_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mt_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mt_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS practical_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS practical_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS practical_pass numeric NOT NULL DEFAULT 0;

-- 2. Ensure students has optional_subject
ALTER TABLE IF EXISTS public.students 
  ADD COLUMN IF NOT EXISTS optional_subject text;

-- 3. Ensure schools has all branding, quota, and credentials columns
ALTER TABLE IF EXISTS public.schools
  ADD COLUMN IF NOT EXISTS admin_name text,
  ADD COLUMN IF NOT EXISTS admin_email text,
  ADD COLUMN IF NOT EXISTS admin_id_number text,
  ADD COLUMN IF NOT EXISTS principal_name text,
  ADD COLUMN IF NOT EXISTS principal_signature text,
  ADD COLUMN IF NOT EXISTS registrar_signature text,
  ADD COLUMN IF NOT EXISTS school_address text,
  ADD COLUMN IF NOT EXISTS school_phone text,
  ADD COLUMN IF NOT EXISTS school_email text,
  ADD COLUMN IF NOT EXISTS school_logo text,
  ADD COLUMN IF NOT EXISTS short_name text,
  ADD COLUMN IF NOT EXISTS default_version text DEFAULT 'bangla',
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS eiin text,
  ADD COLUMN IF NOT EXISTS bank_details text,
  ADD COLUMN IF NOT EXISTS bkash_merchant text,
  ADD COLUMN IF NOT EXISTS nagad_merchant text,
  ADD COLUMN IF NOT EXISTS mobile_banking_number text,
  ADD COLUMN IF NOT EXISTS sslcommerz_store_id text,
  ADD COLUMN IF NOT EXISTS max_students integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS max_teachers integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS plan_name text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expiry timestamptz,
  ADD COLUMN IF NOT EXISTS student_login_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS teacher_login_enabled boolean NOT NULL DEFAULT true;

-- 4. Ensure results has is_published flag
ALTER TABLE IF EXISTS public.results
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- 5. Performance Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_students_school_class ON public.students(school_id, class_id);
CREATE INDEX IF NOT EXISTS idx_students_school_roll ON public.students(school_id, roll);
CREATE INDEX IF NOT EXISTS idx_marks_result_student ON public.marks(result_id, student_id);
CREATE INDEX IF NOT EXISTS idx_subject_setups_school ON public.subject_setups(school_id);
CREATE INDEX IF NOT EXISTS idx_sections_class ON public.sections(class_id);
CREATE INDEX IF NOT EXISTS idx_student_ledger_student ON public.student_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_student_ledger_school ON public.student_ledger(school_id);
CREATE INDEX IF NOT EXISTS idx_receipts_student ON public.receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_school ON public.receipts(school_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_school ON public.salary_payments(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON public.attendance(school_id, date);
