import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query('select id from users limit 1');
  await pool.end();
  console.log(jwt.sign({ id: rows[0].id }, process.env.ACCESS_SECRET!, { expiresIn: '2m' }));
})();
