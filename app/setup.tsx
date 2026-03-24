import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSaaSStore } from '../lib/saas-store';
import { Colors, Typography, Spacing, Radius } from '../lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function SetupScreen() {
  const router = useRouter();
  const { appName, themeColor, setAppName, setThemeColor } = useSaaSStore();
  
  const [name, setName] = useState(appName === 'TableBook Setup' ? '' : appName);

  const handleComplete = () => {
    if (name.trim()) setAppName(name.trim());
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="restaurant" size={48} color={Colors.accent} />
        </View>
        <Text style={styles.title}>Welcome.</Text>
        <Text style={styles.sub}>Let&apos;s configure your restaurant&apos;s digital presence before opening the dashboard.</Text>
        
        <View style={styles.card}>
          <Text style={styles.label}>Restaurant Name *</Text>
          <TextInput 
            value={name} onChangeText={setName}
            style={styles.input}
            placeholder="e.g. Green Apple / The Emerald View"
            placeholderTextColor={Colors.textTertiary}
          />

          <View style={styles.themeWrap}>
            <Text style={styles.label}>Select Primary Color</Text>
            <View style={styles.colorRow}>
              {(['emerald', 'blue', 'rose', 'amber', 'violet'] as const).map(color => {
                const hexMap = {
                  emerald: '#10b981',
                  blue: '#3b82f6',
                  rose: '#f43f5e',
                  amber: '#f59e0b',
                  violet: '#8b5cf6'
                };
                return (
                  <Pressable
                    key={color}
                    onPress={() => setThemeColor(color)}
                    style={[styles.colorCircle, { backgroundColor: hexMap[color] }, themeColor === color && styles.colorCircleActive]}
                  >
                    {themeColor === color && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable style={styles.btn} onPress={handleComplete}>
            <Text style={styles.btnText}>Open Dashboard {'>'}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.xl, justifyContent: 'center', maxWidth: 600, alignSelf: 'center', width: '100%' },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  title: { ...Typography.displayMedium, color: Colors.textPrimary, marginBottom: Spacing.sm },
  sub: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.xl },
  card: { backgroundColor: Colors.surface, padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.surfaceBorder },
  label: { ...Typography.bodySmall, color: Colors.textSecondary, marginBottom: Spacing.sm, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: Colors.surfaceBorder, color: Colors.textPrimary, padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.xl, fontSize: 16 },
  themeWrap: { marginBottom: Spacing.xl },
  colorRow: { flexDirection: 'row', gap: Spacing.md },
  colorCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  colorCircleActive: { borderWidth: 3, borderColor: '#fff' },
  btn: { backgroundColor: Colors.accent, padding: Spacing.lg, borderRadius: Radius.md, alignItems: 'center' },
  btnText: { color: Colors.textInverse, fontWeight: 'bold', fontSize: 16 }
});
