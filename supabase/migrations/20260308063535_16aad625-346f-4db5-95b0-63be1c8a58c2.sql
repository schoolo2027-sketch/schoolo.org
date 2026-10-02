ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS school_code text UNIQUE;

-- Create index for fast lookup by school_code
CREATE INDEX IF NOT EXISTS idx_schools_school_code ON public.schools(school_code);