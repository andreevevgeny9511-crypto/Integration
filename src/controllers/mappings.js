// ============================================================
// Bitrix24 ↔ Listok Integration — Mappings Controller
// ============================================================

const { query } = require('../db/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * List field mappings for an integration
 */
async function list(req, res) {
  try {
    const { integration_id } = req.query;
    let result;

    if (integration_id) {
      result = await query(
        `SELECT * FROM field_mappings
         WHERE integration_id = $1 AND is_active = true
         ORDER BY source_entity, source_field`,
        [integration_id]
      );
    } else {
      result = await query(
        'SELECT * FROM field_mappings WHERE is_active = true ORDER BY created_at DESC'
      );
    }

    res.json({ data: result.rows, total: result.rows.length });
  } catch (err) {
    logger.error('Failed to list field mappings', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve field mappings' });
  }
}

/**
 * Get available fields for a specific entity type
 */
async function listByEntity(req, res) {
  try {
    const { entityTypeId } = req.params;

    // Return available Bitrix24 fields for the entity type
    const bitrixFields = getBitrix24Fields(entityTypeId);
    const listokFields = getListokFields();

    res.json({
      data: {
        sourceEntity: entityTypeId,
        bitrix24Fields: bitrixFields,
        listokFields: listokFields,
      },
    });
  } catch (err) {
    logger.error('Failed to get entity fields', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve entity fields' });
  }
}

/**
 * Create a field mapping
 */
async function create(req, res) {
  try {
    const {
      integration_id,
      source_entity,
      source_field,
      target_entity,
      target_field,
      transform_type,
      transform_params,
      default_value,
    } = req.body;

    if (!integration_id || !source_entity || !source_field || !target_entity || !target_field) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'integration_id, source_entity, source_field, target_entity, and target_field are required',
      });
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO field_mappings
       (id, integration_id, source_entity, source_field, target_entity, target_field,
        transform_type, transform_params, default_value, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING *`,
      [id, integration_id, source_entity, source_field, target_entity, target_field,
       transform_type || null, transform_params ? JSON.stringify(transform_params) : null, default_value || null]
    );

    logger.info('Field mapping created', { id, integration_id, source_field, target_field });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to create field mapping', { error: err.message });
    res.status(500).json({ error: 'Failed to create field mapping' });
  }
}

/**
 * Get a single field mapping
 */
async function get(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM field_mappings WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field mapping not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to get field mapping', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve field mapping' });
  }
}

/**
 * Update a field mapping
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { source_field, target_field, transform_type, transform_params, default_value, is_active } = req.body;

    const result = await query(
      `UPDATE field_mappings SET
        source_field = COALESCE($1, source_field),
        target_field = COALESCE($2, target_field),
        transform_type = COALESCE($3, transform_type),
        transform_params = COALESCE($4, transform_params),
        default_value = COALESCE($5, default_value),
        is_active = COALESCE($6, is_active),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [source_field, target_field, transform_type,
       transform_params ? JSON.stringify(transform_params) : null,
       default_value, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field mapping not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to update field mapping', { error: err.message });
    res.status(500).json({ error: 'Failed to update field mapping' });
  }
}

/**
 * Delete a field mapping (soft delete)
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      'UPDATE field_mappings SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field mapping not found' });
    }
    res.json({ message: 'Field mapping deactivated successfully' });
  } catch (err) {
    logger.error('Failed to delete field mapping', { error: err.message });
    res.status(500).json({ error: 'Failed to delete field mapping' });
  }
}

/**
 * Get available Bitrix24 fields for an entity type
 */
function getBitrix24Fields(entityTypeId) {
  const fields = {
    lead: [
      { code: 'TITLE', label: 'Title', type: 'string' },
      { code: 'NAME', label: 'First Name', type: 'string' },
      { code: 'LAST_NAME', label: 'Last Name', type: 'string' },
      { code: 'SECOND_NAME', label: 'Middle Name', type: 'string' },
      { code: 'BIRTHDATE', label: 'Birth Date', type: 'date' },
      { code: 'COMPANY_TITLE', label: 'Company Name', type: 'string' },
      { code: 'SOURCE_ID', label: 'Source', type: 'status' },
      { code: 'STATUS_ID', label: 'Status', type: 'status' },
      { code: 'OPPORTUNITY', label: 'Amount', type: 'double' },
      { code: 'CURRENCY_ID', label: 'Currency', type: 'string' },
      { code: 'PHONE', label: 'Phone', type: 'multifield' },
      { code: 'EMAIL', label: 'Email', type: 'multifield' },
      { code: 'WEB', label: 'Website', type: 'multifield' },
      { code: 'ADDRESS', label: 'Address', type: 'string' },
      { code: 'ADDRESS_CITY', label: 'City', type: 'string' },
      { code: 'ADDRESS_POSTAL_CODE', label: 'Postal Code', type: 'string' },
      { code: 'COMMENTS', label: 'Comments', type: 'text' },
      { code: 'UTM_SOURCE', label: 'UTM Source', type: 'string' },
      { code: 'UTM_MEDIUM', label: 'UTM Medium', type: 'string' },
      { code: 'UTM_CAMPAIGN', label: 'UTM Campaign', type: 'string' },
      { code: 'UTM_CONTENT', label: 'UTM Content', type: 'string' },
      { code: 'UTM_TERM', label: 'UTM Term', type: 'string' },
    ],
    deal: [
      { code: 'TITLE', label: 'Title', type: 'string' },
      { code: 'TYPE_ID', label: 'Deal Type', type: 'status' },
      { code: 'CATEGORY_ID', label: 'Pipeline', type: 'category' },
      { code: 'STAGE_ID', label: 'Stage', type: 'status' },
      { code: 'OPPORTUNITY', label: 'Amount', type: 'double' },
      { code: 'CURRENCY_ID', label: 'Currency', type: 'string' },
      { code: 'PROBABILITY', label: 'Probability', type: 'integer' },
      { code: 'CONTACT_IDS', label: 'Contact IDs', type: 'array' },
      { code: 'COMPANY_ID', label: 'Company ID', type: 'integer' },
      { code: 'BEGINDATE', label: 'Start Date', type: 'date' },
      { code: 'CLOSEDATE', label: 'Close Date', type: 'date' },
      { code: 'IS_CLOSED', label: 'Is Closed', type: 'char' },
      { code: 'IS_NEW', label: 'Is New', type: 'char' },
      { code: 'IS_RETURN_CUSTOMER', label: 'Is Return Customer', type: 'char' },
      { code: 'COMMENTS', label: 'Comments', type: 'text' },
      { code: 'UTM_SOURCE', label: 'UTM Source', type: 'string' },
      { code: 'UTM_MEDIUM', label: 'UTM Medium', type: 'string' },
      { code: 'UTM_CAMPAIGN', label: 'UTM Campaign', type: 'string' },
    ],
    contact: [
      { code: 'NAME', label: 'First Name', type: 'string' },
      { code: 'LAST_NAME', label: 'Last Name', type: 'string' },
      { code: 'SECOND_NAME', label: 'Middle Name', type: 'string' },
      { code: 'HONORIFIC', label: 'Salutation', type: 'status' },
      { code: 'BIRTHDATE', label: 'Birth Date', type: 'date' },
      { code: 'TYPE_ID', label: 'Contact Type', type: 'status' },
      { code: 'SOURCE_ID', label: 'Source', type: 'status' },
      { code: 'PHONE', label: 'Phone', type: 'multifield' },
      { code: 'EMAIL', label: 'Email', type: 'multifield' },
      { code: 'WEB', label: 'Website', type: 'multifield' },
      { code: 'ADDRESS', label: 'Address', type: 'string' },
      { code: 'ADDRESS_CITY', label: 'City', type: 'string' },
      { code: 'ADDRESS_POSTAL_CODE', label: 'Postal Code', type: 'string' },
      { code: 'POST', label: 'Position', type: 'string' },
      { code: 'COMMENTS', label: 'Comments', type: 'text' },
    ],
    company: [
      { code: 'TITLE', label: 'Company Name', type: 'string' },
      { code: 'COMPANY_TYPE', label: 'Company Type', type: 'status' },
      { code: 'INDUSTRY', label: 'Industry', type: 'string' },
      { code: 'REVENUE', label: 'Revenue', type: 'double' },
      { code: 'CURRENCY_ID', label: 'Currency', type: 'string' },
      { code: 'PHONE', label: 'Phone', type: 'multifield' },
      { code: 'EMAIL', label: 'Email', type: 'multifield' },
      { code: 'WEB', label: 'Website', type: 'multifield' },
      { code: 'ADDRESS', label: 'Address', type: 'string' },
      { code: 'ADDRESS_CITY', label: 'City', type: 'string' },
      { code: 'ADDRESS_POSTAL_CODE', label: 'Postal Code', type: 'string' },
      { code: 'ADDRESS_LEGAL', label: 'Legal Address', type: 'string' },
      { code: 'COMMENTS', label: 'Comments', type: 'text' },
    ],
  };

  return fields[entityTypeId] || [];
}

/**
 * Get available Listok fields
 */
function getListokFields() {
  return [
    { code: 'name', label: 'Full Name', type: 'string' },
    { code: 'phone', label: 'Phone', type: 'string' },
    { code: 'email', label: 'Email', type: 'string' },
    { code: 'birth_date', label: 'Birth Date', type: 'date' },
    { code: 'gender', label: 'Gender', type: 'string' },
    { code: 'customer_status', label: 'Customer Status', type: 'string' },
    { code: 'source_id', label: 'Source ID', type: 'integer' },
    { code: 'note', label: 'Note', type: 'text' },
    { code: 'sticky_note', label: 'Sticky Note', type: 'text' },
    { code: 'barcode', label: 'Barcode', type: 'string' },
    { code: 'balance', label: 'Balance', type: 'number' },
    { code: 'bonus_balance', label: 'Bonus Balance', type: 'number' },
    { code: 'parent_name', label: 'Parent Name', type: 'string' },
    { code: 'parent_phone', label: 'Parent Phone', type: 'string' },
    { code: 'parent_email', label: 'Parent Email', type: 'string' },
    { code: 'custom_fields', label: 'Custom Fields', type: 'array' },
  ];
}

/**
 * Bulk update field mappings
 */
async function bulkUpdate(req, res) {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings)) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'mappings must be an array',
      });
    }

    const results = [];
    for (const mapping of mappings) {
      const { id, source_field, target_field, transform_type, transform_params, default_value, is_active } = mapping;

      if (id) {
        // Update existing mapping
        const result = await query(
          `UPDATE field_mappings SET
            source_field = COALESCE($1, source_field),
            target_field = COALESCE($2, target_field),
            transform_type = COALESCE($3, transform_type),
            transform_params = COALESCE($4, transform_params),
            default_value = COALESCE($5, default_value),
            is_active = COALESCE($6, is_active),
            updated_at = NOW()
           WHERE id = $7 RETURNING *`,
          [source_field, target_field, transform_type,
           transform_params ? JSON.stringify(transform_params) : null,
           default_value, is_active, id]
        );
        results.push(result.rows[0]);
      } else {
        // Create new mapping
        const newId = uuidv4();
        const result = await query(
          `INSERT INTO field_mappings
           (id, integration_id, source_entity, source_field, target_entity, target_field,
            transform_type, transform_params, default_value, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
           RETURNING *`,
          [newId, mapping.integration_id, mapping.source_entity, source_field,
           mapping.target_entity, target_field, transform_type,
           transform_params ? JSON.stringify(transform_params) : null, default_value]
        );
        results.push(result.rows[0]);
      }
    }

    res.json({ data: results, total: results.length });
  } catch (err) {
    logger.error('Failed to bulk update field mappings', { error: err.message });
    res.status(500).json({ code: 'BULK_UPDATE_ERROR', message: 'Failed to bulk update field mappings' });
  }
}

module.exports = { list, listByEntity, create, get, update, remove, bulkUpdate };
