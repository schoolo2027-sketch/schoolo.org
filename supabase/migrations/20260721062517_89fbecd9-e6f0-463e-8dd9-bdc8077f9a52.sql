
-- Helper: is user school admin OR accounts OR master for a school
CREATE OR REPLACE FUNCTION public.can_manage_finance(_user_id uuid, _school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(_user_id, 'master_admin'::app_role)
    OR public.has_role_in_school(_user_id, 'school_admin'::app_role, _school_id)
    OR public.has_role_in_school(_user_id, 'sub_admin'::app_role, _school_id)
    OR public.has_role_in_school(_user_id, 'accounts'::app_role, _school_id);
$$;

CREATE OR REPLACE FUNCTION public.can_view_finance(_user_id uuid, _school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.can_manage_finance(_user_id, _school_id)
    OR public.has_role_in_school(_user_id, 'teacher'::app_role, _school_id);
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_finance(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_finance(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_finance(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_finance(uuid, uuid) TO authenticated;

-- ============ FEE CATEGORIES ============
CREATE TABLE public.fee_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  frequency text NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('one_time','monthly','yearly','custom')),
  is_mandatory boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_categories TO authenticated;
GRANT ALL ON public.fee_categories TO service_role;
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_categories_view" ON public.fee_categories FOR SELECT TO authenticated
  USING (public.can_view_finance(auth.uid(), school_id) OR EXISTS(SELECT 1 FROM public.students s WHERE s.school_id = fee_categories.school_id AND s.user_id = auth.uid()));
CREATE POLICY "fee_categories_manage" ON public.fee_categories FOR ALL TO authenticated
  USING (public.can_manage_finance(auth.uid(), school_id)) WITH CHECK (public.can_manage_finance(auth.uid(), school_id));

-- ============ FEE STRUCTURES ============
CREATE TABLE public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.fee_categories(id) ON DELETE CASCADE,
  academic_year integer NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.sections(id) ON DELETE CASCADE,
  version text,
  shift text,
  student_group text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  due_day integer DEFAULT 10,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_structures TO authenticated;
GRANT ALL ON public.fee_structures TO service_role;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_structures_view" ON public.fee_structures FOR SELECT TO authenticated
  USING (public.can_view_finance(auth.uid(), school_id) OR EXISTS(SELECT 1 FROM public.students s WHERE s.school_id = fee_structures.school_id AND s.user_id = auth.uid()));
CREATE POLICY "fee_structures_manage" ON public.fee_structures FOR ALL TO authenticated
  USING (public.can_manage_finance(auth.uid(), school_id)) WITH CHECK (public.can_manage_finance(auth.uid(), school_id));

-- ============ STUDENT LEDGER ============
CREATE TABLE public.student_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.fee_categories(id) ON DELETE SET NULL,
  structure_id uuid REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  period text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  fine numeric(12,2) NOT NULL DEFAULT 0,
  paid numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'due' CHECK (status IN ('due','partial','paid','waived','cancelled')),
  due_date date,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_ledger TO authenticated;
GRANT ALL ON public.student_ledger TO service_role;
ALTER TABLE public.student_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_ledger_manage" ON public.student_ledger FOR ALL TO authenticated
  USING (public.can_manage_finance(auth.uid(), school_id)) WITH CHECK (public.can_manage_finance(auth.uid(), school_id));
CREATE POLICY "student_ledger_view_own" ON public.student_ledger FOR SELECT TO authenticated
  USING (
    public.can_view_finance(auth.uid(), school_id)
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_ledger.student_id AND s.user_id = auth.uid())
  );

-- ============ FINANCIAL ACCOUNTS ============
CREATE TABLE public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('cash','bank','bkash','nagad','rocket','other')),
  account_number text,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  current_balance numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_accounts TO authenticated;
GRANT ALL ON public.financial_accounts TO service_role;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_accounts_view" ON public.financial_accounts FOR SELECT TO authenticated
  USING (public.can_view_finance(auth.uid(), school_id));
CREATE POLICY "financial_accounts_manage" ON public.financial_accounts FOR ALL TO authenticated
  USING (public.can_manage_finance(auth.uid(), school_id)) WITH CHECK (public.can_manage_finance(auth.uid(), school_id));

-- ============ INCOME / EXPENSE CATEGORIES ============
CREATE TABLE public.income_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_categories TO authenticated;
GRANT ALL ON public.income_categories TO service_role;
ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "income_categories_view" ON public.income_categories FOR SELECT TO authenticated USING (public.can_view_finance(auth.uid(), school_id));
CREATE POLICY "income_categories_manage" ON public.income_categories FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid(), school_id)) WITH CHECK (public.can_manage_finance(auth.uid(), school_id));

CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_categories_view" ON public.expense_categories FOR SELECT TO authenticated USING (public.can_view_finance(auth.uid(), school_id));
CREATE POLICY "expense_categories_manage" ON public.expense_categories FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid(), school_id)) WITH CHECK (public.can_manage_finance(auth.uid(), school_id));

-- ============ INCOME / EXPENSE TXNS ============
CREATE TABLE public.income_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.income_categories(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  method text,
  reference text,
  description text,
  attachment_url text,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.income_transactions TO authenticated;
GRANT ALL ON public.income_transactions TO service_role;
ALTER TABLE public.income_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "income_txn_view" ON public.income_transactions FOR SELECT TO authenticated USING (public.can_view_finance(auth.uid(), school_id));
CREATE POLICY "income_txn_manage" ON public.income_transactions FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid(), school_id)) WITH CHECK (public.can_manage_finance(auth.uid(), school_id));

CREATE TABLE public.expense_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  vendor text,
  amount numeric(14,2) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  method text,
  voucher_no text,
  reference text,
  description text,
  attachment_url text,
  approved_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_transactions TO authenticated;
GRANT ALL ON public.expense_transactions TO service_role;
ALTER TABLE public.expense_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_txn_view" ON public.expense_transactions FOR SELECT TO authenticated USING (public.can_view_finance(auth.uid(), school_id));
CREATE POLICY "expense_txn_manage" ON public.expense_transactions FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid(), school_id)) WITH CHECK (public.can_manage_finance(auth.uid(), school_id));

-- ============ SALARY ============
CREATE TABLE public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  month text NOT NULL,
  basic numeric(12,2) NOT NULL DEFAULT 0,
  bonus numeric(12,2) NOT NULL DEFAULT 0,
  advance numeric(12,2) NOT NULL DEFAULT 0,
  deduction numeric(12,2) NOT NULL DEFAULT 0,
  net numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  payslip_no text,
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  paid_on date,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((teacher_id IS NOT NULL) OR (staff_id IS NOT NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_payments TO authenticated;
GRANT ALL ON public.salary_payments TO service_role;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salary_view" ON public.salary_payments FOR SELECT TO authenticated USING (public.can_view_finance(auth.uid(), school_id));
CREATE POLICY "salary_manage" ON public.salary_payments FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid(), school_id)) WITH CHECK (public.can_manage_finance(auth.uid(), school_id));

-- ============ RECEIPTS ============
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  receipt_no text NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  ledger_ids uuid[],
  amount numeric(14,2) NOT NULL,
  method text,
  account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  reference text,
  notes text,
  issued_by uuid REFERENCES auth.users(id),
  issued_on timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, receipt_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receipts_manage" ON public.receipts FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid(), school_id)) WITH CHECK (public.can_manage_finance(auth.uid(), school_id));
CREATE POLICY "receipts_view_own" ON public.receipts FOR SELECT TO authenticated USING (
  public.can_view_finance(auth.uid(), school_id)
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = receipts.student_id AND s.user_id = auth.uid())
);

-- ============ GATEWAY + ACCOUNTS SETTINGS ============
CREATE TABLE public.payment_gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  gateway text NOT NULL CHECK (gateway IN ('sslcommerz','bkash','nagad','rocket','card')),
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  is_sandbox boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, gateway)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateway_settings TO authenticated;
GRANT ALL ON public.payment_gateway_settings TO service_role;
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gateway_manage" ON public.payment_gateway_settings FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid(), school_id)) WITH CHECK (public.can_manage_finance(auth.uid(), school_id));

CREATE TABLE public.accounts_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_session text,
  currency text NOT NULL DEFAULT 'BDT',
  currency_symbol text NOT NULL DEFAULT '৳',
  decimal_places integer NOT NULL DEFAULT 2,
  fiscal_year_start text DEFAULT '01-01',
  receipt_prefix text NOT NULL DEFAULT 'REC',
  voucher_prefix text NOT NULL DEFAULT 'EXP',
  auto_receipt_number boolean NOT NULL DEFAULT true,
  auto_voucher_number boolean NOT NULL DEFAULT true,
  fine_rules jsonb DEFAULT '{}'::jsonb,
  late_fee_rules jsonb DEFAULT '{}'::jsonb,
  discount_rules jsonb DEFAULT '{}'::jsonb,
  scholarship_rules jsonb DEFAULT '{}'::jsonb,
  monthly_generation jsonb DEFAULT '{}'::jsonb,
  notification_settings jsonb DEFAULT '{}'::jsonb,
  sms_settings jsonb DEFAULT '{}'::jsonb,
  email_settings jsonb DEFAULT '{}'::jsonb,
  whatsapp_settings jsonb DEFAULT '{}'::jsonb,
  receipt_template jsonb DEFAULT '{}'::jsonb,
  invoice_template jsonb DEFAULT '{}'::jsonb,
  print_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounts_settings TO authenticated;
GRANT ALL ON public.accounts_settings TO service_role;
ALTER TABLE public.accounts_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acc_settings_view" ON public.accounts_settings FOR SELECT TO authenticated USING (public.can_view_finance(auth.uid(), school_id));
CREATE POLICY "acc_settings_manage" ON public.accounts_settings FOR ALL TO authenticated USING (public.can_manage_finance(auth.uid(), school_id)) WITH CHECK (public.can_manage_finance(auth.uid(), school_id));

-- ============ AUDIT LOG ============
CREATE TABLE public.financial_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.financial_audit_log TO authenticated;
GRANT ALL ON public.financial_audit_log TO service_role;
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_view" ON public.financial_audit_log FOR SELECT TO authenticated USING (public.can_manage_finance(auth.uid(), school_id));
CREATE POLICY "audit_insert" ON public.financial_audit_log FOR INSERT TO authenticated WITH CHECK (public.can_manage_finance(auth.uid(), school_id));

-- ============ TRIGGERS: updated_at ============
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'fee_categories','fee_structures','student_ledger','financial_accounts',
    'income_categories','expense_categories','income_transactions','expense_transactions',
    'salary_payments','receipts','payment_gateway_settings','accounts_settings'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_upd BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ============ TRIGGER: auto receipt_no ============
CREATE OR REPLACE FUNCTION public.gen_receipt_no() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prefix text;
  yr text := to_char(now(), 'YYYY');
  seq int;
BEGIN
  IF NEW.receipt_no IS NULL OR NEW.receipt_no = '' THEN
    SELECT COALESCE(receipt_prefix,'REC') INTO prefix FROM public.accounts_settings WHERE school_id = NEW.school_id;
    IF prefix IS NULL THEN prefix := 'REC'; END IF;
    SELECT COALESCE(MAX(CAST(regexp_replace(receipt_no, '^.*-', '') AS int)),0)+1 INTO seq
      FROM public.receipts WHERE school_id = NEW.school_id AND receipt_no LIKE prefix||'-'||yr||'-%';
    NEW.receipt_no := prefix||'-'||yr||'-'||lpad(seq::text,6,'0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_receipts_no BEFORE INSERT ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.gen_receipt_no();

-- ============ TRIGGER: auto voucher_no on expenses ============
CREATE OR REPLACE FUNCTION public.gen_voucher_no() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prefix text;
  yr text := to_char(now(), 'YYYY');
  seq int;
BEGIN
  IF NEW.voucher_no IS NULL OR NEW.voucher_no = '' THEN
    SELECT COALESCE(voucher_prefix,'EXP') INTO prefix FROM public.accounts_settings WHERE school_id = NEW.school_id;
    IF prefix IS NULL THEN prefix := 'EXP'; END IF;
    SELECT COALESCE(MAX(CAST(regexp_replace(voucher_no, '^.*-', '') AS int)),0)+1 INTO seq
      FROM public.expense_transactions WHERE school_id = NEW.school_id AND voucher_no LIKE prefix||'-'||yr||'-%';
    NEW.voucher_no := prefix||'-'||yr||'-'||lpad(seq::text,6,'0');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_expense_voucher BEFORE INSERT ON public.expense_transactions FOR EACH ROW EXECUTE FUNCTION public.gen_voucher_no();

-- ============ TRIGGER: auto account balance ============
CREATE OR REPLACE FUNCTION public.apply_account_delta(_account uuid, _delta numeric) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.financial_accounts SET current_balance = current_balance + _delta WHERE id = _account;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_account_delta(uuid, numeric) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.income_balance_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.account_id IS NOT NULL THEN
    PERFORM public.apply_account_delta(NEW.account_id, NEW.amount);
  ELSIF TG_OP = 'DELETE' AND OLD.account_id IS NOT NULL THEN
    PERFORM public.apply_account_delta(OLD.account_id, -OLD.amount);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.account_id IS NOT NULL THEN PERFORM public.apply_account_delta(OLD.account_id, -OLD.amount); END IF;
    IF NEW.account_id IS NOT NULL THEN PERFORM public.apply_account_delta(NEW.account_id, NEW.amount); END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_income_balance AFTER INSERT OR UPDATE OR DELETE ON public.income_transactions FOR EACH ROW EXECUTE FUNCTION public.income_balance_trg();

CREATE OR REPLACE FUNCTION public.expense_balance_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.account_id IS NOT NULL THEN
    PERFORM public.apply_account_delta(NEW.account_id, -NEW.amount);
  ELSIF TG_OP = 'DELETE' AND OLD.account_id IS NOT NULL THEN
    PERFORM public.apply_account_delta(OLD.account_id, OLD.amount);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.account_id IS NOT NULL THEN PERFORM public.apply_account_delta(OLD.account_id, OLD.amount); END IF;
    IF NEW.account_id IS NOT NULL THEN PERFORM public.apply_account_delta(NEW.account_id, -NEW.amount); END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_expense_balance AFTER INSERT OR UPDATE OR DELETE ON public.expense_transactions FOR EACH ROW EXECUTE FUNCTION public.expense_balance_trg();

CREATE OR REPLACE FUNCTION public.receipt_balance_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.account_id IS NOT NULL THEN
    PERFORM public.apply_account_delta(NEW.account_id, NEW.amount);
  ELSIF TG_OP = 'DELETE' AND OLD.account_id IS NOT NULL THEN
    PERFORM public.apply_account_delta(OLD.account_id, -OLD.amount);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_receipt_balance AFTER INSERT OR DELETE ON public.receipts FOR EACH ROW EXECUTE FUNCTION public.receipt_balance_trg();

CREATE OR REPLACE FUNCTION public.salary_balance_trg() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'paid' AND NEW.account_id IS NOT NULL THEN
    PERFORM public.apply_account_delta(NEW.account_id, -NEW.net);
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'paid' AND OLD.account_id IS NOT NULL THEN
    PERFORM public.apply_account_delta(OLD.account_id, OLD.net);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'paid' AND OLD.account_id IS NOT NULL THEN PERFORM public.apply_account_delta(OLD.account_id, OLD.net); END IF;
    IF NEW.status = 'paid' AND NEW.account_id IS NOT NULL THEN PERFORM public.apply_account_delta(NEW.account_id, -NEW.net); END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_salary_balance AFTER INSERT OR UPDATE OR DELETE ON public.salary_payments FOR EACH ROW EXECUTE FUNCTION public.salary_balance_trg();

-- ============ INDEXES ============
CREATE INDEX idx_fee_cat_school ON public.fee_categories(school_id);
CREATE INDEX idx_fee_struct_school ON public.fee_structures(school_id, academic_year, class_id);
CREATE INDEX idx_ledger_school_student ON public.student_ledger(school_id, student_id, period);
CREATE INDEX idx_ledger_status ON public.student_ledger(school_id, status);
CREATE INDEX idx_income_school_date ON public.income_transactions(school_id, date);
CREATE INDEX idx_expense_school_date ON public.expense_transactions(school_id, date);
CREATE INDEX idx_receipts_school_date ON public.receipts(school_id, issued_on);
CREATE INDEX idx_salary_school_month ON public.salary_payments(school_id, month);

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_structures;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.income_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.salary_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.receipts;
