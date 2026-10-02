
CREATE TABLE public.final_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL,
  name text NOT NULL,
  academic_year text,
  class_id uuid,
  section_id uuid,
  exam_ids uuid[] NOT NULL DEFAULT '{}',
  weights numeric[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.final_results TO authenticated;
GRANT ALL ON public.final_results TO service_role;

ALTER TABLE public.final_results ENABLE ROW LEVEL SECURITY;

-- School members (admins/teachers/staff) can manage their school's final results
CREATE POLICY "School members manage final_results"
  ON public.final_results FOR ALL
  USING (school_id = public.get_user_school_id(auth.uid()) OR public.has_role(auth.uid(), 'master_admin'::app_role))
  WITH CHECK (school_id = public.get_user_school_id(auth.uid()) OR public.has_role(auth.uid(), 'master_admin'::app_role));

-- Students can read only published final results from their school
CREATE POLICY "Students can view published final_results"
  ON public.final_results FOR SELECT
  USING (is_published = true AND school_id = public.get_user_school_id(auth.uid()));

CREATE TRIGGER update_final_results_updated_at
  BEFORE UPDATE ON public.final_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.final_results;
