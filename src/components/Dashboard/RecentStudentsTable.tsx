import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const RecentStudentsTable = () => {
  const { schoolId } = useAuth();
  const navigate = useNavigate();

  const { data: students = [] } = useQuery({
    queryKey: ["recent-students", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from("students")
        .select("id, student_name, roll, is_active, photo, class_id, section_id, classes(class_name), sections(section_name)")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!schoolId,
  });

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold font-heading">Recent Students</h3>
        <button onClick={() => navigate("/students")} className="text-sm text-primary font-medium hover:underline">View All</button>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Student</th>
              <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden sm:table-cell">Class</th>
              <th className="text-left py-3 px-2 text-muted-foreground font-medium hidden md:table-cell">Section</th>
              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Roll</th>
              <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No students yet.</td></tr>
            ) : (
              students.map((s: any) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {s.photo && <AvatarImage src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/student-photos/${s.photo}`} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {(s.student_name || "").trim().split(/\s+/).filter(Boolean).map((n: string) => n[0] || "").join("").toUpperCase().slice(0, 2) || "S"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{s.student_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 hidden sm:table-cell text-muted-foreground">{s.classes?.class_name || "-"}</td>
                  <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">{s.sections?.section_name || "-"}</td>
                  <td className="py-3 px-2 text-muted-foreground">{s.roll || "-"}</td>
                  <td className="py-3 px-2">
                    <Badge variant={s.is_active ? "default" : "secondary"} className="text-xs">
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentStudentsTable;
