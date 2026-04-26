/**
 * Guests CRM Screen — Expanded
 * Features: search bar, add guest modal, visit history, VIP tiers, call action
 */
import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, SafeAreaView,
  TextInput, Modal, KeyboardAvoidingView, Platform, Linking, Alert, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuickAccessButton } from '../../components/QuickAccessMenu';
import { trpc } from '../../lib/trpc';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../lib/theme';

interface Guest {
  id: string;
  name: string;
  phone: string;
  visitCount: number;
  lastVisit: string;
  tags?: string;
  notes?: string;
}

const INITIAL_GUESTS: Guest[] = [
  { id: 'c1', name: 'Raj Patel Family', phone: '+91 9000000001', visitCount: 8, lastVisit: '2026-03-20', tags: 'vip' },
  { id: 'c2', name: 'Priya Sharma',     phone: '+91 9876543210', visitCount: 5, lastVisit: '2026-03-19', tags: 'vip' },
  { id: 'c3', name: 'Anjali Singh',     phone: '+91 9111111111', visitCount: 4, lastVisit: '2026-03-17', tags: 'repeat' },
  { id: 'c4', name: 'Office Group (TCS)', phone: '+91 8888888888', visitCount: 2, lastVisit: '2026-03-18' },
  { id: 'c5', name: 'Vikram Mehta',     phone: '+91 7777777777', visitCount: 1, lastVisit: '2026-03-15' },
  { id: 'c6', name: 'Amir Desai',       phone: '+91 7000012300', visitCount: 1, lastVisit: '2026-03-10' },
];

type FilterMode = 'all' | 'vip' | 'repeat' | 'new';

export default function CustomersScreen() {
  const { data: serverGuests, isLoading, error, refetch } = trpc.booking.listCustomers.useQuery();
  
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [addVisible, setAddVisible] = useState(false);
  const [detailGuest, setDetailGuest] = useState<Guest | null>(null);

  const createCustomer = trpc.booking.createCustomer.useMutation({
    onSuccess: () => {
      refetch();
      setAddVisible(false);
      setNewName(''); setNewPhone(''); setNewNotes('');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const deleteCustomer = trpc.booking.deleteCustomer.useMutation({
    onSuccess: () => {
      refetch();
      setDetailGuest(null);
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  // Map server data to Guest interface
  const guests: Guest[] = useMemo(() => {
    if (!serverGuests) return [];
    return serverGuests.map((g: any) => ({
      id: g.id,
      name: g.name,
      phone: g.phone || '—',
      visitCount: g.visitCount || 0,
      lastVisit: g.createdAt ? g.createdAt.split('T')[0] : '—',
      tags: g.tags || '',
      notes: g.notes || '',
    }));
  }, [serverGuests]);

  // Add guest form
  const [newName, setNewName]   = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const filtered = useMemo(() => {
    let list = guests;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g =>
        g.name.toLowerCase().includes(q) || g.phone.includes(q)
      );
    }
    if (filterMode === 'vip')    list = list.filter(g => g.visitCount >= 5);
    if (filterMode === 'repeat') list = list.filter(g => g.visitCount >= 2 && g.visitCount < 5);
    if (filterMode === 'new')    list = list.filter(g => g.visitCount < 2);
    return [...list].sort((a, b) => b.visitCount - a.visitCount);
  }, [guests, search, filterMode]);

  const vipCount    = guests.filter(g => g.visitCount >= 5).length;
  const repeatCount = guests.filter(g => g.visitCount >= 2 && g.visitCount < 5).length;

  const handleAddGuest = () => {
    if (!newName.trim()) {
      Alert.alert('Required', 'Please enter the guest\'s name.');
      return;
    }
    createCustomer.mutate({
      name: newName.trim(),
      phone: newPhone.trim(),
      notes: newNotes.trim(),
    });
  };

  const handleDeleteGuest = (id: string) => {
    Alert.alert(
      'Delete Guest',
      'Are you sure you want to remove this guest from the CRM?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteCustomer.mutate({ id }) },
      ]
    );
  };

  const handleCall = (phone: string) => {
    const clean = phone.replace(/\s/g, '');
    Linking.openURL(`tel:${clean}`).catch(() => Alert.alert('Cannot open dialler'));
  };

  const handleWhatsApp = (phone: string) => {
    const clean = phone.replace(/[\s+]/g, '');
    Linking.openURL(`https://wa.me/${clean}`).catch(() => Alert.alert('WhatsApp not installed'));
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>CRM Overview</Text>
          <Text style={styles.title}>Guests</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={[styles.addBtn, Shadows.md]} onPress={() => setAddVisible(true)}>
            <Ionicons name="person-add" size={16} color={Colors.textPrimary} />
            <Text style={styles.addBtnText}>Add Guest</Text>
          </Pressable>
          <QuickAccessButton />
        </View>
      </View>

      {/* ── Search Bar ─────────────────────────────────────────── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.textTertiary} style={{ marginLeft: 12 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone…"
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} style={{ paddingRight: 12 }}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* ── Filter Chips ────────────────────────────────────────── */}
      <View style={styles.filterRow}>
        {(['all', 'vip', 'repeat', 'new'] as FilterMode[]).map(f => (
          <Pressable
            key={f}
            style={[styles.filterChip, filterMode === f && styles.filterChipActive]}
            onPress={() => setFilterMode(f)}
          >
            <Text style={[styles.filterText, filterMode === f && styles.filterTextActive]}>
              {f === 'all' ? `All (${guests.length})` :
               f === 'vip' ? `⭐ VIP (${vipCount})` :
               f === 'repeat' ? `🔁 Repeat (${repeatCount})` : '🆕 New'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Guest List ──────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={Colors.accent} />
          <Text style={styles.emptyText}>Syncing Guest CRM…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No guests match your search</Text>
            </View>
          }
          renderItem={({ item }) => (
            <GuestCard
              guest={item}
              onPress={() => setDetailGuest(item)}
              onCall={() => handleCall(item.phone)}
              onWhatsApp={() => handleWhatsApp(item.phone)}
            />
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      )}

      {/* ── Add Guest Modal ─────────────────────────────────────── */}
      <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: Colors.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Guest</Text>
            <Pressable onPress={() => setAddVisible(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>
            <FieldInput
              label="Full Name *"
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Priya Sharma"
              icon="person-outline"
            />
            <FieldInput
              label="Phone / WhatsApp"
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="+91 9876543210"
              icon="call-outline"
              keyboardType="phone-pad"
            />
            <FieldInput
              label="Notes (optional)"
              value={newNotes}
              onChangeText={setNewNotes}
              placeholder="Allergies, preferences, occasion…"
              icon="chatbubble-outline"
              multiline
            />

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                (pressed || createCustomer.isPending) && { opacity: 0.8 }
              ]}
              onPress={handleAddGuest}
              disabled={createCustomer.isPending}
            >
              {createCustomer.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Add to Guest List</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Guest Detail Modal ─────────────────────────────────── */}
      <Modal
        visible={!!detailGuest}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailGuest(null)}
      >
        {detailGuest && (
          <View style={{ flex: 1, backgroundColor: Colors.background }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{detailGuest.name}</Text>
              <Pressable onPress={() => setDetailGuest(null)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              {/* Guest Stats */}
              <View style={styles.detailStatsRow}>
                <View style={styles.detailStat}>
                  <Text style={styles.detailStatNum}>{detailGuest.visitCount}</Text>
                  <Text style={styles.detailStatLabel}>Total Visits</Text>
                </View>
                <View style={[styles.detailStat, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.surfaceBorder }]}>
                  <Text style={styles.detailStatNum}>
                    {detailGuest.visitCount >= 5 ? '⭐ VIP' : detailGuest.visitCount >= 2 ? '🔁 Repeat' : '🆕 New'}
                  </Text>
                  <Text style={styles.detailStatLabel}>Tier</Text>
                </View>
                <View style={styles.detailStat}>
                  <Text style={styles.detailStatNum}>{detailGuest.lastVisit}</Text>
                  <Text style={styles.detailStatLabel}>Last Visit</Text>
                </View>
              </View>

              {/* Contact Actions */}
              <View style={styles.contactRow}>
                <Pressable
                  style={[styles.contactBtn, { backgroundColor: '#25D366' }]}
                  onPress={() => handleWhatsApp(detailGuest.phone)}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                  <Text style={styles.contactBtnText}>WhatsApp</Text>
                </Pressable>
                <Pressable
                  style={[styles.contactBtn, { backgroundColor: Colors.accent }]}
                  onPress={() => handleCall(detailGuest.phone)}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.contactBtnText}>Call</Text>
                </Pressable>
              </View>

              {detailGuest.notes ? (
                <View style={styles.notesCard}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notesText}>{detailGuest.notes}</Text>
                </View>
              ) : null}

              <View style={styles.notesCard}>
                <Text style={styles.notesLabel}>Phone Number</Text>
                <Text style={styles.notesText}>{detailGuest.phone}</Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.deleteBtn,
                  (pressed || deleteCustomer.isPending) && { opacity: 0.7 }
                ]}
                onPress={() => handleDeleteGuest(detailGuest.id)}
                disabled={deleteCustomer.isPending}
              >
                {deleteCustomer.isPending ? (
                  <ActivityIndicator color={Colors.error} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    <Text style={styles.deleteBtnText}>Delete Guest Record</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-Components ─────────────────────────────────────────────────

function GuestCard({
  guest, onPress, onCall, onWhatsApp,
}: {
  guest: Guest;
  onPress: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
}) {
  const isVip    = guest.visitCount >= 5;
  const isRepeat = guest.visitCount >= 2 && guest.visitCount < 5;
  const initials = guest.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const avatarBg = isVip ? Colors.accentDim : Colors.surfaceElevated;
  const avatarBorder = isVip ? Colors.accent : Colors.surfaceBorder;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, Shadows.sm, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarBg, borderColor: avatarBorder }]}>
        <Text style={[styles.avatarText, { color: isVip ? Colors.accent : Colors.textSecondary }]}>
          {initials}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{guest.name}</Text>
          {isVip && (
            <View style={styles.vipBadge}>
              <Ionicons name="star" size={9} color={Colors.accent} />
              <Text style={styles.vipText}>VIP</Text>
            </View>
          )}
          {!isVip && isRepeat && (
            <View style={styles.repeatBadge}>
              <Text style={styles.repeatText}>Repeat</Text>
            </View>
          )}
        </View>
        <Text style={styles.phone}>{guest.phone}</Text>
        <Text style={styles.meta}>
          {guest.visitCount} visit{guest.visitCount !== 1 ? 's' : ''} · Last: {guest.lastVisit}
        </Text>
      </View>

      {/* Quick action icons */}
      <View style={styles.actions}>
        <Pressable style={styles.actionIcon} onPress={onWhatsApp}>
          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
        </Pressable>
        <Pressable style={styles.actionIcon} onPress={onCall}>
          <Ionicons name="call-outline" size={18} color={Colors.accent} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function FieldInput({
  label, value, onChangeText, placeholder, icon, keyboardType, multiline,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; icon?: any; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldWrap}>
        {icon && <Ionicons name={icon} size={18} color={Colors.textTertiary} />}
        <TextInput
          style={[styles.fieldInput, multiline && { height: 80, textAlignVertical: 'top' }]}
          value={value} onChangeText={onChangeText} placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary} keyboardType={keyboardType}
          multiline={multiline} numberOfLines={multiline ? 3 : 1}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md, marginBottom: Spacing.sm
  },
  greeting: { ...Typography.body, color: Colors.textSecondary },
  title:    { ...Typography.heading, color: Colors.textPrimary, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.body, color: Colors.textInverse, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  addBtnText: { ...Typography.bodySmall, color: Colors.textPrimary, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    marginHorizontal: Spacing.lg, marginBottom: 10,
  },
  searchInput: {
    flex: 1, ...Typography.body, color: Colors.textPrimary,
    paddingVertical: 12, paddingHorizontal: 10,
  },

  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: Spacing.lg, marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  filterChipActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  filterText:       { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: Colors.accent },

  list: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  cardAvatar: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center',
    justifyContent: 'center', borderWidth: 2,
  },
  cardAvatarText: { ...Typography.subheading },
  info:    { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name:    { ...Typography.subheading, color: Colors.textPrimary, flex: 1 },
  phone:   { ...Typography.bodySmall, color: Colors.textSecondary },
  meta:    { ...Typography.caption, color: Colors.textTertiary },

  vipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.accentDim, borderRadius: Radius.full,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.accent + '50',
  },
  vipText: { fontSize: 9, fontWeight: '800', color: Colors.accent },
  repeatBadge: {
    backgroundColor: Colors.confirmedDim, borderRadius: Radius.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  repeatText: { fontSize: 9, fontWeight: '700', color: Colors.confirmed },

  actions:    { flexDirection: 'column', gap: 8 },
  actionIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceElevated, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder,
  },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { ...Typography.body, color: Colors.textTertiary },

  // Modal
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  modalTitle: { ...Typography.heading, color: Colors.textPrimary },
  modalClose: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  modalBody: { padding: Spacing.lg, gap: Spacing.lg, flex: 1 },

  fieldLabel: { ...Typography.bodySmall, color: Colors.textSecondary, fontWeight: '600' },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 12,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  fieldInput: { flex: 1, ...Typography.body, color: Colors.textPrimary },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: Radius.lg,
    paddingVertical: Spacing.lg, marginTop: Spacing.sm,
  },
  submitBtnText: { ...Typography.subheading, color: '#fff', fontWeight: '700' },

  // Detail modal
  detailStatsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  detailStat: { flex: 1, alignItems: 'center', padding: 14, gap: 4 },
  detailStatNum: { ...Typography.subheading, color: Colors.textPrimary, fontSize: 13 },
  detailStatLabel: { ...Typography.caption, color: Colors.textTertiary },

  contactRow: { flexDirection: 'row', gap: 12 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: Radius.lg, paddingVertical: 14,
  },
  contactBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  notesCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14,
    borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 6,
  },
  notesLabel: { ...Typography.caption, color: Colors.textTertiary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  notesText: { ...Typography.body, color: Colors.textPrimary },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 'auto', paddingVertical: 16,
    borderWidth: 1, borderColor: Colors.error + '30', borderRadius: Radius.lg,
    backgroundColor: Colors.error + '10',
  },
  deleteBtnText: { color: Colors.error, fontWeight: '700', fontSize: 14 },
});
