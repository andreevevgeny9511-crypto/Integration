import { useCallback, useEffect, useRef } from "react";
import { useApp } from "@/store/useStore";
import { apiClient } from "@/services/api";

export function useSyncStatus() {
  const { dispatch } = useApp();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const status = await apiClient.getSyncStatus();
      dispatch({ type: "SET_DASHBOARD_STATUS", payload: status.syncStatus });
      dispatch({ type: "SET_DASHBOARD_LOGS", payload: status.logs });
      dispatch({ type: "SET_DASHBOARD_STATS", payload: status.stats });
    } catch {
      // Silently handle polling errors
    }
  }, [dispatch]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 30000); // Every 30s
  }, [fetchStatus]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { fetchStatus, startPolling, stopPolling };
}
