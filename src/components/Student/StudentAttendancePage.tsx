import { useQuery } from "@tanstack/react-query";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentStudent } from "@/hooks/useCurrentStudent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, CheckCircle2, XCircle, Clock, CalendarDays } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const StudentAttendancePage = () => {
  const { user } = useAuth();
  const { student, schoolId: effectiveSchoolId, isLoading: studentLoading } = useCurrentStudent();
  useRealtimeSync("attendance", [["student-attendance"]]);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Fetch attendance for selected month
  const monthStart = format(startOfMonth(new Date(selectedYear, selectedMonth)), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date(selectedYear, selectedMonth)), "yyyy-MM-dd");

  const { data: attendance = [] } = useQuery({
    queryKey: ["student-attendance", student?.id, effectiveSchoolId, monthStart, monthEnd],
    queryFn: async () => {
      if (!student?.id || !effectiveSchoolId) return [];
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", student.id)
        .eq("school_id", effectiveSchoolId)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: true });
      return data || [];
    },
    enabled: !!student?.id && !!effectiveSchoolId,
  });

  // Fetch all attendance for summary stats
  const { data: allAttendance = [] } = useQuery({
    queryKey: ["student-attendance-all", student?.id, effectiveSchoolId, selectedYear],
    queryFn: async () => {
      if (!student?.id || !effectiveSchoolId) return [];
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", student.id)
        .eq("school_id", effectiveSchoolId)
        .gte("date", `${selectedYear}-01-01`)
        .lte("date", `${selectedYear}-12-31`);
      return data || [];
    },
    enabled: !!student?.id && !!effectiveSchoolId,
  });

  const presentCount = attendance.filter((a: any) => a.status === "present").length;
  const absentCount = attendance.filter((a: any) => a.status === "absent").length;
  const lateCount = attendance.filter((a: any) => a.status === "late").length;
  const totalDays = attendance.length;

  const totalPresent = allAttendance.filter((a: any) => a.status === "present").length;
  const totalAll = allAttendance.length;
  const attendanceRate = totalAll > 0 ? Math.round((totalPresent / totalAll) * 100) : 0;

  // Calendar grid
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(new Date(selectedYear, selectedMonth)),
    end: endOfMonth(new Date(selectedYear, selectedMonth)),
  });
  const firstDayOfWeek = getDay(daysInMonth[0]);
  const attendanceMap: Record<string, string> = {};
  attendance.forEach((a: any) => {
    attendanceMap[a.date] = a.status;
  });

  const statusConfig = {
    present: { color: "bg-green-500", textColor: "text-green-600", label: "Present", icon: CheckCircle2 },
    absent: { color: "bg-red-500", textColor: "text-red-600", label: "Absent", icon: XCircle },
    late: { color: "bg-yellow-500", textColor: "text-yellow-600", label: "Late", icon: Clock },
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          My Attendance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {student?.classes?.class_name} • {student?.sections?.section_name} • Roll: {student?.roll}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i} value={String(i)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Days</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalDays}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-green-600 uppercase tracking-wider">Present</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{presentCount}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-red-600 uppercase tracking-wider">Absent</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{absentCount}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-900">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-yellow-600 uppercase tracking-wider">Late</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{lateCount}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-primary uppercase tracking-wider">Rate ({selectedYear})</p>
            <p className="text-2xl font-bold text-primary mt-1">{attendanceRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {MONTHS[selectedMonth]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {daysInMonth.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const status = attendanceMap[dateStr];
              const isFriday = getDay(day) === 5;
              return (
                <div
                  key={dateStr}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all ${
                    status
                      ? status === "present"
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border border-green-200 dark:border-green-800"
                        : status === "absent"
                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border border-red-200 dark:border-red-800"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800"
                      : isFriday
                      ? "bg-muted/50 text-muted-foreground"
                      : "bg-background text-foreground border border-border"
                  }`}
                >
                  <span className="font-medium">{format(day, "d")}</span>
                  {status && (
                    <span className="text-[9px] uppercase font-semibold mt-0.5">
                      {status === "present" ? "✓" : status === "absent" ? "✗" : "⏳"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-3 border-t border-border">
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                <div className={`w-3 h-3 rounded-sm ${cfg.color}`} />
                <span className="text-muted-foreground">{cfg.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attendance List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No attendance records for this month</p>
          ) : (
            <div className="space-y-2">
              {attendance.map((record: any) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {format(new Date(record.date), "EEEE, dd MMM yyyy")}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      record.status === "present"
                        ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                        : record.status === "absent"
                        ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                        : "border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                    }
                  >
                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAttendancePage;
