import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBadge } from './StatusBadge';
import { Colors, Shadows, Spacing, Radius, Typography } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';

interface BookingCardProps {
  booking: {
    id: string;
    bookingDate: string;
    bookingTime: string;
    partySize: number;
    status: string;
    tableId?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    specialRequests?: string;
  };
  onPress?: () => void;
}

export function BookingCard({ booking, onPress }: BookingCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/booking/${booking.id}`);
    }
  };

  const tableLabel = booking.tableId ? `Table ${booking.tableId.replace('t', '')}` : 'No Table';
  const guestName = booking.customerName ?? 'Guest';
  const time = booking.bookingTime ?? '--:--';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, Shadows.sm]}
      onPress={handlePress}
    >
      {/* Status strip */}
      <View style={[styles.strip, { backgroundColor: getStatusColor(booking.status) }]} />

      <View style={styles.content}>
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.guestName}>{guestName}</Text>
            <Text style={styles.meta}>
              {booking.bookingDate} · {time}
            </Text>
          </View>
          <StatusBadge status={booking.status} size="sm" />
        </View>

        {/* Details row */}
        <View style={styles.details}>
          <View style={styles.chip}>
            <Ionicons name="restaurant-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.chipText}>{tableLabel}</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.chipText}>{booking.partySize} guests</Text>
          </View>
          {booking.customerPhone ? (
            <View style={styles.chip}>
              <Ionicons name="call-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.chipText}>{booking.customerPhone}</Text>
            </View>
          ) : null}
        </View>

        {booking.specialRequests ? (
          <Text style={styles.note} numberOfLines={1}>
            📝 {booking.specialRequests}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} style={styles.arrow} />
    </Pressable>
  );
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending:    Colors.pending,
    confirmed:  Colors.confirmed,
    checked_in: Colors.checkedIn,
    completed:  Colors.completed,
    cancelled:  Colors.cancelled,
    no_show:    Colors.noShow,
  };
  return map[status] ?? Colors.textTertiary;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  strip: {
    width: 4,
    borderRadius: 2,
    margin: 8,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  headerLeft: { gap: 2, flex: 1 },
  guestName: {
    ...Typography.subheading,
    color: Colors.textPrimary,
  },
  meta: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  chipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  note: {
    ...Typography.bodySmall,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  arrow: {
    alignSelf: 'center',
    paddingRight: Spacing.sm,
  },
});
