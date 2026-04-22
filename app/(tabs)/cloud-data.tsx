import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Platform, TextInput, Alert
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '../../lib/trpc';
import { Colors, Typography } from '../../lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ArchiveEntry = {
  id: string;
  restaurantId: string;
  dataType: string;
  dataJson: string;
  archivedAt: string;
};

type ParsedEntry = ArchiveEntry & {
  parsedData: Record<string, any>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function getDayLabel(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === 2) return '2 Days Ago';
  return '3 Days Ago';
}

function downloadJSON(data: object, filename: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    Alert.alert('Download', 'File sharing is available on web. On mobile, data is shown in full above.');
  }
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CloudDataScreen() {
  const [restaurantId, setRestaurantId] = useState('res_default');
  const [inputId, setInputId] = useState('res_default');
  const [selectedType, setSelectedType] = useState<'all' | 'bookings' | 'deliveryOrders'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: rawData, isLoading, error, refetch, isFetching } = trpc.cloudData.getRecent.useQuery(
    { restaurantId },
    { retry: false }
  );

  const entries: ParsedEntry[] = useMemo(() => {
    if (!rawData) return [];
    return rawData.map((entry: ArchiveEntry) => {
      let parsedData: Record<string, any> = {};
      try { parsedData = JSON.parse(entry.dataJson); } catch {}
      return { ...entry, parsedData };
    });
  }, [rawData]);

  const filtered = useMemo(() => {
    if (selectedType === 'all') return entries;
    return entries.filter(e => e.dataType === selectedType);
  }, [entries, selectedType]);

  const grouped = useMemo(() => {
    const map: Record<string, ParsedEntry[]> = {};
    for (const e of filtered) {
      const label = getDayLabel(e.archivedAt);
      if (!map[label]) map[label] = [];
      map[label].push(e);
    }
    return map;
  }, [filtered]);

  const dayOrder = ['Today', 'Yesterday', '2 Days Ago', '3 Days Ago'];

  const handleDownloadAll = () => {
    const payload = {
      restaurantId,
      exportedAt: new Date().toISOString(),
      totalRecords: filtered.length,
      data: filtered.map(e => ({ type: e.dataType, archivedAt: e.archivedAt, ...e.parsedData })),
    };
    downloadJSON(payload, `tablebook_cloud_${restaurantId}_${Date.now()}.json`);
  };

  const handleDownloadDay = (day: string, items: ParsedEntry[]) => {
    const payload = {
      restaurantId,
      day,
      exportedAt: new Date().toISOString(),
      totalRecords: items.length,
      data: items.map(e => ({ type: e.dataType, archivedAt: e.archivedAt, ...e.parsedData })),
    };
    downloadJSON(payload, `tablebook_${day.replace(/ /g, '_').toLowerCase()}_${Date.now()}.json`);
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient colors={['#0f172a', '#1e1b4b']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Feather name="cloud" size={22} color="#818cf8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Cloud Data Portal</Text>
            <Text style={styles.headerSub}>3-day rolling archive · Auto-purge after 72 hours</Text>
          </View>
          <Pressable
            style={[styles.refreshBtn, isFetching && { opacity: 0.5 }]}
            onPress={() => refetch()}
            disabled={isFetching}
          >
            <Feather name="refresh-cw" size={16} color="#818cf8" />
          </Pressable>
        </View>

        {/* Restaurant ID Filter */}
        <View style={styles.filterRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={14} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={inputId}
              onChangeText={setInputId}
              placeholder="Restaurant ID (e.g. res_default)"
              placeholderTextColor="#4b5563"
              returnKeyType="search"
              onSubmitEditing={() => setRestaurantId(inputId.trim() || 'res_default')}
            />
          </View>
          <Pressable
            style={styles.searchBtn}
            onPress={() => setRestaurantId(inputId.trim() || 'res_default')}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </Pressable>
        </View>

        {/* Type Tabs */}
        <View style={styles.tabs}>
          {(['all', 'bookings', 'deliveryOrders'] as const).map(t => (
            <Pressable
              key={t}
              style={[styles.tab, selectedType === t && styles.tabActive]}
              onPress={() => setSelectedType(t)}
            >
              <Text style={[styles.tabText, selectedType === t && styles.tabTextActive]}>
                {t === 'all' ? 'All' : t === 'bookings' ? 'Bookings' : 'Delivery'}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{entries.length}</Text>
            <Text style={styles.statLabel}>Total Records</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#34d399' }]}>
              {entries.filter(e => e.dataType === 'bookings').length}
            </Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>
              {entries.filter(e => e.dataType === 'deliveryOrders').length}
            </Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <Pressable style={styles.downloadAllBtn} onPress={handleDownloadAll} disabled={entries.length === 0}>
            <Feather name="download" size={14} color="#fff" />
            <Text style={styles.downloadAllText}>Export All</Text>
          </Pressable>
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color="#818cf8" size="large" />
            <Text style={styles.loadingText}>Fetching cloud archive...</Text>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={24} color="#f87171" />
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorMsg}>
              {error.message?.includes('not configured')
                ? 'Turso is not connected yet. Add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to your .env file.'
                : error.message}
            </Text>
            <View style={styles.envHint}>
              <Text style={styles.envHintText}>
                {'TURSO_DATABASE_URL=libsql://your-db.turso.io\nTURSO_AUTH_TOKEN=eyJ...'}
              </Text>
            </View>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && !error && filtered.length === 0 && (
          <View style={styles.centered}>
            <Feather name="inbox" size={48} color="#334155" />
            <Text style={styles.emptyTitle}>No archived data yet</Text>
            <Text style={styles.emptyMsg}>
              Data syncs to Turso automatically at midnight before local deletion. Check back after the nightly cron runs.
            </Text>
          </View>
        )}

        {/* Day Groups */}
        {!isLoading && !error && dayOrder.map(day => {
          const items = grouped[day];
          if (!items || items.length === 0) return null;
          return (
            <View key={day} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <View style={styles.dayPill}>
                  <Feather name="calendar" size={12} color="#818cf8" />
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
                <Text style={styles.dayCount}>{items.length} records</Text>
                <Pressable style={styles.dayDownloadBtn} onPress={() => handleDownloadDay(day, items)}>
                  <Feather name="download" size={12} color="#818cf8" />
                  <Text style={styles.dayDownloadText}>Download Day</Text>
                </Pressable>
              </View>

              {items.map(entry => {
                const isExpanded = expandedId === entry.id;
                const isBooking = entry.dataType === 'bookings';
                const d = entry.parsedData;

                return (
                  <Pressable
                    key={entry.id}
                    style={[styles.card, isExpanded && styles.cardExpanded]}
                    onPress={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.typeBadge, isBooking ? styles.badgeBooking : styles.badgeDelivery]}>
                        <Ionicons
                          name={isBooking ? 'calendar-outline' : 'bicycle-outline'}
                          size={11}
                          color={isBooking ? '#34d399' : '#f59e0b'}
                        />
                        <Text style={[styles.typeBadgeText, { color: isBooking ? '#34d399' : '#f59e0b' }]}>
                          {isBooking ? 'Booking' : 'Delivery'}
                        </Text>
                      </View>

                      <Text style={styles.cardName} numberOfLines={1}>
                        {d.guestName || d.customerName || d.guest_name || 'Guest'}
                      </Text>

                      <Text style={styles.cardTime}>{formatDate(entry.archivedAt)}</Text>
                      <Feather
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color="#64748b"
                      />
                    </View>

                    {/* Summary row */}
                    {!isExpanded && (
                      <View style={styles.cardSummary}>
                        {isBooking ? (
                          <>
                            <Text style={styles.summaryChip}>📅 {d.bookingDate || d.booking_date}</Text>
                            <Text style={styles.summaryChip}>🕐 {d.bookingTime || d.booking_time}</Text>
                            <Text style={styles.summaryChip}>👥 {d.partySize || d.party_size} guests</Text>
                            <Text style={[styles.summaryChip, { textTransform: 'capitalize' }]}>
                              {d.status}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.summaryChip}>📦 {d.platform}</Text>
                            <Text style={styles.summaryChip}>₹{d.totalAmount || d.total_amount || 0}</Text>
                            <Text style={[styles.summaryChip, { textTransform: 'capitalize' }]}>
                              {d.status}
                            </Text>
                          </>
                        )}
                      </View>
                    )}

                    {/* Expanded JSON view */}
                    {isExpanded && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.jsonBox}>
                        <Text style={styles.jsonText}>{JSON.stringify(d, null, 2)}</Text>
                      </ScrollView>
                    )}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030712' },

  /* Header */
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center', marginRight: 12
  },
  headerTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center'
  },

  /* Filter */
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#1e293b'
  },
  searchInput: { flex: 1, color: '#e2e8f0', fontSize: 13 },
  searchBtn: {
    backgroundColor: '#4338ca', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10
  },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  /* Tabs */
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b'
  },
  tabActive: { backgroundColor: '#312e81', borderColor: '#4338ca' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#a5b4fc' },

  /* Stats */
  statsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 20, marginBottom: 8
  },
  statCard: {
    flex: 1, backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#1e293b'
  },
  statValue: { color: '#e2e8f0', fontSize: 22, fontWeight: '700' },
  statLabel: { color: '#64748b', fontSize: 10, marginTop: 2 },
  downloadAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#4338ca', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12
  },
  downloadAllText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  /* Loading / empty / error */
  centered: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  loadingText: { color: '#64748b', marginTop: 16, fontSize: 14 },
  emptyTitle: { color: '#94a3b8', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyMsg: { color: '#4b5563', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  errorBox: {
    margin: 20, padding: 24, backgroundColor: '#1c0a0a', borderRadius: 16,
    borderWidth: 1, borderColor: '#7f1d1d', alignItems: 'center'
  },
  errorTitle: { color: '#f87171', fontSize: 17, fontWeight: '700', marginTop: 12 },
  errorMsg: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  envHint: {
    marginTop: 16, backgroundColor: '#0f172a', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#1e293b', width: '100%'
  },
  envHintText: { color: '#10b981', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  /* Scroll */
  scroll: { flex: 1 },

  /* Day group */
  dayGroup: { marginHorizontal: 20, marginBottom: 24 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  dayPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#1e1b4b', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20
  },
  dayLabel: { color: '#818cf8', fontSize: 12, fontWeight: '600' },
  dayCount: { color: '#475569', fontSize: 12, flex: 1 },
  dayDownloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: '#312e81', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20
  },
  dayDownloadText: { color: '#818cf8', fontSize: 11 },

  /* Cards */
  card: {
    backgroundColor: '#0d1117', borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#1e293b', overflow: 'hidden'
  },
  cardExpanded: { borderColor: '#4338ca' },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20
  },
  badgeBooking: { backgroundColor: '#064e3b22' },
  badgeDelivery: { backgroundColor: '#78350f22' },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  cardName: { flex: 1, color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
  cardTime: { color: '#475569', fontSize: 11 },

  cardSummary: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 14, paddingBottom: 12
  },
  summaryChip: {
    backgroundColor: '#1e293b', color: '#94a3b8', fontSize: 11,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6
  },

  /* JSON box */
  jsonBox: {
    backgroundColor: '#020617', margin: 12, borderRadius: 8,
    maxHeight: 220, borderWidth: 1, borderColor: '#1e293b'
  },
  jsonText: {
    color: '#10b981', fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    padding: 12
  },
});
