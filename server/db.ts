import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '../drizzle/schema';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Returns true when neither DATABASE_URL nor DATABASE_PATH is provided.
 * All routers should call this instead of `!process.env.DATABASE_URL`
 * because our SQLite DB uses DATABASE_PATH (not DATABASE_URL).
 */
export function isMockMode(): boolean {
  return !process.env.DATABASE_URL && !process.env.DATABASE_PATH && !process.env.TURSO_DATABASE_URL;
}

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../tablebook.db');

// Singleton instance
let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: Database.Database | null = null;

export function getDb() {
  if (!_db) {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;

    if (tursoUrl && tursoUrl.startsWith('libsql://')) {
      try {
        const client = createClient({
          url: tursoUrl,
          authToken: tursoToken,
        });
        _db = drizzleLibsql(client, { schema }) as any;
        console.log(`[DB] Connected to TURSO CLOUD at ${tursoUrl}`);
      } catch (error) {
        console.warn('[DB] Failed to connect to Turso:', error);
      }
    }

    if (!_db) {
      try {
        _sqlite = new Database(DB_PATH);
        _sqlite.pragma('journal_mode = WAL');
        _sqlite.pragma('foreign_keys = ON');
        _db = drizzle(_sqlite, { schema }) as any;
        console.log(`[DB] Connected to LOCAL SQLite at ${DB_PATH}`);
      } catch (error) {
        console.warn('[DB] Failed to open local SQLite:', error);
        _db = null;
      }
    }
  }
  return _db;
}

// Proxy that falls back gracefully when DB is not available
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDb();
    if (!instance) {
      return (..._args: any[]) => {
        console.warn(`[DB] Operation "${String(prop)}" called but DB not available. Using mock fallback.`);
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
    _db = null;
    console.log('[DB] Connection closed');
  }
}

// ── Helpers used by sdk.ts & oauth.ts ─────────────────────────────────────────

import { eq } from 'drizzle-orm';
import { users } from '../drizzle/schema';

/**
 * Find a user by their OAuth openId.
 * Returns null if DB is unavailable or user not found.
 */
export async function getUserByOpenId(openId: string) {
  const instance = getDb();
  if (!instance) return null;
  const result = await instance.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? null;
}

/**
 * Insert or update a user record. Merges only provided fields.
 */
export async function upsertUser(data: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
  restaurantId?: string | null;
}) {
  const instance = getDb();
  if (!instance) return;
  const now = new Date().toISOString();
  await (instance as any)
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

