// @ts-nocheck
import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import DeliveryScreen from '../(tabs)/delivery';
import { renderWithWrapper, mockTrpcData } from './test-utils';

// Mock active delivery data
jest.spyOn(mockTrpcData.delivery.today, 'useQuery').mockReturnValue({
  data: {
    orders: [
      { 
        id: 'o_1', 
        orderId: 'ZMT-101', 
        platform: 'zomato', 
        customerName: 'Test Customer', 
        status: 'pending', 
        totalAmount: 1200, 
        items: [{name: 'Biryani', qty: 2}], 
        placedAt: new Date().toISOString() 
      }
    ],
    stats: { totalOrders: 1, pending: 1, preparing: 0, dispatched: 0, delivered: 0, totalRevenue: 1200 }
  },
  isLoading: false,
  refetch: jest.fn()
} as any);

describe('Delivery Management Tests', () => {

  it('renders stats and active delivery orders properly', () => {
    const { getByText } = renderWithWrapper(<DeliveryScreen />);
    
    expect(getByText('Pending')).toBeTruthy(); // Pending Filter
    expect(getByText('Test Customer')).toBeTruthy(); // Customer rendered
    expect(getByText('Zomato')).toBeTruthy(); // Platform rendered
  });

  it('fires mutate command when updating status to preparing', async () => {
    const { getByText } = renderWithWrapper(<DeliveryScreen />);
    
    // Press standard Mark Preparing button
    await act(async () => {
      fireEvent.press(getByText('Mark Preparing'));
    });
    
    expect(mockTrpcData.delivery.updateStatus.useMutation().mutate).toHaveBeenCalledWith({
      orderId: 'o_1', 
      status: 'preparing'
    });
  });

  it('opens Kitchen Order Ticket preview modal', async () => {
    const { getByText, queryByText } = renderWithWrapper(<DeliveryScreen />);
    
    // Open KOT
    await act(async () => {
      fireEvent.press(getByText('View KOT'));
    });
    
    // Modal items should exist
    expect(getByText('KITCHEN ORDER TICKET')).toBeTruthy();
    expect(getByText('2x Biryani')).toBeTruthy();
  });

});
