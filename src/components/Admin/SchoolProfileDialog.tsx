import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Props {
  school: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SchoolProfileDialog = ({ school, open, onOpenChange }: Props) => {
  const { data: stats } = useQuery({
    queryKey: ["school-stats", school?.id],
    queryFn: async () => {
      const [students, teachers, classes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", school.id),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", school.id),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", school.id),
      ]);
      return {
        students: students.count || 0,
        teachers: teachers.count || 0,
        classes: classes.count || 0,
      };
    },
    enabled: !!school?.id,
  });

  if (!school) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>School Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Name:</span> <strong>{school.school_name}</strong></div>
            <div><span className="text-muted-foreground">EIIN:</span> <strong>{school.eiin || "—"}</strong></div>
            <div><span className="text-muted-foreground">Code:</span> <strong>{school.school_code || "—"}</strong></div>
            <div><span className="text-muted-foreground">Phone:</span> <strong>{school.school_phone || "—"}</strong></div>
            <div className="col-span-2"><span className="text-muted-foreground">Email:</span> <strong>{school.school_email || "—"}</strong></div>
            <div className="col-span-2"><span className="text-muted-foreground">Address:</span> <strong>{school.school_address || "—"}</strong></div>
            <div><span className="text-muted-foreground">Website:</span> <strong>{school.website || "—"}</strong></div>
            <div><span className="text-muted-foreground">Admin:</span> <strong>{school.admin_name || "—"}</strong></div>
          </div>

          <div className="border-t border-border pt-3">
            <h4 className="text-sm font-semibold mb-2">Plan Details</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Plan:</span> <Badge variant="outline">{(school.plan_name || "free").toUpperCase()}</Badge></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={school.is_active ? "default" : "secondary"}>{school.is_active ? "Active" : "Suspended"}</Badge></div>
              <div><span className="text-muted-foreground">Max Students:</span> <strong>{school.max_students}</strong></div>
              <div><span className="text-muted-foreground">Max Teachers:</span> <strong>{school.max_teachers}</strong></div>
              <div className="col-span-2"><span className="text-muted-foreground">Expiry:</span> <strong>{school.subscription_expiry ? format(new Date(school.subscription_expiry), "dd MMM yyyy") : "No expiry"}</strong></div>
            </div>
          </div>

          {stats && (
            <div className="border-t border-border pt-3">
              <h4 className="text-sm font-semibold mb-2">Statistics</h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="stat-card py-3"><div className="text-2xl font-bold text-primary">{stats.students}</div><div className="text-xs text-muted-foreground">Students</div></div>
                <div className="stat-card py-3"><div className="text-2xl font-bold text-primary">{stats.teachers}</div><div className="text-xs text-muted-foreground">Teachers</div></div>
                <div className="stat-card py-3"><div className="text-2xl font-bold text-primary">{stats.classes}</div><div className="text-xs text-muted-foreground">Classes</div></div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SchoolProfileDialog;
