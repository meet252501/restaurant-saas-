import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, splitLink, wsLink, createWSClient } from '@trpc/client';
import type { AppRouter } from '../server/routers';
import superjson from 'superjson';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useSaaSStore } from './saas-store';

export const trpc = createTRPCReact<AppRouter>();

// Temporary placeholder for backward compatibility
export const RESTAURANT_ID = 'test-restaurant';

const getInitialBaseUrl = (): string => {
  if (Platform.OS === 'web') return 'http://localhost:3000';
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const hostName = debuggerHost.split(':')[0];
    return `http://${hostName}:3000`;
  }
  return 'http://192.168.1.1:3000'; 
};

export const getBaseUrl = () => useSaaSStore.getState().baseUrl || getInitialBaseUrl();
export const getHttpUrl = () => `${getBaseUrl()}/api/trpc`;
export const getWsUrl = () => getBaseUrl().replace('http', 'ws') + '/api/trpc';

// For backward compatibility with existing code
export function setBaseUrl(newUrl: string) {
  useSaaSStore.getState().setBaseUrl(newUrl);
}

export function createTRPCClient() {
  const wsClient = createWSClient({
    url: getWsUrl(),
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
          url: getHttpUrl(),
          transformer: superjson,
          async fetch(url, options) {
            const token = useSaaSStore.getState().authToken;
            // Ensure we use the latest baseUrl from store
            const currentHttpUrl = getHttpUrl();
            const dynamicUrl = url.toString().replace(/.*\/api\/trpc/, currentHttpUrl);
            
            try {
              const response = await fetch(dynamicUrl, { 
                ...options, 
                credentials: 'include',
                headers: {
                  ...options?.headers,
                  'Bypass-Tunnel-Reminder': 'true',
                  'bypass-tunnel-reminder': 'true',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
              });
              return response;
            } catch (err) {
              console.error('❌ [tRPC Fetch Error]:', err);
              throw err;
            }
          },
        }),
      }),
    ],
  });
}
