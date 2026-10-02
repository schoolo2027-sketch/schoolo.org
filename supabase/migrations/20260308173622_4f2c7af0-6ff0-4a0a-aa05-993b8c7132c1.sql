
-- Fix: Recreate schools_public view with security_invoker=on
-- Since security_invoker=on uses caller's RLS, and we restricted base table to admins,
-- we need a security definer FUNCTION instead of a view for teacher/student access.

DROP VIEW IF EXISTS public.schools_public;

-- Create a security definer function that returns safe school info for any authenticated user
CREATE OR REPLACE FUNCTION public.get_school_info_safe(_school_id uuid)
RETURNS TABLE (
  id uuid, school_name text, school_logo text, school_address text, 
  school_phone text, school_email text, eiin text, website text,
  principal_name text, established_year integer, default_version text,
  student_login_enabled boolean, teacher_login_enabled boolean, is_active boolean,
  principal_signature text, registrar_signature text, school_code text,
  bkash_merchant text, nagad_merchant text, sslcommerz_store_id text,
  mobile_banking_number text, bank_details text, plan_name text,
  max_students integer, max_teachers integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.school_name, s.school_logo, s.school_address,
         s.school_phone, s.school_email, s.eiin, s.website,
         s.principal_name, s.established_year, s.default_version,
         s.student_login_enabled, s.teacher_login_enabled, s.is_active,
         s.principal_signature, s.registrar_signature, s.school_code,
         s.bkash_merchant, s.nagad_merchant, s.sslcommerz_store_id,
         s.mobile_banking_number, s.bank_details, s.plan_name,
         s.max_students, s.max_teachers
  FROM public.schools s
  WHERE s.id = _school_id
    AND (s.id = get_user_school_id(auth.uid()) OR has_role(auth.uid(), 'master_admin'::app_role))
$$;
