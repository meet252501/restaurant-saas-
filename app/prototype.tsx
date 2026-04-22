import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Dimensions, Pressable } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const isDesktop = width > 800;

// Hyper-modern dark theme palette
const theme = {
  bg: '#090B10',
  surface: '#121620',
  surfaceBorder: '#1F2433',
  textMain: '#FFFFFF',
  textDim: '#8A94A6',
  accentNeon: '#00F0FF',
  accentPurple: '#7000FF',
  accentGreen: '#00FF66',
  red: '#FF3366',
};

const KPICard = ({ title, value, trend, icon, color }: any) => (
  <View style={styles.kpiCard}>
    <View style={styles.kpiHeader}>
      <Text style={styles.kpiTitle}>{title}</Text>
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
    </View>
    <Text style={styles.kpiValue}>{value}</Text>
    <View style={styles.kpiTrend}>
      <Ionicons name={trend > 0 ? "trending-up" : "trending-down"} size={14} color={trend > 0 ? theme.accentGreen : theme.red} />
      <Text style={[styles.trendText, { color: trend > 0 ? theme.accentGreen : theme.red }]}>
        {trend > 0 ? '+' : ''}{trend}% from yesterday
      </Text>
    </View>
  </View>
);

export default function PrototypeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        
        {/* SIDEBAR (Only visible on web desktop/tablet width) */}
        {isDesktop && (
          <View style={styles.sidebar}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBadge}>
                <Ionicons name="restaurant" size={20} color={theme.textMain} />
              </View>
              <Text style={styles.logoText}>TableBook</Text>
            </View>

            <View style={styles.navGroup}>
              <Text style={styles.navLabel}>MAIN MENU</Text>
              <View style={[styles.navItem, styles.navItemActive]}>
                <Feather name="grid" size={18} color={theme.textMain} />
                <Text style={[styles.navItemText, { color: theme.textMain }]}>Dashboard</Text>
              </View>
              <View style={styles.navItem}>
                <Feather name="layout" size={18} color={theme.textDim} />
                <Text style={styles.navItemText}>Floor Plan</Text>
              </View>
              <View style={styles.navItem}>
                <Feather name="calendar" size={18} color={theme.textDim} />
                <Text style={styles.navItemText}>Reservations</Text>
              </View>
              <View style={styles.navItem}>
                <Feather name="users" size={18} color={theme.textDim} />
                <Text style={styles.navItemText}>CRM</Text>
              </View>
            </View>

            <View style={{ flex: 1 }} />
            
            <View style={styles.aiPromo}>
              <LinearGradient colors={['#7000FF40', '#00F0FF20']} style={styles.aiGradient}>
                <Feather name="cpu" size={24} color={theme.accentNeon} />
                <Text style={styles.aiPromoTitle}>TableBook Core</Text>
                <Text style={styles.aiPromoSub}>Local AI active.</Text>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* MAIN DASHBOARD PANEL */}
        <View style={styles.main}>
          {/* Top Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.pageTitle}>Overview</Text>
              <Text style={styles.pageSubtitle}>Tuesday, Apr 22, 2026</Text>
            </View>
            <View style={styles.headerControls}>
               <View style={styles.searchBox}>
                 <Feather name="search" size={16} color={theme.textDim} />
                 <Text style={{ color: theme.textDim, marginLeft: 8 }}>Search orders...</Text>
               </View>
               <View style={styles.profileBtn}>
                  <Text style={{ color: theme.textMain, fontWeight: '700' }}>MS</Text>
               </View>
            </View>
          </View>

          {/* Scrollable Dashboard Body */}
          <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 24, gap: 24 }}>
            
            {/* KPI Row */}
            <View style={styles.kpiRow}>
               <KPICard title="Total Revenue" value="$8,459.00" trend={12.5} icon="wallet-outline" color={theme.accentGreen} />
               <KPICard title="Active Tables" value="24 / 32" trend={4.2} icon="cafe-outline" color={theme.accentNeon} />
               <KPICard title="Total Covers" value="142" trend={-1.5} icon="people-outline" color={theme.accentPurple} />
               <KPICard title="Waitlist Time" value="18m" trend={-12.0} icon="time-outline" color={theme.textMain} />
            </View>

            {/* Grid Layout for Charts & Tables */}
            <View style={styles.gridRow}>
              {/* Left Column (Chart Placeholder) */}
              <View style={styles.mainCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Live Occupancy & Revenue</Text>
                  <Ionicons name="ellipsis-horizontal" size={20} color={theme.textDim} />
                </View>
                {/* Mock Chart Area */}
                <View style={styles.chartArea}>
                  <LinearGradient colors={[theme.surfaceBorder, theme.surface]} style={styles.chartMock} />
                  <LinearGradient colors={[theme.accentNeon + '80', theme.surface]} style={[styles.chartMock, { height: '60%' }]} />
                  <LinearGradient colors={[theme.accentPurple + '80', theme.surface]} style={[styles.chartMock, { height: '80%' }]} />
                  <LinearGradient colors={[theme.surfaceBorder, theme.surface]} style={[styles.chartMock, { height: '40%' }]} />
                  <LinearGradient colors={[theme.accentGreen + '80', theme.surface]} style={[styles.chartMock, { height: '90%' }]} />
                  <LinearGradient colors={[theme.accentNeon + '80', theme.surface]} style={[styles.chartMock, { height: '100%' }]} />
                  <LinearGradient colors={[theme.surfaceBorder, theme.surface]} style={[styles.chartMock, { height: '70%' }]} />
                </View>
              </View>

              {/* Right Column (Recent Orders) */}
              <View style={styles.sideCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Recent Activity</Text>
                </View>
                <View style={styles.activityList}>
                   {[
                     { id: 'TBL-12', action: 'Seated (4 pax)', time: '2m ago', color: theme.accentNeon },
                     { id: 'ONL-88', action: 'Order Placed • $140', time: '12m ago', color: theme.accentGreen },
                     { id: 'TBL-04', action: 'Bill Paid • $320', time: '18m ago', color: theme.textDim },
                     { id: 'TBL-09', action: 'Need Service', time: '21m ago', color: theme.red },
                   ].map((act, i) => (
                     <View key={i} style={styles.activityItem}>
                       <View style={[styles.activityDot, { backgroundColor: act.color }]} />
                       <View style={{ flex: 1 }}>
                         <Text style={styles.activityTitle}>{act.id}</Text>
                         <Text style={styles.activitySub}>{act.action}</Text>
                       </View>
                       <Text style={styles.activityTime}>{act.time}</Text>
                     </View>
                   ))}
                </View>
              </View>
            </View>

          </ScrollView>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, flexDirection: 'row' },
  
  // Sidebar
  sidebar: {
    width: 260,
    backgroundColor: theme.surface,
    borderRightWidth: 1,
    borderRightColor: theme.surfaceBorder,
    padding: 24,
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 40 },
  logoBadge: { width: 36, height: 36, borderRadius: 8, backgroundColor: theme.accentPurple, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: theme.textMain, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  navGroup: { gap: 12 },
  navLabel: { color: theme.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  navItemActive: { backgroundColor: theme.surfaceBorder },
  navItemText: { color: theme.textDim, fontSize: 14, fontWeight: '500' },
  aiPromo: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.surfaceBorder },
  aiGradient: { padding: 16, gap: 8 },
  aiPromoTitle: { color: theme.textMain, fontSize: 14, fontWeight: '700', marginTop: 4 },
  aiPromoSub: { color: theme.textDim, fontSize: 12 },

  // Main Dashboard
  main: { flex: 1, backgroundColor: theme.bg },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 32, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: theme.surfaceBorder 
  },
  pageTitle: { color: theme.textMain, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  pageSubtitle: { color: theme.textDim, fontSize: 13, marginTop: 4 },
  headerControls: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.surfaceBorder, width: 200 },
  profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceBorder, alignItems: 'center', justifyContent: 'center' },
  
  scrollContent: { flex: 1 },
  kpiRow: { flexDirection: isDesktop ? 'row' : 'column', gap: 20 },
  kpiCard: { flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.surfaceBorder },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kpiTitle: { color: theme.textDim, fontSize: 13, fontWeight: '500' },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { color: theme.textMain, fontSize: 28, fontWeight: '700', marginBottom: 12, letterSpacing: -0.5 },
  kpiTrend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendText: { fontSize: 12, fontWeight: '600' },

  gridRow: { flexDirection: isDesktop ? 'row' : 'column', gap: 20, marginTop: 8 },
  
  mainCard: { flex: 2, backgroundColor: theme.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.surfaceBorder, minHeight: 400 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  cardTitle: { color: theme.textMain, fontSize: 16, fontWeight: '600' },
  
  chartArea: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 40 },
  chartMock: { width: `${100/7 - 2}%`, borderRadius: 4, backgroundColor: theme.surfaceBorder },

  sideCard: { flex: 1, backgroundColor: theme.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.surfaceBorder, minHeight: 400 },
  activityList: { gap: 24 },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  activityTitle: { color: theme.textMain, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  activitySub: { color: theme.textDim, fontSize: 12 },
  activityTime: { color: theme.textDim, fontSize: 12 },
});
