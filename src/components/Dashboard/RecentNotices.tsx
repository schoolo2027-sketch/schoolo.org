import { Bell, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const typeColors: Record<string, string> = {
  Event: "bg-info/10 text-info",
  Exam: "bg-warning/10 text-warning",
  Meeting: "bg-primary/10 text-primary",
  Holiday: "bg-success/10 text-success",
  Notice: "bg-accent/10 text-accent-foreground",
};

const RecentNotices = () => {
  const { schoolId } = useAuth();

  const { data: notices = [] } = useQuery({
    queryKey: ["recent-notices", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from("notices")
        .select("id, title, created_at, is_broadcast, school_id, target_schools")
        .or(`school_id.eq.${schoolId},is_broadcast.eq.true`)
        .order("created_at", { ascending: false })
        .limit(5);
      // Filter: only own school notices or broadcasts
      return (data || []).filter((n: any) => {
        if (n.school_id === schoolId) return true;
        if (n.is_broadcast && (!n.target_schools || n.target_schools.length === 0)) return true;
        if (n.target_schools && n.target_schools.includes(schoolId)) return true;
        return false;
      });
    },
    enabled: !!schoolId,
  });

  return (
    <div className="stat-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold font-heading">Recent Notices</h3>
        <Bell className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-3">
        {notices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No notices yet.</p>
        ) : (
          notices.map((notice: any) => (
            <div
              key={notice.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/20 transition-colors"
            >
              <div className={`p-1.5 rounded-md ${notice.is_broadcast ? typeColors.Event : typeColors.Notice} shrink-0`}>
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{notice.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(notice.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  {notice.is_broadcast && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-info/10 text-info">Broadcast</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentNotices;
