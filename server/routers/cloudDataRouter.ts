import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { tursoClient } from "../_core/tursoClient";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

export const cloudDataRouter = router({
  /** Fetch recent cloud archives for a restaurant (read-only) */
  getRecent: publicProcedure
    .input(z.object({
      restaurantId: z.string(),
      dataType: z.enum(["bookings", "deliveryOrders", "all"]).optional().default("all"),
    }))
    .query(async ({ input }) => {
      if (!tursoClient) {
        // Return simulated mock data if Turso is not connected so the UI works
        return {
          archives: [
            {
              id: "mock_1",
              restaurantId: input.restaurantId,
              dataType: "bookings",
              dataJson: JSON.stringify({
                bookingDate: new Date().toISOString().split('T')[0],
                bookingTime: "19:00",
                partySize: 4,
                status: "completed",
              }),
              archivedAt: new Date().toISOString(),
            },
            {
              id: "mock_2",
              restaurantId: input.restaurantId,
              dataType: "deliveryOrders",
              dataJson: JSON.stringify({
                platform: "Zomato",
                totalAmount: 1250,
                status: "delivered",
              }),
              archivedAt: new Date(Date.now() - 86400000).toISOString(),
            }
          ],
          total: 2,
          retentionDays: 3,
          connected: false,
        };
      }

      try {
        const typeFilter = input.dataType === "all"
          ? ""
          : `AND data_type = '${input.dataType}'`;

        const result = await tursoClient.execute({
          sql: `SELECT * FROM cloud_archives 
                WHERE restaurant_id = ? ${typeFilter}
                ORDER BY archived_at DESC 
                LIMIT 500`,
          args: [input.restaurantId],
        });

        const archives = result.rows.map((row: any) => ({
          id: row.id || row[0],
          restaurantId: row.restaurant_id || row[1],
          dataType: row.data_type || row[2],
          dataJson: row.data_json || row[3],
          archivedAt: row.archived_at || row[4],
        }));

        return {
          archives,
          total: archives.length,
          retentionDays: 3,
          connected: true,
        };
      } catch (err: any) {
        console.warn("[Turso] Failed to fetch cloud data, falling back to mock data:", err.message);
        // Fall back to mock data if the connection fails (e.g., 404 or invalid credentials)
        return {
          archives: [
            {
              id: "mock_1",
              restaurantId: input.restaurantId,
              dataType: "bookings",
              dataJson: JSON.stringify({
                bookingDate: new Date().toISOString().split('T')[0],
                bookingTime: "19:00",
                partySize: 4,
                status: "completed",
              }),
              archivedAt: new Date().toISOString(),
            },
            {
              id: "mock_2",
              restaurantId: input.restaurantId,
              dataType: "deliveryOrders",
              dataJson: JSON.stringify({
                platform: "Zomato",
                totalAmount: 1250,
                status: "delivered",
              }),
              archivedAt: new Date(Date.now() - 86400000).toISOString(),
            }
          ],
          total: 2,
          retentionDays: 3,
          connected: false,
        };
      }
    }),

  /** Check Turso connection status & table existence */
  getStatus: publicProcedure.query(async () => {
    if (!tursoClient) {
      return {
        connected: false,
        tableExists: false,
        message: "TURSO_DATABASE_URL / TURSO_AUTH_TOKEN not set in .env",
        totalRecords: 0,
      };
    }

    try {
      // Ensure the cloud_archives table exists
      await tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS cloud_archives (
          id TEXT PRIMARY KEY,
          restaurant_id TEXT NOT NULL,
          data_type TEXT NOT NULL,
          data_json TEXT NOT NULL,
          archived_at DATETIME DEFAULT (datetime('now'))
        )
      `);

      const countResult = await tursoClient.execute(
        `SELECT COUNT(*) as total FROM cloud_archives`
      );

      const total = Number((countResult.rows[0] as any)?.total ?? 0);
      return {
        connected: true,
        tableExists: true,
        totalRecords: total,
        message: `Turso connected. ${total} archived records.`,
      };
    } catch (err: any) {
      return {
        connected: false,
        tableExists: false,
        totalRecords: 0,
        message: "Connection error: " + err.message,
      };
    }
  }),

  /** Manual sync: push data records to Turso cloud */
  syncToCloud: protectedProcedure
    .input(z.object({
      restaurantId: z.string(),
      dataType: z.enum(["bookings", "deliveryOrders"]),
      records: z.array(z.record(z.string(), z.unknown())),
    }))
    .mutation(async ({ input }) => {
      if (!tursoClient) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Turso not configured.",
        });
      }

      let synced = 0;
      const errors: string[] = [];

      for (const record of input.records) {
        try {
          await tursoClient.execute({
            sql: `INSERT OR REPLACE INTO cloud_archives (id, restaurant_id, data_type, data_json)
                  VALUES (?, ?, ?, ?)`,
            args: [
              crypto.randomUUID(),
              input.restaurantId,
              input.dataType,
              JSON.stringify(record),
            ],
          });
          synced++;
        } catch (err: any) {
          errors.push(err.message);
        }
      }

      return {
        success: errors.length === 0,
        synced,
        failed: errors.length,
        errors: errors.slice(0, 5),
      };
    }),

  /** Purge records older than N days (default 3) */
  purgeOldRecords: protectedProcedure
    .input(z.object({
      restaurantId: z.string(),
      olderThanDays: z.number().min(1).max(90).optional().default(3),
    }))
    .mutation(async ({ input }) => {
      if (!tursoClient) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Turso not configured.",
        });
      }

      try {
        // Count before
        const before = await tursoClient.execute({
          sql: `SELECT COUNT(*) as c FROM cloud_archives WHERE restaurant_id = ?`,
          args: [input.restaurantId],
        });
        const countBefore = Number((before.rows[0] as any)?.c ?? 0);

        // Delete old records
        await tursoClient.execute({
          sql: `DELETE FROM cloud_archives 
                WHERE restaurant_id = ? 
                AND archived_at < datetime('now', ?)`,
          args: [input.restaurantId, `-${input.olderThanDays} days`],
        });

        // Count after
        const after = await tursoClient.execute({
          sql: `SELECT COUNT(*) as c FROM cloud_archives WHERE restaurant_id = ?`,
          args: [input.restaurantId],
        });
        const countAfter = Number((after.rows[0] as any)?.c ?? 0);

        return {
          success: true,
          purged: countBefore - countAfter,
          remaining: countAfter,
          olderThanDays: input.olderThanDays,
        };
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Purge failed: " + err.message,
        });
      }
    }),

  /** Export a date range of archived data as JSON */
  exportRange: protectedProcedure
    .input(z.object({
      restaurantId: z.string(),
      dataType: z.enum(["bookings", "deliveryOrders", "all"]).optional().default("all"),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      if (!tursoClient) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Turso not configured." });
      }

      const typeClause = input.dataType !== "all" ? `AND data_type = '${input.dataType}'` : "";
      const fromClause = input.fromDate ? `AND archived_at >= '${input.fromDate}'` : "";
      const toClause = input.toDate ? `AND archived_at <= '${input.toDate}'` : "";

      const result = await tursoClient.execute({
        sql: `SELECT * FROM cloud_archives 
              WHERE restaurant_id = ? ${typeClause} ${fromClause} ${toClause}
              ORDER BY archived_at DESC LIMIT 1000`,
        args: [input.restaurantId],
      });

      const records = result.rows.map((row: any) => {
        let parsed: any = {};
        try { parsed = JSON.parse(row.data_json || row[3] || "{}"); } catch { /**/ }
        return {
          id: row.id || row[0],
          dataType: row.data_type || row[2],
          archivedAt: row.archived_at || row[4],
          data: parsed,
        };
      });

      return {
        records,
        total: records.length,
        exportedAt: new Date().toISOString(),
      };
    }),
});
