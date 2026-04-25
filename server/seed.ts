/**
 * server/seed.ts — Minimal server-side seeder (SQLite compatible)
 * Seeds default manager + waiter user accounts.
 * For full restaurant/table seeding, use: pnpm db:seed (scripts/seed.ts)
 */
import { getDb } from "./db";
import { users } from "./db";

async function seed() {
  console.log("Seeding users...");
  const db = getDb();
  if (!db) {
    console.warn("DB not available — skipping server seed");
    process.exit(0);
  }

  const now = new Date().toISOString();

  console.log("✅ Seed complete (No hardcoded users seeded).");

  process.exit(0);
}

seed().catch(e => { console.error("Seed failed:", e); process.exit(1); });
