import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, ToggleLeft, ToggleRight, Trash2, Eye, Printer, FileText } from "lucide-react";
import { format } from "date-fns";

interface SchoolCardProps {
  school: any;
  onEdit: (school: any) => void;
  onToggle: (id: string, is_active: boolean) => void;
  onDelete: (school: any) => void;
  onViewProfile: (school: any) => void;
  onViewAgreement: (school: any) => void;
  onPrintReport: (school: any) => void;
}

const planColors: Record<string, string> = {
  free: "secondary",
  pro: "default",
  enterprise: "destructive",
};

const SchoolCard = ({ school, onEdit, onToggle, onDelete, onViewProfile, onViewAgreement, onPrintReport }: SchoolCardProps) => {
  const logoUrl = school.school_logo
    ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/school-logos/${school.school_logo}`
    : null;

  return (
    <div className="stat-card flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            {logoUrl && <AvatarImage src={logoUrl} alt={school.school_name} />}
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {school.school_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold font-heading">{school.school_name}</h3>
            {school.eiin && <p className="text-xs text-muted-foreground">EIIN: {school.eiin}</p>}
            {school.school_code && <p className="text-xs text-muted-foreground">Code: {school.school_code}</p>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={school.is_active ? "default" : "secondary"}>
            {school.is_active ? "Active" : "Suspended"}
          </Badge>
          <Badge variant={planColors[school.plan_name] as any || "secondary"} className="text-[10px]">
            {(school.plan_name || "free").toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        {school.school_address && <p>📍 {school.school_address}</p>}
        {school.school_phone && <p>📞 {school.school_phone}</p>}
        {school.school_email && <p>✉️ {school.school_email}</p>}
        {school.subscription_expiry && (
          <p>📅 Expires: {format(new Date(school.subscription_expiry), "dd MMM yyyy")}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => onViewProfile(school)}>
          <Eye className="h-3.5 w-3.5" /> View
        </Button>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => onEdit(school)}>
          <Edit className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => onViewAgreement(school)}>
          <FileText className="h-3.5 w-3.5" /> Agreement
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => onToggle(school.id, !school.is_active)}
        >
          {school.is_active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          {school.is_active ? "Suspend" : "Activate"}
        </Button>
        <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive" onClick={() => onDelete(school)}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    </div>
  );
};

export default SchoolCard;
