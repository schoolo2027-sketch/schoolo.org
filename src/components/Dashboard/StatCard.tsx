import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color: "primary" | "accent" | "success" | "info" | "warning";
  onClick?: () => void;
}

const colorMap = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent-foreground",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
};

const StatCard = ({ title, value, icon: Icon, trend, trendUp, color, onClick }: StatCardProps) => {
  return (
    <div 
      className={`stat-card animate-fade-in ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold font-heading mt-1 sm:mt-2 animate-count-up truncate">{value}</p>
          {trend && (
            <p className={`text-[11px] sm:text-xs mt-1 sm:mt-2 font-medium truncate ${trendUp ? "text-success" : "text-destructive"}`}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        <div className={`stat-card-icon ${colorMap[color]} shrink-0`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
