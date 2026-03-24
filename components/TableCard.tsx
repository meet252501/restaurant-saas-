import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, TableStatusColors, Radius, Typography, Shadows, Spacing } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';

interface TableCardProps {
  table: {
    id: string;
    tableNumber: number;
    capacity: number;
    status: string;
  };
  onPress?: (table: any) => void;
  onQRPress?: (table: any) => void;
  recommended?: boolean;
}

export function TableCard({ table, onPress, onQRPress, recommended }: TableCardProps) {
  const sc = TableStatusColors[table.status] ?? TableStatusColors.blocked;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { borderColor: sc.bg + '80' },
        recommended && styles.cardRecommended,
        pressed && styles.pressed,
        Shadows.sm,
      ]}
      onPress={() => onPress?.(table)}
    >
      {/* QR Code trigger */}
      <Pressable 
        onPress={(e) => {
          e.stopPropagation();
          onQRPress?.(table);
        }}
        style={styles.qrBtn}
      >
        <Ionicons name="qr-code-outline" size={14} color={Colors.textTertiary} />
      </Pressable>

      {/* Recommended star */}
      {recommended && (
        <View style={styles.star}>
          <Ionicons name="star" size={12} color={Colors.accent} />
        </View>
      )}

      {/* Status indicator */}
      <View style={[styles.statusDot, { backgroundColor: sc.bg }]} />

      {/* Table number */}
      <Text style={styles.number}>{table.tableNumber}</Text>
      <Text style={styles.numberLabel}>TABLE</Text>

      {/* Capacity */}
      <View style={styles.capacityRow}>
        <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
        <Text style={styles.capacity}>{table.capacity}</Text>
      </View>

      {/* Status */}
      <View style={[styles.statusPill, { backgroundColor: sc.dim }]}>
        <Text style={[styles.statusText, { color: sc.bg }]}>{sc.label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 100,
    position: 'relative',
    ...Shadows.sm,
  },
  cardRecommended: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  star: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  qrBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  number: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
    lineHeight: 32,
  },
  numberLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    letterSpacing: 2,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  capacity: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
