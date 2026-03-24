/**
 * Reminder Job — WhatsApp/SMS 2-hour booking reminder
 * Runs every 30 minutes, sends WhatsApp templates to guests with upcoming bookings.
 * Uses node-cron. Called from server/_core/index.ts on startup.
 */

import cron from "node-cron";
import { NotificationService } from "./_core/notification";
import { MOCK_BOOKINGS } from "./mockData";

function getUpcomingBookings() {
  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60_000);
  const today = now.toISOString().split("T")[0];

  // Import mock bookings dynamically so it picks up live state
  const bookings = MOCK_BOOKINGS;

  return bookings.filter(b => {
    if (b.bookingDate !== today) return false;
    if (b.status !== "confirmed") return false;
    if ((b as any).reminderSent) return false; // don't double-send

    const [h, m] = b.bookingTime.split(":").map(Number);
    const bookingTime = new Date(now);
    bookingTime.setHours(h, m, 0, 0);

    const diffMs = bookingTime.getTime() - now.getTime();
    // Send reminder if booking is 90-150 minutes away
    return diffMs > 90 * 60_000 && diffMs < 150 * 60_000;
  });
}

export function startReminderJob() {
  // Run every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    const upcoming = getUpcomingBookings();

    if (upcoming.length === 0) {
      console.log("[ReminderJob] ⏰ No upcoming bookings needing reminders.");
      return;
    }

    console.log(`[ReminderJob] ⏰ Sending ${upcoming.length} booking reminder(s)...`);

    for (const booking of upcoming) {
      const phone = (booking as any).customerPhone || "+91 9999999999";
      const name = (booking as any).customerName || "Guest";

      try {
        await NotificationService.sendBookingReminder(
          phone,
          name,
          booking.bookingDate,
          booking.bookingTime,
          booking.partySize
        );
        (booking as any).reminderSent = true;
        console.log(`[ReminderJob] ✅ Reminder sent to ${name} (${phone})`);
      } catch (e) {
        console.error(`[ReminderJob] ❌ Failed to remind ${name}: ${e}`);
      }
    }
  });

  console.log("[ReminderJob] ⏰ Booking reminder cron started (runs every 30 min).");
}
