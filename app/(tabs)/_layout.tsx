import { Tabs, useRouter, usePathname } from 'expo-router';
import {
  View, StyleSheet, Text,
  Pressable, ScrollView, Platform, Image, Dimensions
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Colors, Shadows, Typography, Radius, Spacing } from '../../lib/theme';
import { trpc } from '../../lib/trpc';
import { useResponsive } from '../../lib/useResponsive';
import { QuickActionsModal, MoreNavigationModal } from '../../components/QuickAccessMenu';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Nav definition ──────────────────────────────────────────────────────────

const NAV = [
  {
    group: 'MAIN MENU',
    items: [
      { label: 'Dashboard',    route: '/',                   feather: 'grid' },
      { label: 'Floor Plan',   route: '/tables',             feather: 'layout' },
      { label: 'Reservations', route: '/bookings',           feather: 'calendar' },
      { label: 'CRM',          route: '/customers',          feather: 'users' },
      { label: 'Delivery',     route: '/delivery',           ion: 'bicycle-outline' },
    ],
  },
  {
    group: 'INSIGHTS',
    items: [
      { label: 'Today',        route: '/today',              feather: 'sun' },
      { label: 'Reviews',      route: '/reviews',            ion: 'star-outline' },
    ],
  },
  {
    group: 'TOOLS',
    items: [
      { label: 'Menu Editor',  route: '/menu-editor',        ion: 'restaurant-outline' },
      { label: 'AI Assistant', route: '/ai-assistant',       ion: 'sparkles-outline' },
      { label: 'Settings',     route: '/settings',           ion: 'settings-outline' },
    ],
  },
];

const MOBILE_TABS = [
  { route: '/',         icon: 'grid',     label: 'Home' },
  { route: '/tables',   icon: 'layout',   label: 'Tables' },
  { route: '/bookings', icon: 'calendar', label: 'Book' },
  { route: '/today',    icon: 'activity', label: 'Today' },
];

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [actionsVisible, setActionsVisible] = useState(false);
  const [moreVisible, setMoreVisible] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // ── Shared nav item (used in sidebar) ──────────────────────────
  const NavItem = ({ item, collapsed = false }: { item: typeof NAV[0]['items'][0]; collapsed?: boolean }) => {
    const isActive = pathname === item.route;
    const icon = item.feather ? (
      <Feather name={item.feather as any} size={18} color={isActive ? '#fff' : Colors.textTertiary} />
    ) : (
      <Ionicons name={(item as any).ion as any} size={18} color={isActive ? '#fff' : Colors.textTertiary} />
    );

    return (
      <Pressable
        style={[
          styles.navItem,
          isActive && styles.navItemActive,
          collapsed && styles.navItemCollapsed,
        ]}
        onPress={() => { 
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(item.route as any); 
        }}
      >
        {icon}
        {!collapsed && (
          <Text style={[styles.navItemText, isActive && { color: '#fff' }]}>{item.label}</Text>
        )}
      </Pressable>
    );
  };

  const FullSidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.logoRow}>
        <View style={styles.logoBadge}>
          <Ionicons name="restaurant" size={18} color="#fff" />
        </View>
        <Text style={styles.logoText}>TableBook</Text>
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {NAV.map(g => (
          <View key={g.group} style={styles.navGroup}>
            <Text style={styles.navGroupLabel}>{g.group}</Text>
            {g.items.map(item => <NavItem key={item.route} item={item} />)}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const CollapsedSidebar = () => (
    <View style={styles.sidebarCollapsed}>
      <View style={[styles.logoBadge, { marginBottom: 20 }]}>
        <Ionicons name="restaurant" size={16} color="#fff" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
        {NAV.flatMap(g => g.items).map(item => <NavItem key={item.route} item={item} collapsed />)}
      </ScrollView>
    </View>
  );

  const MobileBottomNav = () => (
    <View style={styles.bottomNav}>
      {MOBILE_TABS.map((tab) => {
        const isActive = pathname === tab.route;
        return (
          <Pressable
            key={tab.route}
            style={styles.mobileTab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(tab.route as any);
            }}
          >
            <View style={[styles.tabIconBg, isActive && styles.tabIconBgActive]}>
              <Feather 
                name={tab.icon as any} 
                size={20} 
                color={isActive ? Colors.accent : Colors.textTertiary} 
              />
            </View>
            <Text style={[styles.mobileLabel, isActive && { color: Colors.accent }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
      
      {/* Redesigned "More" Button for the Hub */}
      <Pressable
        style={styles.mobileTab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setMoreVisible(true);
        }}
      >
        <View
          style={[styles.moreBtnBg, { backgroundColor: '#1e293b' }]}
        >
          <Feather name="menu" size={20} color={moreVisible ? Colors.accent : Colors.textSecondary} />
        </View>
        <Text style={[styles.mobileLabel, moreVisible && { color: Colors.accent }]}>More</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      {isDesktop && <FullSidebar />}
      {isTablet && <CollapsedSidebar />}

      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
            sceneStyle: { backgroundColor: Colors.background },
          }}
        >
          {[
            'index','tables','bookings','delivery','customers',
            'staff-dashboard','analytics-dashboard',
            'today','reviews','ai-assistant','menu-editor','settings',
          ].map(name => (
            <Tabs.Screen key={name} name={name} />
          ))}
        </Tabs>

        {isMobile && <MobileBottomNav />}
        
        <QuickActionsModal visible={actionsVisible} onClose={() => setActionsVisible(false)} />
        <MoreNavigationModal visible={moreVisible} onClose={() => setMoreVisible(false)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: Colors.background },
  sidebar: {
    width: 260,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.surfaceBorder,
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  sidebarCollapsed: {
    width: 70,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.surfaceBorder,
    paddingTop: 48,
    alignItems: 'center',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  logoBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.accentPurple, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  navGroup: { marginBottom: 24 },
  navGroupLabel: { color: Colors.textTertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, paddingHorizontal: 10 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, marginBottom: 2 },
  navItemActive: { backgroundColor: 'rgba(0,240,255,0.1)' },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0, width: 48, height: 48 },
  navItemText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: '#0f172a',
    borderRadius: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mobileTab: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    flex: 1,
  },
  tabIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconBgActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  moreBtnBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mobileLabel: { 
    fontSize: 9, 
    color: Colors.textTertiary, 
    marginTop: 4, 
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3
  },
});
