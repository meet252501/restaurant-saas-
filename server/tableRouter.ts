import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { tables } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { db, isMockMode } from "./db";
import { observable } from "@trpc/server/observable";
import { ee, EVENTS } from "./events";
import { MOCK_TABLES } from "./mockData";

export const tableRouter = router({
  listByRestaurant: protectedProcedure
    .query(async ({ ctx }) => {
      const restaurantId = ctx.user.restaurantId;
      if (isMockMode()) {
        return MOCK_TABLES.filter(t => t.restaurantId === restaurantId);
      }
      return await db.select().from(tables).where(eq(tables.restaurantId, restaurantId));
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["available", "occupied", "reserved", "cleaning", "blocked"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId;
      if (isMockMode()) {
        const t = MOCK_TABLES.find(t => t.id === input.id && t.restaurantId === restaurantId);
        if (t) t.status = input.status;
        ee.emit(EVENTS.TABLES_CHANGED);
        return { success: true };
      }
      const result = await db
        .update(tables)
        .set({ status: input.status })
        .where(
          and(
            eq(tables.id, input.id),
            eq(tables.restaurantId, restaurantId)
          )
        );

      if (result.changes === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found or access denied." });
      }
      ee.emit(EVENTS.TABLES_CHANGED);
      return { success: true };
    }),

  // ── NEW: Add a table ───────────────────────────────────────────────
  addTable: protectedProcedure
    .input(z.object({
      capacity: z.number().min(1).max(20),
      zone: z.string().optional(),  // "Indoor" | "Outdoor" | "Rooftop" | "Private"
    }))
    .mutation(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId;
      const nextNumber = MOCK_TABLES.filter(t => t.restaurantId === restaurantId).length > 0
        ? Math.max(...MOCK_TABLES.filter(t => t.restaurantId === restaurantId).map(t => t.tableNumber)) + 1
        : 1;
      const id = `t${nextNumber}_${Date.now()}`;

      const newTable: any = {
        id,
        restaurantId,
        tableNumber: nextNumber,
        capacity: input.capacity,
        status: "available",
        zone: input.zone || "Indoor",
      };

      if (isMockMode()) {
        MOCK_TABLES.push(newTable);
        ee.emit(EVENTS.TABLES_CHANGED);
        return newTable;
      }

      await db.insert(tables).values({
        id,
        restaurantId,
        tableNumber: nextNumber,
        capacity: input.capacity,
        status: "available",
      });
      ee.emit(EVENTS.TABLES_CHANGED);
      return newTable;
    }),

  // ── NEW: Update capacity / zone ────────────────────────────────────
  updateTable: protectedProcedure
    .input(z.object({
      id: z.string(),
      capacity: z.number().min(1).max(20).optional(),
      zone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId;
      if (isMockMode()) {
        const t = MOCK_TABLES.find(t => t.id === input.id && t.restaurantId === restaurantId) as any;
        if (t) {
          if (input.capacity) t.capacity = input.capacity;
          if (input.zone) t.zone = input.zone;
        }
        ee.emit(EVENTS.TABLES_CHANGED);
        return { success: true };
      }
      
      const updateData: any = {};
      if (input.capacity) updateData.capacity = input.capacity;
      // Note: zone might not be in the actual DB schema if it was only in mock, 
      // but if it is, we should update it. 
      
      const result = await db
        .update(tables)
        .set(updateData)
        .where(
          and(
            eq(tables.id, input.id),
            eq(tables.restaurantId, restaurantId)
          )
        );

      if (result.changes === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found or access denied." });
      }
        
      ee.emit(EVENTS.TABLES_CHANGED);
      return { success: true };
    }),

  // ── NEW: Remove a table ────────────────────────────────────────────
  removeTable: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId;
      if (isMockMode()) {
        const idx = MOCK_TABLES.findIndex(t => t.id === input.id && t.restaurantId === restaurantId);
        if (idx !== -1) MOCK_TABLES.splice(idx, 1);
        ee.emit(EVENTS.TABLES_CHANGED);
        return { success: true };
      }
      const result = await db
        .delete(tables)
        .where(
          and(
            eq(tables.id, input.id),
            eq(tables.restaurantId, restaurantId)
          )
        );

      if (result.changes === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found or access denied." });
      }
      ee.emit(EVENTS.TABLES_CHANGED);
      return { success: true };
    }),

  onUpdate: publicProcedure.subscription(() => {
    return observable<number>((emit) => {
      const onUpdate = () => emit.next(Date.now());
      ee.on(EVENTS.TABLES_CHANGED, onUpdate);
      return () => ee.off(EVENTS.TABLES_CHANGED, onUpdate);
    });
  }),
});
