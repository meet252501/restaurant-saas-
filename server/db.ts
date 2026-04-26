import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import * as sqliteSchema from '../drizzle/schema';
import * as pgSchema from '../drizzle/schema.postgres';
import path from 'path';
import dotenv from 'dotenv';
import { InferSelectModel } from 'drizzle-orm';

// Detect if we are running in a Node environment
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

// Safe __dirname for ESM/CommonJS and Metro bundler compatibility
const __filename = '';
const __dirname = '.';

dotenv.config();

/**
 * Returns true when neither DATABASE_PATH nor DATABASE_URL is provided.
 */
export function isMockMode(): boolean {
  return !process.env.DATABASE_URL && !process.env.DATABASE_PATH;
}

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(process.cwd(), 'tablebook.db');

// Database Instances
let _db: any = null;
let _sqlite: any = null;
let _pool: any = null;

/**
 * Initializes the Database (SQLite for local, Postgres for Cloud).
 */
export function initDatabases() {
  if (_db) return { db: _db };
  if (!isNode) return { db: null };

  const dbUrl = process.env.DATABASE_URL;

  // 1. Cloud Postgres Mode
  if (dbUrl?.startsWith('postgres')) {
    try {
      const pg = eval('require("pg")');
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
      const Database = eval('require("better-sqlite3")');
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

/**
 * Universal Schema Switcher
 */
export const schema = new Proxy({} as any, {
  get(_target, prop) {
    const isPostgres = process.env.DATABASE_URL?.startsWith('postgres');
    const active = isPostgres ? pgSchema : sqliteSchema;
    return (active as any)[prop];
  }
}) as typeof pgSchema;

// Individually export proxies for all tables
export const users = schema.users;
export const restaurants = schema.restaurants;
export const tables = schema.tables;
export const bookings = schema.bookings;
export const customers = schema.customers;
export const menuItems = schema.menuItems;
export const deliveryOrders = schema.deliveryOrders;
export const reviews = schema.reviews;
export const staff = schema.staff;

// Export Types for Routers
export type User = InferSelectModel<typeof pgSchema.users>;
export type Restaurant = InferSelectModel<typeof pgSchema.restaurants>;
export type Table = InferSelectModel<typeof pgSchema.tables>;
export type Booking = InferSelectModel<typeof pgSchema.bookings>;
export type Customer = InferSelectModel<typeof pgSchema.customers>;
export type MenuItem = InferSelectModel<typeof pgSchema.menuItems>;
export type DeliveryOrder = InferSelectModel<typeof pgSchema.deliveryOrders>;
export type Review = InferSelectModel<typeof pgSchema.reviews>;
export type Staff = InferSelectModel<typeof pgSchema.staff>;

export function closeDb() {
  if (_sqlite) {
    try { _sqlite.close(); } catch {}
    _sqlite = null;
    console.log('[DB] Local SQLite connection closed');
  }
  if (_pool) {
    try { _pool.end(); } catch {}
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
  try {
    const result = await instance.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result[0] ?? null;
  } catch {
    return null;
  }
}

export async function upsertUser(data: any) {
  const instance = db;
  const now = new Date().toISOString();
  await instance
    .insert(users)
    .values({
      openId: data.openId,
      name: data.name ?? null,
      email: data.email ?? null,
      loginMethod: data.loginMethod ?? null,
      lastSignedIn: data.lastSignedIn?.toISOString() ?? now,
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: users.openId,
      set: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.loginMethod !== undefined && { loginMethod: data.loginMethod }),
        ...(data.lastSignedIn && { lastSignedIn: data.lastSignedIn.toISOString() }),
      },
    });
}
