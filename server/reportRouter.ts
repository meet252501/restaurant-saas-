import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { deliveryOrders, bookings } from "../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { NotificationService } from "./_core/notification";

export const reportRouter = router({
  sendDailySummary: protectedProcedure
    .input(z.object({
      date: z.string(), // YYYY-MM-DD
      ownerPhone: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const restaurantId = ctx.user.restaurantId;

      // 1. Get Delivery Stats
      const dayDelivery = await db.select({
        count: sql<number>`count(*)`,
        revenue: sql<number>`sum(total_amount)`
      }).from(deliveryOrders)
        .where(
          and(
            sql`date(created_at) = ${input.date}`,
            eq(deliveryOrders.restaurantId, restaurantId)
          )
        );

      // 2. Get Booking Stats
      const dayBookings = await db.select({
        count: sql<number>`count(*)`
      }).from(bookings)
        .where(
          and(
            eq(bookings.bookingDate, input.date),
            eq(bookings.restaurantId, restaurantId)
          )
        );

      const stats = {
        deliveryCount: dayDelivery[0]?.count || 0,
        deliveryRevenue: dayDelivery[0]?.revenue || 0,
        bookingCount: dayBookings[0]?.count || 0,
        date: input.date
      };

      // 3. Send WhatsApp
      const result = await NotificationService.sendDailyReport(input.ownerPhone, stats);

      return { success: true, stats, result };
    }),
});
