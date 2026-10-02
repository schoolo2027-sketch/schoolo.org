
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage platform settings"
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role));

CREATE POLICY "Anyone authenticated can read platform settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (true);

-- Insert default owner signature key
INSERT INTO public.platform_settings (key, value) VALUES ('owner_signature', null)
ON CONFLICT (key) DO NOTHING;
