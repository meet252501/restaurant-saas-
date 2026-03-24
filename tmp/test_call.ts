import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server/routers';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
    }),
  ],
});

async function main() {
  console.log("🚀 Testing AI Voice Call Mutation...");
  try {
    // We need a real booking ID from the DB or seed
    const result = await client.voice.startBookingCall.mutate({ bookingId: "b1" });
    console.log("✅ Mutation Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Mutation Error:", error);
  }
}

main();
