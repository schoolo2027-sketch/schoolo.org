import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Lock, UserCheck } from "lucide-react";
import ImageUpload from "@/components/Common/ImageUpload";

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: any;
}

const designations = [
  "Office Assistant",
  "Accountant",
  "Librarian",
  "Lab Assistant",
  "Peon",
  "Guard",
  "Cleaner",
  "IT Support",
  "Receptionist",
  "Other",
];

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const permissions = [
  { key: "can_manage_students", label: "Manage Students", desc: "Add, edit, and remove students" },
  { key: "can_manage_teachers", label: "Manage Teachers", desc: "Add, edit, and remove teachers" },
  { key: "can_manage_classes", label: "Manage Classes", desc: "Create and organize classes & sections" },
  { key: "can_manage_attendance", label: "Manage Attendance", desc: "Take and view attendance records" },
  { key: "can_manage_results", label: "Manage Results", desc: "Entry and publish exam results" },
  { key: "can_manage_homework", label: "Manage Homework", desc: "Assign and review homework" },
  { key: "can_manage_payments", label: "Manage Payments", desc: "Approve and track fee payments" },
  { key: "can_manage_notices", label: "Manage Notices", desc: "Create and broadcast school notices" },
  { key: "can_view_reports", label: "View Reports", desc: "Access analytics and reports" },
  { key: "can_use_ai_tools", label: "AI Tools", desc: "Generate papers and notices with AI" },
  { key: "can_manage_settings", label: "School Settings", desc: "Update school profile and configuration" },
];

const StaffFormDialog = ({ open, onOpenChange, staff }: StaffFormDialogProps) => {
  const { schoolId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!staff;

  const [form, setForm] = useState({
    staff_name: "",
    designation: "Office Assistant",
    phone: "",
    email: "",
    address: "",
    blood_group: "",
    photo: "",
    joining_date: new Date().toISOString().split("T")[0],
    can_manage_students: false,
    can_manage_teachers: false,
    can_manage_classes: false,
    can_manage_attendance: false,
    can_manage_results: false,
    can_manage_homework: false,
    can_manage_payments: false,
    can_manage_notices: false,
    can_view_reports: false,
    can_use_ai_tools: false,
    can_manage_settings: false,
    attendance_scope_students: true,
    attendance_scope_teachers: true,
    attendance_scope_staff: true,
  });


  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (staff) {
      setForm({
        staff_name: staff.staff_name || "",
        designation: staff.designation || "Office Assistant",
        phone: staff.phone || "",
        email: staff.email || "",
        address: staff.address || "",
        blood_group: staff.blood_group || "",
        photo: staff.photo || "",
        joining_date: staff.joining_date || new Date().toISOString().split("T")[0],
        can_manage_students: staff.can_manage_students || false,
        can_manage_teachers: staff.can_manage_teachers || false,
        can_manage_classes: staff.can_manage_classes || false,
        can_manage_attendance: staff.can_manage_attendance || false,
        can_manage_results: staff.can_manage_results || false,
        can_manage_homework: staff.can_manage_homework || false,
        can_manage_payments: staff.can_manage_payments || false,
        can_manage_notices: staff.can_manage_notices || false,
        can_view_reports: staff.can_view_reports || false,
        can_use_ai_tools: staff.can_use_ai_tools || false,
        can_manage_settings: staff.can_manage_settings || false,
        attendance_scope_students: staff.attendance_scope_students ?? true,
        attendance_scope_teachers: staff.attendance_scope_teachers ?? true,
        attendance_scope_staff: staff.attendance_scope_staff ?? true,
      });

      setLoginEmail(staff.email || "");
    } else {
      setForm({
        staff_name: "",
        designation: "Office Assistant",
        phone: "",
        email: "",
        address: "",
        blood_group: "",
        photo: "",
        joining_date: new Date().toISOString().split("T")[0],
        can_manage_students: false,
        can_manage_teachers: false,
        can_manage_classes: false,
        can_manage_attendance: false,
        can_manage_results: false,
        can_manage_homework: false,
        can_manage_payments: false,
        can_manage_notices: false,
        can_view_reports: false,
        can_use_ai_tools: false,
        can_manage_settings: false,
        attendance_scope_students: true,
        attendance_scope_teachers: true,
        attendance_scope_staff: true,
      });

      setLoginEmail("");
      setLoginPassword("");
    }
  }, [staff, open]);

  const handleSave = async () => {
    if (!schoolId || !form.staff_name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, school_id: schoolId, email: loginEmail || form.email || null };

      if (isEdit) {
        const { error } = await supabase.from("staff").update(payload).eq("id", staff.id);
        if (error) throw error;

        // Create auth account if login credentials provided and no existing user_id
        if (loginEmail && loginPassword && !staff.user_id) {
          const { data: result, error: fnError } = await supabase.functions.invoke("create-school-member", {
            body: {
              email: loginEmail,
              password: loginPassword,
              full_name: form.staff_name,
              school_id: schoolId,
              role: "sub_admin",
              record_id: staff.id,
              table_name: "staff",
            },
          });
          if (fnError) throw fnError;
          if (result?.error) throw new Error(result.error);
        }

        toast({ title: "Staff member updated" });
      } else {
        const { data: newStaff, error } = await supabase.from("staff").insert(payload).select().single();
        if (error) throw error;

        // Create auth account if login credentials provided
        if (loginEmail && loginPassword && newStaff) {
          try {
            const { data: result, error: fnError } = await supabase.functions.invoke("create-school-member", {
              body: {
                email: loginEmail,
                password: loginPassword,
                full_name: form.staff_name,
                school_id: schoolId,
                role: "sub_admin",
                record_id: newStaff.id,
                table_name: "staff",
              },
            });
            if (fnError || result?.error) {
              const msg = result?.error || fnError?.message || "Login account could not be created";
              toast({ title: "Staff added, but login failed", description: msg, variant: "destructive" });
              queryClient.invalidateQueries({ queryKey: ["staff"] });
              onOpenChange(false);
              return;
            }
          } catch (authErr: any) {
            toast({ title: "Staff added, but login failed", description: authErr.message, variant: "destructive" });
            queryClient.invalidateQueries({ queryKey: ["staff"] });
            onOpenChange(false);
            return;
          }
        }

        toast({ title: "Staff member added successfully" });
      }

      queryClient.invalidateQueries({ queryKey: ["staff"] });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <div>
              <span className="text-lg font-bold uppercase tracking-wide">
                {isEdit ? "Edit Staff Member" : "Add Staff Member"}
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mt-0.5">
                Configure Staff Access & Profile
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[200px_1fr] gap-6 mt-4">
          {/* Left: Photo + Login */}
          <div className="space-y-5">
            <div className="flex flex-col items-center">
              <ImageUpload
                bucket="staff-photos"
                currentUrl={form.photo}
                onUpload={(url) => update("photo", url)}
                size="lg"
              />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center mt-2">
                Portrait Photo
              </p>
            </div>

            <div className="rounded-xl border border-border p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest">Login Access</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary">Login Email</label>
                <Input
                  type="email"
                  placeholder="staff@school.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary">Password</label>
                <Input
                  type="password"
                  placeholder="System password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Right: Form fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary">Full Name</label>
                <Input placeholder="Full Name" value={form.staff_name} onChange={(e) => update("staff_name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary">Position / Designation</label>
                <Select value={form.designation} onValueChange={(v) => update("designation", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {designations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary">Phone Number</label>
                <Input placeholder="Phone Number" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary">Blood Group</label>
                <Select value={form.blood_group || "none"} onValueChange={(v) => update("blood_group", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select</SelectItem>
                    {bloodGroups.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary">Joining Date</label>
                <Input type="date" value={form.joining_date} onChange={(e) => update("joining_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary">Address</label>
                <Input placeholder="Full Address" value={form.address} onChange={(e) => update("address", e.target.value)} />
              </div>
            </div>

            {/* Permissions */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold uppercase tracking-widest">Access Permissions</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {permissions.map((perm) => (
                  <div
                    key={perm.key}
                    className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => update(perm.key, !form[perm.key as keyof typeof form])}
                  >
                    <Switch
                      checked={form[perm.key as keyof typeof form] as boolean}
                      onCheckedChange={(v) => update(perm.key, v)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">{perm.label}</p>
                      <p className="text-xs text-muted-foreground">{perm.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {form.can_manage_attendance && (
                <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Attendance Scope — Which Categories Can Be Managed & Printed</p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { key: "attendance_scope_students", label: "Students" },
                      { key: "attendance_scope_teachers", label: "Teachers" },
                      { key: "attendance_scope_staff", label: "Staff" },
                    ]).map(s => (
                      <div
                        key={s.key}
                        className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5 cursor-pointer hover:bg-muted/20"
                        onClick={() => update(s.key, !form[s.key as keyof typeof form])}
                      >
                        <Switch
                          checked={form[s.key as keyof typeof form] as boolean}
                          onCheckedChange={(v) => update(s.key, v)}
                        />
                        <span className="text-xs font-semibold uppercase tracking-wider">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Staff Member" : "Create Staff Member"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StaffFormDialog;
