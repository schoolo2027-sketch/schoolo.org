import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCanManageAccounts } from "@/hooks/useAccountsAccess";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => currentYear - 2 + i);
const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const MonthlyGeneratorTab = () => {
  const { schoolId } = useAuth();
  const canManage = useCanManageAccounts();
  const qc = useQueryClient();
  const [year, setYear] = useState(String(currentYear));
  const [classId, setClassId] = useState<string>("");
  const [months, setMonths] = useState<string[]>([MONTHS[new Date().getMonth()]]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

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

  const toggleMonth = (m: string) =>
    setMonths((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m].sort()));

  const generate = async () => {
    if (!schoolId || !classId || months.length === 0) return;
    setBusy(true);
    setResult(null);
    try {
      const [{ data: students, error: sErr }, { data: structures, error: fErr }] = await Promise.all([
        supabase.from("students").select("id, section_id")
          .eq("school_id", schoolId).eq("class_id", classId).eq("is_active", true),
        supabase.from("fee_structures").select("*")
          .eq("school_id", schoolId).eq("class_id", classId)
          .eq("academic_year", Number(year)).is("deleted_at", null),
      ]);
      if (sErr) throw sErr;
      if (fErr) throw fErr;
      if (!students?.length) throw new Error("No active students in this class");
      if (!structures?.length) throw new Error("No fee structures set for this class/year");

      const catIds = [...new Set(structures.map((s: any) => s.category_id))];
      const { data: cats } = await supabase.from("fee_categories")
        .select("id, frequency").in("id", catIds);
      const freqOf = new Map((cats ?? []).map((c: any) => [c.id, c.frequency]));

      const periods = months.map((m) => `${year}-${m}`);
      const { data: existing } = await supabase.from("student_ledger")
        .select("student_id, category_id, period")
        .eq("school_id", schoolId).in("period", periods)
        .in("student_id", students.map((s: any) => s.id));
      const seen = new Set((existing ?? []).map((e: any) => `${e.student_id}|${e.category_id}|${e.period}`));

      const rows: any[] = [];
      for (const st of students) {
        for (const fs of structures) {
          if (fs.section_id && fs.section_id !== st.section_id) continue;
          const freq = freqOf.get(fs.category_id);
          const targetPeriods = freq === "monthly" ? periods : [periods[0]];
          for (const period of targetPeriods) {
            const key = `${st.id}|${fs.category_id}|${period}`;
            if (seen.has(key)) continue;
            seen.add(key);
            rows.push({
              school_id: schoolId, student_id: st.id, category_id: fs.category_id,
              structure_id: fs.id, period, amount: fs.amount,
              discount: 0, fine: 0, paid: 0, status: "due",
              due_date: fs.due_day
                ? `${period}-${String(fs.due_day).padStart(2, "0")}`
                : `${period}-${new Date(Number(year), Number(period.slice(5)), 0).getDate()}`,
            });
          }
        }
      }

      if (rows.length === 0) {
        setResult("Nothing new to generate — all dues already exist for the selected months.");
        toast.info("Already generated");
        return;
      }
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("student_ledger").insert(rows.slice(i, i + 500));
        if (error) throw error;
      }
      setResult(`Generated ${rows.length} due entries for ${students.length} students across ${months.length} month(s).`);
      toast.success("Dues generated");
      qc.invalidateQueries({ queryKey: ["student-ledger"] });
    } catch (e: any) {
      toast.error(e.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Monthly Fee Generator</h2>
        <p className="text-sm text-muted-foreground">
          Create ledger dues for every active student of a class using the class fee setup. Existing entries are never duplicated.
        </p>
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Academic Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Class</Label>
            <Select value={classId} onValueChange={setClassId}>
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
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">Months</Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMonths([...MONTHS])}>All</Button>
              <Button variant="ghost" size="sm" onClick={() => setMonths([])}>None</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {MONTHS.map((m, i) => (
              <label key={m} className="flex items-center gap-2 rounded-lg border p-2 text-sm cursor-pointer">
                <Checkbox checked={months.includes(m)} onCheckedChange={() => toggleMonth(m)} />
                {MONTH_NAMES[i]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button disabled={!canManage || !classId || months.length === 0 || busy} onClick={generate}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1" />}
            Generate Dues
          </Button>
        </div>

        {result && <div className="rounded-lg bg-muted p-3 text-sm">{result}</div>}
      </div>
    </div>
  );
};

export default MonthlyGeneratorTab;
