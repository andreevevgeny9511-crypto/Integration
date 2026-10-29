// ============================================================
// Bitrix24 ↔ Listok Integration — Listok Connections Controller
// ============================================================

const { query } = require('../db/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const axios = require('axios');

/**
 * List all Listok connections
 */
async function listConnections(req, res) {
  try {
    const result = await query(
      'SELECT id, name, api_key, base_url, status, created_at, updated_at FROM listok_connections ORDER BY created_at DESC'
    );
    res.json({ data: result.rows, total: result.rows.length });
  } catch (err) {
    logger.error('Failed to list Listok connections', { error: err.message });
    res.status(500).json({ code: 'LIST_ERROR', message: 'Failed to retrieve Listok connections' });
  }
}

/**
 * Create a new Listok connection
 */
async function createConnection(req, res) {
  try {
    const { name, apiKey, baseUrl } = req.body;

    if (!name || !apiKey) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'name and apiKey are required',
      });
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO listok_connections (id, name, api_key, base_url, status)
       VALUES ($1, $2, $3, $4, 'connected')
       RETURNING id, name, base_url, status, created_at`,
      [id, name, apiKey, baseUrl || 'https://api.listok.ru']
    );

    logger.info('Listok connection created', { id, name });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to create Listok connection', { error: err.message });
    res.status(500).json({ code: 'CREATE_ERROR', message: 'Failed to create Listok connection' });
  }
}

/**
 * Get a single Listok connection
 */
async function getConnection(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, name, api_key, base_url, status, created_at, updated_at FROM listok_connections WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Listok connection not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to get Listok connection', { error: err.message });
    res.status(500).json({ code: 'GET_ERROR', message: 'Failed to retrieve Listok connection' });
  }
}

/**
 * Update a Listok connection
 */
async function updateConnection(req, res) {
  try {
    const { id } = req.params;
    const { name, apiKey, baseUrl, status } = req.body;

    const result = await query(
      `UPDATE listok_connections SET
        name = COALESCE($1, name),
        api_key = COALESCE($2, api_key),
        base_url = COALESCE($3, base_url),
        status = COALESCE($4, status),
        updated_at = NOW()
       WHERE id = $5 RETURNING id, name, base_url, status, updated_at`,
      [name, apiKey, baseUrl, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Listok connection not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to update Listok connection', { error: err.message });
    res.status(500).json({ code: 'UPDATE_ERROR', message: 'Failed to update Listok connection' });
  }
}

/**
 * Delete a Listok connection
 */
async function deleteConnection(req, res) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM listok_connections WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Listok connection not found' });
    }
    res.json({ message: 'Listok connection deleted successfully' });
  } catch (err) {
    logger.error('Failed to delete Listok connection', { error: err.message });
    res.status(500).json({ code: 'DELETE_ERROR', message: 'Failed to delete Listok connection' });
  }
}

/**
 * Test Listok connection
 */
async function testConnection(req, res) {
  try {
    const { apiKey, baseUrl } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'apiKey is required for testing',
      });
    }

    const url = `${baseUrl || 'https://api.listok.ru'}/api/external/v2/contacts?page=1&per_page=1`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 5000,
    });

    const success = response.status === 200;

    res.json({
      data: {
        success,
        message: success ? 'Connection successful' : 'Connection failed',
        baseUrl: baseUrl || 'https://api.listok.ru',
        connectedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error('Listok connection test failed', { error: err.message });
    res.status(500).json({
      code: 'TEST_ERROR',
      message: `Connection test failed: ${err.message}`,
    });
  }
}

/**
 * Get Listok fields for an entity type
 */
async function getFields(req, res) {
  try {
    const { entityType } = req.query;
    const { id } = req.params;

    // Get the connection
    const connection = await query(
      'SELECT api_key, base_url FROM listok_connections WHERE id = $1 AND status = $2',
      [id, 'connected']
    );

    if (connection.rows.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Connection not found or not connected' });
    }

    const { api_key, base_url } = connection.rows[0];
    const fields = await getListokFields(api_key, base_url, entityType);

    res.json({ data: fields });
  } catch (err) {
    logger.error('Failed to get Listok fields', { error: err.message });
    res.status(500).json({ code: 'FIELDS_ERROR', message: 'Failed to retrieve Listok fields' });
  }
}

/**
 * Fetch Listok fields for an entity type
 */
async function getListokFields(apiKey, baseUrl, entityType) {
  const url = `${baseUrl}/api/external/v2/${entityType}s`;

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    params: { page: 1, per_page: 100 },
    timeout: 10000,
  });

  const data = response.data.data || [];

  // Infer fields from the first item
  if (data.length === 0) {
    return getDefaultFields(entityType);
  }

  const firstItem = data[0];
  const fields = Object.entries(firstItem)
    .filter(([key]) => !['created_at', 'updated_at', 'deleted_at'].includes(key))
    .map(([key, value]) => ({
      name: key,
      label: formatFieldName(key),
      type: inferFieldType(value),
      entityType,
      required: false,
      options: [],
    }));

  return fields;
}

/**
 * Get default fields for an entity type
 */
function getDefaultFields(entityType) {
  const defaults: Record<string, any[]> = {
    contact: [
      { name: 'name', label: 'Full Name', type: 'string', entityType: 'contact', required: true, options: [] },
      { name: 'phone', label: 'Phone', type: 'string', entityType: 'contact', required: false, options: [] },
      { name: 'email', label: 'Email', type: 'string', entityType: 'contact', required: false, options: [] },
      { name: 'birth_date', label: 'Birth Date', type: 'date', entityType: 'contact', required: false, options: [] },
      { name: 'gender', label: 'Gender', type: 'enum', entityType: 'contact', required: false, options: ['male', 'female'] },
      { name: 'customer_status', label: 'Customer Status', type: 'enum', entityType: 'contact', required: false, options: ['lead', 'client'] },
      { name: 'note', label: 'Note', type: 'string', entityType: 'contact', required: false, options: [] },
      { name: 'custom_fields', label: 'Custom Fields', type: 'custom', entityType: 'contact', required: false, options: [] },
    ],
    group: [
      { name: 'name', label: 'Group Name', type: 'string', entityType: 'group', required: true, options: [] },
      { name: 'duration', label: 'Duration (minutes)', type: 'number', entityType: 'group', required: false, options: [] },
      { name: 'teacher_name', label: 'Teacher Name', type: 'string', entityType: 'group', required: false, options: [] },
      { name: 'max_attendance_limit', label: 'Max Attendance', type: 'number', entityType: 'group', required: false, options: [] },
      { name: 'group_type_id', label: 'Group Type', type: 'number', entityType: 'group', required: false, options: [] },
    ],
    pass: [
      { name: 'name', label: 'Pass Name', type: 'string', entityType: 'pass', required: true, options: [] },
      { name: 'price', label: 'Price', type: 'number', entityType: 'pass', required: false, options: [] },
      { name: 'admit_number', label: 'Admission Number', type: 'number', entityType: 'pass', required: false, options: [] },
      { name: 'valid_for_days', label: 'Valid Days', type: 'number', entityType: 'pass', required: false, options: [] },
      { name: 'valid_for_months', label: 'Valid Months', type: 'number', entityType: 'pass', required: false, options: [] },
      { name: 'pass_type', label: 'Pass Type', type: 'number', entityType: 'pass', required: false, options: [] },
    ],
    payment: [
      { name: 'amount', label: 'Amount', type: 'number', entityType: 'payment', required: true, options: [] },
      { name: 'direction', label: 'Direction', type: 'enum', entityType: 'payment', required: true, options: ['income', 'outcome'] },
      { name: 'payment_type', label: 'Payment Type', type: 'string', entityType: 'payment', required: false, options: [] },
      { name: 'date', label: 'Date', type: 'date', entityType: 'payment', required: false, options: [] },
      { name: 'reason', label: 'Reason', type: 'string', entityType: 'payment', required: false, options: [] },
    ],
  };

  return defaults[entityType] || [];
}

/**
 * Format a field name for display
 */
function formatFieldName(name) {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Infer field type from a value
 */
function inferFieldType(value) {
  if (value === null || value === undefined) return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'custom';
  if (typeof value === 'object') return 'custom';
  return 'string';
}

module.exports = {
  listConnections,
  createConnection,
  getConnection,
  updateConnection,
  deleteConnection,
  testConnection,
  getFields,
};
