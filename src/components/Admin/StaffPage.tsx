import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, Edit, Trash2, Shield, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import StaffFormDialog from "./StaffFormDialog";
import ExcelImportDialog from "@/components/Common/ExcelImportDialog";

const StaffPage = () => {
  const { schoolId, roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);

  const importStaff = async (rows: Record<string, string>[]) => {
    if (!schoolId) throw new Error("School not found");
    const errors: string[] = [];
    let inserted = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.staff_name) throw new Error("Staff Name required");
        const { error } = await supabase.from("staff").insert({
          school_id: schoolId,
          staff_name: r.staff_name,
          designation: r.designation || null,
          phone: r.phone || null,
          email: r.email ? r.email.trim().toLowerCase() : null,
          address: r.address || null,
          blood_group: r.blood_group || null,
          joining_date: r.joining_date || null,
        });
        if (error) throw error;
        inserted++;
      } catch (e: any) {
        errors.push(`Row ${i + 2}: ${e.message}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["staff"] });
    return { inserted, errors };
  };

  const canManage = roles.some(r => ["master_admin", "school_admin"].includes(r));

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ["staff", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from("staff")
        .select("*")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("staff_name");
      return data || [];
    },
    enabled: !!schoolId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Session not found. Please login again.");

      const staffMember = staffList.find((s: any) => s.id === id);
      let targetUserId = staffMember?.user_id || null;

      if (!targetUserId && staffMember?.email) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("email", staffMember.email)
          .maybeSingle();
        if (prof?.user_id) targetUserId = prof.user_id;
      }

      // 1. Revoke roles and profile
      if (targetUserId) {
        await supabase.from("user_roles").delete().eq("user_id", targetUserId);
        await supabase.from("profiles").delete().eq("user_id", targetUserId);
      }

      // 2. Remove staff attendance
      await supabase.from("staff_attendance").delete().eq("staff_id", id);

      // 3. Delete staff record
      const { error: delStaffErr } = await supabase.from("staff").delete().eq("id", id);
      if (delStaffErr) {
        await supabase.from("staff").update({ is_active: false, user_id: null }).eq("id", id);
      }

      // 4. Edge function deletion
      try {
        const { data, error } = await supabase.functions.invoke("delete-user", {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: { user_id: targetUserId, type: "staff", record_id: id },
        });
        if (error) console.warn("delete-user error:", error.message);
        if (data?.error) console.warn("delete-user data error:", data.error);
      } catch (err: any) {
        console.warn("delete-user call warning:", err.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast({ title: "Staff member deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = staffList.filter((s: any) =>
    s.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPermissionBadges = (s: any) => {
    const perms: string[] = [];
    if (s.can_manage_students) perms.push("Students");
    if (s.can_manage_teachers) perms.push("Teachers");
    if (s.can_manage_results) perms.push("Results");
    if (s.can_manage_payments) perms.push("Payments");
    if (s.can_manage_notices) perms.push("Notices");
    if (s.can_manage_settings) perms.push("Settings");
    return perms;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title uppercase tracking-wide">Staff Management</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Manage School Staff & Authority
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Excel Import
            </Button>
            <Button onClick={() => { setEditingStaff(null); setFormOpen(true); }} className="gap-2">
              <UserPlus className="h-4 w-4" /> Add Staff Member
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="data-table">
        <div className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-primary">Staff Member</th>
                <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-primary">Position & Contact</th>
                <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-primary">Permissions</th>
                <th className="text-right py-3 px-4 font-medium text-xs uppercase tracking-wider text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      No staff members found
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((s: any) => {
                  const perms = getPermissionBadges(s);
                  const initial = s.staff_name.charAt(0).toUpperCase();
                  return (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {s.photo ? (
                            <img src={s.photo} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                              {initial}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-sm">{s.staff_name}</p>
                            <p className="text-xs text-muted-foreground">{s.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">{s.designation || "—"}</p>
                        <p className="text-xs text-muted-foreground">{s.phone || "—"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {perms.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No permissions</span>
                          ) : (
                            perms.map(p => (
                              <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canManage && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditingStaff(s); setFormOpen(true); }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(s.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StaffFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        staff={editingStaff}
      />

      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Staff from Excel"
        templateName="staff"
        columns={[
          { key: "staff_name", label: "Staff Name", required: true, example: "Jamal Hossain" },
          { key: "designation", label: "Designation", example: "Accountant" },
          { key: "phone", label: "Phone", example: "01700000000" },
          { key: "email", label: "Email", example: "jamal@school.com" },
          { key: "blood_group", label: "Blood Group", example: "A+" },
          { key: "joining_date", label: "Joining Date", example: "2026-01-01" },
          { key: "address", label: "Address", example: "Dhaka" },
        ]}
        onImport={importStaff}
      />
    </div>
  );
};

export default StaffPage;
