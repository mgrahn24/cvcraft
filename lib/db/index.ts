import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// `prepare: false` is required for Supabase's connection pooler (PgBouncer in transaction mode).
// `max: 1` in production prevents each serverless function instance from holding multiple
// connections. In dev the server is long-lived so we allow a small pool to avoid queuing.
// `idle_timeout` releases connections after inactivity so Supabase's connection limit isn't
// exhausted by lingering warm serverless instances.
// `connect_timeout` ensures a failed/saturated DB fails fast instead of hanging the request.
const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  max: process.env.NODE_ENV === 'production' ? 1 : 3,
  idle_timeout: 20,
  connect_timeout: 10,
});
export const db = drizzle(client, { schema });
