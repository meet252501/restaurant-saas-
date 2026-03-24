/**
 * OFFLINE SYNC SERVICE
 * Implements local-first architecture for TableBook
 * - Queues bookings locally when offline
 * - Syncs when connection is restored
 * - Handles conflicts and retries
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface QueuedBooking {
  localId: string;
  bookingData: any;
  synced: boolean;
  serverId?: string;
  createdAt: string;
  syncAttempts: number;
  lastSyncError?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingBookings: number;
  syncedBookings: number;
  lastSyncTime?: string;
  isSyncing: boolean;
}

class OfflineSync {
  private syncStatus: SyncStatus = {
    isOnline: true,
    pendingBookings: 0,
    syncedBookings: 0,
    isSyncing: false,
  };

  private syncListeners: Set<(status: SyncStatus) => void> = new Set();

  /**
   * Initialize offline sync
   * - Check initial network status
   * - Listen for network changes
   * - Load pending bookings from storage
   */
  async initialize() {
    // Check initial network status
    const state = await NetInfo.fetch();
    this.syncStatus.isOnline = state.isConnected ?? true;

    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = this.syncStatus.isOnline;
      this.syncStatus.isOnline = state.isConnected ?? true;

      console.log(`[OfflineSync] Network status: ${this.syncStatus.isOnline ? 'ONLINE' : 'OFFLINE'}`);

      // If just came online, sync pending bookings
      if (!wasOnline && this.syncStatus.isOnline) {
        console.log('[OfflineSync] Connection restored! Syncing pending bookings...');
        this.syncPendingBookings();
      }

      this.notifyListeners();
    });

    // Load pending bookings
    await this.loadPendingBookings();

    return unsubscribe;
  }

  /**
   * Queue a booking locally when offline
   */
  async queueBooking(booking: any): Promise<QueuedBooking> {
    const queuedBooking: QueuedBooking = {
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bookingData: booking,
      synced: false,
      createdAt: new Date().toISOString(),
      syncAttempts: 0,
    };

    // Get existing queue
    const queue = await this.getBookingQueue();
    queue.push(queuedBooking);

    // Save to storage
    await AsyncStorage.setItem('bookingQueue', JSON.stringify(queue));

    console.log(`[OfflineSync] Booking queued locally: ${queuedBooking.localId}`);

    this.syncStatus.pendingBookings = queue.filter(b => !b.synced).length;
    this.notifyListeners();

    return queuedBooking;
  }

  /**
   * Get all queued bookings
   */
  async getBookingQueue(): Promise<QueuedBooking[]> {
    try {
      const queue = await AsyncStorage.getItem('bookingQueue');
      return queue ? JSON.parse(queue) : [];
    } catch (e) {
      console.error('[OfflineSync] Failed to load booking queue:', e);
      return [];
    }
  }

  /**
   * Load pending bookings from storage on app start
   */
  private async loadPendingBookings() {
    const queue = await this.getBookingQueue();
    this.syncStatus.pendingBookings = queue.filter(b => !b.synced).length;
    this.syncStatus.syncedBookings = queue.filter(b => b.synced).length;
    this.notifyListeners();
  }

  /**
   * Sync pending bookings with server
   * - Retry failed bookings up to 3 times
   * - Handle conflicts gracefully
   * - Update local state
   */
  async syncPendingBookings(trpc?: any): Promise<{ synced: number; failed: number }> {
    if (this.syncStatus.isSyncing) {
      console.log('[OfflineSync] Sync already in progress, skipping...');
      return { synced: 0, failed: 0 };
    }

    if (!this.syncStatus.isOnline) {
      console.log('[OfflineSync] Still offline, cannot sync');
      return { synced: 0, failed: 0 };
    }

    this.syncStatus.isSyncing = true;
    this.notifyListeners();

    let synced = 0;
    let failed = 0;

    try {
      const queue = await this.getBookingQueue();
      const unsyncedBookings = queue.filter(b => !b.synced);

      console.log(`[OfflineSync] Syncing ${unsyncedBookings.length} pending bookings...`);

      for (const queuedBooking of unsyncedBookings) {
        try {
          // Attempt to sync with server
          if (trpc) {
            const response = await trpc.booking.create.mutate(queuedBooking.bookingData);
            
            // Mark as synced
            queuedBooking.synced = true;
            queuedBooking.serverId = response.id;
            queuedBooking.syncAttempts++;
            
            console.log(`[OfflineSync] ✅ Synced: ${queuedBooking.localId} → ${response.id}`);
            synced++;
          }
        } catch (error: any) {
          queuedBooking.syncAttempts++;
          queuedBooking.lastSyncError = error.message;

          // Retry up to 3 times
          if (queuedBooking.syncAttempts >= 3) {
            console.error(`[OfflineSync] ❌ Failed after 3 attempts: ${queuedBooking.localId}`, error.message);
            failed++;
          } else {
            console.warn(`[OfflineSync] ⚠️ Sync attempt ${queuedBooking.syncAttempts} failed for ${queuedBooking.localId}`, error.message);
          }
        }
      }

      // Save updated queue
      await AsyncStorage.setItem('bookingQueue', JSON.stringify(queue));

      // Update status
      this.syncStatus.pendingBookings = queue.filter(b => !b.synced).length;
      this.syncStatus.syncedBookings = queue.filter(b => b.synced).length;
      this.syncStatus.lastSyncTime = new Date().toISOString();

      console.log(`[OfflineSync] Sync complete: ${synced} synced, ${failed} failed`);
    } catch (error) {
      console.error('[OfflineSync] Sync operation failed:', error);
    } finally {
      this.syncStatus.isSyncing = false;
      this.notifyListeners();
    }

    return { synced, failed };
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners() {
    this.syncListeners.forEach(listener => {
      listener({ ...this.syncStatus });
    });
  }

  /**
   * Clear all synced bookings from queue
   */
  async clearSyncedBookings() {
    const queue = await this.getBookingQueue();
    const unsyncedOnly = queue.filter(b => !b.synced);
    await AsyncStorage.setItem('bookingQueue', JSON.stringify(unsyncedOnly));

    this.syncStatus.syncedBookings = 0;
    this.notifyListeners();

    console.log('[OfflineSync] Cleared synced bookings');
  }

  /**
   * Get a specific queued booking by local ID
   */
  async getQueuedBooking(localId: string): Promise<QueuedBooking | null> {
    const queue = await this.getBookingQueue();
    return queue.find(b => b.localId === localId) || null;
  }

  /**
   * Cancel a queued booking before it's synced
   */
  async cancelQueuedBooking(localId: string): Promise<boolean> {
    const queue = await this.getBookingQueue();
    const index = queue.findIndex(b => b.localId === localId && !b.synced);

    if (index === -1) {
      console.warn(`[OfflineSync] Cannot cancel booking ${localId} - not found or already synced`);
      return false;
    }

    queue.splice(index, 1);
    await AsyncStorage.setItem('bookingQueue', JSON.stringify(queue));

    this.syncStatus.pendingBookings = queue.filter(b => !b.synced).length;
    this.notifyListeners();

    console.log(`[OfflineSync] Cancelled queued booking: ${localId}`);
    return true;
  }

  /**
   * Get storage usage info
   */
  async getStorageInfo(): Promise<{ queueSize: number; estimatedBytes: number }> {
    try {
      const queue = await this.getBookingQueue();
      const queueString = JSON.stringify(queue);
      return {
        queueSize: queue.length,
        estimatedBytes: queueString.length,
      };
    } catch (e) {
      return { queueSize: 0, estimatedBytes: 0 };
    }
  }
}

// Export singleton instance
export const offlineSync = new OfflineSync();
