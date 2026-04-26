import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Pressable, useWindowDimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { trpc, RESTAURANT_ID } from '../../lib/trpc';
import { Colors, Shadows } from '../../lib/theme';
import { useFadeIn, usePulse, useStaggeredFadeIn } from '../../lib/animations';
import { QuickAccessButton } from '../../components/QuickAccessMenu';
import { useOfflineBookings } from '../../utils/useOfflineBookings';
import { useOfflineDelivery } from '../../utils/useOfflineDelivery';

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 800;
  const router = useRouter();

  // ── Real Data Queries ──────────────────────────────
  const { data: metrics } = trpc.analytics.todayKPIs.useQuery(undefined, { retry: 0 });
  const { data: trends } = trpc.analytics.thirtyDayTrends.useQuery(undefined, { retry: 0 });
  const { data: revenueData } = trpc.analytics.revenueAnalysis.useQuery({ days: 7 }, { retry: 0 });
  
  const { orders: deliveryOrders, summary: deliverySummary, isOfflineMode: deliveryOffline } = useOfflineDelivery();
  
  const today = new Date().toISOString().split('T')[0];
  const { bookings: bookingsList, isOfflineMode: bookingsOffline } = useOfflineBookings(today);

  const cardWidth = isDesktop ? undefined : (width - 48) / 2; // exact 2-col width

  // ── Computed KPIs ──────────────────────────────────
  const s = metrics || {
    totalRevenue: 0, occupancyRate: 0, noShowRate: 0,
    totalBookings: 0, totalGuests: 0, peakHour: 'N/A',
    busyTables: 0, availableTables: 0,
  };

  // ── Revenue Chart Data (last 7 days) ────────────────
  const chartData = useMemo(() => {
    if (!trends || trends.length === 0) {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
          revenue: 0,
          bookings: 0,
        };
      });
    }
    return trends.slice(-7).map((d: any) => {
      const revenue = parseInt(d.revenue || '0');
      const bookings = d.bookings || 0;
      return {
        day: new Date(d.date || Date.now()).toLocaleDateString('en-IN', { weekday: 'short' }),
        revenue: isNaN(revenue) ? 0 : revenue,
        bookings: isNaN(bookings) ? 0 : bookings,
      };
    });
  }, [trends]);

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);
  const maxBookings = Math.max(...chartData.map(d => d.bookings), 1);

  // ── Recent Activity ────────────────────────────────
  const recentActivity = useMemo(() => {
    if (!bookingsList || bookingsList.length === 0) {
      return [];
    }
    const statusColors: Record<string, string> = {
      confirmed: Colors.accent, seated: Colors.available,
      done: Colors.textTertiary, no_show: Colors.error, cancelled: '#ef4444',
    };
    return bookingsList.slice(0, 5).map((b: any) => {
      const createdAt = b.createdAt ? new Date(b.createdAt).getTime() : Date.now();
      const diff = Date.now() - createdAt;
      const mins = Math.floor(Math.max(diff, 0) / 60000);
      return {
        id: `TBL-${b.tableId?.slice(-2) || '00'}`,
        action: `${b.status === 'done' ? 'Done' : b.status === 'seated' ? 'Seated' : 'Confirmed'} • ${b.partySize} pax`,
        time: mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h`,
        color: statusColors[b.status] || Colors.textTertiary,
      };
    });
  }, [bookingsList]);

  // ── Delivery Stats ─────────────────────────────────
  const deliveryStats = useMemo(() => {
    return {
      total: deliverySummary?.total || 0,
      revenue: deliverySummary?.revenue || 0,
    };
  }, [deliverySummary]);



  // ── Revenue Sources ────────────────────────────────
  const revSources = revenueData?.revenueBySource && revenueData.revenueBySource.length > 0
    ? revenueData.revenueBySource.map((src: any) => ({
        source: src.source, revenue: Number(src.revenue), pct: parseFloat(src.percentage || '0'),
      }))
    : [];
  const srcColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

  // ── Animations ─────────────────────────────────────
  const kpiAnim = useStaggeredFadeIn(4, 100, 500);
  const chartAnim = useFadeIn(600, 300);
  const activityAnim = useFadeIn(600, 500);
  const bottomAnim = useFadeIn(600, 600);
  const pulse = usePulse(1800);

  const renderKpiCard = (label: string, value: string, icon: string, color: string, index: number) => (
    <Animated.View key={label} style={[
      styles.kpiCard,
      isDesktop ? { flex: 1 } : { width: cardWidth },
      { opacity: kpiAnim.opacities[index], transform: [{ translateY: kpiAnim.translates[index] }] },
    ]}>
      <View style={{ padding: 18 }}>
        <View style={styles.kpiTop}>
          <View style={[styles.kpiIconBox, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon as any} size={24} color={color} />
          </View>
          <View>
            <Text style={styles.kpiValue}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
          </View>
        </View>
        <View style={styles.kpiTrend}>
          <Ionicons name="trending-up" size={12} color={color} />
          <Text style={[styles.kpiTrendText, { color }]}>+12% vs last week</Text>
        </View>
        <View style={[styles.kpiIndicator, { backgroundColor: color }]} />
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#090B10' }]} />
      

      <View style={styles.main}>
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: isDesktop ? 32 : 16, paddingVertical: isDesktop ? 24 : 16 }]}>

          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={[styles.pageTitle, !isDesktop && { fontSize: 22 }]}>Dashboard</Text>
              {(bookingsOffline || deliveryOffline) && (
                <View style={styles.offlineBadge}>
                  <Ionicons name="cloud-offline-outline" size={12} color="#fff" />
                  <Text style={styles.offlineBadgeText}>OFFLINE MODE</Text>
                </View>
              )}
            </View>
            <Text style={styles.pageSub}>{formatDate(today).toUpperCase()}</Text>
          </View>
          <QuickAccessButton />
        </View>



        {/* Scrollable Content */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: isDesktop ? 24 : 16,
            gap: isDesktop ? 20 : 14,
            paddingBottom: isDesktop ? 32 : 100,
          }}
        >
          {/* ── KPI Cards ── */}
          <View style={[styles.kpiRow, !isDesktop && { flexWrap: 'wrap' }]}>
            {renderKpiCard('Revenue', `₹${Number(s.totalRevenue || 0).toLocaleString('en-IN')}`, 'wallet-outline', Colors.available, 0)}
            {renderKpiCard('Bookings', `${s.totalBookings || 0}`, 'calendar-outline', Colors.accent, 1)}
            {renderKpiCard('Covers', `${s.totalGuests || 0}`, 'people-outline', Colors.accentPurple, 2)}
            {renderKpiCard('Delivery', `${deliveryStats.total}`, 'bicycle-outline', '#f97316', 3)}
          </View>

          {/* ── Quick Actions Row ── */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              style={({ pressed }) => [
                styles.actionCTA,
                pressed && { transform: [{ scale: 0.98 }] }
              ]}
              onPress={() => router.push('/new-booking')}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1e293b' }]} />
              <Ionicons name="add-circle-outline" size={22} color={Colors.accent} />
              <Text style={styles.actionCTAText}>New Booking</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionCTA,
                pressed && { transform: [{ scale: 0.98 }] }
              ]}
              onPress={() => router.push('/menu-editor')}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1e293b' }]} />
              <Ionicons name="restaurant-outline" size={20} color={Colors.accentPurple} />
              <Text style={[styles.actionCTAText, { color: Colors.accentPurple }]}>Edit Menu</Text>
            </Pressable>
          </View>

          {/* ── Chart + Activity Row ── */}
          <View style={[styles.row, !isDesktop && { flexDirection: 'column' }]}>
            {/* 7-Day Revenue Chart */}
            <Animated.View style={[styles.card, isDesktop ? { flex: 2 } : {}, { opacity: chartAnim.opacity, transform: [{ translateY: chartAnim.translateY }] }]}>
              <View style={styles.cardHead}>
                <View>
                  <Text style={styles.cardTitle}>Dashboard</Text>
                  <Text style={styles.cardSub}>₹{chartData.reduce((a, d) => a + d.revenue, 0).toLocaleString('en-IN')} total</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent }} />
                    <Text style={{ color: Colors.textTertiary, fontSize: 10 }}>Revenue</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accentPurple }} />
                    <Text style={{ color: Colors.textTertiary, fontSize: 10 }}>Bookings</Text>
                  </View>
                </View>
              </View>

              {/* Chart */}
              {(() => {
                const chartH = isDesktop ? 240 : 180;
                const labelArea = 28; // space for day labels below bars
                const barArea = chartH - labelArea;
                return (
                  <View style={{ height: chartH, flexDirection: 'row' }}>
                    {/* Y Axis (Revenue) */}
                    <View style={{ width: isDesktop ? 45 : 35, justifyContent: 'space-between', paddingBottom: labelArea }}>
                      <Text style={styles.yTxt}>₹{(maxRevenue / 1000).toFixed(1)}k</Text>
                      <Text style={styles.yTxt}>₹{(maxRevenue / 2000).toFixed(1)}k</Text>
                      <Text style={styles.yTxt}>₹0</Text>
                    </View>
                    
                    {/* Bars */}
                    <View style={{ flex: 1, position: 'relative' }}>
                      {/* Grid lines */}
                      <View style={[styles.gridLn, { top: 0 }]} />
                      <View style={[styles.gridLn, { top: barArea / 2 }]} />
                      <View style={[styles.gridLn, { top: barArea }]} />

                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: labelArea }}>
                        {chartData.map((d, i) => {
                          const revH = Math.max((d.revenue / maxRevenue) * barArea, 4);
                          const bookH = Math.max((d.bookings / maxBookings) * barArea, 4);
                          return (
                            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                                <View
                                  style={{ width: isDesktop ? 16 : 12, height: revH, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: Colors.accent }}
                                />
                                <View
                                  style={{ width: isDesktop ? 10 : 7, height: bookH, borderTopLeftRadius: 4, borderTopRightRadius: 4, opacity: 0.9, backgroundColor: Colors.accentPurple }}
                                />
                              </View>
                              <Text style={{ color: Colors.textTertiary, fontSize: 9, marginTop: 6 }}>{d.day}</Text>
                              <Text style={{ color: Colors.textSecondary, fontSize: 8, fontWeight: '600' }}>₹{(d.revenue / 1000).toFixed(1)}k</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {/* Y Axis (Bookings) - Right side */}
                    <View style={{ width: isDesktop ? 30 : 25, justifyContent: 'space-between', paddingBottom: labelArea, alignItems: 'flex-end' }}>
                      <Text style={[styles.yTxt, { color: Colors.accentPurple }]}>{maxBookings}</Text>
                      <Text style={[styles.yTxt, { color: Colors.accentPurple }]}>{Math.floor(maxBookings / 2)}</Text>
                      <Text style={[styles.yTxt, { color: Colors.accentPurple }]}>0</Text>
                    </View>
                  </View>
                );
              })()}
            </Animated.View>

            {/* Recent Activity */}
            <Animated.View style={[styles.card, isDesktop ? { flex: 1 } : {}, { opacity: activityAnim.opacity, transform: [{ translateY: activityAnim.translateY }] }]}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>Activity</Text>
                <Text style={styles.cardSub}>{recentActivity.length} today</Text>
              </View>
              <View style={{ gap: 14 }}>
                {recentActivity.map((a: any, i: any) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: a.color }}>
                      <Animated.View style={{ 
                        position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: a.color, 
                        opacity: pulse.opacity as any, transform: [{ scale: pulse.scale }] as any 
                      }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.textPrimary, fontSize: 13, fontWeight: '600' }}>{a.id}</Text>
                      <Text style={{ color: Colors.textTertiary, fontSize: 11 }}>{a.action}</Text>
                    </View>
                    <Text style={{ color: Colors.textTertiary, fontSize: 11 }}>{a.time}</Text>
                  </View>
                ))}
              </View>
              {/* Quick Stats */}
              <View style={{ flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.surfaceBorder }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: Colors.textPrimary, fontSize: 15, fontWeight: '700' }}>{(s as any).peakHour || 'N/A'}</Text>
                  <Text style={{ color: Colors.textTertiary, fontSize: 9 }}>Peak</Text>
                </View>
                <View style={{ width: 1, backgroundColor: Colors.surfaceBorder }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: Colors.textPrimary, fontSize: 15, fontWeight: '700' }}>{s.busyTables || 0}</Text>
                  <Text style={{ color: Colors.textTertiary, fontSize: 9 }}>Busy</Text>
                </View>
                <View style={{ width: 1, backgroundColor: Colors.surfaceBorder }} />
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: Colors.textPrimary, fontSize: 15, fontWeight: '700' }}>{s.availableTables || 0}</Text>
                  <Text style={{ color: Colors.textTertiary, fontSize: 9 }}>Free</Text>
                </View>
              </View>
            </Animated.View>
          </View>

          {/* ── Revenue Sources + Delivery ── */}
          <View style={[styles.row, !isDesktop && { flexDirection: 'column' }]}>
            {/* Revenue by Source */}
            <Animated.View style={[styles.card, isDesktop ? { flex: 1 } : {}, { opacity: bottomAnim.opacity, transform: [{ translateY: bottomAnim.translateY }] }]}>
              <Text style={[styles.cardTitle, { marginBottom: 14 }]}>Revenue Sources</Text>
              <View style={{ gap: 14 }}>
                {revSources.map((src: any, i: number) => (
                  <View key={i}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: srcColors[i % srcColors.length] }} />
                        <Text style={{ color: Colors.textSecondary, fontSize: 13, fontWeight: '500' }}>{src.source}</Text>
                      </View>
                      <Text style={{ color: Colors.textTertiary, fontSize: 12 }}>₹{src.revenue.toLocaleString('en-IN')} ({src.pct}%)</Text>
                    </View>
                    <View style={styles.progressBg}>
                        <View
                          style={[styles.progressFill, { width: `${Math.max(src.pct, 5)}%`, backgroundColor: srcColors[i % srcColors.length] }]}
                        />
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Delivery Summary */}
            <Animated.View style={[styles.card, isDesktop ? { flex: 1 } : {}, { opacity: bottomAnim.opacity, transform: [{ translateY: bottomAnim.translateY }] }]}>
              <Text style={[styles.cardTitle, { marginBottom: 14 }]}>Delivery & Stats</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { icon: 'receipt-outline', val: `${deliveryStats.total}`, lbl: 'Orders', clr: '#f97316' },
                  { icon: 'cash-outline', val: `₹${deliveryStats.revenue.toLocaleString('en-IN')}`, lbl: 'Revenue', clr: '#10b981' },
                  { icon: 'time-outline', val: `${(s as any).peakHour || '7 PM'}`, lbl: 'Peak Hour', clr: Colors.accent },
                  { icon: 'pie-chart-outline', val: `${s.occupancyRate}%`, lbl: 'Occupancy', clr: Colors.accentPurple },
                ].map((st, i) => (
                  <View key={i} style={styles.miniStat}>
                    <View style={[styles.miniStatAccent, { backgroundColor: st.clr }]} />
                    <View style={{ flex: 1, paddingVertical: 12, paddingRight: 12, paddingLeft: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: st.clr + '18', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name={st.icon as any} size={15} color={st.clr} />
                        </View>
                        <Text style={{ color: Colors.textTertiary, fontSize: 11, fontWeight: '500' }}>{st.lbl}</Text>
                      </View>
                      <Text style={{ color: Colors.textPrimary, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }}>{st.val}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  bgGlow: { position: 'absolute', width: 400, height: 400, borderRadius: 200 },
  main: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  pageTitle: { color: Colors.textPrimary, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  offlineBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 4, 
    backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, 
    borderRadius: 10 
  },
  offlineBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  pageSub: { color: Colors.textTertiary, fontSize: 12, marginTop: 2 },
  profileBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },

  // KPI Row
  kpiRow: { flexDirection: 'row', gap: 12 },
  kpiCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  kpiTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  kpiIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { color: Colors.textTertiary, fontSize: 12, fontWeight: '600' },
  kpiValue: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800' },
  kpiIndicator: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, opacity: 0.8 },

  // Cards
  row: { flexDirection: 'row', gap: 14 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  kpiTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  kpiTrendText: { fontSize: 10, fontWeight: '700' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  cardSub: { color: Colors.textTertiary, fontSize: 11, marginTop: 2 },

  // Chart
  yTxt: { color: Colors.textTertiary, fontSize: 9, textAlign: 'right' },
  gridLn: { position: 'absolute' as any, left: 0, right: 0, height: 1, backgroundColor: Colors.surfaceBorder },

  // Revenue Sources
  progressBg: { height: 6, backgroundColor: Colors.surfaceBorder, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  // Delivery mini stat
  miniStat: {
    backgroundColor: '#1e293b', borderRadius: 12,
    flexDirection: 'row' as const, overflow: 'hidden' as const,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
    flexBasis: '47%', flexGrow: 1,
  },
  miniStatAccent: {
    width: 4, borderTopLeftRadius: 12, borderBottomLeftRadius: 12,
  },

  // Mobile Menu
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  menuSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40,
    borderWidth: 1, borderColor: Colors.surfaceBorder, borderBottomWidth: 0,
  },
  menuHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.surfaceBorder, alignSelf: 'center', marginBottom: 20 },
  menuTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder,
  },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuItemText: { flex: 1, color: Colors.textPrimary, fontSize: 15, fontWeight: '500' },

  // Walk-in Quick Action
  walkinBtn: {
    flex: 1,
    flexDirection: 'row' as const, alignItems: 'center', gap: 12,
    backgroundColor: Colors.accent, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  walkinIconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#ffffff25',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  walkinTitle: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  walkinSub:   { color: '#ffffff90', fontSize: 10, marginTop: 1 },

  actionCTA: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  actionCTAText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
