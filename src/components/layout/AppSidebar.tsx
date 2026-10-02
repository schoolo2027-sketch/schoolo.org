import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck, FileText,
  CreditCard, Bell, Settings, School, BarChart3, CalendarDays, ChevronLeft,
  UserCog, ArrowUpCircle, LogOut, PenSquare, Wallet, Contact,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { supabase } from "@/integrations/supabase/client";
import shikkhaLogo from "@/assets/shikkha-logo.png";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavClick?: () => void;
}

// permission key mapping for teacher role
type PermKey = "can_add_students" | "can_edit_students" | "can_manage_attendance" | "can_entry_results" | "can_manage_homework" | "can_manage_payments" | "can_send_notices" | "can_manage_classes" | "can_view_reports" | "can_manage_settings" | "can_use_ai_tools";

const allNavItems: { titleKey: string; icon: any; path: string; roles: string[]; teacherPerm?: PermKey }[] = [
  { titleKey: "nav.dashboard", icon: LayoutDashboard, path: "/", roles: ["master_admin", "school_admin", "sub_admin", "teacher", "student"] },
  { titleKey: "nav.schools", icon: School, path: "/schools", roles: ["master_admin"] },
  { titleKey: "nav.students", icon: Users, path: "/students", roles: ["school_admin", "sub_admin", "teacher"], teacherPerm: undefined },
  { titleKey: "nav.admissionForm", icon: FileText, path: "/admission-form", roles: ["school_admin", "sub_admin", "teacher"] },
  { titleKey: "nav.teachers", icon: GraduationCap, path: "/teachers", roles: ["school_admin"] },
  { titleKey: "nav.staff", icon: UserCog, path: "/staff", roles: ["school_admin"] },
  { titleKey: "nav.classes", icon: BookOpen, path: "/classes", roles: ["master_admin", "school_admin", "sub_admin", "teacher"], teacherPerm: "can_manage_classes" },
  { titleKey: "nav.attendance", icon: ClipboardCheck, path: "/attendance", roles: ["school_admin", "teacher"], teacherPerm: "can_manage_attendance" },
  { titleKey: "nav.myAttendance", icon: ClipboardCheck, path: "/my-attendance", roles: ["student"] },
  { titleKey: "nav.idCards", icon: Contact, path: "/id-cards", roles: ["school_admin", "sub_admin", "teacher"] },
  { titleKey: "nav.homework", icon: FileText, path: "/homework", roles: ["school_admin", "teacher"], teacherPerm: "can_manage_homework" },
  { titleKey: "nav.myHomework", icon: FileText, path: "/my-homework", roles: ["student"] },
  { titleKey: "nav.accounts", icon: Wallet, path: "/accounts", roles: ["school_admin", "sub_admin", "accounts"] },
  { titleKey: "nav.myPayments", icon: CreditCard, path: "/my-payments", roles: ["student"] },
  { titleKey: "nav.notices", icon: Bell, path: "/notices", roles: ["master_admin", "school_admin", "teacher", "student"], teacherPerm: "can_send_notices" },
  { titleKey: "nav.exam", icon: PenSquare, path: "/exam", roles: ["school_admin", "sub_admin", "teacher"], teacherPerm: "can_entry_results" },
  { titleKey: "nav.results", icon: BarChart3, path: "/results", roles: ["school_admin", "teacher"], teacherPerm: "can_entry_results" },
  { titleKey: "nav.myResults", icon: BarChart3, path: "/my-results", roles: ["student"] },
  { titleKey: "nav.promotion", icon: ArrowUpCircle, path: "/promotion", roles: ["school_admin"] },
  { titleKey: "nav.settings", icon: Settings, path: "/settings", roles: ["master_admin", "school_admin"] },
];

const getSchoolLogoUrl = (logo: string | null): string => {
  if (!logo) return "";
  if (logo.startsWith("http")) return logo;
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/school-logos/${logo}`;
};

const AppSidebar = ({ collapsed, onToggle, onNavClick }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { roles, schoolId, signOut, teacherPermissions } = useAuth();
  const { t } = useLanguage();
  const { appName, appLogoUrl } = useAppSettings();

  const isMasterAdmin = roles.includes("master_admin" as any);
  const isSchoolUser = !isMasterAdmin && !!schoolId;

  // Fetch school info for school-level users
  const { data: schoolInfo } = useQuery({
    queryKey: ["sidebar-school-info", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data } = await supabase.rpc("get_school_info_safe", { _school_id: schoolId });
      return data?.[0] ?? null;
    },
    enabled: isSchoolUser,
    staleTime: 0,
  });

  // Realtime subscription for school updates
  useEffect(() => {
    if (!schoolId || !isSchoolUser) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const timer = setTimeout(() => {
      channel = supabase
        .channel(`school-sidebar-${schoolId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "schools", filter: `id=eq.${schoolId}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ["sidebar-school-info", schoolId] });
          }
        )
        .subscribe();
    }, 100);
    return () => {
      clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [schoolId, isSchoolUser, queryClient]);

  // Sidebar header always shows platform/app name
  const displayLogo = appLogoUrl || shikkhaLogo;
  const displayName = appName;

  const isTeacher = roles.includes("teacher" as any);
  const isMasterAdminRole = roles.includes("master_admin" as any);
  const isSchoolAdminRole = roles.includes("school_admin" as any) || roles.includes("sub_admin" as any);
  const isAccountsRole = roles.includes("accounts" as any);
  const isStaffOrAdmin = isMasterAdminRole || isSchoolAdminRole || isTeacher || isAccountsRole;

  const navItems = allNavItems.filter(item => {
    // If the user has any admin/teacher/accounts role, hide student personal view links (/my-*)
    if (isStaffOrAdmin && item.path.startsWith("/my-")) {
      return false;
    }

    const hasRole = roles.length === 0 || item.roles.some(r => roles.includes(r as any));
    if (!hasRole) return false;

    // For teachers, check specific permission
    if (isTeacher && item.teacherPerm) {
      return teacherPermissions[item.teacherPerm];
    }

    // Special case: Students and Admission Form page for teachers needs add OR edit permission
    if (isTeacher && (item.path === "/students" || item.path === "/admission-form")) {
      return teacherPermissions.can_add_students || teacherPermissions.can_edit_students;
    }

    return true;
  });

  const handleNav = (path: string) => {
    navigate(path);
    onNavClick?.();
  };

  return (
    <aside
      className={`flex flex-col bg-navy h-full transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <img
          src={displayLogo}
          alt={displayName}
          className="sidebar-logo object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = shikkhaLogo; }}
        />
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold font-heading text-sidebar-foreground tracking-tight truncate leading-tight">
              {displayName}
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors hidden lg:flex shrink-0"
        >
          <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
            const title = t(item.titleKey);
            return (
              <li key={item.path}>
                <button
                  onClick={() => handleNav(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  } ${collapsed ? "justify-center" : ""}`}
                  title={collapsed ? title : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{title}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-2 py-3 border-t border-sidebar-border space-y-2">
        <button
          onClick={async () => { await signOut(); navigate("/login"); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? t("auth.logout") : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{t("auth.logout")}</span>}
        </button>
        {!collapsed && (
          <p className="text-xs text-sidebar-foreground/40 px-1">© 2026 {appName}</p>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
