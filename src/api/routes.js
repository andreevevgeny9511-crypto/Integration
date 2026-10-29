// ============================================================
// Bitrix24 ↔ Listok Integration — API Routes
// ============================================================

const express = require('express');
const router = express.Router();

// --- Controllers ---
const integrationsController = require('../controllers/integrations');
const mappingsController = require('../controllers/mappings');
const rulesController = require('../controllers/rules');
const syncController = require('../controllers/sync');
const syncControllerV2 = require('../controllers/syncController');
const webhooksController = require('../controllers/webhooks');
const healthController = require('../controllers/health');
const bitrix24ConnectionsController = require('../controllers/bitrix24Connections');
const listokConnectionsController = require('../controllers/listokConnections');

// --- Authentication middleware ---
const authenticate = require('../middleware/authenticate');

// ============================================================
// Health & Metrics (public)
// ============================================================
router.get('/health', healthController.check);

// ============================================================
// Bitrix24 Connections (public — auth handled by middleware)
// ============================================================
router.use('/bitrix24', authenticate);
router.route('/bitrix24/connections')
  .get(bitrix24ConnectionsController.listConnections)
  .post(bitrix24ConnectionsController.createConnection);
router.route('/bitrix24/connections/:id')
  .get(bitrix24ConnectionsController.getConnection)
  .put(bitrix24ConnectionsController.updateConnection)
  .delete(bitrix24ConnectionsController.deleteConnection);
router.route('/bitrix24/connections/:id/fields')
  .get(bitrix24ConnectionsController.getFields);
router.route('/bitrix24/test-connection')
  .post(bitrix24ConnectionsController.testConnection);
router.route('/bitrix24/connections/:id/refresh-token')
  .post(bitrix24ConnectionsController.refreshToken);

// ============================================================
// Listok Connections (protected)
// ============================================================
router.route('/listok/connections')
  .get(listokConnectionsController.listConnections)
  .post(listokConnectionsController.createConnection);
router.route('/listok/connections/:id')
  .get(listokConnectionsController.getConnection)
  .put(listokConnectionsController.updateConnection)
  .delete(listokConnectionsController.deleteConnection);
router.route('/listok/connections/:id/fields')
  .get(listokConnectionsController.getFields);
router.route('/listok/test-connection')
  .post(listokConnectionsController.testConnection);

// ============================================================
// Field Mappings (protected)
// ============================================================
router.route('/mappings')
  .get(mappingsController.list)
  .post(mappingsController.create);
router.route('/mappings/:id')
  .get(mappingsController.get)
  .put(mappingsController.update)
  .delete(mappingsController.remove);
router.route('/mappings/entity/:entityTypeId')
  .get(mappingsController.listByEntity);
router.route('/mappings/bulk')
  .put(mappingsController.bulkUpdate);

// ============================================================
// Sync Rules (protected)
// ============================================================
router.route('/sync-rules')
  .get(rulesController.list)
  .post(rulesController.create);
router.route('/sync-rules/:id')
  .get(rulesController.get)
  .put(rulesController.update)
  .delete(rulesController.remove);
router.route('/sync-rules/:id/toggle')
  .patch(rulesController.toggle);

// ============================================================
// Sync Operations (protected)
// ============================================================
router.route('/sync/start')
  .post(syncControllerV2.startSync);
router.route('/sync/stop')
  .post(syncControllerV2.stopSync);
router.route('/sync/status')
  .get(syncControllerV2.getStatus);
router.route('/sync/logs')
  .get(syncControllerV2.getLogs);
router.route('/sync/stats')
  .get(syncControllerV2.getStats);
router.route('/sync')
  .post(syncController.trigger)
  .get(syncController.list);
router.route('/sync/:id')
  .get(syncController.getStatus);
router.route('/sync/:id/logs')
  .get(syncController.getLogs);

// ============================================================
// Webhooks (public — signed by Listok/Bitrix24)
// ============================================================
router.route('/webhooks/listok')
  .post(webhooksController.listokHandler);
router.route('/webhooks/bitrix24')
  .post(webhooksController.bitrix24Handler);

// ============================================================
// 404 for /api/*
// ============================================================
router.use((req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'API endpoint not found' });
});

module.exports = router;
