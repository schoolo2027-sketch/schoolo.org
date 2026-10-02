
CREATE TABLE public.subject_setups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  full_marks numeric NOT NULL DEFAULT 100,
  class_group text NOT NULL DEFAULT 'play_8',
  classes text[] NOT NULL DEFAULT '{}',
  sections text[] NOT NULL DEFAULT '{}',
  cq_total numeric NOT NULL DEFAULT 0,
  cq_pass numeric NOT NULL DEFAULT 0,
  mcq_total numeric NOT NULL DEFAULT 0,
  mcq_pass numeric NOT NULL DEFAULT 0,
  ct_enabled boolean NOT NULL DEFAULT false,
  ct_total numeric NOT NULL DEFAULT 0,
  mt_enabled boolean NOT NULL DEFAULT false,
  mt_total numeric NOT NULL DEFAULT 0,
  practical_enabled boolean NOT NULL DEFAULT false,
  practical_total numeric NOT NULL DEFAULT 0,
  practical_pass numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subject_setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view subject setups"
ON public.subject_setups FOR SELECT
TO authenticated
USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can manage subject setups"
ON public.subject_setups FOR ALL
TO authenticated
USING (
  (school_id = get_user_school_id(auth.uid())) AND 
  (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role))
)
WITH CHECK (
  (school_id = get_user_school_id(auth.uid())) AND 
  (has_role(auth.uid(), 'school_admin'::app_role) OR has_role(auth.uid(), 'master_admin'::app_role))
);
