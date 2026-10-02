import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useCanManageAccounts } from "@/hooks/useAccountsAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

const TYPES = ["cash", "bank", "bkash", "nagad", "rocket"];

const CashBankTab = () => {
  const { schoolId } = useAuth();
  const canManage = useCanManageAccounts();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [viewId, setViewId] = useState("");

  useRealtimeSync("financial_accounts", [["financial-accounts", schoolId ?? ""]]);

  const { data: accounts = [] } = useQuery({
    queryKey: ["financial-accounts", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_accounts").select("*")
        .eq("school_id", schoolId!).is("deleted_at", null).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: txns = [] } = useQuery({
    queryKey: ["account-txns", schoolId, viewId],
    enabled: !!schoolId && !!viewId,
    queryFn: async () => {
      const [inc, exp, rec, sal] = await Promise.all([
        supabase.from("income_transactions").select("id, amount, date, description, reference")
          .eq("school_id", schoolId!).eq("account_id", viewId).is("deleted_at", null),
        supabase.from("expense_transactions").select("id, amount, date, description, voucher_no")
          .eq("school_id", schoolId!).eq("account_id", viewId).is("deleted_at", null),
        supabase.from("receipts").select("id, amount, issued_on, receipt_no")
          .eq("school_id", schoolId!).eq("account_id", viewId).is("deleted_at", null),
        supabase.from("salary_payments").select("id, net, paid_on, month, status")
          .eq("school_id", schoolId!).eq("account_id", viewId).is("deleted_at", null).eq("status", "paid"),
      ]);
      const rows = [
        ...(inc.data ?? []).map((r: any) => ({ id: r.id, date: r.date, kind: "Income", ref: r.reference || "—", desc: r.description || "—", inflow: Number(r.amount), outflow: 0 })),
        ...(exp.data ?? []).map((r: any) => ({ id: r.id, date: r.date, kind: "Expense", ref: r.voucher_no || "—", desc: r.description || "—", inflow: 0, outflow: Number(r.amount) })),
        ...(rec.data ?? []).map((r: any) => ({ id: r.id, date: r.issued_on, kind: "Fee Receipt", ref: r.receipt_no, desc: "Student fee collection", inflow: Number(r.amount), outflow: 0 })),
        ...(sal.data ?? []).map((r: any) => ({ id: r.id, date: r.paid_on, kind: "Salary", ref: r.month, desc: "Salary payment", inflow: 0, outflow: Number(r.net) })),
      ];
      return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    },
  });

  const save = useMutation({
    mutationFn: async (p: any) => {
      const name = p.name?.trim();
      if (!name) throw new Error("Account name is required");
      if (p.id) {
        const { error } = await supabase.from("financial_accounts").update({
          name, type: p.type, account_number: p.account_number || null, is_active: p.is_active ?? true,
        }).eq("id", p.id);
        if (error) throw error;
      } else {
        const opening = Number(p.opening_balance || 0);
        const { error } = await supabase.from("financial_accounts").insert({
          school_id: schoolId!, name, type: p.type, account_number: p.account_number || null,
          opening_balance: opening, current_balance: opening, is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["financial-accounts"] }); setEditing(null); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_accounts")
        .update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["financial-accounts"] }); toast.success("Removed"); },
  });

  const totalBalance = accounts.reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);
  const viewing: any = accounts.find((a: any) => a.id === viewId);
  let running = Number(viewing?.opening_balance || 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="bg-card border rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">Total Balance (all accounts)</p>
          <p className="text-2xl font-bold">{totalBalance.toLocaleString()}</p>
        </div>
        {canManage && (
          <Button onClick={() => setEditing({ type: "cash", opening_balance: 0 })}>
            <Plus className="h-4 w-4 mr-2" /> New Account
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.length === 0 && (
          <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">
            No accounts yet. Create cash, bank or mobile banking accounts to track balances.
          </div>
        )}
        {accounts.map((a: any) => (
          <div key={a.id} onClick={() => setViewId(a.id)} role="button" tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setViewId(a.id)}
            className={`text-left bg-card border rounded-xl p-4 hover:border-primary transition cursor-pointer ${viewId === a.id ? "border-primary" : ""}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary"><Wallet className="h-4 w-4" /></div>
                <div>
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.account_number || "—"}</p>
                </div>
              </div>
              <Badge variant="outline">{a.type}</Badge>
            </div>
            <p className="text-2xl font-bold mt-3">{Number(a.current_balance).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Opening {Number(a.opening_balance).toLocaleString()}</p>
            {canManage && (
              <div className="flex gap-1 mt-2">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditing({ ...a }); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); del.mutate(a.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {viewId && (
        <div className="bg-card border rounded-xl overflow-x-auto">
          <div className="p-3 font-semibold border-b">{viewing?.name} — Transaction Ledger</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Reference</th>
                <th className="p-3">Description</th><th className="p-3 text-right">In</th>
                <th className="p-3 text-right">Out</th><th className="p-3 text-right">Balance</th></tr>
            </thead>
            <tbody className="divide-y">
              {txns.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No transactions for this account.</td></tr>}
              {txns.map((t: any) => {
                running += t.inflow - t.outflow;
                return (
                  <tr key={t.kind + t.id}>
                    <td className="p-3">{t.date ? new Date(t.date).toLocaleDateString() : "—"}</td>
                    <td className="p-3"><Badge variant="outline">{t.kind}</Badge></td>
                    <td className="p-3 font-mono text-xs">{t.ref}</td>
                    <td className="p-3">{t.desc}</td>
                    <td className="p-3 text-right">{t.inflow ? t.inflow.toLocaleString() : "—"}</td>
                    <td className="p-3 text-right text-destructive">{t.outflow ? t.outflow.toLocaleString() : "—"}</td>
                    <td className="p-3 text-right font-semibold">{running.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Account" : "New Account"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Main Cash / DBBL Current A/C" /></div>
              <div><Label>Type</Label>
                <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Account / Wallet Number</Label><Input value={editing.account_number || ""} onChange={(e) => setEditing({ ...editing, account_number: e.target.value })} /></div>
              <div><Label>Opening Balance</Label><Input type="number" value={editing.opening_balance ?? 0} disabled={!!editing.id}
                onChange={(e) => setEditing({ ...editing, opening_balance: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => save.mutate(editing)} disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashBankTab;
