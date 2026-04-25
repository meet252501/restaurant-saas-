import NetInfo from '@react-native-community/netinfo';
import { getOfflineDb, checkAndPruneIfNewDay, getPendingMutations, removeMutation } from '../utils/offlineDb';
import { queryClient } from './queryClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncStatus {
  isOnline: boolean;
  pendingBookings: number;
  syncedBookings: number;
  lastSyncTime?: string;
  isSyncing: boolean;
}

export interface SyncTask {
  id: string;
  mutation_type: string;
  payload: string;
  created_at: string;
}

class OfflineSync {
  private syncStatus: SyncStatus = {
    isOnline: true,
    pendingBookings: 0,
    syncedBookings: 0,
    isSyncing: false,
  };
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();
  private trpcClient: any;

  // We set the trpc client so the SyncEngine can make calls
  setTrpcClient(client: any) {
    this.trpcClient = client;
    this.pushPendingMutations(); // Attempt to push when trpc is provided
  }

  async initialize() {
    console.log('[OfflineSync] Initializing local database and sync manager...');

    // 30-Day Data Retention - prune local cache if it's a new day
    await checkAndPruneIfNewDay();

    const state = await NetInfo.fetch();
    this.syncStatus.isOnline = state.isConnected ?? true;

    NetInfo.addEventListener(state => {
      const wasOnline = this.syncStatus.isOnline;
      this.syncStatus.isOnline = state.isConnected ?? true;
      console.log(`[OfflineSync] Network status: ${this.syncStatus.isOnline ? 'ONLINE' : 'OFFLINE'}`);

      if (!wasOnline && this.syncStatus.isOnline) {
        console.log('[OfflineSync] Connection restored! Syncing pending mutations...');
        this.pushPendingMutations();
        this.syncDataSnapshot(); // Sync fresh data when back online
      }
      this.notifyListeners();
    });

    // Check if we need to seed history (if local DB is empty)
    if (this.syncStatus.isOnline) {
      const db = await getOfflineDb();
      const count = await db.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM bookings');
      if (count && count.count === 0) {
        console.log('[OfflineSync] Local database is empty. Seeding 30-day history...');
        this.syncHistory(30).catch(e => console.error('[OfflineSync] History seed failed:', e));
      } else {
        this.syncDataSnapshot();
      }
    }

    await this.updateStatus();
    return () => {};
  }

  async updateStatus() {
    const queue = await getPendingMutations();
    this.syncStatus.pendingBookings = queue.length;
    this.notifyListeners();
  }

  async pushPendingMutations() {
    if (this.syncStatus.isSyncing || !this.trpcClient || !this.syncStatus.isOnline) return { synced: 0, failed: 0 };
    this.syncStatus.isSyncing = true;
    this.notifyListeners();

    let synced = 0;
    let failed = 0;

    try {
      const mutations = await getPendingMutations() as SyncTask[];
      if (mutations.length === 0) return { synced: 0, failed: 0 };
      
      console.log(`[OfflineSync] Found ${mutations.length} pending offline mutations to push.`);

      for (const task of mutations) {
        try {
          const payload = JSON.parse(task.payload);
          switch (task.mutation_type) {
            case 'createBooking':
              await this.trpcClient.booking.create.mutate(payload);
              break;
            case 'updateBookingStatus':
              await this.trpcClient.booking.updateStatus.mutate(payload);
              break;
            case 'updateTableStatus':
              await this.trpcClient.table.updateStatus.mutate(payload);
              break;
            // Add other mutations here
          }
          await removeMutation(task.id);
          synced++;
        } catch (e: any) {
          console.error(`[OfflineSync] Failed to sync mutation ${task.mutation_type}:`, e);
          failed++;
        }
      }
      queryClient?.invalidateQueries();
      this.syncStatus.lastSyncTime = new Date().toISOString();
    } finally {
      this.syncStatus.isSyncing = false;
      await this.updateStatus();
    }
    return { synced, failed };
  }

  // Hook for UI
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.syncListeners.forEach(listener => {
      listener({ ...this.syncStatus });
    });
  }

  /**
   * Syncs today's data and essential metadata (tables, customers)
   */
  async syncDataSnapshot() {
    if (!this.trpcClient || !this.syncStatus.isOnline) return;
    try {
      console.log('[OfflineSync] Syncing fresh data snapshot...');
      const today = new Date().toISOString().split('T')[0];
      
      const [bookings, delivery, tables, customers] = await Promise.all([
        this.trpcClient.booking.listByDate.query({ date: today }),
        this.trpcClient.delivery.today.query(),
        this.trpcClient.table.listByRestaurant.query(),
        this.trpcClient.booking.listCustomers.query(),
      ]);

      const db = await getOfflineDb();

      // 1. Sync Bookings
      for (const b of bookings) {
        await db.runAsync(
          `INSERT OR REPLACE INTO bookings (id, restaurant_id, customer_id, table_id, guest_name, guest_phone, booking_date, booking_time, party_size, status, source, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [b.id, b.restaurantId, b.customerId, b.tableId, b.customerName || b.guestName, b.customerPhone || b.guestPhone, b.bookingDate, b.bookingTime, b.partySize, b.status, b.source, b.createdAt]
        );
      }

      // 2. Sync Delivery Orders
      const dOrders = delivery.orders || delivery || [];
      for (const o of dOrders) {
        await db.runAsync(
          `INSERT OR REPLACE INTO delivery_orders (id, restaurant_id, platform, external_id, customer_name, total_amount, status, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [o.id, o.restaurantId || '', o.platform, o.orderId, o.customerName, o.total, o.status, o.placedAt]
        );
      }

      // 3. Sync Tables
      for (const t of tables) {
        await db.runAsync(
          `INSERT OR REPLACE INTO tables (id, restaurant_id, table_number, capacity, status) VALUES (?, ?, ?, ?, ?)`,
          [t.id, t.restaurantId, t.tableNumber, t.capacity, t.status]
        );
      }

      // 4. Sync Customers
      for (const c of customers) {
        await db.runAsync(
          `INSERT OR REPLACE INTO customers (id, restaurant_id, name, phone, email, visit_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [c.id, c.restaurantId, c.name, c.phone, c.email, c.visitCount, c.createdAt]
        );
      }

      console.log('[OfflineSync] Data snapshot completed.');
    } catch (e) {
      console.error('[OfflineSync] Snapshot failed:', e);
    }
  }

  /**
   * Seeds historical data for the last N days
   */
  async syncHistory(days: number = 30) {
    if (!this.trpcClient || !this.syncStatus.isOnline) return;
    try {
      console.log(`[OfflineSync] Syncing ${days}-day history...`);
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);

      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];

      const [historyBookings, historyDelivery] = await Promise.all([
        this.trpcClient.booking.listByRange.query({ startDate, endDate }),
        this.trpcClient.delivery.listByRange.query({ startDate: start.toISOString(), endDate: end.toISOString() }),
      ]);

      const db = await getOfflineDb();

      // Batch insert bookings
      for (const b of historyBookings) {
        await db.runAsync(
          `INSERT OR REPLACE INTO bookings (id, restaurant_id, customer_id, table_id, guest_name, guest_phone, booking_date, booking_time, party_size, status, source, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [b.id, b.restaurantId, b.customerId, b.tableId, b.customerName || b.guestName, b.customerPhone || b.guestPhone, b.bookingDate, b.bookingTime, b.partySize, b.status, b.source, b.createdAt]
        );
      }

      // Batch insert delivery
      for (const o of historyDelivery) {
        await db.runAsync(
          `INSERT OR REPLACE INTO delivery_orders (id, restaurant_id, platform, external_id, customer_name, total_amount, status, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [o.id, o.restaurantId || '', o.platform, o.orderId, o.customerName, o.total, o.status, o.placedAt]
        );
      }

      console.log(`[OfflineSync] Successfully seeded ${historyBookings.length} bookings and ${historyDelivery.length} orders.`);
      await this.syncDataSnapshot(); // Final refresh for today
    } catch (e) {
      console.error('[OfflineSync] History sync failed:', e);
    }
  }
}

export const offlineSync = new OfflineSync();
