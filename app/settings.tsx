import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSaaSStore, ThemeColor } from '../lib/saas-store';

const THEMES: { id: ThemeColor; hex: string; name: string }[] = [
  { id: 'emerald', hex: '#10b981', name: 'Emerald' },
  { id: 'blue',    hex: '#3b82f6', name: 'Ocean'   },
  { id: 'rose',    hex: '#f43f5e', name: 'Rose'    },
  { id: 'amber',   hex: '#f59e0b', name: 'Amber'   },
  { id: 'violet',  hex: '#8b5cf6', name: 'Violet'  },
];

function Section({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={() => setOpen(o => !o)}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name={icon} size={18} color={Colors.accent} />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textTertiary} />
      </Pressable>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, icon, keyboardType, secure, multiline }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; icon?: any; keyboardType?: any; secure?: boolean; multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        {icon && <Ionicons name={icon} size={16} color={Colors.textTertiary} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          keyboardType={keyboardType}
          secureTextEntry={secure}
          multiline={multiline}
          style={[styles.input, multiline && { height: 72, textAlignVertical: 'top' }]}
        />
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { data: restaurant, isLoading } = trpc.restaurant.info.useQuery();
  const { appName, themeColor, setAppName, setThemeColor } = useSaaSStore();

  const updateMutation = trpc.restaurant.updateInfo.useMutation({
    onSuccess: () => {
      Alert.alert('Saved!', 'Restaurant profile updated successfully.');
      router.back();
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    cuisineType: '',
    gstNumber: '',
    openingHoursLunch: '',
    openingHoursDinner: '',
    instagramUrl: '',
    googleMapsUrl: '',
    pinCode: '1234',
    twilioSid: '',
    twilioToken: '',
    twilioPhone: '',
  });

  React.useEffect(() => {
    if (restaurant) {
      let lunchHours = '', dinnerHours = '';
      try {
        const h = JSON.parse(restaurant.openingHours || '{}');
        lunchHours = h.lunch || '';
        dinnerHours = h.dinner || '';
      } catch { /* ignore */ }
      setForm({
        name: restaurant.name || '',
        email: restaurant.email || '',
        phone: restaurant.phone || '',
        address: restaurant.address || '',
        city: (restaurant as any).city || '',
        pincode: (restaurant as any).pincode || '',
        cuisineType: (restaurant as any).cuisineType || '',
        gstNumber: (restaurant as any).gstNumber || '',
        openingHoursLunch: lunchHours,
        openingHoursDinner: dinnerHours,
        instagramUrl: (restaurant as any).instagramUrl || '',
        googleMapsUrl: (restaurant as any).googleMapsUrl || '',
        pinCode: restaurant.pinCode || '1234',
        twilioSid: restaurant.twilioSid || '',
        twilioToken: restaurant.twilioToken || '',
        twilioPhone: restaurant.twilioPhone || '',
      });
    }
  }, [restaurant]);

  const set = (key: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [key]: v }));

  const handleSave = () => {
    const openingHours = JSON.stringify({
      lunch: form.openingHoursLunch,
      dinner: form.openingHoursDinner,
    });
    updateMutation.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      city: form.city,
      pincode: form.pincode,
      cuisineType: form.cuisineType,
      gstNumber: form.gstNumber,
      openingHours,
      instagramUrl: form.instagramUrl,
      googleMapsUrl: form.googleMapsUrl,
      pinCode: form.pinCode,
      ...(form.twilioSid ? { twilioSid: form.twilioSid } : {}),
      ...(form.twilioToken ? { twilioToken: form.twilioToken } : {}),
      ...(form.twilioPhone ? { twilioPhone: form.twilioPhone } : {}),
    });
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Restaurant Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Identity */}
        <View style={styles.identityCard}>
          <View style={styles.logoCircle}>
            <Ionicons name="restaurant" size={40} color={Colors.accent} />
          </View>
          <Text style={styles.identityName}>{appName}</Text>
          <Text style={styles.identityRole}>Owner Control Panel</Text>
        </View>

        {/* ── BRAND ── */}
        <Section title="SaaS Branding" icon="color-palette-outline">
          <Field label="App Display Name" value={appName} onChangeText={setAppName}
            placeholder="e.g. Green Apple" icon="text-outline" />
          <Text style={styles.fieldLabel}>Theme Color</Text>
          <View style={styles.colorRow}>
            {THEMES.map(t => (
              <Pressable
                key={t.id} onPress={() => setThemeColor(t.id)}
                style={[styles.colorCircle, { backgroundColor: t.hex }, themeColor === t.id && styles.colorCircleActive]}
              >
                {themeColor === t.id && <Ionicons name="checkmark" size={14} color="#fff" />}
              </Pressable>
            ))}
            {THEMES.map(t => (
              <Text key={`lbl-${t.id}`} style={[styles.colorLabel, { color: themeColor === t.id ? t.hex : Colors.textTertiary }]}>{t.name}</Text>
            ))}
          </View>
        </Section>

        {/* ── RESTAURANT INFO ── */}
        <Section title="Restaurant Info" icon="business-outline">
          <Field label="Restaurant Name *" value={form.name} onChangeText={set('name')}
            placeholder="e.g. Green Apple Restaurant" icon="restaurant-outline" />
          <Field label="Contact Phone / WhatsApp" value={form.phone} onChangeText={set('phone')}
            placeholder="+91 96626 53440" icon="call-outline" keyboardType="phone-pad" />
          <Field label="Owner Email" value={form.email} onChangeText={set('email')}
            placeholder="owner@greenapple.com" icon="mail-outline" keyboardType="email-address" />
          <Field label="Full Address (Street, Area)" value={form.address} onChangeText={set('address')}
            placeholder="Sector 16, Near Akshardham..." icon="location-outline" multiline />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="City" value={form.city} onChangeText={set('city')}
                placeholder="Gandhinagar" icon="map-outline" />
            </View>
            <View style={{ width: Spacing.sm }} />
            <View style={{ flex: 0.6 }}>
              <Field label="Pincode" value={form.pincode} onChangeText={set('pincode')}
                placeholder="382016" keyboardType="number-pad" />
            </View>
          </View>
          <Field label="Cuisine Type(s)" value={form.cuisineType} onChangeText={set('cuisineType')}
            placeholder="Indian, Gujarati, Chinese" icon="nutrition-outline" />
          <Field label="GST Number" value={form.gstNumber} onChangeText={set('gstNumber')}
            placeholder="24AABCU9603R1ZS" icon="receipt-outline" />
        </Section>

        {/* ── OPENING HOURS ── */}
        <Section title="Opening Hours" icon="time-outline">
          <Field label="Lunch Hours" value={form.openingHoursLunch} onChangeText={set('openingHoursLunch')}
            placeholder="11:00 – 15:00" icon="sunny-outline" />
          <Field label="Dinner Hours" value={form.openingHoursDinner} onChangeText={set('openingHoursDinner')}
            placeholder="18:30 – 23:00" icon="moon-outline" />
        </Section>

        {/* ── SOCIAL & ONLINE ── */}
        <Section title="Social & Online Presence" icon="globe-outline">
          <Field label="Instagram URL" value={form.instagramUrl} onChangeText={set('instagramUrl')}
            placeholder="https://instagram.com/greenapple" icon="logo-instagram" />
          <Field label="Google Maps Link" value={form.googleMapsUrl} onChangeText={set('googleMapsUrl')}
            placeholder="https://maps.google.com/..." icon="map-outline" />
        </Section>

        {/* ── SECURITY ── */}
        <Section title="Security" icon="shield-outline">
          <Field label="Staff Security PIN (4 digits)" value={form.pinCode} onChangeText={set('pinCode')}
            placeholder="1234" icon="keypad-outline" keyboardType="number-pad" secure />
          <Text style={styles.hint}>Required to access Analytics, Menu, KDS & Settings.</Text>
        </Section>

        {/* ── INTEGRATIONS ── */}
        <Section title="AI Voice (Twilio)" icon="call-outline">
          <Field label="Account SID" value={form.twilioSid} onChangeText={set('twilioSid')}
            placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" icon="key-outline" />
          <Field label="Auth Token" value={form.twilioToken} onChangeText={set('twilioToken')}
            placeholder="Your Twilio Auth Token" secure />
          <Field label="Twilio Phone" value={form.twilioPhone} onChangeText={set('twilioPhone')}
            placeholder="+1234567890" icon="call-outline" keyboardType="phone-pad" />
          <Text style={styles.hint}>💡 Your restaurant pays Twilio directly. You get amazing AI calling for free!</Text>
        </Section>

        {/* Save */}
        <Pressable
          style={[styles.saveBtn, Shadows.accent, updateMutation.isPending && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending
            ? <ActivityIndicator color="#fff" />
            : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.saveBtnText}>Save All Changes</Text></>
          }
        </Pressable>

        {/* RESTART SETUP BUTTON */}
        <Pressable
          style={[styles.saveBtn, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.surfaceBorder, marginTop: Spacing.xl }]}
          onPress={() => {
            setAppName(''); // Clears stored name so Setup screen triggers
            router.replace('/setup');
          }}
        >
          <Ionicons name="refresh" size={20} color={Colors.textSecondary} />
          <Text style={[styles.saveBtnText, { color: Colors.textSecondary }]}>Restart Initial Setup</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.background,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.subheading, color: Colors.textPrimary, fontWeight: '800' },
  content: { padding: Spacing.lg, gap: Spacing.md },
  identityCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.accentDim,
    alignItems: 'center', justifyContent: 'center',
  },
  identityName: { ...Typography.heading, color: Colors.textPrimary, fontWeight: '900' },
  identityRole: { ...Typography.bodySmall, color: Colors.textTertiary },
  section: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading, color: Colors.textPrimary, fontWeight: '700' },
  sectionBody: { padding: Spacing.lg, gap: Spacing.md },
  fieldWrap: { gap: Spacing.xs },
  fieldLabel: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  input: { flex: 1, ...Typography.body, color: Colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  colorRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  colorCircle: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorCircleActive: { borderColor: '#fff', borderWidth: 3 },
  colorLabel: { ...Typography.caption, fontWeight: '600' },
  hint: { ...Typography.caption, color: Colors.textTertiary, fontStyle: 'italic', lineHeight: 18 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.accent, borderRadius: Radius.lg, padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  saveBtnText: { ...Typography.subheading, color: Colors.textInverse, fontWeight: '700' },
});
