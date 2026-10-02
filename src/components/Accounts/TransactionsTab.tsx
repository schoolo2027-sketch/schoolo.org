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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Paperclip, Tags } from "lucide-react";
import { toast } from "sonner";

const METHODS = ["cash", "bkash", "nagad", "rocket", "bank_transfer", "cheque", "card"];

interface Props { kind: "income" | "expense" }

const TransactionsTab = ({ kind }: Props) => {
  const { schoolId, user } = useAuth();
  const canManage = useCanManageAccounts();
  const qc = useQueryClient();
  const isExpense = kind === "expense";
  const txnTable = isExpense ? "expense_transactions" : "income_transactions";
  const catTable = isExpense ? "expense_categories" : "income_categories";

  const [editing, setEditing] = useState<any>(null);
  const [catDialog, setCatDialog] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [uploading, setUploading] = useState(false);

  useRealtimeSync(txnTable, [[`${kind}-txns`, schoolId ?? ""]]);

  const { data: categories = [] } = useQuery({
    queryKey: [`${kind}-categories`, schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from(catTable as any).select("id, name")
        .eq("school_id", schoolId!).is("deleted_at", null).order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["financial-accounts", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase.from("financial_accounts").select("id, name")
        .eq("school_id", schoolId!).is("deleted_at", null).eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const { data: rows = [] } = useQuery({
    queryKey: [`${kind}-txns`, schoolId, from, to],
    enabled: !!schoolId,
    queryFn: async () => {
      let q = supabase.from(txnTable as any).select("*")
        .eq("school_id", schoolId!).is("deleted_at", null);
      if (from) q = q.gte("date", from);
      if (to) q = q.lte("date", to);
      const { data, error } = await q.order("date", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const total = useMemo(() => rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0), [rows]);
  const catName = (id: string) => categories.find((c: any) => c.id === id)?.name || "—";

  const addCategory = useMutation({
    mutationFn: async () => {
      const name = newCat.trim();
      if (!name) throw new Error("Category name required");
      const { error } = await supabase.from(catTable as any)
        .insert({ school_id: schoolId!, name, is_active: true } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`${kind}-categories`] }); setNewCat(""); toast.success("Category added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const path = `${schoolId}/accounts/${kind}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { error } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
      if (error) throw error;
      setEditing((p: any) => ({ ...p, attachment_url: path }));
      toast.success("Attachment uploaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async (p: any) => {
      const amount = Number(p.amount || 0);
      if (!p.date) throw new Error("Date is required");
      if (amount <= 0) throw new Error("Amount must be greater than zero");
      const base: any = {
        school_id: schoolId!, category_id: p.category_id || null, account_id: p.account_id || null,
        amount, date: p.date, method: p.method || null, reference: p.reference || null,
        description: p.description || null, attachment_url: p.attachment_url || null,
      };
      if (isExpense) {
        base.vendor = p.vendor || null;
        base.voucher_no = p.voucher_no || "";
        base.approved_by = p.approved_by || null;
      }
      if (p.id) {
        if (isExpense) delete base.voucher_no;
        const { error } = await supabase.from(txnTable as any).update(base).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(txnTable as any)
          .insert({ ...base, created_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`${kind}-txns`] });
      qc.invalidateQueries({ queryKey: ["financial-accounts"] });
      setEditing(null); toast.success("Saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(txnTable as any)
        .update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`${kind}-txns`] }); toast.success("Removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openAttachment = async (path: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div><Label className="text-xs">From</Label><Input type="date" className="h-9" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">To</Label><Input type="date" className="h-9" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="bg-card border rounded-xl px-4 py-2">
            <p className="text-xs text-muted-foreground">Total {isExpense ? "Expense" : "Income"}</p>
            <p className="text-lg font-bold">{total.toLocaleString()}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCatDialog(true)}><Tags className="h-4 w-4 mr-2" /> Categories</Button>
            <Button onClick={() => setEditing({ date: new Date().toISOString().slice(0, 10), method: "cash" })}>
              <Plus className="h-4 w-4 mr-2" /> New {isExpense ? "Expense" : "Income"}
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Date</th>
              {isExpense && <th className="p-3">Voucher</th>}
              <th className="p-3">Category</th>
              {isExpense && <th className="p-3">Vendor</th>}
              <th className="p-3">Description</th><th className="p-3">Method</th>
              <th className="p-3 text-right">Amount</th><th className="p-3 w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr><td colSpan={isExpense ? 8 : 6} className="p-8 text-center text-muted-foreground">
                No {kind} records for this period.</td></tr>
            )}
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td className="p-3">{new Date(r.date).toLocaleDateString()}</td>
                {isExpense && <td className="p-3 font-mono text-xs">{r.voucher_no || "—"}</td>}
                <td className="p-3 font-medium">{catName(r.category_id)}</td>
                {isExpense && <td className="p-3">{r.vendor || "—"}</td>}
                <td className="p-3">{r.description || "—"}</td>
                <td className="p-3"><Badge variant="outline">{r.method || "cash"}</Badge></td>
                <td className="p-3 text-right font-semibold">{Number(r.amount).toLocaleString()}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {r.attachment_url && (
                      <Button variant="ghost" size="icon" title="Attachment" onClick={() => openAttachment(r.attachment_url)}>
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    )}
                    {canManage && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => setEditing({ ...r })}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} {isExpense ? "Expense" : "Income"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Date</Label><Input type="date" value={editing.date || ""} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></div>
              <div><Label>Amount</Label><Input type="number" value={editing.amount ?? ""} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} /></div>
              <div><Label>Category</Label>
                <Select value={editing.category_id || ""} onValueChange={(v) => setEditing({ ...editing, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Account</Label>
                <Select value={editing.account_id || ""} onValueChange={(v) => setEditing({ ...editing, account_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Method</Label>
                <Select value={editing.method || "cash"} onValueChange={(v) => setEditing({ ...editing, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Reference</Label><Input value={editing.reference || ""} onChange={(e) => setEditing({ ...editing, reference: e.target.value })} /></div>
              {isExpense && <div><Label>Vendor / Payee</Label><Input value={editing.vendor || ""} onChange={(e) => setEditing({ ...editing, vendor: e.target.value })} /></div>}
              <div className="sm:col-span-2"><Label>Description</Label><Input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="sm:col-span-2">
                <Label>Attachment</Label>
                <Input type="file" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                {editing.attachment_url && <p className="text-xs text-muted-foreground mt-1 truncate">{editing.attachment_url}</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => save.mutate(editing)} disabled={save.isPending || uploading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isExpense ? "Expense" : "Income"} Categories</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name" />
            <Button onClick={() => addCategory.mutate()} disabled={addCategory.isPending}>Add</Button>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y border rounded-lg">
            {categories.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">No categories yet.</p>}
            {categories.map((c: any) => (
              <div key={c.id} className="p-2 text-sm">{c.name}</div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionsTab;
