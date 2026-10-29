// ============================================================
// Bitrix24 ↔ Listok Integration — Sync Controller
// ============================================================

const { query } = require('../db/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const bitrix24Service = require('../services/bitrix24Service');
const listokService = require('../services/listokService');

let activeSyncs = new Map();

/**
 * Start a sync operation
 */
async function startSync(req, res) {
  try {
    const { ruleId } = req.body;

    // Get the rule
    const rule = ruleId
      ? await query('SELECT * FROM sync_rules WHERE id = $1 AND enabled = true', [ruleId])
      : null;

    if (ruleId && rule.rows.length === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Sync rule not found or disabled' });
    }

    // Get all enabled rules if no specific rule
    const rules = ruleId ? rule.rows : await query('SELECT * FROM sync_rules WHERE enabled = true');

    if (rules.length === 0) {
      return res.status(400).json({ code: 'NO_RULES', message: 'No active sync rules found' });
    }

    const runId = uuidv4();
    const syncId = runId;

    // Create sync run record
    await query(
      `INSERT INTO sync_runs (id, integration_id, started_at, status, records_processed)
       VALUES ($1, $2, NOW(), 'running', 0)`,
      [syncId, rules[0].integration_id]
    );

    // Process sync asynchronously (simulated)
    processSync(rules, syncId);

    activeSyncs.set(syncId, { status: 'running', startedAt: new Date().toISOString() });

    logger.info('Sync started', { syncId, ruleId: ruleId || 'all' });
    res.status(202).json({
      data: {
        syncId,
        status: 'running',
        message: 'Sync started successfully',
      },
    });
  } catch (err) {
    logger.error('Failed to start sync', { error: err.message });
    res.status(500).json({ code: 'START_ERROR', message: 'Failed to start sync' });
  }
}

/**
 * Stop a sync operation
 */
async function stopSync(req, res) {
  try {
    const { ruleId } = req.body;
    const syncId = ruleId || 'all';

    if (activeSyncs.has(syncId)) {
      activeSyncs.set(syncId, { status: 'stopping', startedAt: activeSyncs.get(syncId)?.startedAt });
      logger.info('Sync stop requested', { syncId });
    }

    res.json({
      data: {
        syncId,
        status: 'stopping',
        message: 'Sync stop requested',
      },
    });
  } catch (err) {
    logger.error('Failed to stop sync', { error: err.message });
    res.status(500).json({ code: 'STOP_ERROR', message: 'Failed to stop sync' });
  }
}

/**
 * Get sync status
 */
async function getStatus(req, res) {
  try {
    const syncs = [];

    for (const [syncId, info] of activeSyncs) {
      const run = await query(
        'SELECT * FROM sync_runs WHERE id = $1',
        [syncId]
      );

      syncs.push({
        syncId,
        status: info.status,
        startedAt: info.startedAt,
        runStatus: run.rows[0]?.status || 'unknown',
        recordsProcessed: run.rows[0]?.records_processed || 0,
        recordsCreated: run.rows[0]?.records_created || 0,
        recordsUpdated: run.rows[0]?.records_updated || 0,
        recordsFailed: run.rows[0]?.records_failed || 0,
      });
    }

    // Also check for recent completed runs
    const recentRuns = await query(
      `SELECT * FROM sync_runs
       WHERE started_at > NOW() - INTERVAL '24 hours'
       ORDER BY started_at DESC
       LIMIT 10`
    );

    res.json({
      data: {
        activeSyncs: syncs,
        recentRuns: recentRuns.rows,
        overallStatus: activeSyncs.size > 0 ? 'running' : 'idle',
      },
    });
  } catch (err) {
    logger.error('Failed to get sync status', { error: err.message });
    res.status(500).json({ code: 'STATUS_ERROR', message: 'Failed to retrieve sync status' });
  }
}

/**
 * Get sync logs
 */
async function getLogs(req, res) {
  try {
    const { ruleId, limit = '100', offset = '0' } = req.query;

    let queryText = 'SELECT * FROM sync_logs';
    const params = [];
    let paramIndex = 1;

    if (ruleId) {
      queryText += ` WHERE sync_rule_id = $${paramIndex++}`;
      params.push(ruleId);
    }

    queryText += ` ORDER BY executed_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);

    res.json({
      data: result.rows,
      total: result.rows.length,
    });
  } catch (err) {
    logger.error('Failed to get sync logs', { error: err.message });
    res.status(500).json({ code: 'LOGS_ERROR', message: 'Failed to retrieve sync logs' });
  }
}

/**
 * Get sync statistics
 */
async function getStats(req, res) {
  try {
    const totalResult = await query("SELECT COUNT(*) as total FROM sync_logs");
    const successResult = await query("SELECT COUNT(*) as count FROM sync_logs WHERE status = 'success'");
    const failedResult = await query("SELECT COUNT(*) as count FROM sync_logs WHERE status = 'failed'");
    const lastSync = await query(
      "SELECT executed_at FROM sync_logs WHERE status = 'success' ORDER BY executed_at DESC LIMIT 1"
    );

    // Syncs by day (last 7 days)
    const byDay = await query(
      `SELECT DATE(executed_at) as date,
              COUNT(*) as count,
              COUNT(*) FILTER (WHERE status = 'success') as success,
              COUNT(*) FILTER (WHERE status = 'failed') as failed
       FROM sync_logs
       WHERE executed_at > NOW() - INTERVAL '7 days'
       GROUP BY DATE(executed_at)
       ORDER BY date DESC`
    );

    // Entities by type
    const byType = await query(
      `SELECT source_entity_type as type, COUNT(*) as count
       FROM sync_logs
       WHERE executed_at > NOW() - INTERVAL '30 days'
       GROUP BY source_entity_type`
    );

    res.json({
      data: {
        totalSyncs: parseInt(totalResult.rows[0].total),
        successfulSyncs: parseInt(successResult.rows[0].count),
        failedSyncs: parseInt(failedResult.rows[0].count),
        entitiesSynced: parseInt(totalResult.rows[0].total),
        lastSyncAt: lastSync.rows[0]?.executed_at || null,
        avgDuration: 0,
        syncsByDay: byDay.rows,
        entitiesByType: byType.rows,
      },
    });
  } catch (err) {
    logger.error('Failed to get sync stats', { error: err.message });
    res.status(500).json({ code: 'STATS_ERROR', message: 'Failed to retrieve sync statistics' });
  }
}

/**
 * Process sync rules asynchronously
 */
async function processSync(rules, syncId) {
  try {
    for (const rule of rules.rows) {
      if (activeSyncs.get(syncId)?.status === 'stopping') {
        break;
      }

      const directions = rule.direction === 'bidirectional'
        ? ['bitrix24_to_listok', 'listok_to_bitrix24']
        : [rule.direction];

      for (const direction of directions) {
        if (activeSyncs.get(syncId)?.status === 'stopping') break;

        await query(
          `UPDATE sync_runs SET records_processed = records_processed + 1 WHERE id = $1`,
          [syncId]
        );

        // Route to appropriate service
        if (direction === 'bitrix24_to_listok') {
          await bitrix24Service.syncToBitrix24(
            { id: rule.integration_id },
            { id: syncId, sync_rule_id: rule.id, last_sync_at: null }
          );
        } else {
          await listokService.syncToListok(
            { id: rule.integration_id },
            { id: syncId, sync_rule_id: rule.id, last_sync_at: null }
          );
        }
      }
    }

    // Mark as completed
    await query(
      `UPDATE sync_runs SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [syncId]
    );

    activeSyncs.set(syncId, { status: 'completed', startedAt: activeSyncs.get(syncId)?.startedAt });
    logger.info('Sync completed', { syncId });
  } catch (err) {
    await query(
      `UPDATE sync_runs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
      [err.message, syncId]
    );

    activeSyncs.set(syncId, { status: 'failed', startedAt: activeSyncs.get(syncId)?.startedAt });
    logger.error('Sync failed', { syncId, error: err.message });
  }
}

module.exports = { startSync, stopSync, getStatus, getLogs, getStats };
