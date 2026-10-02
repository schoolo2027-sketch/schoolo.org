import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/dashboard/StatCard";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  Wallet, TrendingUp, TrendingDown, CalendarDays, Landmark, Coins,
  AlertCircle, CheckCircle2, Globe, Store, UserX, Receipt,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, CartesianGrid,
} from "recharts";
import { format, startOfMonth, startOfDay } from "date-fns";

const fmt = (n: number) => `৳${(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;

const AccountsDashboard = () => {
  const { schoolId } = useAuth();

  useRealtimeSync("receipts", [["accounts-dashboard", schoolId ?? ""]]);
  useRealtimeSync("income_transactions", [["accounts-dashboard", schoolId ?? ""]]);
  useRealtimeSync("expense_transactions", [["accounts-dashboard", schoolId ?? ""]]);
  useRealtimeSync("financial_accounts", [["accounts-dashboard", schoolId ?? ""]]);
  useRealtimeSync("student_ledger", [["accounts-dashboard", schoolId ?? ""]]);

  const { data } = useQuery({
    queryKey: ["accounts-dashboard", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const today = startOfDay(new Date()).toISOString();
      const monthStart = startOfMonth(new Date()).toISOString();

      const [rec, inc, exp, accts, ledger] = await Promise.all([
        supabase.from("receipts").select("amount, method, issued_on").eq("school_id", schoolId!).is("deleted_at", null),
        supabase.from("income_transactions").select("amount, date, method").eq("school_id", schoolId!).is("deleted_at", null),
        supabase.from("expense_transactions").select("amount, date").eq("school_id", schoolId!).is("deleted_at", null),
        supabase.from("financial_accounts").select("type, current_balance").eq("school_id", schoolId!).is("deleted_at", null),
        supabase.from("student_ledger").select("student_id, amount, paid, discount, status").eq("school_id", schoolId!).is("deleted_at", null),
      ]);

      const receipts = rec.data || [];
      const incomes = inc.data || [];
      const expenses = exp.data || [];
      const accounts = accts.data || [];
      const ledgerRows = ledger.data || [];

      const collectionsToday = receipts.filter((r) => r.issued_on >= today).reduce((s, r) => s + Number(r.amount), 0);
      const collectionsMonth = receipts.filter((r) => r.issued_on >= monthStart).reduce((s, r) => s + Number(r.amount), 0);
      const incomeMonth = incomes.filter((i: any) => i.date >= monthStart.slice(0, 10)).reduce((s: number, r: any) => s + Number(r.amount), 0);
      const expenseToday = expenses.filter((e: any) => e.date >= monthStart.slice(0, 10) && e.date >= today.slice(0, 10)).reduce((s: number, r: any) => s + Number(r.amount), 0);
      const expenseMonth = expenses.filter((e: any) => e.date >= monthStart.slice(0, 10)).reduce((s: number, r: any) => s + Number(r.amount), 0);

      const cashBal = accounts.filter((a) => a.type === "cash").reduce((s, r) => s + Number(r.current_balance), 0);
      const bankBal = accounts.filter((a) => ["bank", "bkash", "nagad", "rocket"].includes(a.type)).reduce((s, r) => s + Number(r.current_balance), 0);

      const totalDue = ledgerRows.reduce((s, r) => s + Math.max(0, Number(r.amount) - Number(r.discount) - Number(r.paid)), 0);
      const totalPaid = ledgerRows.reduce((s, r) => s + Number(r.paid), 0);

      const onlineMethods = ["bkash", "nagad", "rocket", "card", "sslcommerz"];
      const onlineColl = receipts.filter((r) => onlineMethods.includes((r.method || "").toLowerCase())).reduce((s, r) => s + Number(r.amount), 0);
      const offlineColl = receipts.filter((r) => !onlineMethods.includes((r.method || "").toLowerCase())).reduce((s, r) => s + Number(r.amount), 0);

      const defaulterIds = new Set(
        ledgerRows.filter((r) => r.status === "due" || r.status === "partial").map((r) => r.student_id)
      );

      // 30-day series
      const days: { date: string; collection: number; expense: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const c = receipts.filter((r) => r.issued_on.slice(0, 10) === key).reduce((s, r) => s + Number(r.amount), 0);
        const e = expenses.filter((r: any) => r.date === key).reduce((s: number, r: any) => s + Number(r.amount), 0);
        days.push({ date: format(d, "MMM d"), collection: c, expense: e });
      }

      // Recent transactions
      const recent = [
        ...receipts.map((r) => ({ kind: "Collection", amount: Number(r.amount), date: r.issued_on })),
        ...incomes.map((r: any) => ({ kind: "Income", amount: Number(r.amount), date: r.date })),
        ...expenses.map((r: any) => ({ kind: "Expense", amount: -Number(r.amount), date: r.date })),
      ]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 8);

      return {
        collectionsToday, collectionsMonth, incomeMonth, expenseToday, expenseMonth,
        cashBal, bankBal, totalDue, totalPaid, onlineColl, offlineColl,
        defaulterCount: defaulterIds.size, days, recent,
      };
    },
  });

  const d = data || ({} as any);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Collection" value={fmt(d.collectionsToday)} icon={Wallet} color="success" />
        <StatCard title="Today's Expense" value={fmt(d.expenseToday)} icon={TrendingDown} color="warning" />
        <StatCard title="Monthly Collection" value={fmt(d.collectionsMonth)} icon={TrendingUp} color="primary" />
        <StatCard title="Monthly Expense" value={fmt(d.expenseMonth)} icon={CalendarDays} color="warning" />
        <StatCard title="Cash Balance" value={fmt(d.cashBal)} icon={Coins} color="success" />
        <StatCard title="Bank Balance" value={fmt(d.bankBal)} icon={Landmark} color="info" />
        <StatCard title="Total Due" value={fmt(d.totalDue)} icon={AlertCircle} color="warning" />
        <StatCard title="Total Paid" value={fmt(d.totalPaid)} icon={CheckCircle2} color="success" />
        <StatCard title="Online Collection" value={fmt(d.onlineColl)} icon={Globe} color="info" />
        <StatCard title="Offline Collection" value={fmt(d.offlineColl)} icon={Store} color="accent" />
        <StatCard title="Defaulter Students" value={d.defaulterCount ?? 0} icon={UserX} color="warning" />
        <StatCard title="Monthly Income" value={fmt(d.incomeMonth)} icon={Receipt} color="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold mb-3">Collection – Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={d.days || []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="collection" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold mb-3">Income vs Expense – Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.days || []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="collection" fill="hsl(var(--primary))" name="Income" />
              <Bar dataKey="expense" fill="hsl(var(--destructive))" name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border">
        <div className="p-4 border-b font-semibold">Recent Transactions</div>
        <div className="divide-y">
          {(d.recent || []).length === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">No transactions yet.</div>
          )}
          {(d.recent || []).map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-medium">{r.kind}</div>
                <div className="text-xs text-muted-foreground">{r.date?.slice(0, 10)}</div>
              </div>
              <div className={r.amount < 0 ? "text-destructive font-semibold" : "text-success font-semibold"}>
                {r.amount < 0 ? "-" : "+"}{fmt(Math.abs(r.amount))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountsDashboard;
