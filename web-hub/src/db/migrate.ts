import fs from 'fs';
import path from 'path';
import { pool } from './pool';

async function main() {
  const sql = fs.readFileSync(path.resolve(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Migration complete.');
  } catch (err: any) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
