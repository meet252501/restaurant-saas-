import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Pressable, SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../lib/trpc';
import { useSaaSStore } from '../lib/saas-store';

export default function LoginScreen() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const appName = useSaaSStore(s => s.appName);
  const trpcUtils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.success && data.token && data.user) {
        trpcUtils.auth.me.setData(undefined, data.user as any);
        router.replace('/(tabs)');
      }
    },
    onError: (err) => {
      setPin('');
      setErrorMsg(err.message || 'Invalid PIN. Please try again.');
    },
  });

  React.useEffect(() => {
    // Auto-login on mount
    loginMutation.mutate({ pin: "" });
  }, []);

  const handleDial = (num: string) => {
    setErrorMsg('');
    const newPin = pin + num;
    if (newPin.length <= 4) setPin(newPin);
    if (newPin.length === 4) {
      loginMutation.mutate({ pin: newPin });
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Brand Header */}
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="business" size={40} color="#059669" />
          </View>
          <Text style={styles.brand}>{appName}</Text>
          <Text style={styles.subtitle}>Manager Access</Text>
        </View>

        {/* PIN Dots */}
        <View style={styles.pinDisplay}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.pinDot,
                pin.length > i && styles.pinDotActive,
              ]}
            />
          ))}
        </View>

        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : (
          <View style={styles.errorSpacer} />
        )}

        {/* Numpad */}
        <View style={styles.numpad}>
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
                  style={({ pressed }) => [
                    styles.numBtn,
                    !btn && styles.numBtnHidden,
                    pressed && btn && styles.numBtnPressed,
                  ]}
                  onPress={() => {
                    if (btn === 'del') handleDelete();
                    else if (btn) handleDial(btn);
                  }}
                  disabled={!btn || loginMutation.isPending}
                >
                  {btn === 'del' ? (
                    <Ionicons name="backspace-outline" size={26} color={Colors.textSecondary} />
                  ) : (
                    <Text style={styles.numText}>{btn}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        {loginMutation.isPending && (
          <Text style={styles.verifying}>Verifying…</Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },

  // Header
  header:      { alignItems: 'center', marginBottom: Spacing.xxxl },
  logoCircle:  { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg, borderWidth: 2, borderColor: Colors.accent, ...Shadows.green },
  logoEmoji:   { fontSize: 40 },
  brand:       { fontSize: 30, fontWeight: '800', color: Colors.accent, letterSpacing: -1 },
  brandSub:    { ...Typography.bodySmall, color: Colors.textSecondary, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  subtitle:    { ...Typography.body, color: Colors.textTertiary, marginTop: Spacing.xl },

  // PIN dots
  pinDisplay:  { flexDirection: 'row', gap: 18, marginBottom: Spacing.lg, width: '100%', justifyContent: 'center' },
  pinDot:      { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.surfaceElevated, borderWidth: 2, borderColor: Colors.surfaceBorder },
  pinDotActive:{ backgroundColor: Colors.accent, borderColor: Colors.accent, ...Shadows.green },
  pinDotError: { backgroundColor: Colors.error, borderColor: Colors.error },

  errorText:   { ...Typography.bodySmall, color: Colors.error, marginBottom: Spacing.xl, textAlign: 'center' },
  errorSpacer: { marginBottom: Spacing.xl },

  // Numpad
  numpad:      { gap: Spacing.md, width: '100%', maxWidth: 280 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  numBtn:      { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.surfaceBorder },
  numBtnPressed: { backgroundColor: Colors.surfaceElevated, borderColor: Colors.accent },
  numBtnHidden:  { backgroundColor: 'transparent', borderWidth: 0 },
  numText:       { fontSize: 30, fontWeight: '400', color: Colors.textPrimary },

  verifying:   { ...Typography.bodySmall, color: Colors.accent, marginTop: Spacing.xl },
});
