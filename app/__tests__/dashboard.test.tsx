// @ts-nocheck
import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import DashboardScreen from '../(tabs)/index';
import { renderWithWrapper, mockRouter, mockTrpcData } from './test-utils';
import { Alert } from 'react-native';

describe('Dashboard Screen Tests', () => {

  it('renders dashboard with stats properly', () => {
    const { getByText } = renderWithWrapper(<DashboardScreen />);
    
    // Check elements
    expect(getByText(/Good/)).toBeTruthy(); // Greeting
    expect(getByText('Live Waitlist')).toBeTruthy();
    expect(getByText('Kitchen KDS')).toBeTruthy();
    expect(getByText('Daily Report')).toBeTruthy();
  });

  it('navigates to quick actions', () => {
    const { getByText } = renderWithWrapper(<DashboardScreen />);
    
    // Test waitlist navigation
    fireEvent.press(getByText('Live Waitlist'));
    expect(mockRouter.push).toHaveBeenCalledWith('/waitlist');
    
    // Test KDS navigation
    fireEvent.press(getByText('Kitchen KDS'));
    expect(mockRouter.push).toHaveBeenCalledWith('/kds');
  });

  it('handles secured Daily Report flow', async () => {
    const { getByText, getByPlaceholderText } = renderWithWrapper(<DashboardScreen />);
    
    // 1. Press Daily Report
    fireEvent.press(getByText('Daily Report'));

    // 2. PIN Entry should appear
    const pinHeader = getByText(/Enter PIN/i);
    expect(pinHeader).toBeTruthy();

    // 3. Enter PIN (1234)
    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByText('3'));
    fireEvent.press(getByText('4'));

    // Wait for the simulated mutation
    await act(async () => {
      // 1234 PIN goes through immediately
    });

    // 4. Mutation should be called
    expect(mockTrpcData.report.sendDailySummary.useMutation().mutate).toHaveBeenCalled();
  });

});
