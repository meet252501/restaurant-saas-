import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, Animated, Pressable, SafeAreaView, Dimensions, TextInput, Linking, useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { useSaaSStore } from '../lib/saas-store';




type Mode = 'loading' | 'login' | 'setup_restaurant' | 'setup_info' | 'setup_pin' | 'confirm_pin';

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('loading');
  const [pin, setPin] = useState('');
  const [setupPin, setSetupPin] = useState(''); // stores first entry during setup
  
  // Setup info state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const appName = useSaaSStore(s => s.appName);
  const setAppNameStore = useSaaSStore(s => s.setAppName);
  const setThemeColorStore = useSaaSStore(s => s.setThemeColor);
  const trpcUtils = trpc.useUtils();
  
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isSmallScreen = windowWidth < 360;

  // New setup state
  const [newAppName, setNewAppName] = useState(appName || '');
  const [selectedTheme, setSelectedTheme] = useState<ThemeColor>('violet');
  
  const themeHexMap: Record<ThemeColor, string> = {
    emerald: '#10b981',
    blue: '#3b82f6',
    rose: '#f43f5e',
    amber: '#f59e0b',
    violet: '#8b5cf6',
  };

  // Check if users exist on mount
  const hasUsersQuery = trpc.auth.hasUsers.useQuery(undefined, {
    retry: 2,
  });

  // Fetch restaurant info to sync store if needed
  const restaurantInfoQuery = trpc.restaurant.info.useQuery(undefined, {
    enabled: hasUsersQuery.isSuccess && hasUsersQuery.data?.exists,
  });

  useEffect(() => {
    if (hasUsersQuery.isSuccess && hasUsersQuery.data) {
      if (!hasUsersQuery.data.exists) {
        // No users - start onboarding
        if (!appName) {
          setMode('setup_restaurant');
        } else {
          setMode('setup_info');
        }
      } else {
        // Users exist
        if (restaurantInfoQuery.isSuccess && restaurantInfoQuery.data) {
          // Sync store with backend if it's empty locally
          if (!appName) {
            setAppNameStore(restaurantInfoQuery.data.name);
          }
          setMode('login');
        } else if (restaurantInfoQuery.isError || (restaurantInfoQuery.isSuccess && !restaurantInfoQuery.data)) {
          // No restaurant record but users exist (unlikely but safe to handle)
          setMode('login');
        }
        // If still loading restaurant info, stay in 'loading' or previous mode
      }
    } else if (hasUsersQuery.isError) {
      setMode('login');
    }
  }, [hasUsersQuery.isSuccess, hasUsersQuery.isError, hasUsersQuery.data, appName, restaurantInfoQuery.isSuccess, restaurantInfoQuery.data]);

  // Animation values
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [mode]);

  const triggerShake = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shakeAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  // ── Mutations ──────────────────────────────────────
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.success && data.token && data.user) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        trpcUtils.auth.me.setData(undefined, data.user as any);
        router.replace('/(tabs)');
      }
    },
    onError: (err) => {
      setPin('');
      setIsAuthenticating(false);
      setErrorMsg(err.message || 'Invalid PIN. Try again.');
      triggerShake();
    },
  });

  const setPinMutation = trpc.auth.setPin.useMutation({
    onSuccess: (data) => {
      if (data.success && data.token && data.user) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        trpcUtils.auth.me.setData(undefined, data.user as any);
        router.replace('/(tabs)');
      }
    },
    onError: (err) => {
      setPin('');
      setSetupPin('');
      setMode('setup_pin');
      setIsAuthenticating(false);
      setErrorMsg(err.message || 'Failed to set PIN. Try again.');
      triggerShake();
    },
  });

  // ── Actions ────────────────────────────────────────
  const handleSupportWhatsApp = () => {
    // You can also fetch this dynamically from DB in the future.
    const managerPhone = "919876543210"; 
    const message = encodeURIComponent("Hi TableBook Support, I need help with...");
    Linking.openURL(`whatsapp://send?phone=${managerPhone}&text=${message}`).catch(() => {
      setErrorMsg("WhatsApp is not installed on this device.");
    });
  };

  const handleRestaurantSubmit = () => {
    if (!newAppName.trim()) {
      setErrorMsg("Please enter your restaurant name.");
      triggerShake();
      return;
    }
    setAppNameStore(newAppName);
    setThemeColorStore(selectedTheme);
    setErrorMsg('');
    setMode('setup_info');
    fadeAnim.setValue(0);
  };

  const handleInfoSubmit = () => {
    if (!phone || phone.length < 10) {
      setErrorMsg("Please enter a valid phone number.");
      triggerShake();
      return;
    }
    setErrorMsg('');
    setMode('setup_pin');
    fadeAnim.setValue(0);
  };

  // ── Handle Dial ────────────────────────────────────
  const handleDial = (num: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setErrorMsg('');
    if (isAuthenticating) return;

    const newPin = pin + num;
    if (newPin.length <= 4) setPin(newPin);
    
    if (newPin.length === 4) {
      if (mode === 'login') {
        // Normal login
        setIsAuthenticating(true);
        loginMutation.mutate({ pin: newPin });
      } else if (mode === 'setup_pin') {
        // First PIN entry — store and ask to confirm
        setSetupPin(newPin);
        setPin('');
        setMode('confirm_pin');
      } else if (mode === 'confirm_pin') {
        // Confirm PIN entry
        if (newPin === setupPin) {
          setIsAuthenticating(true);
          setPinMutation.mutate({ pin: newPin, email, phone, restaurantName: newAppName });
        } else {
          setPin('');
          setSetupPin('');
          setMode('setup_pin');
          setErrorMsg('PINs did not match. Try again.');
          triggerShake();
        }
      }
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isAuthenticating) return;
    setPin(pin.slice(0, -1));
    setErrorMsg('');
  };

  // ── Dynamic labels ─────────────────────────────────
  const getSubtitle = () => {
    switch (mode) {
      case 'loading': return 'Loading...';
      case 'login': return 'Enter Your PIN';
      case 'setup_restaurant': return 'Create Your App';
      case 'setup_info': return 'Manager Details';
      case 'setup_pin': return 'Set Your PIN';
      case 'confirm_pin': return 'Confirm Your PIN';
    }
  };

  const getHelpText = () => {
    switch (mode) {
      case 'setup_restaurant': return 'Give your restaurant app a unique name and style';
      case 'setup_info': return 'Provide contact details for the manager account';
      case 'setup_pin': return 'Choose a 4-digit PIN for quick access';
      case 'confirm_pin': return 'Enter the same PIN again to confirm';
      default: return '';
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#020617']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          {/* Header */}
          <Animated.View style={[styles.headerContainer, { opacity: fadeAnim, marginBottom: isSmallScreen ? 20 : 32 }]}>
            <View style={[styles.logoCircle, { 
              width: isSmallScreen ? 60 : 80, 
              height: isSmallScreen ? 60 : 80,
              borderRadius: isSmallScreen ? 30 : 40 
            }]}>
              <LinearGradient
                colors={mode.includes('setup') || mode === 'confirm_pin' ? [themeHexMap[selectedTheme], themeHexMap[selectedTheme] + 'CC'] : ['#10b981', '#059669']}
                style={[styles.logoGradient, {
                  width: isSmallScreen ? 46 : 60,
                  height: isSmallScreen ? 46 : 60,
                  borderRadius: isSmallScreen ? 23 : 30
                }]}
              >
                <Ionicons
                  name={mode === 'setup_restaurant' ? 'brush' : (mode.includes('setup') || mode === 'confirm_pin' ? 'key' : 'restaurant')}
                  size={isSmallScreen ? 24 : 32}
                  color="#ffffff"
                />
              </LinearGradient>
            </View>
            <Text style={[styles.brand, { fontSize: isSmallScreen ? 24 : 32 }]}>
              {mode === 'setup_restaurant' ? 'TableBook' : (appName || 'TableBook')}
            </Text>
            <Text style={[styles.subtitle, { fontSize: isSmallScreen ? 13 : 15 }]}>{getSubtitle()}</Text>
            {getHelpText() ? (
              <Text style={[styles.helpText, { fontSize: isSmallScreen ? 12 : 13 }]}>{getHelpText()}</Text>
            ) : null}
          </Animated.View>

          {/* Setup Restaurant Mode */}
          {mode === 'setup_restaurant' && (
            <Animated.View style={[styles.infoForm, { opacity: fadeAnim }]}>
              <View style={styles.inputGroup}>
                <Ionicons name="restaurant-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Restaurant Name (e.g. Olive Cafe)"
                  placeholderTextColor="#64748b"
                  value={newAppName}
                  onChangeText={setNewAppName}
                />
              </View>

              <View style={styles.colorPickerContainer}>
                <Text style={styles.label}>Choose Brand Theme</Text>
                <View style={styles.colorRow}>
                  {(Object.keys(themeHexMap) as ThemeColor[]).map(t => (
                    <Pressable
                      key={t}
                      onPress={() => setSelectedTheme(t)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: themeHexMap[t] },
                        selectedTheme === t && styles.colorCircleActive
                      ]}
                    />
                  ))}
                </View>
              </View>
              
              <Pressable style={styles.continueBtn} onPress={handleRestaurantSubmit}>
                <LinearGradient colors={[themeHexMap[selectedTheme], themeHexMap[selectedTheme] + 'CC']} style={styles.continueBtnGradient}>
                  <Text style={styles.continueBtnText}>Next Step</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}
          {/* Setup Info Mode */}
          {mode === 'setup_info' && (
            <Animated.View style={[styles.infoForm, { opacity: fadeAnim }]}>
              <View style={styles.inputGroup}>
                <Ionicons name="call-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number (Required)"
                  placeholderTextColor="#64748b"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={15}
                />
              </View>
              <View style={styles.inputGroup}>
                <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address (Optional)"
                  placeholderTextColor="#64748b"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              
              <Pressable style={styles.continueBtn} onPress={handleInfoSubmit}>
                <LinearGradient colors={[themeHexMap[selectedTheme], themeHexMap[selectedTheme] + 'CC']} style={styles.continueBtnGradient}>
                  <Text style={styles.continueBtnText}>Continue to PIN</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}

          {/* PIN Input Modes */}
          {['login', 'setup_pin', 'confirm_pin'].includes(mode) && (
            <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
              <View style={[styles.pinDisplay, { gap: isSmallScreen ? 12 : 24 }]}>
                {[0, 1, 2, 3].map((i) => {
                  const isActive = pin.length > i;
                  const dotColor = mode === 'setup_pin' || mode === 'confirm_pin' ? themeHexMap[selectedTheme] : '#10b981';
                  return (
                    <View
                      key={i}
                      style={[
                        styles.pinDot,
                        isActive && [styles.pinDotActive, { backgroundColor: dotColor, borderColor: dotColor }],
                        errorMsg ? styles.pinDotError : null,
                        { width: isSmallScreen ? 16 : 20, height: isSmallScreen ? 16 : 20, borderRadius: isSmallScreen ? 8 : 10 }
                      ]}
                    />
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Error & Loading Messages */}
          <View style={styles.errorContainer}>
            {errorMsg ? (
              <Text style={styles.errorText}>{errorMsg}</Text>
            ) : null}
            {isAuthenticating && !errorMsg ? (
              <Text style={styles.loadingText}>
                {mode === 'confirm_pin' ? 'Setting up...' : 'Authenticating...'}
              </Text>
            ) : null}
          </View>

          {/* Back button during confirm mode */}
          {mode === 'confirm_pin' && !isAuthenticating && (
            <Pressable
              style={styles.backBtn}
              onPress={() => {
                setMode('setup_pin');
                setPin('');
                setSetupPin('');
                setErrorMsg('');
              }}
            >
              <Ionicons name="arrow-back" size={16} color="#94a3b8" />
              <Text style={styles.backBtnText}>Re-enter PIN</Text>
            </Pressable>
          )}

          {/* Numpad */}
          {['login', 'setup_pin', 'confirm_pin'].includes(mode) && (
            <Animated.View style={[styles.numpadContainer, { opacity: fadeAnim }]}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
                ['',  '0', 'del'],
              ].map((row, rIdx) => (
                <View key={rIdx} style={styles.row}>
                  {row.map((btn, cIdx) => (
                    <Pressable
                      key={cIdx}
                      onPress={() => {
                        if (btn === 'del') handleDelete();
                        else if (btn) handleDial(btn);
                      }}
                      style={({ pressed }) => [
                        styles.numBtn,
                        { 
                          width: isSmallScreen ? 65 : 80, 
                          height: isSmallScreen ? 65 : 80, 
                          borderRadius: isSmallScreen ? 32.5 : 40 
                        },
                        !btn && styles.numBtnHidden,
                        pressed && btn && styles.numBtnPressed,
                      ]}
                      disabled={!btn || isAuthenticating}
                    >
                      {btn === 'del' ? (
                        <Ionicons name="backspace-outline" size={28} color="#e2e8f0" />
                      ) : (
                        <Text style={styles.numText}>{btn}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              ))}
            </Animated.View>
          )}
          
          {mode === 'loading' && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Connecting...</Text>
            </View>
          )}

          {/* Contact Support Button */}
          {['login', 'setup_info'].includes(mode) && (
            <Pressable style={styles.supportBtn} onPress={handleSupportWhatsApp}>
              <FontAwesome name="whatsapp" size={20} color="#22c55e" />
              <Text style={styles.supportText}>Contact Support</Text>
            </Pressable>
          )}

        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  logoGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: {
    ...Typography.displayMedium,
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.body,
    color: '#94a3b8',
    marginTop: Spacing.xs,
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  helpText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  // Form Inputs
  infoForm: {
    width: '90%',
    maxWidth: 360,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    height: '100%',
  },
  continueBtn: {
    marginTop: Spacing.sm,
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.md,
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // PIN Display
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pinDotActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
    transform: [{ scale: 1.1 }],
  },
  pinDotError: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  errorContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.lg,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  numpadContainer: {
    width: '90%',
    maxWidth: 360,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  numBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  colorPickerContainer: {
    marginTop: 8,
  },
  label: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorCircleActive: {
    borderColor: '#fff',
    transform: [{ scale: 1.1 }],
  },
  numBtnHidden: {
    opacity: 0,
  },
  numBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ scale: 0.95 }],
  },
  numText: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '300',
  },
  supportBtn: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  supportText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  }
});
