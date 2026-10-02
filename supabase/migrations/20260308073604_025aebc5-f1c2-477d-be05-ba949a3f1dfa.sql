
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS principal_name text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS registrar_signature text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS bkash_merchant text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS nagad_merchant text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS sslcommerz_store_id text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS admin_id_number text;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS default_version text DEFAULT 'bangla';
