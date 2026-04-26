import { useState } from 'react';
import { Alert } from 'react-native';
import { trpc } from '../lib/trpc';

export function useStaffDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'status' | 'force-book' | 'check-in' | null>(null);

  // Queries
  const { data: tableBoard, refetch: refetchBoard, isLoading: isBoardLoading } = trpc.staff.getTableBoard.useQuery({
    date: selectedDate,
  });

  const { data: todaySummary } = trpc.staff.getTodaySummary.useQuery(undefined);

  // Mutations
  const updateTableStatusMutation = trpc.staff.updateTableStatus.useMutation({
    onSuccess: () => {
      refetchBoard();
      setModalVisible(false);
      Alert.alert('Success', 'Table status updated');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const forceBookMutation = trpc.staff.forceBookTable.useMutation({
    onSuccess: () => {
      refetchBoard();
      setModalVisible(false);
      Alert.alert('Success', 'Booking created');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const checkInMutation = trpc.staff.checkInCustomer.useMutation({
    onSuccess: () => {
      refetchBoard();
      setModalVisible(false);
      Alert.alert('Success', 'Customer checked in');
    },
  });

  // Real-time subscription
  trpc.staff.onTableStatusChange.useSubscription(undefined, {
    onData: () => refetchBoard(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchBoard();
    setRefreshing(false);
  };

  const handleTablePress = (table: any) => {
    setSelectedTable(table);
    setModalVisible(true);
  };

  const handleUpdateStatus = (newStatus: string) => {
    if (!selectedTable) return;
    updateTableStatusMutation.mutate({
      tableId: selectedTable.id,
      status: newStatus as any,
      duration: newStatus === 'cleaning' ? 120 : undefined,
    });
  };

  // Fallback board logic
  const board = tableBoard || Array.from({ length: 12 }, (_, i) => ({
    id: `tbl-${i + 1}`,
    tableNumber: `T${i + 1}`,
    capacity: [2, 4, 4, 6, 2, 8, 4, 2, 4, 4, 2, 6][i] || 4,
    status: ['Available', 'Occupied', 'Reserved', 'Available', 'Cleaning', 'Occupied', 'Available', 'Reserved', 'Available', 'Occupied', 'Available', 'Cleaning'][i] || 'Available',
    statusColor: ['#10b981', '#3b82f6', '#f59e0b', '#10b981', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#10b981', '#3b82f6', '#10b981', '#6366f1'][i] || '#10b981',
    nextBooking: null,
    currentBooking: null,
  }));

  return {
    selectedDate,
    setSelectedDate,
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
    isBoardLoading,
    updateTableStatusMutation,
    forceBookMutation,
    checkInMutation,
  };
}
