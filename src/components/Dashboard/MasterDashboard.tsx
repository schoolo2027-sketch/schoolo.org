import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Users, GraduationCap, CreditCard, ClipboardCheck, School, Building2, UserCheck,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatCard from "@/components/Dashboard/StatCard";
import AttendanceChart from "@/components/Dashboard/AttendanceChart";
import QuickActions from "@/components/Dashboard/QuickActions";
import RecentStudentsTable from "@/components/Dashboard/RecentStudentsTable";
import RecentNotices from "@/components/Dashboard/RecentNotices";
import StudentDashboard from "@/components/Dashboard/StudentDashboard";
import TeacherDashboard from "@/components/Dashboard/TeacherDashboard";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const DashboardHome = () => {
  const { schoolId: userSchoolId, roles, profile } = useAuth();
  const { t } = useLanguage();
  const isStudent = roles.includes("student");
  const isTeacher = roles.includes("teacher") && !roles.includes("school_admin") && !roles.includes("master_admin");
  const isMasterAdmin = roles.includes("master_admin");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [feeFilter, setFeeFilter] = useState<string>("all"); // "all", "monthly", "yearly", or specific month like "2026-01"
  const [feeYear, setFeeYear] = useState<string>(String(new Date().getFullYear()));
  const [feeMonth, setFeeMonth] = useState<string>(String(new Date().getMonth()));

  const effectiveSchoolId = isMasterAdmin
    ? (selectedSchoolId === "all" ? null : selectedSchoolId)
    : userSchoolId;

  const { data: schools = [] } = useQuery({
    queryKey: ["dash-schools-list"],
    queryFn: async () => {
      const { data } = await supabase.from("schools").select("id, school_name").is("deleted_at", null).order("school_name");
      return data || [];
    },
    enabled: isMasterAdmin && !isStudent,
  });

  const { data: schoolCount = 0 } = useQuery({
    queryKey: ["dash-schools-count"],
    queryFn: async () => {
      const { count } = await supabase.from("schools").select("id", { count: "exact", head: true }).is("deleted_at", null);
      return count || 0;
    },
    enabled: isMasterAdmin && !isStudent,
  });

  const { data: activeSchoolCount = 0 } = useQuery({
    queryKey: ["dash-active-schools"],
    queryFn: async () => {
      const { count } = await supabase.from("schools").select("id", { count: "exact", head: true }).eq("is_active", true).is("deleted_at", null);
      return count || 0;
    },
    enabled: isMasterAdmin && !isStudent,
  });

  const { data: suspendedSchoolCount = 0 } = useQuery({
    queryKey: ["dash-suspended-schools"],
    queryFn: async () => {
      const { count } = await supabase.from("schools").select("id", { count: "exact", head: true }).eq("is_active", false).is("deleted_at", null);
      return count || 0;
    },
    enabled: isMasterAdmin && !isStudent,
  });

  const { data: studentCount = 0 } = useQuery({
    queryKey: ["dash-students", effectiveSchoolId],
    queryFn: async () => {
      let query = supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true);
      if (effectiveSchoolId) query = query.eq("school_id", effectiveSchoolId);
      const { count } = await query;
      return count || 0;
    },
    enabled: (isMasterAdmin || !!userSchoolId) && !isStudent,
  });

  const { data: teacherCount = 0 } = useQuery({
    queryKey: ["dash-teachers", effectiveSchoolId],
    queryFn: async () => {
      let query = supabase.from("teachers").select("id", { count: "exact", head: true }).eq("is_active", true);
      if (effectiveSchoolId) query = query.eq("school_id", effectiveSchoolId);
      const { count } = await query;
      return count || 0;
    },
    enabled: (isMasterAdmin || !!userSchoolId) && !isStudent,
  });

  const { data: staffCount = 0 } = useQuery({
    queryKey: ["dash-staff", effectiveSchoolId],
    queryFn: async () => {
      let query = supabase.from("staff").select("id", { count: "exact", head: true }).eq("is_active", true);
      if (effectiveSchoolId) query = query.eq("school_id", effectiveSchoolId);
      const { count } = await query;
      return count || 0;
    },
    enabled: (isMasterAdmin || !!userSchoolId) && !isStudent,
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ["dash-attendance", effectiveSchoolId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      let query = supabase.from("attendance").select("status").eq("date", today);
      if (effectiveSchoolId) query = query.eq("school_id", effectiveSchoolId);
      const { data } = await query;
      const total = data?.length || 0;
      const present = data?.filter((a: any) => a.status === "present").length || 0;
      const rate = total > 0 ? `${((present / total) * 100).toFixed(1)}%` : "N/A";
      return { rate, total };
    },
    enabled: (isMasterAdmin || !!userSchoolId) && !isStudent,
  });

  // Fee data with filters (for school admin)
  const { data: feeData } = useQuery({
    queryKey: ["dash-fees-detailed", effectiveSchoolId, feeFilter, feeYear, feeMonth],
    queryFn: async () => {
      if (!effectiveSchoolId) return { totalFee: 0, collected: 0, due: 0 };
      // Get total fees (from fees table)
      const { data: feesData } = await supabase.from("fees").select("amount").eq("school_id", effectiveSchoolId);
      const totalFee = feesData?.reduce((s: number, f: any) => s + Number(f.amount), 0) || 0;

      // Get collected (verified payments)
      let collectedQuery = supabase.from("payments").select("amount, date").eq("status", "verified").eq("school_id", effectiveSchoolId);

      // Apply time filter
      if (feeFilter === "monthly") {
        const startDate = `${feeYear}-${String(Number(feeMonth) + 1).padStart(2, "0")}-01`;
        const endMonth = Number(feeMonth) + 2;
        const endYear = endMonth > 12 ? Number(feeYear) + 1 : Number(feeYear);
        const endDate = `${endYear}-${String(endMonth > 12 ? endMonth - 12 : endMonth).padStart(2, "0")}-01`;
        collectedQuery = collectedQuery.gte("date", startDate).lt("date", endDate);
      } else if (feeFilter === "yearly") {
        collectedQuery = collectedQuery.gte("date", `${feeYear}-01-01`).lt("date", `${Number(feeYear) + 1}-01-01`);
      }

      const { data: paymentsData } = await collectedQuery;
      const collected = paymentsData?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
      const due = Math.max(0, totalFee - collected);

      return { totalFee, collected, due };
    },
    enabled: !isMasterAdmin && !!effectiveSchoolId && !isStudent,
  });

  // If student role, show student dashboard
  if (isStudent) return <StudentDashboard />;
  if (isTeacher) return <TeacherDashboard />;

  const isAdmin = roles.includes("school_admin") || roles.includes("sub_admin");
  if (!isMasterAdmin && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <h2 className="text-xl font-semibold">Account Inactive or Deleted</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Your account is not active or does not have access to this portal. Please contact your administrator.
        </p>
      </div>
    );
  }

  const greeting = profile?.full_name
    ? t("dashboard.welcomeBack").replace("{name}", profile.full_name)
    : t("dashboard.welcomeGeneric");

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">{t("dashboard.title")}</h1>
          <p className="page-description">{greeting} {t("dashboard.overview")}</p>
        </div>
        {isMasterAdmin && (
          <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
            <SelectTrigger className="w-[260px]">
              <School className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder={t("dashboard.selectSchool")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("dashboard.allSchools")}</SelectItem>
              {schools.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.school_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isMasterAdmin && selectedSchoolId === "all" && (
          <>
            <StatCard title={t("dashboard.totalSchools")} value={schoolCount} icon={School} color="warning" />
            <StatCard title="Active Schools" value={activeSchoolCount} icon={Building2} color="success" />
            <StatCard title="Suspended Schools" value={suspendedSchoolCount} icon={Building2} color="accent" />
          </>
        )}
        <StatCard title={t("dashboard.totalStudents")} value={studentCount.toLocaleString()} icon={Users} color="primary" />
        <StatCard title={t("dashboard.totalTeachers")} value={teacherCount} icon={GraduationCap} color="success" />
        <StatCard title="Total Staff" value={staffCount} icon={UserCheck} color="info" />
        <StatCard title={t("dashboard.attendanceToday")} value={todayAttendance?.rate || "N/A"} icon={ClipboardCheck} color="info" />
      </div>

      {/* Fee Dashboard - for school admins */}
      {!isMasterAdmin && (
        <div className="stat-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-semibold font-heading text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Fee Overview
            </h2>
            <div className="flex gap-2 flex-wrap">
              <Select value={feeFilter} onValueChange={setFeeFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              {(feeFilter === "monthly" || feeFilter === "yearly") && (
                <Select value={feeYear} onValueChange={setFeeYear}>
                  <SelectTrigger className="w-[100px] h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2026, 2027, 2028, 2029, 2030].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {feeFilter === "monthly" && (
                <Select value={feeMonth} onValueChange={setFeeMonth}>
                  <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border p-4 text-center">
              <div className="text-2xl font-bold text-foreground">৳{(feeData?.totalFee || 0).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1">Total Fee</div>
            </div>
            <div className="rounded-xl border border-border p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">৳{(feeData?.collected || 0).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1">Collected</div>
            </div>
            <div className="rounded-xl border border-border p-4 text-center">
              <div className="text-2xl font-bold text-red-600">৳{(feeData?.due || 0).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground font-medium mt-1">Due</div>
            </div>
          </div>
        </div>
      )}

      {!isMasterAdmin && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AttendanceChart />
            </div>
            <div>
              <QuickActions />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentStudentsTable />
            </div>
            <div>
              <RecentNotices />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardHome;
