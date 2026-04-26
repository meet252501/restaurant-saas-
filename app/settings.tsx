import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable,
  ActivityIndicator, StyleSheet, Alert, Switch, Animated, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSaaSStore, ThemeColor } from '../lib/saas-store';
import { useDynamicTheme } from '../lib/useDynamicTheme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const THEME_OPTIONS: { id: ThemeColor; label: string; hex: string }[] = [
  { id: 'emerald', label: 'Emerald', hex: '#10b981' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'rose', label: 'Rose', hex: '#f43f5e' },
  { id: 'amber', label: 'Amber', hex: '#f59e0b' },
  { id: 'violet', label: 'Violet', hex: '#8b5cf6' },
];

function Section({ title, icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={() => setOpen(o => !o)}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={18} color="#fff" />
          </View>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textTertiary} />
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
        {icon && <Ionicons name={icon} size={18} color="#64748b" style={{ marginRight: 10 }} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#475569"
          keyboardType={keyboardType}
          secureTextEntry={secure}
          multiline={multiline}
          style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        />
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useDynamicTheme();
  const { data: restaurant, isLoading } = trpc.restaurant.info.useQuery();
  const { 
    appName, setAppName, themeColor, setThemeColor, 
    useGlassmorphism, setUseGlassmorphism,
    masterPin, setMasterPin, user, logout
  } = useSaaSStore();

  const [tempPin, setTempPin] = useState(masterPin);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const updateMutation = trpc.restaurant.updateInfo.useMutation({
    onSuccess: () => {
      Alert.alert('System Synchronized', 'Restaurant profile has been updated across the cloud.');
      router.back();
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const setPasswordMutation = trpc.auth.setPin.useMutation({
    onSuccess: () => {
      Alert.alert('Security Updated', 'Your cloud access credentials have been changed.');
      setNewPassword('');
      setConfirmPassword('');
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
    zomatoId: '',
    swiggyId: '',
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
        zomatoId: (restaurant as any).zomatoId || '',
        swiggyId: (restaurant as any).swiggyId || '',
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
      ...((form.zomatoId as any) ? { zomatoId: form.zomatoId } : {}),
      ...((form.swiggyId as any) ? { swiggyId: form.swiggyId } : {}),
    });
  };

  const handlePasswordUpdate = () => {
    if (newPassword.length < 4) {
      Alert.alert('Security Policy', 'Cloud key must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Confirmation key does not match.');
      return;
    }
    setPasswordMutation.mutate({ pin: newPassword });
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <LinearGradient colors={['#020617', '#0f172a']} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Command Center</Text>
          <View style={styles.statusDot} />
        </View>

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={styles.content} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.identityCard}>
            <LinearGradient colors={[theme.primary, theme.primaryDim]} style={styles.logoCircle}>
              <Ionicons name="restaurant" size={32} color="#fff" />
            </LinearGradient>
            <View style={styles.identityText}>
              <Text style={styles.identityName}>{appName}</Text>
              <Text style={styles.identityRole}>{user?.email || 'Authorized Manager Session'}</Text>
            </View>
          </View>

          <Section title="Enterprise Branding" icon="color-palette-outline">
            <Field label="App Appearance Name" value={appName} onChangeText={setAppName}
              placeholder="e.g. Blue Ginger" icon="text-outline" />
            
            <Text style={styles.fieldLabel}>Core Theme Signature</Text>
            <View style={styles.colorRow}>
              {THEME_OPTIONS.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => setThemeColor(t.id)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: t.hex },
                    themeColor === t.id && styles.colorCircleActive
                  ]}
                >
                  {themeColor === t.id && <Ionicons name="checkmark" size={16} color="#fff" />}
                </Pressable>
              ))}
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Glassmorphism FX</Text>
                <Text style={styles.hint}>Ultra-modern translucent UI effects</Text>
              </View>
              <Switch
                value={useGlassmorphism}
                onValueChange={setUseGlassmorphism}
                trackColor={{ false: '#1e293b', true: theme.primary }}
                thumbColor="#fff"
              />
            </View>
          </Section>

          <Section title="Authentication Infrastructure" icon="shield-checkmark-outline">
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
              <Text style={styles.infoText}>You have two layers of security. The Quick PIN is for local tablet unlocking. The Cloud Password is for server access.</Text>
            </View>

            <View style={styles.securitySection}>
              <Text style={styles.fieldLabel}>1. Local Quick Unlock (Staff PIN)</Text>
              <View style={styles.pinInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)' }]}
                  value={tempPin}
                  onChangeText={(val) => {
                    if (val.length <= 4 && /^\d*$/.test(val)) setTempPin(val);
                  }}
                  placeholder="4-digit PIN"
                  placeholderTextColor="#475569"
                  keyboardType="number-pad"
                  secureTextEntry
                />
                <Pressable 
                  style={[styles.miniActionBtn, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    if (tempPin.length === 4) {
                      setMasterPin(tempPin);
                      Alert.alert('PIN Updated', 'Staff can now use this PIN to unlock.');
                    } else {
                      Alert.alert('Error', 'PIN must be exactly 4 digits');
                    }
                  }}
                >
                  <Text style={styles.miniActionText}>Sync PIN</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.securitySection}>
              <Text style={styles.fieldLabel}>2. Master Cloud Access (Manager)</Text>
              <TextInput
                style={[styles.input, { marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.03)' }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New Cloud Password / PIN"
                placeholderTextColor="#475569"
                secureTextEntry
              />
              <TextInput
                style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.03)' }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm Cloud Password"
                placeholderTextColor="#475569"
                secureTextEntry
              />
              <Pressable 
                style={[styles.primaryActionBtn, { backgroundColor: theme.primary, marginTop: 16 }]}
                onPress={handlePasswordUpdate}
              >
                <Text style={styles.primaryActionText}>Authorize Cloud Security Change</Text>
              </Pressable>
            </View>
          </Section>

          <Section title="AI & Integrations" icon="hardware-chip-outline">
            <Field label="Twilio SID" value={form.twilioSid} onChangeText={set('twilioSid')}
              placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" icon="key-outline" />
            <Field label="Twilio Token" value={form.twilioToken} onChangeText={set('twilioToken')}
              placeholder="Encrypted Token" secure icon="lock-closed-outline" />
            <Field label="Provisioned Phone" value={form.twilioPhone} onChangeText={set('twilioPhone')}
              placeholder="+1234567890" icon="call-outline" keyboardType="phone-pad" />
            <Text style={styles.aiHint}>💡 Our AI agents use these keys to place automatic calls for your bookings.</Text>
          </Section>

          <Pressable
            style={({ pressed }) => [
              styles.mainSaveBtn, 
              { backgroundColor: theme.primary },
              pressed && { opacity: 0.8 },
              updateMutation.isPending && { opacity: 0.6 }
            ]}
            onPress={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="cloud-upload-outline" size={20} color="#fff" /><Text style={styles.mainSaveText}>Push Updates to Cloud</Text></>
            }
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.logoutBtn,
              pressed && { backgroundColor: 'rgba(239, 68, 68, 0.2)' }
            ]}
            onPress={() => {
              Alert.alert(
                'End Session',
                'Are you sure you want to log out from this instance?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Logout', style: 'destructive', onPress: async () => {
                    await logout();
                    router.replace('/login');
                  }},
                ]
              );
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#f87171" />
            <Text style={styles.logoutText}>Terminate Authorized Session</Text>
          </Pressable>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', ...Shadows.neon },
  content: { padding: 20, gap: 24 },
  
  identityCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 16
  },
  logoCircle: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...Shadows.soft },
  identityText: { flex: 1 },
  identityName: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  identityRole: { fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: '500' },

  section: { backgroundColor: 'rgba(30, 41, 59, 0.25)', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: 'rgba(255,255,255,0.02)' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconCircle: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, color: '#fff', fontWeight: '800', letterSpacing: -0.3 },
  sectionBody: { padding: 20, gap: 20 },

  fieldWrap: { gap: 8 },
  fieldLabel: { fontSize: 11, color: '#64748b', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.2, marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  input: { flex: 1, height: 56, color: '#fff', fontSize: 15, fontWeight: '500' },
  
  colorRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 4 },
  colorCircle: { width: 44, height: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
  colorCircleActive: { borderColor: 'rgba(255,255,255,0.2)' },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10, padding: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16 },
  switchLabel: { fontSize: 15, color: '#fff', fontWeight: '700' },
  hint: { fontSize: 12, color: '#64748b', marginTop: 2 },
  
  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: 'rgba(56, 189, 248, 0.05)', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.1)' },
  infoText: { flex: 1, fontSize: 12, color: '#94a3b8', lineHeight: 18 },

  securitySection: { gap: 12 },
  pinInputRow: { flexDirection: 'row', gap: 12 },
  miniActionBtn: { paddingHorizontal: 16, borderRadius: 14, justifyContent: 'center' },
  miniActionText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  
  primaryActionBtn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...Shadows.neon },
  primaryActionText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

  aiHint: { fontSize: 11, color: '#475569', fontStyle: 'italic', textAlign: 'center', marginTop: -10 },
  
  mainSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 64, borderRadius: 20, ...Shadows.neon },
  mainSaveText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.1)', marginTop: 10 },
  logoutText: { color: '#f87171', fontSize: 14, fontWeight: '800' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 10 },
});
