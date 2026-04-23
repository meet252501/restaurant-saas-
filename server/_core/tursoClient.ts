import { createClient } from '@libsql/client';
import "dotenv/config";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

// Detect placeholder / example values and treat them as "not configured"
const isPlaceholderUrl = !url || url.includes('your-db') || url === 'libsql://your-db-name.turso.io';
const isPlaceholderToken = !authToken || authToken.startsWith('eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...');

export const tursoClient = (!isPlaceholderUrl && !isPlaceholderToken)
  ? createClient({ url: url!, authToken: authToken! })
  : null;

/**
 * Initializes the required cloud table if it doesn't exist
 */
export async function initCloudDB() {
  if (!tursoClient) {
    console.warn('[Turso] Skipping cloud DB init: TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not set.');
    return;
  }

  try {
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS cloud_archives (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        data_json TEXT NOT NULL,
        archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Turso] cloud_archives table ready');
  } catch (error) {
    console.error('[Turso] Failed to initialize cloud DB:', error);
  }
}
