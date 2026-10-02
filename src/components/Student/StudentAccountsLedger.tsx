import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, ReceiptText, Wallet } from "lucide-react";
import { printAccountsReceipt } from "@/utils/accountsReceiptPrint";

interface Props {
  student: any;
}

const statusVariant = (s: string) =>
  s === "paid" ? "default" : s === "partial" ? "secondary" : "outline";

const StudentAccountsLedger = ({ student }: Props) => {
  const { schoolId } = useAuth();
  const effectiveSchoolId = schoolId || student?.school_id;

  const { data: school } = useQuery({
    queryKey: ["student-ledger-school", effectiveSchoolId],
    enabled: !!effectiveSchoolId,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_school_info_safe", { _school_id: effectiveSchoolId });
      return (data as any)?.[0] ?? null;
    },
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["student-ledger-self", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_ledger")
        .select("*, fee_categories(name)")
        .eq("student_id", student.id)
        .is("deleted_at", null)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ["student-receipts-self", student?.id],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("student_id", student.id)
        .is("deleted_at", null)
        .order("issued_on", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const payable = (r: any) =>
    Number(r.amount || 0) + Number(r.fine || 0) - Number(r.discount || 0) - Number(r.paid || 0);

  const totalDue = ledger
    .filter((r: any) => r.status !== "paid" && r.status !== "waived" && r.status !== "cancelled")
    .reduce((s: number, r: any) => s + Math.max(payable(r), 0), 0);
  const totalPaid = ledger.reduce((s: number, r: any) => s + Number(r.paid || 0), 0);

  const printReceipt = (r: any) =>
    printAccountsReceipt({
      receiptNo: r.receipt_no,
      date: new Date(r.issued_on).toLocaleDateString(),
      schoolName: school?.school_name ?? "School",
      schoolAddress: school?.school_address,
      schoolLogo: school?.school_logo,
      studentName: student?.student_name ?? "",
      studentId: student?.student_id,
      className: student?.classes?.class_name,
      roll: student?.roll,
      method: r.method,
      reference: r.reference,
      notes: r.notes,
      lines: [{ label: "Fee payment", period: null, amount: Number(r.amount || 0) }],
      total: Number(r.amount || 0),
    });

  if (ledger.length === 0 && receipts.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Due (Ledger)</p>
              <p className="text-lg font-bold font-heading text-destructive">{totalDue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <ReceiptText className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="text-lg font-bold font-heading">{totalPaid.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {ledger.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Fee Ledger</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Fee</th><th className="p-3">Period</th><th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Amount</th><th className="p-3 text-right">Discount</th>
                  <th className="p-3 text-right">Fine</th><th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Balance</th><th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ledger.map((r: any) => (
                  <tr key={r.id}>
                    <td className="p-3 font-medium">{r.fee_categories?.name ?? "Fee"}</td>
                    <td className="p-3">{r.period || "—"}</td>
                    <td className="p-3">{r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}</td>
                    <td className="p-3 text-right">{Number(r.amount).toLocaleString()}</td>
                    <td className="p-3 text-right">{Number(r.discount).toLocaleString()}</td>
                    <td className="p-3 text-right">{Number(r.fine).toLocaleString()}</td>
                    <td className="p-3 text-right">{Number(r.paid).toLocaleString()}</td>
                    <td className="p-3 text-right font-semibold">{Math.max(payable(r), 0).toLocaleString()}</td>
                    <td className="p-3"><Badge variant={statusVariant(r.status) as any}>{r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {receipts.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">My Receipts</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Receipt No</th><th className="p-3">Date</th><th className="p-3">Method</th>
                  <th className="p-3 text-right">Amount</th><th className="p-3 text-right">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {receipts.map((r: any) => (
                  <tr key={r.id}>
                    <td className="p-3 font-mono text-xs">{r.receipt_no}</td>
                    <td className="p-3">{new Date(r.issued_on).toLocaleDateString()}</td>
                    <td className="p-3">{r.method || "—"}</td>
                    <td className="p-3 text-right font-semibold">{Number(r.amount).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => printReceipt(r)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentAccountsLedger;
