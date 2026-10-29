// ============================================================
// Bitrix24 ↔ Listok Integration — PostgreSQL Client
// ============================================================

const { Pool } = require('pg');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level.toUpperCase()}] ${message}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), logFormat),
  transports: [new transports.Console()],
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  min: parseInt(process.env.DB_POOL_MIN || '5', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10),
  maxUses: parseInt(process.env.DB_MAX_USES || '1000', 10),
});

pool.on('connect', () => {
  logger.info('New client connected to PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL error', { error: err.message });
});

pool.on('remove', (client) => {
  logger.debug('Client removed from pool');
});

async function connect() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() AS now');
    logger.info('Database connection verified', { serverTime: result.rows[0].now });
    client.release();
    return true;
  } catch (err) {
    logger.error('Database connection failed', { error: err.message });
    throw err;
  }
}

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query completed', { duration, rows: result.rowCount });
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    logger.error('Query failed', { error: err.message, duration, query: text });
    throw err;
  }
}

async function getClient() {
  return pool.connect();
}

async function close() {
  await pool.end();
  logger.info('Database pool closed');
}

module.exports = {
  pool,
  connect,
  query,
  getClient,
  close,
};
