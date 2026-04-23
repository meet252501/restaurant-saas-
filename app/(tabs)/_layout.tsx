import { Tabs, Redirect, useRouter, usePathname } from 'expo-router';
import {
  View, StyleSheet, ActivityIndicator, Text,
  Pressable, ScrollView, Modal, Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Colors, Shadows, Typography } from '../../lib/theme';
import { trpc } from '../../lib/trpc';
import { useResponsive } from '../../lib/useResponsive';

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
      { label: 'Cloud Data',   route: '/cloud-data',         ion: 'cloud-outline' },
      { label: 'Settings',     route: '/settings',           ion: 'settings-outline' },
    ],
  },
];

const MOBILE_TABS = [
  { route: '/',         icon: 'grid',             label: 'Home' },
  { route: '/tables',   icon: 'layout',           label: 'Tables' },
  { route: '/bookings', icon: 'calendar',         label: 'Book' },
  { route: '/delivery', icon: 'package',          label: 'Delivery' },
  { route: '/today',    icon: 'sun',              label: 'Today' },
];

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  const { isMobile, isTablet, isDesktop, hasSidebar } = useResponsive();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const router = useRouter();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;

  // ── Shared nav item (used in sidebar + drawer) ──────────────────────────
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
        onPress={() => { router.push(item.route as any); setDrawerOpen(false); }}
      >
        {icon}
        {!collapsed && (
          <Text style={[styles.navItemText, isActive && { color: '#fff' }]}>{item.label}</Text>
        )}
      </Pressable>
    );
  };

  // ── Sidebar logo ──────────────────────────────────────────────────────────
  const Logo = ({ collapsed = false }) => (
    <View style={[styles.logoRow, collapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}>
      <View style={styles.logoBadge}>
        <Ionicons name="restaurant" size={18} color="#fff" />
      </View>
      {!collapsed && <Text style={styles.logoText}>TableBook</Text>}
    </View>
  );

  // ── Full sidebar (desktop 260px) ──────────────────────────────────────────
  const FullSidebar = () => (
    <View style={styles.sidebar}>
      <Logo />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {NAV.map(g => (
          <View key={g.group} style={styles.navGroup}>
            <Text style={styles.navGroupLabel}>{g.group}</Text>
            {g.items.map(item => <NavItem key={item.route} item={item} />)}
          </View>
        ))}
      </ScrollView>
      <View style={styles.aiPromo}>
        <LinearGradient colors={[Colors.accentPurple + '40', Colors.accent + '20']} style={styles.aiGrad}>
          <Feather name="cpu" size={20} color={Colors.accent} />
          <Text style={styles.aiPromoTitle}>TableBook Core</Text>
          <Text style={styles.aiPromoSub}>Local AI active</Text>
        </LinearGradient>
      </View>
    </View>
  );

  // ── Collapsed icon sidebar (tablet 64px) ─────────────────────────────────
  const CollapsedSidebar = () => (
    <View style={styles.sidebarCollapsed}>
      <Logo collapsed />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingTop: 8 }}>
        {NAV.flatMap(g => g.items).map(item => <NavItem key={item.route} item={item} collapsed />)}
      </ScrollView>
    </View>
  );

  // ── Mobile bottom floating nav ────────────────────────────────────────────
  const BottomNav = () => (
    <View style={styles.bottomNav}>
      {MOBILE_TABS.map(tab => {
        const isActive = pathname === tab.route;
        return (
          <Pressable key={tab.route} style={styles.bottomTab} onPress={() => router.push(tab.route as any)}>
            <View style={[styles.bottomIconWrap, isActive && styles.bottomIconActive]}>
              <Feather name={tab.icon as any} size={19} color={isActive ? Colors.accent : Colors.textTertiary} />
            </View>
            <Text style={[styles.bottomLabel, isActive && { color: Colors.accent }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
      {/* Hamburger → opens full drawer */}
      <Pressable style={styles.bottomTab} onPress={() => setDrawerOpen(true)}>
        <View style={styles.bottomIconWrap}>
          <Feather name="menu" size={19} color={Colors.textTertiary} />
        </View>
        <Text style={styles.bottomLabel}>More</Text>
      </Pressable>
    </View>
  );

  // ── Mobile full-screen drawer ─────────────────────────────────────────────
  const Drawer = () => (
    <Modal visible={drawerOpen} animationType="slide" transparent onRequestClose={() => setDrawerOpen(false)}>
      <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerOpen(false)} />
      <View style={styles.drawer}>
        <View style={styles.drawerHeader}>
          <Logo />
          <Pressable onPress={() => setDrawerOpen(false)}>
            <Feather name="x" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {NAV.map(g => (
            <View key={g.group} style={styles.navGroup}>
              <Text style={styles.navGroupLabel}>{g.group}</Text>
              {g.items.map(item => <NavItem key={item.route} item={item} />)}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.root}>
      {/* Sidebar */}
      {isDesktop && <FullSidebar />}
      {isTablet  && <CollapsedSidebar />}

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
            sceneStyle: { backgroundColor: Colors.background },
          }}
        >
          {[
            'index','tables','bookings','delivery','customers',
            'staff-dashboard','analytics-dashboard','cloud-data',
            'today','reviews','ai-assistant','menu-editor','settings',
          ].map(name => (
            <Tabs.Screen key={name} name={name} options={{ tabBarButton: () => null }} />
          ))}
        </Tabs>

        {/* Mobile only */}
        {isMobile && <BottomNav />}
        {isMobile && <Drawer />}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: Colors.background },

  // Full sidebar (desktop)
  sidebar: {
    width: 260,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.surfaceBorder,
    paddingTop: Platform.OS === 'web' ? 24 : 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  // Icon-only sidebar (tablet)
  sidebarCollapsed: {
    width: 64,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.surfaceBorder,
    paddingTop: Platform.OS === 'web' ? 12 : 48,
    paddingBottom: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },

  // Logo
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28, paddingHorizontal: 4 },
  logoBadge: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.accentPurple, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800' },

  // Nav groups
  navGroup: { marginBottom: 24, gap: 2 },
  navGroupLabel: {
    color: Colors.textTertiary, fontSize: 10, fontWeight: '700',
    letterSpacing: 1.4, marginBottom: 6, paddingHorizontal: 8,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10,
  },
  navItemActive: { backgroundColor: Colors.accent + '22' },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0, width: 40, height: 40, borderRadius: 12, marginBottom: 2 },
  navItemText: { color: Colors.textTertiary, fontSize: 14, fontWeight: '500', flex: 1 },

  // AI promo
  aiPromo: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.surfaceBorder },
  aiGrad: { padding: 14, gap: 4 },
  aiPromoTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  aiPromoSub: { color: Colors.textTertiary, fontSize: 11 },

  // Mobile bottom nav
  bottomNav: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
    flexDirection: 'row',
    backgroundColor: 'rgba(15,23,42,0.97)',
    borderRadius: 28, paddingVertical: 6, paddingHorizontal: 2,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    ...Shadows.md,
    elevation: 12,
  },
  bottomTab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  bottomIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  bottomIconActive: { backgroundColor: Colors.accent + '25' },
  bottomLabel: { color: Colors.textTertiary, fontSize: 9, fontWeight: '600', marginTop: 2 },

  // Full-screen drawer (mobile)
  drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: '78%',
    backgroundColor: Colors.surface,
    paddingTop: Platform.OS === 'ios' ? 56 : 32,
    paddingHorizontal: 16, paddingBottom: 32,
  },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
});
