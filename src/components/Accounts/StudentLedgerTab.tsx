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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Percent, AlertTriangle, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default", partial: "secondary", due: "destructive", waived: "outline", cancelled: "outline",
};

const StudentLedgerTab = () => {
  const { schoolId } = useAuth();
  const canManage = useCanManageAccounts();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adjust, setAdjust] = useState<any>(null);

  useRealtimeSync("student_ledger", [["student-ledger", schoolId ?? ""]]);

  const { data: students = [] } = useQuery({
    queryKey: ["ledger-students", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from("students")
        .select("id, student_name, student_id, roll, class_id, section_id")
        .eq("school_id", schoolId!).eq("is_active", true).order("student_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["fee-categories", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_categories")
        .select("id, name").eq("school_id", schoolId!).is("deleted_at", null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["student-ledger", schoolId, studentId, statusFilter],
    enabled: !!schoolId && !!studentId,
    queryFn: async () => {
      let q = supabase.from("student_ledger").select("*")
        .eq("school_id", schoolId!).eq("student_id", studentId).is("deleted_at", null);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q.order("period", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredStudents = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return students.slice(0, 30);
    return students.filter((st: any) =>
      st.student_name?.toLowerCase().includes(s) ||
      st.student_id?.toLowerCase().includes(s) ||
      st.roll?.toLowerCase().includes(s)
    ).slice(0, 30);
  }, [students, search]);

  const totals = useMemo(() => {
    const t = { amount: 0, discount: 0, fine: 0, paid: 0 };
    ledger.forEach((r: any) => {
      t.amount += Number(r.amount || 0); t.discount += Number(r.discount || 0);
      t.fine += Number(r.fine || 0); t.paid += Number(r.paid || 0);
    });
    return { ...t, due: t.amount + t.fine - t.discount - t.paid };
  }, [ledger]);

  const saveAdjust = useMutation({
    mutationFn: async (p: any) => {
      const amount = Number(p.amount || 0), discount = Number(p.discount || 0);
      const fine = Number(p.fine || 0), paid = Number(p.paid || 0);
      const net = amount + fine - discount;
      let status = p.status;
      if (status !== "waived" && status !== "cancelled") {
        status = paid <= 0 ? "due" : paid >= net ? "paid" : "partial";
      }
      const { error } = await supabase.from("student_ledger")
        .update({ amount, discount, fine, paid, status, notes: p.notes || null }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["student-ledger"] }); setAdjust(null); toast.success("Updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("student_ledger")
        .update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["student-ledger"] }); toast.success("Removed"); },
  });

  const catName = (id: string) => categories.find((c: any) => c.id === id)?.name || "—";
  const selected = students.find((s: any) => s.id === studentId);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="bg-card border rounded-xl p-3 space-y-3 h-fit">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search student…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="max-h-[420px] overflow-y-auto divide-y">
          {filteredStudents.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">No students found.</p>}
          {filteredStudents.map((st: any) => (
            <button key={st.id} onClick={() => setStudentId(st.id)}
              className={`w-full text-left p-2 rounded-lg text-sm hover:bg-muted ${studentId === st.id ? "bg-muted font-medium" : ""}`}>
              {st.student_name}
              <span className="block text-xs text-muted-foreground">
                {st.student_id || "—"} · Roll {st.roll || "—"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {!studentId ? (
          <div className="bg-card border rounded-xl p-12 text-center text-muted-foreground">
            Select a student to view their fee ledger.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{selected?.student_name}</h2>
                <p className="text-sm text-muted-foreground">ID {selected?.student_id || "—"} · Roll {selected?.roll || "—"}</p>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["all", "due", "partial", "paid", "waived", "cancelled"].map((s) =>
                    <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                ["Charged", totals.amount], ["Discount", totals.discount], ["Fine", totals.fine],
                ["Paid", totals.paid], ["Balance Due", totals.due],
              ].map(([label, v]) => (
                <div key={label as string} className="bg-card border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-semibold">{Number(v).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="bg-card border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Period</th><th className="p-3">Category</th>
                    <th className="p-3 text-right">Amount</th><th className="p-3 text-right">Discount</th>
                    <th className="p-3 text-right">Fine</th><th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Due</th><th className="p-3">Status</th>
                    <th className="p-3 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ledger.length === 0 && (
                    <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No ledger entries. Use the Monthly Fee Generator to create dues.</td></tr>
                  )}
                  {ledger.map((r: any) => {
                    const due = Number(r.amount) + Number(r.fine) - Number(r.discount) - Number(r.paid);
                    return (
                      <tr key={r.id}>
                        <td className="p-3">{r.period || "—"}</td>
                        <td className="p-3 font-medium">{catName(r.category_id)}</td>
                        <td className="p-3 text-right">{Number(r.amount).toLocaleString()}</td>
                        <td className="p-3 text-right">{Number(r.discount).toLocaleString()}</td>
                        <td className="p-3 text-right">{Number(r.fine).toLocaleString()}</td>
                        <td className="p-3 text-right">{Number(r.paid).toLocaleString()}</td>
                        <td className="p-3 text-right font-semibold">{due.toLocaleString()}</td>
                        <td className="p-3"><Badge variant={statusVariant[r.status] || "outline"}>{r.status}</Badge></td>
                        <td className="p-3">
                          {canManage && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" title="Adjust"
                                onClick={() => setAdjust({ ...r })}><Percent className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" title="Remove"
                                onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Ledger Entry</DialogTitle></DialogHeader>
          {adjust && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{catName(adjust.category_id)} · {adjust.period}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Amount</Label><Input type="number" value={adjust.amount}
                  onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} /></div>
                <div><Label>Discount / Scholarship</Label><Input type="number" value={adjust.discount}
                  onChange={(e) => setAdjust({ ...adjust, discount: e.target.value })} /></div>
                <div><Label>Fine</Label><Input type="number" value={adjust.fine}
                  onChange={(e) => setAdjust({ ...adjust, fine: e.target.value })} /></div>
                <div><Label>Paid</Label><Input type="number" value={adjust.paid}
                  onChange={(e) => setAdjust({ ...adjust, paid: e.target.value })} /></div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={adjust.status} onValueChange={(v) => setAdjust({ ...adjust, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["due", "partial", "paid", "waived", "cancelled"].map((s) =>
                      <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Due / partial / paid are recalculated automatically from the paid amount.
                </p>
              </div>
              <div><Label>Notes</Label><Input value={adjust.notes || ""}
                onChange={(e) => setAdjust({ ...adjust, notes: e.target.value })} placeholder="Reason for adjustment" /></div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAdjust({ ...adjust, status: "waived", discount: adjust.amount })}>
                  <Ban className="h-4 w-4 mr-1" /> Waive full
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAdjust({ ...adjust, fine: Number(adjust.fine || 0) + 50 })}>
                  <AlertTriangle className="h-4 w-4 mr-1" /> +50 fine
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjust(null)}>Cancel</Button>
            <Button onClick={() => saveAdjust.mutate(adjust)} disabled={saveAdjust.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentLedgerTab;
