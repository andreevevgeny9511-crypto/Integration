// ============================================================
// Bitrix24 ↔ Listok Integration — Sync Controller
// ============================================================

const { query } = require('../db/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const bitrix24Service = require('../services/bitrix24Service');
const listokService = require('../services/listokService');

/**
 * Trigger a manual sync
 */
async function trigger(req, res) {
  try {
    const { integration_id, rule_id, direction, entity_type } = req.body;

    if (!integration_id) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'integration_id is required',
      });
    }

    const integration = await getIntegration(integration_id);
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Create a sync run record
    const runId = uuidv4();
    await query(
      `INSERT INTO sync_runs (id, integration_id, status, started_at)
       VALUES ($1, $2, 'running', NOW())`,
      [runId, integration_id]
    );

    // Create sync queue items based on the rule or all active rules
    const rules = rule_id
      ? await query('SELECT * FROM sync_rules WHERE id = $1 AND enabled = true', [rule_id])
      : await query(
          "SELECT * FROM sync_rules WHERE integration_id = $1 AND enabled = true",
          [integration_id]
        );

    if (rules.rows.length === 0) {
      await query(
        'UPDATE sync_runs SET status = $1, completed_at = NOW() WHERE id = $2',
        ['failed', runId]
      );
      return res.status(400).json({ error: 'No active sync rules found' });
    }

    const jobs = [];
    for (const rule of rules.rows) {
      const directions = rule.direction === 'bidirectional'
        ? ['bitrix24_to_listok', 'listok_to_bitrix24']
        : [rule.direction];

      for (const dir of directions) {
        const jobId = uuidv4();
        await query(
          `INSERT INTO sync_queue (id, integration_id, sync_rule_id, entity_type_id, direction, status, scheduled_at)
           VALUES ($1, $2, $3, $4, $5, 'queued', NOW())`,
          [jobId, integration_id, rule.id, entity_type || rule.source_entity, dir]
        );
        jobs.push(jobId);
      }
    }

    // Update sync run
    await query(
      'UPDATE sync_runs SET records_processed = $1 WHERE id = $2',
      [jobs.length, runId]
    );

    logger.info('Sync triggered', { runId, integration_id, jobs: jobs.length });
    res.status(202).json({
      data: {
        run_id: runId,
        integration_id,
        jobs_count: jobs.length,
        status: 'queued',
      },
    });
  } catch (err) {
    logger.error('Failed to trigger sync', { error: err.message });
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
}

/**
 * List sync runs
 */
async function list(req, res) {
  try {
    const { integration_id, status, limit = 50, offset = 0 } = req.query;

    let queryText = 'SELECT * FROM sync_runs';
    const params = [];
    let paramIndex = 1;

    if (integration_id) {
      queryText += ` WHERE integration_id = $${paramIndex++}`;
      params.push(integration_id);
    }
    if (status) {
      queryText += params.length === 0 ? ' WHERE' : ' AND';
      queryText += ` status = $${paramIndex++}`;
      params.push(status);
    }

    queryText += ` ORDER BY started_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);
    res.json({ data: result.rows, total: result.rows.length });
  } catch (err) {
    logger.error('Failed to list sync runs', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve sync runs' });
  }
}

/**
 * Get sync run status
 */
async function getStatus(req, res) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM sync_runs WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sync run not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    logger.error('Failed to get sync run status', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve sync run status' });
  }
}

/**
 * Get sync logs for a run or integration
 */
async function getLogs(req, res) {
  try {
    const { id } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Check if this is a run ID or integration ID
    const runResult = await query('SELECT * FROM sync_runs WHERE id = $1', [id]);

    let logs;
    if (runResult.rows.length > 0) {
      logs = await query(
        `SELECT * FROM sync_logs
         WHERE integration_id = $1
         ORDER BY executed_at DESC
         LIMIT $2 OFFSET $3`,
        [runResult.rows[0].integration_id, parseInt(limit), parseInt(offset)]
      );
    } else {
      // Assume it's an integration ID
      logs = await query(
        `SELECT * FROM sync_logs
         WHERE integration_id = $1
         ORDER BY executed_at DESC
         LIMIT $2 OFFSET $3`,
        [id, parseInt(limit), parseInt(offset)]
      );
    }

    res.json({ data: logs.rows, total: logs.rows.length });
  } catch (err) {
    logger.error('Failed to get sync logs', { error: err.message });
    res.status(500).json({ error: 'Failed to retrieve sync logs' });
  }
}

/**
 * Get integration by ID
 */
async function getIntegration(id) {
  const result = await query('SELECT * FROM integrations WHERE id = $1', [id]);
  return result.rows[0] || null;
}

module.exports = { trigger, list, getStatus, getLogs };
