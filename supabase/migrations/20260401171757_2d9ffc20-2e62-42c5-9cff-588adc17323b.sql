
-- Add soft delete support to schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Add publish support to results
ALTER TABLE public.results ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- Auto-generate school_code if not set (trigger)
CREATE OR REPLACE FUNCTION public.auto_generate_school_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.school_code IS NULL OR NEW.school_code = '' THEN
    NEW.school_code := 'SCH-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_school_code ON public.schools;
CREATE TRIGGER trigger_auto_school_code
  BEFORE INSERT ON public.schools
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_school_code();
