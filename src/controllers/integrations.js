// ============================================================
// Bitrix24 ↔ Listok Integration — Integrations Controller
// ============================================================

const { query } = require('../db/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * List all integrations
 */
async function list(req, res) {
  try {
    const result = await query(
      'SELECT id, name, bitrix24_domain, status, created_at, updated_at, last_sync_at FROM integrations ORDER BY created_at DESC'
    );
    res.json({ data: result.rows, total: result.rows.length });
  } catch (err) {
    logger.error('Failed to list integrations', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve integrations' });
  }
}

/**
 * Create a new integration
 */
async function create(req, res) {
  try {
    const { name, bitrix24_domain, bitrix24_token, listok_api_key, listok_base_url } = req.body;

    if (!name || !bitrix24_domain || !bitrix24_token || !listok_api_key) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'name, bitrix24_domain, bitrix24_token, and listok_api_key are required',
      });
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO integrations (id, name, bitrix24_domain, bitrix24_token, listok_api_key, listok_base_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING id, name, bitrix24_domain, status, created_at`,
      [id, name, bitrix24_domain, bitrix24_token, listok_api_key, listok_base_url || 'https://api.listok.ru']
    );

    logger.info('Integration created', { id, name });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to create integration', { error: err.message });
    res.status(500).json({ error: 'Failed to create integration' });
  }
}

/**
 * Get a single integration
 */
async function get(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, name, bitrix24_domain, bitrix24_token, listok_api_key, listok_base_url, status, created_at, updated_at, last_sync_at FROM integrations WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to get integration', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve integration' });
  }
}

/**
 * Update an integration
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, bitrix24_domain, bitrix24_token, listok_api_key, listok_base_url, status } = req.body;

    const result = await query(
      `UPDATE integrations SET name = COALESCE($1, name), bitrix24_domain = COALESCE($2, bitrix24_domain),
       bitrix24_token = COALESCE($3, bitrix24_token), listok_api_key = COALESCE($4, listok_api_key),
       listok_base_url = COALESCE($5, listok_base_url), status = COALESCE($6, status), updated_at = NOW()
       WHERE id = $7 RETURNING id, name, bitrix24_domain, status, updated_at`,
      [name, bitrix24_domain, bitrix24_token, listok_api_key, listok_base_url, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to update integration', { error: err.message });
    res.status(500).json({ error: 'Failed to update integration' });
  }
}

/**
 * Delete an integration
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM integrations WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    res.json({ message: 'Integration deleted successfully' });
  } catch (err) {
    logger.error('Failed to delete integration', { error: err.message });
    res.status(500).json({ error: 'Failed to delete integration' });
  }
}

/**
 * Get integration sync status
 */
async function getStatus(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, name, status, last_sync_at FROM integrations WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to get integration status', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve integration status' });
  }
}

/**
 * Test connection to Bitrix24 and Listok
 */
async function testConnection(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT bitrix24_domain, bitrix24_token, listok_api_key, listok_base_url FROM integrations WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const integration = result.rows[0];
    const results = { bitrix24: false, listok: false };

    // Test Bitrix24 connection
    try {
      const axios = require('axios');
      const bxResponse = await axios.get(
        `https://${integration.bitrix24_domain}/rest/ping.json`,
        { timeout: 5000 }
      );
      results.bitrix24 = bxResponse.status === 200;
    } catch (bxErr) {
      results.bitrix24_error = bxErr.message;
    }

    // Test Listok connection
    try {
      const axios = require('axios');
      const listokResponse = await axios.get(
        `${integration.listok_base_url}/api/v1/ping`,
        { headers: { Authorization: `Bearer ${integration.listok_api_key}` }, timeout: 5000 }
      );
      results.listok = listokResponse.status === 200;
    } catch (lkErr) {
      results.listok_error = lkErr.message;
    }

    res.json({ data: results });
  } catch (err) {
    logger.error('Failed to test connection', { error: err.message });
    res.status(500).json({ error: 'Failed to test connection' });
  }
}

module.exports = { list, create, get, update, remove, getStatus, testConnection };
