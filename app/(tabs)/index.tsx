import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { trpc, RESTAURANT_ID } from '../../lib/trpc';
import { useSaaSStore } from '../../lib/saas-store';
import { StatCard } from '../../components/StatCard';
import { AIInsightCard } from '../../components/AIInsightCard';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../lib/theme';
import { RESTAURANT } from '../../lib/restaurant';
import { PinLock } from '../../components/PinLock';
import { KOTPreview } from '../../components/KOTPreview';

const AI_INSIGHTS = [
  "🍏 Green Apple is priced ₹200–₹400/person. Keep tables turning efficiently during lunch (11AM–3:30PM).",
  "Peak dinner hour is 7–9PM. Consider allocating extra floor staff from 6:30PM onwards. 🔥",
  "No-show rate is low this week (5%). Your SMS confirmations via Twilio are working well! 📲",
  "Sector 16 foot traffic peaks after office hours. Consider promoting 6:30PM early-dinner slots. ⏰",
  "Repeat customer rate is improving! Consider a VIP loyalty card for guests with 5+ visits. ⭐",
  "All-you-can-eat service: watch for extended table occupancy. Aim for ≤90 min/turn at peak times.",
];

export default function DashboardScreen() {
  const router = useRouter();
  const trpcUtils = trpc.useUtils();
  const appName = useSaaSStore(s => s.appName);

  const { data: metrics, refetch, isRefetching } = trpc.analytics.getMetrics.useQuery({ date: new Date().toISOString().split('T')[0] });
  const [insightIdx] = useState(() => Math.floor(Math.random() * AI_INSIGHTS.length));
  const [isLocked, setIsLocked] = useState(false);
  const [lockTarget, setLockTarget] = useState<string | null>(null);
  const [manualReportText, setManualReportText] = useState("");
  const [isManualVisible, setIsManualVisible] = useState(false);
  const [selectedOrderForKOT, setSelectedOrderForKOT] = useState<any>(null);
  const [isKOTVisible, setIsKOTVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  // Mock data for offline/standalone mode
  const user = { name: 'Admin', role: 'manager' };
  const isManagerOrOwner = true;
  
  const stats = {
    totalRevenue: 45280,
    occupancyRate: 88,
    noShowRate: 2,
    totalBookings: 32,
    totalGuests: 124,
    sources: { online: 18, walkin: 10, phone: 4 }
  };

  const deliveryData: any = { summary: { revenue: 8450 }, orders: [] };
  const reviewsData: any = { rating: '4.8', reviews: [{ text: "Amazing food and great service!", authorName: "John Doe" }] };
  const restaurant = { name: "Green Apple", phone: "919662653440" };

  const logoutMutation = { mutate: () => router.replace('/login'), isPending: false };
  const sendReport = { mutate: () => alert('✅ Daily Summary sent (Simulated)!'), isPending: false };



  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleSecuredPress = (target: string) => {
    router.push(target as any);
  };

  const s = stats ?? {
    todayRevenue: 12500,
    occupancyRate: 85,
    noShowRate: 5,
    totalTodayBookings: 24,
    sources: { online: 15, walkin: 6, phone: 3 },
    totalCustomers: 120,
    repeatCustomers: 45,
    totalBookingsAllTime: 1250,
  };

  const totalSources = ((s as any).sources?.online || 0) + ((s as any).sources?.walkin || 0) + ((s as any).sources?.phone || 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{RESTAURANT.emoji} {appName}</Text>
            <Text style={styles.date}>{formatDate(today)} · Good {getGreeting()} 👋</Text>
            {user && <Text style={{ color: Colors.textTertiary, fontSize: 12, marginTop: 4 }}>Logged in as {(user as any).name} ({(user as any).role})</Text>}
          </View>
          <View style={styles.headerButtons}>
            <Pressable style={styles.iconBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color={Colors.error} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/waitlist')}>
              <Ionicons name="time-outline" size={22} color={Colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => handleSecuredPress('/settings')}>
              <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => handleSecuredPress('/ai-assistant')}>
              <Ionicons name="sparkles-outline" size={22} color={Colors.ai} />
            </Pressable>
          </View>
        </View>

        {/* AI Insight */}
        {isManagerOrOwner && (
          <AIInsightCard
            insight={AI_INSIGHTS[insightIdx]}
            onPress={() => router.push('/ai-assistant')}
          />
        )}

        {/* Primary Stats Row */}
        <View style={styles.row}>
          {isManagerOrOwner ? (
            <StatCard
              icon="💰"
              label="Today's Revenue"
              value={`₹${((s as any).totalRevenue || 0).toLocaleString('en-IN')}`}
              accent
              flex={1}
            />
          ) : (
            <>
              <ToolButton
                icon="restaurant"
                label="Kitchen KDS"
                color="#F59E0B"
                onPress={() => router.push('/kds')}
              />
              <ToolButton
                icon="share-social"
                label="Daily Report"
                color="#0EA5E9"
                onPress={() => {
                  sendReport.mutate({ restaurantId: RESTAURANT_ID });
                }}
              />
            </>
          )}
          <StatCard
            icon="📊"
            label="Occupancy"
            value={`${s.occupancyRate}%`}
            flex={1}
          />
        </View>

        {/* Secondary Stats Row */}
        <View style={styles.row}>
          <StatCard
            icon="📅"
            label="Today's Bookings"
            value={(s as any).totalBookings || 0}
            flex={1}
          />
          <StatCard
            icon="⚠️"
            label="No-Show Rate"
            value={`${s.noShowRate}%`}
            flex={1}
          />
        </View>

        {/* Commercial Operations Section */}
        {isManagerOrOwner && (
          <View style={appStyles.commercialRow}>
            <Pressable 
              style={({ pressed }) => [appStyles.commBtn, { backgroundColor: Colors.accentDim, borderColor: Colors.accent + '50', borderWidth: 1 }, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/reviews')}
            >
              <Ionicons name="logo-google" size={18} color={Colors.accent} />
              <Text style={[appStyles.commBtnText, { color: Colors.accent }]}>Reviews ({reviewsData?.rating || '4.6'})</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [appStyles.commBtn, { backgroundColor: '#111827' }, pressed && { opacity: 0.7 }]}
              onPress={() => handleSecuredPress('/menu-editor')}
            >
              <Ionicons name="book-outline" size={18} color="white" />
              <Text style={[appStyles.commBtnText, { color: 'white' }]}>Digital Menu</Text>
            </Pressable>
          </View>
        )}

        {/* Delivery Income Stat */}
        <View style={styles.row}>
          <StatCard
            icon="🛵"
            label="Online Orders"
            value={`₹${deliveryData?.summary.revenue.toLocaleString('en-IN') || '0'}`}
            flex={1}
          />
          <StatCard
            icon="👥"
            label="Total Guests"
            value={(s as any).totalGuests || 0}
            flex={1}
          />
        </View>
        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardTitle}>Booking Sources</Text>
          <View style={styles.sourcesBar}>
            {totalSources > 0 && (
              <>
                <View
                  style={[styles.sourceChunk, {
                    flex: ((s as any).sources?.online || 0),
                    backgroundColor: Colors.confirmed,
                    borderTopLeftRadius: 4,
                    borderBottomLeftRadius: 4,
                  }]}
                />
                <View
                  style={[styles.sourceChunk, {
                    flex: ((s as any).sources?.walkin || 0),
                    backgroundColor: Colors.accent,
                  }]}
                />
                <View
                  style={[styles.sourceChunk, {
                    flex: ((s as any).sources?.phone || 0),
                    backgroundColor: Colors.phone,
                    borderTopRightRadius: 4,
                    borderBottomRightRadius: 4,
                  }]}
                />
              </>
            )}
          </View>
          <View style={styles.sourcesLegend}>
            <LegendItem color={Colors.confirmed} label="Online" value={((s as any).sources?.online || 0)} />
            <LegendItem color={Colors.accent}    label="Walk-in" value={((s as any).sources?.walkin || 0)} />
            <LegendItem color={Colors.phone}     label="Phone"   value={((s as any).sources?.phone || 0)} />
          </View>
        </View>

        {/* Business Toolkit */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Business Toolkit 🧰</Text>
        </View>
        <View style={styles.row}>
          <TouchableOpacity 
            style={[styles.smallCard, { flex: 1 }]}
            onPress={() => router.push('/tools/qrcodes')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#eef2ff' }]}>
              <Ionicons name="qr-code" size={20} color="#4f46e5" />
            </View>
            <Text style={styles.smallCardTitle}>Table QRs</Text>
            <Text style={styles.smallCardSub}>Generate codes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.smallCard, { flex: 1 }]}
            onPress={() => handleSecuredPress('daily-report')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="stats-chart" size={20} color="#10b981" />
            </View>
            <Text style={styles.smallCardTitle}>Daily Report</Text>
            <Text style={styles.smallCardSub}>WhatsApp Owner</Text>
          </TouchableOpacity>
        </View>

        {/* Live Activity Bento Section */}
        <View style={appStyles.liveActivityHeader}>
          <Text style={styles.cardTitle}>Live Activity</Text>
          <View style={appStyles.liveBadge}>
            <View style={appStyles.liveDot} />
            <Text style={appStyles.liveBadgeText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.row}>
          {/* Latest Order Widget */}
          <Pressable
            style={[styles.card, { flex: 1, padding: 16, gap: 6 }]}
            onPress={() => router.push('/delivery')}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ backgroundColor: 'rgba(220,38,38,0.15)', padding: 8, borderRadius: 10 }}>
                <MaterialCommunityIcons name="pizza" size={16} color="#f87171" />
              </View>
              <Text style={{ fontSize: 10, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 1 }}>ORDERS</Text>
            </View>
            {deliveryData?.orders[0] ? (
              <View>
                <Text style={{ color: Colors.textPrimary, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{deliveryData.orders[0].customerName}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
                  <Text style={{ color: Colors.accent, fontWeight: '800', fontSize: 20 }}>₹{deliveryData.orders[0].total}</Text>
                  <TouchableOpacity onPress={() => { setSelectedOrderForKOT(deliveryData.orders[0]); setIsKOTVisible(true); }}>
                    <Ionicons name="reader-outline" size={18} color={Colors.accent} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: Colors.textTertiary, fontSize: 10, marginTop: 2 }}>{deliveryData.orders[0].platform.toUpperCase()} · JUST NOW</Text>
              </View>
            ) : (
              <Text style={{ color: Colors.textTertiary, fontStyle: 'italic', fontSize: 12, paddingVertical: 16 }}>No active orders</Text>
            )}
          </Pressable>

          {/* Latest Review Widget */}
          <Pressable
            style={[styles.card, { flex: 1, padding: 16, gap: 6 }]}
            onPress={() => router.push('/reviews')}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ backgroundColor: Colors.accentDim, padding: 8, borderRadius: 10 }}>
                <Ionicons name="logo-google" size={14} color={Colors.accent} />
              </View>
              <Text style={{ fontSize: 10, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 1 }}>REVIEWS</Text>
            </View>
            {reviewsData?.reviews[0] ? (
              <>
                <View style={{ flexDirection: 'row', gap: 1 }}>
                  {[1,2,3,4,5].map(s => (
                    <Ionicons key={s} name="star" size={10} color={s <= reviewsData.reviews[0].rating ? '#facc15' : Colors.surfaceBorder} />
                  ))}
                </View>
                <Text style={{ color: Colors.textPrimary, fontWeight: '600', fontSize: 12 }} numberOfLines={2}>&quot;{reviewsData.reviews[0].text}&quot;</Text>
                <Text style={{ color: Colors.textTertiary, fontSize: 10, marginTop: 2 }}>BY {reviewsData.reviews[0].authorName.toUpperCase()}</Text>
              </>
            ) : (
              <Text style={{ color: Colors.textTertiary, fontStyle: 'italic', fontSize: 12, paddingVertical: 16 }}>No new reviews</Text>
            )}
          </Pressable>
        </View>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, Shadows.accent]}
          onPress={() => router.push('/new-booking')}
        >
          <Ionicons name="add-circle-outline" size={22} color={Colors.textInverse} />
          <Text style={styles.ctaText}>New Booking</Text>
        </Pressable>



        {/* Manual Report Modal */}
        {isManualVisible && (
          <View style={appStyles.manualModalOverlay}>
            <View style={appStyles.manualModalContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="logo-whatsapp" size={24} color="#25d366" />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.textPrimary, marginLeft: 8 }}>Manual Report</Text>
              </View>
              <Text style={{ color: Colors.textSecondary, marginBottom: 12, fontSize: 13, lineHeight: 18 }}>
                MSG91 API is in &quot;Manual Mode&quot;. Copy the summary below and send it to the owner.
              </Text>
              <View style={{ backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, padding: 12, marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontFamily: 'monospace', color: '#1f2937' }}>{manualReportText}</Text>
              </View>
              <TouchableOpacity 
                style={{ backgroundColor: Colors.accent, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 10 }}
                onPress={() => {
                  alert("Report copied to clipboard!"); 
                  setIsManualVisible(false);
                }}
              >
                <Text style={{ color: Colors.textInverse, fontWeight: '700' }}>Copy Report</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ paddingVertical: 8, alignItems: 'center' }}
                onPress={() => setIsManualVisible(false)}
              >
                <Text style={{ color: Colors.textTertiary, fontWeight: '500' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* KOT Preview Modal */}
        {selectedOrderForKOT && (
          <KOTPreview
            visible={isKOTVisible}
            onClose={() => setIsKOTVisible(false)}
            order={{
              id: selectedOrderForKOT.id,
              table: selectedOrderForKOT.table || "Online",
              items: Array.isArray(selectedOrderForKOT.items) 
                ? selectedOrderForKOT.items.map((i: any) => ({ name: i.name, quantity: i.quantity || i.qty }))
                : [],
              timestamp: selectedOrderForKOT.placedAt || new Date().toISOString(),
            }}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const appStyles = StyleSheet.create({
  commercialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  commBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  commBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  liveActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: -4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc2626',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#dc2626',
    letterSpacing: 0.5,
  },
  manualModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 1000,
  },
  manualModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 32,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Shadows.md,
  }
});

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function ToolButton({ icon, label, color, onPress }: { icon: any, label: string, color: string, onPress: () => void }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.smallCard, Shadows.md]}
    >
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.smallCardTitle}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  greeting: { ...Typography.heading, color: Colors.textPrimary },
  date: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  headerButtons: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  cardTitle: { ...Typography.subheading, color: Colors.textPrimary },
  sourcesBar: { height: 8, flexDirection: 'row', borderRadius: 4, overflow: 'hidden' },
  sourceChunk: { height: 8 },
  sourcesLegend: { flexDirection: 'row', justifyContent: 'space-around' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { ...Typography.bodySmall, color: Colors.textSecondary },
  legendValue: { ...Typography.bodySmall, color: Colors.textPrimary, fontWeight: '700' },
  cta: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { ...Typography.subheading, color: Colors.textInverse, fontWeight: '700' },
  sectionHeader: { marginTop: Spacing.lg, marginBottom: Spacing.xs },
  sectionTitle: { ...Typography.subheading, color: Colors.textSecondary },
  smallCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    gap: 4,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  smallCardTitle: { ...Typography.bodySmall, color: Colors.textPrimary, fontWeight: '700' },
  smallCardSub: { ...Typography.caption, color: Colors.textTertiary, fontSize: 10 },
});
