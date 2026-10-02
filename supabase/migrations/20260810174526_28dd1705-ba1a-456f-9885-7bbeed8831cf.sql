-- 1) Teachers should not see school-wide finance data
CREATE OR REPLACE FUNCTION public.can_view_finance(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.can_manage_finance(_user_id, _school_id);
$function$;

-- 2) Payment gateway credentials: admins only (exclude 'accounts' role)
CREATE OR REPLACE FUNCTION public.can_manage_gateways(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.has_role(_user_id, 'master_admin'::app_role)
    OR public.has_role_in_school(_user_id, 'school_admin'::app_role, _school_id);
$function$;

DROP POLICY IF EXISTS gateway_manage ON public.payment_gateway_settings;

CREATE POLICY gateway_select ON public.payment_gateway_settings
FOR SELECT TO authenticated
USING (public.can_manage_gateways(auth.uid(), school_id));

CREATE POLICY gateway_insert ON public.payment_gateway_settings
FOR INSERT TO authenticated
WITH CHECK (public.can_manage_gateways(auth.uid(), school_id));

CREATE POLICY gateway_update ON public.payment_gateway_settings
FOR UPDATE TO authenticated
USING (public.can_manage_gateways(auth.uid(), school_id))
WITH CHECK (public.can_manage_gateways(auth.uid(), school_id));

CREATE POLICY gateway_delete ON public.payment_gateway_settings
FOR DELETE TO authenticated
USING (public.can_manage_gateways(auth.uid(), school_id));

-- 3) Remove direct API execute rights on internal/trigger + definer functions
REVOKE EXECUTE ON FUNCTION public.apply_account_delta(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expense_balance_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.income_balance_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.receipt_balance_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.salary_balance_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_receipt_no() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_voucher_no() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_generate_school_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.can_manage_finance(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_finance(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_gateways(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_finance(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_finance(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_gateways(uuid, uuid) TO authenticated;