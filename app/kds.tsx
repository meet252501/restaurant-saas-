import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '../lib/trpc';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Shadows, Radius, Typography, Spacing } from '../lib/theme';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

/**
 * Kitchen Display System (KDS)
 * A real-time screen for the chef to track orders.
 * Automatically refreshes every 30 seconds.
 */

export default function KitchenDisplayScreen() {
  const router = useRouter();
  const { data: orders, isLoading, refetch } = trpc.delivery.today.useQuery(undefined, {
    refetchInterval: 30000, // AUTO-AUTOMATION: Polling every 30s
  });

  const updateStatus = trpc.delivery.updateStatus.useMutation({
    onSuccess: () => refetch()
  });

  const activeOrders = orders?.orders.filter(o => o.status === 'pending' || o.status === 'preparing') || [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Kitchen Display (KDS)</Text>
          <Text style={styles.headerSub}>Live Orders: {activeOrders.length}</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={styles.content}
        horizontal={Platform.OS === 'web'} // Horizontal scroll for web dashboards
      >
        <View style={styles.grid}>
          {activeOrders.map((order) => (
            <KDSOrderCard 
              key={order.id} 
              order={order} 
              onComplete={() => updateStatus.mutate({ orderId: order.id, status: 'dispatched' })}
            />
          ))}
          {activeOrders.length === 0 && (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="chef-hat" size={64} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No pending orders. Take a break! 🍏</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer status */}
      <View style={styles.footer}>
        <View style={styles.statusRow}>
          <View style={styles.pulseDot} />
          <Text style={styles.statusText}>SYSTEM LIVE · AUTO-POLLING ON</Text>
        </View>
        <Text style={styles.footerBrand}>TableBook Automation v1.0</Text>
      </View>
    </SafeAreaView>
  );
}

function KDSOrderCard({ order, onComplete }: { order: any, onComplete: () => void }) {
  // Fix time stamp
  const timestamp = order.placedAt ?? order.createdAt ?? new Date().toISOString();
  let timeElapsed = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (isNaN(timeElapsed)) timeElapsed = 0;
  const isLately = timeElapsed > 15;

  return (
    <Animated.View 
      layout={Layout}
      entering={FadeInUp}
      style={[
        styles.card,
        Shadows.md,
        { borderLeftColor: order.status === 'preparing' ? Colors.accent : '#f59e0b' }
      ]}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.metaText}>{order.platform.toUpperCase()} · #{order.orderId}</Text>
          <Text style={styles.customerName}>{order.customerName}</Text>
        </View>
        <View style={[styles.timeBadge, isLately ? { backgroundColor: 'rgba(239,68,68,0.2)' } : {}]}>
          <Text style={[styles.timeText, isLately ? { color: '#ef4444' } : {}]}>{timeElapsed}m</Text>
        </View>
      </View>

      <View style={styles.itemsBox}>
        <Text style={styles.itemsText}>
          {Array.isArray(order.items)
            ? order.items.map((i: any) => `${i.qty}x ${i.name}`).join('\n')
            : String(order.items || '')}
        </Text>
      </View>

      <TouchableOpacity 
        onPress={onComplete}
        style={styles.doneBtn}
      >
        <Ionicons name="checkmark-done" size={20} color={Colors.textInverse} />
        <Text style={styles.doneBtnText}>DONE / DISPATCH</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  headerTitle: { ...Typography.heading, color: Colors.textPrimary },
  headerSub: { ...Typography.bodySmall, color: Colors.textSecondary },
  closeBtn: {
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },

  scroll: { flex: 1, padding: Spacing.lg },
  content: { paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg },
  
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, minWidth: '100%' },
  emptyText: { ...Typography.subheading, color: Colors.textSecondary, marginTop: Spacing.md },

  footer: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  statusText: { ...Typography.caption, color: Colors.textTertiary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  footerBrand: { ...Typography.caption, color: Colors.textTertiary },

  // Card
  card: {
    width: 320,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderLeftWidth: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  metaText: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '800' },
  customerName: { ...Typography.subheading, color: Colors.textPrimary, fontSize: 20 },
  timeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
  },
  timeText: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '800' },
  
  itemsBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  itemsText: { ...Typography.body, color: Colors.textPrimary, lineHeight: 28 },
  
  doneBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.green,
  },
  doneBtnText: { ...Typography.subheading, color: Colors.textInverse, fontWeight: '800' },
});
