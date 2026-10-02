
DROP POLICY IF EXISTS "Users can view relevant notices" ON public.notices;
CREATE POLICY "Users can view relevant notices"
ON public.notices FOR SELECT
TO authenticated
USING (
  (school_id = get_user_school_id(auth.uid()))
  OR (is_broadcast = true AND (target_schools IS NULL OR target_schools = '{}' OR get_user_school_id(auth.uid()) = ANY(target_schools)))
  OR has_role(auth.uid(), 'master_admin'::app_role)
);
