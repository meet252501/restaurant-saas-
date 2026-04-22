import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { tursoClient } from "../_core/tursoClient";
import { TRPCError } from "@trpc/server";

export const cloudDataRouter = router({
  getRecent: publicProcedure
    .input(z.object({
      restaurantId: z.string(),
    }))
    .query(async ({ input }) => {
      if (!tursoClient) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Turso Cloud connection is not configured.",
        });
      }

      try {
        const result = await tursoClient.execute({
          sql: `SELECT * FROM cloud_archives WHERE restaurant_id = ? ORDER BY archived_at DESC LIMIT 500`,
          args: [input.restaurantId],
        });

        // LibSQL returns rows as arrays/objects based on format, we'll map it safely
        const archives = result.rows.map((row: any) => ({
          id: row.id || row[0],
          restaurantId: row.restaurant_id || row[1],
          dataType: row.data_type || row[2],
          dataJson: row.data_json || row[3],
          archivedAt: row.archived_at || row[4],
        }));

        return archives;
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch cloud data: " + err.message,
        });
      }
    }),
});
