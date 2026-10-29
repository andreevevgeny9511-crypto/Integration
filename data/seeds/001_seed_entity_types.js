// ============================================================
// Bitrix24 ↔ Listok Integration — Database Seed Script
// ============================================================

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bitrix_listok',
});

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Seed entity types
    const entityTypes = [
      { name: 'deal', description: 'CRM deals', bitrix24_entity: 'CRM_DEAL', listok_entity: 'deal' },
      { name: 'contact', description: 'CRM contacts', bitrix24_entity: 'CRM_CONTACT', listok_entity: 'contact' },
      { name: 'company', description: 'CRM companies', bitrix24_entity: 'CRM_COMPANY', listok_entity: 'company' },
      { name: 'lead', description: 'CRM leads', bitrix24_entity: 'CRM_LEAD', listok_entity: 'lead' },
    ];

    for (const et of entityTypes) {
      await client.query(
        `INSERT INTO entity_types (name, description, bitrix24_entity, listok_entity)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO NOTHING`,
        [et.name, et.description, et.bitrix24_entity, et.listok_entity]
      );
    }

    await client.query('COMMIT');
    console.log('Seed data inserted successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
