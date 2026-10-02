-- Create storage bucket for platform assets (logo, signatures)
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-assets', 'platform-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read platform assets
CREATE POLICY "Anyone can read platform assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'platform-assets');

-- Allow master admins to upload platform assets
CREATE POLICY "Master admins can upload platform assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'platform-assets'
  AND public.has_role(auth.uid(), 'master_admin')
);

-- Allow master admins to update platform assets
CREATE POLICY "Master admins can update platform assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'platform-assets'
  AND public.has_role(auth.uid(), 'master_admin')
);

-- Allow master admins to delete platform assets
CREATE POLICY "Master admins can delete platform assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'platform-assets'
  AND public.has_role(auth.uid(), 'master_admin')
);

-- Seed platform settings for app branding
INSERT INTO public.platform_settings (key, value)
VALUES
  ('app_name', 'Shikkha'),
  ('app_name_bn', 'শিক্ষা'),
  ('app_tagline', 'School Management System'),
  ('app_logo_url', NULL),
  ('owner_signature', NULL)
ON CONFLICT DO NOTHING;
