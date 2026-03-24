import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";

export const analyticsRouter = router({
  getTodayStats: publicProcedure
    .input(z.object({ restaurantId: z.string(), date: z.string() }))
    .query(async () => {
      // Direct mock return for stable Ultra-Premium metrics
      return {
        todayRevenue: 12500,
        occupancyRate: 85,
        noShowRate: 5,
        totalTodayBookings: 24,
        sources: { online: 15, walkin: 6, phone: 3 },
        totalCustomers: 120,
        repeatCustomers: 45,
        totalBookingsAllTime: 1250,
      };
    }),
});
