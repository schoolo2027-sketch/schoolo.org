import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { useCanManageAccounts } from "@/hooks/useAccountsAccess";

const AccountsSettingsTab = () => {
  const { schoolId } = useAuth();
  const canManage = useCanManageAccounts();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["accounts-settings", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data } = await supabase.from("accounts_settings").select("*").eq("school_id", schoolId!).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    setForm(data || {
      school_id: schoolId, currency: "BDT", currency_symbol: "৳", decimal_places: 2,
      fiscal_year_start: "01-01", receipt_prefix: "REC", voucher_prefix: "EXP",
      auto_receipt_number: true, auto_voucher_number: true,
      fine_rules: {}, late_fee_rules: {}, discount_rules: {}, scholarship_rules: {},
      monthly_generation: {}, notification_settings: {}, sms_settings: {},
      email_settings: {}, whatsapp_settings: {}, receipt_template: {},
      invoice_template: {}, print_settings: {},
    });
  }, [data, schoolId]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      if (form.id) {
        const { error } = await supabase.from("accounts_settings").update(form).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounts_settings").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts-settings", schoolId] }); toast.success("Settings saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!form) return null;

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const setJson = (k: string, sub: string, v: any) => setForm({ ...form, [k]: { ...(form[k] || {}), [sub]: v } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payment & Accounts Settings</h2>
        {canManage && <Button onClick={() => save.mutate()} disabled={save.isPending}>Save Settings</Button>}
      </div>

      <Accordion type="multiple" defaultValue={["general"]} className="bg-card rounded-xl border px-4">
        <AccordionItem value="general">
          <AccordionTrigger>General & Currency</AccordionTrigger>
          <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Academic Session</Label><Input value={form.academic_session || ""} onChange={(e) => set("academic_session", e.target.value)} placeholder="2026" /></div>
            <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => set("currency", e.target.value)} /></div>
            <div><Label>Currency Symbol</Label><Input value={form.currency_symbol} onChange={(e) => set("currency_symbol", e.target.value)} /></div>
            <div><Label>Decimal Places</Label><Input type="number" value={form.decimal_places} onChange={(e) => set("decimal_places", parseInt(e.target.value))} /></div>
            <div><Label>Fiscal Year Start (MM-DD)</Label><Input value={form.fiscal_year_start || ""} onChange={(e) => set("fiscal_year_start", e.target.value)} /></div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="numbering">
          <AccordionTrigger>Receipts & Vouchers</AccordionTrigger>
          <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Receipt Prefix</Label><Input value={form.receipt_prefix} onChange={(e) => set("receipt_prefix", e.target.value)} /></div>
            <div><Label>Voucher Prefix</Label><Input value={form.voucher_prefix} onChange={(e) => set("voucher_prefix", e.target.value)} /></div>
            <div className="flex items-center justify-between"><Label>Auto Receipt Number</Label>
              <Switch checked={form.auto_receipt_number} onCheckedChange={(v) => set("auto_receipt_number", v)} /></div>
            <div className="flex items-center justify-between"><Label>Auto Voucher Number</Label>
              <Switch checked={form.auto_voucher_number} onCheckedChange={(v) => set("auto_voucher_number", v)} /></div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fine">
          <AccordionTrigger>Fine & Late Fee Rules</AccordionTrigger>
          <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Late Fee After (days)</Label><Input type="number" value={form.late_fee_rules?.after_days || ""} onChange={(e) => setJson("late_fee_rules", "after_days", parseInt(e.target.value))} /></div>
            <div><Label>Fine Amount (per day)</Label><Input type="number" value={form.fine_rules?.per_day || ""} onChange={(e) => setJson("fine_rules", "per_day", parseFloat(e.target.value))} /></div>
            <div><Label>Max Fine</Label><Input type="number" value={form.fine_rules?.max || ""} onChange={(e) => setJson("fine_rules", "max", parseFloat(e.target.value))} /></div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="discount">
          <AccordionTrigger>Discount & Scholarship Rules</AccordionTrigger>
          <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Sibling Discount (%)</Label><Input type="number" value={form.discount_rules?.sibling_percent || ""} onChange={(e) => setJson("discount_rules", "sibling_percent", parseFloat(e.target.value))} /></div>
            <div><Label>Early Payment Discount (%)</Label><Input type="number" value={form.discount_rules?.early_pay_percent || ""} onChange={(e) => setJson("discount_rules", "early_pay_percent", parseFloat(e.target.value))} /></div>
            <div><Label>Merit Scholarship (%)</Label><Input type="number" value={form.scholarship_rules?.merit_percent || ""} onChange={(e) => setJson("scholarship_rules", "merit_percent", parseFloat(e.target.value))} /></div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="monthly">
          <AccordionTrigger>Monthly Fee Generation</AccordionTrigger>
          <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Generate on Day of Month</Label><Input type="number" value={form.monthly_generation?.day || 1} onChange={(e) => setJson("monthly_generation", "day", parseInt(e.target.value))} /></div>
            <div className="flex items-center justify-between"><Label>Auto Generate</Label>
              <Switch checked={!!form.monthly_generation?.enabled} onCheckedChange={(v) => setJson("monthly_generation", "enabled", v)} /></div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notifications">
          <AccordionTrigger>Notifications (SMS / Email / WhatsApp)</AccordionTrigger>
          <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between"><Label>SMS Enabled</Label>
              <Switch checked={!!form.sms_settings?.enabled} onCheckedChange={(v) => setJson("sms_settings", "enabled", v)} /></div>
            <div className="flex items-center justify-between"><Label>Email Receipt</Label>
              <Switch checked={!!form.email_settings?.enabled} onCheckedChange={(v) => setJson("email_settings", "enabled", v)} /></div>
            <div className="flex items-center justify-between"><Label>WhatsApp Notification</Label>
              <Switch checked={!!form.whatsapp_settings?.enabled} onCheckedChange={(v) => setJson("whatsapp_settings", "enabled", v)} /></div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="print">
          <AccordionTrigger>Receipt / Invoice / Print Templates</AccordionTrigger>
          <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Receipt Footer Text</Label><Input value={form.receipt_template?.footer || ""} onChange={(e) => setJson("receipt_template", "footer", e.target.value)} /></div>
            <div><Label>Invoice Footer Text</Label><Input value={form.invoice_template?.footer || ""} onChange={(e) => setJson("invoice_template", "footer", e.target.value)} /></div>
            <div><Label>Page Size</Label><Input value={form.print_settings?.page_size || "A4"} onChange={(e) => setJson("print_settings", "page_size", e.target.value)} /></div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <p className="text-xs text-muted-foreground">
        Gateway credentials (SSLCommerz, bKash, Nagad, Rocket), Cash & Bank accounts, and Permissions are managed under their own tabs.
      </p>
    </div>
  );
};

export default AccountsSettingsTab;
