import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Spacing, Typography, Radius, Shadows } from '../lib/theme';
import { Ionicons, Feather } from '@expo/vector-icons';

interface KOTPreviewProps {
  visible: boolean;
  onClose: () => void;
  order: {
    id: string;
    table?: string;
    items: { name: string; quantity: number }[];
    timestamp: string;
  };
}

export function KOTPreview({ visible, onClose, order }: KOTPreviewProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Kitchen Order Ticket</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.kotHeader}>
              <View>
                <Text style={styles.kotLabel}>ORDER ID</Text>
                <Text style={styles.kotValue}>#{order.id.slice(0, 8).toUpperCase()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.kotLabel}>TABLE</Text>
                <Text style={[styles.kotValue, { color: Colors.accent }]}>{order.table || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.itemsList}>
              {order.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qtyText}>{item.quantity}x</Text>
                  </View>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            <View style={styles.footer}>
              <Text style={styles.timeText}>Generated: {new Date(order.timestamp).toLocaleTimeString()}</Text>
              <Text style={styles.footerBrand}>Powered by TableBook</Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.printBtn}>
              <Feather name="printer" size={20} color={Colors.textInverse} />
              <Text style={styles.actionText}>Print to Kitchen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  sheet: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { ...Typography.heading, color: '#000' },
  closeBtn: { padding: 4 },
  content: { padding: Spacing.xl },
  kotHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  kotLabel: { ...Typography.caption, color: '#6b7280', marginBottom: 2 },
  kotValue: { ...Typography.heading, color: '#000', fontSize: 24 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: Spacing.lg },
  itemsList: { gap: Spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  qtyBox: { 
    backgroundColor: '#f3f4f6', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  qtyText: { ...Typography.bodySmall, fontWeight: '900', color: '#000' },
  itemName: { ...Typography.subheading, color: '#000', flex: 1 },
  footer: { alignItems: 'center', gap: 4 },
  timeText: { ...Typography.caption, color: '#9ca3af' },
  footerBrand: { ...Typography.caption, color: Colors.accent, fontWeight: '700' },
  actions: { padding: Spacing.xl },
  printBtn: {
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.xl,
    gap: Spacing.sm,
  },
  actionText: { ...Typography.subheading, color: Colors.textPrimary, fontWeight: '700' },
});
