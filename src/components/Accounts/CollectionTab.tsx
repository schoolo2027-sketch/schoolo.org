import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useCanManageAccounts } from "@/hooks/useAccountsAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Printer, Receipt as ReceiptIcon } from "lucide-react";
import { toast } from "sonner";
import { printAccountsReceipt } from "@/utils/accountsReceiptPrint";

const METHODS = ["cash", "bkash", "nagad", "rocket", "bank_transfer", "cheque", "card"];

const CollectionTab = () => {
  const { schoolId } = useAuth();
  const canManage = useCanManageAccounts();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [method, setMethod] = useState("cash");
  const [accountId, setAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useRealtimeSync("student_ledger", [["collect-ledger", schoolId ?? ""]]);
  useRealtimeSync("receipts", [["recent-receipts", schoolId ?? ""]]);

  const { data: school } = useQuery({
    queryKey: ["accounts-school", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_school_info_safe", { _school_id: schoolId! });
      return (data as any)?.[0] ?? null;
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["collect-students", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from("students")
        .select("id, student_name, student_id, roll, class_id")
        .eq("school_id", schoolId!).eq("is_active", true).order("student_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["collect-classes", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, class_name").eq("school_id", schoolId!);
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["fee-categories", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase.from("fee_categories").select("id, name")
        .eq("school_id", schoolId!).is("deleted_at", null);
      return data ?? [];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["financial-accounts", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase.from("financial_accounts").select("id, name, type")
        .eq("school_id", schoolId!).is("deleted_at", null).eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const { data: dues = [] } = useQuery({
    queryKey: ["collect-ledger", schoolId, studentId],
    enabled: !!schoolId && !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase.from("student_ledger").select("*")
        .eq("school_id", schoolId!).eq("student_id", studentId)
        .is("deleted_at", null).in("status", ["due", "partial"]).order("period");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["recent-receipts", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase.from("receipts").select("*")
        .eq("school_id", schoolId!).is("deleted_at", null)
        .order("issued_on", { ascending: false }).limit(15);
      return data ?? [];
    },
  });

  const filteredStudents = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return students.slice(0, 30);
    return students.filter((st: any) =>
      st.student_name?.toLowerCase().includes(s) ||
      st.student_id?.toLowerCase().includes(s) ||
      st.roll?.toLowerCase().includes(s)).slice(0, 30);
  }, [students, search]);

  const rowDue = (r: any) => Number(r.amount) + Number(r.fine) - Number(r.discount) - Number(r.paid);
  const catName = (id: string) => categories.find((c: any) => c.id === id)?.name || "Fee";
  const selected = students.find((s: any) => s.id === studentId);
  const total = Object.entries(picked).reduce((s, [, v]) => s + Number(v || 0), 0);

  const toggle = (r: any, on: boolean) =>
    setPicked((p) => {
      const n = { ...p };
      if (on) n[r.id] = String(rowDue(r));
      else delete n[r.id];
      return n;
    });

  const collect = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error("Select a student");
      const ids = Object.keys(picked);
      if (ids.length === 0) throw new Error("Select at least one due item");
      if (total <= 0) throw new Error("Amount must be greater than zero");

      const { data: rec, error } = await supabase.from("receipts").insert({
        school_id: schoolId!, student_id: studentId, ledger_ids: ids, amount: total,
        receipt_no: "", // auto-generated by database trigger
        method, account_id: accountId || null, reference: reference || null, notes: notes || null,
      }).select().single();
      if (error) throw error;

      for (const id of ids) {
        const row: any = dues.find((d: any) => d.id === id);
        const pay = Number(picked[id] || 0);
        const newPaid = Number(row.paid) + pay;
        const net = Number(row.amount) + Number(row.fine) - Number(row.discount);
        const status = newPaid <= 0 ? "due" : newPaid >= net ? "paid" : "partial";
        const { error: e2 } = await supabase.from("student_ledger")
          .update({ paid: newPaid, status }).eq("id", id);
        if (e2) throw e2;
      }
      return rec;
    },
    onSuccess: async (rec: any) => {
      toast.success(`Receipt ${rec.receipt_no} created`);
      const lines = Object.keys(picked).map((id) => {
        const row: any = dues.find((d: any) => d.id === id);
        return { label: catName(row.category_id), period: row.period, amount: Number(picked[id] || 0) };
      });
      setPicked({}); setReference(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["collect-ledger"] });
      qc.invalidateQueries({ queryKey: ["recent-receipts"] });
      qc.invalidateQueries({ queryKey: ["financial-accounts"] });
      await printAccountsReceipt({
        receiptNo: rec.receipt_no,
        date: new Date(rec.issued_on).toLocaleDateString(),
        schoolName: school?.school_name || "School",
        schoolAddress: school?.school_address,
        schoolLogo: school?.school_logo,
        studentName: selected?.student_name || "",
        studentId: selected?.student_id,
        roll: selected?.roll,
        className: classes.find((c: any) => c.id === selected?.class_id)?.class_name,
        method: rec.method,
        accountName: accounts.find((a: any) => a.id === rec.account_id)?.name,
        reference: rec.reference,
        notes: rec.notes,
        lines, total: Number(rec.amount),
      });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reprint = async (rec: any) => {
    const st: any = students.find((s: any) => s.id === rec.student_id);
    await printAccountsReceipt({
      receiptNo: rec.receipt_no,
      date: new Date(rec.issued_on).toLocaleDateString(),
      schoolName: school?.school_name || "School",
      schoolAddress: school?.school_address,
      schoolLogo: school?.school_logo,
      studentName: st?.student_name || "—",
      studentId: st?.student_id, roll: st?.roll,
      className: classes.find((c: any) => c.id === st?.class_id)?.class_name,
      method: rec.method,
      accountName: accounts.find((a: any) => a.id === rec.account_id)?.name,
      reference: rec.reference, notes: rec.notes,
      lines: [{ label: "Fee payment", period: null, amount: Number(rec.amount) }],
      total: Number(rec.amount),
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="bg-card border rounded-xl p-3 space-y-3 h-fit">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="max-h-[420px] overflow-y-auto divide-y">
          {filteredStudents.map((st: any) => (
            <button key={st.id} onClick={() => { setStudentId(st.id); setPicked({}); }}
              className={`w-full text-left p-2 rounded-lg text-sm hover:bg-muted ${studentId === st.id ? "bg-muted font-medium" : ""}`}>
              {st.student_name}
              <span className="block text-xs text-muted-foreground">{st.student_id || "—"} · Roll {st.roll || "—"}</span>
            </button>
          ))}
          {filteredStudents.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">No students found.</p>}
        </div>
      </div>

      <div className="space-y-4">
        {!studentId ? (
          <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground">
            Select a student to collect payment.
          </div>
        ) : (
          <>
            <div className="bg-card border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3 w-10"></th><th className="p-3">Period</th><th className="p-3">Category</th>
                    <th className="p-3 text-right">Due</th><th className="p-3 text-right w-36">Pay Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dues.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No outstanding dues.</td></tr>}
                  {dues.map((r: any) => (
                    <tr key={r.id}>
                      <td className="p-3"><Checkbox checked={picked[r.id] !== undefined} onCheckedChange={(v) => toggle(r, !!v)} /></td>
                      <td className="p-3">{r.period || "—"}</td>
                      <td className="p-3 font-medium">{catName(r.category_id)}</td>
                      <td className="p-3 text-right">{rowDue(r).toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <Input type="number" className="h-8 text-right" disabled={picked[r.id] === undefined}
                          value={picked[r.id] ?? ""} onChange={(e) => setPicked((p) => ({ ...p, [r.id]: e.target.value }))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-card border rounded-xl p-4 grid gap-3 sm:grid-cols-4">
              <div><Label>Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn / cheque no" /></div>
              <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <div className="sm:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-lg font-semibold">Total: {total.toLocaleString()}</p>
                <Button disabled={!canManage || collect.isPending || total <= 0} onClick={() => collect.mutate()}>
                  <ReceiptIcon className="h-4 w-4 mr-2" /> Collect & Print Receipt
                </Button>
              </div>
            </div>
          </>
        )}

        <div className="bg-card border rounded-xl overflow-x-auto">
          <div className="p-3 font-semibold border-b">Recent Receipts</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr><th className="p-3">Receipt No</th><th className="p-3">Date</th><th className="p-3">Student</th>
                <th className="p-3">Method</th><th className="p-3 text-right">Amount</th><th className="p-3 w-20"></th></tr>
            </thead>
            <tbody className="divide-y">
              {recent.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No receipts yet.</td></tr>}
              {recent.map((r: any) => (
                <tr key={r.id}>
                  <td className="p-3 font-mono text-xs">{r.receipt_no}</td>
                  <td className="p-3">{new Date(r.issued_on).toLocaleDateString()}</td>
                  <td className="p-3">{students.find((s: any) => s.id === r.student_id)?.student_name || "—"}</td>
                  <td className="p-3"><Badge variant="outline">{r.method || "cash"}</Badge></td>
                  <td className="p-3 text-right font-semibold">{Number(r.amount).toLocaleString()}</td>
                  <td className="p-3"><Button variant="ghost" size="icon" onClick={() => reprint(r)}><Printer className="h-4 w-4" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CollectionTab;
