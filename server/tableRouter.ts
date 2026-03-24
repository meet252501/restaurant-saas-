import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { tables } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { observable } from "@trpc/server/observable";
import { ee, EVENTS } from "./events";
import { MOCK_TABLES } from "./mockData";

export const tableRouter = router({
  listByRestaurant: publicProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ input }) => {
      if (!process.env.DATABASE_URL) {
        return MOCK_TABLES.filter(t => t.restaurantId === input.restaurantId);
      }
      return await db.select().from(tables).where(eq(tables.restaurantId, input.restaurantId));
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["available", "occupied", "reserved", "cleaning", "blocked"]),
    }))
    .mutation(async ({ input }) => {
      if (!process.env.DATABASE_URL) {
        const t = MOCK_TABLES.find(t => t.id === input.id);
        if (t) t.status = input.status;
        ee.emit(EVENTS.TABLES_CHANGED);
        return { success: true };
      }
      await db.update(tables).set({ status: input.status }).where(eq(tables.id, input.id));
      ee.emit(EVENTS.TABLES_CHANGED);
      return { success: true };
    }),

  // ── NEW: Add a table ───────────────────────────────────────────────
  addTable: protectedProcedure
    .input(z.object({
      restaurantId: z.string(),
      capacity: z.number().min(1).max(20),
      zone: z.string().optional(),  // "Indoor" | "Outdoor" | "Rooftop" | "Private"
    }))
    .mutation(async ({ input }) => {
      const nextNumber = MOCK_TABLES.length > 0
        ? Math.max(...MOCK_TABLES.map(t => t.tableNumber)) + 1
        : 1;
      const id = `t${nextNumber}_${Date.now()}`;

      const newTable: any = {
        id,
        restaurantId: input.restaurantId,
        tableNumber: nextNumber,
        capacity: input.capacity,
        status: "available",
        zone: input.zone || "Indoor",
      };

      if (!process.env.DATABASE_URL) {
        MOCK_TABLES.push(newTable);
        ee.emit(EVENTS.TABLES_CHANGED);
        return newTable;
      }

      await db.insert(tables).values({
        id,
        restaurantId: input.restaurantId,
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
    .mutation(async ({ input }) => {
      if (!process.env.DATABASE_URL) {
        const t = MOCK_TABLES.find(t => t.id === input.id) as any;
        if (t) {
          if (input.capacity) t.capacity = input.capacity;
          if (input.zone) t.zone = input.zone;
        }
        ee.emit(EVENTS.TABLES_CHANGED);
        return { success: true };
      }
      if (input.capacity) {
        await db.update(tables).set({ capacity: input.capacity }).where(eq(tables.id, input.id));
      }
      ee.emit(EVENTS.TABLES_CHANGED);
      return { success: true };
    }),

  // ── NEW: Remove a table ────────────────────────────────────────────
  removeTable: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      if (!process.env.DATABASE_URL) {
        const idx = MOCK_TABLES.findIndex(t => t.id === input.id);
        if (idx !== -1) MOCK_TABLES.splice(idx, 1);
        ee.emit(EVENTS.TABLES_CHANGED);
        return { success: true };
      }
      await db.delete(tables).where(eq(tables.id, input.id));
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
