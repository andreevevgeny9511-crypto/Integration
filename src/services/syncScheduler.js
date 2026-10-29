// ============================================================
// Bitrix24 ↔ Listok Integration — Sync Scheduler
// ============================================================

const cron = require('node-cron');
const { query } = require('../db/client');
const logger = require('../utils/logger');
const bitrix24Service = require('../services/bitrix24Service');
const listokService = require('../services/listokService');

let scheduler = null;

/**
 * Start the sync scheduler — processes queued sync jobs and
 * runs scheduled sync rules on their cron schedule.
 */
function startSyncScheduler(log) {
  logger = log;

  // Process sync queue every 30 seconds
  cron.schedule('*/30 * * * * *', processSyncQueue);

  // Run scheduled sync rules every minute
  cron.schedule('* * * * *', runScheduledRules);

  // Clean up old sync logs daily at 3 AM
  cron.schedule('0 3 * * *', cleanupOldLogs);

  logger.info('Sync scheduler started');
}

/**
 * Process pending sync queue items
 */
async function processSyncQueue() {
  try {
    const result = await query(
      `SELECT * FROM sync_queue
       WHERE status IN ('queued', 'retrying')
       AND scheduled_at <= NOW()
       ORDER BY created_at ASC
       LIMIT 50`
    );

    for (const job of result.rows) {
      await processSyncJob(job);
    }
  } catch (err) {
    logger.error('Sync queue processing error', { error: err.message });
  }
}

/**
 * Process a single sync queue job
 */
async function processSyncJob(job) {
  try {
    // Mark as processing
    await query('UPDATE sync_queue SET status = $1 WHERE id = $2', ['processing', job.id]);

    const integration = await getIntegration(job.integration_id);
    if (!integration) {
      await markJobFailed(job.id, 'Integration not found');
      return;
    }

    if (integration.status !== 'active') {
      await markJobFailed(job.id, 'Integration is not active');
      return;
    }

    // Route based on direction
    if (job.direction === 'bitrix24_to_listok') {
      await bitrix24Service.syncToBitrix24(integration, job);
    } else if (job.direction === 'listok_to_bitrix24') {
      await listokService.syncToListok(integration, job);
    } else {
      // Bidirectional — sync both ways
      await bitrix24Service.syncToBitrix24(integration, job);
      await listokService.syncToListok(integration, job);
    }

    await query('UPDATE sync_queue SET status = $1, processed_at = NOW() WHERE id = $2', ['completed', job.id]);
    logger.info('Sync job completed', { jobId: job.id });
  } catch (err) {
    logger.error('Sync job failed', { jobId: job.id, error: err.message });

    const retryCount = (job.retry_count || 0) + 1;
    if (retryCount >= (job.max_retries || 3)) {
      await markJobFailed(job.id, err.message);
    } else {
      await query(
        'UPDATE sync_queue SET status = $1, retry_count = $2, error_message = $3, scheduled_at = NOW() + INTERVAL \'5 minutes\' WHERE id = $4',
        ['retrying', retryCount, err.message, job.id]
      );
    }
  }
}

/**
 * Run scheduled sync rules
 */
async function runScheduledRules() {
  try {
    const result = await query(
      `SELECT * FROM sync_rules
       WHERE is_active = true
       AND trigger_type = 'scheduled'
       AND schedule_cron IS NOT NULL`
    );

    for (const rule of result.rows) {
      try {
        // Check if the cron schedule matches now
        const cron = require('node-cron');
        const task = cron.schedule(rule.schedule_cron, async () => {
          await triggerSync(rule);
        }, { scheduled: false });
        task.start();
        // Immediately run once if schedule matches
        await triggerSync(rule);
        task.stop();
      } catch (err) {
        logger.error('Scheduled rule execution error', { ruleId: rule.id, error: err.message });
      }
    }
  } catch (err) {
    logger.error('Scheduled rules processing error', { error: err.message });
  }
}

/**
 * Trigger a sync based on a rule
 */
async function triggerSync(rule) {
  try {
    const logEntry = await query(
      `INSERT INTO sync_logs (integration_id, entity_type_id, sync_rule_id, direction, status, started_at)
       VALUES ($1, $2, $3, $4, 'running', NOW())
       RETURNING id`,
      [rule.integration_id, rule.entity_type_id, rule.id, rule.direction]
    );

    logger.info('Sync triggered by rule', { ruleId: rule.id, logId: logEntry.rows[0].id });

    // Process sync jobs for this rule
    await processSyncQueue();

    await query(
      'UPDATE sync_logs SET status = $1, completed_at = NOW(), duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000 WHERE id = $2',
      ['completed', logEntry.rows[0].id]
    );
  } catch (err) {
    logger.error('Sync rule trigger failed', { ruleId: rule.id, error: err.message });
  }
}

/**
 * Clean up old sync logs (keep 90 days)
 */
async function cleanupOldLogs() {
  try {
    const result = await query(
      `DELETE FROM sync_logs WHERE started_at < NOW() - INTERVAL '90 days'`
    );
    logger.info('Old sync logs cleaned up', { deleted: result.rowCount });
  } catch (err) {
    logger.error('Log cleanup error', { error: err.message });
  }
}

/**
 * Get integration by ID
 */
async function getIntegration(id) {
  const result = await query('SELECT * FROM integrations WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Mark a sync job as failed
 */
async function markJobFailed(jobId, error) {
  await query(
    'UPDATE sync_queue SET status = $1, error_message = $2, processed_at = NOW() WHERE id = $3',
    ['failed', error, jobId]
  );
}

module.exports = { startSyncScheduler };
