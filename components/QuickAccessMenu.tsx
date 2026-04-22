/**
 * QuickAccessMenu — Global quick-access bottom sheet
 * Shows AI Assistant, Analytics, Reports, Settings
 * Triggered by tapping the app logo in any page header
 */
import React, { useState } from 'react';
import { View, Text, Modal, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../lib/theme';

const MENU_ITEMS = [
  { label: 'AI Assistant', icon: 'sparkles-outline', route: '/ai-assistant', color: Colors.accent },
  { label: 'Analytics', icon: 'stats-chart-outline', route: '/analytics-dashboard', color: Colors.available },
  { label: 'Delivery', icon: 'bicycle-outline', route: '/delivery', color: '#f97316' },
  { label: 'Settings', icon: 'settings-outline', route: '/settings', color: Colors.textSecondary },
];

/** The app logo button — tap to open quick access menu */
export function QuickAccessButton() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  return (
    <>
      <Pressable style={styles.logoBtn} onPress={() => setVisible(true)}>
        <Image
          source={require('../assets/images/app-logo.png')}
          style={styles.logoImg}
        />
      </Pressable>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>Quick Access</Text>
            {MENU_ITEMS.map((item, i) => (
              <Pressable
                key={i}
                style={styles.item}
                onPress={() => { setVisible(false); router.push(item.route as any); }}
              >
                <View style={[styles.iconBox, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={styles.itemText}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  logoBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceBorder,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
});
