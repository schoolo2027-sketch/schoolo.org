ALTER TABLE public.fees ADD COLUMN frequency text NOT NULL DEFAULT 'one_time';
COMMENT ON COLUMN public.fees.frequency IS 'one_time or monthly';