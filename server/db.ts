import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as sqliteSchema from '../drizzle/schema';
import * as pgSchema from '../drizzle/schema.postgres';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

/**
 * Returns true when neither DATABASE_PATH nor DATABASE_URL is provided.
 */
export function isMockMode(): boolean {
  return !process.env.DATABASE_URL && !process.env.DATABASE_PATH;
}

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../tablebook.db');

// Database Instances
let _db: any = null;
let _sqlite: Database.Database | null = null;
let _pool: pg.Pool | null = null;

/**
 * Initializes the Database (SQLite for local, Postgres for Cloud).
 */
export function initDatabases() {
  if (_db) return { db: _db };

  const dbUrl = process.env.DATABASE_URL;

  // 1. Cloud Postgres Mode
  if (dbUrl?.startsWith('postgres')) {
    try {
      _pool = new pg.Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
      });
      _db = drizzlePostgres(_pool, { schema: pgSchema });
      console.log(`[DB] Cloud PostgreSQL initialized.`);
    } catch (error) {
      console.error('[DB] Failed to initialize Cloud PostgreSQL:', error);
    }
  } 
  // 2. Local SQLite Mode
  else if (!isMockMode()) {
    try {
      _sqlite = new Database(DB_PATH);
      _sqlite.pragma('journal_mode = WAL');
      _sqlite.pragma('foreign_keys = ON');
      _db = drizzleSqlite(_sqlite, { schema: sqliteSchema });
      console.log(`[DB] Local SQLite initialized at ${DB_PATH}`);
    } catch (error) {
      console.error('[DB] Failed to initialize local SQLite:', error);
    }
  }

  return { db: _db };
}

/**
 * Get current active database
 */
export function getDb() {
  return initDatabases().db;
}

// Global db instance for the app
export const db = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getDb();
    if (!instance) {
      return (..._args: any[]) => {
        console.warn(`[DB] Operation "${String(prop)}" called but no DB available.`);
        throw new Error(`DB_UNAVAILABLE:${String(prop)}`);
      };
    }
    return (instance as any)[prop];
  },
});

export function closeDb() {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    console.log('[DB] Local SQLite connection closed');
  }
  if (_pool) {
    _pool.end();
    _pool = null;
    console.log('[DB] Cloud PostgreSQL pool closed');
  }
  _db = null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
import { eq } from 'drizzle-orm';

export async function getUserByOpenId(openId: string) {
  const instance = getDb();
  if (!instance) return null;
  
  const schema = process.env.DATABASE_URL?.startsWith('postgres') ? pgSchema : sqliteSchema;
  
  try {
    const result = await instance.select().from(schema.users).where(eq(schema.users.openId, openId)).limit(1);
    return result[0] ?? null;
  } catch {
    return null;
  }
}

export async function upsertUser(data: any) {
  const instance = db;
  const schema = process.env.DATABASE_URL?.startsWith('postgres') ? pgSchema : sqliteSchema;
  const now = new Date().toISOString();
  
  await instance
    .insert(schema.users)
    .values({
      openId: data.openId,
      name: data.name ?? null,
      email: data.email ?? null,
      loginMethod: data.loginMethod ?? null,
      lastSignedIn: data.lastSignedIn?.toISOString() ?? now,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: schema.users.openId,
      set: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.loginMethod !== undefined && { loginMethod: data.loginMethod }),
        ...(data.lastSignedIn && { lastSignedIn: data.lastSignedIn.toISOString() }),
      },
    });
}
