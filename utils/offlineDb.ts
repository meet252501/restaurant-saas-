import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Initialize the local offline database
let db: SQLite.SQLiteDatabase | null = null;

export const getOfflineDb = async () => {
  if (db) return db;
  if (Platform.OS === 'web') {
    throw new Error('SQLite not supported on web');
  }
  db = await SQLite.openDatabaseAsync('tablebook_offline.db');
  await initSchema(db);
  return db;
};

const initSchema = async (database: SQLite.SQLiteDatabase) => {
  // We recreate the local tables. Since this is a 1-day retention cache, 
  // we don't need complex migrations. We just ensure they exist.
  
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      mutation_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT,
      customer_id TEXT,
      table_id TEXT,
      guest_name TEXT,
      guest_phone TEXT,
      booking_date TEXT,
      booking_time TEXT,
      party_size INTEGER,
      status TEXT,
      source TEXT,
      cover_charge INTEGER,
      payment_status TEXT,
      payment_id TEXT,
      special_requests TEXT,
      whatsapp_sent INTEGER,
      reminder_sent INTEGER,
      final_bill INTEGER,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT,
      table_number INTEGER,
      capacity INTEGER,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS delivery_orders (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT,
      platform TEXT,
      external_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      total_amount INTEGER,
      status TEXT,
      items_summary TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT,
      name TEXT,
      phone TEXT,
      email TEXT,
      visit_count INTEGER,
      notes TEXT,
      tags TEXT,
      created_at TEXT
    );
  `);
};

/**
 * Prunes data older than 30 days.
 */
export const pruneOldData = async () => {
  const database = await getOfflineDb();
  
  // Calculate the cutoff date (30 days ago)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split('T')[0]; // YYYY-MM-DD
  const cutoffFullStr = cutoff.toISOString();

  // 1. Prune bookings whose reservation date is older than 30 days
  await database.runAsync(`DELETE FROM bookings WHERE booking_date < ?`, [cutoffStr]);
  
  // 2. Prune delivery orders older than 30 days
  await database.runAsync(`DELETE FROM delivery_orders WHERE created_at < ?`, [cutoffFullStr]);

  // 3. Prune sync_queue for old successfully processed items if any 
  await database.runAsync(`DELETE FROM sync_queue WHERE created_at < ?`, [cutoffFullStr]);

  console.log(`[OfflineDB] Pruned data older than ${cutoffStr} (30-day retention).`);
};

/**
 * Checks if it's a new day and prunes old data if so.
 */
export const checkAndPruneIfNewDay = async () => {
  const today = new Date().toISOString().split('T')[0];
  const lastActiveDay = await AsyncStorage.getItem('last_active_day');
  
  if (lastActiveDay && lastActiveDay !== today) {
    await pruneOldData();
  }
  
  await AsyncStorage.setItem('last_active_day', today);
};

// Queue a mutation to be synced to the cloud when online
export const queueMutation = async (mutationType: string, payload: any) => {
  const database = await getOfflineDb();
  const id = Math.random().toString(36).substring(7);
  await database.runAsync(
    'INSERT INTO sync_queue (id, mutation_type, payload, created_at) VALUES (?, ?, ?, ?)',
    [id, mutationType, JSON.stringify(payload), new Date().toISOString()]
  );
  console.log(`[OfflineDB] Queued offline mutation: ${mutationType}`);
};

// Get all pending mutations
export const getPendingMutations = async () => {
  const database = await getOfflineDb();
  return await database.getAllAsync('SELECT * FROM sync_queue ORDER BY created_at ASC');
};

// Remove a mutation from the queue after successful sync
export const removeMutation = async (id: string) => {
  const database = await getOfflineDb();
  await database.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
};
