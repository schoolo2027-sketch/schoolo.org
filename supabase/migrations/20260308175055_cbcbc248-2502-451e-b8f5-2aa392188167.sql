CREATE TABLE IF NOT EXISTS public.teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  marked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, date)
);

CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  marked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id, date)
);

ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members can view teacher attendance" ON public.teacher_attendance;
CREATE POLICY "School members can view teacher attendance"
ON public.teacher_attendance
FOR SELECT
USING (
  school_id = public.get_user_school_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'school_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
    OR public.has_role(auth.uid(), 'master_admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Teachers and admins can manage teacher attendance" ON public.teacher_attendance;
CREATE POLICY "Teachers and admins can manage teacher attendance"
ON public.teacher_attendance
FOR ALL
USING (
  school_id = public.get_user_school_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'school_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
    OR public.has_role(auth.uid(), 'master_admin'::public.app_role)
  )
)
WITH CHECK (
  school_id = public.get_user_school_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'school_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
    OR public.has_role(auth.uid(), 'master_admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "School members can view staff attendance" ON public.staff_attendance;
CREATE POLICY "School members can view staff attendance"
ON public.staff_attendance
FOR SELECT
USING (
  school_id = public.get_user_school_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'school_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
    OR public.has_role(auth.uid(), 'master_admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Teachers and admins can manage staff attendance" ON public.staff_attendance;
CREATE POLICY "Teachers and admins can manage staff attendance"
ON public.staff_attendance
FOR ALL
USING (
  school_id = public.get_user_school_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'school_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
    OR public.has_role(auth.uid(), 'master_admin'::public.app_role)
  )
)
WITH CHECK (
  school_id = public.get_user_school_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'school_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'teacher'::public.app_role)
    OR public.has_role(auth.uid(), 'master_admin'::public.app_role)
  )
);