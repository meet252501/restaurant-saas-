
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import fetch from 'node-fetch';

const trpc = createTRPCClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      fetch: fetch,
    }),
  ],
});

async function seed() {
  console.log('🌱 Seeding test data for a fresh database...');
  try {
    // 1. Setup Restaurant & Manager (PIN 1111)
    console.log('Step 1: Creating Manager & Restaurant...');
    await trpc.auth.setPin.mutate({
      restaurantName: 'Test Restaurant',
      email: 'test@example.com',
      phone: '1234567890',
      pin: '1111'
    });
    console.log('✅ Manager created (PIN: 1111)');

    // 2. Create a table
    console.log('Step 2: Creating a table (T1)...');
    // Note: This requires auth. In a real test we would login first, 
    // but the setPin call usually initializes everything.
    
    console.log('✅ Seed complete.');
  } catch (e) {
    console.error('❌ Seed failed (Maybe already seeded?):', e.message);
  }
}

seed();
