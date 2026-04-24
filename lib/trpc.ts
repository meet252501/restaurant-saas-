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
    const host = debuggerHost.split(':')[0];
    // If it's localhost in the debugger host, it usually means we're in an emulator
    // otherwise it's the machine's local IP (e.g. 192.168.x.x)
    return host;
  }
  
  // Fallback: If you are seeing "Network Failed", update this IP to your current machine IP
  // or use the EXPO_PUBLIC_API_URL environment variable for a stable cloud URL.
  return '192.168.1.1'; 
}

const host = getHostName();
const port = process.env.EXPO_PUBLIC_SERVER_PORT || '3000';

// Use environment variable if provided (for permanent cloud/tunnel URLs), otherwise fallback to local IP
const envUrl = process.env.EXPO_PUBLIC_API_URL;
const baseUrl = envUrl || (host === 'localhost' ? `http://localhost:${port}` : `http://${host}:${port}`);

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
          async fetch(url, options) {
            try {
              const response = await fetch(url, { 
                ...options, 
                credentials: 'include',
                headers: {
                  ...options?.headers,
                  'Bypass-Tunnel-Reminder': 'true',
                  'bypass-tunnel-reminder': 'true'
                }
              });
              return response;
            } catch (err) {
              console.error('❌ [tRPC Fetch Error]:', err);
              if (err instanceof Error && err.message.includes('Network request failed')) {
                console.warn(
                  '💡 TIP: "Network Failed" usually means the app cannot reach the server.\n' +
                  `1. Current Base URL: ${baseUrl}\n` +
                  '2. Are your phone and laptop on the same WiFi?\n' +
                  '3. Is your firewall blocking port ' + port + '?\n' +
                  '4. Try setting a stable URL in .env (EXPO_PUBLIC_API_URL).'
                );
              }
              throw err;
            }
          },
        }),
      }),
    ],
  });
}

export const RESTAURANT_ID = 'res_default';
