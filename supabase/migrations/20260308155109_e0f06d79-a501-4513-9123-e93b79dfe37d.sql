
-- Drop existing RESTRICTIVE policies on attendance
DROP POLICY IF EXISTS "School members can view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Teachers and admins can manage attendance" ON public.attendance;

-- Recreate as PERMISSIVE policies
CREATE POLICY "School members can view attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Teachers and admins can manage attendance"
ON public.attendance
FOR ALL
TO authenticated
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'teacher'::app_role) 
    OR has_role(auth.uid(), 'school_admin'::app_role) 
    OR has_role(auth.uid(), 'master_admin'::app_role)
  )
)
WITH CHECK (
  school_id = get_user_school_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'teacher'::app_role) 
    OR has_role(auth.uid(), 'school_admin'::app_role) 
    OR has_role(auth.uid(), 'master_admin'::app_role)
  )
);
