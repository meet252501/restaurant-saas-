import { useState, useEffect } from 'react';
import { getOfflineDb } from './offlineDb';
import { trpc } from '../lib/trpc';
import { Platform } from 'react-native';

export function useOfflineBookings(date: string) {
  const [offlineBookings, setOfflineBookings] = useState<any[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Live data from server
  const query = trpc.booking.listByDate.useQuery(
    { date },
    { 
      refetchInterval: 10000,
      retry: 1, // Don't keep retrying if network is down
    }
  );

  // Load from local SQLite cache
  const loadOfflineCache = async () => {
    if (Platform.OS === 'web') return; // expo-sqlite is mostly for native
    try {
      const db = await getOfflineDb();
      // Filter by the requested date
      const results = await db.getAllAsync('SELECT * FROM bookings WHERE booking_date = ? ORDER BY booking_time ASC', [date]);
      
      // Format to match TRPC output
      const formatted = results.map((b: any) => ({
        id: b.id,
        restaurantId: b.restaurant_id,
        customerId: b.customer_id,
        tableId: b.table_id,
        guestName: b.guest_name,
        customerName: b.guest_name,
        guestPhone: b.guest_phone,
        customerPhone: b.guest_phone,
        bookingDate: b.booking_date,
        bookingTime: b.booking_time,
        partySize: b.party_size,
        status: b.status,
        source: b.source,
        createdAt: b.created_at,
      }));
      setOfflineBookings(formatted);
    } catch (e) {
      console.warn('[useOfflineBookings] Failed to load local cache:', e);
    }
  };

  useEffect(() => {
    loadOfflineCache();
  }, [date]);

  // Determine if we should show offline data
  useEffect(() => {
    if (query.isError || (query.data === undefined && !query.isFetching)) {
      setIsOfflineMode(true);
    } else if (query.data !== undefined) {
      setIsOfflineMode(false);
    }
  }, [query.data, query.isError, query.isFetching]);

  return {
    bookings: isOfflineMode ? offlineBookings : (query.data || offlineBookings),
    isOfflineMode,
    isLoading: query.isLoading && !isOfflineMode && offlineBookings.length === 0,
    refetch: async () => {
      await loadOfflineCache();
      return query.refetch();
    }
  };
}
