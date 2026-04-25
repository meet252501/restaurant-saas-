import { db, isMockMode } from "./db";
import { bookings, deliveryOrders, reviews } from "../drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * MAINTENANCE JOB
 * Handles data retention policies:
 * - Local DB: Keep 30 days of data.
 * 
 * This job should be run daily at midnight or upon system startup.
 */
export async function runMaintenanceJob() {
  console.log("\n🧹 Starting Maintenance Job...");
  
  if (isMockMode()) {
    console.log("⚠️  Mock Mode active. Skipping DB cleanup.");
    return;
  }

  try {
    const now = new Date();
    
    // Retention (30 Days)
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    console.log(`[Maintenance] Cleaning Local DB (Cutoff: ${cutoffStr})...`);
    
    // Use the main db instance
    await db.delete(bookings).where(sql`${bookings.bookingDate} <= ${cutoffStr}`);
    await db.delete(deliveryOrders).where(sql`date(${deliveryOrders.createdAt}) <= ${cutoffStr}`);
    await db.delete(reviews).where(sql`date(${reviews.createdAt}) <= ${cutoffStr}`);

    console.log("✅ Maintenance Job Completed Successfully.\n");
  } catch (error: any) {
    console.error("❌ Maintenance Job Failed:", error.message);
  }
}

// Automatically export a task for systemRouter to call
export const maintenanceTask = {
  name: "Daily Data Cleanup",
  run: runMaintenanceJob,
  schedule: "0 0 * * *" // Midnight
};
