import React from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../lib/theme';

const MOCK_CUSTOMERS = [
  { id: 'c1', name: 'Premium Guest', phone: '+91 9999999999', visitCount: 12, lastVisit: '2026-03-20' },
  { id: 'c2', name: 'Priya Sharma', phone: '+91 9876543210', visitCount: 5, lastVisit: '2026-03-19' },
  { id: 'c3', name: 'Raj Patel Family', phone: '+91 9000000001', visitCount: 8, lastVisit: '2026-03-20' },
  { id: 'c4', name: 'Office Group', phone: '+91 8888888888', visitCount: 2, lastVisit: '2026-03-18' },
  { id: 'c5', name: 'Vikram Mehta', phone: '+91 7777777777', visitCount: 1, lastVisit: '2026-03-15' },
  { id: 'c6', name: 'Anjali Singh', phone: '+91 9111111111', visitCount: 4, lastVisit: '2026-03-17' },
];

export default function CustomersScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Guests</Text>
        <Text style={styles.subtitle}>{MOCK_CUSTOMERS.length} registered guests</Text>
      </View>

      <FlatList
        data={MOCK_CUSTOMERS.sort((a, b) => b.visitCount - a.visitCount)}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <CustomerCard customer={item} />}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    </SafeAreaView>
  );
}

function CustomerCard({ customer }: { customer: typeof MOCK_CUSTOMERS[0] }) {
  const isVip = customer.visitCount >= 5;
  const isRepeat = customer.visitCount >= 3;
  const initials = customer.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={[styles.card, Shadows.sm]}>
      {/* Avatar */}
      <View style={[styles.avatar, isVip && styles.avatarVip]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{customer.name}</Text>
          {isVip && (
            <View style={styles.vipBadge}>
              <Ionicons name="star" size={10} color={Colors.accent} />
              <Text style={styles.vipText}>VIP</Text>
            </View>
          )}
          {!isVip && isRepeat && (
            <View style={styles.repeatBadge}>
              <Text style={styles.repeatText}>Repeat</Text>
            </View>
          )}
        </View>
        <Text style={styles.phone}>{customer.phone}</Text>
        <Text style={styles.meta}>
          {customer.visitCount} visit{customer.visitCount > 1 ? 's' : ''} · Last: {customer.lastVisit}
        </Text>
      </View>

      {/* Visit count ring */}
      <View style={styles.visits}>
        <Text style={styles.visitsNumber}>{customer.visitCount}</Text>
        <Text style={styles.visitsLabel}>visits</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg, gap: 4 },
  title: { ...Typography.heading, color: Colors.textPrimary },
  subtitle: { ...Typography.bodySmall, color: Colors.textSecondary },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.surfaceElevated, alignItems: 'center',
    justifyContent: 'center', borderWidth: 2, borderColor: Colors.surfaceBorder,
  },
  avatarVip: { borderColor: Colors.accent },
  avatarText: { ...Typography.subheading, color: Colors.accent },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  name: { ...Typography.subheading, color: Colors.textPrimary },
  vipBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accentDim, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.accent + '60',
  },
  vipText: { fontSize: 10, fontWeight: '800', color: Colors.accent },
  repeatBadge: {
    backgroundColor: Colors.confirmedDim, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  repeatText: { fontSize: 10, fontWeight: '700', color: Colors.confirmed },
  phone: { ...Typography.bodySmall, color: Colors.textSecondary },
  meta: { ...Typography.caption, color: Colors.textTertiary },
  visits: { alignItems: 'center', gap: 2 },
  visitsNumber: { ...Typography.subheading, color: Colors.accent, lineHeight: 22 },
  visitsLabel: { ...Typography.caption, color: Colors.textTertiary },
});
