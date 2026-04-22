import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { bookings, customers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
// VoiceAIService removed. Using inline stub.
const VoiceAIService = {
  initiateBookingConfirmation: async (opts: any) => {
    console.log('[VoiceAI] Stub call (VoiceAIService deleted):', opts);
    return { success: true, mode: 'stub', callId: `stub_${Date.now()}` };
  }
};

export const voiceRouter = router({
  startBookingCall: publicProcedure
    .input(z.object({ bookingId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      // ── Mock Mode ──────────────────────────────────────────────────────────
      if (!db) {
        console.log(`[VoiceAI] 🟡 Mock mode: simulating call for booking "${input.bookingId}"`);
        const result = await VoiceAIService.initiateBookingConfirmation({
          to: "+919999999999",
          customerName: "Mock Customer",
          bookingTime: "20:00",
          partySize: 2,
          config: {}, // No real keys → falls back to simulation log
        });
        return result;
      }

      // ── Real DB Mode ────────────────────────────────────────────────────────
      const bookingData = await db
        .select({
          id: bookings.id,
          bookingTime: bookings.bookingTime,
          partySize: bookings.partySize,
          customerPhone: customers.phone,
          customerName: customers.name,
        })
        .from(bookings)
        .innerJoin(customers, eq(bookings.customerId, customers.id))
        .where(eq(bookings.id, input.bookingId))
        .limit(1);

      const b = bookingData[0];
      if (!b || !b.customerPhone) {
        throw new Error("Booking or customer phone not found");
      }

      const twilioConfig = {
        sid: process.env.TWILIO_ACCOUNT_SID,
        token: process.env.TWILIO_AUTH_TOKEN,
        callerId: process.env.TWILIO_PHONE_NUMBER,
      };

      const result = await VoiceAIService.initiateBookingConfirmation({
        to: b.customerPhone,
        customerName: b.customerName,
        bookingTime: b.bookingTime,
        partySize: b.partySize,
        config: twilioConfig,
      });

      return result;
    }),
});
