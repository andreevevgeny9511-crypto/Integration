/**
 * Database Migration: Initial Schema
 * 
 * PostgreSQL schema for the Bitrix24-Listok integration.
 */

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Integrations table
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    bitrix24_webhook_url TEXT NOT NULL,
    listok_api_key TEXT NOT NULL,
    listok_base_url TEXT DEFAULT 'https://an7236.listokcrm.ru',
    enabled BOOLEAN DEFAULT true,
    sync_interval_minutes INTEGER DEFAULT 60,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Field mappings table
CREATE TABLE IF NOT EXISTS field_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    source_entity VARCHAR(20) NOT NULL CHECK (source_entity IN ('lead', 'deal', 'contact', 'company')),
    source_field VARCHAR(100) NOT NULL,
    target_entity VARCHAR(20) NOT NULL CHECK (target_entity IN ('contact', 'event', 'group', 'pass', 'payment')),
    target_field VARCHAR(100) NOT NULL,
    transform_type VARCHAR(20) CHECK (transform_type IN ('direct', 'format_date', 'format_phone', 'format_email', 'concat', 'split', 'lookup', 'constant', 'custom')),
    transform_params JSONB,
    default_value TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync rules table
CREATE TABLE IF NOT EXISTS sync_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_entity VARCHAR(20) NOT NULL CHECK (source_entity IN ('lead', 'deal', 'contact', 'company')),
    target_entity VARCHAR(20) NOT NULL CHECK (target_entity IN ('contact', 'event')),
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('bitrix24→listok', 'listok→bitrix24', 'bidirectional')),
    field_mapping_ids UUID[] DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync conditions table
CREATE TABLE IF NOT EXISTS sync_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES sync_rules(id) ON DELETE CASCADE,
    field VARCHAR(100) NOT NULL,
    operator VARCHAR(10) NOT NULL CHECK (operator IN ('eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'not_in')),
    value JSONB NOT NULL,
    logic VARCHAR(3) NOT NULL CHECK (logic IN ('AND', 'OR')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync logs table
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES sync_rules(id) ON DELETE SET NULL,
    source_entity_type VARCHAR(20) NOT NULL,
    source_entity_id VARCHAR(50) NOT NULL,
    target_entity_type VARCHAR(20) NOT NULL,
    target_entity_id VARCHAR(50),
    direction VARCHAR(20) NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync runs table
CREATE TABLE IF NOT EXISTS sync_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Integration users (many-to-many)
CREATE TABLE IF NOT EXISTS integration_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(10) NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(integration_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_field_mappings_integration ON field_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_rules_integration ON sync_rules(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_conditions_rule ON sync_conditions(rule_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_executed_at ON sync_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_integration ON sync_runs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_runs_status ON sync_runs(status);
CREATE INDEX IF NOT EXISTS idx_integration_users_integration ON integration_users(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_users_user ON integration_users(user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_field_mappings_updated_at BEFORE UPDATE ON field_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_rules_updated_at BEFORE UPDATE ON sync_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_conditions_updated_at BEFORE UPDATE ON sync_conditions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
