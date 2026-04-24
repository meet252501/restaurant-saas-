import { getDb } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB not found");
    process.exit(1);
  }

  try {
    console.log("Applying migrations...");
    await db.run(sql`ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0`);
    await db.run(sql`ALTER TABLE users ADD COLUMN lockout_until TEXT`);
    console.log("✅ Migration applied successfully.");
  } catch (err: any) {
    console.log("⚠️ Migration skipped (columns might already exist):", err.message);
  }
  process.exit(0);
}

main();
