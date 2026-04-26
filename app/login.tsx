import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, Pressable, 
  ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Alert, Modal, Dimensions, Animated
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Shadows } from '../lib/theme';
import { useSaaSStore } from '../lib/saas-store';
import { useRouter } from 'expo-router';
import { getHttpUrl, setBaseUrl, trpc } from '../lib/trpc';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LoginScreen() {
  const [loginMode, setLoginMode] = useState<'email' | 'pin' | 'register'>('email');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Settings State
  const { 
    appName, setAppName, 
    themeColor, setThemeColor,
    masterPin, setMasterPin,
    baseUrl, setBaseUrl,
    setSession,
    resetAll 
  } = useSaaSStore();

  const router = useRouter();

  const [tempUrl, setTempUrl] = useState(baseUrl);
  const [tempAppName, setTempAppName] = useState(appName);
  const [tempMasterPin, setTempMasterPin] = useState(masterPin);
  const [tempThemeColor, setTempThemeColor] = useState(themeColor);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);


  // --- Google Auth ---
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  const googleAuthMutation = trpc.auth.googleLogin.useMutation({
    onSuccess: (data) => {
      setSession(data.token, data.user as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    },
    onError: (error) => {
      setLoading(false);
      Alert.alert('Google Auth Failed', error.message);
    }
  });

  useEffect(() => {
    if (response?.type === 'success' && response.authentication) {
      const { idToken } = response.authentication;
      if (idToken) {
        setLoading(true);
        googleAuthMutation.mutate({ idToken });
      }
    } else if (response?.type === 'error') {
      Alert.alert('Auth Error', 'Could not complete Google Sign-In.');
    }
  }, [response, googleAuthMutation]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type !== 'success') {
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
      Alert.alert('Auth Error', 'Security handshake failed.');
    }
  };

  // Animation for background glow
  const fadeAnim = React.useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.8, duration: 4000, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0.4, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Check if system has any users. If not, default to registration.
  const hasUsersQuery = trpc.auth.hasUsers.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (hasUsersQuery.data && !hasUsersQuery.data.exists) {
      setLoginMode('register');
    }
  }, [hasUsersQuery.data]);

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      setSession(data.token, { 
        id: 'owner', 
        name: name || 'Manager', 
        email: email, 
        restaurantId: data.restaurantId 
      } as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', 'Your professional restaurant dashboard is ready.');
      router.replace('/(tabs)');
    },
    onError: (error) => {
      setLoading(false);
      Alert.alert('Registration Error', error.message);
    }
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      setSession(data.token, data.user as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    },
    onError: (error) => {
      setLoading(false);
      Alert.alert('Login Failed', error.message);
    }
  });

  const pinLoginMutation = trpc.auth.loginWithPin.useMutation({
    onSuccess: (data) => {
      setSession(data.token, data.user as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    },
    onError: (error) => {
      setLoading(false);
      setPin('');
      Alert.alert('PIN Access Denied', error.message);
    }
  });

  const handleDial = (num: string) => {
    if (pin.length < 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        setLoading(true);
        pinLoginMutation.mutate({ pin: newPin });
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAuthAction = () => {
    setLoading(true);
    if (loginMode === 'email') {
      if (!email || !password) {
        Alert.alert('Required', 'Please enter your credentials');
        setLoading(false);
        return;
      }
      loginMutation.mutate({ email, password });
    } else if (loginMode === 'register') {
      if (!email || !password || !restaurantName) {
        Alert.alert('Required', 'Please fill in all restaurant details');
        setLoading(false);
        return;
      }
      registerMutation.mutate({ email, password, name: name || 'Manager', restaurantName });
    }
  };

  const handleSaveSettings = () => {
    let url = tempUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    if (!url.endsWith('/api/trpc')) {
      url = url.replace(/\/$/, '') + '/api/trpc';
    }
    setBaseUrl(url);
    setAppName(tempAppName);
    setMasterPin(tempMasterPin);
    setThemeColor(tempThemeColor as any);
    setSettingsModalVisible(false);
    Alert.alert('System Synchronized', 'Your infrastructure preferences have been updated.');
  };

  const handleEmergencyReset = () => {
    Alert.alert(
      'System Wipe',
      'This will clear all local encrypted data and session. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Wipe & Reset', 
          style: 'destructive',
          onPress: () => {
            resetAll();
            router.replace('/login');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* Premium Native Background */}
      <LinearGradient
        colors={['#020617', '#0f172a', '#020617']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Native Solid Background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} />

      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <View style={styles.settingsHeader}>
            <Pressable onPress={() => setSettingsModalVisible(true)} style={styles.settingsIcon}>
              <Ionicons name="shield-checkmark-outline" size={24} color={Colors.textTertiary} />
            </Pressable>
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContent} 
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={loginMode !== 'pin'}
          >
            <View style={styles.header}>
              <LinearGradient
                colors={[Colors.accent, Colors.accentPurple]}
                style={styles.logoBadge}
              >
                <Ionicons name="restaurant" size={32} color="#fff" />
              </LinearGradient>
              <Text style={styles.title}>TableBook</Text>
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>SaaS ENTERPRISE</Text>
              </View>
              <Text style={styles.subtitle}>
                {loginMode === 'email' ? 'Manager Cloud Access' : 
                 loginMode === 'pin' ? 'Quick Staff Entry' : 
                 'Create Your Professional Instance'}
              </Text>
            </View>

            <View style={styles.card}>
              {loginMode === 'pin' ? (
                  <View style={styles.pinSection}>
                    <View style={styles.pinDots}>
                      {[0, 1, 2, 3].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.pinDot,
                            pin.length > i && styles.pinDotFilled,
                            pin.length === i && styles.pinDotActive,
                          ]}
                        />
                      ))}
                    </View>

                    <View style={styles.numpad}>
                      <View style={styles.numRow}>
                        {[1, 2, 3].map((num) => (
                          <Pressable
                            key={num}
                            style={({ pressed }) => [styles.numBtn, pressed && styles.numBtnPressed] as any}
                            onPress={() => handleDial(num.toString())}
                          >
                            <Text style={styles.numText}>{num}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <View style={styles.numRow}>
                        {[4, 5, 6].map((num) => (
                          <Pressable
                            key={num}
                            style={({ pressed }) => [styles.numBtn, pressed && styles.numBtnPressed] as any}
                            onPress={() => handleDial(num.toString())}
                          >
                            <Text style={styles.numText}>{num}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <View style={styles.numRow}>
                        {[7, 8, 9].map((num) => (
                          <Pressable
                            key={num}
                            style={({ pressed }) => [styles.numBtn, pressed && styles.numBtnPressed] as any}
                            onPress={() => handleDial(num.toString())}
                          >
                            <Text style={styles.numText}>{num}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <View style={styles.numRow}>
                        <Pressable
                          style={({ pressed }) => [styles.numBtn, pressed && styles.numBtnPressed] as any}
                          onPress={() => {
                            setPin('');
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          }}
                        >
                          <Ionicons name="close-outline" size={24} color="#f87171" />
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [styles.numBtn, pressed && styles.numBtnPressed] as any}
                          onPress={() => handleDial('0')}
                        >
                          <Text style={styles.numText}>0</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [styles.numBtn, pressed && styles.numBtnPressed] as any}
                          onPress={handleBackspace}
                        >
                          <Ionicons name="backspace-outline" size={24} color="#fff" />
                        </Pressable>
                      </View>
                    </View>

                    <Pressable 
                      style={({ pressed }) => [
                        styles.actionBtnGradient, 
                        { marginTop: 20, width: '100%', opacity: pin.length === 4 ? 1 : 0.5 },
                        pressed && { transform: [{ scale: 0.98 }] }
                      ]} 
                      onPress={() => pin.length === 4 && pinLoginMutation.mutate({ pin })}
                      disabled={loading || pin.length < 4}
                    >
                      <LinearGradient
                        colors={[Colors.accent, Colors.accentPurple]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.actionBtnGradient, { width: '100%' }]}
                      >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                          <Text style={styles.actionBtnText}>Secure Entry</Text>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </View>
              ) : (
                <View style={styles.formSection}>
                  {loginMode === 'register' && (
                    <>
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Establishment Name</Text>
                        <TextInput
                          style={styles.input}
                          value={restaurantName}
                          onChangeText={setRestaurantName}
                          placeholder="e.g. The Grand Bistro"
                          placeholderTextColor="#475569"
                        />
                      </View>
                    </>
                  )}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Cloud Identity (Email)</Text>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="manager@domain.com"
                      placeholderTextColor="#475569"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Secure Key (Password)</Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        placeholderTextColor="#475569"
                        secureTextEntry={!showPassword}
                      />
                      <Pressable 
                        style={styles.eyeIcon} 
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons 
                          name={showPassword ? "eye-off-outline" : "eye-outline"} 
                          size={20} 
                          color="#64748b" 
                        />
                      </Pressable>
                    </View>
                  </View>

                  <Pressable 
                    onPress={handleAuthAction}
                    disabled={loading}
                    style={({ pressed }) => [
                      { marginTop: 12, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
                    ]}
                  >
                    <LinearGradient
                      colors={[Colors.accent, Colors.accentPurple]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.actionBtnGradient}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.actionBtnText}>
                          {loginMode === 'email' ? 'Authenticate' : 'Initialize Instance'}
                        </Text>
                      )}
                    </LinearGradient>
                  </Pressable>

                  {/* 
                  <View style={styles.socialDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>SECURE LOGIN OPTIONS</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <Pressable 
                    style={styles.googleBtn} 
                    onPress={handleGoogleLogin}
                    disabled={loading || !request}
                  >
                    <Ionicons name="logo-google" size={20} color="#fff" style={{ marginRight: 12 }} />
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </Pressable>
                  */}
                </View>
              )}
            </View>

            <View style={styles.footer}>
              {loginMode === 'email' ? (
                <View style={styles.footerLinks}>
                  <Pressable onPress={() => setLoginMode('pin')}>
                    <Text style={styles.toggleText}>Staff Terminal Entry</Text>
                  </Pressable>
                  <Pressable onPress={() => setLoginMode('register')}>
                    <Text style={styles.subToggleText}>New Instance? <Text style={styles.accentText}>Get Started</Text></Text>
                  </Pressable>
                </View>
              ) : loginMode === 'pin' ? (
                <Pressable onPress={() => setLoginMode('email')}>
                  <Text style={styles.toggleText}>Administrator Cloud Login</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setLoginMode('email')}>
                  <Text style={styles.toggleText}>Already Registered? <Text style={styles.accentText}>Sign In</Text></Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={settingsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Infrastructure Core</Text>
              <Pressable onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </Pressable>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalLabel}>Instance Brand Name</Text>
              <TextInput
                style={styles.modalInput}
                value={tempAppName}
                onChangeText={setTempAppName}
                placeholder="TableBook Restaurant"
                placeholderTextColor="#334155"
              />

              <Text style={styles.modalLabel}>Remote Infrastructure URL</Text>
              <TextInput
                style={styles.modalInput}
                value={tempUrl}
                onChangeText={setTempUrl}
                placeholder="https://your-api.render.com"
                placeholderTextColor="#334155"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Master Security PIN</Text>
              <TextInput
                style={styles.modalInput}
                value={tempMasterPin}
                onChangeText={setTempMasterPin}
                placeholder="1234"
                placeholderTextColor="#334155"
                keyboardType="number-pad"
                maxLength={6}
              />

              <Text style={styles.modalLabel}>Visual Theme Core</Text>
              <View style={styles.themeSelector}>
                {(['emerald', 'blue', 'rose', 'amber', 'violet'] as const).map((color) => (
                  <Pressable 
                    key={color}
                    onPress={() => setTempThemeColor(color)}
                    style={[
                      styles.themeOption,
                      { backgroundColor: color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : color === 'rose' ? '#f43f5e' : color === 'amber' ? '#f59e0b' : '#8b5cf6' },
                      tempThemeColor === color && styles.themeOptionActive
                    ]}
                  />
                ))}
              </View>

              <Pressable style={styles.saveBtn} onPress={handleSaveSettings}>
                <Text style={styles.saveBtnText}>Save All Synchronizations</Text>
              </Pressable>
            </ScrollView>

            <View style={styles.dangerZone}>
              <Pressable style={styles.resetBtn} onPress={handleEmergencyReset}>
                <Ionicons name="refresh-outline" size={18} color="#ef4444" />
                <Text style={styles.resetBtnText}>Factory Data Purge</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  glowCircle: { position: 'absolute', width: 450, height: 450, borderRadius: 225 },
  container: { flex: 1 },
  settingsHeader: { padding: 16, alignItems: 'flex-end' },
  settingsIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  scrollContent: { paddingHorizontal: 28, paddingBottom: 60, paddingTop: 10 },
  header: { alignItems: 'center', marginBottom: 20 },
  logoBadge: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, ...Shadows.neon },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1.5 },
  badgeContainer: { backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)', marginTop: 4 },
  badgeText: { color: '#38bdf8', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  subtitle: { fontSize: 14, color: '#64748b', fontWeight: '600', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  
  card: { backgroundColor: '#0f172a', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', ...Shadows.soft },
  
  // PIN Section
  pinSection: { alignItems: 'center' },
  pinDots: { flexDirection: 'row', gap: 20, marginBottom: 32 },
  pinDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },
  pinDotActive: { borderColor: Colors.accent, transform: [{ scale: 1.1 }] },
  pinDotFilled: { backgroundColor: Colors.accent, borderColor: Colors.accent, ...Shadows.neon },
  numpad: { alignItems: 'center', marginTop: 10 },
  numRow: { flexDirection: 'row', gap: 20, marginBottom: 20, justifyContent: 'center' },
  numBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)' },
  numBtnPressed: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: Colors.accent },
  numBtnEmpty: { width: 68, height: 68 },
  numText: { fontSize: 26, fontWeight: '600', color: '#fff' },
  glowWrapper: { position: 'absolute', width: 450, height: 450, overflow: 'hidden', borderRadius: 225 },

  // Form Section
  formSection: { gap: 22 },
  inputGroup: { gap: 10 },
  label: { color: '#64748b', fontSize: 11, fontWeight: '800', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 1.2 },
  input: { backgroundColor: 'rgba(2, 6, 23, 0.8)', borderRadius: 18, padding: 20, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center' },
  eyeIcon: { position: 'absolute', right: 20 },
  actionBtnGradient: { borderRadius: 20, height: 60, alignItems: 'center', justifyContent: 'center', ...Shadows.neon },
  actionBtnText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.8 },

  socialDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  dividerText: { color: '#475569', marginHorizontal: 16, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 60, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.01)' },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  footer: { marginTop: 24, alignItems: 'center' },
  footerLinks: { alignItems: 'center', gap: 18 },
  toggleText: { color: Colors.accent, fontSize: 16, fontWeight: '800' },
  subToggleText: { color: '#475569', fontSize: 15, fontWeight: '600' },
  accentText: { color: Colors.accent, fontWeight: '800' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.92)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f172a', borderTopLeftRadius: 44, borderTopRightRadius: 44, padding: 32, paddingBottom: 64, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  modalLabel: { color: '#475569', fontSize: 12, fontWeight: '900', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  modalInput: { backgroundColor: '#020617', borderRadius: 18, padding: 20, color: '#fff', fontSize: 16, marginBottom: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: 18, height: 60, alignItems: 'center', justifyContent: 'center', marginTop: 12, ...Shadows.neon },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  themeSelector: { flexDirection: 'row', gap: 14, marginBottom: 28 },
  themeOption: { width: 44, height: 44, borderRadius: 22, opacity: 0.5, borderWidth: 2, borderColor: 'transparent' },
  themeOptionActive: { opacity: 1, borderColor: '#fff', transform: [{ scale: 1.1 }] },
  dangerZone: { marginTop: 36, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 28 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: 20, borderRadius: 18 },
  resetBtnText: { color: '#f87171', fontSize: 15, fontWeight: '900' },
});
