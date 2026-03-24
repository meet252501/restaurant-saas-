import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { trpc } from '../../lib/trpc';
import { Colors, Spacing, Typography, Radius, Shadows, appStyles } from '../../lib/theme';
import { KOTPreview } from '../../components/KOTPreview';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';

// ── Live Activity Pipeline ──────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { key: 'pending',    label: 'Received',  icon: 'clock-outline' },
  { key: 'preparing', label: 'Preparing', icon: 'fire' },
  { key: 'dispatched',label: 'On the Way',icon: 'bicycle' },
  { key: 'delivered', label: 'Delivered', icon: 'checkmark-circle-outline' },
] as const;

const STEP_ORDER = ['pending', 'preparing', 'dispatched', 'delivered'];

/** Normalise whatever the server returns into a safe Array<{name,qty,price}> */
function safeItems(raw: any): { name: string; qty: number; price: number }[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  if (Array.isArray(raw)) return raw;
  return [];
}

function LiveActivityBar({ status }: { status: string }) {
  const currentIdx = STEP_ORDER.indexOf(status);
  return (
    <View style={la.container}>
      {PIPELINE_STEPS.map((step, i) => {
        const done    = i < currentIdx;
        const active  = i === currentIdx;
        const color   = done || active ? Colors.accent : Colors.surfaceBorder;
        const textCol = done || active ? Colors.accent : Colors.textTertiary;
        return (
          <React.Fragment key={step.key}>
            <View style={la.step}>
              <View style={[la.dot, { backgroundColor: active ? Colors.accent : done ? Colors.accentDark : Colors.surfaceElevated, borderColor: color }]}>
                {done ? (
                  <Ionicons name="checkmark" size={10} color={Colors.background} />
                ) : (
                  <Ionicons name={step.icon as any} size={10} color={active ? Colors.background : Colors.textTertiary} />
                )}
              </View>
              <Text style={[la.label, { color: textCol }]}>{step.label}</Text>
            </View>
            {i < PIPELINE_STEPS.length - 1 && (
              <View style={[la.line, { backgroundColor: i < currentIdx ? Colors.accent : Colors.surfaceBorder }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const la = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  step:  { alignItems: 'center', width: 56 },
  dot:   { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  line:  { flex: 1, height: 2, marginBottom: 14 },
  label: { ...Typography.caption, textAlign: 'center', fontSize: 9 },
});

// ── Delivery Status helpers ────────────────────────────────────────────────
const STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending:    { color: Colors.deliveryPending,    label: 'RECEIVED'  },
  preparing:  { color: Colors.deliveryPreparing,  label: 'PREPARING' },
  dispatched: { color: Colors.deliveryDispatched, label: 'ON THE WAY'},
  delivered:  { color: Colors.deliveryDelivered,  label: 'DELIVERED' },
  cancelled:  { color: Colors.cancelled,          label: 'CANCELLED' },
};

// ── Platform badge ─────────────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: string }) {
  const isZ = platform === 'zomato';
  return (
    <View style={[pb.badge, { backgroundColor: isZ ? '#dc2626' : '#ea580c' }]}>
      <Text style={pb.text}>{isZ ? 'Z' : 'S'}</Text>
    </View>
  );
}
const pb = StyleSheet.create({
  badge: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  text:  { color: '#fff', fontSize: 10, fontWeight: '900' },
});

// ── Main Screen ────────────────────────────────────────────────────────────
export default function DeliveryScreen() {
  // Mock delivery data for offline mode
  const [orders, setOrders] = useState([
    { id: 'd1', platform: 'zomato', orderId: 'ZOM-8821', customerName: 'Arjun Kapur', status: 'preparing', total: 450, items: [{ name: 'Butter Chicken', qty: 1, price: 380 }, { name: 'Naan', qty: 2, price: 35 }] },
    { id: 'd2', platform: 'swiggy', orderId: 'SWG-9901', customerName: 'Neha Verma', status: 'pending', total: 280, items: [{ name: 'Dal Makhani', qty: 1, price: 240 }, { name: 'Roti', qty: 2, price: 20 }] },
    { id: 'd3', platform: 'zomato', orderId: 'ZOM-1102', customerName: 'Suresh Kumar', status: 'dispatched', total: 1200, items: [{ name: 'Family Pack Biryani', qty: 1, price: 1100 }, { name: 'Coke', qty: 2, price: 50 }] },
  ]);

  const summary = { revenue: 8450, zomato: 12, swiggy: 8 };
  const active = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const isLoading = false;

  const updateStatus = { mutate: (args: any) => setOrders(prev => prev.map(o => o.id === args.orderId ? { ...o, status: args.status } : o)) };
  const ingestOrder = { mutate: (args: any) => setOrders(prev => [{ id: Math.random().toString(), ...args }, ...prev]) };
  const sendInvoice = { mutate: () => alert('Digital Invoice sent (Simulated)!') };

  const [refreshing,        setRefreshing]        = useState(false);
  const [selectedOrderForKOT, setSelectedOrderForKOT] = useState<any>(null);
  const [isKOTVisible,      setIsKOTVisible]      = useState(false);
  const [manualBillText,    setManualBillText]    = useState('');
  const [isManualVisible,   setIsManualVisible]   = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>🍏 Syncing live orders…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />}
      >
        {/* ── Header ─────────────────────────────────── */}
        <Animated.View entering={FadeInUp} style={styles.header}>
          <View>
            <Text style={styles.title}>Delivery Hub 🛵</Text>
            <Text style={styles.subtitle}>Live orders from Zomato & Swiggy</Text>
          </View>
          <TouchableOpacity
            style={styles.simulateBtn}
            onPress={() => ingestOrder.mutate({
              platform: Math.random() > 0.5 ? 'zomato' : 'swiggy',
              orderId: `ORD-${Math.floor(Math.random() * 999999)}`,
              customerName: 'Test Customer',
              items: [{ name: 'Paneer Tikka', qty: 1, price: 180 }, { name: 'Butter Naan', qty: 2, price: 40 }],
              total: 260,
            })}
          >
            <Ionicons name="add" size={16} color={Colors.background} />
            <Text style={styles.simulateTxt}>Simulate</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Summary Row ────────────────────────────── */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, Shadows.sm]}>
            <Text style={styles.summaryLabel}>REVENUE</Text>
            <Text style={styles.summaryValue}>₹{summary?.revenue ?? 0}</Text>
          </View>
          <View style={[styles.summaryCard, Shadows.sm]}>
            <Text style={styles.summaryLabel}>ACTIVE</Text>
            <Text style={[styles.summaryValue, { color: Colors.accent }]}>{active}</Text>
          </View>
          <View style={[styles.summaryCard, Shadows.sm]}>
            <MaterialCommunityIcons name="pizza" size={18} color="#dc2626" />
            <Text style={styles.summaryLabel}>ZOMATO</Text>
            <Text style={styles.summaryValue}>{summary?.zomato ?? 0}</Text>
          </View>
          <View style={[styles.summaryCard, Shadows.sm]}>
            <MaterialCommunityIcons name="moped" size={18} color="#ea580c" />
            <Text style={styles.summaryLabel}>SWIGGY</Text>
            <Text style={styles.summaryValue}>{summary?.swiggy ?? 0}</Text>
          </View>
        </View>

        {/* ── Section title ──────────────────────────── */}
        <Text style={styles.sectionTitle}>LIVE ORDERS</Text>

        {/* ── Order Cards ────────────────────────────── */}
        {orders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="package" size={48} color={Colors.surfaceBorder} />
            <Text style={styles.emptyText}>No online orders yet</Text>
            <Text style={styles.emptySubtext}>Tap Simulate to test the flow</Text>
          </View>
        ) : (
          orders.map((order, index) => {
            const statusMeta = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
            return (
              <Animated.View key={order.id} entering={FadeInRight.delay(index * 80)} style={[styles.card, Shadows.sm]}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <PlatformBadge platform={order.platform} />
                    <View>
                      <Text style={styles.orderName}>{order.customerName}</Text>
                      <Text style={styles.orderId}>#{order.orderId ?? order.id.slice(0, 8)}</Text>
                    </View>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <View style={[styles.statusPill, { backgroundColor: statusMeta.color + '22', borderColor: statusMeta.color + '55' }]}>
                      <Text style={[styles.statusPillText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                    </View>
                    <Text style={styles.totalAmt}>₹{order.total}</Text>
                  </View>
                </View>

                {/* Items */}
                <View style={styles.itemsBox}>
                  {safeItems(order.items).map((item, i) => (
                    <Text key={i} style={styles.itemText}>• {item.qty}× {item.name}</Text>
                  ))}
                </View>

                {/* Live Activity Pipeline */}
                <LiveActivityBar status={order.status} />

                {/* Actions */}
                <View style={styles.actions}>
                  {/* Status progression buttons */}
                  {order.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: Colors.deliveryPreparing }]}
                      onPress={() => updateStatus.mutate({ orderId: order.id, status: 'preparing' })}
                    >
                      <Ionicons name="flame-outline" size={14} color="#fff" />
                      <Text style={styles.actionBtnTxt}>Accept</Text>
                    </TouchableOpacity>
                  )}
                  {order.status === 'preparing' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: Colors.deliveryDispatched }]}
                      onPress={() => updateStatus.mutate({ orderId: order.id, status: 'dispatched' })}
                    >
                      <Ionicons name="bicycle-outline" size={14} color="#fff" />
                      <Text style={styles.actionBtnTxt}>Dispatch</Text>
                    </TouchableOpacity>
                  )}
                  {order.status === 'dispatched' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: Colors.deliveryDelivered }]}
                      onPress={() => updateStatus.mutate({ orderId: order.id, status: 'delivered' })}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color={Colors.background} />
                      <Text style={[styles.actionBtnTxt, { color: Colors.background }]}>Delivered</Text>
                    </TouchableOpacity>
                  )}
                  {/* KOT + WhatsApp */}
                  <TouchableOpacity
                    style={[appStyles.commBtn, styles.ghostBtn]}
                    onPress={() => { setSelectedOrderForKOT(order); setIsKOTVisible(true); }}
                  >
                    <Feather name="printer" size={14} color={Colors.textSecondary} />
                    <Text style={[appStyles.commBtnText, { color: Colors.textSecondary }]}>KOT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[appStyles.commBtn, { backgroundColor: Colors.whatsappDim }]}
                    onPress={() => sendInvoice.mutate({ orderId: order.id })}
                    disabled={sendInvoice.isPending}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color={Colors.whatsapp} />
                    <Text style={[appStyles.commBtnText, { color: Colors.whatsapp }]}>Bill</Text>
                  </TouchableOpacity>
                </View>

                {/* Placed time */}
                <Text style={styles.placedAt}>
                  Placed {new Date(order.placedAt ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Animated.View>
            );
          })
        )}

        {/* Manual Bill Preview */}
        {isManualVisible && (
          <View style={styles.manualBillBox}>
            <Text style={styles.manualBillTitle}>📄 WhatsApp Bill Preview</Text>
            <Text style={styles.manualBillContent}>{manualBillText}</Text>
            <TouchableOpacity onPress={() => setIsManualVisible(false)} style={styles.dismissBtn}>
              <Text style={styles.dismissTxt}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {selectedOrderForKOT && (
        <KOTPreview
          visible={isKOTVisible}
          onClose={() => setIsKOTVisible(false)}
          order={{
            id: selectedOrderForKOT.id,
            table: selectedOrderForKOT.table,
            items: safeItems(selectedOrderForKOT.items).map(i => ({ name: i.name, quantity: i.qty })),
            timestamp: selectedOrderForKOT.createdAt ?? new Date().toISOString(),
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.background },
  scroll:       { flex: 1, paddingHorizontal: Spacing.lg },
  loadingBox:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText:  { ...Typography.body, color: Colors.textSecondary },

  // Header
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  title:        { ...Typography.heading, color: Colors.textPrimary },
  subtitle:     { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  simulateBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.accent, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  simulateTxt:  { ...Typography.caption, color: Colors.background, fontWeight: '700' },

  // Summary
  summaryRow:   { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  summaryCard:  { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  summaryLabel: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
  summaryValue: { ...Typography.subheading, color: Colors.textPrimary, marginTop: 2 },

  sectionTitle: { ...Typography.caption, color: Colors.textTertiary, marginBottom: Spacing.md },

  // Order Card
  card:         { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardHeaderRight:{ alignItems: 'flex-end', gap: 4 },
  orderName:    { ...Typography.subheading, color: Colors.textPrimary },
  orderId:      { ...Typography.caption, color: Colors.textTertiary },
  totalAmt:     { ...Typography.subheading, color: Colors.accent, fontWeight: '700' },

  statusPill:   { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  statusPillText: { ...Typography.caption, fontWeight: '700' },

  itemsBox:     { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder, gap: 3 },
  itemText:     { ...Typography.bodySmall, color: Colors.textSecondary },

  // Actions
  actions:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  actionBtnTxt: { ...Typography.caption, color: '#fff', fontWeight: '700' },
  ghostBtn:     { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },

  placedAt:     { ...Typography.caption, color: Colors.textTertiary, marginTop: Spacing.sm },

  // Empty
  emptyBox:     { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyText:    { ...Typography.subheading, color: Colors.textTertiary },
  emptySubtext: { ...Typography.bodySmall, color: Colors.textTertiary },

  // Manual bill
  manualBillBox:     { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.surfaceBorder, marginTop: Spacing.md },
  manualBillTitle:   { ...Typography.subheading, color: Colors.textPrimary, marginBottom: Spacing.sm },
  manualBillContent: { ...Typography.bodySmall, color: Colors.textSecondary, lineHeight: 20 },
  dismissBtn:        { marginTop: Spacing.md, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  dismissTxt:        { ...Typography.caption, color: Colors.accent },
});
