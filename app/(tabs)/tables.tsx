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
  View, Text, ScrollView, StyleSheet, Pressable, Image,
  RefreshControl, Modal, Alert, ActivityIndicator, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { QuickAccessButton } from '../../components/QuickAccessMenu';
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
    <Pressable style={[styles.card, Shadows.sm]} onPress={() => onPress(table)}>
      {/* Top accent line representing status */}
      <View style={[styles.cardTopAccent, { backgroundColor: sc.bg }]} />
      
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.tableLabel}>TABLE</Text>
          <Text style={styles.tableNum}>{table.tableNumber}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Ionicons name="people" size={14} color={Colors.textTertiary} />
          <Text style={styles.metaText}>{table.capacity}</Text>
        </View>
      </View>

      {/* Zone tag */}
      {table.zone && (
        <View style={styles.zoneRow}>
          <Ionicons name="location-outline" size={12} color={Colors.textTertiary} />
          <Text style={styles.zoneTag}>{table.zone}</Text>
        </View>
      )}

      {/* Status badge */}
      <View style={[styles.badge, { backgroundColor: sc.dim }]}>
        <View style={[styles.badgeDot, { backgroundColor: sc.bg }]} />
        <Text style={[styles.badgeText, { color: sc.bg }]}>{sc.label.toUpperCase()}</Text>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <Pressable style={styles.actionBtn} onPress={() => onEdit(table)} hitSlop={8}>
          <Ionicons name="pencil" size={16} color={Colors.textSecondary} />
        </Pressable>
        <View style={{flex: 1}} />
        <Pressable style={styles.actionBtn} onPress={() => onRemove(table)} hitSlop={8}>
          <Ionicons name="trash" size={16} color="#ef4444" />
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

  // TRPC queries
  const { data: liveTables = [] } = trpc.table.listByRestaurant.useQuery(
    undefined,
    { refetchInterval: 10000 }
  );

  // Combine live and mock (live takes priority)
  const allTables = liveTables.length > 0 ? liveTables : mockTables;
  const statusCounts = allTables.reduce((acc: any, t: any) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1; return acc;
  }, {});
  const filtered = filterStatus ? allTables.filter((t: any) => t.status === filterStatus) : allTables;

  // TRPC mutations
  const addTableMutation    = trpc.table.addTable.useMutation({
    onSuccess: () => { trpcUtils.table.listByRestaurant.invalidate(); setAddModal(false); },
    onError: () => { setAddModal(false); addLocally(); },
  });
  const updateStatusMutation = trpc.table.updateStatus.useMutation({
    onSuccess: () => { trpcUtils.table.listByRestaurant.invalidate(); },
  });
  const updateTableMutation  = trpc.table.updateTable.useMutation({
    onSuccess: () => { trpcUtils.table.listByRestaurant.invalidate(); setEditModal(null); },
    onError: () => setEditModal(null),
  });
  const removeTableMutation  = trpc.table.removeTable.useMutation({
    onSuccess: () => { trpcUtils.table.listByRestaurant.invalidate(); },
  });

  // ── Handlers ────────────────────────────────────────────────────────
  function handleStatusChange(newStatus: any) {
    if (!statusModal) return;
    updateStatusMutation.mutate({ id: statusModal.id, status: newStatus });
    // Aggressive local update for UI snappiness
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
    addTableMutation.mutate({ capacity: newCapacity, zone: newZone });
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

  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const padding = 20; // Spacing.lg
  const gap = 16;     // Spacing.md
  
  // Perfect 2-column on mobile, fixed width on desktop
  const cardWidth = isDesktop ? 160 : (width - padding * 2 - gap) / 2;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Manage Seating</Text>
            <Text style={styles.title}>Floor Map</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={[styles.addFab, Shadows.md]} onPress={() => { setNewCapacity(4); setNewZone('Indoor'); setAddModal(true); }}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addFabText}>Add Table</Text>
            </Pressable>
          </View>
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
          {filtered.map((table: any) => (
            <View key={table.id} style={{ width: cardWidth }}>
              <TableCard
                table={table}
                onPress={setStatusModal}
                onEdit={openEdit}
                onRemove={handleRemove}
                onQR={() => router.push(`/menu/${table.id}`)}
              />
            </View>
          ))}
          {/* Ghost "Add Table" card */}
          <Pressable style={[styles.ghostCard, { width: cardWidth }]} onPress={() => { setNewCapacity(4); setNewZone('Indoor'); setAddModal(true); }}>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: { ...Typography.body, color: Colors.textSecondary },
  title: { ...Typography.heading, color: Colors.textPrimary, marginTop: 4 },
  subtitle: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2, lineHeight: 16 },
  headerActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.body, color: Colors.textInverse, fontWeight: '700' },
  addFab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  addFabText: { ...Typography.bodySmall, color: Colors.textPrimary, fontWeight: '700' },
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
    backgroundColor: Colors.surfaceElevated, 
    borderRadius: Radius.lg, 
    padding: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 140,
    justifyContent: 'space-between',
  },
  cardTopAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  tableNum: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginTop: -2 },
  tableLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  metaText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  zoneTag: { fontSize: 12, color: Colors.textTertiary, fontWeight: '500' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder },
  actionBtn: { padding: 4 },
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
