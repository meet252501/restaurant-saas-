import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';

// ─── Types ───────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;

interface RestaurantForm {
  // Step 1 — Identity
  name:        string;
  slug:        string;
  cuisineType: string;
  email:       string;
  phone:       string;
  whatsapp:    string;
  // Step 2 — Location
  address:     string;
  city:        string;
  pincode:     string;
  googleMaps:  string;
  instagram:   string;
  gstNumber:   string;
  // Step 3 — Setup
  tableCount:  string;
  tableCapacity: string;
  pinCode:     string;
  openingHour: string;
  closingHour: string;
}

const CUISINE_OPTIONS = [
  'North Indian', 'South Indian', 'Chinese', 'Continental',
  'Italian', 'Fast Food', 'Cafe', 'Multi-Cuisine', 'Seafood', 'Biryani',
];

const STEP_TITLES = ['Restaurant Identity', 'Location & Social', 'Initial Setup'];
const STEP_ICONS  = ['restaurant-outline', 'location-outline', 'settings-outline'];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminSetupScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [createdRestaurantId, setCreatedRestaurantId] = useState('');

  const [form, setForm] = useState<RestaurantForm>({
    name: '', slug: '', cuisineType: '', email: '', phone: '', whatsapp: '',
    address: '', city: '', pincode: '', googleMaps: '', instagram: '', gstNumber: '',
    tableCount: '8', tableCapacity: '4', pinCode: '1234',
    openingHour: '11:00', closingHour: '23:00',
  });

  const set = (key: keyof RestaurantForm) => (val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    setForm(f => ({
      ...f,
      name: val,
      slug: val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    }));
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!form.name.trim()) { showAlert('Restaurant name is required.'); return false; }
    if (!form.email.trim() || !form.email.includes('@')) { showAlert('Valid email is required.'); return false; }
    if (!form.phone.trim() || form.phone.length < 8) { showAlert('Valid phone number is required.'); return false; }
    if (!form.cuisineType) { showAlert('Please select a cuisine type.'); return false; }
    return true;
  };
  const validateStep2 = () => {
    if (!form.address.trim()) { showAlert('Address is required.'); return false; }
    if (!form.city.trim()) { showAlert('City is required.'); return false; }
    return true;
  };
  const validateStep3 = () => {
    const tc = parseInt(form.tableCount, 10);
    if (isNaN(tc) || tc < 1 || tc > 100) { showAlert('Table count must be 1–100.'); return false; }
    if (!form.pinCode || form.pinCode.length !== 4 || !/^\d+$/.test(form.pinCode)) {
      showAlert('POS PIN must be exactly 4 digits.'); return false;
    }
    return true;
  };

  const showAlert = (msg: string) => {
    if (typeof window !== 'undefined') window.alert(msg);
    else Alert.alert('Required', msg);
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) handleSubmit();
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const restaurantId = `res_${Date.now()}`;

    // Simulate API call (replace with actual tRPC mutation when restaurant.create is available)
    await new Promise(r => setTimeout(r, 1500));

    const payload = {
      id: restaurantId,
      slug: form.slug || restaurantId,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      whatsappNumber: form.whatsapp.trim() || form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      pincode: form.pincode.trim(),
      cuisineType: form.cuisineType,
      gstNumber: form.gstNumber.trim(),
      instagramUrl: form.instagram.trim(),
      googleMapsUrl: form.googleMaps.trim(),
      pinCode: form.pinCode,
      openingHours: JSON.stringify({ open: form.openingHour, close: form.closingHour }),
      tableCount: parseInt(form.tableCount, 10),
      tableCapacity: parseInt(form.tableCapacity, 10),
      createdAt: new Date().toISOString(),
    };

    console.log('[SuperAdmin] New restaurant payload:', JSON.stringify(payload, null, 2));

    setIsLoading(false);
    setCreatedRestaurantId(restaurantId);
    setDone(true);
  };

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }]}>
        <View style={styles.successCard}>
          <Text style={{ fontSize: 60, textAlign: 'center' }}>🎊</Text>
          <Text style={styles.successTitle}>Restaurant Created!</Text>
          <Text style={styles.successSub}>{form.name} is ready to accept bookings.</Text>

          <View style={styles.idBox}>
            <Ionicons name="key-outline" size={14} color={Colors.textTertiary} />
            <Text style={styles.idLabel}>Restaurant ID</Text>
            <Text style={styles.idValue}>{createdRestaurantId}</Text>
          </View>

          <View style={styles.successSteps}>
            {[
              { icon: 'people-outline',     label: 'Add staff members via Staff Dashboard' },
              { icon: 'restaurant-outline', label: `${form.tableCount} tables auto-created` },
              { icon: 'lock-closed-outline',label: `POS PIN set to ${form.pinCode}` },
              { icon: 'phone-portrait-outline', label: 'Share the app link with the manager' },
            ].map((s, i) => (
              <View key={i} style={styles.successStep}>
                <View style={styles.successStepDot}>
                  <Ionicons name={s.icon as any} size={14} color={Colors.accent} />
                </View>
                <Text style={styles.successStepText}>{s.label}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.doneBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.doneBtnText}>Go to Dashboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => step > 1 ? setStep(s => (s - 1) as Step) : router.back()}>
          <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>New Restaurant</Text>
          <Text style={styles.headerSub}>Super Admin · Step {step} of 3</Text>
        </View>
        <View style={[styles.adminBadge]}>
          <Ionicons name="shield-checkmark" size={12} color="#7c3aed" />
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* Step Progress */}
      <View style={styles.progressRow}>
        {([1, 2, 3] as Step[]).map(s => (
          <View key={s} style={styles.progressItem}>
            <View style={[styles.progressDot, step >= s && styles.progressDotActive, step > s && styles.progressDotDone]}>
              {step > s
                ? <Ionicons name="checkmark" size={12} color="#fff" />
                : <Ionicons name={STEP_ICONS[s - 1] as any} size={12} color={step >= s ? '#fff' : Colors.textTertiary} />
              }
            </View>
            <Text style={[styles.progressLabel, step >= s && styles.progressLabelActive]}>
              {STEP_TITLES[s - 1]}
            </Text>
            {s < 3 && <View style={[styles.progressLine, step > s && styles.progressLineActive]} />}
          </View>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── STEP 1: Identity ─────────────────────────────────────────── */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <SectionHeader icon="restaurant-outline" title="Restaurant Identity" />

            <Field label="Restaurant Name *">
              <InputRow icon="storefront-outline" value={form.name} onChangeText={handleNameChange} placeholder="e.g. Spice Garden" />
            </Field>

            <Field label="URL Slug (auto-generated)">
              <InputRow icon="link-outline" value={form.slug} onChangeText={set('slug')} placeholder="spice-garden" />
            </Field>

            <Field label="Cuisine Type *">
              <View style={styles.chipGrid}>
                {CUISINE_OPTIONS.map(c => (
                  <Pressable
                    key={c}
                    style={[styles.chip, form.cuisineType === c && styles.chipActive]}
                    onPress={() => set('cuisineType')(c)}
                  >
                    <Text style={[styles.chipText, form.cuisineType === c && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            <Field label="Owner Email *">
              <InputRow icon="mail-outline" value={form.email} onChangeText={set('email')} placeholder="owner@restaurant.com" keyboardType="email-address" />
            </Field>

            <Field label="Phone Number *">
              <InputRow icon="call-outline" value={form.phone} onChangeText={set('phone')} placeholder="+91 9999999999" keyboardType="phone-pad" />
            </Field>

            <Field label="WhatsApp Number">
              <InputRow icon="logo-whatsapp" value={form.whatsapp} onChangeText={set('whatsapp')} placeholder="Same as phone if blank" keyboardType="phone-pad" />
            </Field>
          </View>
        )}

        {/* ── STEP 2: Location ─────────────────────────────────────────── */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <SectionHeader icon="location-outline" title="Location & Social" />

            <Field label="Full Address *">
              <InputRow icon="map-outline" value={form.address} onChangeText={set('address')} placeholder="123 MG Road, Sector 5" multiline />
            </Field>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="City *">
                  <InputRow icon="business-outline" value={form.city} onChangeText={set('city')} placeholder="Mumbai" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Pincode">
                  <InputRow icon="pin-outline" value={form.pincode} onChangeText={set('pincode')} placeholder="400001" keyboardType="number-pad" />
                </Field>
              </View>
            </View>

            <Field label="Google Maps URL">
              <InputRow icon="navigate-outline" value={form.googleMaps} onChangeText={set('googleMaps')} placeholder="https://maps.google.com/..." />
            </Field>

            <Field label="Instagram Handle">
              <InputRow icon="logo-instagram" value={form.instagram} onChangeText={set('instagram')} placeholder="@spicegarden" />
            </Field>

            <Field label="GST Number">
              <InputRow icon="document-text-outline" value={form.gstNumber} onChangeText={set('gstNumber')} placeholder="27AABCU9603R1ZX" />
            </Field>
          </View>
        )}

        {/* ── STEP 3: Setup ─────────────────────────────────────────────── */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <SectionHeader icon="settings-outline" title="Initial Setup" />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Field label="Number of Tables">
                  <InputRow icon="grid-outline" value={form.tableCount} onChangeText={set('tableCount')} placeholder="8" keyboardType="number-pad" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Default Capacity">
                  <InputRow icon="people-outline" value={form.tableCapacity} onChangeText={set('tableCapacity')} placeholder="4" keyboardType="number-pad" />
                </Field>
              </View>
            </View>

            <Field label="Opening Hours">
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <InputRow icon="sunny-outline" value={form.openingHour} onChangeText={set('openingHour')} placeholder="11:00" />
                </View>
                <View style={{ flex: 1 }}>
                  <InputRow icon="moon-outline" value={form.closingHour} onChangeText={set('closingHour')} placeholder="23:00" />
                </View>
              </View>
            </Field>

            <Field label="POS PIN Code (4 digits) *">
              <InputRow icon="keypad-outline" value={form.pinCode} onChangeText={set('pinCode')} placeholder="1234" keyboardType="number-pad" />
            </Field>

            {/* Summary preview */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Review Before Creating</Text>
              {[
                { icon: 'restaurant-outline', label: 'Name',    val: form.name    || '—' },
                { icon: 'pizza-outline',      label: 'Cuisine', val: form.cuisineType || '—' },
                { icon: 'location-outline',   label: 'City',    val: form.city    || '—' },
                { icon: 'grid-outline',       label: 'Tables',  val: `${form.tableCount} × ${form.tableCapacity} seats` },
                { icon: 'time-outline',       label: 'Hours',   val: `${form.openingHour} – ${form.closingHour}` },
                { icon: 'lock-closed-outline',label: 'PIN',     val: `****` },
              ].map((r, i) => (
                <View key={i} style={styles.summaryRow}>
                  <Ionicons name={r.icon as any} size={15} color={Colors.textTertiary} />
                  <Text style={styles.summaryLabel}>{r.label}</Text>
                  <Text style={styles.summaryVal}>{r.val}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.nextBtn, isLoading && { opacity: 0.65 }]}
          onPress={handleNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.nextBtnText}>Creating Restaurant…</Text>
            </>
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {step === 3 ? '🚀 Create Restaurant' : 'Continue'}
              </Text>
              {step < 3 && <Ionicons name="chevron-forward" size={18} color="#fff" />}
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: any; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconBox}>
        <Ionicons name={icon} size={18} color={Colors.accent} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function InputRow({
  icon, value, onChangeText, placeholder, keyboardType, multiline,
}: {
  icon: any; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={[styles.inputRow, multiline && { alignItems: 'flex-start' }]}>
      <Ionicons name={icon} size={17} color={Colors.textTertiary} style={multiline ? { marginTop: 3 } : {}} />
      <TextInput
        style={[styles.input, multiline && { height: 68, textAlignVertical: 'top' }]}
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

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  headerTitle: { ...Typography.subheading, color: Colors.textPrimary, fontWeight: '700' },
  headerSub:   { ...Typography.caption,    color: Colors.textTertiary },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ede9fe', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  adminBadgeText: { fontSize: 10, fontWeight: '800', color: '#7c3aed', letterSpacing: 0.8 },

  // Step progress
  progressRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
    gap: 0,
  },
  progressItem: { flex: 1, alignItems: 'center', gap: 4, position: 'relative' },
  progressDot: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.surfaceBorder,
  },
  progressDotActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  progressDotDone:   { backgroundColor: '#22c55e',     borderColor: '#22c55e' },
  progressLabel:       { ...Typography.caption, color: Colors.textTertiary, textAlign: 'center', fontSize: 9 },
  progressLabelActive: { color: Colors.accent },
  progressLine: {
    position: 'absolute' as any, top: 15, left: '50%', right: '-50%',
    height: 2, backgroundColor: Colors.surfaceBorder,
  },
  progressLineActive: { backgroundColor: '#22c55e' },

  // Content
  content: { padding: Spacing.lg, gap: Spacing.lg },
  stepContainer: { gap: Spacing.lg },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  sectionIconBox: {
    width: 34, height: 34, borderRadius: Radius.md,
    backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { ...Typography.subheading, color: Colors.textPrimary, fontWeight: '700' },

  row2: { flexDirection: 'row', gap: Spacing.sm },

  fieldWrap: { gap: Spacing.xs },
  fieldLabel: { ...Typography.bodySmall, color: Colors.textSecondary, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  input: { flex: 1, ...Typography.body, color: Colors.textPrimary },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1.5,
    backgroundColor: Colors.surface, borderColor: Colors.surfaceBorder,
  },
  chipActive:     { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  chipText:       { ...Typography.bodySmall, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: Colors.accent, fontWeight: '700' },

  // Summary
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: Spacing.lg, gap: Spacing.sm,
  },
  summaryTitle: { ...Typography.subheading, color: Colors.textPrimary, fontWeight: '700', marginBottom: Spacing.xs },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  summaryLabel: { ...Typography.bodySmall, color: Colors.textTertiary, width: 60 },
  summaryVal:   { ...Typography.bodySmall, color: Colors.textPrimary, fontWeight: '600', flex: 1 },

  // Footer
  footer: {
    padding: Spacing.lg, paddingBottom: Spacing.xl,
    borderTopWidth: 1, borderTopColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.accent, borderRadius: Radius.lg, paddingVertical: 16,
    ...Shadows.accent,
  },
  nextBtnText: { ...Typography.subheading, color: '#fff', fontWeight: '800', fontSize: 16 },

  // Success
  successCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    padding: Spacing.xl, gap: Spacing.md, alignItems: 'center', width: '100%',
  },
  successTitle: { ...Typography.heading, color: Colors.textPrimary, fontWeight: '800', textAlign: 'center' },
  successSub:   { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  idBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder, alignSelf: 'stretch',
  },
  idLabel: { ...Typography.caption, color: Colors.textTertiary, marginRight: 4 },
  idValue: { ...Typography.caption, color: Colors.accent, fontFamily: 'monospace', flex: 1 },
  successSteps: { gap: Spacing.sm, alignSelf: 'stretch' },
  successStep: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  successStepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center',
  },
  successStepText: { ...Typography.bodySmall, color: Colors.textSecondary, flex: 1 },
  doneBtn: {
    alignSelf: 'stretch', backgroundColor: Colors.accent,
    borderRadius: Radius.lg, paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: { ...Typography.subheading, color: '#fff', fontWeight: '800' },
});
