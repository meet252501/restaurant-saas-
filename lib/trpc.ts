import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, splitLink, wsLink, createWSClient } from '@trpc/client';
import type { AppRouter } from '../server/routers';
import superjson from 'superjson';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const trpc = createTRPCReact<AppRouter>();

function getHostName(): string {
  if (Platform.OS === 'web') return 'localhost';

  // expo-constants gives us the local IP when running via Metro
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    return debuggerHost.split(':')[0];
  }
  // Fallback for production APK testing on local network
  return '192.168.31.161';
}

const host = getHostName();
const port = process.env.EXPO_PUBLIC_SERVER_PORT || '3000';

// Use localhost for web, IP for mobile, and override with production URL if needed
const baseUrl = host === 'localhost' ? `http://localhost:${port}` : `http://${host}:${port}`;

export const HttpUrl = `${baseUrl}/api/trpc`;
export const WsUrl = baseUrl.replace('http', 'ws') + '/api/trpc';

export function createTRPCClient() {
  const wsClient = createWSClient({
    url: WsUrl,
  });

  return trpc.createClient({
    links: [
      splitLink({
        condition(op) {
          return op.type === 'subscription';
        },
        true: wsLink({
          client: wsClient,
          transformer: superjson,
        }),
        false: httpBatchLink({
          url: HttpUrl,
          transformer: superjson,
          fetch(url, options) {
            return fetch(url, { 
              ...options, 
              credentials: 'include',
              headers: {
                ...options?.headers,
                'Bypass-Tunnel-Reminder': 'true',
                'bypass-tunnel-reminder': 'true'
              }
            });
          },
        }),
      }),
    ],
  });
}

export const RESTAURANT_ID = 'res_default';
