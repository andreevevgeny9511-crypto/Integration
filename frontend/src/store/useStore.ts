// ============================================================
// Global state store using React Context + useReducer
// ============================================================

import { createContext, useContext, useReducer, useCallback, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import type {
  AppState,
  Bitrix24ConnectionConfig,
  ListokConnectionConfig,
  SyncRule,
  FieldMapping,
  SyncLog,
  SyncStats,
  SyncStatus,
  ConnectionStatus,
  EntityType,
  ListokEntityType,
  SyncDirection,
} from "@/types";

// ── Action Types ──
type Action =
  | { type: "SET_BITRIX24_CONNECTION"; payload: Bitrix24ConnectionConfig | null }
  | { type: "SET_LISTOK_CONNECTION"; payload: ListokConnectionConfig | null }
  | { type: "SET_SYNC_RULES"; payload: SyncRule[] }
  | { type: "ADD_SYNC_RULE"; payload: SyncRule }
  | { type: "UPDATE_SYNC_RULE"; payload: { id: string; updates: Partial<SyncRule> } }
  | { type: "DELETE_SYNC_RULE"; payload: string }
  | { type: "SET_FIELD_MAPPINGS"; payload: FieldMapping[] }
  | { type: "ADD_FIELD_MAPPING"; payload: FieldMapping }
  | { type: "UPDATE_FIELD_MAPPING"; payload: { id: string; updates: Partial<FieldMapping> } }
  | { type: "DELETE_FIELD_MAPPING"; payload: string }
  | { type: "SET_DASHBOARD_STATUS"; payload: SyncStatus }
  | { type: "SET_DASHBOARD_LOGS"; payload: SyncLog[] }
  | { type: "ADD_DASHBOARD_LOG"; payload: SyncLog }
  | { type: "SET_DASHBOARD_STATS"; payload: SyncStats }
  | { type: "SET_ACTIVE_TAB"; payload: string }
  | { type: "SET_WIZARD_STEP"; payload: number }
  | { type: "SET_CONNECTION_STATUS"; payload: { platform: "bitrix24" | "listok"; status: ConnectionStatus } }
  | { type: "RESET" };

// ── Initial State ──
const initialState: AppState = {
  bitrix24Connection: null,
  listokConnection: null,
  syncRules: [],
  fieldMappings: [],
  dashboard: {
    syncStatus: "idle",
    logs: [],
    stats: {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      entitiesSynced: 0,
      lastSyncAt: null,
      avgDuration: 0,
      syncsByDay: [],
      entitiesByType: [],
    },
    activeRules: 0,
    lastSyncAt: null,
  },
  activeTab: "dashboard",
  wizardStep: 0,
};

// ── Reducer ──
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_BITRIX24_CONNECTION":
      return { ...state, bitrix24Connection: action.payload };

    case "SET_LISTOK_CONNECTION":
      return { ...state, listokConnection: action.payload };

    case "SET_SYNC_RULES":
      return { ...state, syncRules: action.payload };

    case "ADD_SYNC_RULE":
      return { ...state, syncRules: [...state.syncRules, action.payload] };

    case "UPDATE_SYNC_RULE":
      return {
        ...state,
        syncRules: state.syncRules.map((r) =>
          r.id === action.payload.id ? { ...r, ...action.payload.updates } : r
        ),
      };

    case "DELETE_SYNC_RULE":
      return {
        ...state,
        syncRules: state.syncRules.filter((r) => r.id !== action.payload),
      };

    case "SET_FIELD_MAPPINGS":
      return { ...state, fieldMappings: action.payload };

    case "ADD_FIELD_MAPPING":
      return { ...state, fieldMappings: [...state.fieldMappings, action.payload] };

    case "UPDATE_FIELD_MAPPING":
      return {
        ...state,
        fieldMappings: state.fieldMappings.map((m) =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        ),
      };

    case "DELETE_FIELD_MAPPING":
      return {
        ...state,
        fieldMappings: state.fieldMappings.filter((m) => m.id !== action.payload),
      };

    case "SET_DASHBOARD_STATUS":
      return {
        ...state,
        dashboard: { ...state.dashboard, syncStatus: action.payload },
      };

    case "SET_DASHBOARD_LOGS":
      return { ...state, dashboard: { ...state.dashboard, logs: action.payload } };

    case "ADD_DASHBOARD_LOG":
      return {
        ...state,
        dashboard: { ...state.dashboard, logs: [action.payload, ...state.dashboard.logs] },
      };

    case "SET_DASHBOARD_STATS":
      return { ...state, dashboard: { ...state.dashboard, stats: action.payload } };

    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };

    case "SET_WIZARD_STEP":
      return { ...state, wizardStep: action.payload };

    case "SET_CONNECTION_STATUS":
      if (action.payload.platform === "bitrix24") {
        return {
          ...state,
          bitrix24Connection: state.bitrix24Connection
            ? { ...state.bitrix24Connection, status: action.payload.status }
            : null,
        };
      }
      return {
        ...state,
        listokConnection: state.listokConnection
          ? { ...state.listokConnection, status: action.payload.status }
          : null,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// ── Context ──
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Convenience helpers
  addSyncRule: (rule: Omit<SyncRule, "id">) => void;
  updateSyncRule: (id: string, updates: Partial<SyncRule>) => void;
  removeSyncRule: (id: string) => void;
  addFieldMapping: (mapping: Omit<FieldMapping, "id">) => void;
  updateFieldMapping: (id: string, updates: Partial<FieldMapping>) => void;
  removeFieldMapping: (id: string) => void;
  addLog: (log: Omit<SyncLog, "id" | "timestamp">) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ── Provider ──
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const addSyncRule = useCallback(
    (rule: Omit<SyncRule, "id">) => {
      dispatch({ type: "ADD_SYNC_RULE", payload: { ...rule, id: uuidv4() } });
    },
    []
  );

  const updateSyncRule = useCallback((id: string, updates: Partial<SyncRule>) => {
    dispatch({ type: "UPDATE_SYNC_RULE", payload: { id, updates } });
  }, []);

  const removeSyncRule = useCallback((id: string) => {
    dispatch({ type: "DELETE_SYNC_RULE", payload: id });
  }, []);

  const addFieldMapping = useCallback(
    (mapping: Omit<FieldMapping, "id">) => {
      dispatch({ type: "ADD_FIELD_MAPPING", payload: { ...mapping, id: uuidv4() } });
    },
    []
  );

  const updateFieldMapping = useCallback((id: string, updates: Partial<FieldMapping>) => {
    dispatch({ type: "UPDATE_FIELD_MAPPING", payload: { id, updates } });
  }, []);

  const removeFieldMapping = useCallback((id: string) => {
    dispatch({ type: "DELETE_FIELD_MAPPING", payload: id });
  }, []);

  const addLog = useCallback(
    (log: Omit<SyncLog, "id" | "timestamp">) => {
      dispatch({
        type: "ADD_DASHBOARD_LOG",
        payload: { ...log, id: uuidv4(), timestamp: new Date().toISOString() },
      });
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        addSyncRule,
        updateSyncRule,
        removeSyncRule,
        addFieldMapping,
        updateFieldMapping,
        removeFieldMapping,
        addLog,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ── Hook ──
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}
