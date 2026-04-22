import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Typography, Spacing, Shadows } from '../lib/theme';

interface AIInsightCardProps {
  insight: string;
  label?: string;
  onPress?: () => void;
  loading?: boolean;
}

export function AIInsightCard({ insight, label = 'AI Insight', onPress, loading }: AIInsightCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [pressed && onPress ? styles.pressed : null]}
      onPress={onPress}
    >
      <LinearGradient
        colors={[Colors.aiGradientStart + '20', Colors.aiGradientEnd + '10']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, Shadows.glass]}
      >
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Text style={{ fontSize: 16 }}>🤖</Text>
          </View>
          <Text style={styles.label}>{label}</Text>
          {onPress && <Ionicons name="chevron-forward" size={16} color={Colors.ai} />}
        </View>
        <Text style={styles.insight} numberOfLines={loading ? 2 : undefined}>
          {loading ? 'Analyzing your restaurant data...' : insight}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.aiGlass,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.ai + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.bodySmall,
    color: Colors.ai,
    fontWeight: '700',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  insight: {
    ...Typography.body,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
});
