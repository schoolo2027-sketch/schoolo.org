
-- receipt / voucher numbering
DROP TRIGGER IF EXISTS trg_gen_receipt_no ON public.receipts;
CREATE TRIGGER trg_gen_receipt_no BEFORE INSERT ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.gen_receipt_no();

DROP TRIGGER IF EXISTS trg_gen_voucher_no ON public.expense_transactions;
CREATE TRIGGER trg_gen_voucher_no BEFORE INSERT ON public.expense_transactions
FOR EACH ROW EXECUTE FUNCTION public.gen_voucher_no();

-- balance maintenance
DROP TRIGGER IF EXISTS trg_income_balance ON public.income_transactions;
CREATE TRIGGER trg_income_balance AFTER INSERT OR UPDATE OR DELETE ON public.income_transactions
FOR EACH ROW EXECUTE FUNCTION public.income_balance_trg();

DROP TRIGGER IF EXISTS trg_expense_balance ON public.expense_transactions;
CREATE TRIGGER trg_expense_balance AFTER INSERT OR UPDATE OR DELETE ON public.expense_transactions
FOR EACH ROW EXECUTE FUNCTION public.expense_balance_trg();

DROP TRIGGER IF EXISTS trg_receipt_balance ON public.receipts;
CREATE TRIGGER trg_receipt_balance AFTER INSERT OR DELETE ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.receipt_balance_trg();

DROP TRIGGER IF EXISTS trg_salary_balance ON public.salary_payments;
CREATE TRIGGER trg_salary_balance AFTER INSERT OR UPDATE OR DELETE ON public.salary_payments
FOR EACH ROW EXECUTE FUNCTION public.salary_balance_trg();

-- updated_at maintenance for the finance tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fee_categories','fee_structures','student_ledger','financial_accounts',
    'income_categories','expense_categories','income_transactions','expense_transactions',
    'salary_payments','receipts','accounts_settings','payment_gateway_settings']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;
