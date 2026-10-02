CREATE OR REPLACE FUNCTION public.can_manage_finance(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user_id, 'master_admin'::app_role)
    OR public.has_role_in_school(_user_id, 'school_admin'::app_role, _school_id)
    OR public.has_role_in_school(_user_id, 'sub_admin'::app_role, _school_id)
    OR public.has_role_in_school(_user_id, 'accounts'::app_role, _school_id);
$function$;

CREATE OR REPLACE FUNCTION public.can_view_finance(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT public.can_manage_finance(_user_id, _school_id);
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_gateways(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user_id, 'master_admin'::app_role)
    OR public.has_role_in_school(_user_id, 'school_admin'::app_role, _school_id);
$function$;

REVOKE EXECUTE ON FUNCTION public.can_manage_finance(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_finance(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_gateways(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_finance(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_finance(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_gateways(uuid, uuid) TO authenticated;