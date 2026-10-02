import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE = 25;

const AuditLogTab = () => {
  const { schoolId } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data = [], isLoading } = useQuery({
    queryKey: ["financial-audit", schoolId, page],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_audit_log")
        .select("*")
        .eq("school_id", schoolId!)
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = data.filter(
    (r: any) =>
      !search ||
      `${r.action} ${r.entity} ${r.entity_id ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Financial Audit Log</h2>
        </div>
        <Input
          className="max-w-xs"
          placeholder="Search action or entity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Date & Time</th>
                <th className="text-left p-3">Action</th>
                <th className="text-left p-3">Entity</th>
                <th className="text-left p-3">Record</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No audit entries yet.</td></tr>
              )}
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3"><Badge variant="secondary">{r.action}</Badge></td>
                  <td className="p-3">{r.entity}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{r.entity_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {page + 1}</span>
        <Button variant="outline" size="sm" disabled={data.length < PAGE} onClick={() => setPage((p) => p + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AuditLogTab;
