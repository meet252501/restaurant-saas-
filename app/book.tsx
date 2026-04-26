/**
 * /book — Public Customer Booking Page
 * Accessible via QR code or shared link. No login required.
 * Mobile-first. After submission it shows confirmation + WhatsApp notice.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable,
  StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { trpc, RESTAURANT_ID } from '../lib/trpc';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// ── Minimal design tokens (no theme import to keep it public-safe) ──────
const PRIMARY  = '#10b981'; // emerald
const BG       = '#ffffff';
const SURFACE  = '#f8fafb';
const BORDER   = '#e5e7eb';
const TEXT     = '#111827';
const MUTED    = '#6b7280';
const RED      = '#ef4444';

// ── Helpers ────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

const PARTY_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

// ─────────────────────────────────────────────────────────────────────────
export default function PublicBookingPage() {
  const router = useRouter();

  // Step 1 = pick date/party, Step 2 = pick time, Step 3 = guest details, Step 4 = success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form state
  const [date, setDate]         = useState(todayStr());
  const [partySize, setParty]   = useState(2);
  const [time, setTime]         = useState('');
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [notes, setNotes]       = useState('');
  const [occasion, setOccasion] = useState<string>('');

  const [error, setError] = useState('');

  // Fetch restaurant info
  const { data: restaurant } = trpc.restaurant.info.useQuery();

  // Fetch available time slots (step 2)
  const { data: slots = [], isFetching: loadingSlots } = trpc.booking.getAvailableSlots.useQuery(
    { restaurantId: RESTAURANT_ID, date, partySize },
    { enabled: step === 2 }
  );

  // Create booking mutation
  const createBooking = trpc.booking.create.useMutation({
    onSuccess: () => setStep(4),
    onError: (e) => setError(e.message),
  });

  const restaurantName = restaurant?.name || 'Our Restaurant';

  // ── Step renderers ─────────────────────────────────────────────────
  function renderStep1() {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📅 When are you coming?</Text>

        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={MUTED}
        />

        <Text style={styles.label}>Party Size</Text>
        <View style={styles.pillRow}>
          {PARTY_OPTIONS.map(n => (
            <Pressable
              key={n}
              style={[styles.pill, partySize === n && styles.pillActive]}
              onPress={() => setParty(n)}
            >
              <Text style={[styles.pillText, partySize === n && styles.pillActiveText]}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.nextBtn} onPress={() => setStep(2)}>
          <Text style={styles.nextBtnText}>See Available Times →</Text>
        </Pressable>
      </View>
    );
  }

  function renderStep2() {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⏰ Pick a Time</Text>
        <Text style={styles.subText}>{date} · {partySize} guests</Text>

        {loadingSlots ? (
          <ActivityIndicator color={PRIMARY} style={{ marginVertical: 32 }} />
        ) : slots.length === 0 ? (
          <View style={styles.noSlots}>
            <Text style={styles.noSlotsText}>😔 No tables available for {partySize} guests on this date.</Text>
            <Pressable onPress={() => setStep(1)} style={styles.backLink}>
              <Text style={styles.backLinkText}>Try a different date</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.slotGrid}>
            {slots.map((s: string) => (
              <Pressable
                key={s}
                style={[styles.slotPill, time === s && styles.slotPillActive]}
                onPress={() => setTime(s)}
              >
                <Text style={[styles.slotText, time === s && styles.slotActiveText]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {time !== '' && (
          <Pressable style={styles.nextBtn} onPress={() => setStep(3)}>
            <Text style={styles.nextBtnText}>Continue with {time} →</Text>
          </Pressable>
        )}

        <Pressable onPress={() => setStep(1)} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Change date/party</Text>
        </Pressable>
      </View>
    );
  }

  function renderStep3() {
    const OCCASIONS = ['None', 'Birthday 🎂', 'Anniversary 💑', 'Celebration 🎉', 'Business 💼'];

    const handleSubmit = () => {
      setError('');
      if (!name.trim()) { setError('Please enter your name.'); return; }
      if (!phone.trim()) { setError('Please enter your phone number.'); return; }

      createBooking.mutate({
        restaurantId: RESTAURANT_ID,
        customerName: name.trim(),
        customerPhone: phone.trim().replace(/\s/g, ''),
        bookingDate: date,
        bookingTime: time,
        partySize,
        source: 'online',
        occasion: (occasion && occasion !== 'None') ? (occasion.split(' ')[0].toLowerCase() as any) : undefined,
        notes: notes.trim() || undefined,
      });
    };

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👤 Your Details</Text>
        <Text style={styles.subText}>{date} · {time} · {partySize} guests</Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName}
          placeholder="e.g. Priya Sharma" placeholderTextColor={MUTED} />

        <Text style={styles.label}>WhatsApp / Phone *</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone}
          placeholder="+91 9876543210" placeholderTextColor={MUTED}
          keyboardType="phone-pad" />

        <Text style={styles.label}>Occasion</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={styles.pillRow}>
            {OCCASIONS.map(o => (
              <Pressable key={o} style={[styles.pill, occasion === o && styles.pillActive]}
                onPress={() => setOccasion(o)}>
                <Text style={[styles.pillText, occasion === o && styles.pillActiveText]}>{o}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.label}>Special Requests (optional)</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          value={notes} onChangeText={setNotes}
          placeholder="Allergies, high chair, window seat..." placeholderTextColor={MUTED}
          multiline />

        {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

        <Pressable
          style={[styles.nextBtn, createBooking.isPending && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={createBooking.isPending}
        >
          {createBooking.isPending
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextBtnText}>✅ Confirm Booking</Text>
          }
        </Pressable>

        <Text style={styles.waNote}>📱 You will receive a WhatsApp confirmation on {phone || 'your number'}.</Text>

        <Pressable onPress={() => setStep(2)} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Change time</Text>
        </Pressable>
      </View>
    );
  }

  function renderStep4() {
    return (
      <View style={[styles.card, { alignItems: 'center', paddingVertical: 48 }]}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>🎉</Text>
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successSub}>
          Hi {name}! Your table for {partySize} is booked for{'\n'}
          <Text style={{ fontWeight: '700', color: TEXT }}>{date} at {time}</Text>
        </Text>
        <View style={styles.waBox}>
          <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
          <Text style={styles.waBoxText}>
            A WhatsApp confirmation has been sent to {phone}. You&apos;ll also get a reminder 2 hours before!
          </Text>
        </View>
        <Pressable style={styles.nextBtn} onPress={() => {
          setStep(1); setName(''); setPhone(''); setTime(''); setNotes(''); setOccasion('');
        }}>
          <Text style={styles.nextBtnText}>Book Another Table</Text>
        </Pressable>
      </View>
    );
  }

  // ── Progress bar ───────────────────────────────────────────────────
  const progress = (step / 4) * 100;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* Restaurant header */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Ionicons name="restaurant" size={28} color={PRIMARY} />
            </View>
            <Text style={styles.restaurantName}>{restaurantName}</Text>
            <Text style={styles.restaurantSub}>Reserve Your Table</Text>
          </View>

          {/* Progress bar */}
          {step < 4 && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
            </View>
          )}

          {/* Step label */}
          {step < 4 && (
            <Text style={styles.stepLabel}>Step {step} of 3</Text>
          )}

          {/* Step content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {/* Footer */}
          <Text style={styles.footer}>Powered by TableBook · {restaurantName}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { padding: 20, paddingBottom: 60 },
  header: { alignItems: 'center', marginBottom: 24, gap: 8 },
  logo: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#ecfdf5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  restaurantName: { fontSize: 24, fontWeight: '900', color: TEXT, letterSpacing: -0.5 },
  restaurantSub: { fontSize: 14, color: MUTED },
  progressTrack: { height: 4, backgroundColor: BORDER, borderRadius: 2, marginBottom: 8 },
  progressFill: { height: 4, backgroundColor: PRIMARY, borderRadius: 2 },
  stepLabel: { fontSize: 12, color: MUTED, textAlign: 'center', marginBottom: 16 },
  card: {
    backgroundColor: SURFACE, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: BORDER, marginBottom: 16, gap: 12,
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: TEXT },
  subText: { fontSize: 13, color: MUTED, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, color: TEXT,
    borderWidth: 1, borderColor: BORDER,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#fff',
  },
  pillActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  pillText: { fontSize: 14, fontWeight: '600', color: TEXT },
  pillActiveText: { color: '#fff' },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotPill: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#fff',
  },
  slotPillActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  slotText: { fontSize: 15, fontWeight: '700', color: TEXT },
  slotActiveText: { color: '#fff' },
  noSlots: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  noSlotsText: { fontSize: 15, color: MUTED, textAlign: 'center', lineHeight: 22 },
  nextBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    marginTop: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backLinkText: { color: PRIMARY, fontSize: 14, fontWeight: '600' },
  errorText: { color: RED, fontSize: 14, fontWeight: '600' },
  waNote: { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18 },
  successTitle: { fontSize: 28, fontWeight: '900', color: TEXT, textAlign: 'center' },
  successSub: { fontSize: 16, color: MUTED, textAlign: 'center', lineHeight: 24 },
  waBox: {
    flexDirection: 'row', gap: 12, backgroundColor: '#f0fdf4',
    borderRadius: 12, padding: 16, alignItems: 'flex-start',
    borderWidth: 1, borderColor: '#bbf7d0', marginVertical: 8,
  },
  waBoxText: { flex: 1, fontSize: 13, color: TEXT, lineHeight: 20 },
  footer: { textAlign: 'center', fontSize: 11, color: BORDER, marginTop: 32 },
});
