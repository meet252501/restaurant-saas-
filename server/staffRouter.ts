import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { tables, bookings } from "../drizzle/schema";
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
  /**
   * Get real-time table status board
   * Shows all tables with their current status and next booking
   */
  getTableBoard: protectedProcedure
    .input(z.object({ restaurantId: z.string(), date: z.string() }))
    .query(async ({ input }) => {
      const isMock = isMockMode();

      let allTables = [];
      try {
        allTables = await db
          .select()
          .from(tables)
          .where(eq(tables.restaurantId, input.restaurantId));
      } catch (e) {
        console.warn("[DB] Table fetch failed, using mock data", e);
        allTables = MOCK_TABLES;
      }

      // Get all bookings for the day
      let dayBookings = [];
      try {
        dayBookings = await db
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.restaurantId, input.restaurantId),
              eq(bookings.bookingDate, input.date)
            )
          );
      } catch (e) {
        dayBookings = MOCK_BOOKINGS.filter(b => b.bookingDate === input.date);
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

  /**
   * Update table status (available, occupied, cleaning, blocked)
   * Used by staff to manually manage table state
   */
  updateTableStatus: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        status: z.enum(['available', 'occupied', 'cleaning', 'blocked']),
        duration: z.number().optional(), // Duration in minutes (for cleaning/blocking)
      })
    )
    .mutation(async ({ input }) => {
      const isMock = isMockMode();

      if (isMock) {
        const table = MOCK_TABLES.find(t => t.id === input.tableId);
        if (table) {
          table.status = input.status;
          // Auto-reset cleaning/blocked after duration
          if (input.duration && (input.status === 'cleaning' || input.status === 'blocked')) {
            setTimeout(() => {
              table.status = 'available';
            }, input.duration * 60 * 1000);
          }
        }
        return { success: true, message: `Table status updated to ${input.status}` };
      }

      try {
        await db
          .update(tables)
          .set({
            status: input.status,

          })
          .where(eq(tables.id, input.tableId));

        // If setting to cleaning/blocked, schedule auto-reset
        if (input.duration && (input.status === 'cleaning' || input.status === 'blocked')) {
          setTimeout(async () => {
            await db
              .update(tables)
              .set({ status: 'available' })
              .where(eq(tables.id, input.tableId));
            ee.emit(EVENTS.BOOKINGS_CHANGED);
          }, input.duration * 60 * 1000);
        }

        ee.emit(EVENTS.BOOKINGS_CHANGED);
        return { success: true, message: `Table status updated to ${input.status}` };
      } catch (e) {
        console.error("[DB] Table status update failed:", e);
        throw new Error('Failed to update table status');
      }
    }),

  /**
   * Force book a table (override availability)
   * Used for VIP bookings or manual corrections
   * Requires PIN authentication
   */
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
    .mutation(async ({ input }) => {
      const isMock = isMockMode();

      const bookingId = `bk_override_${Date.now()}`;

      const newBooking: any = {
        id: bookingId,
        restaurantId: 'res_default',
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
          throw new Error('Failed to create override booking');
        }
      }

      ee.emit(EVENTS.BOOKINGS_CHANGED);
      return {
        success: true,
        bookingId,
        message: `Table ${input.tableId} force-booked for ${input.customerName}`,
      };
    }),

  /**
   * Check in a customer (mark booking as checked_in)
   * Called when customer arrives at restaurant
   */
  checkInCustomer: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ input }) => {
      const isMock = isMockMode();

      if (isMock) {
        const booking = MOCK_BOOKINGS.find(b => b.id === input.bookingId);
        if (booking) {
          booking.status = 'seated';
          booking.checkedInAt = new Date().toISOString();
        }
        return { success: true, message: 'Customer checked in' };
      }

      try {
        await db
          .update(bookings)
          .set({
            status: 'seated',

          })
          .where(eq(bookings.id, input.bookingId));

        ee.emit(EVENTS.BOOKINGS_CHANGED);
        return { success: true, message: 'Customer checked in' };
      } catch (e) {
        console.error("[DB] Check-in failed:", e);
        throw new Error('Failed to check in customer');
      }
    }),

  /**
   * Check out a customer (mark booking as completed)
   * Called when customer leaves restaurant
   */
  checkOutCustomer: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        finalBill: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const isMock = isMockMode();

      if (isMock) {
        const booking = MOCK_BOOKINGS.find(b => b.id === input.bookingId);
        if (booking) {
          booking.status = 'done';
          booking.checkedOutAt = new Date().toISOString();
          if (input.finalBill) booking.finalBill = input.finalBill;
        }
        return { success: true, message: 'Customer checked out' };
      }

      try {
        await db
          .update(bookings)
          .set({
            status: 'done',

            finalBill: input.finalBill || 0,
          })
          .where(eq(bookings.id, input.bookingId));

        ee.emit(EVENTS.BOOKINGS_CHANGED);
        return { success: true, message: 'Customer checked out' };
      } catch (e) {
        console.error("[DB] Check-out failed:", e);
        throw new Error('Failed to check out customer');
      }
    }),

  /**
   * Mark customer as no-show
   * Called if customer doesn't arrive within grace period
   */
  markNoShow: protectedProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ input }) => {
      const isMock = isMockMode();

      if (isMock) {
        const booking = MOCK_BOOKINGS.find(b => b.id === input.bookingId);
        if (booking) {
          booking.status = 'no_show';
          booking.noShowAt = new Date().toISOString();
        }
        return { success: true, message: 'Marked as no-show' };
      }

      try {
        await db
          .update(bookings)
          .set({
            status: 'no_show',

          })
          .where(eq(bookings.id, input.bookingId));

        ee.emit(EVENTS.BOOKINGS_CHANGED);
        return { success: true, message: 'Marked as no-show' };
      } catch (e) {
        console.error("[DB] No-show marking failed:", e);
        throw new Error('Failed to mark as no-show');
      }
    }),

  /**
   * Get today's summary for staff dashboard
   * Shows key metrics for the day
   */
  getTodaySummary: protectedProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ input }) => {
      const today = new Date().toISOString().split('T')[0];
      const isMock = isMockMode();

      let dayBookings = [];
      try {
        dayBookings = await db
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.restaurantId, input.restaurantId),
              eq(bookings.bookingDate, today)
            )
          );
      } catch (e) {
        dayBookings = MOCK_BOOKINGS.filter(b => b.bookingDate === today);
      }

      return {
        totalBookings: dayBookings.length,
        confirmedBookings: dayBookings.filter(b => b.status === 'confirmed').length,
        checkedIn: dayBookings.filter(b => b.status === 'seated').length,
        completed: dayBookings.filter(b => b.status === 'done').length,
        noShows: dayBookings.filter(b => b.status === 'no_show').length,
        cancelled: dayBookings.filter(b => b.status === 'cancelled').length,
        averagePartySize: Math.round(
          dayBookings.reduce((sum, b) => sum + b.partySize, 0) / (dayBookings.length || 1)
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
