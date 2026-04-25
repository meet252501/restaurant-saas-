import { useState, useEffect } from 'react';
import { getOfflineDb } from './offlineDb';
import { trpc } from '../lib/trpc';
import { Platform } from 'react-native';

export function useOfflineDelivery() {
  const [offlineOrders, setOfflineOrders] = useState<any[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Live data from server
  const query = trpc.delivery.today.useQuery(
    undefined,
    { 
      refetchInterval: 15000,
      retry: 1,
    }
  );

  // Load from local SQLite cache
  const loadOfflineCache = async () => {
    if (Platform.OS === 'web') return;
    try {
      const db = await getOfflineDb();
      const today = new Date().toISOString().split('T')[0];
      // Fetch orders from today
      const results = await db.getAllAsync(
        'SELECT * FROM delivery_orders WHERE date(created_at) = ? ORDER BY created_at DESC', 
        [today]
      );
      
      const formatted = results.map((o: any) => ({
        id: o.id,
        platform: o.platform,
        orderId: o.external_id,
        customerName: o.customer_name,
        total: o.total_amount,
        status: o.status,
        placedAt: o.created_at,
        items: [], // Summary not stored as structured list yet
      }));
      setOfflineOrders(formatted);
    } catch (e) {
      console.warn('[useOfflineDelivery] Failed to load local cache:', e);
    }
  };

  useEffect(() => {
    loadOfflineCache();
  }, []);

  // Determine if we should show offline data
  useEffect(() => {
    if (query.isError || (query.data === undefined && !query.isFetching)) {
      setIsOfflineMode(true);
    } else if (query.data !== undefined) {
      setIsOfflineMode(false);
    }
  }, [query.data, query.isError, query.isFetching]);

  const serverOrders = (query.data as any)?.orders || query.data || [];

  return {
    orders: isOfflineMode ? offlineOrders : (Array.isArray(serverOrders) && serverOrders.length > 0 ? serverOrders : offlineOrders),
    isOfflineMode,
    isLoading: query.isLoading && !isOfflineMode && offlineOrders.length === 0,
    summary: (query.data as any)?.summary || {
      total: offlineOrders.length,
      revenue: offlineOrders.reduce((sum, o) => sum + o.total, 0),
    },
    refetch: async () => {
      await loadOfflineCache();
      return query.refetch();
    }
  };
}
