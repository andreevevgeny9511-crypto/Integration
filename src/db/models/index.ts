/**
 * Database Models
 * 
 * Type definitions for the PostgreSQL database schema.
 * Used with Drizzle ORM or Prisma for migrations and queries.
 */

// ===== Integrations =====

export interface Integration {
  id: string;
  name: string;
  bitrix24_webhook_url: string;
  listok_api_key: string;
  listok_base_url: string;
  enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

// ===== Field Mappings =====

export interface FieldMapping {
  id: string;
  integration_id: string;
  source_entity: 'lead' | 'deal' | 'contact' | 'company';
  source_field: string;
  target_entity: 'contact' | 'event' | 'group' | 'pass' | 'payment';
  target_field: string;
  transform_type: 'direct' | 'format_date' | 'format_phone' | 'format_email' | 'concat' | 'split' | 'lookup' | 'constant' | 'custom' | null;
  transform_params: Record<string, any> | null;
  default_value: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ===== Sync Rules =====

export interface SyncRule {
  id: string;
  integration_id: string;
  name: string;
  source_entity: 'lead' | 'deal' | 'contact' | 'company';
  target_entity: 'contact' | 'event';
  direction: 'bitrix24→listok' | 'listok→bitrix24' | 'bidirectional';
  field_mapping_ids: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ===== Sync Conditions =====

export interface SyncCondition {
  id: string;
  rule_id: string;
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'not_in';
  value: string | number | string[];
  logic: 'AND' | 'OR';
  created_at: string;
  updated_at: string;
}

// ===== Sync Logs =====

export interface SyncLog {
  id: string;
  integration_id: string;
  rule_id: string;
  source_entity_type: 'lead' | 'deal' | 'contact' | 'company';
  source_entity_id: string;
  target_entity_type: 'contact' | 'event';
  target_entity_id: string | null;
  direction: 'bitrix24→listok' | 'listok→bitrix24';
  status: 'success' | 'failed' | 'skipped';
  error_message: string | null;
  executed_at: string;
  created_at: string;
}

// ===== Sync Execution Runs =====

export interface SyncRun {
  id: string;
  integration_id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  error_message: string | null;
}

// ===== User Accounts =====

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

// ===== Integration Users (many-to-many) =====

export interface IntegrationUser {
  id: string;
  integration_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
}
