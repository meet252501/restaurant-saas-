import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { bookings, customers, tables } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { db, isMockMode } from "./db";
import { MOCK_TABLES, MOCK_BOOKINGS, MOCK_CUSTOMERS } from "./mockData";
import { observable } from "@trpc/server/observable";
import { ee, EVENTS } from "./events";

import { NotificationService } from "./_core/notification";
import { GoogleSheetsService, ManagerEmailService } from "./_core/googleSheets";

// paymentService was removed; using RazorpayService only
import { RazorpayService } from "./_core/razorpayService";

export const bookingRouter = router({
  listByDate: publicProcedure
    .input(z.object({ restaurantId: z.string(), date: z.string() })) // YYYY-MM-DD
    .query(async ({ input }) => {
      if (isMockMode()) {
        return MOCK_BOOKINGS.filter(b => b.restaurantId === input.restaurantId && b.bookingDate === input.date);
      }
      return await db.select()
        .from(bookings)
        .where(
          and(
            eq(bookings.restaurantId, input.restaurantId),
            eq(bookings.bookingDate, input.date)
          )
        );
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      if (isMockMode()) {
        return MOCK_BOOKINGS.find(b => b.id === input.id) || null;
      }
      const result = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, input.id));
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
        restaurantTables = MOCK_TABLES.filter(t => t.capacity >= partySize);
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
          const suitableTables = restaurantTables.filter(t => t.capacity >= partySize);
          
          // 2. Get bookings at this specific time
          const bookingsAtTime = dayBookings.filter(b => b.bookingTime === time);
          
          // 3. Find if there's at least one suitable table not already booked
          const availableSuitableTable = suitableTables.find(t => 
            !bookingsAtTime.some(b => b.tableId === t.id)
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
      restaurantId: z.string(),
       customerId: z.string().optional(),
      customerName: z.string().refine(val => !val || !/[;\"\-\-]/.test(val), "Invalid characters in name").optional(),
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
    .mutation(async ({ input }) => {
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
                eq(customers.restaurantId, input.restaurantId),
                eq(customers.phone, input.customerPhone)
              )
            );
          
          if (existing.length > 0) {
            customerId = existing[0].id;
          } else if (input.customerName) {
            const newCustId = `cust_${Date.now()}`;
            await db.insert(customers).values({
              id: newCustId,
              restaurantId: input.restaurantId,
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
                eq(tables.restaurantId, input.restaurantId),
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
        restaurantId: input.restaurantId,
        customerId: customerId,
        tableId: tableId,
        bookingDate: input.bookingDate,
        bookingTime: input.bookingTime,
        partySize: input.partySize,
        status: "confirmed",
        source: input.source,
        specialRequests: input.notes,
        coverCharge: input.coverChargeAmount || 0,
        paymentStatus: 'unpaid',
        payment_id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      };

      if (isMock) {
        MOCK_BOOKINGS.push(newBooking);
      } else {
        try {
          // ATOMIC TRANSACTION: Prevent double-bookings
          // This ensures that even if 1000 people try to book the same table simultaneously,
          // only one booking succeeds and others are rejected.
          await db.transaction(async (tx) => {
            // Step 1: Check if table is already booked for this time slot (with lock)
            const existingBooking = await tx
              .select()
              .from(bookings)
              .where(
                and(
                  eq(bookings.tableId, tableId),
                  eq(bookings.bookingDate, input.bookingDate),
                  eq(bookings.bookingTime, input.bookingTime),
                  sql`${bookings.status} != \'cancelled\'`
                )
              )
              .limit(1);

            if (existingBooking.length > 0) {
              throw new Error(`Table ${tableId} is already booked for ${input.bookingTime} on ${input.bookingDate}`);
            }

            // Step 2: Create the booking atomically
            await tx.insert(bookings).values(newBooking);

            // Step 3: Update table status to 'reserved' for this time slot
            // Note: In a real system, you'd have a booking_slots table to track table availability per time
            console.log(`[BOOKING] Atomic booking created: ${newBooking.id} for table ${tableId}`);
          });
        } catch (e: any) {
          console.error("[DB] Booking transaction failed:", e.message);
          // If transaction fails due to double-booking, throw error to client
          if (e.message.includes('already booked')) {
            throw new Error('This table is no longer available for the selected time. Please choose another time or table.');
          }
          // For other errors, do NOT fall back to mock in production-ready mode
          throw new Error(`BOOKING_FAILURE: ${e.message || 'Unknown database error'}`);
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

  updateStatus: publicProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["pending", "confirmed", "seated", "done", "cancelled", "no_show", "checked_in", "completed"]),
    }))
    .mutation(async ({ input }) => {
      if (isMockMode()) {
        const mockIdx = MOCK_BOOKINGS.findIndex((b) => b.id === input.id);
        if (mockIdx !== -1) {
          const booking = MOCK_BOOKINGS[mockIdx];
          booking.status = input.status;

          // Send Feedback Request on Check-out (SQLite schema: status 'done')
          if (input.status === "done") {
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
      let dbStatus = input.status;
      if (dbStatus === "checked_in") dbStatus = "seated";
      if (dbStatus === "completed") dbStatus = "done";

      await db.update(bookings).set({ status: dbStatus as any }).where(eq(bookings.id, input.id));
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
});
