import { useCallback } from "react";
import { useApp } from "@/store/useStore";
import { apiClient } from "@/services/api";
import type { Bitrix24ConnectionConfig, ListokConnectionConfig } from "@/types";

export function useConnections() {
  const { dispatch } = useApp();

  const loadBitrix24Connections = useCallback(async () => {
    try {
      const connections = await apiClient.getBitrix24Connections();
      if (connections.length > 0) {
        dispatch({ type: "SET_BITRIX24_CONNECTION", payload: connections[0] });
      }
    } catch {
      // Silently handle - connections may not exist yet
    }
  }, [dispatch]);

  const loadListokConnections = useCallback(async () => {
    try {
      const connections = await apiClient.getListokConnections();
      if (connections.length > 0) {
        dispatch({ type: "SET_LISTOK_CONNECTION", payload: connections[0] });
      }
    } catch {
      // Silently handle
    }
  }, [dispatch]);

  const testBitrix24Connection = useCallback(
    async (data: { domain: string; clientId: string; clientSecret: string }) => {
      return apiClient.testBitrix24Connection(data);
    },
    []
  );

  const testListokConnection = useCallback(
    async (data: { apiKey: string; baseUrl: string }) => {
      return apiClient.testListokConnection(data);
    },
    []
  );

  const saveBitrix24Connection = useCallback(
    async (data: Partial<Bitrix24ConnectionConfig>) => {
      if (data.id) {
        return apiClient.updateBitrix24Connection(data.id, data);
      }
      return apiClient.createBitrix24Connection(data);
    },
    []
  );

  const saveListokConnection = useCallback(
    async (data: Partial<ListokConnectionConfig>) => {
      if (data.id) {
        return apiClient.updateListokConnection(data.id, data);
      }
      return apiClient.createListokConnection(data);
    },
    []
  );

  return {
    loadBitrix24Connections,
    loadListokConnections,
    testBitrix24Connection,
    testListokConnection,
    saveBitrix24Connection,
    saveListokConnection,
  };
}
