
-- 1) payment-receipts: add UPDATE policy for owner
CREATE POLICY "Users update own payment receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-receipts' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'payment-receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 2) student-photos: explicit SELECT (public read allowed since bucket is public but be explicit for authenticated) and DELETE
CREATE POLICY "Staff can delete student photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-photos' AND (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'sub_admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
    OR has_role(auth.uid(), 'master_admin'::app_role)
  )
);

CREATE POLICY "Staff can update student photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-photos' AND (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'sub_admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
    OR has_role(auth.uid(), 'master_admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'student-photos' AND (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'sub_admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
    OR has_role(auth.uid(), 'master_admin'::app_role)
  )
);

-- 3) homework-files: add UPDATE restriction for teachers/admins
CREATE POLICY "Teachers and admins can update homework files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'homework-files' AND (
    has_role(auth.uid(), 'master_admin'::app_role)
    OR has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'sub_admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'homework-files' AND (
    has_role(auth.uid(), 'master_admin'::app_role)
    OR has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'sub_admin'::app_role)
    OR has_role(auth.uid(), 'teacher'::app_role)
  )
);

-- 4) signatures: add DELETE/UPDATE restriction for admins
CREATE POLICY "Admins can delete signatures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'signatures' AND (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'sub_admin'::app_role)
    OR has_role(auth.uid(), 'master_admin'::app_role)
  )
);

CREATE POLICY "Admins can update signatures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signatures' AND (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'sub_admin'::app_role)
    OR has_role(auth.uid(), 'master_admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'signatures' AND (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'sub_admin'::app_role)
    OR has_role(auth.uid(), 'master_admin'::app_role)
  )
);

-- 5) user_roles: tighten school_admin role-assignment to require target user already in same school
DROP POLICY IF EXISTS "School admins assign teacher or student roles" ON public.user_roles;

CREATE POLICY "School admins assign teacher or student roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  school_id = get_user_school_id(auth.uid())
  AND has_role(auth.uid(), 'school_admin'::app_role)
  AND role = ANY (ARRAY['teacher'::app_role, 'student'::app_role])
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.school_id = get_user_school_id(auth.uid())
  )
)
WITH CHECK (
  school_id = get_user_school_id(auth.uid())
  AND has_role(auth.uid(), 'school_admin'::app_role)
  AND role = ANY (ARRAY['teacher'::app_role, 'student'::app_role])
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = user_roles.user_id
      AND p.school_id = get_user_school_id(auth.uid())
  )
);
