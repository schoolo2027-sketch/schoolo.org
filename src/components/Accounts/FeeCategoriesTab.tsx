import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useCanManageAccounts } from "@/hooks/useAccountsAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

const DEFAULTS = [
  ["Admission Fee", "one_time"], ["Monthly Tuition Fee", "monthly"],
  ["Annual Fee", "yearly"], ["Registration Fee", "one_time"],
  ["Session Fee", "yearly"], ["Exam Fee", "custom"],
  ["Library Fee", "yearly"], ["Lab Fee", "yearly"],
  ["Transport Fee", "monthly"], ["Hostel Fee", "monthly"],
  ["ID Card Fee", "one_time"], ["Certificate Fee", "one_time"],
  ["Fine", "custom"], ["Others", "custom"],
] as const;

const FREQ = ["one_time", "monthly", "yearly", "custom"];

const FeeCategoriesTab = () => {
  const { schoolId } = useAuth();
  const canManage = useCanManageAccounts();
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<any>(null);

  useRealtimeSync("fee_categories", [["fee-categories", schoolId ?? ""]]);

  const { data: rows = [] } = useQuery({
    queryKey: ["fee-categories", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from("fee_categories")
        .select("*").eq("school_id", schoolId!).is("deleted_at", null).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        const { error } = await supabase.from("fee_categories").update({
          name: payload.name, code: payload.code, description: payload.description,
          frequency: payload.frequency, is_mandatory: payload.is_mandatory, is_active: payload.is_active,
        }).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fee_categories").insert({
          school_id: schoolId, name: payload.name, code: payload.code,
          description: payload.description, frequency: payload.frequency,
          is_mandatory: payload.is_mandatory, is_active: payload.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fee-categories", schoolId] }); setDlg(null); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fee_categories").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fee-categories", schoolId] }); toast.success("Deleted"); },
  });

  const seedDefaults = async () => {
    if (!schoolId) return;
    const existing = new Set(rows.map((r: any) => r.name.toLowerCase()));
    const toInsert = DEFAULTS
      .filter(([n]) => !existing.has(n.toLowerCase()))
      .map(([name, frequency]) => ({ school_id: schoolId, name, frequency, is_mandatory: true, is_active: true }));
    if (toInsert.length === 0) { toast.info("All defaults already exist"); return; }
    const { error } = await supabase.from("fee_categories").insert(toInsert);
    if (error) toast.error(error.message);
    else { toast.success(`Added ${toInsert.length} categories`); qc.invalidateQueries({ queryKey: ["fee-categories", schoolId] }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fee Categories</h2>
          <p className="text-sm text-muted-foreground">Define the types of fees your school charges.</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={seedDefaults}><Sparkles className="h-4 w-4 mr-1" /> Seed Defaults</Button>
            <Button onClick={() => setDlg({ frequency: "monthly", is_mandatory: true, is_active: true })}>
              <Plus className="h-4 w-4 mr-1" /> Add Category
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3">Name</th><th className="p-3">Code</th>
              <th className="p-3">Frequency</th><th className="p-3">Mandatory</th>
              <th className="p-3">Status</th><th className="p-3 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No fee categories. Click "Seed Defaults" to start.</td></tr>
            )}
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-muted-foreground">{r.code || "—"}</td>
                <td className="p-3"><Badge variant="secondary">{r.frequency}</Badge></td>
                <td className="p-3">{r.is_mandatory ? "Yes" : "No"}</td>
                <td className="p-3">
                  <Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="p-3">
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setDlg(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dlg?.id ? "Edit" : "Add"} Fee Category</DialogTitle></DialogHeader>
          {dlg && <CategoryForm value={dlg} onChange={setDlg} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDlg(null)}>Cancel</Button>
            <Button onClick={() => save.mutate(dlg)} disabled={!dlg?.name || save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CategoryForm = ({ value, onChange }: { value: any; onChange: (v: any) => void }) => (
  <div className="space-y-3">
    <div><Label>Name *</Label><Input value={value.name || ""} onChange={(e) => onChange({ ...value, name: e.target.value })} /></div>
    <div><Label>Code</Label><Input value={value.code || ""} onChange={(e) => onChange({ ...value, code: e.target.value })} placeholder="e.g. TUIT" /></div>
    <div><Label>Description</Label><Input value={value.description || ""} onChange={(e) => onChange({ ...value, description: e.target.value })} /></div>
    <div>
      <Label>Frequency</Label>
      <Select value={value.frequency} onValueChange={(v) => onChange({ ...value, frequency: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{FREQ.map((f) => <SelectItem key={f} value={f}>{f.replace("_", " ")}</SelectItem>)}</SelectContent>
      </Select>
    </div>
    <div className="flex items-center justify-between"><Label>Mandatory</Label>
      <Switch checked={!!value.is_mandatory} onCheckedChange={(v) => onChange({ ...value, is_mandatory: v })} /></div>
    <div className="flex items-center justify-between"><Label>Active</Label>
      <Switch checked={!!value.is_active} onCheckedChange={(v) => onChange({ ...value, is_active: v })} /></div>
  </div>
);

export default FeeCategoriesTab;
