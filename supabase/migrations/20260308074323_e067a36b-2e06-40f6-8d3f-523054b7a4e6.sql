
-- Add new columns to teachers table
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS teacher_id_number text,
  ADD COLUMN IF NOT EXISTS can_add_students boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_students boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_entry_results boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_manage_homework boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_send_notices boolean NOT NULL DEFAULT true;

-- Create teacher_assignments table for class/section assignments
CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  academic_year integer NOT NULL DEFAULT 2026,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage teacher assignments"
  ON public.teacher_assignments FOR ALL TO authenticated
  USING ((school_id = get_user_school_id(auth.uid())) AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)))
  WITH CHECK ((school_id = get_user_school_id(auth.uid())) AND (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role)));

CREATE POLICY "School members can view teacher assignments"
  ON public.teacher_assignments FOR SELECT TO authenticated
  USING (school_id = get_user_school_id(auth.uid()));
