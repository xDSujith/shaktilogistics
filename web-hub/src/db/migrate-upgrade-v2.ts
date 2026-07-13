import { pool } from './pool';

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id          SERIAL PRIMARY KEY,
        title       TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        event_date  DATE NOT NULL,
        location    TEXT NOT NULL DEFAULT '',
        created_by  INTEGER NOT NULL REFERENCES users(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query('COMMIT');
    console.log('Upgrade migration v2 complete (events table added).');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Upgrade migration v2 failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
