-- ============================================================
-- Bitrix24 ↔ Listok Integration — Database Schema
-- ============================================================
-- Run as part of docker-entrypoint-initdb.d/migrations/
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Integrations — stored Bitrix24 & Listok account connections
-- ============================================================
CREATE TABLE IF NOT EXISTS integrations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    bitrix24_domain VARCHAR(255) NOT NULL,
    bitrix24_token  TEXT NOT NULL,
    listok_api_key  TEXT NOT NULL,
    listok_base_url VARCHAR(500) DEFAULT 'https://api.listok.ru',
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'error', 'pending')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);

-- ============================================================
-- 2. Entity Types — supported sync targets
-- ============================================================
CREATE TABLE IF NOT EXISTS entity_types (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    bitrix24_entity VARCHAR(50) NOT NULL,  -- e.g. 'CRM_DEAL', 'CRM_CONTACT', 'CRM_COMPANY'
    listok_entity     VARCHAR(100) NOT NULL  -- e.g. 'deal', 'contact', 'company'
);

INSERT INTO entity_types (name, description, bitrix24_entity, listok_entity) VALUES
    ('deal',    'CRM deals',            'CRM_DEAL',    'deal'),
    ('contact', 'CRM contacts',         'CRM_CONTACT', 'contact'),
    ('company', 'CRM companies',        'CRM_COMPANY', 'company'),
    ('lead',    'CRM leads',            'CRM_LEAD',    'lead')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 3. Field Mappings — Bitrix24 ↔ Listok field correspondence
-- ============================================================
CREATE TABLE IF NOT EXISTS field_mappings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id  UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    entity_type_id  INTEGER NOT NULL REFERENCES entity_types(id) ON DELETE CASCADE,
    bitrix24_field  VARCHAR(255) NOT NULL,
    listok_field    VARCHAR(255) NOT NULL,
    mapping_type    VARCHAR(20) NOT NULL DEFAULT 'direct'
        CHECK (mapping_type IN ('direct', 'transform', 'constant', 'lookup')),
    transform_expr  TEXT,          -- JS expression for transform mappings
    constant_value  TEXT,          -- value for constant mappings
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(integration_id, entity_type_id, bitrix24_field, listok_field)
);

CREATE INDEX IF NOT EXISTS idx_field_mappings_integration ON field_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_entity ON field_mappings(entity_type_id);

-- ============================================================
-- 4. Sync Rules — conditions and triggers for synchronization
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id  UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    entity_type_id  INTEGER NOT NULL REFERENCES entity_types(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    direction       VARCHAR(10) NOT NULL DEFAULT 'bidirectional'
        CHECK (direction IN ('bitrix24_to_listok', 'listok_to_bitrix24', 'bidirectional')),
    trigger_type    VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (trigger_type IN ('manual', 'scheduled', 'webhook', 'event')),
    schedule_cron   VARCHAR(100),     -- cron expression for scheduled syncs
    conditions      JSONB DEFAULT '{}',  -- filter conditions, e.g. {"stage": "NEW", "amount_min": 1000}
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_rules_integration ON sync_rules(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_rules_entity ON sync_rules(entity_type_id);
CREATE INDEX IF NOT EXISTS idx_sync_rules_conditions ON sync_rules USING GIN (conditions);

-- ============================================================
-- 5. Sync Logs — audit trail of all sync operations
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id  UUID NOT NULL REFERENCES integrations(id),
    entity_type_id  INTEGER NOT NULL REFERENCES entity_types(id),
    sync_rule_id    UUID REFERENCES sync_rules(id),
    direction       VARCHAR(20) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'completed', 'failed', 'partial')),
    records_processed INTEGER DEFAULT 0,
    records_success   INTEGER DEFAULT 0,
    records_failed    INTEGER DEFAULT 0,
    error_message     TEXT,
    metadata        JSONB DEFAULT '{}',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    duration_ms     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(started_at DESC);

-- ============================================================
-- 6. Sync Queue — pending sync jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_queue (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id  UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    entity_type_id  INTEGER NOT NULL REFERENCES entity_types(id) ON DELETE CASCADE,
    sync_rule_id    UUID REFERENCES sync_rules(id),
    entity_id       VARCHAR(255),     -- external entity ID from source system
    payload         JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'retrying')),
    retry_count     INTEGER DEFAULT 0,
    max_retries     INTEGER DEFAULT 3,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_scheduled ON sync_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_integration ON sync_queue(integration_id);

-- ============================================================
-- 7. Webhook Configs — incoming webhook endpoints
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_configs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id  UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    url             TEXT NOT NULL,
    secret          TEXT,
    events          TEXT[] NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_configs_integration ON webhook_configs(integration_id);

-- ============================================================
-- 8. User Preferences — per-user UI/API preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         VARCHAR(255) NOT NULL,
    integration_id  UUID REFERENCES integrations(id) ON DELETE CASCADE,
    preferences     JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, integration_id)
);

-- ============================================================
-- 9. Audit Log — tracks configuration changes
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         VARCHAR(255),
    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================================
-- Helper: update updated_at automatically
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_field_mappings_updated_at
    BEFORE UPDATE ON field_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sync_rules_updated_at
    BEFORE UPDATE ON sync_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_webhook_configs_updated_at
    BEFORE UPDATE ON webhook_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Comments for documentation
-- ============================================================
COMMENT ON TABLE integrations IS 'Stored Bitrix24 and Listok account connections';
COMMENT ON TABLE field_mappings IS 'Field correspondence between Bitrix24 and Listok entities';
COMMENT ON TABLE sync_rules IS 'Conditions and triggers that govern sync behavior';
COMMENT ON TABLE sync_logs IS 'Audit trail of all synchronization operations';
COMMENT ON TABLE sync_queue IS 'Pending sync jobs awaiting processing';
COMMENT ON TABLE webhook_configs IS 'Incoming webhook endpoint configurations';
COMMENT ON TABLE audit_log IS 'Tracks all configuration changes for compliance';
