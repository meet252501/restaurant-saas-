import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, FlatList, Image,
  RefreshControl, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { QuickAccessButton } from '../../components/QuickAccessMenu';
import { trpc, RESTAURANT_ID } from '../../lib/trpc';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../lib/theme';
import { useOfflineBookings } from '../../utils/useOfflineBookings';

const FILTERS = ['all', 'pending', 'confirmed', 'checked_in', 'completed', 'cancelled'] as const;
type Filter = typeof FILTERS[number];

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All', pending: 'Pending', confirmed: 'Confirmed',
  checked_in: 'Seated', completed: 'Done', cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  pending:    '#f59e0b',
  confirmed:  '#10b981',
  checked_in: '#3b82f6',
  completed:  '#6b7280',
  cancelled:  '#ef4444',
  no_show:    '#dc2626',
};

const STATUS_ICONS: Record<string, string> = {
  pending:    'time-outline',
  confirmed:  'checkmark-circle-outline',
  checked_in: 'restaurant-outline',
  completed:  'flag-outline',
  cancelled:  'close-circle-outline',
  no_show:    'alert-circle-outline',
};

const todayStr = () => new Date().toISOString().split('T')[0];

// ── Booking Card ─────────────────────────────────────────────────────
function InlineBookingCard({ booking, onStatusChange }: { booking: any; onStatusChange: (id: string, s: string) => void }) {
  const color = STATUS_COLORS[booking.status] || Colors.accent;

  const nextActions: { label: string; icon: string; status: string; color: string }[] = [];
  if (booking.status === 'pending') {
    nextActions.push({ label: 'Accept', icon: 'checkmark', status: 'confirmed', color: Colors.accent });
    nextActions.push({ label: 'Decline', icon: 'close', status: 'cancelled', color: '#ef4444' });
  }
  if (booking.status === 'confirmed') {
    nextActions.push({ label: 'Seat Guest', icon: 'restaurant', status: 'checked_in', color: '#3b82f6' });
    nextActions.push({ label: 'Cancel', icon: 'close', status: 'cancelled', color: '#ef4444' });
  }
  if (booking.status === 'checked_in') {
    nextActions.push({ label: 'Mark Done', icon: 'flag', status: 'completed', color: '#6b7280' });
    nextActions.push({ label: 'No-Show', icon: 'alert', status: 'no_show', color: '#dc2626' });
  }

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.cardTop}>
        {/* Guest info */}
        <View style={styles.guestBlock}>
          <View style={[styles.avatar, { backgroundColor: color + '22' }]}>
            <Text style={[styles.avatarText, { color }]}>
              {(booking.customerName || booking.guestName || 'G').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.guestName}>{booking.customerName || booking.guestName || 'Guest'}</Text>
            <Text style={styles.guestPhone}>{booking.customerPhone || booking.guestPhone || '—'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Ionicons name={(STATUS_ICONS[booking.status] || 'ellipse') as any} size={12} color={color} />
            <Text style={[styles.statusText, { color }]}>{FILTER_LABELS[booking.status as Filter] || booking.status}</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={13} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{booking.bookingTime || '—'}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="people-outline" size={13} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{booking.partySize} guests</Text>
          </View>
          {(booking.tableNumber || booking.tableId) && (
            <View style={styles.metaChip}>
              <Ionicons name="grid-outline" size={13} color={Colors.textTertiary} />
              <Text style={styles.metaText}>T{booking.tableNumber || booking.tableId}</Text>
            </View>
          )}
          {booking.source && (
            <View style={styles.metaChip}>
              <Ionicons name={booking.source === 'online' ? 'globe-outline' : booking.source === 'phone' ? 'call-outline' : 'walk-outline'} size={13} color={Colors.textTertiary} />
              <Text style={styles.metaText}>{booking.source}</Text>
            </View>
          )}
        </View>

        {booking.specialRequests ? (
          <Text style={styles.notesText}>📝 {booking.specialRequests}</Text>
        ) : null}
      </View>

      {/* Action buttons */}
      {nextActions.length > 0 && (
        <View style={styles.actionRow}>
          {nextActions.map(a => (
            <Pressable
              key={a.status}
              style={[styles.actionBtn, { borderColor: a.color, backgroundColor: a.color + '11' }]}
              onPress={() => onStatusChange(booking.id, a.status)}
            >
              <Ionicons name={a.icon as any} size={14} color={a.color} />
              <Text style={[styles.actionBtnText, { color: a.color }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────
export default function BookingsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [date, setDate] = useState(todayStr());
  const [refreshing, setRefreshing] = useState(false);

  const trpcUtils = trpc.useUtils();

  // Use Offline Hook for bookings
  const { bookings: allBookings, isOfflineMode, refetch } = useOfflineBookings(date);

  const updateStatus = trpc.booking.updateStatus.useMutation({
    onSuccess: () => {
      trpcUtils.booking.listByDate.invalidate();
      refetch();
    },
    onError: (e) => console.log('TRPC Update Error (handled by offline queue):', e.message),
  });

  const handleStatusChange = (id: string, status: string) => {
    const actionLabel = status === 'confirmed' ? 'Accept this booking?' :
      status === 'cancelled' ? 'Cancel this booking?' :
      status === 'checked_in' ? 'Seat this guest?' : 'Update status?';

    const confirmAction = async () => {
      if (isOfflineMode) {
        // Queue the mutation locally
        const { queueMutation } = require('../../utils/offlineDb');
        await queueMutation('updateBookingStatus', { id, status });
        
        // Optimistically update the local DB
        const { getOfflineDb } = require('../../utils/offlineDb');
        const db = await getOfflineDb();
        await db.runAsync('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
        refetch();
      } else {
        updateStatus.mutate({ id, status: status as any });
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(actionLabel)) {
        confirmAction();
      }
    } else {
      Alert.alert('Confirm', actionLabel, [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: confirmAction },
      ]);
    }
  };

  const pendingCount = allBookings.filter((b: any) => b.status === 'pending').length;
  const filtered = allBookings.filter((b: any) => filter === 'all' || b.status === filter);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{date}</Text>
          <Text style={styles.title}>Reservations</Text>
        </View>
        <View style={styles.headerActions}>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
            </View>
          )}
          <Pressable style={[styles.addBtn, Shadows.md]} onPress={() => router.push('/new-booking')}>
            <Ionicons name="add" size={20} color={Colors.textInverse} />
            <Text style={styles.addBtnText}>New</Text>
          </Pressable>
          <QuickAccessButton />
        </View>
      </View>

      {/* Online Booking Link Banner (Hidden until customer website is ready) */}
      {/* 
      <Pressable
        style={styles.linkBanner}
        onPress={() => router.push('/book')}
      >
        <Ionicons name="globe-outline" size={16} color={Colors.accent} />
        <Text style={styles.linkBannerText}>Customer Booking Link: tap to preview →</Text>
        <Ionicons name="open-outline" size={14} color={Colors.accent} />
      </Pressable>
      */}

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow} style={{ flexGrow: 0 }}>
        {FILTERS.map(f => {
          const count = f === 'all' ? allBookings.length : allBookings.filter((b: any) => b.status === f).length;
          return (
            <Pressable key={f} style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {FILTER_LABELS[f]}{count > 0 ? ` (${count})` : ''}
              </Text>
              {f === 'pending' && pendingCount > 0 && (
                <View style={styles.dot} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Booking list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <InlineBookingCard booking={item} onStatusChange={handleStatusChange} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={Colors.accent} colors={[Colors.accent]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>No {FILTER_LABELS[filter].toLowerCase()} bookings today</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: Spacing.lg, paddingBottom: Spacing.sm, marginBottom: Spacing.md
  },
  greeting: { ...Typography.body, color: Colors.textSecondary },
  title: { ...Typography.heading, color: Colors.textPrimary, marginTop: 4 },
  dateLabel: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.body, color: Colors.textInverse, fontWeight: '700' },
  pendingBadge: {
    backgroundColor: '#fef3c7', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#fbbf24',
  },
  pendingBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accent, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  addBtnText: { ...Typography.bodySmall, color: Colors.textInverse, fontWeight: '700' },
  linkBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    backgroundColor: Colors.accentDim, borderRadius: Radius.md, padding: 10,
    borderWidth: 1, borderColor: Colors.accent + '44',
  },
  linkBannerText: { ...Typography.caption, color: Colors.accent, fontWeight: '600', flex: 1 },
  filterRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.xs },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  filterTabActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  filterText: { ...Typography.bodySmall, color: Colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: Colors.accent },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 120, gap: Spacing.sm },
  // ── Card ──
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.surfaceBorder, borderLeftWidth: 4,
  },
  cardTop: { padding: Spacing.md, gap: Spacing.sm },
  guestBlock: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { fontSize: 18, fontWeight: '800' },
  guestName: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700' },
  guestPhone: { ...Typography.caption, color: Colors.textTertiary },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  metaText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  notesText: { ...Typography.caption, color: Colors.textTertiary, fontStyle: 'italic' },
  actionRow: {
    flexDirection: 'row', gap: Spacing.sm, padding: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: Radius.md, paddingVertical: 10, borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...Typography.body, color: Colors.textTertiary },
});
