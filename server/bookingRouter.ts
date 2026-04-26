import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { bookings, customers, tables } from "./db";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { db, isMockMode } from "./db";
import { MOCK_TABLES, MOCK_BOOKINGS, MOCK_CUSTOMERS } from "./mockData";
import { observable } from "@trpc/server/observable";
import { ee, EVENTS } from "./events";

import { NotificationService } from "./_core/notification";
import { GoogleSheetsService, ManagerEmailService } from "./_core/googleSheets";

// paymentService was removed; using RazorpayService only
import { RazorpayService } from "./_core/razorpayService";

export const bookingRouter = router({
  listByDate: protectedProcedure
    .input(z.object({ date: z.string() })) // YYYY-MM-DD
    .query(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      if (isMockMode()) {
        return MOCK_BOOKINGS.filter((b: any) => b.restaurantId === restaurantId && b.bookingDate === input.date);
      }
      return await db.select({
        id: bookings.id,
        restaurantId: bookings.restaurantId,
        customerId: bookings.customerId,
        tableId: bookings.tableId,
        guestName: bookings.guestName,
        guestPhone: bookings.guestPhone,
        customerName: customers.name,
        customerPhone: customers.phone,
        bookingDate: bookings.bookingDate,
        bookingTime: bookings.bookingTime,
        partySize: bookings.partySize,
        status: bookings.status,
        source: bookings.source,
        specialRequests: bookings.specialRequests,
        createdAt: bookings.createdAt,
      })
        .from(bookings)
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .where(
          and(
            eq(bookings.restaurantId, restaurantId),
            eq(bookings.bookingDate, input.date)
          )
        );
    }),

  listByRange: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() })) // YYYY-MM-DD
    .query(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      if (isMockMode()) {
        return MOCK_BOOKINGS.filter((b: any) => 
          b.restaurantId === restaurantId && 
          b.bookingDate >= input.startDate && 
          b.bookingDate <= input.endDate
        );
      }
      return await db.select({
        id: bookings.id,
        restaurantId: bookings.restaurantId,
        customerId: bookings.customerId,
        tableId: bookings.tableId,
        guestName: bookings.guestName,
        guestPhone: bookings.guestPhone,
        customerName: customers.name,
        customerPhone: customers.phone,
        bookingDate: bookings.bookingDate,
        bookingTime: bookings.bookingTime,
        partySize: bookings.partySize,
        status: bookings.status,
        source: bookings.source,
        specialRequests: bookings.specialRequests,
        createdAt: bookings.createdAt,
      })
        .from(bookings)
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .where(
          and(
            eq(bookings.restaurantId, restaurantId),
            gte(bookings.bookingDate, input.startDate),
            lte(bookings.bookingDate, input.endDate)
          )
        );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      if (isMockMode()) {
        const booking = MOCK_BOOKINGS.find((b: any) => b.id === input.id);
        if (booking && booking.restaurantId !== restaurantId) return null;
        return booking || null;
      }
      const result = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.id, input.id),
            eq(bookings.restaurantId, restaurantId)
          )
        );
      return result[0];
    }),

  getAvailableSlots: publicProcedure
    .input(z.object({ 
      restaurantId: z.string(), 
      date: z.string(), 
      partySize: z.number() 
    }))
    .query(async ({ input }) => {
      const { restaurantId, date, partySize } = input;
      
      let restaurantTables = [];
      try {
        restaurantTables = await db
          .select()
          .from(tables)
          .where(
            and(
              eq(tables.restaurantId, restaurantId),
              sql`${tables.capacity} >= ${partySize}`
            )
          );
      } catch (e) {
        console.warn("[DB] Slot search failed, using mock data", e);
      }

      if (restaurantTables.length === 0) {
        restaurantTables = MOCK_TABLES.filter(t => t.restaurantId === restaurantId && t.capacity >= partySize);
      }
      
      if (restaurantTables.length === 0) return [];

      // Get bookings
      let dayBookings = [];
      try {
        dayBookings = await db
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.restaurantId, restaurantId),
              eq(bookings.bookingDate, date),
              sql`${bookings.status} != 'cancelled'`
            )
          );
      } catch (e) {
        dayBookings = MOCK_BOOKINGS.filter(b => b.bookingDate === date);
      }

      // Improved slot logic: 11 AM to 10 PM, every 30 mins
      const slots = [];
      for (let hour = 11; hour <= 22; hour++) {
        for (let min of ["00", "30"]) {
          const time = `${hour < 10 ? '0' + hour : hour}:${min}`;
          
          // Check if any table of sufficient capacity is free at this time
          // 1. Get all tables that can fit the party
          const suitableTables = restaurantTables.filter((t: any) => t.capacity >= partySize);
          
          // 2. Get bookings at this specific time
          const bookingsAtTime = dayBookings.filter((b: any) => b.bookingTime === time);
          
          // 3. Find if there's at least one suitable table not already booked
          const availableSuitableTable = suitableTables.find((t: any) => 
            !bookingsAtTime.some((b: any) => b.tableId === t.id)
          );

          if (availableSuitableTable) {
            slots.push(time);
          }
        }
      }

      return slots;
    }),

  // Create a new booking
  create: publicProcedure
    .input(z.object({
      restaurantId: z.string().optional(),
       customerId: z.string().optional(),
      customerName: z.string().min(1).max(100).optional(),
      customerPhone: z.string().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number format (e.g., +919999999999 or 9999999999)"),
      tableId: z.string().optional(),
      bookingDate: z.string(),
      bookingTime: z.string(),
      partySize: z.number(),
      source: z.enum(["online", "walkin", "phone"]).default("online"),
      occasion: z.enum(["birthday", "anniversary", "celebration", "regular"]).optional(),
      notes: z.string().optional(),
      coverChargeAmount: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const restaurantId = input.restaurantId || ctx.user?.restaurantId;
      if (!restaurantId) throw new TRPCError({ code: "BAD_REQUEST", message: "Restaurant ID is required" });
      
      let customerId = input.customerId;
      const isMock = isMockMode();

      // Handle customer lookup/creation if only name/phone provided
      if (!customerId && input.customerPhone) {
        if (isMock) {
          customerId = `mock_cust_${Date.now()}`;
        } else {
          const existing = await db
            .select()
            .from(customers)
            .where(
              and(
                eq(customers.restaurantId, restaurantId as string),
                eq(customers.phone, input.customerPhone)
              )
            );
          
          if (existing.length > 0) {
            customerId = existing[0].id;
          } else if (input.customerName) {
            const newCustId = `cust_${Date.now()}`;
            await db.insert(customers).values({
              id: newCustId,
              restaurantId: restaurantId as string,
              name: input.customerName!,
              phone: input.customerPhone,
              visitCount: 0,
            });
            customerId = newCustId;
          }
        }
      }

      if (!customerId) throw new Error("Customer information required");

      const id = `bk_${Date.now()}`;
      
      // Auto-assign table if not provided
      let tableId: string | undefined = input.tableId;
      if (!tableId) {
        if (isMock) {
          tableId = "1"; // Auto fallback
        } else {
          const availableTables = await db
            .select()
            .from(tables)
            .where(
              and(
                eq(tables.restaurantId, restaurantId as string),
                sql`${tables.capacity} >= ${input.partySize}`,
                eq(tables.status, "available")
              )
            );
          
          if (availableTables.length > 0) {
            tableId = availableTables[0].id;
          }
        }
      }

      if (!tableId) {
        throw new Error("Table ID could not be determined for the booking.");
      }

      const newBooking: any = {
        id,
        restaurantId: restaurantId as string,
        customerId: customerId,
        guestName: input.customerName,
        guestPhone: input.customerPhone,
        tableId: tableId,
        bookingDate: input.bookingDate,
        bookingTime: input.bookingTime,
        partySize: input.partySize,
        status: "confirmed",
        source: input.source,
        specialRequests: input.notes,
        coverCharge: input.coverChargeAmount || 0,
        paymentStatus: 'unpaid',
        paymentId: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        // Also set customerName/Phone for mock compatibility
        customerName: input.customerName,
        customerPhone: input.customerPhone,
      };

      if (isMock) {
        MOCK_BOOKINGS.push(newBooking);
      } else {
        try {
          await db.transaction(async (tx: any) => {
            // Double-booking check inside transaction
            const existingBooking = await tx
              .select()
              .from(bookings)
              .where(
                and(
                  eq(bookings.tableId, tableId as string),
                  eq(bookings.bookingDate, input.bookingDate),
                  eq(bookings.bookingTime, input.bookingTime),
                  sql`${bookings.status} != 'cancelled'`
                )
              )
              .limit(1);

            if (existingBooking.length > 0) {
              throw new TRPCError({
                code: "CONFLICT",
                message: `This table is already booked for ${input.bookingTime} on ${input.bookingDate}.`
              });
            }

            await tx.insert(bookings).values(newBooking);
          });
          console.log(`[BOOKING] Created: ${newBooking.id} for table ${tableId}`);
        } catch (e: any) {
          if (e instanceof TRPCError) throw e;
          console.error("[DB] Booking insert failed:", e.message);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `BOOKING_FAILURE: ${e.message || 'Unknown database error'}`
          });
        }
      }
      
      // Send commercial SMS confirmation asynchronously
      NotificationService.sendBookingConfirmation(
        input.customerPhone,
        input.customerName || "Guest",
        input.bookingDate,
        input.bookingTime,
        input.partySize
      ).catch(err => console.error("Notification failed:", err));

      // 🔗 Sync to Google Sheets + alert manager
      const bookingRow = {
        id: newBooking.id,
        customerName: input.customerName || "Guest",
        customerPhone: input.customerPhone,
        bookingDate: input.bookingDate,
        bookingTime: input.bookingTime,
        partySize: input.partySize,
        status: "confirmed",
        source: input.source,
        tableId: tableId,
      };
      GoogleSheetsService.appendBooking(bookingRow).catch(err => console.error("[Sheets] Booking sync failed:", err));
      ManagerEmailService.sendNewBookingAlert(bookingRow).catch(err => console.error("[ManagerEmail] Alert failed:", err));

      ee.emit(EVENTS.BOOKINGS_CHANGED);

      if (input.partySize >= 6) {
        // Commercial Integration: Use Razorpay for deposits
        const amount = RazorpayService.calculateDepositAmount(input.partySize);
        const razorpayData = await RazorpayService.createOrder({
          bookingId: newBooking.id,
          amount,
          customerName: input.customerName || "Guest",
          customerPhone: input.customerPhone,
        });

        return {
          ...newBooking,
          requiresDeposit: true,
          razorpay: razorpayData,
          depositAmount: amount
        };
      }

      return newBooking;
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["pending", "confirmed", "seated", "done", "cancelled", "no_show", "checked_in", "completed"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      if (isMockMode()) {
        const mockIdx = MOCK_BOOKINGS.findIndex((b: any) => b.id === input.id && b.restaurantId === restaurantId);
        if (mockIdx !== -1) {
          const booking = MOCK_BOOKINGS[mockIdx];
          booking.status = input.status as any;

          // Send Feedback Request on Check-out (SQLite schema: status 'done')
          if (input.status === "done" || input.status === "completed") {
            NotificationService.sendFeedbackRequest(
              (booking as any).customerPhone || "+91 9999999999",
              (booking as any).customerName || "Guest"
            ).catch(err => console.error("Feedback notification failed:", err));
          }

          // Commercial Integration: Send Cancellation WhatsApp
          if (input.status === "cancelled") {
            NotificationService.sendBookingCancellation(
              (booking as any).customerPhone || "+91 9999999999",
              (booking as any).customerName || "Guest"
            ).catch(err => console.error("Cancellation notification failed:", err));
          }
        }
        ee.emit(EVENTS.BOOKINGS_CHANGED);
        return { success: true };
      }
      
      const dbStatus = input.status === "checked_in" ? "seated" : (input.status === "completed" ? "done" : input.status);

      const result = await db.update(bookings)
        .set({ status: dbStatus as any })
        .where(
          and(
            eq(bookings.id, input.id),
            eq(bookings.restaurantId, restaurantId)
          )
        );

      const affected = (result as any).rowsAffected ?? (result as any).changes;
      if (affected === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found or access denied." });
      }
      ee.emit(EVENTS.BOOKINGS_CHANGED);
      return { success: true };
    }),

  onUpdate: publicProcedure.subscription(() => {
    return observable<number>((emit) => {
      const onUpdate = () => emit.next(Date.now());
      ee.on(EVENTS.BOOKINGS_CHANGED, onUpdate);
      return () => ee.off(EVENTS.BOOKINGS_CHANGED, onUpdate);
    });
  }),

  listCustomers: protectedProcedure
    .query(async ({ ctx }) => {
      const restaurantId = (ctx.user?.restaurantId as string) || "res_default";
      if (isMockMode()) {
        return MOCK_CUSTOMERS.filter((c: any) => c.restaurantId === restaurantId);
      }
      return await db.select().from(customers).where(eq(customers.restaurantId, restaurantId));
    }),

  createCustomer: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        notes: z.string().optional(),
        tags: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const restaurantId = (ctx.user?.restaurantId as string) || "res_default";
      const id = "c_" + Math.random().toString(36).substring(2, 9);
      const now = new Date().toISOString();

      if (isMockMode()) {
        const newCustomer = {
          id,
          restaurantId,
          ...input,
          visitCount: 1,
          createdAt: now,
        };
        MOCK_CUSTOMERS.push(newCustomer);
        return newCustomer;
      }

      const [customer] = await db
        .insert(customers)
        .values({
          id,
          restaurantId,
          name: input.name,
          phone: input.phone,
          email: input.email,
          notes: input.notes,
          tags: input.tags || "",
          visitCount: 1,
          createdAt: now,
        })
        .returning();

      return customer;
    }),

  deleteCustomer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const restaurantId = (ctx.user?.restaurantId as string) || "res_default";

      if (isMockMode()) {
        const index = MOCK_CUSTOMERS.findIndex((c: any) => c.id === input.id && c.restaurantId === restaurantId);
        if (index !== -1) {
          MOCK_CUSTOMERS.splice(index, 1);
        }
        return { success: true };
      }

      await db
        .delete(customers)
        .where(and(eq(customers.id, input.id), eq(customers.restaurantId, restaurantId)));

      return { success: true };
    }),
});
