import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

export const cloudDataRouter = router({
  /** Fetch recent cloud archives for a restaurant (STUBBED) */
  getRecent: protectedProcedure
    .input(z.object({
      dataType: z.enum(["bookings", "deliveryOrders", "all"]).optional().default("all"),
    }))
    .query(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      return {
        archives: [],
        total: 0,
        retentionDays: 30,
        connected: false,
        message: "Cloud sync is currently disabled (Local-Only Mode)"
      };
    }),

  /** Check connection status (STUBBED) */
  getStatus: protectedProcedure.query(async () => {
    return {
      connected: false,
      tableExists: false,
      message: "Local-Only Mode Active",
      totalRecords: 0,
    };
  }),

  /** Manual sync (STUBBED) */
  syncToCloud: protectedProcedure
    .input(z.object({
      dataType: z.enum(["bookings", "deliveryOrders"]),
      records: z.array(z.record(z.string(), z.unknown())),
    }))
    .mutation(async () => {
      return {
        success: false,
        synced: 0,
        failed: 0,
        message: "Cloud sync disabled"
      };
    }),

  /** Purge (STUBBED) */
  purgeOldRecords: protectedProcedure
    .input(z.object({
      olderThanDays: z.number().min(1).max(90).optional().default(3),
    }))
    .mutation(async () => {
      return {
        success: true,
        purged: 0,
        remaining: 0,
      };
    }),

  /** Export (STUBBED) */
  exportRange: protectedProcedure
    .input(z.object({
      dataType: z.enum(["bookings", "deliveryOrders", "all"]).optional().default("all"),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    }))
    .query(async () => {
      return {
        records: [],
        total: 0,
        exportedAt: new Date().toISOString(),
      };
    }),
});
