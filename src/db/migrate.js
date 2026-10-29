// ============================================================
// Bitrix24 ↔ Listok Integration — Migration Runner
// ============================================================

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bitrix_listok',
});

const MIGRATIONS_DIR = path.join(__dirname, '../../data/migrations');

async function runMigrations() {
  const client = await pool.connect();

  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get already executed migrations
    const { rows: executed } = await client.query(
      'SELECT filename FROM _migrations ORDER BY filename'
    );
    const executedSet = new Set(executed.map((r) => r.filename));

    // Get all migration files
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

    if (files.length === 0) {
      console.log('No migration files found');
      return;
    }

    for (const file of files) {
      if (executedSet.has(file)) {
        console.log(`Skipping already executed migration: ${file}`);
        continue;
      }

      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✓ Migration completed: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ Migration failed: ${file}`, err.message);
        throw err;
      }
    }

    console.log('All migrations completed successfully');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
