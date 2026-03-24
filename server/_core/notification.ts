/**
 * Notification Service — Priority chain:
 *   1. MSG91 WhatsApp (if MSG91_AUTH_KEY set)
 *   2. Twilio WhatsApp (if TWILIO_* set)
 *   3. Gmail Email (if EMAIL_FROM + EMAIL_PASSWORD set) ← FREE ✅
 *   4. Simulation mode (logs to terminal — zero cost, zero config)
 */

import twilio from "twilio";
import nodemailer from "nodemailer";

// ── Twilio ──────────────────────────────────────────────────────────────────
let twilioClient: twilio.Twilio | null = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  console.log("[NotificationService] ✅ Twilio WhatsApp ready.");
}

// ── MSG91 ───────────────────────────────────────────────────────────────────
const MSG91_AUTH_KEY  = process.env.MSG91_AUTH_KEY || "";
const IS_MSG91_LIVE   = !!MSG91_AUTH_KEY;

// ── Gmail Email (Free fallback) ─────────────────────────────────────────────
const EMAIL_FROM      = process.env.EMAIL_FROM || "";
const EMAIL_PASS      = process.env.EMAIL_PASSWORD || "";
const OWNER_EMAIL     = process.env.OWNER_EMAIL || "";
const IS_EMAIL_LIVE   = !!(EMAIL_FROM && EMAIL_PASS);

let emailTransporter: nodemailer.Transporter | null = null;
if (IS_EMAIL_LIVE) {
  emailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL_FROM, pass: EMAIL_PASS },
  });
  console.log(`[NotificationService] ✅ Gmail Email ready (${EMAIL_FROM}).`);
} else {
  console.log("[NotificationService] ℹ️ Email not configured — running in SIMULATION MODE.");
}

// ── Helpers ─────────────────────────────────────────────────────────────────
async function sendMSG91WhatsApp(phone: string, message: string): Promise<void> {
  if (!IS_MSG91_LIVE) return;
  try {
    await fetch("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", {
      method: "POST",
      headers: { authkey: MSG91_AUTH_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        integrated_number: process.env.MSG91_WHATSAPP_NUMBER || "",
        content_type: "template",
        payload: [{
          messaging_product: "whatsapp", type: "template",
          to: phone.replace(/\D/g, ""),
          template: { name: "booking_notification", language: { code: "en" },
            components: [{ type: "body", parameters: [{ type: "text", text: message }] }] },
        }],
      }),
    });
    console.log(`[NotificationService] 🟢 WhatsApp (MSG91) sent to ${phone}`);
  } catch (e) {
    console.error(`[NotificationService] MSG91 failed:`, e);
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!emailTransporter || !to) return;
  try {
    await emailTransporter.sendMail({ from: `"TableBook" <${EMAIL_FROM}>`, to, subject, html });
    console.log(`[NotificationService] 📧 Email sent to ${to}`);
  } catch (e) {
    console.error(`[NotificationService] Email failed:`, e);
  }
}

function simulateMessage(type: string, phone: string, message: string) {
  const icon = type === "whatsapp" ? "🟢 WhatsApp" : type === "email" ? "📧 Email" : "📲 SMS";
  console.log(`\n==========================================`);
  console.log(`[NotificationService] ${icon} SIMULATION`);
  console.log(`To:      ${phone}`);
  console.log(`Message: ${message}`);
  console.log(`Status:  Delivered (Simulated)`);
  console.log(`==========================================\n`);
}

/** Core dispatcher: tries MSG91 → Twilio → Email → Simulate */
async function notify(phone: string, message: string, emailSubject?: string, emailHtml?: string) {
  if (IS_MSG91_LIVE) {
    await sendMSG91WhatsApp(phone, message);
  } else if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
    try {
      await twilioClient.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${phone}`,
      });
      console.log(`[NotificationService] 🟢 Twilio WhatsApp sent to ${phone}`);
    } catch (e) {
      console.error(`[NotificationService] Twilio failed:`, e);
      // Fallback to email
      if (IS_EMAIL_LIVE && OWNER_EMAIL) {
        await sendEmail(OWNER_EMAIL, emailSubject || "TableBook Notification", emailHtml || `<p>${message}</p>`);
      }
    }
  } else if (IS_EMAIL_LIVE && OWNER_EMAIL) {
    // Email fallback — send to restaurant owner
    await sendEmail(OWNER_EMAIL, emailSubject || "TableBook Notification", emailHtml || `<p style="font-family:sans-serif">${message}</p>`);
  } else {
    simulateMessage("whatsapp", phone, message);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────
export const NotificationService = {
  /** ✅ Booking confirmation — sent immediately after booking created */
  async sendBookingConfirmation(phone: string, guestName: string, date: string, time: string, partySize: number) {
    const message = `✅ Hi ${guestName}! Your table for ${partySize} is confirmed for ${date} at ${time}. We look forward to seeing you! 🍏`;
    const html = `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f0fdf4;border-radius:12px">
        <h2 style="color:#10b981">🍏 Booking Confirmed!</h2>
        <p>Hi <strong>${guestName}</strong>,</p>
        <p>Your table for <strong>${partySize} guests</strong> is confirmed for <strong>${date} at ${time}</strong>.</p>
        <p style="color:#065f46">We look forward to seeing you!</p>
        <hr style="border:none;border-top:1px solid #6ee7b7;margin:16px 0">
        <p style="font-size:12px;color:#6b7280">TableBook Restaurant Management System</p>
      </div>`;
    await notify(phone, message, `✅ Booking Confirmed — ${guestName} (${date} ${time})`, html);
  },

  /** ⏰ Reminder — sent 2h before reservation */
  async sendBookingReminder(phone: string, guestName: string, date: string, time: string, partySize: number) {
    const message = `⏰ Reminder: ${guestName}, your table for ${partySize} is in just 2 hours (${time} today)! Reply CANCEL if plans change.`;
    const html = `<div style="font-family:sans-serif;padding:20px"><h2>⏰ Booking Reminder</h2><p>Hi <strong>${guestName}</strong>, your table for <strong>${partySize}</strong> is at <strong>${time}</strong> today!</p></div>`;
    await notify(phone, message, `⏰ Reminder — ${guestName} at ${time}`, html);
  },

  /** 🙏 Feedback request — sent after guest checks out */
  async sendFeedbackRequest(phone: string, guestName: string) {
    const message = `🍏 Thank you for dining with us, ${guestName}! We'd love your feedback — please leave us a Google review. See you again soon!`;
    const html = `<div style="font-family:sans-serif;padding:20px"><h2>Thank you ${guestName}! 🙏</h2><p>We hope you enjoyed your meal. Please leave us a Google review — it helps us serve you better!</p></div>`;
    await notify(phone, message, `🙏 Thank You ${guestName}! — Please Leave a Review`, html);
  },

  /** ❌ Cancellation notice */
  async sendBookingCancellation(phone: string, guestName: string) {
    const message = `Hi ${guestName}, your reservation has been cancelled. We hope to see you another time! 🍏`;
    const html = `<div style="font-family:sans-serif;padding:20px"><h2>Booking Cancelled</h2><p>Hi <strong>${guestName}</strong>, your reservation has been cancelled. We hope to see you soon!</p></div>`;
    await notify(phone, message, `❌ Booking Cancelled — ${guestName}`, html);
  },

  /** 📊 Daily report to owner */
  async sendDailyReport(phone: string, stats: { deliveryCount: number; deliveryRevenue: number; bookingCount: number; date: string }) {
    const message = `📊 Daily Summary (${stats.date}):\n📦 Orders: ${stats.deliveryCount}\n💰 Revenue: ₹${stats.deliveryRevenue}\n📅 Bookings: ${stats.bookingCount}\n\nKeep growing! 🍏`;
    const html = `
      <div style="font-family:sans-serif;max-width:500px;padding:24px;background:#111827;color:#f9fafb;border-radius:12px">
        <h2 style="color:#10b981">📊 Daily Business Summary</h2>
        <p style="color:#9ca3af">${stats.date}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #374151">📦 Delivery Orders</td><td style="padding:8px;border-bottom:1px solid #374151;font-weight:bold">${stats.deliveryCount}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #374151">💰 Revenue</td><td style="padding:8px;border-bottom:1px solid #374151;font-weight:bold;color:#10b981">₹${stats.deliveryRevenue}</td></tr>
          <tr><td style="padding:8px">📅 Bookings</td><td style="padding:8px;font-weight:bold">${stats.bookingCount}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px">TableBook Restaurant Management</p>
      </div>`;
    await notify(phone, message, `📊 Daily Report — ${stats.date}`, html);
  },

  async sendWhatsAppInvoice(phone: string, data: { name: string; id: string; items: string; total: number }) {
    const message = `🍏 TableBook Invoice\n\nItems: ${data.items}\nTotal: ₹${data.total}\nOrder: ${data.id}\nCustomer: ${data.name}\n\nThank you!`;
    await notify(phone, message, `🧾 Invoice — ${data.name}`, `<p>${message.replace(/\n/g, '<br>')}</p>`);
    return { success: true };
  },
};

/** Owner alert (to restaurant admin email) */
export async function notifyOwner(data: { title: string; content: string }): Promise<boolean> {
  console.log(`\n🔔 [OWNER ALERT] ${data.title}`);
  console.log(`Message: ${data.content}\n`);
  if (IS_EMAIL_LIVE && OWNER_EMAIL) {
    await sendEmail(OWNER_EMAIL, `🔔 ${data.title}`, `<div style="font-family:sans-serif;padding:20px"><h2>${data.title}</h2><p>${data.content}</p></div>`);
  }
  return true;
}
