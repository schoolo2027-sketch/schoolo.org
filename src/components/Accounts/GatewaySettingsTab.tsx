import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCanManageAccounts } from "@/hooks/useAccountsAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";

type GatewayKey = "sslcommerz" | "bkash" | "nagad" | "rocket";

const GATEWAYS: { key: GatewayKey; label: string; fields: { name: string; label: string; secret?: boolean }[] }[] = [
  {
    key: "sslcommerz", label: "SSLCommerz",
    fields: [
      { name: "store_id", label: "Store ID" },
      { name: "store_password", label: "Store Password", secret: true },
    ],
  },
  {
    key: "bkash", label: "bKash",
    fields: [
      { name: "app_key", label: "App Key" },
      { name: "app_secret", label: "App Secret", secret: true },
      { name: "username", label: "Username" },
      { name: "password", label: "Password", secret: true },
    ],
  },
  {
    key: "nagad", label: "Nagad",
    fields: [
      { name: "merchant_id", label: "Merchant ID" },
      { name: "public_key", label: "Public Key", secret: true },
    ],
  },
  {
    key: "rocket", label: "Rocket",
    fields: [
      { name: "merchant_id", label: "Merchant ID" },
      { name: "api_key", label: "API Key", secret: true },
    ],
  },
];

const GatewaySettingsTab = () => {
  const { schoolId } = useAuth();
  const canManage = useCanManageAccounts();
  const qc = useQueryClient();
  const [state, setState] = useState<Record<string, any>>({});

  const { data: rows = [] } = useQuery({
    queryKey: ["payment-gateways", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_gateway_settings").select("*").eq("school_id", schoolId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const next: Record<string, any> = {};
    GATEWAYS.forEach((g) => {
      const row: any = (rows as any[]).find((r) => r.gateway === g.key);
      next[g.key] = row
        ? { id: row.id, is_active: row.is_active, is_sandbox: row.is_sandbox, credentials: row.credentials || {} }
        : { is_active: false, is_sandbox: true, credentials: {} };
    });
    setState(next);
  }, [rows]);

  const save = useMutation({
    mutationFn: async (key: GatewayKey) => {
      const g = state[key];
      const payload = {
        school_id: schoolId!, gateway: key,
        credentials: g.credentials || {},
        is_active: !!g.is_active, is_sandbox: !!g.is_sandbox,
      };
      if (g.id) {
        const { error } = await supabase.from("payment_gateway_settings").update(payload).eq("id", g.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payment_gateway_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-gateways"] }); toast.success("Gateway saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const setCred = (key: GatewayKey, field: string, value: string) =>
    setState((s) => ({ ...s, [key]: { ...s[key], credentials: { ...(s[key]?.credentials || {}), [field]: value } } }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Online Payment Gateways</h2>
        <p className="text-sm text-muted-foreground">
          Configure gateway credentials for online fee collection. Credentials are stored per school and only readable by your accounts team.
        </p>
      </div>

      <Accordion type="multiple" className="bg-card rounded-xl border px-4">
        {GATEWAYS.map((g) => {
          const st = state[g.key] || { credentials: {} };
          return (
            <AccordionItem key={g.key} value={g.key}>
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  {g.label}
                  {st.is_active
                    ? <Badge>{st.is_sandbox ? "sandbox" : "live"}</Badge>
                    : <Badge variant="outline">disabled</Badge>}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {g.fields.map((f) => (
                    <div key={f.name}>
                      <Label>{f.label}</Label>
                      <Input
                        type={f.secret ? "password" : "text"}
                        autoComplete="new-password"
                        disabled={!canManage}
                        value={st.credentials?.[f.name] || ""}
                        onChange={(e) => setCred(g.key, f.name, e.target.value)}
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <Label>Enabled</Label>
                    <Switch disabled={!canManage} checked={!!st.is_active}
                      onCheckedChange={(v) => setState((s) => ({ ...s, [g.key]: { ...s[g.key], is_active: v } }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Sandbox Mode</Label>
                    <Switch disabled={!canManage} checked={!!st.is_sandbox}
                      onCheckedChange={(v) => setState((s) => ({ ...s, [g.key]: { ...s[g.key], is_sandbox: v } }))} />
                  </div>
                </div>
                {canManage && (
                  <Button onClick={() => save.mutate(g.key)} disabled={save.isPending}>Save {g.label}</Button>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <p className="text-xs text-muted-foreground">
        Students pay offline (bKash / Nagad / bank / cash) and submit the transaction ID until a gateway is enabled here with live credentials.
      </p>
    </div>
  );
};

export default GatewaySettingsTab;
