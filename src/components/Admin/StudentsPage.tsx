import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { printWithSchoolHeader } from "@/utils/printUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Trash2, Users, Eye, Printer, KeyRound, FileSpreadsheet, Unlink } from "lucide-react";
import ExcelImportDialog from "@/components/Common/ExcelImportDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import StudentFormDialog from "@/components/Student/StudentFormDialog";
import { useTeacherAssignedClasses } from "@/hooks/useTeacherAssignedClasses";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { calculateStudentSubjectPackage, isGroupBasedClass } from "@/utils/subjectConfig";

const CLASSES = ["Play", "Nursery", "KG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
const SHIFTS = ["Morning", "Day", "Evening"];
const VERSIONS = ["Bangla", "English"];
const getSectionsForClass = (cls: string): string[] => {
  const upper = ["Class 9", "Class 10", "Class 11", "Class 12"];
  if (upper.includes(cls)) return ["Science", "Business Studies", "Humanities"];
  return ["A", "B", "C"];
};

const getInitials = (name?: string) => {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  return parts.map(p => p[0] || "").join("").toUpperCase().slice(0, 2) || "ST";
};

const StudentsPage = () => {
  const { schoolId, roles, teacherPermissions } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [versionFilter, setVersionFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [viewStudent, setViewStudent] = useState<any>(null);
  const [loginStudent, setLoginStudent] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const importStudents = async (rows: Record<string, string>[]) => {
    if (!schoolId) throw new Error("School not found");
    const errors: string[] = [];
    let inserted = 0;

    const { data: classRows } = await supabase.from("classes").select("*").eq("school_id", schoolId);
    const { data: sectionRows } = await supabase.from("sections").select("*").eq("school_id", schoolId);
    const classes = [...(classRows || [])];
    const sections = [...(sectionRows || [])];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const line = i + 2;
      try {
        if (!r.student_name) throw new Error("Student Name required");
        let class_id: string | null = null;
        let section_id: string | null = null;

        if (r.class_name) {
          const year = Number(r.academic_year) || new Date().getFullYear();
          const shift = (r.shift || "morning").toLowerCase();
          const version = (r.version || "bangla").toLowerCase();
          let cls = classes.find((c: any) =>
            c.class_name.toLowerCase() === r.class_name.toLowerCase() &&
            c.academic_year === year && c.shift === shift && c.version === version);
          if (!cls) {
            const { data: newCls, error } = await supabase.from("classes")
              .insert({ school_id: schoolId, class_name: r.class_name, academic_year: year, shift: shift as any, version: version as any })
              .select("*").single();
            if (error) throw error;
            cls = newCls;
            classes.push(newCls);
          }
          class_id = cls.id;

          if (r.section_name) {
            let sec = sections.find((s: any) => s.class_id === class_id && s.section_name.toLowerCase() === r.section_name.toLowerCase());
            if (!sec) {
              const { data: newSec, error } = await supabase.from("sections")
                .insert({ school_id: schoolId, class_id, section_name: r.section_name })
                .select("*").single();
              if (error) throw error;
              sec = newSec;
              sections.push(newSec);
            }
            section_id = sec.id;
          }
        }

        const optSubject = r.optional_subject || r.fourth_subject || r["4th_subject"] || r["4th subject"] || r["ঐচ্ছিক বিষয়"] || r["৪র্থ বিষয়"] || null;
        const studentRow: any = {
          school_id: schoolId,
          student_name: r.student_name,
          student_id: r.student_id || null,
          roll: r.roll || null,
          class_id,
          section_id,
          optional_subject: optSubject,
          guardian_name: r.guardian_name || null,
          phone: r.phone || null,
          address: r.address || null,
          gender: r.gender || null,
          blood_group: r.blood_group || null,
          date_of_birth: r.date_of_birth || null,
          admission_date: r.admission_date || null,
        };

        let { error } = await supabase.from("students").insert(studentRow);
        if (error && (error.message?.includes("optional_subject") || error.code === "42703")) {
          delete studentRow.optional_subject;
          const retry = await supabase.from("students").insert(studentRow);
          error = retry.error;
        }
        if (error) throw error;
        inserted++;
      } catch (e: any) {
        errors.push(`Row ${line}: ${e.message}`);
      }
    }
    queryClient.invalidateQueries({ queryKey: ["students"] });
    return { inserted, errors };
  };

  const isAdmin = roles.some(r => ["master_admin", "school_admin", "sub_admin"].includes(r));
  const isTeacher = roles.includes("teacher" as any);
  const canAdd = isAdmin || (isTeacher && teacherPermissions.can_add_students);
  const canEdit = isAdmin || (isTeacher && teacherPermissions.can_edit_students);
  const { assignedClassIds, isRestricted } = useTeacherAssignedClasses();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students", schoolId, assignedClassIds],
    queryFn: async () => {
      if (!schoolId) return [];
      if (isRestricted && assignedClassIds?.length === 0) return [];
      let query = supabase
        .from("students")
        .select("*, classes(class_name, academic_year, shift, version), sections(section_name)")
        .eq("school_id", schoolId);
      if (isRestricted && assignedClassIds && assignedClassIds.length > 0) {
        query = query.in("class_id", assignedClassIds);
      }
      const { data, error } = await query.order("student_name");
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  // Query subject setups and keep them synchronized live in real-time
  const { data: subjectSetups = [] } = useQuery({
    queryKey: ["subject-setups", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("subject_setups").select("*").eq("school_id", schoolId);
      return data || [];
    },
    enabled: !!schoolId,
  });

  useRealtimeSync("subject_setups", [["subject-setups"], ["subject-setups", schoolId]]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Session not found. Please login again.");

      const student = students.find((s: any) => s.id === id);
      let targetUserId = student?.user_id || null;

      // If user_id wasn't set directly, search in profiles
      if (!targetUserId && student) {
        const prefix = student.student_id;
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_id")
          .or(`email.ilike.${prefix}@%,email.ilike.${student.phone}@%`)
          .maybeSingle();
        if (prof?.user_id) targetUserId = prof.user_id;
      }

      // 1. Immediately revoke roles and profile so user cannot authenticate
      if (targetUserId) {
        await supabase.from("user_roles").delete().eq("user_id", targetUserId);
        await supabase.from("profiles").delete().eq("user_id", targetUserId);
      }

      // 2. Remove all related dependent records to prevent foreign key errors
      await supabase.from("marks").delete().eq("student_id", id);
      await supabase.from("attendance").delete().eq("student_id", id);
      await supabase.from("payments").delete().eq("student_id", id);
      await supabase.from("homework_submissions").delete().eq("student_id", id);
      await supabase.from("results").delete().eq("student_id", id);

      // 3. Delete student record (or deactivate if constrained)
      const { error: delStudentErr } = await supabase.from("students").delete().eq("id", id);
      if (delStudentErr) {
        console.warn("Direct student deletion had error, setting inactive:", delStudentErr.message);
        await supabase.from("students").update({ is_active: false, user_id: null }).eq("id", id);
      }

      // 4. Invoke edge function to delete auth user from Supabase auth
      try {
        const { data, error } = await supabase.functions.invoke("delete-user", {
          headers: { Authorization: `Bearer ${accessToken}` },
          body: { user_id: targetUserId, type: "student", record_id: id },
        });
        if (error) console.warn("delete-user edge function error:", error.message);
        if (data?.error) console.warn("delete-user edge function data error:", data.error);
      } catch (err: any) {
        console.warn("delete-user edge function call warning:", err.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Student deleted" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createLoginMutation = useMutation({
    mutationFn: async () => {
      if (!loginStudent || !schoolId) throw new Error("Missing student or school information");
      const email = loginEmail.trim().toLowerCase();
      if (!email || !loginPassword) throw new Error("Please provide email and password");
      if (loginPassword.length < 6) throw new Error("Password must be at least 6 characters");

      // Validate email format and reject single-letter / fake domains like @h.com
      const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email) || email.endsWith("@h.com") || email.endsWith("@test.com")) {
        throw new Error(
          `Email "${email}" has an invalid domain. Supabase Authentication requires a standard, valid domain such as name@gmail.com, name@yahoo.com, or name@school.edu. Single-letter or test domains like "@h.com" are rejected by the authentication server.`
        );
      }

      // If student already has a user_id and we are updating / changing login, unlink previous link first
      if (loginStudent.user_id) {
        await supabase
          .from("students")
          .update({ user_id: null })
          .eq("id", loginStudent.id);
      }

      // 1. Check if user already exists in profiles (already signed up or created previously)
      const { data: existingProf } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("email", email)
        .maybeSingle();

      if (existingProf?.user_id) {
        // Check if already linked to another student
        const { data: otherStudent } = await supabase
          .from("students")
          .select("id, student_name")
          .eq("user_id", existingProf.user_id)
          .neq("id", loginStudent.id)
          .maybeSingle();

        if (otherStudent) {
          throw new Error(`This email (${email}) is already linked to another student: "${otherStudent.student_name}".`);
        }

        // Link student directly
        const { error: updateStudentErr } = await supabase
          .from("students")
          .update({ user_id: existingProf.user_id })
          .eq("id", loginStudent.id);
        if (updateStudentErr) throw updateStudentErr;

        await supabase
          .from("profiles")
          .update({ school_id: schoolId, full_name: loginStudent.student_name })
          .eq("user_id", existingProf.user_id);

        await supabase
          .from("user_roles")
          .upsert(
            { user_id: existingProf.user_id, role: "student", school_id: schoolId },
            { onConflict: "user_id,role" }
          );

        return;
      }

      // 2. Invoke Edge Function create-school-member
      const { data: fnData, error: fnErr } = await supabase.functions.invoke("create-school-member", {
        body: {
          email,
          password: loginPassword,
          full_name: loginStudent.student_name,
          school_id: schoolId,
          role: "student",
          record_id: loginStudent.id,
          table_name: "students",
        },
      });

      if (fnErr) {
        const errContext = (fnErr as any)?.context?.json ? await (fnErr as any).context.json().catch(() => null) : null;
        const msg = errContext?.error || fnErr.message || "";
        if (msg.includes("invalid") || msg.includes("is invalid")) {
          throw new Error(`Email address "${email}" is invalid. Please use a valid email domain (e.g. name@gmail.com, not @h.com).`);
        }
        if (msg) {
          throw new Error(msg);
        }
      }

      if (fnData?.error) {
        const msg = fnData.error;
        if (msg.includes("invalid") || msg.includes("is invalid")) {
          throw new Error(`Email address "${email}" is invalid. Please use a valid email domain (e.g. name@gmail.com, not @h.com).`);
        }
        throw new Error(msg);
      }

      if (fnData?.success || fnData?.user_id) {
        return;
      }

      // 3. Fallback: create standalone client to sign up user without altering admin session
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || "";
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "";
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase credentials missing.");
      }

      const tempClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
        email,
        password: loginPassword,
        options: { data: { full_name: loginStudent.student_name } },
      });

      if (signUpErr) {
        const msg = signUpErr.message.toLowerCase();
        if (msg.includes("rate limit")) {
          throw new Error("Supabase signup email rate limit reached. Please wait a few minutes, or use a student email that has already signed up.");
        }
        if (msg.includes("invalid")) {
          throw new Error(`Email address "${email}" is invalid. Please use a standard domain like @gmail.com.`);
        }
        throw new Error(signUpErr.message);
      }

      if (signUpData.user?.id) {
        const newUserId = signUpData.user.id;
        const { error: studentUpdateErr } = await supabase
          .from("students")
          .update({ user_id: newUserId })
          .eq("id", loginStudent.id);
        if (studentUpdateErr) throw studentUpdateErr;

        await supabase
          .from("profiles")
          .update({ school_id: schoolId, full_name: loginStudent.student_name })
          .eq("user_id", newUserId);

        await supabase
          .from("user_roles")
          .upsert(
            { user_id: newUserId, role: "student", school_id: schoolId },
            { onConflict: "user_id,role" }
          );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Login saved successfully!", description: "Student can now log in using this email and password." });
      setLoginStudent(null);
      setLoginEmail("");
      setLoginPassword("");
    },
    onError: (e: any) => toast({ title: "Error setting credentials", description: e.message, variant: "destructive" }),
  });

  const unlinkLoginMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from("students")
        .update({ user_id: null })
        .eq("id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Login Unlinked", description: "The student profile has been unlinked. You can now create or link a new login." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sectionOptions = classFilter !== "all" ? getSectionsForClass(classFilter) : [];

  const filtered = students.filter((s: any) => {
    const matchSearch = s.student_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.roll || "").toLowerCase().includes(search.toLowerCase());
    const matchClass = classFilter === "all" || s.classes?.class_name === classFilter;
    const matchYear = yearFilter === "all" || String(s.classes?.academic_year) === yearFilter;
    const matchShift = shiftFilter === "all" || s.classes?.shift === shiftFilter.toLowerCase();
    const matchVersion = versionFilter === "all" || s.classes?.version === versionFilter.toLowerCase();
    const matchSection = sectionFilter === "all" || s.sections?.section_name === sectionFilter;
    return matchSearch && matchClass && matchYear && matchShift && matchVersion && matchSection;
  });

  const handlePrint = () => {
    if (!schoolId) return;
    const filterInfo = [
      classFilter !== "all" ? `Class: ${classFilter}` : "",
      sectionFilter !== "all" ? `Section: ${sectionFilter}` : "",
      yearFilter !== "all" ? `Year: ${yearFilter}` : "",
      shiftFilter !== "all" ? `Shift: ${shiftFilter}` : "",
      versionFilter !== "all" ? `Version: ${versionFilter}` : "",
    ].filter(Boolean).join(" | ") || "All Students";

    const tableContent = `
      <p class="count">Total: ${filtered.length} students</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Student Name</th>
            <th>Class</th>
            <th>Section</th>
            <th>4th Subject</th>
            <th>Roll</th>
            <th>Guardian</th>
            <th>Phone</th>
            <th>Gender</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((s: any, i: number) => `
            <tr>
              <td>${i + 1}</td>
              <td>${s.student_name}</td>
              <td>${s.classes?.class_name || "—"}</td>
              <td>${s.sections?.section_name || "—"}</td>
              <td>${s.optional_subject || "—"}</td>
              <td>${s.roll || "—"}</td>
              <td>${s.guardian_name || "—"}</td>
              <td>${s.phone || "—"}</td>
              <td>${s.gender || "—"}</td>
              <td><span class="badge ${s.is_active ? "active" : "inactive"}">${s.is_active ? "Active" : "Inactive"}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    printWithSchoolHeader({
      schoolId,
      title: "Student List",
      subtitle: filterInfo,
      content: tableContent,
    });
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-description">Manage student records, enrollment and profiles.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print
          </Button>
          {canAdd && (
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Excel Import
            </Button>
          )}
          {canAdd && (
            <Button onClick={() => { setEditStudent(null); setDialogOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add Student
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); }}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {Array.from({ length: 25 }, (_, i) => 2026 + i).map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setSectionFilter("all"); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {CLASSES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={shiftFilter} onValueChange={(v) => { setShiftFilter(v); }}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Shift" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shifts</SelectItem>
            {SHIFTS.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Section" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {sectionOptions.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={versionFilter} onValueChange={(v) => { setVersionFilter(v); }}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Version" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Versions</SelectItem>
            {VERSIONS.map(v => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="stat-card flex items-center justify-center min-h-[200px]">
          <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card flex flex-col items-center justify-center min-h-[200px] gap-2">
          <Users className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No students found.</p>
        </div>
      ) : (
        <div className="data-table">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Class</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Section</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Roll</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Guardian</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Phone</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {s.photo && (
                            <AvatarImage src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/student-photos/${s.photo}`} />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(s.student_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{s.student_name}</p>
                          {s.gender && <p className="text-xs text-muted-foreground">{s.gender}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-muted-foreground">{s.classes?.class_name || "—"}</td>
                    <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">
                      <div className="flex flex-col gap-1 items-start">
                        <span>{s.sections?.section_name || "—"}</span>
                        {s.optional_subject && (
                          <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300/80 px-1.5 py-0">
                            4th: {s.optional_subject}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{s.roll || "—"}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{s.guardian_name || "—"}</td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{s.phone || "—"}</td>
                    <td className="py-3 px-4">
                      <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewStudent(s)} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && !s.user_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            title="Set Login Credentials (Key)"
                            onClick={() => {
                              setLoginStudent(s);
                              setLoginEmail(s.email || "");
                              setLoginPassword("");
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && s.user_id && (
                          <div className="flex items-center gap-0.5">
                            <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:text-emerald-300 px-1.5">
                              Login ✓
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700"
                              title="Update Login / Reset Password"
                              onClick={() => {
                                setLoginStudent(s);
                                setLoginEmail(s.email || "");
                                setLoginPassword("");
                              }}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-600 hover:text-amber-700"
                              title="Unlink Login"
                              onClick={() => unlinkLoginMutation.mutate(s.id)}
                            >
                              <Unlink className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {canEdit && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditStudent(s); setDialogOpen(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(s.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Detail View Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={(open) => { if (!open) setViewStudent(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {viewStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {viewStudent.photo && (
                    <AvatarImage src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/student-photos/${viewStudent.photo}`} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                    {getInitials(viewStudent.student_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{viewStudent.student_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewStudent.classes?.class_name || "—"} | {viewStudent.sections?.section_name || "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Student ID</p>
                  <p className="font-medium">{viewStudent.student_id || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Roll</p>
                  <p className="font-medium">{viewStudent.roll || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Gender</p>
                  <p className="font-medium">{viewStudent.gender || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Blood Group</p>
                  <p className="font-medium">{viewStudent.blood_group || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Date of Birth</p>
                  <p className="font-medium">{viewStudent.date_of_birth || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Admission Date</p>
                  <p className="font-medium">{viewStudent.admission_date || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Guardian</p>
                  <p className="font-medium">{viewStudent.guardian_name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Phone</p>
                  <p className="font-medium">{viewStudent.phone || "—"}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Address</p>
                  <p className="font-medium">{viewStudent.address || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Shift</p>
                  <p className="font-medium capitalize">{viewStudent.classes?.shift || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Version</p>
                  <p className="font-medium capitalize">{viewStudent.classes?.version || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">4th / Optional Subject</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {viewStudent.optional_subject ? viewStudent.optional_subject : "None"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Status</p>
                  <Badge variant={viewStudent.is_active ? "default" : "secondary"} className="text-xs">
                    {viewStudent.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {isGroupBasedClass(viewStudent.classes?.class_name) && (
                  <div className="col-span-2 mt-2 p-3 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                    {(() => {
                      const pkg = calculateStudentSubjectPackage(
                        viewStudent.classes?.class_name,
                        viewStudent.sections?.section_name,
                        viewStudent.optional_subject,
                        subjectSetups,
                        true
                      );
                      if (pkg.totalCount === 0) {
                        return (
                          <div className="text-xs text-amber-700 dark:text-amber-300 py-1">
                            ⚠️ No subjects configured for this class in Subject Setup yet.
                          </div>
                        );
                      }
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                              Subject Package Breakdown
                            </span>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                              Total Subjects = {pkg.totalCount}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <strong>Formula:</strong> Combined ({pkg.combinedSubjects.length}) + Group Core ({pkg.groupCoreSubjects.length}) + 4th Subject ({pkg.fourthSubject ? 1 : 0}) = <strong>{pkg.totalCount} Subjects</strong>
                          </p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {pkg.totalSubjects.map((s) => (
                              <span
                                key={s}
                                className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                                  s === pkg.fourthSubject
                                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-400 font-bold"
                                    : "bg-muted text-foreground"
                                }`}
                              >
                                {s} {s === pkg.fourthSubject && "⭐"}
                              </span>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StudentFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditStudent(null); }}
        editStudent={editStudent}
      />

      <Dialog open={!!loginStudent} onOpenChange={(open) => { if (!open) { setLoginStudent(null); setLoginEmail(""); setLoginPassword(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {loginStudent?.user_id ? "Update Student Login / Reset Password" : "Create Student Login"}
            </DialogTitle>
          </DialogHeader>
          {loginStudent && (
            <div className="space-y-4">
              <div className="text-sm p-3 rounded-lg bg-muted/60 border space-y-1">
                <div className="font-semibold text-foreground flex items-center justify-between">
                  <span>{loginStudent.student_name}</span>
                  {loginStudent.user_id ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-300">Currently Linked</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">No Login Linked</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {loginStudent.classes?.class_name && <>Class: {loginStudent.classes.class_name}</>}
                  {loginStudent.sections?.section_name && <> ({loginStudent.sections.section_name})</>}
                  {loginStudent.roll && <> • Roll: {loginStudent.roll}</>}
                  {loginStudent.student_id && <> • ID: {loginStudent.student_id}</>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  autoComplete="off"
                  placeholder="e.g. student@gmail.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  💡 <strong>Important:</strong> Please provide a valid email domain (e.g. <code className="text-primary font-mono">@gmail.com</code>, <code className="text-primary font-mono">@yahoo.com</code>). Incomplete or test domains like <code className="text-destructive font-mono">@h.com</code> are blocked by authentication servers.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="text"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                {loginStudent.user_id ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    onClick={() => {
                      unlinkLoginMutation.mutate(loginStudent.id);
                      setLoginStudent(null);
                    }}
                  >
                    <Unlink className="h-3.5 w-3.5 mr-1" /> Unlink Account
                  </Button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => { setLoginStudent(null); setLoginEmail(""); setLoginPassword(""); }}>Cancel</Button>
                  <Button onClick={() => createLoginMutation.mutate()} disabled={createLoginMutation.isPending}>
                    {createLoginMutation.isPending ? "Saving..." : loginStudent.user_id ? "Update Login" : "Create Login"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>



      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student?</AlertDialogTitle>
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
        title="Import Students from Excel"
        templateName="students"
        columns={[
          { key: "student_name", label: "Student Name", required: true, example: "Rahim Uddin" },
          { key: "student_id", label: "Student ID", example: "S-1001" },
          { key: "roll", label: "Roll", example: "1" },
          { key: "class_name", label: "Class", example: "Class 1" },
          { key: "section_name", label: "Section", example: "A" },
          { key: "shift", label: "Shift", example: "Morning" },
          { key: "version", label: "Version", example: "Bangla" },
          { key: "academic_year", label: "Academic Year", example: "2026" },
          { key: "guardian_name", label: "Guardian Name", example: "Karim Uddin" },
          { key: "phone", label: "Phone", example: "01700000000" },
          { key: "gender", label: "Gender", example: "Male" },
          { key: "blood_group", label: "Blood Group", example: "B+" },
          { key: "date_of_birth", label: "Date of Birth", example: "2015-01-20" },
          { key: "admission_date", label: "Admission Date", example: "2026-01-01" },
          { key: "address", label: "Address", example: "Dhaka" },
        ]}
        onImport={importStudents}
      />
    </div>
  );
};

export default StudentsPage;
