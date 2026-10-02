-- Add receipt_image column to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS receipt_image text;

-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for payment-receipts bucket: authenticated users can upload
CREATE POLICY "Authenticated users can upload payment receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-receipts');

-- Anyone can view payment receipts (public bucket)
CREATE POLICY "Public can view payment receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts');

-- Users can delete own uploads
CREATE POLICY "Users can delete own payment receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-receipts' AND (auth.uid()::text = (storage.foldername(name))[1]));