// ============================================================
// Bitrix24 ↔ Listok Integration — Health Controller
// ============================================================

const { query } = require('../db/client');
const logger = require('../utils/logger');

async function check(req, res) {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks: {},
  };

  // Database check
  try {
    const result = await query('SELECT 1 AS alive');
    health.checks.database = { status: 'ok', responseTime: 'N/A' };
  } catch (err) {
    health.checks.database = { status: 'error', error: err.message };
    health.status = 'degraded';
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    status: 'ok',
    rss: memUsage.rss,
    heapTotal: memUsage.heapTotal,
    heapUsed: memUsage.heapUsed,
    external: memUsage.external,
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
}

module.exports = { check };
