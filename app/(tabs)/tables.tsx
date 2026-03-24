/**
 * Tables Screen — Full CRUD Floor Map Manager
 * - View all tables with status, capacity, zone
 * - Tap = change status (bottom sheet)
 * - Long press OR edit icon = edit capacity / zone
 * - ➕ FAB = add new table
 * - 🗑️ = remove table (with confirmation)
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  RefreshControl, Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc, RESTAURANT_ID } from '../../lib/trpc';
import { Colors, Spacing, Typography, Radius, Shadows, TableStatusColors } from '../../lib/theme';

const STATUS_CYCLE = ['available', 'reserved', 'occupied', 'cleaning', 'blocked'] as const;
const ALL_STATUSES = Object.keys(TableStatusColors);
const ZONES = ['Indoor', 'Outdoor', 'Rooftop', 'Private Room', 'Bar'];
const CAPACITIES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20];

// ── Mini Table Card ──────────────────────────────────────────────────
function TableCard({ table, onPress, onEdit, onRemove, onQR }: {
  table: any;
  onPress: (t: any) => void;
  onEdit: (t: any) => void;
  onRemove: (t: any) => void;
  onQR: (t: any) => void;
}) {
  const sc = TableStatusColors[table.status] || TableStatusColors.available;
  return (
    <Pressable
      style={[styles.card, { borderColor: sc.bg }]}
      onPress={() => onPress(table)}
    >
      {/* Status dot */}
      <View style={[styles.statusDot, { backgroundColor: sc.bg }]} />

      {/* Table number + capacity */}
      <Text style={styles.tableNum}>{table.tableNumber}</Text>
      <Text style={styles.tableLabel}>TABLE</Text>
      <View style={styles.cardMeta}>
        <Ionicons name="people-outline" size={11} color={Colors.textTertiary} />
        <Text style={styles.metaText}>{table.capacity}</Text>
      </View>

      {/* Zone tag */}
      {table.zone && (
        <Text style={styles.zoneTag}>{table.zone}</Text>
      )}

      {/* Status badge */}
      <View style={[styles.badge, { backgroundColor: sc.dim }]}>
        <Text style={[styles.badgeText, { color: sc.bg }]}>{sc.label.toUpperCase()}</Text>
      </View>

      {/* Edit / Remove / QR icons */}
      <View style={styles.cardActions}>
        <Pressable onPress={() => onQR(table)} hitSlop={8}>
          <Ionicons name="qr-code-outline" size={14} color={Colors.textTertiary} />
        </Pressable>
        <Pressable onPress={() => onEdit(table)} hitSlop={8}>
          <Ionicons name="pencil-outline" size={14} color={Colors.textTertiary} />
        </Pressable>
        <Pressable onPress={() => onRemove(table)} hitSlop={8}>
          <Ionicons name="trash-outline" size={14} color="#ef4444" />
        </Pressable>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────
export default function TablesScreen() {
  const router = useRouter();
  const trpcUtils = trpc.useUtils();

  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [statusModal, setStatusModal] = useState<any>(null);    // table -> change status
  const [editModal, setEditModal]     = useState<any>(null);    // table | null -> edit
  const [addModal, setAddModal]       = useState(false);

  // Add form state
  const [newCapacity, setNewCapacity] = useState(4);
  const [newZone, setNewZone]         = useState('Indoor');

  // Edit form state
  const [editCapacity, setEditCapacity] = useState(4);
  const [editZone, setEditZone]         = useState('Indoor');

  // Local mock tables (fallback)
  const [mockTables, setMockTables] = useState([
    { id: 't1', restaurantId: RESTAURANT_ID, tableNumber: 1, capacity: 2, status: 'available', zone: 'Indoor' },
    { id: 't2', restaurantId: RESTAURANT_ID, tableNumber: 2, capacity: 2, status: 'occupied', zone: 'Indoor' },
    { id: 't3', restaurantId: RESTAURANT_ID, tableNumber: 3, capacity: 4, status: 'reserved', zone: 'Indoor' },
    { id: 't4', restaurantId: RESTAURANT_ID, tableNumber: 4, capacity: 4, status: 'available', zone: 'Outdoor' },
    { id: 't5', restaurantId: RESTAURANT_ID, tableNumber: 5, capacity: 6, status: 'available', zone: 'Outdoor' },
    { id: 't6', restaurantId: RESTAURANT_ID, tableNumber: 6, capacity: 8, status: 'cleaning', zone: 'Indoor' },
    { id: 't7', restaurantId: RESTAURANT_ID, tableNumber: 7, capacity: 4, status: 'blocked', zone: 'Private Room' },
    { id: 't8', restaurantId: RESTAURANT_ID, tableNumber: 8, capacity: 2, status: 'available', zone: 'Bar' },
  ]);

  // TRPC mutations
  const addTableMutation    = trpc.table.addTable.useMutation({
    onSuccess: (data) => { setMockTables(prev => [...prev, data as any]); setAddModal(false); },
    onError: () => { /* fallback: add locally */ setAddModal(false); addLocally(); },
  });
  const updateStatusMutation = trpc.table.updateStatus.useMutation({
    onSuccess: () => { trpcUtils.table.listByRestaurant.invalidate(); },
  });
  const updateTableMutation  = trpc.table.updateTable.useMutation({
    onSuccess: () => { setEditModal(null); },
    onError: () => setEditModal(null),
  });
  const removeTableMutation  = trpc.table.removeTable.useMutation({
    onSuccess: (_, vars) => setMockTables(prev => prev.filter(t => t.id !== vars.id)),
    onError: (_, vars) => setMockTables(prev => prev.filter(t => t.id !== (vars as any).id)),
  });

  const allTables = mockTables;
  const statusCounts = allTables.reduce((acc: any, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1; return acc;
  }, {});
  const filtered = filterStatus ? allTables.filter(t => t.status === filterStatus) : allTables;

  // ── Handlers ────────────────────────────────────────────────────────
  function handleStatusChange(newStatus: any) {
    if (!statusModal) return;
    updateStatusMutation.mutate({ id: statusModal.id, status: newStatus });
    setMockTables(prev => prev.map(t => t.id === statusModal.id ? { ...t, status: newStatus } : t));
    setStatusModal(null);
  }

  function openEdit(table: any) {
    setEditCapacity(table.capacity);
    setEditZone(table.zone || 'Indoor');
    setEditModal(table);
  }

  function saveEdit() {
    if (!editModal) return;
    updateTableMutation.mutate({ id: editModal.id, capacity: editCapacity, zone: editZone });
    setMockTables(prev => prev.map(t => t.id === editModal.id ? { ...t, capacity: editCapacity, zone: editZone } : t));
    setEditModal(null);
  }

  function addLocally() {
    const nextNum = mockTables.length > 0 ? Math.max(...mockTables.map(t => t.tableNumber)) + 1 : 1;
    setMockTables(prev => [...prev, {
      id: `t${nextNum}_${Date.now()}`,
      restaurantId: RESTAURANT_ID,
      tableNumber: nextNum,
      capacity: newCapacity,
      status: 'available',
      zone: newZone,
    }]);
    setAddModal(false);
  }

  function handleAdd() {
    addTableMutation.mutate({ restaurantId: RESTAURANT_ID, capacity: newCapacity, zone: newZone });
  }

  function handleRemove(table: any) {
    Alert.alert('Remove Table', `Remove Table ${table.tableNumber}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          removeTableMutation.mutate({ id: table.id });
          setMockTables(prev => prev.filter(t => t.id !== table.id));
        },
      },
    ]);
  }

  const onRefresh = async () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };

  // ── Capacity Picker Row ──────────────────────────────────────────────
  function CapacityPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.pickRow}>
          {CAPACITIES.map(n => (
            <Pressable key={n} style={[styles.pickPill, value === n && styles.pickPillActive]} onPress={() => onChange(n)}>
              <Text style={[styles.pickText, value === n && styles.pickTextActive]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ── Zone Picker ─────────────────────────────────────────────────────
  function ZonePicker({ value, onChange }: { value: string; onChange: (s: string) => void }) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.pickRow}>
          {ZONES.map(z => (
            <Pressable key={z} style={[styles.pickPill, value === z && styles.pickPillActive]} onPress={() => onChange(z)}>
              <Text style={[styles.pickText, value === z && styles.pickTextActive]}>{z}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Floor Map</Text>
            <Text style={styles.subtitle}>{allTables.length} tables · Tap to change status · ✏️ Edit · 🗑️ Remove</Text>
          </View>
          <Pressable style={[styles.addFab, Shadows.sm]} onPress={() => { setNewCapacity(4); setNewZone('Indoor'); setAddModal(true); }}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addFabText}>Add Table</Text>
          </Pressable>
        </View>

        {/* Status filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.pills}>
            <Pressable style={[styles.pill, !filterStatus && styles.pillActive]} onPress={() => setFilterStatus(null)}>
              <Text style={[styles.pillText, !filterStatus && styles.pillTextActive]}>All ({allTables.length})</Text>
            </Pressable>
            {ALL_STATUSES.map(st => {
              const sc = TableStatusColors[st];
              const count = statusCounts[st] ?? 0;
              if (!count) return null;
              return (
                <Pressable key={st} style={[styles.pill, filterStatus === st && { backgroundColor: sc.dim, borderColor: sc.bg }]}
                  onPress={() => setFilterStatus(filterStatus === st ? null : st)}>
                  <View style={[styles.dot, { backgroundColor: sc.bg }]} />
                  <Text style={[styles.pillText, filterStatus === st && { color: sc.bg }]}>{sc.label} ({count})</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Table Grid */}
        <View style={styles.grid}>
          {filtered.map(table => (
            <TableCard
              key={table.id}
              table={table}
              onPress={setStatusModal}
              onEdit={openEdit}
              onRemove={handleRemove}
              onQR={() => router.push(`/menu/${table.id}`)}
            />
          ))}
          {/* Ghost "Add Table" card */}
          <Pressable style={styles.ghostCard} onPress={() => { setNewCapacity(4); setNewZone('Indoor'); setAddModal(true); }}>
            <Ionicons name="add-circle-outline" size={28} color={Colors.accent} />
            <Text style={styles.ghostText}>Add{'\n'}Table</Text>
          </Pressable>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── STATUS MODAL ────────────────────────────────────────────── */}
      <Modal visible={!!statusModal} transparent animationType="slide" onRequestClose={() => setStatusModal(null)}>
        <Pressable style={styles.overlay} onPress={() => setStatusModal(null)}>
          <View style={[styles.sheet, Shadows.md]}>
            <Text style={styles.sheetTitle}>Table {statusModal?.tableNumber} — Change Status</Text>
            <Text style={styles.sheetSub}>{statusModal?.capacity} seats · {statusModal?.zone} · Currently: {statusModal?.status}</Text>
            {STATUS_CYCLE.map(st => {
              const sc = TableStatusColors[st];
              const isActive = statusModal?.status === st;
              return (
                <Pressable key={st} style={[styles.statusRow, isActive && { backgroundColor: sc.dim }]} onPress={() => handleStatusChange(st)}>
                  <View style={[styles.statusDotLg, { backgroundColor: sc.bg }]} />
                  <Text style={[styles.statusRowLabel, { color: isActive ? sc.bg : Colors.textPrimary }]}>{sc.label}</Text>
                  {isActive && <Ionicons name="checkmark-circle" size={18} color={sc.bg} />}
                </Pressable>
              );
            })}
            <Pressable style={styles.cancelBtn} onPress={() => setStatusModal(null)}>
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ── ADD MODAL ───────────────────────────────────────────────── */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setAddModal(false)}>
          <Pressable style={[styles.sheet, Shadows.md]} onPress={e => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>➕ Add New Table</Text>

            <Text style={styles.fieldLabel}>CAPACITY (seats)</Text>
            <CapacityPicker value={newCapacity} onChange={setNewCapacity} />

            <Text style={styles.fieldLabel}>ZONE / LOCATION</Text>
            <ZonePicker value={newZone} onChange={setNewZone} />

            <Pressable
              style={[styles.confirmBtn, addTableMutation.isPending && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={addTableMutation.isPending}
            >
              {addTableMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.confirmBtnText}>Add Table (Capacity {newCapacity} · {newZone})</Text></>
              }
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setAddModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── EDIT MODAL ──────────────────────────────────────────────── */}
      <Modal visible={!!editModal} transparent animationType="slide" onRequestClose={() => setEditModal(null)}>
        <Pressable style={styles.overlay} onPress={() => setEditModal(null)}>
          <Pressable style={[styles.sheet, Shadows.md]} onPress={e => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>✏️ Edit Table {editModal?.tableNumber}</Text>

            <Text style={styles.fieldLabel}>CAPACITY (seats)</Text>
            <CapacityPicker value={editCapacity} onChange={setEditCapacity} />

            <Text style={styles.fieldLabel}>ZONE / LOCATION</Text>
            <ZonePicker value={editZone} onChange={setEditZone} />

            <Pressable style={styles.confirmBtn} onPress={saveEdit}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.confirmBtnText}>Save Changes</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={() => setEditModal(null)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  title: { ...Typography.heading, color: Colors.textPrimary },
  subtitle: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2, lineHeight: 16 },
  addFab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accent, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  addFabText: { ...Typography.bodySmall, color: '#fff', fontWeight: '700' },
  pills: { flexDirection: 'row', gap: Spacing.sm, paddingBottom: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  pillActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  pillText: { ...Typography.bodySmall, color: Colors.textSecondary, fontWeight: '600' },
  pillTextActive: { color: Colors.accent },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  // ── Card ──
  card: {
    width: 155, minHeight: 160,
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1.5, gap: 2, position: 'relative',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  tableNum: { fontSize: 36, fontWeight: '900', color: Colors.textPrimary, lineHeight: 40 },
  tableLabel: { fontSize: 10, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1.5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  metaText: { ...Typography.caption, color: Colors.textTertiary },
  zoneTag: { ...Typography.caption, color: Colors.textTertiary, fontStyle: 'italic', marginTop: 2 },
  badge: { marginTop: 'auto' as any, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  // Ghost card
  ghostCard: {
    width: 155, minHeight: 160,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.accent, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  ghostText: { ...Typography.caption, color: Colors.accent, fontWeight: '700', textAlign: 'center' },
  // Modal / Sheet
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    padding: Spacing.xl, gap: Spacing.md,
  },
  sheetTitle: { ...Typography.subheading, color: Colors.textPrimary, fontWeight: '800' },
  sheetSub: { ...Typography.caption, color: Colors.textTertiary },
  fieldLabel: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  // Capacity / Zone picker
  pickRow: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  pickPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.surfaceBorder, backgroundColor: Colors.surfaceElevated,
  },
  pickPillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pickText: { ...Typography.bodySmall, color: Colors.textSecondary, fontWeight: '600' },
  pickTextActive: { color: '#fff', fontWeight: '700' },
  // Status rows in modal
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: Radius.md,
  },
  statusDotLg: { width: 12, height: 12, borderRadius: 6 },
  statusRowLabel: { ...Typography.body, flex: 1 },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: 14,
  },
  confirmBtnText: { ...Typography.body, color: '#fff', fontWeight: '700' },
  cancelBtn: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  cancelText: { ...Typography.body, color: Colors.textSecondary, fontWeight: '600' },
});
