import { useNavigate } from "react-router-dom";
import {
  Users, ClipboardCheck, CreditCard, BarChart3, PenSquare, Bell, Contact,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const QuickActions = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const actions = [
    { labelKey: "actions.addStudent", icon: Users, path: "/students", color: "bg-primary/10 text-primary" },
    { labelKey: "actions.takeAttendance", icon: ClipboardCheck, path: "/attendance", color: "bg-success/10 text-success" },
    { labelKey: "actions.recordPayment", icon: CreditCard, path: "/accounts", color: "bg-accent/10 text-accent-foreground" },
    { labelKey: "nav.idCards", icon: Contact, path: "/id-cards", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { labelKey: "actions.examTools", icon: PenSquare, path: "/exam", color: "bg-warning/10 text-warning" },
    { labelKey: "actions.postNotice", icon: Bell, path: "/notices", color: "bg-info/10 text-info" },
  ];

  return (
    <div className="stat-card h-full">
      <h3 className="font-semibold font-heading mb-4">{t("actions.title")}</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.labelKey}
            onClick={() => navigate(action.path)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all text-center group"
          >
            <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
              <action.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">{t(action.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
