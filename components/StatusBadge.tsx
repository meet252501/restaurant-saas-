import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BookingStatusColors, Typography, Radius, Spacing } from '../lib/theme';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = BookingStatusColors[status] ?? {
    bg: Colors.textTertiary,
    dim: Colors.surfaceBorder,
    label: status,
  };
  const isSmall = size === 'sm';
  return (
    <View style={[styles.badge, { backgroundColor: config.dim }, isSmall && styles.badgeSm]}>
      <View style={[styles.dot, { backgroundColor: config.bg }, isSmall && styles.dotSm]} />
      <Text style={[styles.label, { color: config.bg }, isSmall && styles.labelSm]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  badgeSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotSm: {
    width: 5,
    height: 5,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  labelSm: {
    fontSize: 10,
  },
});
