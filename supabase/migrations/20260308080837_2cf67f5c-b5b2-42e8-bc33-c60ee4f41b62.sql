
-- Create staff table
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_name TEXT NOT NULL,
  designation TEXT DEFAULT 'Office Assistant',
  phone TEXT,
  email TEXT,
  address TEXT,
  blood_group TEXT,
  photo TEXT,
  joining_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  can_manage_students BOOLEAN NOT NULL DEFAULT false,
  can_manage_teachers BOOLEAN NOT NULL DEFAULT false,
  can_manage_results BOOLEAN NOT NULL DEFAULT false,
  can_manage_payments BOOLEAN NOT NULL DEFAULT false,
  can_manage_notices BOOLEAN NOT NULL DEFAULT false,
  can_manage_settings BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "School members can view staff"
  ON public.staff FOR SELECT
  USING (school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admins can manage staff"
  ON public.staff FOR ALL
  USING (
    school_id = get_user_school_id(auth.uid()) AND (
      has_role(auth.uid(), 'school_admin'::app_role) OR
      has_role(auth.uid(), 'master_admin'::app_role)
    )
  )
  WITH CHECK (
    school_id = get_user_school_id(auth.uid()) AND (
      has_role(auth.uid(), 'school_admin'::app_role) OR
      has_role(auth.uid(), 'master_admin'::app_role)
    )
  );

-- Create storage bucket for staff photos
INSERT INTO storage.buckets (id, name, public) VALUES ('staff-photos', 'staff-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for staff photos
CREATE POLICY "Anyone can view staff photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'staff-photos');

CREATE POLICY "Authenticated users can upload staff photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'staff-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update staff photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'staff-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete staff photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'staff-photos' AND auth.role() = 'authenticated');
