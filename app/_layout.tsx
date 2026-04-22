import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { trpc, createTRPCClient } from '../lib/trpc';
import { Colors } from '../lib/theme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { offlineSync } from '../lib/offlineSync';

import { useSaaSStore } from '../lib/saas-store';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
      },
    },
  }));
  const [trpcClient] = useState(createTRPCClient);
  const themeColor = useSaaSStore(s => s.themeColor);
  const loadFromStorage = useSaaSStore(s => s.loadFromStorage);

  React.useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Initialize offline sync on native platforms
  useEffect(() => {
    if (Platform.OS !== 'web') {
      offlineSync.initialize().catch(e => console.warn('[OfflineSync] Init failed:', e));
    }
  }, []);

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor={Colors.background} />
          <View style={{ flex: 1, width: '100%', height: '100%' }} className={`theme-${themeColor}`}>
            <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: 'slide_from_right',
            }}
          >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="new-booking"
            options={{
              headerShown: true,
              title: 'New Booking',
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontWeight: '700' },
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="booking/[id]"
            options={{
              headerShown: true,
              title: 'Booking Details',
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="waitlist"
            options={{
              headerShown: true,
              title: 'Waitlist',
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen
            name="ai-assistant"
            options={{
              headerShown: true,
              title: '🤖 AI Assistant',
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.textPrimary,
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          </Stack>
          </View>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}
