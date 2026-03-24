import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

const TABLES = [
  { id: 'T1', label: 'Table 1 - Window' },
  { id: 'T2', label: 'Table 2 - Center' },
  { id: 'T3', label: 'Table 3 - Cabin' },
  { id: 'T4', label: 'Table 4 - Garden' },
  { id: 'T5', label: 'Table 5 - Corner' },
];

export default function QRCodeGeneratorScreen() {
  const [selectedTable, setSelectedTable] = useState(TABLES[0]);
  const router = useRouter();

  const baseUrl = "http://localhost:8081"; // In production, this would be your domain
  const qrValue = `${baseUrl}/menu/${selectedTable.id}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Digital Menu for ${selectedTable.label}: ${qrValue}`,
        url: qrValue,
      });
    } catch (error) {
           console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Table QR Codes', headerTransparent: true, headerTintColor: Colors.textPrimary }} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Generate Table QRs 📱</Text>
          <Text style={styles.subtitle}>Place these on your restaurant tables for instant digital ordering.</Text>
        </View>

        <View style={styles.qrCard}>
          <View style={styles.qrWrapper}>
            <QRCode
              value={qrValue}
              size={200}
              color={Colors.background}
              backgroundColor="white"
            />
          </View>
          <Text style={styles.qrLabel}>{selectedTable.label}</Text>
          <Text style={styles.qrSublabel}>{qrValue}</Text>
        </View>

        <View style={styles.tableList}>
          <Text style={styles.sectionTitle}>Select Table</Text>
          {TABLES.map(table => (
            <TouchableOpacity 
              key={table.id} 
              onPress={() => setSelectedTable(table)}
              style={[
                styles.tableItem,
                selectedTable.id === table.id && styles.tableItemActive
              ]}
            >
              <View style={styles.tableItemLeft}>
                <View style={[
                  styles.tableDot,
                  { backgroundColor: selectedTable.id === table.id ? Colors.accent : Colors.surfaceBorder }
                ]} />
                <Text style={[
                  styles.tableText,
                  selectedTable.id === table.id && styles.tableTextActive
                ]}>{table.label}</Text>
              </View>
              {selectedTable.id === table.id && <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Feather name="share" size={20} color={Colors.textInverse} />
          <Text style={styles.shareButtonText}>Share QR Link</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingTop: 60, gap: Spacing.xl },
  header: { gap: Spacing.xs },
  title: { ...Typography.displayMedium, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  qrCard: {
    backgroundColor: 'white',
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.md,
  },
  qrWrapper: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: Radius.md,
  },
  qrLabel: { ...Typography.heading, color: '#000', marginTop: Spacing.lg },
  qrSublabel: { ...Typography.caption, color: '#666', marginTop: 4 },
  tableList: { gap: Spacing.md },
  sectionTitle: { ...Typography.subheading, color: Colors.textSecondary, marginBottom: Spacing.xs },
  tableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tableItemActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  tableItemLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tableDot: { width: 8, height: 8, borderRadius: 4 },
  tableText: { ...Typography.body, color: Colors.textSecondary },
  tableTextActive: { color: Colors.textPrimary, fontWeight: '700' },
  shareButton: {
    backgroundColor: Colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.xl,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  shareButtonText: { ...Typography.subheading, color: Colors.textInverse, fontWeight: '700' },
});
