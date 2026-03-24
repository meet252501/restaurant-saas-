// @ts-nocheck
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import BookingsScreen from '../(tabs)/bookings';
import { renderWithWrapper, mockTrpcData } from './test-utils';

jest.spyOn(mockTrpcData.delivery.today, 'useQuery').mockReturnValue({
  data: {
    orders: [
      { id: 'b_1', customerName: 'Alice', date: '2026-03-21', time: '18:00', pax: 2, status: 'confirmed', phone: '123' }
    ] as any,
    stats: {} as any
  },
  isLoading: false,
  refetch: jest.fn()
} as any);

describe('Bookings Core Testing', () => {

  it('renders booking interface correctly', () => {
    const { getByText } = renderWithWrapper(<BookingsScreen />);
    
    // Check main title
    expect(getByText('Reservations')).toBeTruthy();
  });

  it('handles filtering through tabs', () => {
    const { getByText } = renderWithWrapper(<BookingsScreen />);
    
    // Tap Confirmed tab
    fireEvent.press(getByText('Confirmed'));
    
    // Tap Pending tab
    fireEvent.press(getByText('Pending'));
  });

});
