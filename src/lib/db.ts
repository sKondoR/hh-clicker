import { drizzle } from 'drizzle-orm/vercel-postgres';
import { createPool } from '@vercel/postgres';
import * as schema from './schema';

const connectionString = process.env.POSTGRES_URL;

console.log('connectionString', connectionString);
if (!connectionString) {
  throw new Error('POSTGRES_URL is required');
}
const pool = createPool({
  connectionString,
  max: 30,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  try {
    await pool.connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

testConnection().catch(console.error);

export const db = drizzle(pool, { schema });

// For server actions
export async function getDb() {
  return db;
}