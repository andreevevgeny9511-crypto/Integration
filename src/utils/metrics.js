// ============================================================
// Bitrix24 ↔ Listok Integration — Prometheus Metrics
// ============================================================

const client = require('prom-client');

// Sync metrics
const syncJobsTotal = new client.Counter({
  name: 'sync_jobs_total',
  help: 'Total number of sync jobs processed',
  labelNames: ['integration_id', 'entity_type', 'status'],
});

const syncDuration = new client.Histogram({
  name: 'sync_duration_seconds',
  help: 'Duration of sync operations in seconds',
  labelNames: ['integration_id', 'entity_type'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});

const syncQueueSize = new client.Gauge({
  name: 'sync_queue_size',
  help: 'Number of pending sync jobs in the queue',
  labelNames: ['status'],
});

const apiRequestsTotal = new client.Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['method', 'route', 'status'],
});

const apiRequestDuration = new client.Histogram({
  name: 'api_request_duration_seconds',
  help: 'Duration of API requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
});

const integrationsActive = new client.Gauge({
  name: 'integrations_active',
  help: 'Number of active integrations',
});

// Bitrix24 API errors
const bitrix24Errors = new client.Counter({
  name: 'bitrix24_api_errors_total',
  help: 'Total Bitrix24 API errors',
  labelNames: ['endpoint', 'error_code'],
});

// Listok API errors
const listokErrors = new client.Counter({
  name: 'listok_api_errors_total',
  help: 'Total Listok API errors',
  labelNames: ['endpoint', 'status_code'],
});

module.exports = {
  syncJobsTotal,
  syncDuration,
  syncQueueSize,
  apiRequestsTotal,
  apiRequestDuration,
  dbQueryDuration,
  integrationsActive,
  bitrix24Errors,
  listokErrors,
  register: client.register,
};
