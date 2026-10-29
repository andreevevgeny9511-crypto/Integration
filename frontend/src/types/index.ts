// ============================================================
// Core types for Bitrix24 ↔ Listok Integration
// ============================================================

export type EntityType = "lead" | "deal" | "contact" | "company";

export type ListokEntityType = "contact" | "group" | "pass" | "payment";

export type SyncDirection = "bitrix24_to_listok" | "listok_to_bitrix24" | "bidirectional";

export type SyncStatus = "idle" | "running" | "completed" | "failed" | "paused";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export type FieldType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "multifield"
  | "enum"
  | "currency"
  | "custom";

export interface Bitrix24Field {
  name: string;
  label: string;
  type: FieldType;
  entityType: EntityType;
  required: boolean;
  options?: string[];
  description?: string;
}

export interface ListokField {
  name: string;
  label: string;
  type: FieldType;
  entityType: ListokEntityType;
  required: boolean;
  options?: string[];
  description?: string;
}

export interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
  sourceEntity: EntityType;
  targetEntity: ListokEntityType;
  transform?: "none" | "uppercase" | "lowercase" | "trim" | "date_format" | "currency_convert" | "phone_normalize" | "email_normalize" | "prefix" | "suffix" | "custom";
  transformValue?: string;
  enabled: boolean;
}

export interface SyncCondition {
  id: string;
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "not_contains" | "in" | "not_in" | "is_empty" | "is_not_empty";
  value: string;
  entityType: EntityType;
  logic: "AND" | "OR";
}

export interface SyncSchedule {
  id: string;
  name: string;
  enabled: boolean;
  frequency: "manual" | "hourly" | "every_6h" | "every_12h" | "daily" | "weekly";
  dayOfWeek?: number;
  timeOfDay?: string;
  lastRun?: string;
  nextRun?: string;
}

export interface SyncRule {
  id: string;
  name: string;
  description: string;
  sourceEntity: EntityType;
  targetEntity: ListokEntityType;
  direction: SyncDirection;
  conditions: SyncCondition[];
  fieldMappings: FieldMapping[];
  schedule: SyncSchedule;
  enabled: boolean;
}

export interface Bitrix24ConnectionConfig {
  id: string;
  name: string;
  domain: string;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number | null;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListokConnectionConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  ruleId: string;
  ruleName: string;
  status: "success" | "error" | "warning" | "info";
  message: string;
  details?: string;
  entityType: EntityType;
  entityId: string;
  timestamp: string;
  duration?: number;
}

export interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  entitiesSynced: number;
  lastSyncAt: string | null;
  avgDuration: number;
  syncsByDay: { date: string; count: number; success: number; failed: number }[];
  entitiesByType: { type: EntityType; count: number }[];
}

export interface DashboardState {
  syncStatus: SyncStatus;
  logs: SyncLog[];
  stats: SyncStats;
  activeRules: number;
  lastSyncAt: string | null;
}

export interface AppState {
  bitrix24Connection: Bitrix24ConnectionConfig | null;
  listokConnection: ListokConnectionConfig | null;
  syncRules: SyncRule[];
  fieldMappings: FieldMapping[];
  dashboard: DashboardState;
  activeTab: string;
  wizardStep: number;
}

// Wizard step definitions
export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: "connections", title: "Подключения", description: "Подключите Bitrix24 и Listok", icon: "🔌" },
  { id: "mapping", title: "Сопоставление полей", description: "Настройте маппинг полей между системами", icon: "🔀" },
  { id: "rules", title: "Правила синхронизации", description: "Задайте условия и расписание синхронизации", icon: "⚙️" },
  { id: "review", title: "Проверка", description: "Проверьте настройки и запустите синхронизацию", icon: "✅" },
];
