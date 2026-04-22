import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing, Radius, Typography } from '../lib/theme';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  trend?: number; // e.g. 12.5
  accent?: boolean;
  flex?: number;
  color?: string; // Hex color for the icon and trend
  style?: any;
}

export function StatCard({ icon, label, value, trend, accent, flex = 1, color = Colors.accent, style }: StatCardProps) {
  const isPositive = trend && trend > 0;
  const trendColor = isPositive ? Colors.available : Colors.error;
  
  // Use the provided color or fallback to accent if requested
  const activeColor = color;

  const innerContent = (
    <>
      <View style={styles.kpiHeader}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.iconBox, { backgroundColor: activeColor + '15' }]}>
          <Ionicons name={icon} size={16} color={activeColor} />
        </View>
      </View>
      
      <Text style={[styles.value, accent && styles.valueAccent]}>{value}</Text>
      
      {trend !== undefined && (
        <View style={styles.kpiTrend}>
          <Ionicons name={isPositive ? "trending-up" : "trending-down"} size={14} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>
            {isPositive ? '+' : ''}{trend}% from yesterday
          </Text>
        </View>
      )}
    </>
  );

  return (
    <View style={[styles.card, { flex }, style, Shadows.sm]}>
      {innerContent}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 20,
    minWidth: 100,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  valueAccent: {
    color: Colors.accent,
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
