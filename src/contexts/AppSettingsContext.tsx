import { createContext, useContext, ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AppSettings {
  appName: string;
  appNameBn: string;
  appTagline: string;
  appLogoUrl: string | null;
  ownerSignature: string | null;
  ownerName: string;
  ownerDesignation: string;
  isLoading: boolean;
  refetch: () => void;
}

const AppSettingsContext = createContext<AppSettings>({
  appName: "Schoolo.org",
  appNameBn: "",
  appTagline: "School Management Platform",
  appLogoUrl: null,
  ownerSignature: null,
  ownerName: "Ridoy Khan",
  ownerDesignation: "Platform Authority & Founder",
  isLoading: true,
  refetch: () => {},
});

export const useAppSettings = () => useContext(AppSettingsContext);

export const AppSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["platform-settings-global"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["app_name", "app_name_bn", "app_tagline", "app_logo_url", "owner_signature", "owner_name", "owner_designation"]);
      if (error) {
        console.warn("Platform settings fetch failed (may be unauthenticated):", error.message);
        return {};
      }
      const map: Record<string, string | null> = {};
      data?.forEach((row) => {
        map[row.key] = row.value;
      });
      return map;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
    meta: { errorMessage: "Failed to load platform settings" },
  });

  const settings: AppSettings = {
    appName: data?.app_name || "Schoolo.org",
    appNameBn: data?.app_name_bn || "",
    appTagline: data?.app_tagline || "School Management Platform",
    appLogoUrl: data?.app_logo_url || null,
    ownerSignature: data?.owner_signature || null,
    ownerName: data?.owner_name || "Ridoy Khan",
    ownerDesignation: data?.owner_designation || "Platform Director & Authorized Authority",
    isLoading,
    refetch,
  };

  // Keep browser favicon in sync with the configured app logo
  useEffect(() => {
    const faviconUrl = data?.app_logo_url || "/favicon.png";
    const links = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
    if (links.length > 0) {
      links.forEach((link) => {
        link.href = faviconUrl;
      });
    }
  }, [data?.app_logo_url]);

  return (
    <AppSettingsContext.Provider value={settings}>
      {children}
    </AppSettingsContext.Provider>
  );
};
