
import { db } from '../server/db';
import * as schema from '../drizzle/schema';

async function check() {
  try {
    const all = await db.select().from(schema.manager);
    console.log('Managers:', JSON.stringify(all, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}
check();
