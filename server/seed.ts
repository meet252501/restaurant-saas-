import { db } from "./db";
import { users } from "../drizzle/schema";

async function seed() {
  console.log("Seeding database...");
  
  try {
    // Upsert a test manager with PIN 1234
    const managerId = "seed_manager_01";
    await db.insert(users).values({
      openId: managerId,
      name: "Test Manager",
      role: "manager",
      pinCode: "1234",
      lastSignedIn: new Date(),
    }).onDuplicateKeyUpdate({
      set: {
        role: "manager",
        pinCode: "1234",
        name: "Test Manager"
      }
    });

    console.log("✅ Seeded manager user (PIN: 1234)");

    const waitstaffId = "seed_waiter_01";
    await db.insert(users).values({
      openId: waitstaffId,
      name: "Test Waiter",
      role: "waiter",
      pinCode: "5678",
      lastSignedIn: new Date(),
    }).onDuplicateKeyUpdate({
      set: {
        role: "waiter",
        pinCode: "5678",
        name: "Test Waiter"
      }
    });

    console.log("✅ Seeded waiter user (PIN: 5678)");

  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    process.exit(0);
  }
}

seed();
