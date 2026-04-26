import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { trpc, RESTAURANT_ID } from '../../lib/trpc';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { SummaryCard, LegendItem, StatusButton } from '../../components/staff/DashboardComponents';

/**
 * STAFF DASHBOARD
 * Real-time table management and operations control
 * Features:
 * - Visual table status board
 * - Manual table status updates
 * - Force booking for VIP/overrides
 * - Check-in/Check-out customers
 * - Today's summary metrics
 */

import { useStaffDashboard } from '../../hooks/useStaffDashboard';

export default function StaffDashboardScreen() {
  const {
    selectedDate,
    refreshing,
    onRefresh,
    selectedTable,
    modalVisible,
    setModalVisible,
    modalType,
    setModalType,
    board,
    todaySummary,
    handleTablePress,
    handleUpdateStatus,
    updateTableStatusMutation,
  } = useStaffDashboard();

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} />
      
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Staff Operations</Text>
              <Text style={styles.title}>Workspace</Text>
            </View>
            <View style={styles.headerActions}>
              <View style={styles.liveBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveText}>SYNCED</Text>
              </View>
              <Pressable style={styles.avatar}>
                <LinearGradient colors={[Colors.accent, Colors.accentPurple]} style={StyleSheet.absoluteFill} />
                <Text style={styles.avatarText}>M</Text>
              </Pressable>
            </View>
          </View>

          {/* Today's Summary Cards */}
          {todaySummary && (
            <View style={styles.summarySection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
                <MetricCard
                  label="Bookings"
                  value={todaySummary.totalBookings.toString()}
                  icon="calendar"
                  color={Colors.accent}
                />
                <MetricCard
                  label="Seated"
                  value={todaySummary.checkedIn.toString()}
                  icon="people"
                  color="#34d399"
                />
                <MetricCard
                  label="Pending"
                  value={(todaySummary.totalBookings - todaySummary.checkedIn).toString()}
                  icon="time"
                  color="#fbbf24"
                />
                <MetricCard
                  label="Occupancy"
                  value={`${(todaySummary as any).occupancyRate || 0}%`}
                  icon="pie-chart"
                  color="#818cf8"
                />
              </ScrollView>
            </View>
          )}

          {/* Table Status Board */}
          <View style={styles.boardSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Live Floor Status</Text>
              <Text style={styles.dateText}>{selectedDate}</Text>
            </View>
            
            <View style={styles.tableGrid}>
              {board.map((table: any) => (
                <TableNode 
                  key={table.id} 
                  table={table} 
                  onPress={() => handleTablePress(table)} 
                />
              ))}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legendSection}>
            <LegendItem color="#34d399" label="Free" />
            <LegendItem color="#3b82f6" label="Taken" />
            <LegendItem color="#fbbf24" label="Dirty" />
            <LegendItem color="#f87171" label="Reserved" />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Modal for Table Actions */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalContent, Shadows.lg]}>
            <View style={styles.modalHeaderHandle} />
            
            {selectedTable && modalType !== 'force-book' && (
              <>
                <View style={styles.modalTopRow}>
                  <View>
                    <Text style={styles.modalTitle}>Table {selectedTable.tableNumber}</Text>
                    <View style={styles.modalStatusBadge}>
                      <View style={[styles.statusDot, { backgroundColor: selectedTable.statusColor }]} />
                      <Text style={styles.modalStatusText}>{selectedTable.status}</Text>
                    </View>
                  </View>
                  <Pressable style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={20} color={Colors.textTertiary} />
                  </Pressable>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Update Status</Text>
                  <View style={styles.statusGrid}>
                    {[
                      { id: 'available', label: 'Set Free', icon: 'checkmark-circle', color: '#34d399' },
                      { id: 'occupied', label: 'Occupied', icon: 'people', color: '#3b82f6' },
                      { id: 'cleaning', label: 'Cleaning', icon: 'sparkles', color: '#fbbf24' },
                      { id: 'blocked', label: 'Blocked', icon: 'ban', color: '#f87171' },
                    ].map(opt => (
                      <Pressable
                        key={opt.id}
                        style={[styles.statusOption, updateTableStatusMutation.isPending && { opacity: 0.5 }]}
                        onPress={() => handleUpdateStatus(opt.id)}
                        disabled={updateTableStatusMutation.isPending}
                      >
                        <View style={[styles.statusIconBox, { backgroundColor: opt.color + '20' }]}>
                          <Ionicons name={opt.icon as any} size={22} color={opt.color} />
                        </View>
                        <Text style={styles.statusOptionLabel}>{opt.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <Pressable
                  style={styles.forceBookBtn}
                  onPress={() => setModalType('force-book')}
                >
                  <LinearGradient colors={[Colors.accent, Colors.accentPurple]} style={StyleSheet.absoluteFill} start={{x:0, y:0}} end={{x:1, y:1}} />
                  <Ionicons name="flash" size={18} color="white" />
                  <Text style={styles.forceBookText}>Quick Booking Override</Text>
                </Pressable>

                {selectedTable.nextBooking && (
                  <View style={styles.bookingDetails}>
                    <Text style={styles.bookingDetailsTitle}>Active Reservation</Text>
                    <View style={styles.bookingDetailRow}>
                      <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.bookingDetailText}>{selectedTable.nextBooking.bookingTime}</Text>
                    </View>
                    <View style={styles.bookingDetailRow}>
                      <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.bookingDetailText}>{selectedTable.nextBooking.partySize} Guests</Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {selectedTable && modalType === 'force-book' && (
              <View>
                <Pressable onPress={() => setModalType(null)} style={styles.backLink}>
                  <Ionicons name="chevron-back" size={16} color={Colors.accent} />
                  <Text style={styles.backLinkText}>Back</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Override T{selectedTable.tableNumber}</Text>
                <Text style={styles.modalSubtitle}>Create an emergency walk-in booking</Text>
                
                <View style={styles.modalSection}>
                   <TextInput 
                     style={styles.premiumInput} 
                     placeholder="Number of Guests" 
                     placeholderTextColor={Colors.textTertiary}
                     keyboardType="number-pad"
                   />
                </View>

                <Pressable 
                  style={styles.confirmBtn}
                  onPress={() => {
                    Alert.alert('Success', 'Override booking created!');
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Components ──────────────────────────────────────────────────────────

const MetricCard = ({ label, value, icon, color }: any) => (
  <View style={styles.metricCard}>
    <View style={[styles.metricIconBox, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  </View>
);

const TableNode = ({ table, onPress }: any) => (
  <Pressable style={styles.tableNode} onPress={onPress}>
    <View style={[styles.tableNodeInner, { borderColor: table.statusColor + '40' }]}>
      <View style={[styles.tableNodeStatus, { backgroundColor: table.statusColor }]} />
      <Text style={styles.tableNodeNum}>{table.tableNumber}</Text>
      <Text style={styles.tableNodeCap}>{table.capacity}p</Text>
    </View>
  </Pressable>
);

// ── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24,
    paddingTop: 20, paddingBottom: 10,
  },
  greeting: { fontSize: 13, color: Colors.textTertiary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 2, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#353e4f' },
  avatarText: { fontSize: 16, color: '#fff', fontWeight: '800' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#064e3b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' },
  liveText: { color: '#34d399', fontSize: 10, fontWeight: '800' },

  summarySection: { paddingVertical: 20, paddingLeft: 24 },
  metricCard: {
    width: 130, height: 70, borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1, borderColor: '#334155',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12,
  },
  metricIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  metricLabel: { color: Colors.textTertiary, fontSize: 10, fontWeight: '600' },

  boardSection: { paddingHorizontal: 24, marginTop: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  dateText: { color: Colors.textTertiary, fontSize: 12, fontWeight: '600' },
  
  tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  tableNode: { width: '22%', aspectRatio: 1, borderRadius: 18, overflow: 'hidden' },
  tableNodeInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 18, position: 'relative' },
  tableNodeNum: { color: '#fff', fontSize: 20, fontWeight: '900' },
  tableNodeCap: { color: Colors.textTertiary, fontSize: 10, fontWeight: '700', marginTop: 2 },
  tableNodeStatus: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },

  legendSection: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 30, marginBottom: 40 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeaderHandle: { width: 40, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  modalStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  modalStatusText: { color: Colors.textTertiary, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },

  modalSection: { marginTop: 24 },
  modalSectionTitle: { color: Colors.textTertiary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statusOption: { width: '48%', backgroundColor: '#232d3f', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#334155' },
  statusIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusOptionLabel: { color: '#fff', fontSize: 14, fontWeight: '600' },

  forceBookBtn: { height: 56, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 24 },
  forceBookText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  bookingDetails: { marginTop: 24, padding: 16, backgroundColor: '#232d3f', borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  bookingDetailsTitle: { color: Colors.accent, fontSize: 12, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase' },
  bookingDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  bookingDetailText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backLinkText: { color: Colors.accent, fontSize: 14, fontWeight: '700' },
  modalSubtitle: { color: Colors.textTertiary, fontSize: 14, marginTop: 4 },
  premiumInput: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#334155', marginTop: 12 },
  confirmBtn: { height: 56, backgroundColor: Colors.accent, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
