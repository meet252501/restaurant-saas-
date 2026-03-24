/**
 * Webhook Router — handles inbound payment callbacks
 * Razorpay payment.captured → update booking paymentStatus to 'paid'
 */

import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { RazorpayService } from "./_core/razorpayService";
import { MOCK_BOOKINGS } from "./mockData";

export const webhookRouter = router({
  // Called after Razorpay payment is successful (triggered from frontend after payment)
  razorpaySuccess: publicProcedure
    .input(z.object({
      bookingId: z.string(),
      razorpayOrderId: z.string(),
      razorpayPaymentId: z.string(),
      razorpaySignature: z.string(),
    }))
    .mutation(({ input }) => {
      const isValid = RazorpayService.verifySignature({
        orderId: input.razorpayOrderId,
        paymentId: input.razorpayPaymentId,
        signature: input.razorpaySignature,
      });

      if (!isValid) {
        throw new Error("Payment signature verification failed.");
      }

      // Update booking payment status
      const booking = MOCK_BOOKINGS.find(b => b.id === input.bookingId);
      if (booking) {
        (booking as any).paymentStatus = "paid";
        (booking as any).paymentId = input.razorpayPaymentId;
        console.log(`[Webhook] ✅ Payment confirmed for booking ${input.bookingId} | Payment: ${input.razorpayPaymentId}`);
      }

      return { success: true, bookingId: input.bookingId, paymentId: input.razorpayPaymentId };
    }),
});
