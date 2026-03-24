import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { trpc, RESTAURANT_ID } from '../../lib/trpc';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../lib/theme';

const chartWidth = Dimensions.get('window').width - Spacing.lg * 2;
const chartHeight = 220;

/**
 * ANALYTICS DASHBOARD
 * Comprehensive business insights for restaurant owners
 * Features:
 * - Real-time KPIs
 * - 30-day trends
 * - Revenue analysis
 * - Customer insights
 * - Performance metrics
 */

export default function AnalyticsDashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'bookings' | 'performance'>('revenue');

  // Queries
  const { data: todayKPIs, refetch: refetchKPIs } = trpc.analytics.todayKPIs.useQuery({
    restaurantId: RESTAURANT_ID,
  });

  const { data: thirtyDayTrends, refetch: refetchTrends } = trpc.analytics.thirtyDayTrends.useQuery({
    restaurantId: RESTAURANT_ID,
  });

  const { data: revenueAnalysis, refetch: refetchRevenue } = trpc.analytics.revenueAnalysis.useQuery({
    restaurantId: RESTAURANT_ID,
    days: 30,
  });

  const { data: performanceMetrics, refetch: refetchPerformance } = trpc.analytics.performanceMetrics.useQuery({
    restaurantId: RESTAURANT_ID,
    days: 30,
  });

  const { data: topCustomers } = trpc.analytics.topCustomers.useQuery({
    restaurantId: RESTAURANT_ID,
    limit: 5,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchKPIs(),
      refetchTrends(),
      refetchRevenue(),
      refetchPerformance(),
    ]);
    setRefreshing(false);
  };

  if (!todayKPIs || !thirtyDayTrends) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </SafeAreaView>
    );
  }

  // Prepare chart data
  const trendDates = thirtyDayTrends.slice(-7).map((d: any) => d.date.split('-')[2]);
  const trendRevenue = thirtyDayTrends.slice(-7).map((d: any) => parseInt(d.revenue || '0'));
  const trendBookings = thirtyDayTrends.slice(-7).map((d: any) => d.bookings);

  const revenueBySourceData = revenueAnalysis?.revenueBySource || [];
  const pieChartData = revenueBySourceData.map((item: any) => ({
    name: item.source,
    value: parseFloat(item.revenue),
    color: getSourceColor(item.source),
    legendFontColor: Colors.textPrimary,
    legendFontSize: 12,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics Dashboard</Text>
          <Text style={styles.subtitle}>Today: {todayKPIs.date}</Text>
        </View>

        {/* Today's KPI Cards */}
        <View style={styles.kpiSection}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.kpiGrid}>
            <KPICard
              label="Total Revenue"
              value={`₹${todayKPIs.totalRevenue}`}
              icon="cash"
              color="#10b981"
              trend="+12%"
            />
            <KPICard
              label="Bookings"
              value={todayKPIs.totalBookings.toString()}
              icon="calendar"
              color="#3b82f6"
              trend="+5%"
            />
            <KPICard
              label="Occupancy"
              value={`${todayKPIs.occupancyRate}%`}
              icon="pie-chart"
              color="#f59e0b"
              trend="-2%"
            />
            <KPICard
              label="No-Show Rate"
              value={`${todayKPIs.noShowRate}%`}
              icon="close-circle"
              color="#ef4444"
              trend="+1%"
            />
          </View>
        </View>

        {/* 7-Day Revenue Trend */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>7-Day Revenue Trend</Text>
            <LineChart
              data={{
                labels: trendDates,
                datasets: [
                  {
                    data: trendRevenue.length > 0 ? trendRevenue : [0],
                    color: () => Colors.accent,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={chartWidth}
              height={chartHeight}
              chartConfig={{
                backgroundColor: Colors.surface,
                backgroundGradientFrom: Colors.surface,
                backgroundGradientTo: Colors.surface,
                decimalPlaces: 0,
                color: () => Colors.textSecondary,
                labelColor: () => Colors.textSecondary,
                style: { borderRadius: Radius.md },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: Colors.accent,
                },
              }}
              style={{ ...styles.chart, ...Shadows.sm }}
            />
        </View>

        {/* 7-Day Bookings Trend */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>7-Day Bookings</Text>
          <BarChart
            data={{
              labels: trendDates,
              datasets: [
                {
                  data: trendBookings.length > 0 ? trendBookings : [0],
                },
              ],
            }}
            width={chartWidth}
            height={chartHeight}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: Colors.surface,
              backgroundGradientFrom: Colors.surface,
              backgroundGradientTo: Colors.surface,
              decimalPlaces: 0,
              color: () => Colors.accent,
              labelColor: () => Colors.textSecondary,
              style: { borderRadius: Radius.md },
            }}
            style={{ ...styles.chart, ...Shadows.sm }}
          />
        </View>

        {/* Revenue by Source */}
        {pieChartData.length > 0 && (
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Revenue by Source</Text>
            <PieChart
              data={pieChartData}
              width={chartWidth}
              height={chartHeight}
              chartConfig={{
                color: () => Colors.textSecondary,
              }}
              accessor="value"
              backgroundColor={Colors.surface}
              paddingLeft="15"
              style={{ ...styles.chart, ...Shadows.sm }}
            />
          </View>
        )}

        {/* Performance Metrics */}
        {performanceMetrics && (
          <View style={styles.metricsSection}>
            <Text style={styles.sectionTitle}>Performance Metrics (30 Days)</Text>
            <View style={styles.metricsList}>
              <MetricRow
                label="Completion Rate"
                value={`${performanceMetrics.completionRate}%`}
                icon="checkmark-circle"
              />
              <MetricRow
                label="No-Show Rate"
                value={`${performanceMetrics.noShowRate}%`}
                icon="close-circle"
              />
              <MetricRow
                label="Cancellation Rate"
                value={`${performanceMetrics.cancellationRate}%`}
                icon="trash"
              />
              <MetricRow
                label="Avg Party Size"
                value={performanceMetrics.averagePartySize}
                icon="people"
              />
            </View>
          </View>
        )}

        {/* Top Customers */}
        {topCustomers && topCustomers.length > 0 && (
          <View style={styles.customersSection}>
            <Text style={styles.sectionTitle}>Top Customers</Text>
            <View style={styles.customersList}>
              {topCustomers.map((customer: any, index: number) => (
                <View key={customer.customerId} style={styles.customerRow}>
                  <View style={styles.customerRank}>
                    <Text style={styles.rankNumber}>{index + 1}</Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.customerPhone}>{customer.phone}</Text>
                  </View>
                  <View style={styles.customerStats}>
                    <Text style={styles.visitCount}>{customer.visitCount} visits</Text>
                    <Text style={styles.totalSpent}>₹{customer.totalSpent}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Export Report Button */}
        <View style={styles.exportSection}>
          <Pressable style={[styles.exportButton, Shadows.md]}>
            <Ionicons name="download" size={20} color="white" />
            <Text style={styles.exportButtonText}>Export Monthly Report</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * KPI Card Component
 */
function KPICard({
  label,
  value,
  icon,
  color,
  trend,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  trend: string;
}) {
  return (
    <View style={[styles.kpiCard, Shadows.sm]}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={[styles.kpiTrend, { color: trend.startsWith('+') ? '#10b981' : '#ef4444' }]}>
        {trend}
      </Text>
    </View>
  );
}

/**
 * Metric Row Component
 */
function MetricRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLeft}>
        <Ionicons name={icon as any} size={20} color={Colors.accent} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

/**
 * Helper function to get source color
 */
function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    online: '#3b82f6',
    walkin: '#10b981',
    phone: '#f59e0b',
  };
  return colors[source] || '#6b7280';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  title: {
    ...Typography.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  kpiSection: {
    padding: Spacing.lg,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  kpiLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  kpiValue: {
    ...Typography.heading,
    color: Colors.textPrimary,
  },
  kpiTrend: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
    fontWeight: '600',
  },
  chartSection: {
    padding: Spacing.lg,
  },
  chart: {
    borderRadius: Radius.md,
    marginVertical: Spacing.md,
  },
  metricsSection: {
    padding: Spacing.lg,
  },
  metricsList: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  metricLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  metricValue: {
    ...Typography.subheading,
    color: Colors.accent,
  },
  customersSection: {
    padding: Spacing.lg,
  },
  customersList: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  customerRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  rankNumber: {
    ...Typography.subheading,
    color: 'white',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  customerPhone: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  customerStats: {
    alignItems: 'flex-end',
  },
  visitCount: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  totalSpent: {
    ...Typography.body,
    color: Colors.accent,
    fontWeight: '600',
  },
  exportSection: {
    padding: Spacing.lg,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
  },
  exportButtonText: {
    ...Typography.body,
    color: 'white',
    fontWeight: '600',
  },
});
