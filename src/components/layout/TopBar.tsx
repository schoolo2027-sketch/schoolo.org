import { Bell, Menu, User, LogOut, School } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/Common/LanguageSwitcher";
import { LiveSyncIndicator } from "@/components/Common/LiveSyncIndicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import shikkhaLogo from "@/assets/shikkha-logo.png";

interface TopBarProps {
  onMenuClick: () => void;
}

const getSchoolLogoUrl = (logo: string | null): string => {
  if (!logo) return "";
  if (logo.startsWith("http")) return logo;
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/school-logos/${logo}`;
};

const TopBar = ({ onMenuClick }: TopBarProps) => {
  const { profile, roles, schoolId, signOut, setMasterSelectedSchoolId, masterSelectedSchoolId } = useAuth();
  const { t } = useLanguage();
  const { appName, appLogoUrl } = useAppSettings();
  const queryClient = useQueryClient();

  const isMasterAdmin = roles.includes("master_admin" as any);
  const isSchoolUser = !isMasterAdmin && !!schoolId;

  const initials = profile?.full_name
    ? profile.full_name.trim().split(/\s+/).filter(Boolean).map((n) => n[0] || "").join("").toUpperCase().slice(0, 2) || "U"
    : "U";

  // Fetch school info for school-level users
  const { data: schoolInfo } = useQuery({
    queryKey: ["topbar-school-info", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data } = await supabase.rpc("get_school_info_safe", { _school_id: schoolId });
      return data?.[0] ?? null;
    },
    enabled: isSchoolUser,
    staleTime: 0,
  });

  // Master admin: list schools to select
  const { data: masterSchools = [] } = useQuery({
    queryKey: ["topbar-master-schools-list"],
    queryFn: async () => {
      const { data } = await supabase.from("schools").select("id, school_name").is("deleted_at", null).order("school_name");
      return data || [];
    },
    enabled: isMasterAdmin,
  });

  // Realtime subscription for school updates
  useEffect(() => {
    if (!schoolId || !isSchoolUser) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const timer = setTimeout(() => {
      channel = supabase
        .channel(`school-topbar-${schoolId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "schools", filter: `id=eq.${schoolId}` },
          () => {
            queryClient.invalidateQueries({ queryKey: ["topbar-school-info", schoolId] });
            queryClient.invalidateQueries({ queryKey: ["sidebar-school-info", schoolId] });
            queryClient.invalidateQueries({ queryKey: ["school-info"] });
            queryClient.invalidateQueries({ queryKey: ["school-details"] });
            queryClient.invalidateQueries({ queryKey: ["school-settings"] });
            queryClient.invalidateQueries({ queryKey: ["school"] });
            queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey;
                return Array.isArray(key) && key.some(k => k === schoolId || k === "school" || (typeof k === "string" && k.includes("school")));
              }
            });
          }
        )
        .subscribe();
    }, 100);
    return () => {
      clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [schoolId, isSchoolUser, queryClient]);

  const schoolLogoUrl = schoolInfo?.school_logo ? `${getSchoolLogoUrl(schoolInfo.school_logo)}?t=${Date.now()}` : "";

  return (
    <header className="h-16 bg-card border-b border-border flex items-center px-2 sm:px-4 lg:px-6 gap-1.5 sm:gap-3 shrink-0 w-full max-w-full min-w-0 overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden text-foreground h-8 w-8 sm:h-9 sm:w-9 shrink-0"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* School info / Master admin switcher */}
      <div className="flex-1 min-w-0 pr-1 overflow-hidden">
        {isSchoolUser && schoolInfo ? (
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {schoolLogoUrl ? (
              <img
                src={schoolLogoUrl}
                alt={schoolInfo.school_name}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-contain border border-border bg-background p-0.5 shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = shikkhaLogo; }}
              />
            ) : (
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <School className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xs sm:text-sm font-bold text-foreground truncate leading-tight">
                {schoolInfo.school_name}
              </h2>
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground truncate leading-tight">
                {schoolInfo.school_address && <span className="truncate">{schoolInfo.school_address}</span>}
                {schoolInfo.school_phone && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">{schoolInfo.school_phone}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : isMasterAdmin ? (
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={appLogoUrl || shikkhaLogo}
              alt={appName}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg object-contain shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = shikkhaLogo; }}
            />
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-foreground truncate hidden sm:inline">{appName} Platform</span>
              {masterSchools.length > 0 && (
                <div className="max-w-[130px] sm:max-w-[200px]">
                  <select
                    className="h-7 sm:h-8 text-xs bg-muted/60 border border-border rounded-md px-2 py-0.5 font-medium text-foreground max-w-full truncate focus:outline-none focus:ring-1 focus:ring-primary"
                    value={schoolId || ""}
                    onChange={(e) => setMasterSelectedSchoolId(e.target.value || null)}
                    title="Active School Context"
                  >
                    <option value="">All Schools</option>
                    {masterSchools.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.school_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={appLogoUrl || shikkhaLogo}
              alt={appName}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg object-contain shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).src = shikkhaLogo; }}
            />
            <span className="text-xs sm:text-sm font-bold text-foreground truncate">{appName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
        <LiveSyncIndicator />
        <LanguageSwitcher />

        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground relative">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-accent rounded-full" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-1 sm:gap-2 px-1 sm:px-2 h-8 sm:h-9">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-sm font-medium leading-tight">{profile?.full_name || "User"}</span>
                <span className="text-xs text-muted-foreground leading-tight">{profile?.email || ""}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" /> {t("topbar.profile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> {t("auth.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default TopBar;
