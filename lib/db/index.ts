import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// `prepare: false` is required for Supabase's connection pooler (PgBouncer in transaction mode).
// `max: 1` in production prevents each serverless function instance from holding multiple
// connections. In dev the server is long-lived so we allow a small pool to avoid queuing.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: process.env.NODE_ENV === 'production' ? 1 : 3,
});
export const db = drizzle(client, { schema });
