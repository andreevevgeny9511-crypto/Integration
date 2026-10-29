// ============================================================
// Bitrix24 ↔ Listok Integration — Sync Rules Controller
// ============================================================

const { query } = require('../db/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * List all sync rules
 */
async function list(req, res) {
  try {
    const { integration_id } = req.query;
    let result;

    if (integration_id) {
      result = await query(
        'SELECT * FROM sync_rules WHERE integration_id = $1 ORDER BY created_at DESC',
        [integration_id]
      );
    } else {
      result = await query('SELECT * FROM sync_rules ORDER BY created_at DESC');
    }

    res.json({ data: result.rows, total: result.rows.length });
  } catch (err) {
    logger.error('Failed to list sync rules', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve sync rules' });
  }
}

/**
 * Create a new sync rule
 */
async function create(req, res) {
  try {
    const {
      integration_id,
      name,
      source_entity,
      target_entity,
      direction,
      field_mapping_ids,
      enabled,
    } = req.body;

    if (!integration_id || !name || !source_entity || !target_entity || !direction) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'integration_id, name, source_entity, target_entity, and direction are required',
      });
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO sync_rules
       (id, integration_id, name, source_entity, target_entity, direction,
        field_mapping_ids, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, integration_id, name, source_entity, target_entity, direction,
       field_mapping_ids || [], enabled !== false]
    );

    logger.info('Sync rule created', { id, name, integration_id });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to create sync rule', { error: err.message });
    res.status(500).json({ error: 'Failed to create sync rule' });
  }
}

/**
 * Get a single sync rule
 */
async function get(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM sync_rules WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sync rule not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to get sync rule', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve sync rule' });
  }
}

/**
 * Update a sync rule
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, source_entity, target_entity, direction, field_mapping_ids, enabled } = req.body;

    const result = await query(
      `UPDATE sync_rules SET
        name = COALESCE($1, name),
        source_entity = COALESCE($2, source_entity),
        target_entity = COALESCE($3, target_entity),
        direction = COALESCE($4, direction),
        field_mapping_ids = COALESCE($5, field_mapping_ids),
        enabled = COALESCE($6, enabled),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, source_entity, target_entity, direction,
       field_mapping_ids, enabled, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sync rule not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to update sync rule', { error: err.message });
    res.status(500).json({ error: 'Failed to update sync rule' });
  }
}

/**
 * Toggle a sync rule (enable/disable)
 */
async function toggle(req, res) {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    const result = await query(
      'UPDATE sync_rules SET enabled = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [enabled, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sync rule not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to toggle sync rule', { error: err.message });
    res.status(500).json({ error: 'Failed to toggle sync rule' });
  }
}

/**
 * Delete a sync rule (soft delete by deactivating)
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM sync_rules WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sync rule not found' });
    }
    res.json({ message: 'Sync rule deleted successfully' });
  } catch (err) {
    logger.error('Failed to delete sync rule', { error: err.message });
    res.status(500).json({ error: 'Failed to delete sync rule' });
  }
}

module.exports = { list, create, get, update, toggle, remove };
