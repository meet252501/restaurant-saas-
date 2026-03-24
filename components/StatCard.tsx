import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows, Spacing, Radius, Typography } from '../lib/theme';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  flex?: number;
}

export function StatCard({ icon, label, value, sub, accent, flex = 1 }: StatCardProps) {
  return (
    <View style={[styles.card, { flex }, accent && styles.cardAccent, Shadows.sm]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    minWidth: 100,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 4,
  },
  cardAccent: {
    borderColor: Colors.accent + '40',
    backgroundColor: Colors.accentDim,
  },
  icon: {
    fontSize: 22,
    marginBottom: 4,
  },
  value: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
  },
  valueAccent: {
    color: Colors.accent,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sub: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
