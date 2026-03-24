// @ts-nocheck
import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import KdsScreen from '../kds';
import { renderWithWrapper, mockTrpcData } from './test-utils';

// Mock active KDS Orders
jest.spyOn(mockTrpcData.delivery.today, 'useQuery').mockReturnValue({
  data: {
    orders: [
      { 
        id: 'kds_1', 
        orderId: 'KDS-001', 
        platform: 'swiggy', 
        customerName: 'KDS Chef Test', 
        status: 'pending', 
        items: [{name: 'Burger', qty: 2}], 
        placedAt: new Date().toISOString() 
      }
    ],
    stats: {}
  },
  isLoading: false,
  refetch: jest.fn()
} as any);

describe('Kitchen Display System (KDS) Tests', () => {

  it('renders live orders safely without React child array crashes', () => {
    const { getByText } = renderWithWrapper(<KdsScreen />);
    
    // General text presence
    expect(getByText('Kitchen Display (KDS)')).toBeTruthy();
    
    // Make sure the order mapped correctly! (Regression test)
    expect(getByText('2x Burger')).toBeTruthy();
    expect(getByText('SWIGGY · #KDS-001')).toBeTruthy();
    expect(getByText('KDS Chef Test')).toBeTruthy();
  });

  it('dispatches the order safely via mutate', async () => {
    const { getByText } = renderWithWrapper(<KdsScreen />);
    
    await act(async () => {
      fireEvent.press(getByText('DONE / DISPATCH'));
    });
    
    expect(mockTrpcData.delivery.updateStatus.useMutation().mutate).toHaveBeenCalledWith({
      orderId: 'kds_1', 
      status: 'dispatched'
    });
  });

});
