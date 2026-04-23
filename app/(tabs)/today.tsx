import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Platform, RefreshControl, Share, Alert,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { trpc, RESTAURANT_ID } from '../../lib/trpc';
import { useResponsive } from '../../lib/useResponsive';
import { saveAs } from 'file-saver';
import { Colors, Shadows, Radius } from '../../lib/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

function greetingByHour() {
  const h = new Date().getHours();
  if (h < 12) return '☀️ Good Morning';
  if (h < 17) return '🌤️ Good Afternoon';
  return '🌙 Good Evening';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({ label, value, sub, color = '#818cf8', icon, trend }: {
  label: string; value: string; sub?: string;
  color?: string; icon: string; trend?: string;
}) {
  const isPos = !trend || trend.startsWith('+') || trend === '—';
  return (
    <View style={[kpi.card, { borderTopColor: color }]}>
      <View style={[kpi.iconWrap, { backgroundColor: color + '22' }]}>
        <Feather name={icon as any} size={14} color={color} />
      </View>
      <Text style={kpi.value}>{value}</Text>
      <Text style={kpi.label}>{label}</Text>
      {trend ? <Text style={[kpi.trend, { color: isPos ? '#34d399' : '#f87171' }]}>{trend}</Text> : null}
      {sub && !trend ? <Text style={[kpi.sub, { color }]}>{sub}</Text> : null}
    </View>
  );
}

function MiniBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={bar.label}>{label}</Text>
        <Text style={[bar.val, { color }]}>{value}</Text>
      </View>
      <View style={bar.track}>
        <View style={[bar.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function StatusRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={donut.row}>
      <View style={[donut.dot, { backgroundColor: color }]} />
      <Text style={donut.label}>{label}</Text>
      <Text style={[donut.count, { color }]}>{value}</Text>
    </View>
  );
}

function SectionCard({ title, children, flex }: {
  title: string; children: React.ReactNode; flex?: number;
}) {
  return (
    <View style={[sc.card, flex !== undefined && { flex }]}>
      <Text style={sc.title}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const { width } = useWindowDimensions();
  const { isMobile, isDesktop } = useResponsive();
  const [exporting, setExporting] = useState<'xlsx' | 'csv' | null>(null);

  // Chart width based on layout
  const chartW = isDesktop
    ? Math.floor((width - 260 - 80) * 0.55)   // ~55% of content area
    : width - 48;

  // ── tRPC queries ────────────────────────────────────────────────────────────
  const { data, isLoading, error, refetch, isRefetching } =
    trpc.dailySnapshot.getSnapshot.useQuery(
      { restaurantId: RESTAURANT_ID },
      { refetchInterval: 60000, retry: 1 }
    );

  const { data: kpiData } = trpc.analytics.todayKPIs.useQuery(
    { restaurantId: RESTAURANT_ID },
    { retry: 1 }
  );

  const { data: trendsData } = trpc.analytics.thirtyDayTrends.useQuery(
    { restaurantId: RESTAURANT_ID },
    { retry: 1 }
  );

  const { data: perfData } = trpc.analytics.performanceMetrics.useQuery(
    { restaurantId: RESTAURANT_ID, days: 30 },
    { retry: 1 }
  );

  const { data: topCx } = trpc.analytics.topCustomers.useQuery(
    { restaurantId: RESTAURANT_ID, limit: 5 },
    { retry: 1 }
  );

  // ── Derived chart data ───────────────────────────────────────────────────────
  const stableFallback = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => ({
      date: `Apr ${15 + i}`,
      revenue: `${8000 + i * 800}`,
      bookings: 20 + i * 2,
    })), []);

  const trends = trendsData ?? stableFallback;
  const trendLabels  = trends.slice(-7).map((d: any) => d.date?.split('-')[2] ?? d.date);
  const trendRevenue = trends.slice(-7).map((d: any) => parseInt(d.revenue ?? '0'));
  const trendBook    = trends.slice(-7).map((d: any) => d.bookings ?? 0);

  const kpis = kpiData ?? { totalRevenue: 0, occupancyRate: 0, noShowRate: 0, totalBookings: 0, totalGuests: 0 };

  const platformMax = useMemo(() => {
    if (!data) return 1;
    const { zomato, swiggy, direct } = data.platformSplit;
    return Math.max(zomato, swiggy, direct, 1);
  }, [data]);

  // ── Chart config ─────────────────────────────────────────────────────────────
  const chartCfg = {
    backgroundColor: '#0d1117',
    backgroundGradientFrom: '#0d1117',
    backgroundGradientTo: '#0d1117',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(129,140,248,${opacity})`,
    labelColor: (opacity = 1) => `rgba(100,116,139,${opacity})`,
    style: { borderRadius: 12 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#818cf8' },
  };
  const barChartCfg = {
    ...chartCfg,
    color: (opacity = 1) => `rgba(52,211,153,${opacity})`,
  };

  // ── Loading / error ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#818cf8" />
        <Text style={styles.loadingText}>Loading today's snapshot…</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Feather name="alert-circle" size={40} color="#f87171" />
        <Text style={[styles.loadingText, { color: '#f87171', marginTop: 12, fontSize: 15 }]}>
          Could not load today's data
        </Text>
        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }]}>
          {error?.message ?? 'Make sure the server is running.'}
        </Text>
        <Pressable
          style={{ marginTop: 20, backgroundColor: '#4338ca', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}
          onPress={() => refetch()}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const snap = data;

  // ── Export helpers ────────────────────────────────────────────────────────────
  const buildRows = () => [
    ['Field', 'Value'],
    ['Date', snap.date],
    ['Total Revenue (₹)', snap.totalRevenue],
    ['Dining Revenue (₹)', snap.diningRevenue],
    ['Delivery Revenue (₹)', snap.deliveryRevenue],
    ['Total Bookings', snap.totalBookings],
    ['Pending Bookings', snap.pendingBookings],
    ['Total Covers', snap.totalCovers],
    ['Walk-in Bookings', snap.walkinBookings],
    ['Total Orders', snap.totalOrders],
    ['Pending Orders', snap.pendingOrders],
    ['Avg Order Value (₹)', snap.avgOrderValue],
    ['Peak Hour', snap.peakHour ?? '—'],
    [],
    ['Platform', 'Orders'],
    ['Zomato', snap.platformSplit.zomato],
    ['Swiggy', snap.platformSplit.swiggy],
    ['Direct', snap.platformSplit.direct],
    [],
    ['Metric', 'Value'],
    ['Completion Rate (%)', perfData?.completionRate ?? '—'],
    ['No-Show Rate (%)', perfData?.noShowRate ?? '—'],
    ['Cancellation Rate (%)', perfData?.cancellationRate ?? '—'],
    ['Avg Party Size', perfData?.averagePartySize ?? '—'],
  ];

  const triggerWebDownload = (blob: Blob, filename: string) => {
    saveAs(blob, filename);
  };

  const exportExcel = async () => {
    try {
      setExporting('xlsx');
      const rows = buildRows();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Today');
      
      const safeDate = snap.date.split('T')[0]; // Removes time/colons
      const filename = `tablebook_today_${safeDate}.xlsx`;

      if (Platform.OS === 'web') {
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        triggerWebDownload(blob, filename);
      } else {
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const path = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(path, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Export Excel Report' });
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not create Excel file.');
    } finally {
      setExporting(null);
    }
  };

  const exportCSV = async () => {
    try {
      setExporting('csv');
      const rows = buildRows();
      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      
      const safeDate = snap.date.split('T')[0]; // Removes time/colons
      const filename = `tablebook_today_${safeDate}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        triggerWebDownload(blob, filename);
      } else {
        const path = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export CSV Report' });
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not create CSV file.');
    } finally {
      setExporting(null);
    }
  };

  // ── Share report ─────────────────────────────────────────────────────────────
  const shareReport = async () => {
    const report = [
      `📊 TableBook — Daily Report`,
      `Date: ${snap.date}`,
      ``,
      `── Today's Numbers ──`,
      `Revenue: ${fmt(snap.totalRevenue)}`,
      `Bookings: ${snap.totalBookings}  |  Covers: ${snap.totalCovers}`,
      `Delivery Orders: ${snap.totalOrders}`,
      `Walk-ins: ${snap.walkinBookings}`,
      `Peak Hour: ${snap.peakHour ?? '—'}`,
      ``,
      `── Delivery Platforms ──`,
      `Zomato: ${snap.platformSplit.zomato}  Swiggy: ${snap.platformSplit.swiggy}  Direct: ${snap.platformSplit.direct}`,
      ``,
      `── 30-Day Metrics ──`,
      `Completion Rate: ${perfData?.completionRate ?? '—'}%`,
      `No-Show Rate: ${perfData?.noShowRate ?? '—'}%`,
      `Avg Party Size: ${perfData?.averagePartySize ?? '—'}`,
      ``,
      `Powered by TableBook`,
    ].join('\n');
    try { await Share.share({ message: report, title: 'Daily Report' }); }
    catch { Alert.alert('Report', report); }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: isMobile ? 100 : 60 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#818cf8" />}
    >
      {/* ── Header ── */}
      <LinearGradient colors={['#0f172a', '#1e1b4b']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greetingByHour()}</Text>
            <Text style={styles.dateText}>{formatDate(snap.date)}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              style={[styles.iconBtn, isRefetching && { opacity: 0.5 }]}
              onPress={() => {
                refetch();
              }}
            >
              {isRefetching
                ? <ActivityIndicator size={14} color="#818cf8" />
                : <Feather name="refresh-cw" size={15} color="#818cf8" />}
            </Pressable>
          </View>
        </View>
        <Text style={styles.subText}>🔄 Live · auto-refreshes every 60s · resets at midnight</Text>
      </LinearGradient>

      {/* ── Export Action Bar ── */}
      <View style={styles.exportBar}>
        <Pressable
          style={[styles.exportBtn, { backgroundColor: '#166534' }, exporting === 'xlsx' && { opacity: 0.7 }]}
          onPress={exportExcel}
          disabled={exporting !== null}
        >
          {exporting === 'xlsx'
            ? <ActivityIndicator size={14} color="#fff" />
            : <Feather name="file-text" size={14} color="#fff" />}
          <Text style={styles.exportBtnText}>Excel</Text>
        </Pressable>

        <Pressable
          style={[styles.exportBtn, { backgroundColor: '#1e40af' }, exporting === 'csv' && { opacity: 0.7 }]}
          onPress={exportCSV}
          disabled={exporting !== null}
        >
          {exporting === 'csv'
            ? <ActivityIndicator size={14} color="#fff" />
            : <Feather name="database" size={14} color="#fff" />}
          <Text style={styles.exportBtnText}>CSV</Text>
        </Pressable>

        <Pressable
          style={[styles.exportBtn, { backgroundColor: '#4338ca' }]}
          onPress={shareReport}
        >
          <Feather name="share-2" size={14} color="#fff" />
          <Text style={styles.exportBtnText}>Share</Text>
        </Pressable>
      </View>

      {/* ── Revenue banner ── */}
      <LinearGradient colors={['#312e81', '#1e1b4b']} style={styles.revBanner}>
        <View>
          <Text style={styles.revLabel}>Total Revenue Today</Text>
          <Text style={styles.revValue}>{fmt(snap.totalRevenue)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.revSub}>🍽️ Dining  {fmt(snap.diningRevenue)}</Text>
          <Text style={styles.revSub}>🛵 Delivery  {fmt(snap.deliveryRevenue)}</Text>
        </View>
      </LinearGradient>

      {/* ── KPI Grid ── */}
      <View style={styles.kpiGrid}>
        <KPICard label="Bookings"   value={String(snap.totalBookings)}  sub={`${snap.pendingBookings} pending`}  color="#818cf8" icon="calendar" />
        <KPICard label="Covers"     value={String(snap.totalCovers)}     color="#34d399" icon="users" />
        <KPICard label="Orders"     value={String(snap.totalOrders)}     sub={`${snap.pendingOrders} active`}    color="#f59e0b" icon="package" />
        <KPICard label="Avg Order"  value={fmt(snap.avgOrderValue)}      color="#38bdf8" icon="trending-up" />
        <KPICard label="Walk-ins"   value={String(snap.walkinBookings)}  color="#a78bfa" icon="user-plus" />
        <KPICard label="Occupancy"  value={`${kpis.occupancyRate}%`}    color="#10b981" icon="pie-chart" />
        <KPICard label="No-Show"    value={`${kpis.noShowRate}%`}       color="#f87171" icon="x-circle" />
        <KPICard label="Peak Hour"  value={snap.peakHour ?? '—'}        color="#fb923c" icon="zap" />
      </View>

      {/* ── Charts row ── */}
      <View style={isDesktop ? styles.desktopRow : undefined}>

        {/* 7-Day Revenue Line Chart */}
        <View style={[sc.card, isDesktop && { flex: 3 }]}>
          <Text style={sc.title}>📈 7-Day Revenue Trend</Text>
          <LineChart
            data={{ labels: trendLabels, datasets: [{ data: trendRevenue.length > 0 ? trendRevenue : [0], strokeWidth: 2 }] }}
            width={chartW}
            height={180}
            chartConfig={chartCfg}
            bezier
            style={styles.chart}
            withDots
            withShadow={false}
          />
        </View>

        {/* 7-Day Bookings Bar Chart */}
        <View style={[sc.card, isDesktop && { flex: 2 }]}>
          <Text style={sc.title}>📅 7-Day Bookings</Text>
          <BarChart
            data={{ labels: trendLabels, datasets: [{ data: trendBook.length > 0 ? trendBook : [0] }] }}
            width={isDesktop ? Math.floor((width - 260 - 80) * 0.37) : chartW}
            height={180}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={barChartCfg}
            style={styles.chart}
          />
        </View>
      </View>

      {/* ── Booking status + Delivery side by side ── */}
      <View style={isDesktop ? styles.desktopRow : undefined}>

        {/* Booking Status */}
        {snap.statusBreakdown.length > 0 && (
          <SectionCard title="🎯 Today's Booking Status" flex={isDesktop ? 2 : undefined}>
            {snap.statusBreakdown.map(s => (
              <StatusRow key={s.label} label={s.label} value={s.value} color={s.color} />
            ))}
          </SectionCard>
        )}

        {/* Delivery Platforms */}
        <SectionCard title="🛵 Delivery Platform Split" flex={isDesktop ? 2 : undefined}>
          <MiniBar label="Zomato" value={snap.platformSplit.zomato} max={platformMax} color="#e23744" />
          <MiniBar label="Swiggy" value={snap.platformSplit.swiggy} max={platformMax} color="#f97316" />
          <MiniBar label="Direct" value={snap.platformSplit.direct} max={platformMax} color="#34d399" />
        </SectionCard>

        {/* 30-Day Performance */}
        {perfData && (
          <SectionCard title="⚡ 30-Day Performance" flex={isDesktop ? 3 : undefined}>
            {[
              { label: 'Completion Rate', value: `${perfData.completionRate}%`, icon: 'check-circle', color: '#34d399' },
              { label: 'No-Show Rate',    value: `${perfData.noShowRate}%`,     icon: 'x-circle',     color: '#f87171' },
              { label: 'Cancellation',    value: `${perfData.cancellationRate}%`,icon: 'trash-2',     color: '#f59e0b' },
              { label: 'Avg Party Size',  value: String(perfData.averagePartySize), icon: 'users',   color: '#818cf8' },
            ].map(m => (
              <View key={m.label} style={perf.row}>
                <Feather name={m.icon as any} size={14} color={m.color} />
                <Text style={perf.label}>{m.label}</Text>
                <Text style={[perf.val, { color: m.color }]}>{m.value}</Text>
              </View>
            ))}
          </SectionCard>
        )}
      </View>

      {/* ── Top Customers ── */}
      {topCx && topCx.length > 0 && (
        <SectionCard title="🏆 Top Customers (30 Days)">
          {topCx.map((c: any, i: number) => (
            <View key={c.customerId} style={cx.row}>
              <View style={cx.rank}><Text style={cx.rankNum}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={cx.name}>{c.name}</Text>
                <Text style={cx.phone}>{c.phone}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={cx.visits}>{c.visitCount} visits</Text>
                <Text style={cx.spent}>₹{c.totalSpent}</Text>
              </View>
            </View>
          ))}
        </SectionCard>
      )}

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Feather name="info" size={12} color="#334155" />
        <Text style={styles.footerText}>
          All data is live from local storage. At midnight, it is archived to cloud and reset for a fresh day.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#020617' },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  loadingText: { color: '#64748b', marginTop: 16, fontSize: 14 },

  header:    { padding: 20, paddingTop: Platform.OS === 'ios' ? 56 : 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting:  { color: '#e2e8f0', fontSize: 20, fontWeight: '700' },
  dateText:  { color: '#64748b', fontSize: 13, marginTop: 2 },
  subText:   { color: '#475569', fontSize: 11, marginTop: 10 },
  iconBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e1b4b', justifyContent: 'center', alignItems: 'center' },

  exportBar: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 16 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  exportBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  revBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginTop: 16, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: '#4338ca33',
  },
  revLabel: { color: '#a5b4fc', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  revValue: { color: '#fff', fontSize: 30, fontWeight: '800' },
  revSub:   { color: '#94a3b8', fontSize: 12, marginTop: 3 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 16, marginTop: 16 },

  desktopRow: { flexDirection: 'row', alignItems: 'flex-start' },

  chart: { borderRadius: 12, marginTop: 8 },

  footer:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginHorizontal: 20, marginTop: 24 },
  footerText: { color: '#334155', fontSize: 11, flex: 1, lineHeight: 17 },
});

// Section card styles
const sc = StyleSheet.create({
  card:  { backgroundColor: '#0d1117', borderRadius: 16, padding: 16, margin: 8, marginTop: 12, borderWidth: 1, borderColor: '#1e293b' },
  title: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 14 },
});

const kpi = StyleSheet.create({
  card:    { width: '22%', flexGrow: 1, backgroundColor: '#0d1117', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1e293b', borderTopWidth: 2, alignItems: 'center', gap: 4, margin: 0 },
  iconWrap:{ width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  value:   { color: '#e2e8f0', fontSize: 20, fontWeight: '800' },
  label:   { color: '#64748b', fontSize: 10, textAlign: 'center' },
  sub:     { fontSize: 9, fontWeight: '600' },
  trend:   { fontSize: 10, fontWeight: '700' },
});

const bar = StyleSheet.create({
  label: { color: '#94a3b8', fontSize: 12 },
  val:   { fontSize: 12, fontWeight: '700' },
  track: { height: 6, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' },
  fill:  { height: 6, borderRadius: 3 },
});

const donut = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dot:   { width: 10, height: 10, borderRadius: 5 },
  label: { color: '#94a3b8', fontSize: 13, flex: 1 },
  count: { fontSize: 14, fontWeight: '700' },
});

const perf = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  label: { color: '#94a3b8', fontSize: 13, flex: 1 },
  val:   { fontSize: 13, fontWeight: '700' },
});

const cx = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  rank:   { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4338ca', justifyContent: 'center', alignItems: 'center' },
  rankNum:{ color: '#fff', fontSize: 12, fontWeight: '700' },
  name:   { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  phone:  { color: '#64748b', fontSize: 11 },
  visits: { color: '#64748b', fontSize: 11 },
  spent:  { color: '#34d399', fontSize: 13, fontWeight: '700' },
});
