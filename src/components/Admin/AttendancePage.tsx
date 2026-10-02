import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Printer, Search, ClipboardCheck, Users, GraduationCap, Building2, Save, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useTeacherAssignedClasses } from "@/hooks/useTeacherAssignedClasses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { printWithSchoolHeader } from "@/utils/printUtils";

type AttendanceStatus = "present" | "absent" | "late";
type TabType = "students" | "teachers" | "staff";
type ViewMode = "daily" | "monthly" | "user";

const tabs: { key: TabType; label: string; icon: any }[] = [
  { key: "students", label: "Students", icon: Users },
  { key: "teachers", label: "Teachers", icon: GraduationCap },
  { key: "staff", label: "Staff", icon: Building2 },
];

const years = Array.from({ length: 25 }, (_, i) => 2020 + i);
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const AttendancePage = () => {
  const { schoolId, roles, user, teacherPermissions } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("students");
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [yearFilter, setYearFilter] = useState("2026");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [versionFilter, setVersionFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [takingAttendance, setTakingAttendance] = useState(false);

  // Monthly view state
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth());
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());

  // User view state
  const [selectedUserId, setSelectedUserId] = useState("");

  const isAdmin = roles.some(r => ["master_admin", "school_admin"].includes(r));
  const isTeacher = roles.includes("teacher");
  const isSubAdmin = roles.includes("sub_admin");
  const canManage = isAdmin || isSubAdmin || (isTeacher && teacherPermissions.can_manage_attendance);
  const { assignedClassIds, isRestricted } = useTeacherAssignedClasses();

  // Fetch attendance scope for non-admin users
  const { data: attendanceScope } = useQuery({
    queryKey: ["attendance-scope", user?.id, isTeacher, isSubAdmin],
    queryFn: async () => {
      if (!user?.id || isAdmin) return null;
      if (isTeacher) {
        const { data } = await (supabase as any)
          .from("teachers")
          .select("attendance_scope_students, attendance_scope_teachers, attendance_scope_staff")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        return data;
      }
      if (isSubAdmin) {
        const { data } = await (supabase as any)
          .from("staff")
          .select("attendance_scope_students, attendance_scope_teachers, attendance_scope_staff")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();
        return data;
      }
      return null;
    },
    enabled: !!user?.id && !isAdmin,
  });

  const allowedTabs = useMemo(() => {
    if (isAdmin || !attendanceScope) return tabs;
    return tabs.filter(t => {
      if (t.key === "students") return (attendanceScope as any).attendance_scope_students;
      if (t.key === "teachers") return (attendanceScope as any).attendance_scope_teachers;
      if (t.key === "staff") return (attendanceScope as any).attendance_scope_staff;
      return false;
    });
  }, [isAdmin, attendanceScope]);


  // Ensure active tab is always allowed
  useMemo(() => {
    if (allowedTabs.length > 0 && !allowedTabs.find(t => t.key === activeTab)) {
      setActiveTab(allowedTabs[0].key);
    }
  }, [allowedTabs, activeTab]);


  // Classes
  const { data: classes = [] } = useQuery({
    queryKey: ["classes", schoolId, assignedClassIds],
    queryFn: async () => {
      if (!schoolId) return [];
      let query = supabase.from("classes").select("*").eq("school_id", schoolId);
      if (isRestricted && assignedClassIds && assignedClassIds.length > 0) {
        query = query.in("id", assignedClassIds);
      }
      const { data } = await query.order("numeric_level");
      return (isRestricted && assignedClassIds?.length === 0) ? [] : data || [];
    },
    enabled: !!schoolId,
  });

  // Sections for selected class
  const { data: sections = [] } = useQuery({
    queryKey: ["sections", schoolId, selectedClass],
    queryFn: async () => {
      if (!schoolId || !selectedClass) return [];
      const { data } = await supabase.from("sections").select("*").eq("school_id", schoolId).eq("class_id", selectedClass);
      return data || [];
    },
    enabled: !!schoolId && !!selectedClass,
  });

  // Students
  const { data: students = [] } = useQuery({
    queryKey: ["students-attendance", schoolId, selectedClass, selectedSection],
    queryFn: async () => {
      if (!schoolId || !selectedClass) return [];
      let query = supabase.from("students").select("*, classes(class_name)").eq("school_id", schoolId).eq("class_id", selectedClass).eq("is_active", true).order("roll");
      if (selectedSection) query = query.eq("section_id", selectedSection);
      const { data } = await query;
      return data || [];
    },
    enabled: !!schoolId && !!selectedClass && activeTab === "students",
  });

  // Teachers
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("teachers").select("*").eq("school_id", schoolId).eq("is_active", true).order("teacher_name");
      return data || [];
    },
    enabled: !!schoolId && activeTab === "teachers",
  });

  // Staff
  const { data: staff = [] } = useQuery({
    queryKey: ["staff", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase.from("staff").select("*").eq("school_id", schoolId).eq("is_active", true).order("staff_name");
      return data || [];
    },
    enabled: !!schoolId && activeTab === "staff",
  });

  // Attendance records for daily viewing
  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["attendance-records", schoolId, selectedClass, selectedSection, date, activeTab],
    queryFn: async () => {
      if (!schoolId) return [];
      if (activeTab === "students" && selectedClass) {
        let query = supabase
          .from("attendance")
          .select("*, students(student_name, roll), classes(class_name)")
          .eq("school_id", schoolId)
          .eq("class_id", selectedClass)
          .eq("date", date);
        if (selectedSection) query = query.eq("section_id", selectedSection);
        const { data } = await query;
        return data || [];
      }
      if (activeTab === "teachers") {
        const { data } = await (supabase as any)
          .from("teacher_attendance")
          .select("*, teachers(teacher_name, designation, subject)")
          .eq("school_id", schoolId)
          .eq("date", date);
        return data || [];
      }
      if (activeTab === "staff") {
        const { data } = await (supabase as any)
          .from("staff_attendance")
          .select("*, staff(staff_name, designation)")
          .eq("school_id", schoolId)
          .eq("date", date);
        return data || [];
      }
      return [];
    },
    enabled: !!schoolId && !!date && viewMode === "daily",
  });

  // Monthly attendance data
  const { data: monthlyRecords = [] } = useQuery({
    queryKey: ["monthly-attendance", schoolId, activeTab, selectedClass, selectedSection, monthlyMonth, monthlyYear],
    queryFn: async () => {
      if (!schoolId) return [];
      const startDate = `${monthlyYear}-${String(monthlyMonth + 1).padStart(2, "0")}-01`;
      const daysInMonth = new Date(monthlyYear, monthlyMonth + 1, 0).getDate();
      const endDate = `${monthlyYear}-${String(monthlyMonth + 1).padStart(2, "0")}-${daysInMonth}`;

      if (activeTab === "students" && selectedClass) {
        let query = supabase
          .from("attendance")
          .select("*, students(student_name, roll)")
          .eq("school_id", schoolId)
          .eq("class_id", selectedClass)
          .gte("date", startDate)
          .lte("date", endDate);
        if (selectedSection) query = query.eq("section_id", selectedSection);
        const { data } = await query;
        return data || [];
      }
      if (activeTab === "teachers") {
        const { data } = await (supabase as any)
          .from("teacher_attendance")
          .select("*, teachers(teacher_name)")
          .eq("school_id", schoolId)
          .gte("date", startDate)
          .lte("date", endDate);
        return data || [];
      }
      if (activeTab === "staff") {
        const { data } = await (supabase as any)
          .from("staff_attendance")
          .select("*, staff(staff_name)")
          .eq("school_id", schoolId)
          .gte("date", startDate)
          .lte("date", endDate);
        return data || [];
      }
      return [];
    },
    enabled: !!schoolId && viewMode === "monthly",
  });

  // Per-user attendance data
  const { data: userAttendanceRecords = [] } = useQuery({
    queryKey: ["user-attendance", schoolId, activeTab, selectedUserId, monthlyMonth, monthlyYear],
    queryFn: async () => {
      if (!schoolId || !selectedUserId) return [];
      const startDate = `${monthlyYear}-${String(monthlyMonth + 1).padStart(2, "0")}-01`;
      const daysInMonth = new Date(monthlyYear, monthlyMonth + 1, 0).getDate();
      const endDate = `${monthlyYear}-${String(monthlyMonth + 1).padStart(2, "0")}-${daysInMonth}`;

      if (activeTab === "students") {
        const { data } = await supabase
          .from("attendance")
          .select("*")
          .eq("school_id", schoolId)
          .eq("student_id", selectedUserId)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date");
        return data || [];
      }
      if (activeTab === "teachers") {
        const { data } = await (supabase as any)
          .from("teacher_attendance")
          .select("*")
          .eq("school_id", schoolId)
          .eq("teacher_id", selectedUserId)
          .gte("date", startDate)
          .lte("date", endDate)
          .order("date");
        return data || [];
      }
      const { data } = await (supabase as any)
        .from("staff_attendance")
        .select("*")
        .eq("school_id", schoolId)
        .eq("staff_id", selectedUserId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date");
      return data || [];
    },
    enabled: !!schoolId && !!selectedUserId && viewMode === "user",
  });

  // Selected user full details for printing
  const { data: selectedUserDetails } = useQuery({
    queryKey: ["selected-user-details", schoolId, activeTab, selectedUserId],
    queryFn: async () => {
      if (!schoolId || !selectedUserId) return null;
      if (activeTab === "students") {
        const { data } = await supabase
          .from("students")
          .select("*, classes(class_name), sections(section_name)")
          .eq("id", selectedUserId)
          .maybeSingle();
        return data as any;
      }
      if (activeTab === "teachers") {
        const { data } = await supabase
          .from("teachers")
          .select("*")
          .eq("id", selectedUserId)
          .maybeSingle();
        return data as any;
      }
      const { data } = await supabase
        .from("staff")
        .select("*")
        .eq("id", selectedUserId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!schoolId && !!selectedUserId,
  });

  // Load existing attendance into state
  useQuery({
    queryKey: ["existing-attendance", schoolId, selectedClass, selectedSection, date, activeTab, takingAttendance],
    queryFn: async () => {
      if (!schoolId || !date || !takingAttendance) return [];
      const map: Record<string, AttendanceStatus> = {};
      if (activeTab === "students") {
        if (!selectedClass) return [];
        let query = supabase
          .from("attendance")
          .select("student_id, status")
          .eq("school_id", schoolId)
          .eq("class_id", selectedClass)
          .eq("date", date);
        if (selectedSection) query = query.eq("section_id", selectedSection);
        const { data } = await query;
        data?.forEach((r: any) => { map[r.student_id] = r.status; });
      } else if (activeTab === "teachers") {
        const { data } = await (supabase as any)
          .from("teacher_attendance")
          .select("teacher_id, status")
          .eq("school_id", schoolId)
          .eq("date", date);
        data?.forEach((r: any) => { map[r.teacher_id] = r.status; });
      } else {
        const { data } = await (supabase as any)
          .from("staff_attendance")
          .select("staff_id, status")
          .eq("school_id", schoolId)
          .eq("date", date);
        data?.forEach((r: any) => { map[r.staff_id] = r.status; });
      }
      setAttendance((prev) => ({ ...prev, ...map }));
      return map;
    },
    enabled: !!schoolId && !!date && takingAttendance,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId) throw new Error("No school");
      if (activeTab === "students") {
        const records = students.map((s: any) => ({
          school_id: schoolId, student_id: s.id, class_id: selectedClass,
          section_id: selectedSection || null, date,
          status: (attendance[s.id] || "present") as AttendanceStatus,
        }));
        if (records.length === 0) return;
        const { error } = await supabase.from("attendance").upsert(records, { onConflict: "student_id,date" });
        if (error) throw error;
        return;
      }
      if (activeTab === "teachers") {
        const records = filteredTeachers.map((t: any) => ({
          school_id: schoolId, teacher_id: t.id, date,
          status: (attendance[t.id] || "present") as AttendanceStatus,
        }));
        if (records.length === 0) return;
        const { error } = await (supabase as any).from("teacher_attendance").upsert(records, { onConflict: "teacher_id,date" });
        if (error) throw error;
        return;
      }
      const records = filteredStaff.map((s: any) => ({
        school_id: schoolId, staff_id: s.id, date,
        status: (attendance[s.id] || "present") as AttendanceStatus,
      }));
      if (records.length === 0) return;
      const { error } = await (supabase as any).from("staff_attendance").upsert(records, { onConflict: "staff_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-records"] });
      toast({ title: "Attendance saved successfully" });
      setTakingAttendance(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleStatus = (id: string) => {
    setAttendance(prev => {
      const current = prev[id] || "present";
      const next: AttendanceStatus = current === "present" ? "absent" : current === "absent" ? "late" : "present";
      return { ...prev, [id]: next };
    });
  };

  // Stats
  const stats = useMemo(() => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((r: any) => r.status === "present").length;
    const absent = attendanceRecords.filter((r: any) => r.status === "absent").length;
    const late = attendanceRecords.filter((r: any) => r.status === "late").length;
    return { total, present, absent, late, label: activeTab === "students" ? "Students" : activeTab === "teachers" ? "Teachers" : "Staff" };
  }, [attendanceRecords, activeTab]);

  const filteredClasses = classes.filter((c: any) => {
    if (yearFilter !== "all" && String(c.academic_year) !== yearFilter) return false;
    if (shiftFilter !== "all" && c.shift !== shiftFilter) return false;
    if (versionFilter !== "all" && c.version !== versionFilter) return false;
    return true;
  });

  const filteredTeachers = teachers.filter((t: any) =>
    t.teacher_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStaff = staff.filter((s: any) =>
    s.staff_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Build monthly summary data
  const monthlySummary = useMemo(() => {
    const daysInMonth = new Date(monthlyYear, monthlyMonth + 1, 0).getDate();
    const userMap: Record<string, { name: string; roll?: string; days: Record<number, string> }> = {};

    monthlyRecords.forEach((r: any) => {
      const day = new Date(r.date).getDate();
      let id = "", name = "", roll = "";
      if (activeTab === "students") {
        id = r.student_id; name = r.students?.student_name || "—"; roll = r.students?.roll || "";
      } else if (activeTab === "teachers") {
        id = r.teacher_id; name = r.teachers?.teacher_name || "—";
      } else {
        id = r.staff_id; name = r.staff?.staff_name || "—";
      }
      if (!userMap[id]) userMap[id] = { name, roll, days: {} };
      userMap[id].days[day] = r.status;
    });

    return { daysInMonth, users: Object.entries(userMap).map(([id, data]) => ({ id, ...data })) };
  }, [monthlyRecords, monthlyMonth, monthlyYear, activeTab]);

  // Per-user summary
  const userSummary = useMemo(() => {
    const daysInMonth = new Date(monthlyYear, monthlyMonth + 1, 0).getDate();
    const dayMap: Record<number, string> = {};
    userAttendanceRecords.forEach((r: any) => {
      dayMap[new Date(r.date).getDate()] = r.status;
    });
    const present = Object.values(dayMap).filter(s => s === "present").length;
    const absent = Object.values(dayMap).filter(s => s === "absent").length;
    const late = Object.values(dayMap).filter(s => s === "late").length;
    return { daysInMonth, dayMap, present, absent, late, total: present + absent + late };
  }, [userAttendanceRecords, monthlyMonth, monthlyYear]);

  // Get user list for dropdown
  const userList = useMemo(() => {
    if (activeTab === "students") return students.map((s: any) => ({ id: s.id, name: s.student_name, label: `Roll: ${s.roll || "—"}` }));
    if (activeTab === "teachers") return teachers.map((t: any) => ({ id: t.id, name: t.teacher_name, label: t.designation || "Teacher" }));
    return staff.map((s: any) => ({ id: s.id, name: s.staff_name, label: s.designation || "Staff" }));
  }, [activeTab, students, teachers, staff]);

  const selectedUserName = userList.find(u => u.id === selectedUserId)?.name || "";

  // Print functions
  const handlePrintDaily = async () => {
    if (!schoolId) return;
    const rows = attendanceRecords.map((r: any) => {
      const name = activeTab === "students" ? (r.students?.student_name || "—") : activeTab === "teachers" ? (r.teachers?.teacher_name || "—") : (r.staff?.staff_name || "—");
      const extra = activeTab === "students" ? (r.students?.roll || "—") : activeTab === "teachers" ? (r.teachers?.designation || "—") : (r.staff?.designation || "—");
      const statusBadge = r.status === "present" ? '<span style="color:#16a34a;font-weight:600">Present</span>' : r.status === "absent" ? '<span style="color:#dc2626;font-weight:600">Absent</span>' : '<span style="color:#d97706;font-weight:600">Late</span>';
      return `<tr><td>${name}</td><td>${extra}</td><td style="text-align:center">${statusBadge}</td></tr>`;
    }).join("");

    const content = `
      <div class="count">Total: ${stats.total} | Present: ${stats.present} | Absent: ${stats.absent} | Late: ${stats.late}</div>
      <table><thead><tr><th>Name</th><th>${activeTab === "students" ? "Roll" : "Designation"}</th><th style="text-align:center">Status</th></tr></thead><tbody>${rows}</tbody></table>
    `;
    await printWithSchoolHeader({
      schoolId, title: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Attendance Report`,
      subtitle: `Date: ${new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`,
      content,
    });
  };

  const handlePrintMonthly = async () => {
    if (!schoolId) return;
    const days = monthlySummary.daysInMonth;
    const dayHeaders = Array.from({ length: days }, (_, i) => `<th style="text-align:center;font-size:9px;padding:4px 2px">${i + 1}</th>`).join("");
    const userRows = monthlySummary.users.map(u => {
      const dayCells = Array.from({ length: days }, (_, i) => {
        const s = u.days[i + 1];
        const color = s === "present" ? "#16a34a" : s === "absent" ? "#dc2626" : s === "late" ? "#d97706" : "#e5e7eb";
        const label = s === "present" ? "P" : s === "absent" ? "A" : s === "late" ? "L" : "—";
        return `<td style="text-align:center;font-size:9px;padding:3px 1px;color:${s ? color : '#ccc'};font-weight:${s ? '600' : '400'}">${label}</td>`;
      }).join("");
      const present = Object.values(u.days).filter(s => s === "present").length;
      const absent = Object.values(u.days).filter(s => s === "absent").length;
      return `<tr><td style="font-size:11px;white-space:nowrap">${u.name}${u.roll ? ` (${u.roll})` : ""}</td>${dayCells}<td style="text-align:center;font-size:10px;font-weight:600;color:#16a34a">${present}</td><td style="text-align:center;font-size:10px;font-weight:600;color:#dc2626">${absent}</td></tr>`;
    }).join("");

    const content = `
      <table style="font-size:10px"><thead><tr><th style="text-align:left">Name</th>${dayHeaders}<th style="text-align:center;font-size:9px">P</th><th style="text-align:center;font-size:9px">A</th></tr></thead><tbody>${userRows}</tbody></table>
    `;
    await printWithSchoolHeader({
      schoolId, title: `Monthly Attendance Report — ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`,
      subtitle: `${MONTH_NAMES[monthlyMonth]} ${monthlyYear}`,
      content,
    });
  };

  const handlePrintUserAttendance = async () => {
    if (!schoolId || !selectedUserId) return;
    const days = userSummary.daysInMonth;
    const dayRows = Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      const s = userSummary.dayMap[day];
      const dateStr = `${day} ${MONTH_NAMES[monthlyMonth]} ${monthlyYear}`;
      const statusBadge = s === "present" ? '<span style="color:#16a34a;font-weight:600">Present</span>' : s === "absent" ? '<span style="color:#dc2626;font-weight:600">Absent</span>' : s === "late" ? '<span style="color:#d97706;font-weight:600">Late</span>' : '<span style="color:#ccc">—</span>';
      return `<tr><td>${dateStr}</td><td style="text-align:center">${statusBadge}</td></tr>`;
    }).join("");

    const u = selectedUserDetails || {};
    const photo = activeTab === "students" ? u.photo_url : activeTab === "teachers" ? u.photo_url : u.photo_url;
    const detailRow = (label: string, value: any) =>
      value ? `<tr><td style="padding:4px 10px 4px 0;color:#64748b;font-size:11px;white-space:nowrap"><strong>${label}</strong></td><td style="padding:4px 0;font-size:12px">${value}</td></tr>` : "";

    let detailsRows = "";
    if (activeTab === "students") {
      detailsRows = [
        detailRow("Name", u.student_name),
        detailRow("Roll", u.roll),
        detailRow("Class", u.classes?.class_name),
        detailRow("Section", u.sections?.section_name),
        detailRow("Version", u.version),
        detailRow("Shift", u.shift),
        detailRow("Group", u.group_name),
        detailRow("Session", u.session_year),
        detailRow("Father", u.father_name),
        detailRow("Mother", u.mother_name),
        detailRow("Guardian Phone", u.guardian_phone || u.father_phone || u.mother_phone),
        detailRow("Date of Birth", u.date_of_birth),
        detailRow("Gender", u.gender),
        detailRow("Address", u.present_address || u.address),
      ].join("");
    } else if (activeTab === "teachers") {
      detailsRows = [
        detailRow("Name", u.teacher_name),
        detailRow("Designation", u.designation),
        detailRow("Subject", u.subject),
        detailRow("Index No", u.index_no),
        detailRow("Phone", u.phone),
        detailRow("Email", u.email),
        detailRow("Joining Date", u.joining_date),
        detailRow("Qualification", u.qualification),
        detailRow("Gender", u.gender),
        detailRow("Address", u.address),
      ].join("");
    } else {
      detailsRows = [
        detailRow("Name", u.staff_name),
        detailRow("Designation", u.designation),
        detailRow("Department", u.department),
        detailRow("Phone", u.phone),
        detailRow("Email", u.email),
        detailRow("Joining Date", u.joining_date),
        detailRow("Gender", u.gender),
        detailRow("Address", u.address),
      ].join("");
    }

    const photoBlock = photo
      ? `<img src="${photo}" alt="" style="width:90px;height:110px;object-fit:cover;border:1px solid #e2e8f0;border-radius:6px"/>`
      : `<div style="width:90px;height:110px;border:1px dashed #cbd5e1;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:10px">No Photo</div>`;

    const content = `
      <div style="margin-bottom:16px;padding:14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;display:flex;gap:16px;align-items:flex-start">
        <div>${photoBlock}</div>
        <div style="flex:1">
          <table style="border-collapse:collapse"><tbody>${detailsRows}</tbody></table>
          <p style="font-size:12px;color:#0f172a;margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0">
            <strong>Present:</strong> <span style="color:#16a34a">${userSummary.present}</span> |
            <strong>Absent:</strong> <span style="color:#dc2626">${userSummary.absent}</span> |
            <strong>Late:</strong> <span style="color:#d97706">${userSummary.late}</span> |
            <strong>Total Marked:</strong> ${userSummary.total}
          </p>
        </div>
      </div>
      <table><thead><tr><th>Date</th><th style="text-align:center">Status</th></tr></thead><tbody>${dayRows}</tbody></table>
    `;
    await printWithSchoolHeader({
      schoolId, title: `Individual Attendance Report`,
      subtitle: `${selectedUserName} — ${MONTH_NAMES[monthlyMonth]} ${monthlyYear}`,
      content,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-title uppercase tracking-wide">Attendance Report</h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Monitor {activeTab} Attendance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && viewMode === "daily" && (
            <Button onClick={() => setTakingAttendance(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Take Attendance
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => {
            if (viewMode === "daily") handlePrintDaily();
            else if (viewMode === "monthly") handlePrintMonthly();
            else handlePrintUserAttendance();
          }}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {allowedTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setTakingAttendance(false); setSelectedUserId(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* View Mode Selector */}
      <div className="inline-flex items-center gap-1 bg-muted/30 rounded-lg p-1">
        {([
          { key: "daily" as ViewMode, label: "Daily" },
          { key: "monthly" as ViewMode, label: "Monthly" },
          { key: "user" as ViewMode, label: "Per User" },
        ]).map(v => (
          <button
            key={v.key}
            onClick={() => { setViewMode(v.key); setTakingAttendance(false); }}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
              viewMode === v.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {activeTab === "students" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            {viewMode === "daily" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            )}
            {(viewMode === "monthly" || viewMode === "user") && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</label>
                  <Select value={String(monthlyMonth)} onValueChange={v => setMonthlyMonth(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
                  <Select value={String(monthlyYear)} onValueChange={v => setMonthlyYear(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {viewMode === "daily" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
                <Select value={yearFilter} onValueChange={(v) => { setYearFilter(v); setSelectedClass(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class</label>
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection(""); }}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {filteredClasses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Section</label>
              <Select value={selectedSection || "all"} onValueChange={(v) => setSelectedSection(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {sections.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.section_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {viewMode === "user" && (
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Student</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger><SelectValue placeholder="Choose a student" /></SelectTrigger>
                  <SelectContent>
                    {userList.map(u => <SelectItem key={u.id} value={u.id}>{u.name} — {u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {viewMode === "daily" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shift</label>
                  <Select value={shiftFilter} onValueChange={(v) => { setShiftFilter(v); setSelectedClass(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Version</label>
                  <Select value={versionFilter} onValueChange={(v) => { setVersionFilter(v); setSelectedClass(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="bangla">Bangla</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {viewMode === "daily" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
          {(viewMode === "monthly" || viewMode === "user") && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</label>
                <Select value={String(monthlyMonth)} onValueChange={v => setMonthlyMonth(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
                <Select value={String(monthlyYear)} onValueChange={v => setMonthlyYear(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {viewMode === "user" && (
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select {activeTab === "teachers" ? "Teacher" : "Staff"}</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder={`Choose a ${activeTab === "teachers" ? "teacher" : "staff member"}`} /></SelectTrigger>
                <SelectContent>
                  {userList.map(u => <SelectItem key={u.id} value={u.id}>{u.name} — {u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder={`Search ${activeTab}...`} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Stats - only for daily view */}
      {viewMode === "daily" && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total {stats.label}</p>
            <p className="text-2xl font-bold font-heading">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-success/30 bg-success/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-success mb-1">Present</p>
            <p className="text-2xl font-bold font-heading text-success">{stats.present}</p>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-destructive mb-1">Absent</p>
            <p className="text-2xl font-bold font-heading text-destructive">{stats.absent}</p>
          </div>
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-warning mb-1">Late</p>
            <p className="text-2xl font-bold font-heading text-warning">{stats.late}</p>
          </div>
        </div>
      )}

      {/* Taking Attendance Mode */}
      {takingAttendance && viewMode === "daily" && (activeTab !== "students" || selectedClass) && (() => {
        const items: { id: string; name: string; label: string }[] =
          activeTab === "students" && selectedClass
            ? students.map((s: any) => ({ id: s.id, name: s.student_name, label: `Roll: ${s.roll || "—"}` }))
            : activeTab === "teachers"
            ? filteredTeachers.map((t: any) => ({ id: t.id, name: t.teacher_name, label: t.designation || "Teacher" }))
            : filteredStaff.map((s: any) => ({ id: s.id, name: s.staff_name, label: s.designation || "Staff" }));

        if (items.length === 0) return null;

        const markAllPresent = () => {
          const map: Record<string, AttendanceStatus> = {};
          items.forEach(i => { map[i.id] = "present"; });
          setAttendance(prev => ({ ...prev, ...map }));
        };

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-widest">Mark Attendance</h2>
                <button onClick={markAllPresent} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">
                  Mark All Present
                </button>
              </div>
              <div className="space-y-3">
                {items.map((item) => {
                  const status = attendance[item.id] || "present";
                  const initial = item.name.charAt(0).toUpperCase();
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-background p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                          {initial}
                        </div>
                        <div>
                          <p className="text-sm font-bold uppercase tracking-wide">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(["present", "late", "absent"] as AttendanceStatus[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setAttendance(prev => ({ ...prev, [item.id]: s }))}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border transition-colors ${
                              status === s
                                ? s === "present" ? "bg-success/15 text-success border-success/40"
                                : s === "late" ? "bg-warning/15 text-warning border-warning/40"
                                : "bg-destructive/15 text-destructive border-destructive/40"
                                : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTakingAttendance(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
                <Save className="h-4 w-4" /> {saveMutation.isPending ? "Saving..." : "Save Attendance"}
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Daily Attendance Records Table */}
      {!takingAttendance && viewMode === "daily" && (
        <div className="data-table">
          <div className="overflow-x-auto scrollbar-thin">
            {activeTab === "students" ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Class</th>
                    <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Roll</th>
                    <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Student Name</th>
                    <th className="text-right py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">No attendance records found</p>
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.map((r: any) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground">{r.date}</td>
                        <td className="py-3 px-4 text-muted-foreground">{r.classes?.class_name || "—"}</td>
                        <td className="py-3 px-4 text-muted-foreground">{r.students?.roll || "—"}</td>
                        <td className="py-3 px-4 font-medium">{r.students?.student_name || "—"}</td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="outline" className={`capitalize ${
                            r.status === "present" ? "text-success border-success/30" :
                            r.status === "absent" ? "text-destructive border-destructive/30" :
                            "text-warning border-warning/30"
                          }`}>{r.status}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Designation</th>
                    <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Department</th>
                    <th className="text-right py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">No attendance records found</p>
                      </td>
                    </tr>
                  ) : (
                    attendanceRecords.map((r: any) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground">{r.date}</td>
                        <td className="py-3 px-4 font-medium">
                          {activeTab === "teachers" ? r.teachers?.teacher_name || "—" : r.staff?.staff_name || "—"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {activeTab === "teachers" ? r.teachers?.designation || "Teacher" : r.staff?.designation || "Staff"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {activeTab === "teachers" ? r.teachers?.subject || "—" : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge variant="outline" className={`capitalize ${
                            r.status === "present" ? "text-success border-success/30" :
                            r.status === "absent" ? "text-destructive border-destructive/30" :
                            "text-warning border-warning/30"
                          }`}>{r.status}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Monthly View */}
      {viewMode === "monthly" && (
        <div className="data-table">
          <div className="overflow-x-auto scrollbar-thin">
            {monthlySummary.users.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">No attendance records for this month</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-3 font-medium text-xs uppercase tracking-wider text-muted-foreground sticky left-0 bg-muted/30 z-10">Name</th>
                    {Array.from({ length: monthlySummary.daysInMonth }, (_, i) => (
                      <th key={i} className="text-center py-3 px-1 font-medium text-[10px] uppercase text-muted-foreground min-w-[28px]">{i + 1}</th>
                    ))}
                    <th className="text-center py-3 px-2 font-medium text-[10px] uppercase text-success">P</th>
                    <th className="text-center py-3 px-2 font-medium text-[10px] uppercase text-destructive">A</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.users.map(u => {
                    const present = Object.values(u.days).filter(s => s === "present").length;
                    const absent = Object.values(u.days).filter(s => s === "absent").length;
                    return (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/10">
                        <td className="py-2 px-3 font-medium text-xs whitespace-nowrap sticky left-0 bg-background z-10">
                          {u.name}{u.roll ? ` (${u.roll})` : ""}
                        </td>
                        {Array.from({ length: monthlySummary.daysInMonth }, (_, i) => {
                          const s = u.days[i + 1];
                          return (
                            <td key={i} className="text-center py-2 px-1">
                              {s ? (
                                <span className={`inline-block w-5 h-5 rounded text-[9px] font-bold leading-5 ${
                                  s === "present" ? "bg-success/15 text-success" :
                                  s === "absent" ? "bg-destructive/15 text-destructive" :
                                  "bg-warning/15 text-warning"
                                }`}>
                                  {s === "present" ? "P" : s === "absent" ? "A" : "L"}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/30">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center py-2 px-2 font-bold text-xs text-success">{present}</td>
                        <td className="text-center py-2 px-2 font-bold text-xs text-destructive">{absent}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Per User View */}
      {viewMode === "user" && selectedUserId && (
        <div className="space-y-4">
          {/* User stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Days</p>
              <p className="text-2xl font-bold font-heading">{userSummary.total}</p>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-success mb-1">Present</p>
              <p className="text-2xl font-bold font-heading text-success">{userSummary.present}</p>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-destructive mb-1">Absent</p>
              <p className="text-2xl font-bold font-heading text-destructive">{userSummary.absent}</p>
            </div>
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-warning mb-1">Late</p>
              <p className="text-2xl font-bold font-heading text-warning">{userSummary.late}</p>
            </div>
          </div>

          {/* Day-by-day table */}
          <div className="data-table">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Day</th>
                    <th className="text-left py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: userSummary.daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const s = userSummary.dayMap[day];
                    const dateObj = new Date(monthlyYear, monthlyMonth, day);
                    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                    return (
                      <tr key={day} className="border-b border-border/50 hover:bg-muted/10">
                        <td className="py-2.5 px-4 text-muted-foreground">{dayName}</td>
                        <td className="py-2.5 px-4 font-medium">{day} {MONTH_NAMES[monthlyMonth]} {monthlyYear}</td>
                        <td className="py-2.5 px-4 text-right">
                          {s ? (
                            <Badge variant="outline" className={`capitalize ${
                              s === "present" ? "text-success border-success/30" :
                              s === "absent" ? "text-destructive border-destructive/30" :
                              "text-warning border-warning/30"
                            }`}>{s}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {viewMode === "user" && !selectedUserId && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <User className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Select a {activeTab === "students" ? "student" : activeTab === "teachers" ? "teacher" : "staff member"} to view attendance</p>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
