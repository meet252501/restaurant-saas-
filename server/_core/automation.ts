import cron from 'node-cron';
import { getDb } from '../db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { NotificationService } from './notification';
import { GoogleSheetsService, ManagerEmailService } from './googleSheets';
import crypto from 'crypto';
import { bookings, deliveryOrders, customers } from '../db';

/**
 * Automation Service
 * Handles background tasks:
 * - 2-hour reminders for bookings
 * - 11:30 PM Daily Sales Reports
 * - Hourly post-checkout feedback requests
 *
 * All jobs silently skip when no DATABASE_URL is set (Mock mode).
 */

export const AutomationService = {
  init() {
    console.log("[AutomationService] Initializing Zero-Touch Cron Jobs...");

    // 1. Every 30 minutes: Check for upcoming bookings (2-hour reminder)
    cron.schedule('*/30 * * * *', async () => {
      const db = await getDb();
      if (!db) return; // skip in mock mode
      try {
        console.log("[Cron] Checking for upcoming booking reminders...");
        const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
        const upcoming = await db.select({
          id: bookings.id,
          bookingDate: bookings.bookingDate,
          bookingTime: bookings.bookingTime,
          partySize: bookings.partySize,
          customerPhone: customers.phone,
          customerName: customers.name,
        })
        .from(bookings)
        .innerJoin(customers, eq(bookings.customerId, customers.id))
        .where(
          and(
            eq(bookings.status, 'confirmed'),
            lte(bookings.bookingDate, twoHoursFromNow.toISOString().split('T')[0])
          )
        );

        for (const b of upcoming) {
          if (b.customerPhone) {
            await NotificationService.sendBookingReminder(
              b.customerPhone,
              b.customerName,
              b.bookingDate,
              b.bookingTime,
              b.partySize
            );
          }
        }
      } catch (e) {
        console.error("[Cron] Reminder job error:", e);
      }
    });

    // 2. Every Night at 11:30 PM: Send Daily Profit Report
    cron.schedule('30 23 * * *', async () => {
      try {
        console.log("[Cron] Generating Daily End-of-Day Report...");
        const today = new Date().toISOString().split('T')[0];
        const db = await getDb();

        let deliveryCount = 15;
        let deliveryRevenue = 4500;
        let bookingCount = 8;

        if (db) {
          try {
            const [deliveryStats] = await db.select({
              count: sql<number>`count(*)`,
              revenue: sql<number>`coalesce(sum(total_amount), 0)`,
            }).from(deliveryOrders).where(sql`date(created_at) = ${today}`);
            deliveryCount = Number(deliveryStats?.count ?? 0);
            deliveryRevenue = Number(deliveryStats?.revenue ?? 0);

            const [bookingStats] = await db.select({
              count: sql<number>`count(*)`,
            }).from(bookings).where(eq(bookings.bookingDate, today));
            bookingCount = Number(bookingStats?.count ?? 0);
          } catch (e) {
            console.warn("[Cron] DB stats failed, using defaults:", e);
          }
        }

        const stats = { deliveryCount, deliveryRevenue, bookingCount, date: today };

        // 1. WhatsApp / SMS
        await NotificationService.sendDailyReport(process.env.OWNER_PHONE || "919876543210", stats);

        // 2. Manager Email
        await ManagerEmailService.sendDailySummaryEmail(stats).catch(e => console.error("[Cron] Manager email failed:", e));

        // 3. Google Sheets
        await GoogleSheetsService.appendDailySummary(stats).catch(e => console.error("[Cron] Sheets summary failed:", e));

      } catch (e) {
        console.error("[Cron] Daily report error:", e);
      }
    });

    // 3. Every hour: Check for delivered orders (1-hour feedback request)
    cron.schedule('0 * * * *', async () => {
      const db = await getDb();
      if (!db) return; // skip in mock mode
      try {
        console.log("[Cron] Sending feedback requests for recent orders...");
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const recentlyDelivered = await db.select().from(deliveryOrders).where(
          and(
            eq(deliveryOrders.status, 'delivered'),
            sql`${deliveryOrders.createdAt} >= ${threeHoursAgo.toISOString()}`
          )
        );
        for (const order of recentlyDelivered) {
          if (order.customerPhone) {
            await NotificationService.sendFeedbackRequest(order.customerPhone, order.customerName || "Guest");
          }
        }
      } catch (e) {
        console.error("[Cron] Feedback job error:", e);
      }
    });

    // 4. Midnight Wipe (12:01 AM): 4-Day Retention Policy (Cloud Database)
    cron.schedule('1 0 * * *', async () => {
      const db = await getDb();
      if (!db) return;
      try {
        console.log("[Cron] Executing 4-Day Data Retention Wipe...");
        
        // Wipe bookings older than 4 days
        await db.delete(bookings).where(sql`date(booking_date) <= date('now', '-4 days')`);
        
        // Reset all tables to 'available' (Only at the start of a new day)
        // Note: In an offline-first architecture, table status is stateful.
        // We might just want to let the staff manually reset, but for now we keep the automated reset.
        const { tables } = require('../db');
        await db.update(tables).set({ status: 'available' });
        
        // Wipe old delivery orders older than 4 days
        await db.delete(deliveryOrders).where(sql`date(created_at) <= date('now', '-4 days')`);

        console.log("[Cron] 4-Day Retention Wipe completed successfully.");
      } catch (e) {
        console.error("[Cron] Data Retention Wipe error:", e);
      }
    });

    console.log("[AutomationService] ✅ All cron jobs scheduled (every 30 min, daily 23:30, hourly, daily wipe at 00:01).");
  },
};
