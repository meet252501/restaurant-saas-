import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, SafeAreaView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc, RESTAURANT_ID } from '../lib/trpc';
import { TableCard } from '../components/TableCard';
import { useSaaSStore } from '../lib/saas-store';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';

import * as WebBrowser from 'expo-web-browser';



type Step = 1 | 2 | 3;

interface BookingForm {
  name: string;
  phone: string;
  partySize: string;
  notes: string;
  date: string;
  time: string;
  tableId: string;
}

// {appName} Restaurant - 8 real tables
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
const TIME_SLOTS = [
  // Lunch
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
  // Dinner
  '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

export default function NewBookingScreen() {
  const router = useRouter();
  const appName = useSaaSStore(s => s.appName);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<BookingForm>({
    name: '', phone: '', partySize: '2', notes: '',
    date: new Date().toISOString().split('T')[0], time: '19:00', tableId: '',
  });

  // Computed properties
  const partySz = parseInt(form.partySize, 10) || 1;
  const availableTables = MOCK_TABLES.filter(t => t.status === 'available' && t.capacity >= partySz);
  const recommendedTableId = availableTables.length > 0
    ? availableTables.reduce((best, t) => t.capacity < best.capacity ? t : best, availableTables[0]).id
    : '';
  const selectedTable = MOCK_TABLES.find(t => t.id === form.tableId);

  const set = (key: keyof BookingForm) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const validateStep1 = () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Please enter guest name.'); return false; }
    if (!form.phone.trim() || form.phone.length < 8) { Alert.alert('Required', 'Please enter a valid phone number.'); return false; }
    const sz = parseInt(form.partySize, 10);
    if (isNaN(sz) || sz < 1 || sz > 8) { Alert.alert('Invalid', 'Party size must be 1–8.'); return false; }
    return true;
  };
  const validateStep2 = () => {
    if (!form.tableId) { Alert.alert('Required', 'Please select a table.'); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3) handleSubmit();
  };

  const createMutation = trpc.booking.create.useMutation({
    onSuccess: (data: any) => {
      if (data.requiresDeposit && data.depositUrl) {
         if (typeof window !== 'undefined') {
           window.alert(`Deposit Required: A deposit is required to secure this large table.`);
           WebBrowser.openBrowserAsync(data.depositUrl).then(() => router.replace('/(tabs)/bookings'));
         } else {
           Alert.alert(
             'Deposit Required 💳',
             `Your party size is ${data.partySize}. A deposit is required.`,
             [{ text: 'Pay Deposit', onPress: async () => {
                 await WebBrowser.openBrowserAsync(data.depositUrl);
                 router.replace('/(tabs)/bookings');
               }
             }]
           );
         }
      } else {
        if (typeof window !== 'undefined') {
          window.alert(`✅ Booking Confirmed! Reservation for ${form.name} on ${form.date} has been created.`);
          router.replace('/(tabs)/bookings');
        } else {
          Alert.alert(
            '✅ Booking Confirmed!',
            `Reservation for ${form.name} on ${form.date} at ${form.time} has been created.`,
            [{ text: 'Done', onPress: () => router.replace('/(tabs)/bookings') }],
          );
        }
      }
    },
    onError: (err) => {
      if (typeof window !== 'undefined') {
        window.alert('Error: ' + err.message);
      } else {
        Alert.alert('Error', err.message);
      }
    }
  });

  const handleSubmit = () => {
    createMutation.mutate({
      restaurantId: RESTAURANT_ID,
      customerName: form.name?.trim(),
      customerPhone: form.phone?.trim()?.replace(/[\s-]/g, ''),
      partySize: parseInt(form.partySize, 10),
      tableId: form.tableId,
      bookingDate: form.date,
      bookingTime: form.time,
      notes: form.notes?.trim(),
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Progress bar */}
      <View style={styles.progressRow}>
        {([1, 2, 3] as Step[]).map(s => (
          <View key={s} style={styles.progressItem}>
            <View style={[styles.progressDot, step >= s && styles.progressDotActive]}>
              {step > s
                ? <Ionicons name="checkmark" size={12} color="#fff" />
                : <Text style={[styles.progressNum, step >= s && styles.progressNumActive]}>{s}</Text>}
            </View>
            <Text style={[styles.progressLabel, step >= s && styles.progressLabelActive]}>
              {s === 1 ? 'Guest Info' : s === 2 ? 'Select Table' : 'Confirm'}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── STEP 1 ── */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Guest Information</Text>

            <InputField label="Guest Name *" value={form.name} onChangeText={set('name')} placeholder="e.g. Raj Patel" icon="person-outline" />
            <InputField label="Phone Number *" value={form.phone} onChangeText={set('phone')} placeholder="+91 9999999999" icon="call-outline" keyboardType="phone-pad" />

            <Text style={styles.fieldLabel}>Party Size (1–8) *</Text>
            <View style={styles.partySizeRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <Pressable
                  key={n}
                  style={[styles.sizeBtn, form.partySize === String(n) && styles.sizeBtnActive]}
                  onPress={() => set('partySize')(String(n))}
                >
                  <Text style={[styles.sizeBtnText, form.partySize === String(n) && styles.sizeBtnTextActive]}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Date *</Text>
            <InputField label="" value={form.date} onChangeText={set('date')} placeholder="YYYY-MM-DD" icon="calendar-outline" />

            <Text style={styles.fieldLabel}>Time Slot *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.timeSlots}>
                {TIME_SLOTS.map(t => (
                  <Pressable
                    key={t}
                    style={[styles.timeChip, form.time === t && styles.timeChipActive]}
                    onPress={() => set('time')(t)}
                  >
                    <Text style={[styles.timeChipText, form.time === t && styles.timeChipTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <InputField label="Special Requests" value={form.notes} onChangeText={set('notes')} placeholder="Allergies, occasion, seating preference..." icon="chatbubble-outline" multiline />
          </View>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Table</Text>
            <Text style={styles.stepSub}>Party of {form.partySize} · {availableTables.length} tables available</Text>

            {/* AI recommendation */}
            {recommendedTableId && (
              <View style={styles.aiHint}>
                <Text style={{ fontSize: 16 }}>🤖</Text>
                <Text style={styles.aiHintText}>
                  AI recommends Table {MOCK_TABLES.find(t => t.id === recommendedTableId)?.tableNumber} — best fit for your party size.
                </Text>
              </View>
            )}

            <View style={styles.tableGrid}>
              {MOCK_TABLES.map(table => (
                <View key={table.id} style={[
                  styles.tableWrap,
                  form.tableId === table.id && styles.tableWrapSelected,
                  table.status !== 'available' && styles.tableWrapDisabled,
                ]}>
                  <TableCard
                    table={{ ...table, status: form.tableId === table.id ? 'available' : table.status }}
                    recommended={table.id === recommendedTableId}
                    onPress={() => table.status === 'available' && set('tableId')(table.id)}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Confirm Booking</Text>
            <Text style={styles.stepSub}>We look forward to hosting you at {appName}!</Text>

            <View style={styles.summaryCard}>
              <SummaryRow icon="person-outline" label="Guest" value={form.name} />
              <SummaryRow icon="call-outline" label="Phone" value={form.phone} />
              <SummaryRow icon="people-outline" label="Party Size" value={`${form.partySize} guests`} />
              <SummaryRow icon="calendar-outline" label="Date" value={form.date} />
              <SummaryRow icon="time-outline" label="Time" value={form.time} />
              <SummaryRow icon="restaurant-outline" label="Table" value={selectedTable ? `Table ${selectedTable.tableNumber} (${selectedTable.capacity} seats)` : 'Not selected'} />
              {form.notes ? <SummaryRow icon="chatbubble-outline" label="Notes" value={form.notes} /> : null}
            </View>

            <View style={styles.confirmNote}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
              <Text style={styles.confirmNoteText}>
                After confirming, you can send the guest a WhatsApp message, SMS, or call them directly from the booking detail screen.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.footer}>
        {step > 1 && (
          <Pressable style={styles.backBtn} onPress={() => setStep(s => (s - 1) as Step)}>
            <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.nextBtn, 
            Shadows.accent, 
            { flex: step > 1 ? 0.7 : 1 },
            createMutation.isPending && { opacity: 0.7 }
          ]}
          onPress={handleNext}
          disabled={createMutation.isPending}
        >
          <Text style={styles.nextBtnText}>
            {step === 3 ? (createMutation.isPending ? 'Creating...' : '✅ Confirm Booking') : 'Continue'}
          </Text>
          {step < 3 && <Ionicons name="chevron-forward" size={18} color={Colors.textInverse} />}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function InputField({
  label, value, onChangeText, placeholder, icon, keyboardType, multiline,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; icon?: any; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        {icon && <Ionicons name={icon} size={18} color={Colors.textTertiary} />}
        <TextInput
          style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
        />
      </View>
    </View>
  );
}

function SummaryRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={16} color={Colors.textSecondary} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  progressRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  progressItem: { alignItems: 'center', gap: 6 },
  progressDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.surfaceBorder,
  },
  progressDotActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  progressNum: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary },
  progressNumActive: { color: '#fff' },
  progressLabel: { ...Typography.caption, color: Colors.textTertiary },
  progressLabelActive: { color: Colors.accent },
  content: { padding: Spacing.lg, paddingBottom: 60, gap: Spacing.lg },
  stepContainer: { gap: Spacing.lg },
  stepTitle: { ...Typography.heading, color: Colors.textPrimary },
  stepSub: { ...Typography.body, color: Colors.textSecondary },
  fieldWrap: { gap: Spacing.xs },
  fieldLabel: { ...Typography.bodySmall, color: Colors.textSecondary, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  input: { flex: 1, ...Typography.body, color: Colors.textPrimary },
  partySizeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  sizeBtn: {
    width: 48, height: 48, borderRadius: Radius.md,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.surfaceBorder,
  },
  sizeBtnActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  sizeBtnText: { ...Typography.subheading, color: Colors.textSecondary },
  sizeBtnTextActive: { color: Colors.accent },
  timeSlots: { flexDirection: 'row', gap: Spacing.sm },
  timeChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  timeChipActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  timeChipText: { ...Typography.bodySmall, color: Colors.textSecondary, fontWeight: '600' },
  timeChipTextActive: { color: Colors.accent },
  aiHint: {
    flexDirection: 'row', gap: Spacing.sm,
    backgroundColor: Colors.aiDim, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.ai + '30',
    alignItems: 'flex-start',
  },
  aiHintText: { ...Typography.bodySmall, color: Colors.ai, flex: 1, lineHeight: 20 },
  tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tableWrap: { borderRadius: Radius.lg, overflow: 'hidden' },
  tableWrapSelected: {
    borderWidth: 2, borderColor: Colors.accent, borderRadius: Radius.lg,
  },
  tableWrapDisabled: { opacity: 0.4 },
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  summaryLabel: { ...Typography.bodySmall, color: Colors.textSecondary, width: 80 },
  summaryValue: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  confirmNote: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: Colors.pendingDim, borderRadius: Radius.md, padding: Spacing.md,
  },
  confirmNoteText: { ...Typography.bodySmall, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
  footer: {
    flexDirection: 'row', gap: Spacing.sm,
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    flex: 0.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
    paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  backBtnText: { ...Typography.body, color: Colors.textSecondary },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: Spacing.md,
  },
  nextBtnText: { ...Typography.subheading, color: Colors.textInverse, fontWeight: '700' },
});
