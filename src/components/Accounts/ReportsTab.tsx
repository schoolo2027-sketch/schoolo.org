import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Printer, FileText, BarChart3 } from "lucide-react";
import { exportReportExcel, printReport, ReportColumn } from "@/utils/reportExport";

type Filters = { from: string; to: string; classId: string };

interface ReportDef {
  id: string;
  name: string;
  group: string;
  columns: ReportColumn[];
  load: (schoolId: string, f: Filters) => Promise<Record<string, any>[]>;
  totalKeys?: string[];
  labelKey?: string;
}

const n = (v: any) => Number(v ?? 0);
const money = (v: any) => n(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const REPORTS: ReportDef[] = [
  {
    id: "daily-collection",
    name: "Daily Collection",
    group: "Collection",
    columns: [
      { key: "date", label: "Date" },
      { key: "count", label: "Receipts", align: "center" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    totalKeys: ["amount"],
    labelKey: "date",
    load: async (schoolId, f) => {
      const { data } = await supabase.from("receipts").select("issued_on, amount")
        .eq("school_id", schoolId).is("deleted_at", null)
        .gte("issued_on", f.from).lte("issued_on", `${f.to}T23:59:59`);
      const map = new Map<string, { count: number; amount: number }>();
      (data ?? []).forEach((r: any) => {
        const d = String(r.issued_on).slice(0, 10);
        const e = map.get(d) ?? { count: 0, amount: 0 };
        e.count += 1; e.amount += n(r.amount); map.set(d, e);
      });
      return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, count: v.count, amount: money(v.amount), _amount: v.amount }));
    },
  },
  {
    id: "monthly-collection",
    name: "Monthly Collection",
    group: "Collection",
    columns: [
      { key: "month", label: "Month" },
      { key: "count", label: "Receipts", align: "center" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    totalKeys: ["amount"],
    labelKey: "month",
    load: async (schoolId, f) => {
      const { data } = await supabase.from("receipts").select("issued_on, amount")
        .eq("school_id", schoolId).is("deleted_at", null)
        .gte("issued_on", f.from).lte("issued_on", `${f.to}T23:59:59`);
      const map = new Map<string, { count: number; amount: number }>();
      (data ?? []).forEach((r: any) => {
        const d = String(r.issued_on).slice(0, 7);
        const e = map.get(d) ?? { count: 0, amount: 0 };
        e.count += 1; e.amount += n(r.amount); map.set(d, e);
      });
      return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, v]) => ({ month, count: v.count, amount: money(v.amount), _amount: v.amount }));
    },
  },
  {
    id: "class-collection",
    name: "Class-wise Collection",
    group: "Collection",
    columns: [
      { key: "class_name", label: "Class" },
      { key: "students", label: "Students", align: "center" },
      { key: "billed", label: "Billed", align: "right" },
      { key: "paid", label: "Collected", align: "right" },
      { key: "due", label: "Due", align: "right" },
    ],
    totalKeys: ["billed", "paid", "due"],
    labelKey: "class_name",
    load: async (schoolId, f) => {
      const { data } = await supabase.from("student_ledger")
        .select("amount, discount, fine, paid, student_id, students!inner(class_id, classes(class_name))")
        .eq("school_id", schoolId).is("deleted_at", null);
      const map = new Map<string, { s: Set<string>; billed: number; paid: number }>();
      (data ?? []).forEach((r: any) => {
        const cls = r.students?.classes?.class_name ?? "Unassigned";
        if (f.classId !== "all" && r.students?.class_id !== f.classId) return;
        const e = map.get(cls) ?? { s: new Set<string>(), billed: 0, paid: 0 };
        e.s.add(r.student_id);
        e.billed += n(r.amount) - n(r.discount) + n(r.fine);
        e.paid += n(r.paid);
        map.set(cls, e);
      });
      return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([class_name, v]) => ({
        class_name, students: v.s.size, billed: money(v.billed), paid: money(v.paid),
        due: money(v.billed - v.paid), _billed: v.billed, _paid: v.paid, _due: v.billed - v.paid,
      }));
    },
  },
  {
    id: "student-ledger",
    name: "Student-wise Ledger",
    group: "Collection",
    columns: [
      { key: "student", label: "Student" },
      { key: "class_name", label: "Class" },
      { key: "roll", label: "Roll", align: "center" },
      { key: "billed", label: "Billed", align: "right" },
      { key: "paid", label: "Paid", align: "right" },
      { key: "due", label: "Due", align: "right" },
    ],
    totalKeys: ["billed", "paid", "due"],
    labelKey: "student",
    load: async (schoolId, f) => {
      const { data } = await supabase.from("student_ledger")
        .select("amount, discount, fine, paid, student_id, students!inner(student_name, roll, class_id, classes(class_name))")
        .eq("school_id", schoolId).is("deleted_at", null);
      const map = new Map<string, any>();
      (data ?? []).forEach((r: any) => {
        if (f.classId !== "all" && r.students?.class_id !== f.classId) return;
        const e = map.get(r.student_id) ?? {
          student: r.students?.student_name ?? "—",
          class_name: r.students?.classes?.class_name ?? "—",
          roll: r.students?.roll ?? "—", _billed: 0, _paid: 0,
        };
        e._billed += n(r.amount) - n(r.discount) + n(r.fine);
        e._paid += n(r.paid);
        map.set(r.student_id, e);
      });
      return [...map.values()].sort((a, b) => a.student.localeCompare(b.student)).map((e) => ({
        ...e, billed: money(e._billed), paid: money(e._paid), due: money(e._billed - e._paid), _due: e._billed - e._paid,
      }));
    },
  },
  {
    id: "due-list",
    name: "Outstanding Due List",
    group: "Collection",
    columns: [
      { key: "student", label: "Student" },
      { key: "class_name", label: "Class" },
      { key: "period", label: "Period" },
      { key: "category", label: "Fee Head" },
      { key: "due_date", label: "Due Date" },
      { key: "due", label: "Due", align: "right" },
    ],
    totalKeys: ["due"],
    labelKey: "student",
    load: async (schoolId, f) => {
      const { data } = await supabase.from("student_ledger")
        .select("amount, discount, fine, paid, period, due_date, fee_categories(name), students!inner(student_name, class_id, classes(class_name))")
        .eq("school_id", schoolId).is("deleted_at", null);
      return (data ?? [])
        .filter((r: any) => f.classId === "all" || r.students?.class_id === f.classId)
        .map((r: any) => ({
          student: r.students?.student_name ?? "—",
          class_name: r.students?.classes?.class_name ?? "—",
          period: r.period ?? "—",
          category: r.fee_categories?.name ?? "—",
          due_date: r.due_date ?? "—",
          _due: n(r.amount) - n(r.discount) + n(r.fine) - n(r.paid),
        }))
        .filter((r: any) => r._due > 0.009)
        .map((r: any) => ({ ...r, due: money(r._due) }));
    },
  },
  {
    id: "category-collection",
    name: "Fee Head-wise Collection",
    group: "Collection",
    columns: [
      { key: "category", label: "Fee Head" },
      { key: "billed", label: "Billed", align: "right" },
      { key: "paid", label: "Collected", align: "right" },
      { key: "due", label: "Due", align: "right" },
    ],
    totalKeys: ["billed", "paid", "due"],
    labelKey: "category",
    load: async (schoolId) => {
      const { data } = await supabase.from("student_ledger")
        .select("amount, discount, fine, paid, fee_categories(name)")
        .eq("school_id", schoolId).is("deleted_at", null);
      const map = new Map<string, { billed: number; paid: number }>();
      (data ?? []).forEach((r: any) => {
        const k = r.fee_categories?.name ?? "Uncategorised";
        const e = map.get(k) ?? { billed: 0, paid: 0 };
        e.billed += n(r.amount) - n(r.discount) + n(r.fine);
        e.paid += n(r.paid);
        map.set(k, e);
      });
      return [...map.entries()].map(([category, v]) => ({
        category, billed: money(v.billed), paid: money(v.paid), due: money(v.billed - v.paid),
        _billed: v.billed, _paid: v.paid, _due: v.billed - v.paid,
      }));
    },
  },
  {
    id: "receipt-register",
    name: "Receipt Register",
    group: "Registers",
    columns: [
      { key: "receipt_no", label: "Receipt No" },
      { key: "date", label: "Date" },
      { key: "student", label: "Student" },
      { key: "method", label: "Method" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    totalKeys: ["amount"],
    labelKey: "receipt_no",
    load: async (schoolId, f) => {
      const { data } = await supabase.from("receipts")
        .select("receipt_no, issued_on, amount, method, students(student_name)")
        .eq("school_id", schoolId).is("deleted_at", null)
        .gte("issued_on", f.from).lte("issued_on", `${f.to}T23:59:59`)
        .order("issued_on");
      return (data ?? []).map((r: any) => ({
        receipt_no: r.receipt_no, date: String(r.issued_on).slice(0, 10),
        student: r.students?.student_name ?? "—", method: r.method ?? "—",
        amount: money(r.amount), _amount: n(r.amount),
      }));
    },
  },
  {
    id: "voucher-register",
    name: "Expense Voucher Register",
    group: "Registers",
    columns: [
      { key: "voucher_no", label: "Voucher No" },
      { key: "date", label: "Date" },
      { key: "vendor", label: "Vendor" },
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    totalKeys: ["amount"],
    labelKey: "voucher_no",
    load: async (schoolId, f) => {
      const { data } = await supabase.from("expense_transactions")
        .select("voucher_no, date, vendor, amount, expense_categories(name)")
        .eq("school_id", schoolId).is("deleted_at", null)
        .gte("date", f.from).lte("date", f.to).order("date");
      return (data ?? []).map((r: any) => ({
        voucher_no: r.voucher_no ?? "—", date: r.date, vendor: r.vendor ?? "—",
        category: r.expense_categories?.name ?? "—", amount: money(r.amount), _amount: n(r.amount),
      }));
    },
  },
  {
    id: "income-statement",
    name: "Income Statement",
    group: "Income & Expense",
    columns: [
      { key: "date", label: "Date" },
      { key: "category", label: "Category" },
      { key: "description", label: "Description" },
      { key: "method", label: "Method" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    totalKeys: ["amount"],
    labelKey: "date",
    load: async (schoolId, f) => {
      const { data } = await supabase.from("income_transactions")
        .select("date, amount, method, description, income_categories(name)")
        .eq("school_id", schoolId).is("deleted_at", null)
        .gte("date", f.from).lte("date", f.to).order("date");
      return (data ?? []).map((r: any) => ({
        date: r.date, category: r.income_categories?.name ?? "—",
        description: r.description ?? "—", method: r.method ?? "—",
        amount: money(r.amount), _amount: n(r.amount),
      }));
    },
  },
  {
    id: "expense-statement",
    name: "Expense Statement",
    group: "Income & Expense",
    columns: [
      { key: "date", label: "Date" },
      { key: "category", label: "Category" },
      { key: "vendor", label: "Vendor" },
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    totalKeys: ["amount"],
    labelKey: "date",
    load: async (schoolId, f) => {
      const { data } = await supabase.from("expense_transactions")
        .select("date, amount, vendor, description, expense_categories(name)")
        .eq("school_id", schoolId).is("deleted_at", null)
        .gte("date", f.from).lte("date", f.to).order("date");
      return (data ?? []).map((r: any) => ({
        date: r.date, category: r.expense_categories?.name ?? "—",
        vendor: r.vendor ?? "—", description: r.description ?? "—",
        amount: money(r.amount), _amount: n(r.amount),
      }));
    },
  },
  {
    id: "profit-loss",
    name: "Income vs Expense Summary",
    group: "Income & Expense",
    columns: [
      { key: "head", label: "Head" },
      { key: "type", label: "Type", align: "center" },
      { key: "amount", label: "Amount", align: "right" },
    ],
    labelKey: "head",
    load: async (schoolId, f) => {
      const [fees, inc, exp, sal] = await Promise.all([
        supabase.from("receipts").select("amount").eq("school_id", schoolId).is("deleted_at", null)
          .gte("issued_on", f.from).lte("issued_on", `${f.to}T23:59:59`),
        supabase.from("income_transactions").select("amount").eq("school_id", schoolId).is("deleted_at", null)
          .gte("date", f.from).lte("date", f.to),
        supabase.from("expense_transactions").select("amount").eq("school_id", schoolId).is("deleted_at", null)
          .gte("date", f.from).lte("date", f.to),
        supabase.from("salary_payments").select("net").eq("school_id", schoolId).is("deleted_at", null)
          .eq("status", "paid").gte("paid_on", f.from).lte("paid_on", f.to),
      ]);
      const sum = (a: any[] = [], k = "amount") => a.reduce((s, r) => s + n(r[k]), 0);
      const feeTotal = sum(fees.data ?? []);
      const incTotal = sum(inc.data ?? []);
      const expTotal = sum(exp.data ?? []);
      const salTotal = sum(sal.data ?? [], "net");
      const netTotal = feeTotal + incTotal - expTotal - salTotal;
      return [
        { head: "Student Fee Collection", type: "Income", amount: money(feeTotal) },
        { head: "Other Income", type: "Income", amount: money(incTotal) },
        { head: "General Expense", type: "Expense", amount: money(expTotal) },
        { head: "Salary Paid", type: "Expense", amount: money(salTotal) },
        { head: "Net Balance", type: netTotal >= 0 ? "Surplus" : "Deficit", amount: money(netTotal) },
      ];
    },
  },
  {
    id: "salary-report",
    name: "Salary Report",
    group: "Payroll & Accounts",
    columns: [
      { key: "person", label: "Employee" },
      { key: "month", label: "Month" },
      { key: "basic", label: "Basic", align: "right" },
      { key: "bonus", label: "Bonus", align: "right" },
      { key: "deduction", label: "Deduction", align: "right" },
      { key: "net", label: "Net Paid", align: "right" },
      { key: "status", label: "Status", align: "center" },
    ],
    totalKeys: ["net"],
    labelKey: "person",
    load: async (schoolId, f) => {
      const { data } = await supabase.from("salary_payments")
        .select("month, basic, bonus, advance, deduction, net, status, teachers(teacher_name), staff(staff_name)")
        .eq("school_id", schoolId).is("deleted_at", null).order("month");
      return (data ?? [])
        .filter((r: any) => !f.from || (r.month >= f.from.slice(0, 7) && r.month <= f.to.slice(0, 7)))
        .map((r: any) => ({
          person: r.teachers?.teacher_name ?? r.staff?.staff_name ?? "—",
          month: r.month, basic: money(r.basic), bonus: money(r.bonus),
          deduction: money(n(r.deduction) + n(r.advance)), net: money(r.net),
          status: r.status, _net: n(r.net),
        }));
    },
  },
  {
    id: "cash-bank",
    name: "Cash & Bank Balance",
    group: "Payroll & Accounts",
    columns: [
      { key: "name", label: "Account" },
      { key: "type", label: "Type", align: "center" },
      { key: "account_number", label: "Account No" },
      { key: "opening", label: "Opening", align: "right" },
      { key: "balance", label: "Current Balance", align: "right" },
    ],
    totalKeys: ["balance"],
    labelKey: "name",
    load: async (schoolId) => {
      const { data } = await supabase.from("financial_accounts")
        .select("name, type, account_number, opening_balance, current_balance")
        .eq("school_id", schoolId).is("deleted_at", null).order("name");
      return (data ?? []).map((r: any) => ({
        name: r.name, type: r.type, account_number: r.account_number ?? "—",
        opening: money(r.opening_balance), balance: money(r.current_balance), _balance: n(r.current_balance),
      }));
    },
  },
];

const GROUPS = ["Collection", "Registers", "Income & Expense", "Payroll & Accounts"];

const ReportsTab = () => {
  const { schoolId } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [reportId, setReportId] = useState(REPORTS[0].id);
  const [filters, setFilters] = useState<Filters>({ from: monthStart, to: today, classId: "all" });

  const report = REPORTS.find((r) => r.id === reportId)!;

  const { data: classes = [] } = useQuery({
    queryKey: ["report-classes", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, class_name, academic_year, shift, version")
        .eq("school_id", schoolId!).order("class_name");
      return data ?? [];
    },
  });

  const { data: school } = useQuery({
    queryKey: ["report-school", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_school_info_safe", { _school_id: schoolId! });
      return Array.isArray(data) ? data[0] : data;
    },
  });

  const { data: rows = [], isFetching } = useQuery({
    queryKey: ["report-data", schoolId, reportId, filters],
    enabled: !!schoolId,
    queryFn: () => report.load(schoolId!, filters),
  });

  const totals = useMemo(() => {
    if (!report.totalKeys?.length) return undefined;
    const t: Record<string, any> = {};
    if (report.labelKey) t[report.labelKey] = "TOTAL";
    report.totalKeys.forEach((k) => {
      const sum = rows.reduce((s: number, r: any) => s + n(r[`_${k}`] ?? String(r[k]).replace(/,/g, "")), 0);
      t[k] = money(sum);
    });
    return t;
  }, [rows, report]);

  const payload = {
    title: report.name,
    subtitle: `Period: ${filters.from} to ${filters.to}${
      filters.classId !== "all" ? ` • Class: ${classes.find((c: any) => c.id === filters.classId)?.class_name ?? ""}` : ""
    }`,
    schoolName: (school as any)?.school_name,
    columns: report.columns,
    rows,
    totals,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Financial Reports</h2>
      </div>

      <div className="bg-card border rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <Label>Report</Label>
          <Select value={reportId} onValueChange={setReportId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {GROUPS.map((g) => (
                <div key={g}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{g}</div>
                  {REPORTS.filter((r) => r.group === g).map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>From</Label>
          <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>Class</Label>
          <Select value={filters.classId} onValueChange={(v) => setFilters({ ...filters, classId: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.class_name} — {c.academic_year} • {c.shift} • {c.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 flex items-end gap-2">
          <Button variant="outline" className="flex-1" onClick={() => exportReportExcel(payload)}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => printReport(payload)}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button className="flex-1" onClick={() => printReport(payload)}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {report.columns.map((c) => (
                  <th key={c.key} className={`p-3 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isFetching && (
                <tr><td colSpan={report.columns.length} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {!isFetching && rows.length === 0 && (
                <tr><td colSpan={report.columns.length} className="p-6 text-center text-muted-foreground">No records for this period.</td></tr>
              )}
              {!isFetching && rows.map((r: any, i: number) => (
                <tr key={i} className="border-t">
                  {report.columns.map((c) => (
                    <td key={c.key} className={`p-3 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}>
                      {r[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
              {!isFetching && totals && rows.length > 0 && (
                <tr className="border-t bg-muted/40 font-semibold">
                  {report.columns.map((c) => (
                    <td key={c.key} className={`p-3 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : ""}`}>
                      {totals[c.key] ?? ""}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsTab;
