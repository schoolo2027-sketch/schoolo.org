-- Allow teachers to manage students (add/edit) in their school
CREATE POLICY "Teachers can manage students"
ON public.students
FOR ALL
TO authenticated
USING (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'teacher'::app_role)
)
WITH CHECK (
  school_id = get_user_school_id(auth.uid()) 
  AND has_role(auth.uid(), 'teacher'::app_role)
);