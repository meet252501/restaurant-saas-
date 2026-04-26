import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows } from '../../lib/theme';

/**
 * Summary Card Component
 */
export function SummaryCard({ label, value, icon, color }: {
  label: string; value: string; icon: string; color: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <LinearGradient
        colors={['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.summaryIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

/**
 * Legend Item Component
 */
export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendColor, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

/**
 * Modal Button Component
 */
export function StatusButton({
  label,
  icon,
  onPress,
  loading,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.statusButton,
        Shadows.sm,
        pressed && { backgroundColor: 'rgba(255,255,255,0.08)' }
      ]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={Colors.accent} />
      ) : (
        <>
          <Ionicons name={icon as any} size={20} color={Colors.accent} />
          <Text style={styles.statusButtonText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    flex: 1, minWidth: '45%', padding: 16,
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    ...Shadows.glass,
  },
  summaryIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  summaryValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
  summaryLabel: { color: Colors.textTertiary, fontSize: 11, fontWeight: '600', marginTop: 2 },
  
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendColor: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: Colors.textTertiary, fontSize: 11, fontWeight: '600' },
  
  statusButton: { 
    flex: 1, minWidth: '45%', height: 60, 
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', 
    alignItems: 'center', justifyContent: 'center', gap: 8 
  },
  statusButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
