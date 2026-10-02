
-- 1. Helper function: get student record id for a user
CREATE OR REPLACE FUNCTION public.get_student_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.students WHERE user_id = _user_id AND is_active = true LIMIT 1
$$;

-- 2. Fix students SELECT: students see only own record
DROP POLICY IF EXISTS "School members can view students" ON public.students;
CREATE POLICY "School members can view students" ON public.students
FOR SELECT TO authenticated
USING (
  school_id = get_user_school_id(auth.uid()) AND (
    has_role(auth.uid(), 'school_admin'::app_role) OR
    has_role(auth.uid(), 'sub_admin'::app_role) OR
    has_role(auth.uid(), 'teacher'::app_role) OR
    has_role(auth.uid(), 'master_admin'::app_role) OR
    (has_role(auth.uid(), 'student'::app_role) AND user_id = auth.uid())
  )
);

-- 3. Fix payments SELECT: students see only own payments
DROP POLICY IF EXISTS "School members can view payments" ON public.payments;
CREATE POLICY "School members can view payments" ON public.payments
FOR SELECT TO authenticated
USING (
  school_id = get_user_school_id(auth.uid()) AND (
    has_role(auth.uid(), 'school_admin'::app_role) OR
    has_role(auth.uid(), 'sub_admin'::app_role) OR
    has_role(auth.uid(), 'teacher'::app_role) OR
    has_role(auth.uid(), 'master_admin'::app_role) OR
    (has_role(auth.uid(), 'student'::app_role) AND student_id = get_student_id_for_user(auth.uid()))
  )
);

-- 4. Fix marks SELECT: students see only own marks
DROP POLICY IF EXISTS "School members can view marks" ON public.marks;
CREATE POLICY "School members can view marks" ON public.marks
FOR SELECT TO authenticated
USING (
  school_id = get_user_school_id(auth.uid()) AND (
    has_role(auth.uid(), 'school_admin'::app_role) OR
    has_role(auth.uid(), 'teacher'::app_role) OR
    has_role(auth.uid(), 'master_admin'::app_role) OR
    (has_role(auth.uid(), 'student'::app_role) AND student_id = get_student_id_for_user(auth.uid()))
  )
);

-- 5. Fix homework_submissions SELECT: students see only own submissions
DROP POLICY IF EXISTS "Students can view own submissions" ON public.homework_submissions;
CREATE POLICY "Students can view own submissions" ON public.homework_submissions
FOR SELECT TO authenticated
USING (
  school_id = get_user_school_id(auth.uid()) AND (
    has_role(auth.uid(), 'teacher'::app_role) OR
    has_role(auth.uid(), 'school_admin'::app_role) OR
    has_role(auth.uid(), 'master_admin'::app_role) OR
    (has_role(auth.uid(), 'student'::app_role) AND student_id = get_student_id_for_user(auth.uid()))
  )
);

-- 6. Fix attendance SELECT: students see only own attendance
DROP POLICY IF EXISTS "School members can view attendance" ON public.attendance;
CREATE POLICY "School members can view attendance" ON public.attendance
FOR SELECT TO authenticated
USING (
  school_id = get_user_school_id(auth.uid()) AND (
    has_role(auth.uid(), 'school_admin'::app_role) OR
    has_role(auth.uid(), 'teacher'::app_role) OR
    has_role(auth.uid(), 'master_admin'::app_role) OR
    (has_role(auth.uid(), 'student'::app_role) AND student_id = get_student_id_for_user(auth.uid()))
  )
);

-- 7. Fix staff policies: scope to authenticated role
DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;
DROP POLICY IF EXISTS "School members can view staff" ON public.staff;

CREATE POLICY "Admins can manage staff" ON public.staff
FOR ALL TO authenticated
USING (
  school_id = get_user_school_id(auth.uid()) AND (
    has_role(auth.uid(), 'school_admin'::app_role) OR
    has_role(auth.uid(), 'master_admin'::app_role)
  )
)
WITH CHECK (
  school_id = get_user_school_id(auth.uid()) AND (
    has_role(auth.uid(), 'school_admin'::app_role) OR
    has_role(auth.uid(), 'master_admin'::app_role)
  )
);

CREATE POLICY "School members can view staff" ON public.staff
FOR SELECT TO authenticated
USING (school_id = get_user_school_id(auth.uid()));

-- 8. Schools: create safe public view excluding sensitive admin fields
-- Students need bkash/nagad/bank info for payments, so only exclude admin_id_number
CREATE OR REPLACE VIEW public.schools_public AS
SELECT id, school_name, school_logo, school_address, school_phone, school_email,
       eiin, website, principal_name, established_year, default_version,
       student_login_enabled, teacher_login_enabled, is_active,
       principal_signature, registrar_signature, school_code,
       bkash_merchant, nagad_merchant, sslcommerz_store_id,
       mobile_banking_number, bank_details, max_students, max_teachers,
       plan_name, subscription_expiry, created_at, updated_at
FROM public.schools
WHERE id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role);

GRANT SELECT ON public.schools_public TO authenticated;

-- Restrict base table SELECT: only admins can directly query schools
DROP POLICY IF EXISTS "Users can view their own school" ON public.schools;
CREATE POLICY "Admins can view own school" ON public.schools
FOR SELECT TO authenticated
USING (
  (id = get_user_school_id(auth.uid()) AND (
    has_role(auth.uid(), 'school_admin'::app_role) OR
    has_role(auth.uid(), 'sub_admin'::app_role)
  )) OR
  has_role(auth.uid(), 'master_admin'::app_role)
);
