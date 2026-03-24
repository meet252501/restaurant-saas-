import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable,
  SafeAreaView, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';

interface WaitlistGuest {
  id: string;
  name: string;
  phone: string;
  partySize: number;
  addedAt: string;
  waitMins: number;
}

const INITIAL_WAITLIST: WaitlistGuest[] = [
  { id: 'w1', name: 'Anita Desai', phone: '+91 9112233445', partySize: 3, addedAt: '20:15', waitMins: 15 },
  { id: 'w2', name: 'Mohan Kumar', phone: '+91 9887766554', partySize: 2, addedAt: '20:22', waitMins: 22 },
];

export default function WaitlistScreen() {
  const [waitlist, setWaitlist] = useState<WaitlistGuest[]>(INITIAL_WAITLIST);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState('2');

  const addGuest = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Required', 'Please enter name and phone number.');
      return;
    }
    const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const newGuest: WaitlistGuest = {
      id: `w${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      partySize: parseInt(partySize, 10) || 2,
      addedAt: now,
      waitMins: waitlist.length * 15 + 15,
    };
    setWaitlist(prev => [...prev, newGuest]);
    setName(''); setPhone(''); setPartySize('2');
    setShowForm(false);
  };

  const seatGuest = (id: string) => {
    Alert.alert('Seat Guest?', 'This will remove them from the waitlist.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Seat Now', onPress: () => setWaitlist(prev => prev.filter(g => g.id !== id)) },
    ]);
  };

  const removeGuest = (id: string) => {
    Alert.alert('Remove from Waitlist?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setWaitlist(prev => prev.filter(g => g.id !== id)) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Waitlist</Text>
          <Text style={styles.subtitle}>{waitlist.length} group{waitlist.length !== 1 ? 's' : ''} waiting</Text>
        </View>
        <Pressable style={[styles.addBtn, Shadows.sm]} onPress={() => setShowForm(!showForm)}>
          <Ionicons name={showForm ? 'close' : 'add'} size={20} color={Colors.textInverse} />
        </Pressable>
      </View>

      {/* Add guest form */}
      {showForm && (
        <View style={[styles.form, Shadows.sm]}>
          <Text style={styles.formTitle}>Add to Waitlist</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={16} color={Colors.textTertiary} />
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Guest Name" placeholderTextColor={Colors.textTertiary} />
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={16} color={Colors.textTertiary} />
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone Number" placeholderTextColor={Colors.textTertiary} keyboardType="phone-pad" />
          </View>
          <View style={styles.partySizeRow}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <Pressable
                key={n}
                style={[styles.sizeBtn, partySize === String(n) && styles.sizeBtnActive]}
                onPress={() => setPartySize(String(n))}
              >
                <Text style={[styles.sizeBtnText, partySize === String(n) && styles.sizeBtnTextActive]}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.submitBtn, Shadows.accent]} onPress={addGuest}>
            <Text style={styles.submitBtnText}>Add to Waitlist</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={waitlist}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View style={[styles.guestCard, Shadows.sm]}>
            {/* Position number */}
            <View style={styles.position}>
              <Text style={styles.positionNum}>{index + 1}</Text>
            </View>

            <View style={styles.guestInfo}>
              <Text style={styles.guestName}>{item.name}</Text>
              <Text style={styles.guestMeta}>{item.phone} · {item.partySize} guests</Text>
              <View style={styles.waitChip}>
                <Ionicons name="time-outline" size={12} color={Colors.warning} />
                <Text style={styles.waitText}>Waiting since {item.addedAt} · ~{item.waitMins} min</Text>
              </View>
            </View>

            <View style={styles.guestActions}>
              <Pressable
                style={[styles.seatBtn, Shadows.sm]}
                onPress={() => seatGuest(item.id)}
              >
                <Ionicons name="restaurant" size={14} color="#fff" />
                <Text style={styles.seatBtnText}>Seat</Text>
              </Pressable>
              <Pressable
                style={styles.removeBtn}
                onPress={() => removeGuest(item.id)}
              >
                <Ionicons name="close-circle-outline" size={22} color={Colors.error} />
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>Waitlist is empty!</Text>
            <Text style={styles.emptySubtext}>All guests are seated.</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 80 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, paddingBottom: Spacing.md,
  },
  title: { ...Typography.heading, color: Colors.textPrimary },
  subtitle: { ...Typography.bodySmall, color: Colors.textSecondary },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  form: {
    backgroundColor: Colors.surface, margin: Spacing.lg, marginTop: 0,
    borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  formTitle: { ...Typography.subheading, color: Colors.textPrimary },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  input: { flex: 1, ...Typography.body, color: Colors.textPrimary },
  partySizeRow: { flexDirection: 'row', gap: Spacing.sm },
  sizeBtn: {
    width: 40, height: 40, borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  sizeBtnActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  sizeBtnText: { ...Typography.body, color: Colors.textSecondary, fontWeight: '700' },
  sizeBtnTextActive: { color: Colors.accent },
  submitBtn: {
    backgroundColor: Colors.accent, borderRadius: Radius.md,
    alignItems: 'center', paddingVertical: Spacing.md,
  },
  submitBtnText: { ...Typography.subheading, color: Colors.textInverse, fontWeight: '700' },
  list: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  guestCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  position: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentDim,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  positionNum: { fontSize: 16, fontWeight: '700', color: Colors.accent },
  guestInfo: { flex: 1, gap: 4, flexShrink: 1 },
  guestName: { ...Typography.subheading, color: Colors.textPrimary },
  guestMeta: { ...Typography.bodySmall, color: Colors.textSecondary },
  waitChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  waitText: { ...Typography.caption, color: Colors.warning },
  guestActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  seatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.confirmed, borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  seatBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  removeBtn: { padding: 4 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...Typography.subheading, color: Colors.textPrimary },
  emptySubtext: { ...Typography.body, color: Colors.textTertiary },
});
