/**
 * Razorpay Payment Service
 * Replaces Stripe for Indian market — supports UPI, Google Pay, PhonePe, cards, wallets
 * Env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
 */

import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

const IS_LIVE = !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  keyId: string;
}

async function createOrder(params: {
  bookingId: string;
  amount: number; // in INR (will be converted to paise)
  customerName: string;
  customerPhone: string;
}): Promise<{ orderId: string; keyId: string; amount: number; currency: string; simulated: boolean }> {
  const amountInPaise = params.amount * 100; // Razorpay uses paise

  if (!IS_LIVE) {
    // Simulation mode — return a fake Razorpay order
    console.log(
      "\n===========================================" +
      "\n[RazorpayService] 💳 PAYMENT SIMULATION" +
      `\nBooking: ${params.bookingId}` +
      `\nAmount: ₹${params.amount}` +
      `\nCustomer: ${params.customerName} (${params.customerPhone})` +
      "\nMode: Test (Add RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET for live)" +
      "\n==========================================="
    );
    return {
      orderId: `order_sim_${Date.now()}`,
      keyId: "rzp_test_demo",
      amount: amountInPaise,
      currency: "INR",
      simulated: true,
    };
  }

  // Live Razorpay REST call
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: "INR",
      receipt: params.bookingId,
      notes: {
        customer_name: params.customerName,
        customer_phone: params.customerPhone,
      },
    }),
  });

  const order = await response.json() as RazorpayOrder;
  return {
    orderId: order.id,
    keyId: RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: order.currency,
    simulated: false,
  };
}

function verifySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!IS_LIVE) return true; // trust simulation

  const body = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === params.signature;
}

// Deposit amount: ₹200 × party size (Green Apple base price)
function calculateDepositAmount(partySize: number): number {
  return Math.min(partySize * 200, 1000); // cap at ₹1000
}

export const RazorpayService = { createOrder, verifySignature, calculateDepositAmount };
