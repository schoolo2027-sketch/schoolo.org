import { useState } from "react";
import { printWithSchoolHeader } from "@/utils/printUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, GraduationCap, Printer, FileSpreadsheet } from "lucide-react";
import ExcelImportDialog from "@/components/Common/ExcelImportDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TeacherFormDialog from "@/components/Teacher/TeacherFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TeachersPage = () => {
  const { schoolId, roles } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTeacher, setEditTeacher] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);

  const importTeachers = async (rows: Record<string, string>[]) => {
    if (!schoolId) throw new Error("School not found");
    const errors: string[] = [];
    let inserted = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.teacher_name) throw new Error("Teacher Name required");
        const { error } = await supabase.from("teachers").insert({
          school_id: schoolId,
          teacher_name: r.teacher_name,
          designation: r.designation || null,
          subject: r.subject || null,
          phone: r.phone || null,
          email: r.email ? r.email.trim().toLowerCase() : null,
          address: r.address || null,
          blood_group: r.blood_group || null,
          teacher_id_number: r.teacher_id_number || null,
          joining_date: r.joining_date || null,
        });
        if (error) throw error;
        inserted++;
      } catch (e: any) {
        errors.push(`Row ${i + 2}: ${e.message}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["teachers"] });
    return { inserted, errors };
  };

  const canManage = roles.some(r => ["master_admin", "school_admin"].includes(r));

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["teachers", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase.from("teachers").select("*").eq("school_id", schoolId).order("teacher_name");
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Session not found. Please login again.");

      const teacher = teachers.find((t: any) => t.id === id);
      let targetUserId = teacher?.user_id || null;

      if (!targetUserId && teacher?.email) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id")
          .ilike("email", teacher.email)
          .maybeSingle();
        if (prof?.user_id) targetUserId = prof.user_id;
      }

      // 1. Revoke roles and profile
      if (targetUserId) {
        await supabase.from("user_roles").delete().eq("user_id", targetUserId);
        await supabase.from("profiles").delete().eq("user_id", targetUserId);
      }

      // 2. Remove assignments and attendance
      await supabase.from("teacher_assignments").delete().eq("teacher_id", id);
      await supabase.from("teacher_attendance").delete().eq("teacher_id", id);

      // 3. Delete teacher record
      const { error: delTeacherErr } = await supabase.from("teachers").delete().eq("id", id);
      if (delTeacherErr) {
        await supabase.from("teachers").update({ is_active: false, user_id: null }).eq("id", id);
      }

      // 4. Edge function deletion
      try {
        const { data, error } = await supabase.functions.invoke("delete-user", {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: { user_id: targetUserId, type: "teacher", record_id: id },
        });
        if (error) console.warn("delete-user error:", error.message);
        if (data?.error) console.warn("delete-user data error:", data.error);
      } catch (err: any) {
        console.warn("delete-user call warning:", err.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({ title: "Teacher deleted" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = teachers.filter((t: any) =>
    t.teacher_name.toLowerCase().includes(search.toLowerCase()) ||
    (t.subject || "").toLowerCase().includes(search.toLowerCase())
  );

  const handlePrint = () => {
    if (!schoolId) return;

    const tableContent = `
      <p class="count">Total: ${filtered.length} teachers</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Designation</th>
            <th>Subject</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Joining Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((t: any, i: number) => `
            <tr>
              <td>${i + 1}</td>
              <td>${t.teacher_name}</td>
              <td>${t.designation || "—"}</td>
              <td>${t.subject || "—"}</td>
              <td>${t.phone || "—"}</td>
              <td>${t.email || "—"}</td>
              <td>${t.joining_date || "—"}</td>
              <td><span class="badge ${t.is_active ? "active" : "inactive"}">${t.is_active ? "Active" : "Inactive"}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    printWithSchoolHeader({
      schoolId,
      title: "Teacher List",
      content: tableContent,
    });
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="page-description">Manage teacher profiles and assignments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          {canManage && (
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Excel Import
            </Button>
          )}
          {canManage && (
            <Button onClick={() => { setEditTeacher(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add Teacher
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search teachers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="stat-card flex items-center justify-center min-h-[200px]">
          <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card flex flex-col items-center justify-center min-h-[200px] gap-2">
          <GraduationCap className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No teachers found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t: any) => (
            <div key={t.id} className="stat-card flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {t.photo && (
                    <AvatarImage src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/teacher-photos/${t.photo}`} />
                  )}
                  <AvatarFallback className="bg-success/10 text-success font-bold">
                    {(t.teacher_name || "").trim().split(/\s+/).filter(Boolean).map((n: string) => n[0] || "").join("").toUpperCase().slice(0, 2) || "T"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold font-heading truncate">{t.teacher_name}</h3>
                  <p className="text-sm text-muted-foreground">{t.designation || "Teacher"}</p>
                </div>
                <Badge variant={t.is_active ? "default" : "secondary"} className="text-xs shrink-0">
                  {t.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                {t.subject && <p>📚 {t.subject}</p>}
                {t.phone && <p>📞 {t.phone}</p>}
                {t.email && <p>✉️ {t.email}</p>}
              </div>

              {canManage && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => { setEditTeacher(t); setDialogOpen(true); }}>
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TeacherFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditTeacher(null); }}
        editTeacher={editTeacher}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Teachers from Excel"
        templateName="teachers"
        columns={[
          { key: "teacher_name", label: "Teacher Name", required: true, example: "Md. Salim" },
          { key: "designation", label: "Designation", example: "Assistant Teacher" },
          { key: "subject", label: "Subject", example: "Mathematics" },
          { key: "phone", label: "Phone", example: "01700000000" },
          { key: "email", label: "Email", example: "salim@school.com" },
          { key: "teacher_id_number", label: "Teacher ID", example: "T-101" },
          { key: "blood_group", label: "Blood Group", example: "O+" },
          { key: "joining_date", label: "Joining Date", example: "2026-01-01" },
          { key: "address", label: "Address", example: "Dhaka" },
        ]}
        onImport={importTeachers}
      />
    </div>
  );
};

export default TeachersPage;
