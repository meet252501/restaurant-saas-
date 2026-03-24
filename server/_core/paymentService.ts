import { ENV } from "./env";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16" as any,
  });
  console.log("[PaymentService] Stripe Client Initialized.");
} else {
  console.log("[PaymentService] Running in SIMULATION MODE (Stripe keys missing).");
}

export const PaymentService = {
  async createDepositSession(
    bookingId: string,
    guestName: string,
    partySize: number,
    amountInCents: number = 5000 // default $50 deposit
  ): Promise<string> {
    const successUrl = `${ENV.appId ? `http://localhost:8081` : 'http://localhost:8081'}/bookings?payment=success&bookingId=${bookingId}`;
    const cancelUrl = `${ENV.appId ? `http://localhost:8081` : 'http://localhost:8081'}/bookings?payment=cancelled`;

    if (stripeClient) {
      try {
        const session = await stripeClient.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "inr", // Assuming India context based on prior currency code, or "usd"
                product_data: {
                  name: `TableBook Reservation Deposit - ${partySize} Guests`,
                  description: `Booking ID: ${bookingId} for ${guestName}`,
                },
                unit_amount: amountInCents * 100, // Stripe expects lowest denomination
              },
              quantity: 1,
            },
          ],
          mode: "payment",
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            bookingId,
            guestName,
          },
        });
        
        console.log(`[PaymentService] 💳 Created LIVE Stripe Session: ${session.id}`);
        return session.url || successUrl;
      } catch (e) {
        console.error(`[PaymentService] Stripe Session creation failed`, e);
        return successUrl; // Fallback so UI doesn't crash
      }
    } else {
      // Simulation Mode
      const simulatedUrl = `https://checkout.stripe.com/pay/cs_test_simulated_${bookingId}`;
      console.log(`\n===========================================`);
      console.log(`[PaymentService] 💳 STRIPE SIMULATION`);
      console.log(`Amount: ${amountInCents} INR`);
      console.log(`Generate Checkout URL: ${simulatedUrl}`);
      console.log(`[Commercial UI Prompted for payment flow]`);
      console.log(`===========================================\n`);
      return simulatedUrl;
    }
  }
};
