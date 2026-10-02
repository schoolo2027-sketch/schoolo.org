-- Allow all authenticated users to read their own school's is_active status
-- This is needed for the login suspend check
CREATE POLICY "Users can view own school"
ON public.schools
FOR SELECT
TO authenticated
USING (id = get_user_school_id(auth.uid()));