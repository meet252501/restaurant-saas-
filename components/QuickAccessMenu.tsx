/**
 * QuickAccessMenu — Global quick-access components
 * Differentiates between 'Quick Actions' (Header) and 'More Navigation' (Bottom Bar)
 */
import React, { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Dimensions, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Shadows, Spacing, Typography } from '../lib/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** 
 * NAVIGATION ITEMS — Used for the 'More' button in Bottom Bar
 * Hub for deep links and management
 */
const NAV_ITEMS = [
  { label: 'Analytics',    icon: 'bar-chart-outline',   route: '/analytics-dashboard', color: '#38bdf8' },
  { label: 'Customers',    icon: 'people-outline',      route: '/customers',          color: '#f472b6' },
  { label: 'AI Assistant', icon: 'sparkles-outline',    route: '/ai-assistant',       color: Colors.accent },
  { label: 'Delivery',     icon: 'bicycle-outline',     route: '/delivery',           color: '#f97316' },
  { label: 'Reviews',      icon: 'star-outline',        route: '/reviews',            color: '#fbbf24' },
  { label: 'Settings',     icon: 'settings-outline',    route: '/settings',           color: Colors.textSecondary },
];

/**
 * QUICK ACTIONS — Used for the Header Logo
 * Shortcuts for frequent operations
 */
const ACTION_ITEMS = [
  { label: 'New Booking',  icon: 'calendar-outline',   route: '/new-booking',     color: Colors.accent, desc: 'Add a table reservation' },
  { label: 'Menu Editor',  icon: 'restaurant-outline',  route: '/menu-editor',     color: '#34d399',      desc: 'Quickly update your dishes' },
  { label: 'AI Chat',      icon: 'chatbubble-ellipses-outline', route: '/ai-assistant', color: '#a78bfa', desc: 'Ask TableBook AI anything' },
];

/** Modal for the 'More' button in Bottom Bar — Hub Design */
export function MoreNavigationModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();

  const handleNavigate = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push(route as any);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.98)', 'rgba(2, 6, 23, 1)']}
            style={styles.sheetGradient}
          >
            <View style={styles.handle} />
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>The Hub</Text>
                <Text style={styles.subtitle}>Unified Management Center</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.navGrid} showsVerticalScrollIndicator={false}>
              {NAV_ITEMS.map((item, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.navCard,
                    pressed && { transform: [{ scale: 0.96 }], backgroundColor: 'rgba(255,255,255,0.08)' }
                  ]}
                  onPress={() => handleNavigate(item.route)}
                >
                  <LinearGradient
                    colors={[item.color + '20', item.color + '05']}
                    style={styles.navCardGradient}
                  >
                    <View style={[styles.navIconBox, { backgroundColor: item.color + '10', borderColor: item.color + '40' }]}>
                      <Ionicons name={item.icon as any} size={32} color={item.color} />
                    </View>
                    <Text style={styles.navLabel}>{item.label}</Text>
                  </LinearGradient>
                </Pressable>
              ))}
            </ScrollView>
          </LinearGradient>
        </View>
      </Pressable>
    </Modal>
  );
}

/** Modal for the Header Logo — Quick Action Palette */
export function QuickActionsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();

  const handleAction = (route: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
    router.push(route as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { justifyContent: 'center', backgroundColor: 'rgba(2, 6, 23, 0.9)' }]} onPress={onClose}>
        <View style={styles.actionPalette} onStartShouldSetResponder={() => true}>
          <LinearGradient
            colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 1)']}
            style={styles.paletteGradient}
          >
            <View style={styles.paletteHeader}>
              <Text style={styles.paletteTitle}>Quick Actions</Text>
              <View style={styles.paletteDivider} />
            </View>
            <View style={styles.actionList}>
              {ACTION_ITEMS.map((item, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.actionItem,
                    pressed && { backgroundColor: 'rgba(255,255,255,0.05)', transform: [{ scale: 0.98 }] }
                  ]}
                  onPress={() => handleAction(item.route)}
                >
                  <LinearGradient
                    colors={[item.color, item.color + 'CC']}
                    style={styles.actionIcon}
                  >
                    <Ionicons name={item.icon as any} size={22} color="#fff" />
                  </LinearGradient>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionLabel}>{item.label}</Text>
                    <Text style={styles.actionDesc}>{item.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                </Pressable>
              ))}
            </View>
            
            <Pressable style={styles.paletteClose} onPress={onClose}>
              <Text style={styles.paletteCloseText}>Close</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </Pressable>
    </Modal>
  );
}

/** The legacy logo button for headers — triggers Quick Actions */
export function QuickAccessButton() {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable 
        style={({ pressed }) => [
          styles.logoBtn, 
          pressed && { transform: [{ scale: 0.92 }] }
        ]} 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setVisible(true);
        }}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
          style={styles.logoGradient}
        >
          <Image
            source={require('../assets/images/applogo.png')}
            style={styles.logoImg}
          />
        </LinearGradient>
      </Pressable>
      <QuickActionsModal visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  logoBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    backgroundColor: '#0f172a',
    ...Shadows.glass,
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  logoImg: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'flex-end',
  },
  // --- More Navigation Sheet ---
  sheet: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderBottomWidth: 0,
    height: SCREEN_HEIGHT * 0.75,
  },
  sheetGradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 44,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  subtitle: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  navCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    borderRadius: 28,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  navCardGradient: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  navIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  navLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },

  // --- Quick Action Palette ---
  actionPalette: {
    width: SCREEN_WIDTH - 48,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    ...Shadows.premium,
  },
  paletteGradient: {
    padding: 28,
  },
  paletteHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  paletteTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  paletteDivider: {
    width: 40,
    height: 3,
    backgroundColor: Colors.accent,
    borderRadius: 2,
    marginTop: 8,
  },
  actionList: {
    gap: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 24,
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glass,
  },
  actionInfo: {
    flex: 1,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  actionDesc: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 3,
    fontWeight: '500',
  },
  paletteClose: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
  },
  paletteCloseText: {
    color: Colors.textTertiary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
