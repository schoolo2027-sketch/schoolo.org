import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, Users, GraduationCap, ClipboardCheck, CreditCard, School, UserCheck, Building2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--info))", "hsl(var(--warning))"];

const ReportsPage = () => {
  const { schoolId, roles } = useAuth();
  const isMasterAdmin = roles.includes("master_admin");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");

  const effectiveSchoolId = isMasterAdmin
    ? (selectedSchoolId === "all" ? null : selectedSchoolId)
    : schoolId;

  // Schools list for master admin filter
  const { data: schools = [] } = useQuery({
    queryKey: ["report-schools-list"],
    queryFn: async () => {
      const { data } = await supabase.from("schools").select("id, school_name").order("school_name");
      return data || [];
    },
    enabled: isMasterAdmin,
  });

  // Platform-wide stats for master admin
  const { data: platformStats } = useQuery({
    queryKey: ["report-platform-stats"],
    queryFn: async () => {
      const [totalSchools, activeSchools, suspendedSchools] = await Promise.all([
        supabase.from("schools").select("id", { count: "exact", head: true }),
        supabase.from("schools").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("schools").select("id", { count: "exact", head: true }).eq("is_active", false),
      ]);
      return {
        totalSchools: totalSchools.count || 0,
        activeSchools: activeSchools.count || 0,
        suspendedSchools: suspendedSchools.count || 0,
      };
    },
    enabled: isMasterAdmin,
  });

  const { data: studentCount = 0 } = useQuery({
    queryKey: ["report-students", effectiveSchoolId],
    queryFn: async () => {
      let query = supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true);
      if (effectiveSchoolId) query = query.eq("school_id", effectiveSchoolId);
      const { count } = await query;
      return count || 0;
    },
    enabled: isMasterAdmin || !!schoolId,
  });

  const { data: teacherCount = 0 } = useQuery({
    queryKey: ["report-teachers", effectiveSchoolId],
    queryFn: async () => {
      let query = supabase.from("teachers").select("id", { count: "exact", head: true }).eq("is_active", true);
      if (effectiveSchoolId) query = query.eq("school_id", effectiveSchoolId);
      const { count } = await query;
      return count || 0;
    },
    enabled: isMasterAdmin || !!schoolId,
  });

  const { data: staffCount = 0 } = useQuery({
    queryKey: ["report-staff", effectiveSchoolId],
    queryFn: async () => {
      let query = supabase.from("staff").select("id", { count: "exact", head: true }).eq("is_active", true);
      if (effectiveSchoolId) query = query.eq("school_id", effectiveSchoolId);
      const { count } = await query;
      return count || 0;
    },
    enabled: isMasterAdmin || !!schoolId,
  });

  const { data: attendanceData = [] } = useQuery({
    queryKey: ["report-attendance", effectiveSchoolId],
    queryFn: async () => {
      const sid = effectiveSchoolId || schoolId;
      if (!sid) return [];
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayName = d.toLocaleDateString("en", { weekday: "short" });
        const { data } = await supabase.from("attendance").select("status").eq("school_id", sid).eq("date", dateStr);
        const total = data?.length || 0;
        const present = data?.filter((a: any) => a.status === "present").length || 0;
        const absent = data?.filter((a: any) => a.status === "absent").length || 0;
        days.push({ day: dayName, present, absent, total });
      }
      return days;
    },
    enabled: !!effectiveSchoolId || !!schoolId,
  });

  const { data: gradeDistribution = [] } = useQuery({
    queryKey: ["report-grades", effectiveSchoolId],
    queryFn: async () => {
      const sid = effectiveSchoolId || schoolId;
      if (!sid) return [];
      const { data } = await supabase.from("marks").select("grade").eq("school_id", sid);
      const counts: Record<string, number> = {};
      data?.forEach((m: any) => { if (m.grade) counts[m.grade] = (counts[m.grade] || 0) + 1; });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
    enabled: !!effectiveSchoolId || !!schoolId,
  });

  const { data: paymentStats } = useQuery({
    queryKey: ["report-payments", effectiveSchoolId],
    queryFn: async () => {
      const sid = effectiveSchoolId || schoolId;
      if (!sid) return { total: 0, verified: 0, pending: 0 };
      const { data } = await supabase.from("payments").select("amount, status").eq("school_id", sid);
      const total = data?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
      const verified = data?.filter((p: any) => p.status === "verified").reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
      const pending = data?.filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
      return { total, verified, pending };
    },
    enabled: !!effectiveSchoolId || !!schoolId,
  });

  // Master admin stats cards
  const masterStats = isMasterAdmin ? [
    { label: "Total Schools", value: platformStats?.totalSchools ?? 0, icon: School, color: "bg-primary/10 text-primary" },
    { label: "Active Schools", value: platformStats?.activeSchools ?? 0, icon: Building2, color: "bg-success/10 text-success" },
    { label: "Suspended Schools", value: platformStats?.suspendedSchools ?? 0, icon: Building2, color: "bg-destructive/10 text-destructive" },
  ] : [];

  const stats = [
    { label: "Total Students", value: studentCount, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Total Teachers", value: teacherCount, icon: GraduationCap, color: "bg-success/10 text-success" },
    { label: "Total Staff", value: staffCount, icon: UserCheck, color: "bg-info/10 text-info" },
    { label: "Fees Collected", value: `৳${(paymentStats?.verified || 0).toLocaleString()}`, icon: CreditCard, color: "bg-accent/10 text-accent-foreground" },
    { label: "Fees Pending", value: `৳${(paymentStats?.pending || 0).toLocaleString()}`, icon: CreditCard, color: "bg-warning/10 text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-description">
            {isMasterAdmin ? "Platform-wide analytics and school-based reports." : "View analytics and generate reports."}
          </p>
        </div>
        {isMasterAdmin && (
          <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
            <SelectTrigger className="w-[260px]">
              <School className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Select School" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schools (Overview)</SelectItem>
              {schools.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.school_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Master Admin: Platform Overview */}
      {isMasterAdmin && selectedSchoolId === "all" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {masterStats.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-2xl font-bold font-heading mt-1">{s.value}</p>
                </div>
                <div className={`stat-card-icon ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User/School stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
                <p className="text-2xl font-bold font-heading mt-1">{s.value}</p>
              </div>
              <div className={`stat-card-icon ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts — only when a specific school is selected or for school admins */}
      {(effectiveSchoolId || schoolId) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="stat-card">
            <h3 className="font-semibold font-heading mb-4">Weekly Attendance</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Bar dataKey="present" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Present" />
                  <Bar dataKey="absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="stat-card">
            <h3 className="font-semibold font-heading mb-4">Grade Distribution</h3>
            <div className="h-64">
              {gradeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={gradeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {gradeDistribution.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No grade data available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
