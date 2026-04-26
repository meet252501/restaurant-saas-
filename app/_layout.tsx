import '../global.css';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { View, Platform, AppState } from 'react-native';
import { trpc, createTRPCClient } from '../lib/trpc';
import { Colors } from '../lib/theme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { offlineSync } from '../lib/offlineSync';

import { useSaaSStore } from '../lib/saas-store';

import { queryClient } from '../lib/queryClient';

export default function RootLayout() {
  const baseUrl = useSaaSStore(s => s.baseUrl);
  const trpcClient = React.useMemo(() => createTRPCClient(), [baseUrl]);
  const segments = useSegments();
  const router = useRouter();
  
  const themeColor = useSaaSStore(s => s.themeColor);
  const isLoaded = useSaaSStore(s => s.isLoaded);
  const isLocked = useSaaSStore(s => s.isLocked);
  const loadFromStorage = useSaaSStore(s => s.loadFromStorage);
  const setLocked = useSaaSStore(s => s.setLocked);

  React.useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Auth & Lock Guard
  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === 'login';

    if (isLocked && !inAuthGroup) {
      router.replace('/login');
    }
  }, [isLoaded, isLocked, segments, router]);

  // AppState listener for locking
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background') {
        setLocked(true);
      }
    });
    return () => subscription.remove();
  }, [setLocked]);

  // Initialize offline sync on native platforms
  useEffect(() => {
    if (Platform.OS !== 'web') {
      offlineSync.setTrpcClient(trpcClient);
      offlineSync.initialize().catch(e => console.warn('[OfflineSync] Init failed:', e));
    }
  }, [trpcClient]);

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
