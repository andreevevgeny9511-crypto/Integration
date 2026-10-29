// ============================================================
// Bitrix24 ↔ Listok Integration — Webhooks Controller
// ============================================================

const { query } = require('../db/client');
const logger = require('../utils/logger');

/**
 * Handle incoming webhook from Listok
 */
async function listokHandler(req, res) {
  try {
    const { event, data } = req.body;

    // Verify webhook signature if configured
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-webhook-signature'];
      if (!verifySignature(req.body, signature, webhookSecret)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    logger.info('Listok webhook received', { event, dataId: data?.id });

    // Process the webhook event
    switch (event) {
      case 'contact.created':
      case 'contact.updated':
        await handleContactChange(data, 'listok_to_bitrix24');
        break;
      case 'contact.deleted':
        await handleContactDeletion(data);
        break;
      case 'payment.created':
        await handlePaymentChange(data, 'listok_to_bitrix24');
        break;
      case 'event.created':
        await handleEventChange(data, 'listok_to_bitrix24');
        break;
      default:
        logger.info('Unhandled Listok webhook event', { event });
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Listok webhook processing error', { error: err.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Handle incoming webhook from Bitrix24
 */
async function bitrix24Handler(req, res) {
  try {
    const { event, data } = req.body;

    // Verify webhook signature
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-webhook-signature'];
      if (!verifySignature(req.body, signature, webhookSecret)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    logger.info('Bitrix24 webhook received', { event, dataId: data?.ID || data?.id });

    switch (event) {
      case 'crm.lead.add':
      case 'crm.lead.update':
        await handleLeadChange(data, 'bitrix24_to_listok');
        break;
      case 'crm.deal.add':
      case 'crm.deal.update':
        await handleDealChange(data, 'bitrix24_to_listok');
        break;
      case 'crm.contact.add':
      case 'crm.contact.update':
        await handleContactChange(data, 'bitrix24_to_listok');
        break;
      case 'crm.company.add':
      case 'crm.company.update':
        await handleCompanyChange(data, 'bitrix24_to_listok');
        break;
      default:
        logger.info('Unhandled Bitrix24 webhook event', { event });
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Bitrix24 webhook processing error', { error: err.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Verify webhook signature
 */
function verifySignature(payload, signature, secret) {
  if (!signature) return false;
  const crypto = require('crypto');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Handle contact changes from Listok
 */
async function handleContactChange(data, direction) {
  const integrations = await query(
    'SELECT * FROM integrations WHERE enabled = true'
  );

  for (const integration of integrations.rows) {
    const rules = await query(
      'SELECT * FROM sync_rules WHERE integration_id = $1 AND target_entity = $2 AND enabled = true',
      [integration.id, 'contact']
    );

    for (const rule of rules.rows) {
      // Queue sync job
      await query(
        `INSERT INTO sync_queue (id, integration_id, sync_rule_id, entity_type_id, direction, status, scheduled_at)
         VALUES ($1, $2, $3, $4, $5, 'queued', NOW())`,
        [require('uuid').v4(), integration.id, rule.id, 'contact', direction]
      );
    }
  }
}

/**
 * Handle contact deletion from Listok
 */
async function handleContactDeletion(data) {
  logger.info('Contact deletion webhook received', { contactId: data?.id });
  // Mark related sync records as needing update
}

/**
 * Handle payment changes from Listok
 */
async function handlePaymentChange(data, direction) {
  logger.info('Payment webhook received', { paymentId: data?.id, direction });
}

/**
 * Handle event changes from Listok
 */
async function handleEventChange(data, direction) {
  logger.info('Event webhook received', { eventId: data?.id, direction });
}

/**
 * Handle lead changes from Bitrix24
 */
async function handleLeadChange(data, direction) {
  const integrations = await query(
    'SELECT * FROM integrations WHERE enabled = true'
  );

  for (const integration of integrations.rows) {
    const rules = await query(
      'SELECT * FROM sync_rules WHERE integration_id = $1 AND source_entity = $2 AND enabled = true',
      [integration.id, 'lead']
    );

    for (const rule of rules.rows) {
      await query(
        `INSERT INTO sync_queue (id, integration_id, sync_rule_id, entity_type_id, direction, status, scheduled_at)
         VALUES ($1, $2, $3, $4, $5, 'queued', NOW())`,
        [require('uuid').v4(), integration.id, rule.id, 'lead', direction]
      );
    }
  }
}

/**
 * Handle deal changes from Bitrix24
 */
async function handleDealChange(data, direction) {
  const integrations = await query(
    'SELECT * FROM integrations WHERE enabled = true'
  );

  for (const integration of integrations.rows) {
    const rules = await query(
      'SELECT * FROM sync_rules WHERE integration_id = $1 AND source_entity = $2 AND enabled = true',
      [integration.id, 'deal']
    );

    for (const rule of rules.rows) {
      await query(
        `INSERT INTO sync_queue (id, integration_id, sync_rule_id, entity_type_id, direction, status, scheduled_at)
         VALUES ($1, $2, $3, $4, $5, 'queued', NOW())`,
        [require('uuid').v4(), integration.id, rule.id, 'deal', direction]
      );
    }
  }
}

/**
 * Handle contact changes from Bitrix24
 */
async function handleContactChange(data, direction) {
  const integrations = await query(
    'SELECT * FROM integrations WHERE enabled = true'
  );

  for (const integration of integrations.rows) {
    const rules = await query(
      'SELECT * FROM sync_rules WHERE integration_id = $1 AND source_entity = $2 AND enabled = true',
      [integration.id, 'contact']
    );

    for (const rule of rules.rows) {
      await query(
        `INSERT INTO sync_queue (id, integration_id, sync_rule_id, entity_type_id, direction, status, scheduled_at)
         VALUES ($1, $2, $3, $4, $5, 'queued', NOW())`,
        [require('uuid').v4(), integration.id, rule.id, 'contact', direction]
      );
    }
  }
}

/**
 * Handle company changes from Bitrix24
 */
async function handleCompanyChange(data, direction) {
  const integrations = await query(
    'SELECT * FROM integrations WHERE enabled = true'
  );

  for (const integration of integrations.rows) {
    const rules = await query(
      'SELECT * FROM sync_rules WHERE integration_id = $1 AND source_entity = $2 AND enabled = true',
      [integration.id, 'company']
    );

    for (const rule of rules.rows) {
      await query(
        `INSERT INTO sync_queue (id, integration_id, sync_rule_id, entity_type_id, direction, status, scheduled_at)
         VALUES ($1, $2, $3, $4, $5, 'queued', NOW())`,
        [require('uuid').v4(), integration.id, rule.id, 'company', direction]
      );
    }
  }
}

module.exports = { listokHandler, bitrix24Handler };
