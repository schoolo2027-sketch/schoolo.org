import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AttendanceChart = () => {
  const { schoolId } = useAuth();

  const { data: chartData = [] } = useQuery({
    queryKey: ["attendance-chart", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const days = [];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const today = new Date();

      for (let i = 5; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const { data } = await supabase
          .from("attendance")
          .select("status")
          .eq("school_id", schoolId)
          .eq("date", dateStr);

        const total = data?.length || 0;
        const present = data?.filter((a: any) => a.status === "present").length || 0;
        const absent = total - present;
        const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;
        const absentPct = total > 0 ? Math.round((absent / total) * 100) : 0;

        days.push({
          day: dayNames[d.getDay()],
          present: presentPct,
          absent: absentPct,
        });
      }
      return days;
    },
    enabled: !!schoolId,
  });

  return (
    <div className="stat-card">
      <h3 className="font-semibold font-heading mb-4">Weekly Attendance</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="present" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Present %" />
            <Bar dataKey="absent" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Absent %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AttendanceChart;
