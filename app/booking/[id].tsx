import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  SafeAreaView, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CommunicationButtons } from '../../components/CommunicationButtons';
import { StatusBadge } from '../../components/StatusBadge';
import { Colors, Spacing, Typography, Radius, Shadows, BookingStatusColors } from '../../lib/theme';

// Enriched mock bookings for detail view
const MOCK_BOOKINGS: Record<string, any> = {
  bk1: { id: 'bk1', customerId: 'c1', tableId: 't3', tableNumber: 3, bookingDate: new Date().toISOString().split('T')[0], bookingTime: '19:00', partySize: 2, status: 'confirmed', customerName: 'Premium Guest', customerPhone: '+91 9999999999', specialRequests: '' },
  bk2: { id: 'bk2', customerId: 'c2', tableId: 't1', tableNumber: 1, bookingDate: new Date().toISOString().split('T')[0], bookingTime: '19:30', partySize: 1, status: 'pending', customerName: 'Priya Sharma', customerPhone: '+91 9876543210', specialRequests: '' },
  bk3: { id: 'bk3', customerId: 'c3', tableId: 't2', tableNumber: 2, bookingDate: new Date().toISOString().split('T')[0], bookingTime: '20:00', partySize: 4, status: 'checked_in', customerName: 'Raj Patel Family', customerPhone: '+91 9000000001', specialRequests: 'Anniversary dinner 🎂' },
  bk4: { id: 'bk4', customerId: 'c4', tableId: 't4', tableNumber: 4, bookingDate: new Date().toISOString().split('T')[0], bookingTime: '20:30', partySize: 6, status: 'pending', customerName: 'Office Group', customerPhone: '+91 8888888888', specialRequests: 'Team celebration' },
};

const STATUS_ACTIONS: Record<string, { label: string; next: string; color: string }[]> = {
  pending:    [{ label: 'Confirm', next: 'confirmed', color: Colors.confirmed }, { label: 'Cancel', next: 'cancelled', color: Colors.error }],
  confirmed:  [{ label: 'Check In', next: 'checked_in', color: Colors.checkedIn }, { label: 'No Show', next: 'no_show', color: Colors.error }, { label: 'Cancel', next: 'cancelled', color: Colors.cancelled }],
  checked_in: [{ label: 'Complete', next: 'completed', color: Colors.completed }],
  completed:  [],
  cancelled:  [],
  no_show:    [],
};

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const initial = MOCK_BOOKINGS[id ?? ''] ?? MOCK_BOOKINGS['bk1'];
  const [booking, setBooking] = useState(initial);

  const actions = STATUS_ACTIONS[booking.status] ?? [];

  const handleAction = (next: string, label: string) => {
    Alert.alert(`${label} Booking?`, `Change status to "${next.replace('_', ' ')}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label, onPress: () => {
          setBooking((b: any) => ({ ...b, status: next }));
        }
      },
    ]);
  };

  const sc = BookingStatusColors[booking.status];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status hero */}
        <View style={[styles.hero, { backgroundColor: sc?.dim ?? Colors.surfaceBorder }]}>
          <StatusBadge status={booking.status} />
          <Text style={styles.heroGuest}>{booking.customerName}</Text>
          <Text style={styles.heroSub}>
            {booking.bookingDate} · {booking.bookingTime} · {booking.partySize} guests
          </Text>
        </View>

        {/* Details card */}
        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardTitle}>Booking Details</Text>
          <InfoRow icon="person-outline" label="Guest" value={booking.customerName} />
          <InfoRow icon="call-outline" label="Phone" value={booking.customerPhone} />
          <InfoRow icon="restaurant-outline" label="Table" value={`Table ${booking.tableNumber}`} />
          <InfoRow icon="people-outline" label="Party Size" value={`${booking.partySize} guests`} />
          <InfoRow icon="calendar-outline" label="Date" value={booking.bookingDate} />
          <InfoRow icon="time-outline" label="Time" value={booking.bookingTime} />
          {booking.specialRequests ? (
            <InfoRow icon="chatbubble-outline" label="Notes" value={booking.specialRequests} />
          ) : null}
          <InfoRow icon="id-card-outline" label="Booking ID" value={booking.id} mono />
        </View>

        {/* Status Actions */}
        {actions.length > 0 && (
          <View style={[styles.card, Shadows.sm]}>
            <Text style={styles.cardTitle}>Update Status</Text>
            <View style={styles.actionsRow}>
              {actions.map(action => (
                <Pressable
                  key={action.next}
                  style={[styles.actionBtn, { backgroundColor: action.color + '20', borderColor: action.color + '60' }]}
                  onPress={() => handleAction(action.next, action.label)}
                >
                  <Text style={[styles.actionBtnText, { color: action.color }]}>{action.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Communication Panel */}
        <View style={[styles.card, Shadows.sm]}>
          <CommunicationButtons
            guestName={booking.customerName}
            guestPhone={booking.customerPhone}
            bookingDate={booking.bookingDate}
            bookingTime={booking.bookingTime}
            tableNumber={booking.tableNumber}
            partySize={booking.partySize}
          />
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value, mono }: {
  icon: any; label: string; value: string; mono?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={Colors.textTertiary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.mono]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { gap: Spacing.md, padding: Spacing.lg },
  hero: {
    borderRadius: Radius.lg, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm,
  },
  heroGuest: { ...Typography.heading, color: Colors.textPrimary },
  heroSub: { ...Typography.body, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: Spacing.md,
  },
  cardTitle: { ...Typography.subheading, color: Colors.textPrimary },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, paddingBottom: Spacing.sm,
  },
  infoLabel: { ...Typography.bodySmall, color: Colors.textSecondary, width: 90 },
  infoValue: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  mono: { fontFamily: 'monospace', fontSize: 12, color: Colors.textTertiary },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actionBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  actionBtnText: { ...Typography.body, fontWeight: '700' },
});
