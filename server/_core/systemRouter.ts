import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      }),
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      }),
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  resetDatabase: adminProcedure
    .mutation(async () => {
      const { db } = await import("../db");
      const { bookings, tables, deliveryOrders } = await import("../../drizzle/schema");
      const { sql } = await import("drizzle-orm");

      console.log("[Manual Reset] Wiping database...");

      // Delete old bookings (anything before today)
      await db.delete(bookings).where(sql`date(booking_date) < date('now')`);

      // Reset all tables to available
      await db.update(tables).set({ status: 'available' });

      // Delete old delivery orders
      await db.delete(deliveryOrders).where(sql`date(created_at) < date('now')`);

      return { success: true };
    }),
});
