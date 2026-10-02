import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RealtimeStatus = "connected" | "connecting" | "syncing" | "offline";

export interface RealtimeContextType {
  status: RealtimeStatus;
  lastSyncAt: Date | null;
  lastSyncTable: string | null;
  lastSyncAction: string | null;
  syncCount: number;
  refreshAll: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType>({
  status: "connecting",
  lastSyncAt: null,
  lastSyncTable: null,
  lastSyncAction: null,
  syncCount: 0,
  refreshAll: async () => {},
});

export const useRealtime = () => useContext(RealtimeContext);

import { TABLE_QUERY_KEY_MAP, CORE_MONITORED_TABLES } from "@/lib/realtimeConstants";

export const RealtimeSyncProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { schoolId, user } = useAuth();

  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [lastSyncTable, setLastSyncTable] = useState<string | null>(null);
  const [lastSyncAction, setLastSyncAction] = useState<string | null>(null);
  const [syncCount, setSyncCount] = useState<number>(0);

  const pendingKeysRef = useRef<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced invalidation scheduler: collapses rapid multi-row events into one clean refresh
  const scheduleInvalidation = useCallback(
    (keys: string[][], table: string, eventType: string) => {
      setStatus("syncing");
      setLastSyncAt(new Date());
      setLastSyncTable(table);
      setLastSyncAction(eventType);
      setSyncCount((c) => c + 1);

      keys.forEach((k) => {
        pendingKeysRef.current.add(JSON.stringify(k));
      });

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const keysToInvalidate = Array.from(pendingKeysRef.current).map(
          (k) => JSON.parse(k) as string[]
        );
        pendingKeysRef.current.clear();

        keysToInvalidate.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });

        if (syncingTimerRef.current) clearTimeout(syncingTimerRef.current);
        syncingTimerRef.current = setTimeout(() => {
          setStatus(navigator.onLine ? "connected" : "offline");
        }, 600);
      }, 120);
    },
    [queryClient]
  );

  // Manual refresh all active queries
  const refreshAll = useCallback(async () => {
    setStatus("syncing");
    setLastSyncAt(new Date());
    setLastSyncTable("all");
    setLastSyncAction("MANUAL_REFRESH");
    setSyncCount((c) => c + 1);

    try {
      await queryClient.invalidateQueries();
    } finally {
      setTimeout(() => {
        setStatus(navigator.onLine ? "connected" : "offline");
      }, 500);
    }
  }, [queryClient]);

  // Handle incoming Supabase Realtime postgres_changes event
  const handleEvent = useCallback(
    (payload: any) => {
      const table = payload.table;
      const eventType = payload.eventType; // 'INSERT' | 'UPDATE' | 'DELETE'
      const newRecord = payload.new as any;
      const oldRecord = payload.old as any;

      // Tenant isolation filter:
      // If client has a specific schoolId, and the record has a school_id, ignore events from other schools.
      if (schoolId) {
        const recordSchoolId = newRecord?.school_id ?? oldRecord?.school_id;
        if (recordSchoolId && recordSchoolId !== schoolId) {
          return;
        }
      }

      // Look up query keys for this table
      const keys = TABLE_QUERY_KEY_MAP[table] || [
        [table],
        [table.replace(/_/g, "-")],
      ];

      scheduleInvalidation(keys, table, eventType);
    },
    [schoolId, scheduleInvalidation]
  );

  // Online / Offline window listeners
  useEffect(() => {
    const handleOnline = () => {
      setStatus("connecting");
      queryClient.invalidateQueries({ type: "active" });
    };

    const handleOffline = () => {
      setStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [queryClient]);

  // Visibility change listener: when returning to tab, ensure active queries are fresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ type: "active" });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [queryClient]);

  // Establish Supabase Realtime Channel
  useEffect(() => {
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }

    const channelId = `global-realtime-${schoolId || (user ? user.id.slice(0, 8) : "public")}-${Date.now()}`;
    let ch = supabase.channel(channelId);

    // 1. Listen to schema-wide changes
    ch = ch.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
      },
      handleEvent
    );

    // 2. Also attach table-specific listeners for all core tables
    // (guarantees reception even on Supabase publications configured per-table)
    CORE_MONITORED_TABLES.forEach((table) => {
      ch = ch.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        handleEvent
      );
    });

    ch.subscribe((subStatus) => {
      if (subStatus === "SUBSCRIBED") {
        setStatus("connected");
      } else if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
        setStatus("connecting");
      } else if (subStatus === "CLOSED") {
        setStatus("offline");
      }
    });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [schoolId, user, handleEvent]);

  return (
    <RealtimeContext.Provider
      value={{
        status,
        lastSyncAt,
        lastSyncTable,
        lastSyncAction,
        syncCount,
        refreshAll,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};
