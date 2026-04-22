import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, SafeAreaView, Alert, Animated, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc, RESTAURANT_ID } from '../lib/trpc';
import { useSaaSStore } from '../lib/saas-store';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';

// ─── Constants ───────────────────────────────────────────────────────────────
const MOCK_TABLES = [
  { id: 't1', tableNumber: 1, capacity: 2, status: 'available' },
  { id: 't2', tableNumber: 2, capacity: 2, status: 'available' },
  { id: 't3', tableNumber: 3, capacity: 4, status: 'occupied' },
  { id: 't4', tableNumber: 4, capacity: 4, status: 'reserved' },
  { id: 't5', tableNumber: 5, capacity: 6, status: 'available' },
  { id: 't6', tableNumber: 6, capacity: 6, status: 'available' },
  { id: 't7', tableNumber: 7, capacity: 8, status: 'cleaning' },
  { id: 't8', tableNumber: 8, capacity: 8, status: 'available' },
];

const STATUS_COLORS: Record<string, string> = {
  available: '#22c55e',
  occupied:  '#ef4444',
  reserved:  '#f59e0b',
  cleaning:  '#a855f7',
};
const STATUS_BG: Record<string, string> = {
  available: '#dcfce7',
  occupied:  '#fee2e2',
  reserved:  '#fef3c7',
  cleaning:  '#f3e8ff',
};

function getCurrentTime(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WalkinScreen() {
  const router = useRouter();
  const appName = useSaaSStore(s => s.appName);

  const [name,      setName]      = useState('');
  const [phone,     setPhone]     = useState('');
  const [partySize, setPartySize] = useState(2);
  const [tableId,   setTableId]   = useState('');
  const [notes,     setNotes]     = useState('');
  const [success,   setSuccess]   = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const today      = getCurrentDate();
  const nowTime    = getCurrentTime();
  const partySz    = partySize;

  // Compute suitable available tables
  const suitableTables = MOCK_TABLES.filter(
    t => t.status === 'available' && t.capacity >= partySz
  );
  const bestFitTable = suitableTables.length > 0
    ? suitableTables.reduce((b, t) => t.capacity < b.capacity ? t : b, suitableTables[0])
    : null;

  const createMutation = trpc.booking.create.useMutation({
    onSuccess: () => {
      setSuccess(true);
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.06, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true }),
      ]).start();
      setTimeout(() => router.replace('/(tabs)/bookings'), 2000);
    },
    onError: (err) => {
      if (typeof window !== 'undefined') {
        window.alert('❌ Error: ' + err.message);
      } else {
        Alert.alert('Error', err.message);
      }
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter the guest name.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      Alert.alert('Required', 'Please enter a valid phone number.');
      return;
    }
    if (!tableId) {
      Alert.alert('Required', 'Please select a table.');
      return;
    }

    createMutation.mutate({
      restaurantId:  RESTAURANT_ID,
      customerName:  name.trim(),
      customerPhone: phone.trim().replace(/[\s-]/g, ''),
      partySize:     partySz,
      tableId,
      bookingDate:   today,
      bookingTime:   nowTime,
      notes:         notes.trim() || undefined,
      source:        'walkin',
    });
  };

  // ── Success State ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <Animated.View style={[styles.successCard, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Walk-in Seated!</Text>
          <Text style={styles.successSub}>{name} · Table {MOCK_TABLES.find(t => t.id === tableId)?.tableNumber} · Party of {partySz}</Text>
          <Text style={styles.successHint}>Redirecting to dashboard…</Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Walk-in Guest</Text>
          <Text style={styles.headerSub}>{appName} · {today} · {nowTime}</Text>
        </View>
        <View style={styles.liveChip}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Guest Info Card ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-circle-outline" size={20} color={Colors.accent} />
            <Text style={styles.cardTitle}>Guest Information</Text>
          </View>

          <FieldLabel>Guest Name *</FieldLabel>
          <InputRow
            icon="person-outline"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Raj Patel"
          />

          <FieldLabel>Phone Number *</FieldLabel>
          <InputRow
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 9999999999"
            keyboardType="phone-pad"
          />

          <FieldLabel>Special Requests</FieldLabel>
          <InputRow
            icon="chatbubble-outline"
            value={notes}
            onChangeText={setNotes}
            placeholder="Allergies, high chair, occasion…"
            multiline
          />
        </View>

        {/* ── Party Size ───────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people-outline" size={20} color={Colors.accent} />
            <Text style={styles.cardTitle}>Party Size</Text>
          </View>
          <View style={styles.partySizeRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <Pressable
                key={n}
                style={[styles.sizeBtn, partySize === n && styles.sizeBtnActive]}
                onPress={() => { setPartySize(n); setTableId(''); }}
              >
                <Text style={[styles.sizeBtnNum, partySize === n && styles.sizeBtnNumActive]}>
                  {n}
                </Text>
                <Text style={[styles.sizeBtnLabel, partySize === n && styles.sizeBtnLabelActive]}>
                  {n === 1 ? 'guest' : 'guests'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Table Selection ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="restaurant-outline" size={20} color={Colors.accent} />
            <Text style={styles.cardTitle}>Select Table</Text>
            <View style={styles.tagChip}>
              <Text style={styles.tagChipText}>{suitableTables.length} available</Text>
            </View>
          </View>

          {bestFitTable && (
            <Pressable
              style={styles.autoAssignBtn}
              onPress={() => setTableId(bestFitTable.id)}
            >
              <Ionicons name="flash" size={14} color="#f59e0b" />
              <Text style={styles.autoAssignText}>
                Auto-assign best fit: Table {bestFitTable.tableNumber} ({bestFitTable.capacity} seats)
              </Text>
            </Pressable>
          )}

          <View style={styles.tableGrid}>
            {MOCK_TABLES.map(table => {
              const isAvail    = table.status === 'available';
              const isSuitable = isAvail && table.capacity >= partySz;
              const isSelected = table.id === tableId;
              return (
                <Pressable
                  key={table.id}
                  style={[
                    styles.tableCell,
                    isSelected   && styles.tableCellSelected,
                    !isSuitable  && styles.tableCellDisabled,
                  ]}
                  onPress={() => isSuitable && setTableId(table.id)}
                  disabled={!isSuitable}
                >
                  <View style={[styles.tableStatusDot, { backgroundColor: STATUS_COLORS[table.status] }]} />
                  <Text style={[styles.tableNum, isSelected && styles.tableNumSelected]}>
                    T{table.tableNumber}
                  </Text>
                  <Text style={[styles.tableCap, isSelected && styles.tableCapSelected]}>
                    {table.capacity} seats
                  </Text>
                  <View style={[
                    styles.tableStatusBadge,
                    { backgroundColor: STATUS_BG[table.status] },
                  ]}>
                    <Text style={[styles.tableStatusText, { color: STATUS_COLORS[table.status] }]}>
                      {table.status}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.selectedCheck}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.accent} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Quick Summary ─────────────────────────────────────────────────── */}
        {tableId && name && (
          <View style={styles.summaryBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
            <Text style={styles.summaryText}>
              {name} · Party of {partySz} · Table {MOCK_TABLES.find(t => t.id === tableId)?.tableNumber} · Now
            </Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Submit Footer ─────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.submitBtn, createMutation.isPending && { opacity: 0.65 }]}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.submitBtnText}>Seating Guest…</Text>
            </>
          ) : (
            <>
              <Ionicons name="walk" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Seat Walk-in Now</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Shared Sub-components ────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function InputRow({
  icon, value, onChangeText, placeholder, keyboardType, multiline,
}: {
  icon: any; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={[styles.inputRow, multiline && { alignItems: 'flex-start' }]}>
      <Ionicons name={icon} size={18} color={Colors.textTertiary} style={multiline ? { marginTop: 2 } : {}} />
      <TextInput
        style={[styles.input, multiline && { height: 72, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  headerCenter: { flex: 1 },
  headerTitle: { ...Typography.subheading, color: Colors.textPrimary, fontWeight: '700' },
  headerSub:   { ...Typography.caption,    color: Colors.textTertiary },
  liveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dcfce7', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  liveDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  liveText: { fontSize: 10, fontWeight: '800', color: '#15803d', letterSpacing: 0.8 },

  // Content
  content: { padding: Spacing.lg, gap: Spacing.lg },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: Spacing.lg, gap: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardTitle:  { ...Typography.subheading, color: Colors.textPrimary, fontWeight: '700', flex: 1 },

  tagChip: {
    backgroundColor: Colors.accentDim, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  tagChipText: { fontSize: 11, fontWeight: '700', color: Colors.accent },

  // Fields
  fieldLabel: { ...Typography.bodySmall, color: Colors.textSecondary, fontWeight: '600', marginBottom: -4 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.background, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  input: { flex: 1, ...Typography.body, color: Colors.textPrimary },

  // Party size
  partySizeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  sizeBtn: {
    width: 60, height: 58, borderRadius: Radius.md,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.surfaceBorder, gap: 2,
  },
  sizeBtnActive:      { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  sizeBtnNum:         { ...Typography.subheading, color: Colors.textSecondary, fontWeight: '700' },
  sizeBtnNumActive:   { color: Colors.accent },
  sizeBtnLabel:       { fontSize: 9, color: Colors.textTertiary },
  sizeBtnLabelActive: { color: Colors.accent },

  // Table grid
  autoAssignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: '#fefce8', borderRadius: Radius.md, padding: Spacing.sm,
    borderWidth: 1, borderColor: '#fde68a',
  },
  autoAssignText: { ...Typography.bodySmall, color: '#92400e', flex: 1 },
  tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tableCell: {
    width: '22%', minWidth: 72,
    backgroundColor: Colors.background, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.surfaceBorder,
    padding: Spacing.sm, alignItems: 'center', gap: 3,
    position: 'relative',
  },
  tableCellSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
  tableCellDisabled: { opacity: 0.35 },
  tableStatusDot: {
    position: 'absolute', top: 6, right: 6,
    width: 7, height: 7, borderRadius: 4,
  },
  tableNum:         { ...Typography.subheading, color: Colors.textPrimary, fontWeight: '800' },
  tableNumSelected: { color: Colors.accent },
  tableCap:         { fontSize: 10, color: Colors.textTertiary },
  tableCapSelected: { color: Colors.accent },
  tableStatusBadge: {
    borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 1,
    marginTop: 2,
  },
  tableStatusText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  selectedCheck: { position: 'absolute', bottom: 4, right: 4 },

  // Summary banner
  summaryBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#dcfce7', borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: '#86efac',
  },
  summaryText: { ...Typography.bodySmall, color: '#166534', fontWeight: '600', flex: 1 },

  // Footer
  footer: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.accent, borderRadius: Radius.lg,
    paddingVertical: 16,
    ...Shadows.accent,
  },
  submitBtnText: { ...Typography.subheading, color: '#fff', fontWeight: '800', fontSize: 16 },

  // Success
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.xl,
  },
  successEmoji: { fontSize: 56 },
  successTitle: { ...Typography.heading, color: Colors.textPrimary, fontWeight: '800' },
  successSub:   { ...Typography.body,    color: Colors.textSecondary, textAlign: 'center' },
  successHint:  { ...Typography.caption, color: Colors.textTertiary },
});
