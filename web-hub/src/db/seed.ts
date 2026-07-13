import { pool } from './pool';
import bcrypt from 'bcryptjs';

async function main() {
  const hash = await bcrypt.hash('admin123', 12);
  try {
    await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@shaktilogistics.com', hash, 'admin']
    );
    console.log('Seed complete — admin@shaktilogistics.com / admin123');
  } catch (err: any) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
