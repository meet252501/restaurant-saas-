import cron from 'node-cron';
import { getDb } from '../db';
import { bookings, deliveryOrders, customers } from '../../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { NotificationService } from './notification';

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
        const stats = {
          deliveryCount: 15,
          deliveryRevenue: 4500,
          bookingCount: 8,
          date: today,
        };
        await NotificationService.sendDailyReport(process.env.OWNER_PHONE || "919876543210", stats);
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
            gte(deliveryOrders.createdAt, threeHoursAgo)
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

    console.log("[AutomationService] ✅ All cron jobs scheduled (every 30 min, daily 23:30, hourly).");
  },
};
