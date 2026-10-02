import { useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export { useRealtime } from "@/contexts/RealtimeSyncContext";
export type { RealtimeStatus } from "@/contexts/RealtimeSyncContext";

/**
 * Subscribe to realtime changes on a table and auto-invalidate queries.
 * Backed by both table-level subscription and the global RealtimeSyncProvider.
 */
export const useRealtimeSync = (tableName: string, queryKeys: string[][]) => {
  const queryClient = useQueryClient();
  const { schoolId } = useAuth();

  const serializedKeys = useMemo(() => JSON.stringify(queryKeys), [queryKeys]);

  useEffect(() => {
    if (!tableName) return;

    const channelName = `${tableName}-sync-${schoolId || "global"}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Configure filter: only apply school_id if available and applicable
    const channelConfig: any = {
      event: "*",
      schema: "public",
      table: tableName,
    };
    if (schoolId && tableName !== "schools" && tableName !== "platform_settings") {
      channelConfig.filter = `school_id=eq.${schoolId}`;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        channelConfig,
        () => {
          const keys: string[][] = JSON.parse(serializedKeys);
          keys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, schoolId, queryClient, serializedKeys]);
};
