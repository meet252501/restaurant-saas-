import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "./_core/trpc";
import { tables, bookings } from "./db";
import { eq, and, sql } from "drizzle-orm";
import { db, isMockMode } from "./db";
import { MOCK_TABLES, MOCK_BOOKINGS } from "./mockData";
import { observable } from "@trpc/server/observable";
import { ee, EVENTS } from "./events";

/**
 * STAFF ROUTER
 * Protected endpoints for restaurant staff to manage tables, bookings, and operations
 * All endpoints require authentication via protectedProcedure
 */

export const staffRouter = router({
  getTableBoard: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      const isMock = isMockMode();

      let allTables: any[] = [];
      try {
        allTables = await db
          .select()
          .from(tables)
          .where(eq(tables.restaurantId, restaurantId));
      } catch (e) {
        console.warn("[DB] Table fetch failed, using mock data", e);
        allTables = MOCK_TABLES;
      }

      // Get all bookings for the day
      let dayBookings: any[] = [];
      try {
        dayBookings = await db
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.restaurantId, restaurantId),
              eq(bookings.bookingDate, input.date)
            )
          );
      } catch (e) {
        dayBookings = MOCK_BOOKINGS.filter(b => b.restaurantId === restaurantId && b.bookingDate === input.date);
      }

      // Enrich table data with booking information
      const tableBoard = allTables.map((table: any) => {
        const nextBooking = dayBookings.find(
          b => b.tableId === table.id && b.status !== 'cancelled'
        );

        return {
          ...table,
          nextBooking: nextBooking || null,
          isAvailable: table.status === 'available' && !nextBooking,
          statusColor: getStatusColor(table.status),
        };
      });

      return tableBoard;
    }),

  updateTableStatus: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        status: z.enum(['available', 'occupied', 'cleaning', 'blocked']),
        duration: z.number().optional(), // Duration in minutes (for cleaning/blocking)
      })
    )
    .mutation(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      const isMock = isMockMode();
      
      if (isMock) {
        const table = MOCK_TABLES.find(t => t.id === input.tableId && t.restaurantId === restaurantId);
        if (!table) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Table not found in mock data or access denied." });
        }
        table.status = input.status;
          // Auto-reset cleaning/blocked after duration
          if (input.duration && (input.status === 'cleaning' || input.status === 'blocked')) {
            setTimeout(() => {
              table.status = 'available';
            }, input.duration * 60 * 1000);
          }
        return { success: true, message: `Table status updated to ${input.status}` };
      }

      try {
        const result = await db
          .update(tables)
          .set({
            status: input.status,
          })
          .where(
            and(
              eq(tables.id, input.tableId),
              eq(tables.restaurantId, restaurantId)
            )
          );

        const affected = (result as any).rowsAffected ?? (result as any).changes;
        if (affected === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Table not found or access denied." });
        }

        // If setting to cleaning/blocked, schedule auto-reset
        if (input.duration && (input.status === 'cleaning' || input.status === 'blocked')) {
          setTimeout(async () => {
            await db
              .update(tables)
              .set({ status: 'available' })
              .where(
                and(
                  eq(tables.id, input.tableId),
                  eq(tables.restaurantId, restaurantId)
                )
              );
            ee.emit(EVENTS.BOOKINGS_CHANGED);
          }, input.duration * 60 * 1000);
        }

        ee.emit(EVENTS.BOOKINGS_CHANGED);
        return { success: true, message: `Table status updated to ${input.status}` };
      } catch (e) {
        console.error("[DB] Table status update failed:", e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to update table status'
        });
      }
    }),

  forceBookTable: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        bookingDate: z.string(),
        bookingTime: z.string(),
        customerName: z.string(),
        customerPhone: z.string(),
        partySize: z.number(),
        reason: z.string().optional(), // Why this override was needed
      })
    )
    .mutation(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      const isMock = isMockMode();

      const bookingId = `bk_override_${Date.now()}`;

      const newBooking: any = {
        id: bookingId,
        restaurantId,
        customerId: `cust_${Date.now()}`,
        tableId: input.tableId,
        bookingDate: input.bookingDate,
        bookingTime: input.bookingTime,
        partySize: input.partySize,
        status: 'confirmed',
        source: 'staff_override',
        specialRequests: `STAFF OVERRIDE: ${input.reason || 'Manual booking'}`,
        coverCharge: 0,
        paymentStatus: 'unpaid',
      };

      if (isMock) {
        MOCK_BOOKINGS.push(newBooking);
      } else {
        try {
          await db.insert(bookings).values(newBooking);
        } catch (e) {
          console.error("[DB] Force booking failed:", e);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: 'Failed to create override booking'
          });
        }
      }

      ee.emit(EVENTS.BOOKINGS_CHANGED);
      return {
        success: true,
        bookingId,
        message: `Table ${input.tableId} force-booked for ${input.customerName}`,
      };
    }),

  checkInCustomer: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      const isMock = isMockMode();

      if (isMock) {
        const booking = MOCK_BOOKINGS.find(b => b.id === input.bookingId && b.restaurantId === restaurantId);
        if (!booking) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found in mock data or access denied." });
        }
        booking.status = 'seated';
        booking.checkedInAt = new Date().toISOString();
        return { success: true, message: 'Customer checked in' };
      }

      try {
        const result = await db
          .update(bookings)
          .set({
            status: 'seated',
          })
          .where(
            and(
              eq(bookings.id, input.bookingId),
              eq(bookings.restaurantId, restaurantId)
            )
          );

        const affected = (result as any).rowsAffected ?? (result as any).changes;
        if (affected === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found or access denied." });
        }

        ee.emit(EVENTS.BOOKINGS_CHANGED);
        return { success: true, message: 'Customer checked in' };
      } catch (e) {
        console.error("[DB] Check-in failed:", e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to check in customer'
        });
      }
    }),

  checkOutCustomer: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        finalBill: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      const isMock = isMockMode();

      if (isMock) {
        const booking = MOCK_BOOKINGS.find(b => b.id === input.bookingId && b.restaurantId === restaurantId);
        if (!booking) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found in mock data or access denied." });
        }
        booking.status = 'done';
        booking.checkedOutAt = new Date().toISOString();
        if (input.finalBill) booking.finalBill = input.finalBill;
        return { success: true, message: 'Customer checked out' };
      }

      try {
        const result = await db
          .update(bookings)
          .set({
            status: 'done',
            finalBill: input.finalBill || 0,
          })
          .where(
            and(
              eq(bookings.id, input.bookingId),
              eq(bookings.restaurantId, restaurantId)
            )
          );

        const affected = (result as any).rowsAffected ?? (result as any).changes;
        if (affected === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found or access denied." });
        }

        ee.emit(EVENTS.BOOKINGS_CHANGED);
        return { success: true, message: 'Customer checked out' };
      } catch (e) {
        console.error("[DB] Check-out failed:", e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to check out customer'
        });
      }
    }),

  markNoShow: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      const isMock = isMockMode();

      if (isMock) {
        const booking = MOCK_BOOKINGS.find(b => b.id === input.bookingId && b.restaurantId === restaurantId);
        if (!booking) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found in mock data or access denied." });
        }
        booking.status = 'no_show';
        booking.noShowAt = new Date().toISOString();
        return { success: true, message: 'Marked as no-show' };
      }

      try {
        const result = await db
          .update(bookings)
          .set({
            status: 'no_show',
          })
          .where(
            and(
              eq(bookings.id, input.bookingId),
              eq(bookings.restaurantId, restaurantId)
            )
          );

        const affected = (result as any).rowsAffected ?? (result as any).changes;
        if (affected === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found or access denied." });
        }

        ee.emit(EVENTS.BOOKINGS_CHANGED);
        return { success: true, message: 'Marked as no-show' };
      } catch (e) {
        console.error("[DB] No-show marking failed:", e);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: 'Failed to mark as no-show'
        });
      }
    }),

  getTodaySummary: protectedProcedure
    .query(async ({ ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      const today = new Date().toISOString().split('T')[0];
      const isMock = isMockMode();

      let dayBookings: any[] = [];
      try {
        dayBookings = await db
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.restaurantId, restaurantId),
              eq(bookings.bookingDate, today)
            )
          );
      } catch (e) {
        dayBookings = MOCK_BOOKINGS.filter(b => b.restaurantId === restaurantId && b.bookingDate === today);
      }

      return {
        totalBookings: dayBookings.length,
        confirmedBookings: dayBookings.filter((b: any) => b.status === 'confirmed').length,
        checkedIn: dayBookings.filter((b: any) => b.status === 'seated').length,
        completed: dayBookings.filter((b: any) => b.status === 'done').length,
        noShows: dayBookings.filter((b: any) => b.status === 'no_show').length,
        cancelled: dayBookings.filter((b: any) => b.status === 'cancelled').length,
        averagePartySize: Math.round(
          dayBookings.reduce((sum: number, b: any) => sum + (b.partySize || 0), 0) / (dayBookings.length || 1)
        ),
        peakHour: getPeakHour(dayBookings),
      };
    }),


  /**
   * Real-time subscription to table status changes
   * Staff dashboard subscribes to this to get live updates
   */
  onTableStatusChange: protectedProcedure.subscription(() => {
    return observable<number>((emit) => {
      const onUpdate = () => emit.next(Date.now());
      ee.on(EVENTS.BOOKINGS_CHANGED, onUpdate);
      return () => ee.off(EVENTS.BOOKINGS_CHANGED, onUpdate);
    });
  }),
});

/**
 * Helper functions
 */

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    available: '#10b981', // Green
    occupied: '#ef4444', // Red
    cleaning: '#f59e0b', // Amber
    blocked: '#6b7280', // Gray
  };
  return colors[status] || '#9ca3af';
}

function getPeakHour(bookings: any[]): string {
  if (bookings.length === 0) return 'N/A';

  const hourCounts: Record<string, number> = {};
  bookings.forEach(b => {
    const hour = b.bookingTime.split(':')[0];
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const peakHour = Object.entries(hourCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a
  )[0];

  return `${peakHour}:00`;
}
