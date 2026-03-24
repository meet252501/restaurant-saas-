// @ts-nocheck
import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

// 1. Mock Expo Router
export const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  Stack: Object.assign(({ children }: any) => <>{children}</>, { Screen: () => null }),
  Tabs: Object.assign(({ children }: any) => <>{children}</>, { Screen: () => null }),
}));

// 2. Mock TRPC
export const mockTrpcData = {
  delivery: {
    today: { useQuery: jest.fn(() => ({ data: { orders: [] }, isLoading: false, refetch: jest.fn() })) },
    updateStatus: { useMutation: jest.fn(() => ({ mutate: jest.fn() })) },
  },
  report: {
    sendDailySummary: { useMutation: jest.fn(() => ({ mutate: jest.fn() })) },
  },
  restaurant: {
    info: { useQuery: jest.fn(() => ({ data: { name: 'Test Rest', phone: '123', emoji: '🍏' }, isLoading: false })) },
  },
  reviews: {
    list: { useQuery: jest.fn(() => ({ data: [], isLoading: false })) },
    submitRating: { useMutation: jest.fn(() => ({ mutate: jest.fn() })) },
    reply: { useMutation: jest.fn(() => ({ mutate: jest.fn() })) }
  }
};

jest.mock('../../lib/trpc', () => ({
  trpc: mockTrpcData,
}));

// 3. Mock Safe Area
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 })
}));

// 4. Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

export const renderWithWrapper = (ui: React.ReactElement) => render(ui);
