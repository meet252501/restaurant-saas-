import { Tabs, Redirect, useRouter, usePathname } from 'expo-router';
import { View, StyleSheet, ActivityIndicator, useWindowDimensions, Text, Pressable, ScrollView, Modal } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows, Typography } from '../../lib/theme';
import { trpc } from '../../lib/trpc';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 800;

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

  if (!user) {
    return <Redirect href="/login" />;
  }

  // --- Sidebar Nav Item (shared between desktop and mobile drawer) ---
  const SidebarNavItem = ({ label, icon, route, featherIcon }: { label: string; icon?: string; route: string; featherIcon?: string }) => {
    const isActive = pathname === route;
    return (
      <Pressable
        style={[styles.navItem, isActive && styles.navItemActive]}
        onPress={() => router.push(route as any)}
      >
        {featherIcon ? (
          <Feather name={featherIcon as any} size={18} color={isActive ? Colors.textPrimary : Colors.textTertiary} />
        ) : (
          <Ionicons name={icon as any} size={18} color={isActive ? Colors.textPrimary : Colors.textTertiary} />
        )}
        <Text style={[styles.navItemText, isActive && { color: Colors.textPrimary }]}>{label}</Text>
      </Pressable>
    );
  };

  // --- Navigation Content (shared between sidebar and mobile drawer) ---
  const NavigationContent = () => (
    <>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logoBadge}>
          <Ionicons name="restaurant" size={20} color={Colors.textPrimary} />
        </View>
        <Text style={styles.logoText}>TableBook</Text>
      </View>

      {/* Main Nav */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.navGroup}>
          <Text style={styles.navLabel}>MAIN MENU</Text>
          <SidebarNavItem label="Dashboard" featherIcon="grid" route="/" />
          <SidebarNavItem label="Floor Plan" featherIcon="layout" route="/tables" />
          <SidebarNavItem label="Reservations" featherIcon="calendar" route="/bookings" />
          <SidebarNavItem label="CRM" featherIcon="users" route="/customers" />
          <SidebarNavItem label="Delivery" icon="bicycle-outline" route="/delivery" />
        </View>

        <View style={[styles.navGroup, { marginTop: 24 }]}>
          <Text style={styles.navLabel}>INSIGHTS</Text>
          <SidebarNavItem label="Analytics" icon="stats-chart-outline" route="/analytics-dashboard" />
          <SidebarNavItem label="Delivery" icon="bicycle-outline" route="/delivery" />
        </View>

        <View style={[styles.navGroup, { marginTop: 24 }]}>
          <Text style={styles.navLabel}>TOOLS</Text>
          <SidebarNavItem label="Menu Editor" icon="restaurant-outline" route="/menu-editor" />
          <SidebarNavItem label="AI Assistant" icon="sparkles-outline" route="/ai-assistant" />
          <SidebarNavItem label="Cloud Data" icon="cloud-outline" route="/cloud-data" />
          <SidebarNavItem label="Settings" icon="settings-outline" route="/settings" />
        </View>
      </ScrollView>

      {/* AI Promo Card at bottom */}
      <View style={styles.aiPromo}>
        <LinearGradient colors={[Colors.accentPurple + '40', Colors.accent + '20']} style={styles.aiGradient}>
          <Feather name="cpu" size={24} color={Colors.accent} />
          <Text style={styles.aiPromoTitle}>TableBook Core</Text>
          <Text style={styles.aiPromoSub}>Local AI active.</Text>
        </LinearGradient>
      </View>
    </>
  );

  // --- Desktop Sidebar ---
  const Sidebar = () => (
    <View style={styles.sidebar}>
      <NavigationContent />
    </View>
  );

  // --- Mobile Bottom Bar with Hamburger + Quick Nav ---
  const MobileBottomBar = () => {
    const mainTabs = [
      { route: '/', icon: 'grid', iconActive: 'grid', label: 'Home' },
      { route: '/tables', icon: 'restaurant-outline', iconActive: 'restaurant', label: 'Tables' },
      { route: '/bookings', icon: 'calendar-outline', iconActive: 'calendar', label: 'Bookings' },
      { route: '/delivery', icon: 'bicycle-outline', iconActive: 'bicycle', label: 'Delivery' },
      { route: '/customers', icon: 'people-outline', iconActive: 'people', label: 'CRM' },
    ];
    
    return (
      <View style={styles.mobileBar}>
        {mainTabs.map((tab, i) => {
          const isActive = pathname === tab.route;
          return (
            <Pressable key={i} style={styles.mobileTab} onPress={() => router.push(tab.route as any)}>
              <View style={[styles.mobileIconWrap, isActive && styles.mobileIconActive]}>
                <Ionicons name={(isActive ? tab.iconActive : tab.icon) as any} size={20} color={isActive ? Colors.accent : Colors.textTertiary} />
              </View>
              <Text style={[styles.mobileTabLabel, isActive && { color: Colors.accent }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: Colors.background }}>
      {isDesktop && <Sidebar />}
      
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
            tabBarActiveTintColor: Colors.accent,
            tabBarInactiveTintColor: Colors.textTertiary,
            tabBarShowLabel: false,
            sceneStyle: { backgroundColor: Colors.background },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{ tabBarButton: () => null }}
          />
          <Tabs.Screen
            name="tables"
            options={{ tabBarButton: () => null }}
          />
          <Tabs.Screen
            name="bookings"
            options={{ tabBarButton: () => null }}
          />
          <Tabs.Screen
            name="delivery"
            options={{ tabBarButton: () => null }}
          />
          <Tabs.Screen
            name="customers"
            options={{ tabBarButton: () => null }}
          />
          <Tabs.Screen
            name="staff-dashboard"
            options={{ tabBarButton: () => null }}
          />
          <Tabs.Screen
            name="analytics-dashboard"
            options={{ tabBarButton: () => null }}
          />
        </Tabs>

        {/* Mobile Bottom Navigation */}
        {!isDesktop && <MobileBottomBar />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Mobile Bottom Bar ---
  mobileBar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(18, 22, 32, 0.97)',
    borderRadius: 28,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  mobileTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  mobileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileIconActive: {
    backgroundColor: Colors.accent + '20',
  },
  mobileTabLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginTop: 2,
    letterSpacing: 0.3,
  },

  // --- Sidebar (Desktop) ---
  sidebar: {
    width: 260,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.surfaceBorder,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32, paddingHorizontal: 8 },
  logoBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.accentPurple, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  navGroup: { gap: 4 },
  navLabel: { color: Colors.textTertiary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginTop: 4, paddingHorizontal: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10 },
  navItemActive: { backgroundColor: Colors.surfaceBorder },
  navItemText: { color: Colors.textTertiary, fontSize: 14, fontWeight: '500' },
  aiPromo: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.surfaceBorder, marginTop: 12 },
  aiGradient: { padding: 16, gap: 6 },
  aiPromoTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 4 },
  aiPromoSub: { color: Colors.textTertiary, fontSize: 12 },
});
