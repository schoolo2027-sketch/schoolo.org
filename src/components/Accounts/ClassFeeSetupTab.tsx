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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, Copy } from "lucide-react";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => currentYear - 2 + i);

const ClassFeeSetupTab = () => {
  const { schoolId } = useAuth();
  const canManage = useCanManageAccounts();
  const qc = useQueryClient();
  const [year, setYear] = useState(String(currentYear));
  const [classId, setClassId] = useState<string>("all");
  const [dlg, setDlg] = useState<any>(null);
  const [copyDlg, setCopyDlg] = useState<{ target: string } | null>(null);

  useRealtimeSync("fee_structures", [["fee-structures", schoolId ?? ""]]);

  const { data: classes = [] } = useQuery({
    queryKey: ["accounts-classes", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from("classes")
        .select("id, class_name, academic_year, shift, version")
        .eq("school_id", schoolId!).order("numeric_level", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["accounts-sections", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from("sections")
        .select("id, section_name, class_id").eq("school_id", schoolId!).order("section_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["fee-categories", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_categories")
        .select("id, name, frequency").eq("school_id", schoolId!).is("deleted_at", null)
        .eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["fee-structures", schoolId, year, classId],
    enabled: !!schoolId,
    queryFn: async () => {
      let q = supabase.from("fee_structures").select("*")
        .eq("school_id", schoolId!).is("deleted_at", null)
        .eq("academic_year", Number(year));
      if (classId !== "all") q = q.eq("class_id", classId);
      const { data, error } = await q.order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (p: any) => {
      const payload = {
        school_id: schoolId,
        category_id: p.category_id,
        academic_year: Number(p.academic_year),
        class_id: p.class_id || null,
        section_id: p.section_id === "all" ? null : p.section_id || null,
        version: p.version === "all" ? null : p.version || null,
        shift: p.shift === "all" ? null : p.shift || null,
        student_group: p.student_group || null,
        amount: Number(p.amount || 0),
        due_day: p.due_day ? Number(p.due_day) : null,
      };
      if (p.id) {
        const { error } = await supabase.from("fee_structures").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fee_structures").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fee-structures"] }); setDlg(null); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fee_structures")
        .update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fee-structures"] }); toast.success("Deleted"); },
  });

  const copyTo = useMutation({
    mutationFn: async (targetClassId: string) => {
      if (rows.length === 0) throw new Error("Nothing to copy");
      const payload = rows.map((r: any) => ({
        school_id: schoolId, category_id: r.category_id, academic_year: r.academic_year,
        class_id: targetClassId, section_id: null, version: r.version, shift: r.shift,
        student_group: r.student_group, amount: r.amount, due_day: r.due_day,
      }));
      const { error } = await supabase.from("fee_structures").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fee-structures"] }); setCopyDlg(null); toast.success("Copied"); },
    onError: (e: any) => toast.error(e.message),
  });

  const catName = (id: string) => categories.find((c: any) => c.id === id)?.name || "—";
  const clsName = (id: string | null) => {
    const c = classes.find((x: any) => x.id === id);
    return c ? `${c.class_name} (${c.academic_year} · ${c.shift} · ${c.version})` : "All classes";
  };
  const secName = (id: string | null) => sections.find((s: any) => s.id === id)?.section_name || "All";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div>
            <Label className="text-xs">Academic Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.class_name} · {c.academic_year} · {c.shift} · {c.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={classId === "all" || rows.length === 0}
              onClick={() => setCopyDlg({ target: "" })}>
              <Copy className="h-4 w-4 mr-1" /> Copy to class
            </Button>
            <Button onClick={() => setDlg({
              academic_year: year, class_id: classId === "all" ? "" : classId,
              section_id: "all", version: "all", shift: "all", amount: "",
            })}>
              <Plus className="h-4 w-4 mr-1" /> Add Fee
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Category</th><th className="p-3">Class</th>
              <th className="p-3">Section</th><th className="p-3">Version / Shift</th>
              <th className="p-3">Group</th><th className="p-3 text-right">Amount</th>
              <th className="p-3">Due day</th><th className="p-3 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No fee structures for this filter.</td></tr>
            )}
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td className="p-3 font-medium">{catName(r.category_id)}</td>
                <td className="p-3">{clsName(r.class_id)}</td>
                <td className="p-3">{secName(r.section_id)}</td>
                <td className="p-3 text-muted-foreground">{(r.version || "All")} / {(r.shift || "All")}</td>
                <td className="p-3">{r.student_group || "—"}</td>
                <td className="p-3 text-right font-semibold">{Number(r.amount).toLocaleString()}</td>
                <td className="p-3">{r.due_day || "—"}</td>
                <td className="p-3">
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setDlg({
                        ...r, academic_year: String(r.academic_year),
                        section_id: r.section_id || "all", version: r.version || "all", shift: r.shift || "all",
                      })}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div className="flex justify-end">
          <Badge variant="secondary" className="text-sm">
            Total: {rows.reduce((s: number, r: any) => s + Number(r.amount || 0), 0).toLocaleString()}
          </Badge>
        </div>
      )}

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dlg?.id ? "Edit" : "Add"} Fee Structure</DialogTitle></DialogHeader>
          {dlg && (
            <div className="space-y-3">
              <div>
                <Label>Fee Category *</Label>
                <Select value={dlg.category_id || ""} onValueChange={(v) => setDlg({ ...dlg, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Academic Year</Label>
                  <Select value={dlg.academic_year} onValueChange={(v) => setDlg({ ...dlg, academic_year: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount *</Label>
                  <Input type="number" value={dlg.amount} onChange={(e) => setDlg({ ...dlg, amount: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Class *</Label>
                <Select value={dlg.class_id || ""} onValueChange={(v) => setDlg({ ...dlg, class_id: v, section_id: "all" })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.class_name} · {c.academic_year} · {c.shift} · {c.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Section</Label>
                  <Select value={dlg.section_id} onValueChange={(v) => setDlg({ ...dlg, section_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sections</SelectItem>
                      {sections.filter((s: any) => s.class_id === dlg.class_id)
                        .map((s: any) => <SelectItem key={s.id} value={s.id}>{s.section_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Due day of month</Label>
                  <Input type="number" min={1} max={31} value={dlg.due_day || ""}
                    onChange={(e) => setDlg({ ...dlg, due_day: e.target.value })} placeholder="e.g. 10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Version</Label>
                  <Select value={dlg.version} onValueChange={(v) => setDlg({ ...dlg, version: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="bangla">Bangla</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Shift</Label>
                  <Select value={dlg.shift} onValueChange={(v) => setDlg({ ...dlg, shift: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Group (optional)</Label>
                <Input value={dlg.student_group || ""} onChange={(e) => setDlg({ ...dlg, student_group: e.target.value })}
                  placeholder="Science / Business Studies / Humanities" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>Cancel</Button>
            <Button onClick={() => save.mutate(dlg)}
              disabled={!dlg?.category_id || !dlg?.class_id || !dlg?.amount || save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!copyDlg} onOpenChange={(o) => !o && setCopyDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Copy {rows.length} fee(s) to another class</DialogTitle></DialogHeader>
          <div>
            <Label>Target class</Label>
            <Select value={copyDlg?.target || ""} onValueChange={(v) => setCopyDlg({ target: v })}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.filter((c: any) => c.id !== classId).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.class_name} · {c.academic_year} · {c.shift} · {c.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDlg(null)}>Cancel</Button>
            <Button disabled={!copyDlg?.target || copyTo.isPending}
              onClick={() => copyTo.mutate(copyDlg!.target)}>Copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassFeeSetupTab;
