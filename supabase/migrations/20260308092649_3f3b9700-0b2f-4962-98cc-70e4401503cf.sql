
UPDATE storage.buckets SET public = true WHERE id = 'homework-files';

CREATE POLICY "Authenticated users can upload homework files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'homework-files');

CREATE POLICY "Anyone can view homework files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'homework-files');

CREATE POLICY "Authenticated users can delete homework files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'homework-files');
