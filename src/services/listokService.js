// ============================================================
// Bitrix24 ↔ Listok Integration — Listok Service
// ============================================================

const axios = require('axios');
const { query } = require('../db/client');
const logger = require('../utils/logger');

/**
 * Sync Listok contacts to Bitrix24
 */
async function syncToListok(integration, job) {
  const bitrix24 = createBitrix24Client(integration);
  const listok = createListokClient(integration);

  const rule = await getSyncRule(job.sync_rule_id);
  if (!rule) throw new Error('Sync rule not found');

  const mappings = await getFieldMappings(integration.id, rule.field_mapping_ids);
  const conditions = await getSyncConditions(rule.id);

  // Fetch contacts from Listok
  const contacts = await listok.listContacts({ page: 1 });

  let processed = 0;
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const contact of contacts) {
    processed++;

    try {
      if (!evaluateConditions(contact, conditions)) {
        continue;
      }

      const bitrix24Data = mapToBitrix24(contact, mappings);

      // Check if target exists in Bitrix24
      const existing = await findExistingBitrix24Entity(bitrix24, contact);

      if (existing) {
        if (existing.ID) {
          await bitrix24.updateContact(existing.ID, bitrix24Data);
        }
        updated++;
      } else {
        await bitrix24.addContact(bitrix24Data);
        created++;
      }

      await logSync(integration.id, rule.id, String(contact.contact_id), 'success');
    } catch (err) {
      failed++;
      logger.error('Listok sync error', { contactId: contact.contact_id, error: err.message });
      await logSync(integration.id, rule.id, String(contact.contact_id), 'failed', err.message);
    }
  }

  return { processed, created, updated, failed };
}

/**
 * Sync Bitrix24 leads to Listok
 */
async function syncToBitrix24(integration, job) {
  const bitrix24 = createBitrix24Client(integration);
  const listok = createListokClient(integration);

  const rule = await getSyncRule(job.sync_rule_id);
  if (!rule) throw new Error('Sync rule not found');

  const mappings = await getFieldMappings(integration.id, rule.field_mapping_ids);
  const conditions = await getSyncConditions(rule.id);

  // Fetch leads from Bitrix24
  const entities = await fetchBitrix24Entities(bitrix24, rule.source_entity, job);

  let processed = 0;
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const entity of entities) {
    processed++;

    try {
      if (!evaluateConditions(entity, conditions)) {
        continue;
      }

      const listokData = mapToListok(entity, mappings);

      // Check if target exists in Listok
      const existing = await findExistingListokContact(listok, entity);

      if (existing) {
        await listok.updateContact(existing.contact_id, listokData);
        updated++;
      } else {
        await listok.createContact(listokData);
        created++;
      }

      await logSync(integration.id, rule.id, String(entity.ID || entity.id), 'success');
    } catch (err) {
      failed++;
      logger.error('Bitrix24 sync error', { entityId: entity.ID, error: err.message });
      await logSync(integration.id, rule.id, String(entity.ID || entity.id), 'failed', err.message);
    }
  }

  return { processed, created, updated, failed };
}

/**
 * Create Bitrix24 API client
 */
function createBitrix24Client(integration) {
  const webhookUrl = integration.bitrix24_webhook_url ||
    `https://${integration.bitrix24_domain}/rest/1/${integration.bitrix24_token}/`;

  return {
    get: async (method, params = {}) => {
      const url = `${webhookUrl}${method}`;
      const response = await axios.post(url, params);
      return response.data;
    },
    post: async (method, params = {}) => {
      const url = `${webhookUrl}${method}`;
      const response = await axios.post(url, params);
      return response.data;
    },
    put: async (method, params = {}) => {
      const url = `${webhookUrl}${method}`;
      const response = await axios.post(url, params);
      return response.data;
    },
  };
}

/**
 * Create Listok API client
 */
function createListokClient(integration) {
  const baseUrl = integration.listok_base_url || 'https://api.listok.ru';
  const apiKey = integration.listok_api_key;

  return {
    get: async (path, params = {}) => {
      const url = `${baseUrl}${path}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        params,
      });
      return response.data;
    },
    post: async (path, data = {}) => {
      const url = `${baseUrl}${path}`;
      const response = await axios.post(url, data, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.data;
    },
    put: async (path, data = {}) => {
      const url = `${baseUrl}${path}`;
      const response = await axios.put(url, data, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.data;
    },
    listContacts: async (params) => {
      const url = `${baseUrl}/api/external/v2/contacts`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        params,
      });
      return response.data.data || [];
    },
    createContact: async (contact) => {
      const url = `${baseUrl}/api/external/v2/contacts`;
      const response = await axios.post(url, contact, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.data;
    },
    updateContact: async (id, contact) => {
      const url = `${baseUrl}/api/external/v2/contacts/${id}`;
      const response = await axios.put(url, contact, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.data;
    },
  };
}

/**
 * Fetch entities from Bitrix24
 */
async function fetchBitrix24Entities(bitrix24, entityType, job) {
  switch (entityType) {
    case 'lead': {
      const result = await bitrix24.get('crm.lead.list', {
        select: ['*'],
        filter: job.last_sync_at ? { '>DATE_MODIFY': job.last_sync_at } : {},
        start: 0,
      });
      return result.result || [];
    }
    case 'deal': {
      const result = await bitrix24.get('crm.deal.list', {
        select: ['*'],
        filter: job.last_sync_at ? { '>DATE_MODIFY': job.last_sync_at } : {},
        start: 0,
      });
      return result.result || [];
    }
    case 'contact': {
      const result = await bitrix24.get('crm.contact.list', {
        select: ['*'],
        filter: job.last_sync_at ? { '>DATE_MODIFY': job.last_sync_at } : {},
        start: 0,
      });
      return result.result || [];
    }
    case 'company': {
      const result = await bitrix24.get('crm.company.list', {
        select: ['*'],
        filter: job.last_sync_at ? { '>DATE_MODIFY': job.last_sync_at } : {},
        start: 0,
      });
      return result.result || [];
    }
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Get sync rule by ID
 */
async function getSyncRule(ruleId) {
  const result = await query('SELECT * FROM sync_rules WHERE id = $1', [ruleId]);
  return result.rows[0] || null;
}

/**
 * Get field mappings for an integration
 */
async function getFieldMappings(integrationId, mappingIds) {
  if (mappingIds && mappingIds.length > 0) {
    const result = await query(
      'SELECT * FROM field_mappings WHERE id = ANY($1) AND is_active = true',
      [mappingIds]
    );
    return result.rows;
  }

  const result = await query(
    'SELECT * FROM field_mappings WHERE integration_id = $1 AND is_active = true',
    [integrationId]
  );
  return result.rows;
}

/**
 * Get sync conditions for a rule
 */
async function getSyncConditions(ruleId) {
  const result = await query(
    'SELECT * FROM sync_conditions WHERE rule_id = $1',
    [ruleId]
  );
  return result.rows;
}

/**
 * Evaluate sync conditions against an entity
 */
function evaluateConditions(entity, conditions) {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every(condition => {
    const entityValue = getNestedValue(entity, condition.field);
    return compareValues(entityValue, condition.operator, condition.value);
  });
}

/**
 * Compare a value against a condition
 */
function compareValues(entityValue, operator, conditionValue) {
  switch (operator) {
    case 'eq':
      return String(entityValue) === String(conditionValue);
    case 'neq':
      return String(entityValue) !== String(conditionValue);
    case 'gt':
      return Number(entityValue) > Number(conditionValue);
    case 'gte':
      return Number(entityValue) >= Number(conditionValue);
    case 'lt':
      return Number(entityValue) < Number(conditionValue);
    case 'lte':
      return Number(entityValue) <= Number(conditionValue);
    case 'contains':
      return String(entityValue || '').includes(String(conditionValue));
    case 'in':
      return Array.isArray(conditionValue) && conditionValue.includes(String(entityValue));
    case 'not_in':
      return Array.isArray(conditionValue) && !conditionValue.includes(String(entityValue));
    default:
      return true;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Map source entity fields to Listok contact fields
 */
function mapToListok(source, mappings) {
  const target = {};

  for (const mapping of mappings) {
    const sourceValue = getNestedValue(source, mapping.source_field);
    let value = sourceValue;

    if (mapping.transform_type && mapping.transform_type !== 'direct') {
      value = applyTransform(sourceValue, mapping.transform_type, mapping.transform_params);
    }

    if ((value === undefined || value === null || value === '') && mapping.default_value) {
      value = mapping.default_value;
    }

    target[mapping.target_field] = value;
  }

  return target;
}

/**
 * Map source entity fields to Bitrix24 contact fields
 */
function mapToBitrix24(source, mappings) {
  const target = {};

  for (const mapping of mappings) {
    const sourceValue = getNestedValue(source, mapping.source_field);
    let value = sourceValue;

    if (mapping.transform_type && mapping.transform_type !== 'direct') {
      value = applyTransform(sourceValue, mapping.transform_type, mapping.transform_params);
    }

    if ((value === undefined || value === null || value === '') && mapping.default_value) {
      value = mapping.default_value;
    }

    target[mapping.target_field] = value;
  }

  return target;
}

/**
 * Apply a transformation to a value
 */
function applyTransform(value, transformType, params) {
  switch (transformType) {
    case 'format_phone':
      return String(value || '').replace(/[\s\-\(\)]/g, '');
    case 'format_email':
      return String(value || '').toLowerCase().trim();
    case 'format_date':
      return new Date(value).toISOString().split('T')[0];
    case 'concat':
      return params?.fields?.map(f => getNestedValue(value, f)).join(params?.separator || ' ');
    case 'split':
      return String(value || '').split(params?.separator || ',');
    case 'constant':
      return params?.value;
    case 'lookup':
      return params?.map?.[value] ?? value;
    case 'uppercase':
      return String(value || '').toUpperCase();
    case 'lowercase':
      return String(value || '').toLowerCase();
    case 'prefix':
      return `${params?.prefix || ''}${value}`;
    case 'suffix':
      return `${value}${params?.suffix || ''}`;
    case 'direct':
    default:
      return value;
  }
}

/**
 * Find existing Listok contact by phone or email
 */
async function findExistingListokContact(listok, entity) {
  const phone = getNestedValue(entity, 'PHONE.0.VALUE') || entity.phone;
  const email = getNestedValue(entity, 'EMAIL.0.VALUE') || entity.email;

  if (phone) {
    const contacts = await listok.listContacts({ phone });
    if (contacts.length > 0) return contacts[0];
  }

  if (email) {
    const contacts = await listok.listContacts({ email });
    if (contacts.length > 0) return contacts[0];
  }

  return null;
}

/**
 * Find existing Bitrix24 entity by phone or email
 */
async function findExistingBitrix24Entity(bitrix24, contact) {
  if (contact.phone) {
    const leads = await bitrix24.get('crm.lead.list', { filter: { PHONE: contact.phone } });
    if (leads.result && leads.result.length > 0) return leads.result[0];

    const contacts = await bitrix24.get('crm.contact.list', { filter: { PHONE: contact.phone } });
    if (contacts.result && contacts.result.length > 0) return contacts.result[0];
  }

  if (contact.email) {
    const leads = await bitrix24.get('crm.lead.list', { filter: { EMAIL: contact.email } });
    if (leads.result && leads.result.length > 0) return leads.result[0];

    const contacts = await bitrix24.get('crm.contact.list', { filter: { EMAIL: contact.email } });
    if (contacts.result && contacts.result.length > 0) return contacts.result[0];
  }

  return null;
}

/**
 * Log a sync operation
 */
async function logSync(integrationId, ruleId, sourceEntityId, status, errorMessage = null) {
  await query(
    `INSERT INTO sync_logs (id, integration_id, sync_rule_id, source_entity_id, status, error_message, executed_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [require('uuid').v4(), integrationId, ruleId, sourceEntityId, status, errorMessage]
  );
}

module.exports = { syncToListok, syncToBitrix24 };
