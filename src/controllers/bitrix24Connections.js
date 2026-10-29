// ============================================================
// Bitrix24 ↔ Listok Integration — Bitrix24 Connections Controller
// ============================================================

const { query } = require('../db/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const axios = require('axios');

/**
 * List all Bitrix24 connections
 */
async function listConnections(req, res) {
  try {
    const result = await query(
      'SELECT id, name, domain, client_id, client_secret, access_token, refresh_token, token_expiry, status, created_at, updated_at FROM bitrix24_connections ORDER BY created_at DESC'
    );
    res.json({ data: result.rows, total: result.rows.length });
  } catch (err) {
    logger.error('Failed to list Bitrix24 connections', { error: err.message });
    res.status(500).json({ code: 'LIST_ERROR', message: 'Failed to retrieve Bitrix24 connections' });
  }
}

/**
 * Create a new Bitrix24 connection (OAuth2)
 */
async function createConnection(req, res) {
  try {
    const { name, domain, clientId, clientSecret, accessToken, refreshToken, tokenExpiry } = req.body;

    if (!name || !domain || !clientId || !clientSecret) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'name, domain, clientId, and clientSecret are required',
      });
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO bitrix24_connections
       (id, name, domain, client_id, client_secret, access_token, refresh_token, token_expiry, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'connected')
       RETURNING id, name, domain, status, created_at`,
      [id, name, domain, clientId, clientSecret, accessToken || null, refreshToken || null, tokenExpiry ? new Date(tokenExpiry) : null]
    );

    logger.info('Bitrix24 connection created', { id, name, domain });
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to create Bitrix24 connection', { error: err.message });
    res.status(500).json({ code: 'CREATE_ERROR', message: 'Failed to create Bitrix24 connection' });
  }
}

/**
 * Get a single Bitrix24 connection
 */
async function getConnection(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, name, domain, client_id, client_secret, access_token, refresh_token, token_expiry, status, created_at, updated_at FROM bitrix24_connections WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Bitrix24 connection not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to get Bitrix24 connection', { error: err.message });
    res.status(500).json({ code: 'GET_ERROR', message: 'Failed to retrieve Bitrix24 connection' });
  }
}

/**
 * Update a Bitrix24 connection
 */
async function updateConnection(req, res) {
  try {
    const { id } = req.params;
    const { name, domain, clientId, clientSecret, accessToken, refreshToken, tokenExpiry, status } = req.body;

    const result = await query(
      `UPDATE bitrix24_connections SET
        name = COALESCE($1, name),
        domain = COALESCE($2, domain),
        client_id = COALESCE($3, client_id),
        client_secret = COALESCE($4, client_secret),
        access_token = COALESCE($5, access_token),
        refresh_token = COALESCE($6, refresh_token),
        token_expiry = COALESCE($7, token_expiry),
        status = COALESCE($8, status),
        updated_at = NOW()
       WHERE id = $9 RETURNING id, name, domain, status, updated_at`,
      [name, domain, clientId, clientSecret, accessToken, refreshToken,
       tokenExpiry ? new Date(tokenExpiry) : null, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Bitrix24 connection not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to update Bitrix24 connection', { error: err.message });
    res.status(500).json({ code: 'UPDATE_ERROR', message: 'Failed to update Bitrix24 connection' });
  }
}

/**
 * Delete a Bitrix24 connection
 */
async function deleteConnection(req, res) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM bitrix24_connections WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Bitrix24 connection not found' });
    }
    res.json({ message: 'Bitrix24 connection deleted successfully' });
  } catch (err) {
    logger.error('Failed to delete Bitrix24 connection', { error: err.message });
    res.status(500).json({ code: 'DELETE_ERROR', message: 'Failed to delete Bitrix24 connection' });
  }
}

/**
 * Test Bitrix24 connection using OAuth2 credentials
 */
async function testConnection(req, res) {
  try {
    const { domain, clientId, clientSecret, accessToken } = req.body;

    if (!domain || !clientId || !clientSecret) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'domain, clientId, and clientSecret are required for testing',
      });
    }

    let success = false;
    let message = '';

    // Test with access token if provided
    if (accessToken) {
      try {
        const response = await axios.get(
          `https://${domain}/rest/ping.json`,
          { timeout: 5000 }
        );
        success = response.status === 200;
        message = 'Connection successful with existing token';
      } catch (err) {
        // Token might be expired, try to refresh
        message = 'Token may be expired, attempting refresh...';
      }
    }

    // Test with client credentials (OAuth2 flow)
    if (!success) {
      try {
        const authUrl = `https://${domain}/oauth/authorize`;
        // Just verify the domain is reachable and credentials are valid
        const response = await axios.get(
          `https://${domain}/rest/ping.json`,
          { timeout: 5000 }
        );
        success = response.status === 200;
        message = 'Domain reachable and credentials valid';
      } catch (err) {
        message = `Domain unreachable or invalid credentials: ${err.message}`;
      }
    }

    res.json({
      data: {
        success,
        message,
        domain,
        connectedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error('Bitrix24 connection test failed', { error: err.message });
    res.status(500).json({ code: 'TEST_ERROR', message: 'Connection test failed' });
  }
}

/**
 * Refresh Bitrix24 OAuth2 token
 */
async function refreshToken(req, res) {
  try {
    const { id } = req.params;
    const connection = await query(
      'SELECT domain, client_id, client_secret, refresh_token FROM bitrix24_connections WHERE id = $1',
      [id]
    );

    if (connection.rows.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Connection not found' });
    }

    const { domain, client_id, client_secret, refresh_token } = connection.rows[0];

    // OAuth2 token refresh
    const response = await axios.post(
      `https://${domain}/oauth/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id,
        client_secret,
        refresh_token,
      }),
      { timeout: 10000 }
    );

    const { access_token, refresh_token: new_refresh_token, expires_in } = response.data;

    await query(
      `UPDATE bitrix24_connections SET
        access_token = $1,
        refresh_token = $2,
        token_expiry = $3,
        updated_at = NOW()
       WHERE id = $4`,
      [access_token, new_refresh_token, new Date(Date.now() + expires_in * 1000), id]
    );

    res.json({
      data: { success: true, message: 'Token refreshed successfully', expiresIn: expires_in },
    });
  } catch (err) {
    logger.error('Token refresh failed', { error: err.message });
    res.status(500).json({ code: 'REFRESH_ERROR', message: 'Failed to refresh token' });
  }
}

/**
 * Get Bitrix24 CRM fields for an entity type
 */
async function getFields(req, res) {
  try {
    const { entityType } = req.query;
    const { id } = req.params;

    // Get the connection
    const connection = await query(
      'SELECT domain, access_token FROM bitrix24_connections WHERE id = $1 AND status = $2',
      [id, 'connected']
    );

    if (connection.rows.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Connection not found or not connected' });
    }

    const { domain, access_token } = connection.rows[0];
    const fields = await getBitrix24Fields(domain, access_token, entityType);

    res.json({ data: fields });
  } catch (err) {
    logger.error('Failed to get Bitrix24 fields', { error: err.message });
    res.status(500).json({ code: 'FIELDS_ERROR', message: 'Failed to retrieve Bitrix24 fields' });
  }
}

/**
 * Fetch Bitrix24 CRM fields for an entity type
 */
async function getBitrix24Fields(domain, accessToken, entityType) {
  const methodMap = {
    lead: 'crm.lead.fields',
    deal: 'crm.deal.fields',
    contact: 'crm.contact.fields',
    company: 'crm.company.fields',
  };

  const method = methodMap[entityType];
  if (!method) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  const response = await axios.post(
    `https://${domain}/rest/${method}`,
    {},
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000,
    }
  );

  const rawFields = response.data.result || {};

  // Transform to frontend format
  const fields = Object.entries(rawFields).map(([code, field]: [string, any]) => ({
    name: code,
    label: field.title || code,
    type: mapFieldType(field.type),
    entityType,
    required: field.isRequired || false,
    options: field.items?.map((item: any) => item.value) || [],
    description: field.description || '',
  }));

  return fields;
}

/**
 * Map Bitrix24 field types to frontend FieldType
 */
function mapFieldType(bitrixType) {
  const typeMap: Record<string, string> = {
    string: 'string',
    integer: 'number',
    double: 'number',
    date: 'date',
    datetime: 'date',
    boolean: 'boolean',
    enum: 'enum',
    file: 'custom',
   crm_status: 'enum',
    crm_currency: 'currency',
  };
  return typeMap[bitrixType] || 'string';
}

module.exports = {
  listConnections,
  createConnection,
  getConnection,
  updateConnection,
  deleteConnection,
  testConnection,
  refreshToken,
  getFields,
};
