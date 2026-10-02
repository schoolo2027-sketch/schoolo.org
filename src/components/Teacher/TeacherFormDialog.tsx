import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Shield, CalendarDays, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ImageUpload from "@/components/Common/ImageUpload";
import { ALL_CLASSES, getSectionsForClass } from "@/utils/subjectConfig";

interface TeacherForm {
  teacher_name: string;
  teacher_id_number: string;
  phone: string;
  address: string;
  blood_group: string;
  designation: string;
  subject: string;
  joining_date: string;
  email: string;
  photo: string;
  login_email: string;
  login_password: string;
  can_add_students: boolean;
  can_edit_students: boolean;
  can_entry_results: boolean;
  can_manage_homework: boolean;
  can_send_notices: boolean;
  can_manage_classes: boolean;
  can_manage_attendance: boolean;
  can_manage_payments: boolean;
  can_view_reports: boolean;
  can_use_ai_tools: boolean;
  can_manage_settings: boolean;
  attendance_scope_students: boolean;
  attendance_scope_teachers: boolean;
  attendance_scope_staff: boolean;

}

interface Assignment {
  id?: string;
  academic_year: number;
  class_name: string;
  shift: string;
  section_name: string;
  version: string;
}

const emptyForm: TeacherForm = {
  teacher_name: "", teacher_id_number: "", phone: "", address: "",
  blood_group: "", designation: "", subject: "", joining_date: new Date().toISOString().split("T")[0],
  email: "", photo: "",
  login_email: "", login_password: "",
  can_add_students: false, can_edit_students: false, can_entry_results: false,
  can_manage_homework: false, can_send_notices: false,
  can_manage_classes: false, can_manage_attendance: false, can_manage_payments: false,
  can_view_reports: false, can_use_ai_tools: false, can_manage_settings: false,
  attendance_scope_students: true, attendance_scope_teachers: false, attendance_scope_staff: false,

};

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const designations = ["Senior Teacher", "Assistant Teacher", "Head Teacher", "Assistant Head Teacher", "Lecturer"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTeacher: any | null;
}

const TeacherFormDialog = ({ open, onOpenChange, editTeacher }: Props) => {
  const { schoolId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<TeacherForm>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [newAssignment, setNewAssignment] = useState<Assignment>({
    academic_year: 2026, class_name: "all", shift: "all", section_name: "all", version: "bangla",
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("classes").select("*, sections(*)").eq("school_id", schoolId).order("class_name");
      return data || [];
    },
    enabled: !!schoolId && open,
  });

  const { data: existingAssignments = [] } = useQuery({
    queryKey: ["teacher-assignments", editTeacher?.id],
    queryFn: async () => {
      if (!editTeacher?.id) return [];
      const { data } = await supabase.from("teacher_assignments").select("*").eq("teacher_id", editTeacher.id);
      return data || [];
    },
    enabled: !!editTeacher?.id && open,
  });

  useEffect(() => {
    if (editTeacher) {
      setForm({
        teacher_name: editTeacher.teacher_name || "",
        teacher_id_number: editTeacher.teacher_id_number || "",
        phone: editTeacher.phone || "",
        address: editTeacher.address || "",
        blood_group: editTeacher.blood_group || "",
        designation: editTeacher.designation || "",
        subject: editTeacher.subject || "",
        joining_date: editTeacher.joining_date || new Date().toISOString().split("T")[0],
        email: editTeacher.email || "",
        photo: editTeacher.photo || "",
        login_email: editTeacher.email || "",
        login_password: "",
        can_add_students: editTeacher.can_add_students ?? false,
        can_edit_students: editTeacher.can_edit_students ?? false,
        can_entry_results: editTeacher.can_entry_results ?? true,
        can_manage_homework: editTeacher.can_manage_homework ?? true,
        can_send_notices: editTeacher.can_send_notices ?? true,
        can_manage_classes: editTeacher.can_manage_classes ?? false,
        can_manage_attendance: editTeacher.can_manage_attendance ?? true,
        can_manage_payments: editTeacher.can_manage_payments ?? false,
        can_view_reports: editTeacher.can_view_reports ?? false,
        can_use_ai_tools: editTeacher.can_use_ai_tools ?? false,
        can_manage_settings: editTeacher.can_manage_settings ?? false,
        attendance_scope_students: editTeacher.attendance_scope_students ?? true,
        attendance_scope_teachers: editTeacher.attendance_scope_teachers ?? false,
        attendance_scope_staff: editTeacher.attendance_scope_staff ?? false,
      });
      setAssignments(existingAssignments.map((a: any) => {
        const cls = classes.find((c: any) => c.id === a.class_id);
        const sec = cls?.sections?.find((s: any) => s.id === a.section_id);
        return {
          id: a.id,
          academic_year: a.academic_year,
          class_name: cls?.class_name || "all",
          shift: "all",
          section_name: sec?.section_name || "all",
          version: "bangla",
        };
      }));
    } else {
      setForm(emptyForm);
      setAssignments([]);
    }
  }, [editTeacher?.id, existingAssignments.length, open]);

  const createMutation = useMutation({
    mutationFn: async (f: TeacherForm) => {
      if (!schoolId) throw new Error("No school");
      const { data, error } = await supabase.from("teachers").insert({
        school_id: schoolId,
        teacher_name: f.teacher_name,
        teacher_id_number: f.teacher_id_number || null,
        phone: f.phone || null,
        address: f.address || null,
        blood_group: f.blood_group || null,
        designation: f.designation || null,
        subject: f.subject || null,
        joining_date: f.joining_date || null,
        email: f.login_email || f.email || null,
        photo: f.photo || null,
        can_add_students: f.can_add_students,
        can_edit_students: f.can_edit_students,
        can_entry_results: f.can_entry_results,
        can_manage_homework: f.can_manage_homework,
        can_send_notices: f.can_send_notices,
        can_manage_classes: f.can_manage_classes,
        can_manage_attendance: f.can_manage_attendance,
        can_manage_payments: f.can_manage_payments,
        can_view_reports: f.can_view_reports,
        can_use_ai_tools: f.can_use_ai_tools,
        can_manage_settings: f.can_manage_settings,
        attendance_scope_students: f.can_manage_attendance ? f.attendance_scope_students : false,
        attendance_scope_teachers: f.can_manage_attendance ? f.attendance_scope_teachers : false,
        attendance_scope_staff: f.can_manage_attendance ? f.attendance_scope_staff : false,
      }).select().single();
      if (error) throw error;

      // Save assignments - resolve class_name/section_name to IDs
      if (assignments.length > 0 && data) {
        const resolvedAssignments = assignments.map(a => {
          const cls = classes.find((c: any) => c.class_name === a.class_name);
          const sec = cls?.sections?.find((s: any) => s.section_name === a.section_name);
          return {
            teacher_id: data.id,
            school_id: schoolId,
            class_id: a.class_name === "all" ? null : (cls?.id || null),
            section_id: a.section_name === "all" ? null : (sec?.id || null),
            academic_year: a.academic_year,
          };
        });
        const { error: aErr } = await supabase.from("teacher_assignments").insert(resolvedAssignments);
        if (aErr) throw aErr;
      }

      // Create auth account if login credentials provided
      if (f.login_email && f.login_password && data) {
        const { data: result, error: fnError } = await supabase.functions.invoke("create-school-member", {
          body: {
            email: f.login_email,
            password: f.login_password,
            full_name: f.teacher_name,
            school_id: schoolId,
            role: "teacher",
            record_id: data.id,
            table_name: "teachers",
          },
        });

        const authMessage = result?.error || fnError?.message || "";
        if (authMessage) {
          const lower = authMessage.toLowerCase();
          if (lower.includes("already") || lower.includes("email_exists") || lower.includes("পুনরায় set করা যাবে না")) {
            toast({ title: "Teacher added, login unchanged", description: authMessage, variant: "destructive" });
            return;
          }
          throw new Error(authMessage);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({ title: "Teacher added successfully" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (f: TeacherForm) => {
      if (!editTeacher?.id) throw new Error("No teacher");
      const { error } = await supabase.from("teachers").update({
        teacher_name: f.teacher_name,
        teacher_id_number: f.teacher_id_number || null,
        phone: f.phone || null,
        address: f.address || null,
        blood_group: f.blood_group || null,
        designation: f.designation || null,
        subject: f.subject || null,
        joining_date: f.joining_date || null,
        email: f.email || null,
        photo: f.photo || null,
        can_add_students: f.can_add_students,
        can_edit_students: f.can_edit_students,
        can_entry_results: f.can_entry_results,
        can_manage_homework: f.can_manage_homework,
        can_send_notices: f.can_send_notices,
        can_manage_classes: f.can_manage_classes,
        can_manage_attendance: f.can_manage_attendance,
        can_manage_payments: f.can_manage_payments,
        can_view_reports: f.can_view_reports,
        can_use_ai_tools: f.can_use_ai_tools,
        can_manage_settings: f.can_manage_settings,
        attendance_scope_students: f.can_manage_attendance ? f.attendance_scope_students : false,
        attendance_scope_teachers: f.can_manage_attendance ? f.attendance_scope_teachers : false,
        attendance_scope_staff: f.can_manage_attendance ? f.attendance_scope_staff : false,
      }).eq("id", editTeacher.id);
      if (error) throw error;

      // Create auth account if login credentials provided and no existing user_id
      if (f.login_email && f.login_password && !editTeacher.user_id) {
        const { data: result, error: fnError } = await supabase.functions.invoke("create-school-member", {
          body: {
            email: f.login_email,
            password: f.login_password,
            full_name: f.teacher_name,
            school_id: schoolId,
            role: "teacher",
            record_id: editTeacher.id,
            table_name: "teachers",
          },
        });
        if (fnError) throw fnError;
        if (result?.error) throw new Error(result.error);
      }

      // Re-save assignments: delete old, insert new
      await supabase.from("teacher_assignments").delete().eq("teacher_id", editTeacher.id);
      if (assignments.length > 0 && schoolId) {
        const resolvedAssignments = assignments.map(a => {
          const cls = classes.find((c: any) => c.class_name === a.class_name);
          const sec = cls?.sections?.find((s: any) => s.section_name === a.section_name);
          return {
            teacher_id: editTeacher.id,
            school_id: schoolId,
            class_id: a.class_name === "all" ? null : (cls?.id || null),
            section_id: a.section_name === "all" ? null : (sec?.id || null),
            academic_year: a.academic_year,
          };
        });
        const { error: aErr } = await supabase.from("teacher_assignments").insert(resolvedAssignments);
        if (aErr) throw aErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] });
      toast({ title: "Teacher updated" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!form.teacher_name.trim()) {
      toast({ title: "Teacher name is required", variant: "destructive" });
      return;
    }
    if (editTeacher) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  const addAssignment = () => {
    setAssignments(prev => [...prev, { ...newAssignment }]);
    setNewAssignment({ academic_year: 2026, class_name: "all", shift: "all", section_name: "all", version: "bangla" });
  };

  const removeAssignment = (idx: number) => {
    setAssignments(prev => prev.filter((_, i) => i !== idx));
  };

  const sectionOptions = newAssignment.class_name === "all" ? [] : getSectionsForClass(newAssignment.class_name);

  const years = Array.from({ length: 25 }, (_, i) => 2020 + i);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-heading uppercase tracking-wide">
            {editTeacher ? "Edit Teacher" : "Add Teacher"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Top: Photo + Basic Info */}
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col items-center gap-2 min-w-[140px]">
              <ImageUpload
                bucket="teacher-photos"
                currentUrl={form.photo || null}
                onUpload={(path) => setForm(p => ({ ...p, photo: path }))}
                onRemove={() => setForm(p => ({ ...p, photo: "" }))}
                label="Portrait Photo"
                fallback={form.teacher_name || "?"}
              />
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</label>
                  <Input placeholder="Full Name" value={form.teacher_name} onChange={e => setForm(p => ({ ...p, teacher_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teacher ID (Optional)</label>
                  <Input placeholder="e.g. TCH001" value={form.teacher_id_number} onChange={e => setForm(p => ({ ...p, teacher_id_number: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number (Optional)</label>
                  <Input placeholder="Phone Number" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address (Optional)</label>
                  <Input placeholder="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blood Group</label>
                  <Select value={form.blood_group || "none"} onValueChange={v => setForm(p => ({ ...p, blood_group: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select</SelectItem>
                      {bloodGroups.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Designation</label>
                  <Select value={form.designation || "none"} onValueChange={v => setForm(p => ({ ...p, designation: v === "none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select</SelectItem>
                      {designations.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Subject & Joining Date */}
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-primary">Subject</label>
              <Input placeholder="e.g. Mathematics, English" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-primary">Joining Date</label>
              <Input type="date" value={form.joining_date} onChange={e => setForm(p => ({ ...p, joining_date: e.target.value }))} />
            </div>
          </div>

          {/* System Access */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">System Access (Optional)</h3>
            </div>
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Login Username (Email)</label>
                <Input placeholder="teacher@school.com" value={form.login_email} onChange={e => setForm(p => ({ ...p, login_email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Access Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="System password"
                    value={form.login_password}
                    onChange={e => setForm(p => ({ ...p, login_password: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <CalendarDays className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Assigned Information</h3>
            </div>

            {/* Existing assignments */}
            {assignments.length > 0 && (
              <div className="space-y-2">
                {assignments.map((a, idx) => {
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2 text-sm">
                      <span className="flex-1">
                        {a.academic_year} • {a.class_name === "all" ? "All Classes" : a.class_name} • {a.section_name === "all" ? "All Sections" : a.section_name}
                      </span>
                      <button onClick={() => removeAssignment(idx)} className="text-destructive hover:text-destructive/80">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-5 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
                <Select value={String(newAssignment.academic_year)} onValueChange={v => setNewAssignment(p => ({ ...p, academic_year: parseInt(v) }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Class</label>
                <Select value={newAssignment.class_name} onValueChange={v => setNewAssignment(p => ({ ...p, class_name: v, section_name: "all" }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {ALL_CLASSES.map(cn => <SelectItem key={cn} value={cn}>{cn}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Shift</label>
                <Select value={newAssignment.shift} onValueChange={v => setNewAssignment(p => ({ ...p, shift: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Section</label>
                <Select value={newAssignment.section_name} onValueChange={v => setNewAssignment(p => ({ ...p, section_name: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {sectionOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Version</label>
                <Select value={newAssignment.version} onValueChange={v => setNewAssignment(p => ({ ...p, version: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bangla">Bangla</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button size="sm" onClick={addAssignment} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Assignment
            </Button>
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Teacher Permissions & Access Control</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "can_add_students" as const, label: "Add Students", desc: "Add new students to classes" },
                { key: "can_edit_students" as const, label: "Edit Students", desc: "Edit student information" },
                { key: "can_manage_classes" as const, label: "Manage Classes", desc: "Create and organize classes" },
                { key: "can_manage_attendance" as const, label: "Manage Attendance", desc: "Take and view attendance" },
                { key: "can_entry_results" as const, label: "Entry Results", desc: "Entry and publish exam results" },
                { key: "can_manage_homework" as const, label: "Manage Homework", desc: "Assign and review homework" },
                { key: "can_manage_payments" as const, label: "Manage Payments", desc: "Approve and track fee payments" },
                { key: "can_send_notices" as const, label: "Send Notices", desc: "Create and broadcast notices" },
                { key: "can_view_reports" as const, label: "View Reports", desc: "Access analytics and reports" },
                { key: "can_use_ai_tools" as const, label: "AI Tools", desc: "Generate papers and notices with AI" },
                { key: "can_manage_settings" as const, label: "School Settings", desc: "Update school configuration" },
              ]).map(perm => (
                <div
                  key={perm.key}
                  className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setForm(p => ({ ...p, [perm.key]: !p[perm.key] }))}
                >
                  <Switch
                    checked={form[perm.key]}
                    onCheckedChange={v => setForm(p => ({ ...p, [perm.key]: v }))}
                    onClick={(e) => e.stopPropagation()}
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
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Attendance Scope — Which Categories Can Be Managed & Printed</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: "attendance_scope_students" as const, label: "Students" },
                    { key: "attendance_scope_teachers" as const, label: "Teachers" },
                    { key: "attendance_scope_staff" as const, label: "Staff" },
                  ]).map(s => (
                    <div
                      key={s.key}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5 cursor-pointer hover:bg-muted/20"
                      onClick={() => setForm(p => ({ ...p, [s.key]: !p[s.key] }))}
                    >
                      <Switch
                        checked={form[s.key]}
                        onCheckedChange={v => setForm(p => ({ ...p, [s.key]: v }))}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wider">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="min-w-[180px]">
            {editTeacher ? "Save Teacher Record" : "Save Teacher Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherFormDialog;
