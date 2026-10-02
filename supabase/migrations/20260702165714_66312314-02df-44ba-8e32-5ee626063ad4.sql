
-- Documents bucket: restrict to admins/teachers only (no school-scoped path prefix exists in current uploads)
DROP POLICY IF EXISTS "Authenticated can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload documents" ON storage.objects;

CREATE POLICY "Admins and teachers can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND (
    public.has_role(auth.uid(), 'master_admin'::app_role) OR
    public.has_role(auth.uid(), 'school_admin'::app_role) OR
    public.has_role(auth.uid(), 'sub_admin'::app_role) OR
    public.has_role(auth.uid(), 'teacher'::app_role)
  )
);

CREATE POLICY "Admins and teachers can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND (
    public.has_role(auth.uid(), 'master_admin'::app_role) OR
    public.has_role(auth.uid(), 'school_admin'::app_role) OR
    public.has_role(auth.uid(), 'sub_admin'::app_role) OR
    public.has_role(auth.uid(), 'teacher'::app_role)
  )
);

CREATE POLICY "Admins and teachers can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND (
    public.has_role(auth.uid(), 'master_admin'::app_role) OR
    public.has_role(auth.uid(), 'school_admin'::app_role) OR
    public.has_role(auth.uid(), 'sub_admin'::app_role) OR
    public.has_role(auth.uid(), 'teacher'::app_role)
  )
);

-- Homework files: restrict mutations to teachers/admins
DROP POLICY IF EXISTS "Authenticated can upload homework files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload homework files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete homework files" ON storage.objects;

CREATE POLICY "Teachers and admins can upload homework files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'homework-files' AND (
    public.has_role(auth.uid(), 'master_admin'::app_role) OR
    public.has_role(auth.uid(), 'school_admin'::app_role) OR
    public.has_role(auth.uid(), 'sub_admin'::app_role) OR
    public.has_role(auth.uid(), 'teacher'::app_role)
  )
);

CREATE POLICY "Teachers and admins can delete homework files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'homework-files' AND (
    public.has_role(auth.uid(), 'master_admin'::app_role) OR
    public.has_role(auth.uid(), 'school_admin'::app_role) OR
    public.has_role(auth.uid(), 'sub_admin'::app_role) OR
    public.has_role(auth.uid(), 'teacher'::app_role)
  )
);

-- School logos: restrict INSERT/UPDATE to admins
DROP POLICY IF EXISTS "Admins can upload school logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update school logos" ON storage.objects;

CREATE POLICY "Admins can upload school logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'school-logos' AND (
    public.has_role(auth.uid(), 'master_admin'::app_role) OR
    public.has_role(auth.uid(), 'school_admin'::app_role) OR
    public.has_role(auth.uid(), 'sub_admin'::app_role)
  )
);

CREATE POLICY "Admins can update school logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'school-logos' AND (
    public.has_role(auth.uid(), 'master_admin'::app_role) OR
    public.has_role(auth.uid(), 'school_admin'::app_role) OR
    public.has_role(auth.uid(), 'sub_admin'::app_role)
  )
);

CREATE POLICY "Admins can delete school logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'school-logos' AND (
    public.has_role(auth.uid(), 'master_admin'::app_role) OR
    public.has_role(auth.uid(), 'school_admin'::app_role) OR
    public.has_role(auth.uid(), 'sub_admin'::app_role)
  )
);

-- Staff photos: restrict mutations to admins
DROP POLICY IF EXISTS "Authenticated users can upload staff photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update staff photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete staff photos" ON storage.objects;

CREATE POLICY "Admins can upload staff photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'staff-photos' AND (
    public.has_role(auth.uid(), 'master_admin'::app_role) OR
    public.has_role(auth.uid(), 'school_admin'::app_role) OR
    public.has_role(auth.uid(), 'sub_admin'::app_role)
  )
);

CREATE POLICY "Admins can update staff photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'staff-photos' AND (
    public.has_role(auth.uid(), 'master_admin'::app_role) OR
    public.has_role(auth.uid(), 'school_admin'::app_role) OR
    public.has_role(auth.uid(), 'sub_admin'::app_role)
  )
);

CREATE POLICY "Admins can delete staff photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'staff-photos' AND (
    public.has_role(auth.uid(), 'master_admin'::app_role) OR
    public.has_role(auth.uid(), 'school_admin'::app_role) OR
    public.has_role(auth.uid(), 'sub_admin'::app_role)
  )
);
