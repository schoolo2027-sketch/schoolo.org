import { useQuery } from "@tanstack/react-query";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentStudent } from "@/hooks/useCurrentStudent";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Calendar, Search, BookOpen, Clock } from "lucide-react";
import { format, isPast } from "date-fns";
import { useState } from "react";

const StudentHomeworkPage = () => {
  const { user } = useAuth();
  const { student, schoolId: effectiveSchoolId, isLoading: studentLoading } = useCurrentStudent();
  useRealtimeSync("homework", [["student-homework"]]);
  const [search, setSearch] = useState("");

  // Fetch homework for student's class
  const { data: homework = [] } = useQuery({
    queryKey: ["student-homework", student?.class_id, student?.section_id, effectiveSchoolId],
    queryFn: async () => {
      if (!student?.class_id || !effectiveSchoolId) return [];
      let query = supabase
        .from("homework")
        .select("*, subjects(subject_name), teachers(teacher_name)")
        .eq("school_id", effectiveSchoolId)
        .eq("class_id", student.class_id)
        .order("created_at", { ascending: false });

      if (student?.section_id) {
        query = query.or(`section_id.eq.${student.section_id},section_id.is.null`);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!student?.class_id && !!effectiveSchoolId,
  });

  const filtered = homework.filter((hw: any) =>
    hw.title.toLowerCase().includes(search.toLowerCase()) ||
    hw.subjects?.subject_name?.toLowerCase().includes(search.toLowerCase())
  );

  const upcoming = filtered.filter((hw: any) => hw.deadline && !isPast(new Date(hw.deadline)));
  const past = filtered.filter((hw: any) => !hw.deadline || isPast(new Date(hw.deadline)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          My Homework
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {student?.classes?.class_name} • {student?.sections?.section_name}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search homework..."
          className="pl-10"
        />
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4" /> Upcoming ({upcoming.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((hw: any) => (
              <HomeworkCard key={hw.id} hw={hw} isUpcoming />
            ))}
          </div>
        </div>
      )}

      {/* Past / No deadline */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Past / No Deadline ({past.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {past.map((hw: any) => (
              <HomeworkCard key={hw.id} hw={hw} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No homework assigned yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const HomeworkCard = ({ hw, isUpcoming }: { hw: any; isUpcoming?: boolean }) => {
  const daysLeft = hw.deadline
    ? Math.ceil((new Date(hw.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className={`hover:shadow-md transition-all ${isUpcoming ? "border-primary/30" : "border-border"}`}>
      <CardContent className="p-4 space-y-3">
        {hw.image_url && (
          <div className="w-full h-32 rounded-lg overflow-hidden bg-muted">
            <img src={hw.image_url} alt={hw.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm leading-tight">{hw.title}</h3>
            {hw.subjects?.subject_name && (
              <Badge variant="secondary" className="mt-1 text-xs">{hw.subjects.subject_name}</Badge>
            )}
          </div>
        </div>

        {hw.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{hw.description}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          {hw.deadline && (
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={isUpcoming ? "text-primary font-medium" : "text-muted-foreground"}>
                {format(new Date(hw.deadline), "dd MMM yyyy")}
              </span>
            </div>
          )}
          {isUpcoming && daysLeft !== null && daysLeft >= 0 && (
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              {daysLeft === 0 ? "Today" : `${daysLeft}d left`}
            </Badge>
          )}
        </div>

        {hw.teachers?.teacher_name && (
          <p className="text-[11px] text-muted-foreground">By: {hw.teachers.teacher_name}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentHomeworkPage;
