import { Pool } from 'pg';
import { config } from '../config';

const isLocal = config.databaseUrl.includes('localhost') || config.databaseUrl.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const dur = Date.now() - start;
  if (config.isDev() && dur > 200) {
    console.log(`SLOW QUERY (${dur}ms):`, text.substring(0, 120));
  }
  return result;
}
