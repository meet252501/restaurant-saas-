/**
 * Google Sheets Integration Service
 * ===================================
 * Uses Google's Sheets REST API directly with a Service Account JWT.
 * NO extra npm packages required — only built-in `crypto` and `fetch`.
 *
 * SETUP (one-time, ~5 minutes):
 * 1. Go to https://console.cloud.google.com
 * 2. Create a project → Enable "Google Sheets API" & "Google Drive API"
 * 3. IAM & Admin → Service Accounts → Create → Download JSON key
 * 4. Copy values into your .env (see below)
 * 5. Share your Google Sheet with the service account email (Editor access)
 *
 * ENV variables required:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL   = "tablebook@your-project.iam.gserviceaccount.com"
 *   GOOGLE_PRIVATE_KEY             = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *   GOOGLE_SHEET_ID                = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" (from sheet URL)
 *   MANAGER_EMAIL                  = "manager@greenapple.in"
 */

import crypto from "crypto";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodemailer = require("nodemailer");

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const SHEET_ID = process.env.GOOGLE_SHEET_ID || "";
const MANAGER_EMAIL = process.env.MANAGER_EMAIL || process.env.OWNER_EMAIL || "";

const IS_CONFIGURED = !!(SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY && SHEET_ID);

// ─── JWT Auth Helpers ────────────────────────────────────────────────────────

function base64url(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str) : str;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function getAccessToken(): Promise<string | null> {
  if (!IS_CONFIGURED) return null;
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64url(JSON.stringify({
      iss: SERVICE_ACCOUNT_EMAIL,
      scope: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ].join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }));

    const signingInput = `${header}.${payload}`;
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signingInput);
    const signature = base64url(Buffer.from(sign.sign(PRIVATE_KEY)));
    const jwt = `${signingInput}.${signature}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const data = await res.json() as any;
    return data.access_token || null;
  } catch (e) {
    console.error("[GoogleSheets] JWT auth failed:", e);
    return null;
  }
}

// ─── Sheet Operations ────────────────────────────────────────────────────────

async function sheetsRequest(method: string, path: string, body?: any) {
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[GoogleSheets] API error:", res.status, err);
    return null;
  }
  return res.json();
}

/** Ensure a sheet (tab) with `title` exists. Returns the sheetId. */
async function ensureSheet(title: string): Promise<number | null> {
  const token = await getAccessToken();
  if (!token) return null;

  // 1. Get existing sheets
  const meta = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json()).catch(() => null) as any;

  const existing = meta?.sheets?.find((s: any) => s.properties?.title === title);
  if (existing) return existing.properties.sheetId;

  // 2. Create it
  const result = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title } } }],
    }),
  }).then(r => r.json()).catch(() => null) as any;

  return result?.replies?.[0]?.addSheet?.properties?.sheetId ?? null;
}

/** Append rows to a named sheet. Headers are written on first row if empty. */
async function appendRows(sheetTitle: string, headers: string[], rows: string[][]): Promise<boolean> {
  if (!IS_CONFIGURED) return false;
  await ensureSheet(sheetTitle);

  // Append header + rows
  const values = [headers, ...rows];
  const result = await sheetsRequest("POST", `/values/${encodeURIComponent(sheetTitle)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    values,
  });
  return !!result;
}

// ─── Domain-specific syncs ───────────────────────────────────────────────────

export type BookingRow = {
  id: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
  status: string;
  source: string;
  tableId?: string;
};

export type DeliveryRow = {
  orderId: string;
  platform: string;
  customerName: string;
  items: string;
  total: number;
  status: string;
  placedAt: string;
};

export const GoogleSheetsService = {
  isConfigured: IS_CONFIGURED,

  /** Append a booking row to the "Bookings" sheet tab */
  async appendBooking(booking: BookingRow): Promise<boolean> {
    if (!IS_CONFIGURED) {
      console.log("[GoogleSheets] Not configured — skipping booking sync (SIMULATION)");
      console.log("[GoogleSheets] Booking:", booking.id, booking.customerName, booking.bookingDate);
      return false;
    }
    const headers = ["Booking ID", "Customer Name", "Phone", "Date", "Time", "Party Size", "Status", "Source", "Table ID", "Synced At"];
    const row = [
      booking.id, booking.customerName, booking.customerPhone,
      booking.bookingDate, booking.bookingTime, String(booking.partySize),
      booking.status, booking.source, booking.tableId || "",
      new Date().toISOString(),
    ];
    const ok = await appendRows("📅 Bookings", headers, [row]);
    if (ok) console.log(`[GoogleSheets] ✅ Booking ${booking.id} synced to Sheets`);
    return ok;
  },

  /** Append a delivery order row to the "Delivery" sheet tab */
  async appendDeliveryOrder(order: DeliveryRow): Promise<boolean> {
    if (!IS_CONFIGURED) {
      console.log("[GoogleSheets] Not configured — skipping delivery sync (SIMULATION)");
      return false;
    }
    const headers = ["Order ID", "Platform", "Customer", "Items", "Total (₹)", "Status", "Placed At", "Synced At"];
    const row = [
      order.orderId, order.platform, order.customerName,
      order.items, String(order.total), order.status,
      order.placedAt, new Date().toISOString(),
    ];
    const ok = await appendRows("🚴 Delivery", headers, [row]);
    if (ok) console.log(`[GoogleSheets] ✅ Delivery ${order.orderId} synced`);
    return ok;
  },

  /** Write daily summary row to the "Daily Reports" sheet tab */
  async appendDailySummary(stats: {
    date: string;
    bookingCount: number;
    deliveryCount: number;
    deliveryRevenue: number;
    occupancy?: number;
  }): Promise<boolean> {
    if (!IS_CONFIGURED) {
      console.log("[GoogleSheets] Not configured — skipping daily summary sync (SIMULATION)");
      return false;
    }
    const headers = ["Date", "Bookings", "Delivery Orders", "Delivery Revenue (₹)", "Occupancy %", "Synced At"];
    const row = [
      stats.date,
      String(stats.bookingCount),
      String(stats.deliveryCount),
      String(stats.deliveryRevenue),
      String(stats.occupancy ?? "-"),
      new Date().toISOString(),
    ];
    return appendRows("📊 Daily Reports", headers, [row]);
  },
};

// ─── Email to Manager ─────────────────────────────────────────────────────────

let _mailer: any = null;

function getMailer(): any {
  if (_mailer) return _mailer;
  const user = process.env.EMAIL_FROM || "";
  const pass = process.env.EMAIL_PASSWORD || "";
  if (!user || !pass) return null;
  _mailer = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return _mailer;
}

export const ManagerEmailService = {
  /** Send an email to the manager with booking details */
  async sendNewBookingAlert(booking: BookingRow): Promise<void> {
    const mailer = getMailer();
    if (!mailer || !MANAGER_EMAIL) {
      console.log(`[ManagerEmail] SIMULATION — New booking alert for ${MANAGER_EMAIL || "manager"}`);
      console.log(`  → ${booking.customerName} | ${booking.bookingDate} ${booking.bookingTime} | Party of ${booking.partySize}`);
      return;
    }
    const sheetLink = SHEET_ID ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}` : "#";
    await mailer.sendMail({
      from: `"TableBook 🍏" <${process.env.EMAIL_FROM}>`,
      to: MANAGER_EMAIL,
      subject: `📅 New Booking — ${booking.customerName} (${booking.bookingDate} ${booking.bookingTime})`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0f1e;color:#f0f0f0;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#10b981,#059669);padding:24px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:22px">🍏 New Table Booking</h1>
            <p style="margin:6px 0 0;color:#d1fae5;font-size:14px">Green Apple Restaurant</p>
          </div>
          <div style="padding:24px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px">Customer</td><td style="padding:8px 0;font-weight:600">${booking.customerName}</td></tr>
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px">Phone</td><td style="padding:8px 0">${booking.customerPhone}</td></tr>
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px">Date & Time</td><td style="padding:8px 0;font-weight:600;color:#10b981">${booking.bookingDate} at ${booking.bookingTime}</td></tr>
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px">Party Size</td><td style="padding:8px 0">${booking.partySize} guests</td></tr>
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px">Source</td><td style="padding:8px 0;text-transform:capitalize">${booking.source}</td></tr>
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px">Booking ID</td><td style="padding:8px 0;font-size:11px;color:#6b7280">${booking.id}</td></tr>
            </table>
            <div style="margin-top:20px;text-align:center">
              <a href="${sheetLink}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">📊 View All Bookings in Sheet</a>
            </div>
          </div>
          <div style="padding:12px 24px;background:#111827;text-align:center">
            <p style="margin:0;font-size:11px;color:#4b5563">Sent by TableBook SaaS • Auto-generated alert</p>
          </div>
        </div>`,
    });
    console.log(`[ManagerEmail] ✅ Booking alert sent to ${MANAGER_EMAIL}`);
  },

  /** Send a daily summary email to manager */
  async sendDailySummaryEmail(stats: {
    date: string;
    bookingCount: number;
    deliveryCount: number;
    deliveryRevenue: number;
    topItem?: string;
  }): Promise<void> {
    const mailer = getMailer();
    const sheetLink = SHEET_ID ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}` : "#";
    const msg = `
📊 Daily Summary — ${stats.date}
📅 Bookings: ${stats.bookingCount}
🚴 Delivery Orders: ${stats.deliveryCount}
💰 Delivery Revenue: ₹${stats.deliveryRevenue}
${stats.topItem ? `🌟 Top Item: ${stats.topItem}` : ""}`;

    if (!mailer || !MANAGER_EMAIL) {
      console.log(`[ManagerEmail] SIMULATION — Daily summary:\n${msg}`);
      return;
    }

    await mailer.sendMail({
      from: `"TableBook 🍏" <${process.env.EMAIL_FROM}>`,
      to: MANAGER_EMAIL,
      subject: `📊 Daily Business Report — ${stats.date}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0f1e;color:#f0f0f0;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:24px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:22px">📊 Daily Business Report</h1>
            <p style="margin:6px 0 0;color:#ddd6fe;font-size:14px">${stats.date}</p>
          </div>
          <div style="padding:24px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
              <div style="background:#111827;border-radius:8px;padding:16px;text-align:center">
                <div style="font-size:28px;font-weight:700;color:#10b981">${stats.bookingCount}</div>
                <div style="font-size:12px;color:#9ca3af;margin-top:4px">📅 Table Bookings</div>
              </div>
              <div style="background:#111827;border-radius:8px;padding:16px;text-align:center">
                <div style="font-size:28px;font-weight:700;color:#f59e0b">${stats.deliveryCount}</div>
                <div style="font-size:12px;color:#9ca3af;margin-top:4px">🚴 Delivery Orders</div>
              </div>
              <div style="background:#111827;border-radius:8px;padding:16px;text-align:center;grid-column:span 2">
                <div style="font-size:28px;font-weight:700;color:#ec4899">₹${stats.deliveryRevenue.toLocaleString('en-IN')}</div>
                <div style="font-size:12px;color:#9ca3af;margin-top:4px">💰 Total Delivery Revenue</div>
              </div>
            </div>
            ${stats.topItem ? `<p style="background:#111827;border-radius:8px;padding:12px;font-size:13px">🌟 <strong>Top Item:</strong> ${stats.topItem}</p>` : ""}
            <div style="text-align:center;margin-top:16px">
              <a href="${sheetLink}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">📊 Open Full Report in Sheets</a>
            </div>
          </div>
          <div style="padding:12px 24px;background:#111827;text-align:center">
            <p style="margin:0;font-size:11px;color:#4b5563">Auto-generated by TableBook SaaS • Every night at 11:30 PM</p>
          </div>
        </div>`,
    });
    console.log(`[ManagerEmail] ✅ Daily summary sent to ${MANAGER_EMAIL}`);
  },

  /** Send new delivery order alert */
  async sendDeliveryAlert(order: DeliveryRow): Promise<void> {
    const mailer = getMailer();
    if (!mailer || !MANAGER_EMAIL) {
      console.log(`[ManagerEmail] SIMULATION — Delivery alert: ${order.orderId} (₹${order.total})`);
      return;
    }
    await mailer.sendMail({
      from: `"TableBook 🍏" <${process.env.EMAIL_FROM}>`,
      to: MANAGER_EMAIL,
      subject: `🚴 New ${order.platform.charAt(0).toUpperCase() + order.platform.slice(1)} Order — ₹${order.total} from ${order.customerName}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0f1e;color:#f0f0f0;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#f59e0b,#dc2626);padding:24px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:22px">🚴 New ${order.platform.charAt(0).toUpperCase() + order.platform.slice(1)} Order</h1>
            <p style="margin:6px 0 0;color:#fef3c7;font-size:14px">Order #${order.orderId}</p>
          </div>
          <div style="padding:24px">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px">Customer</td><td style="padding:8px 0;font-weight:600">${order.customerName}</td></tr>
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px">Items</td><td style="padding:8px 0">${order.items}</td></tr>
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px">Total</td><td style="padding:8px 0;font-weight:700;color:#f59e0b;font-size:18px">₹${order.total}</td></tr>
              <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px">Platform</td><td style="padding:8px 0;text-transform:capitalize">${order.platform}</td></tr>
            </table>
          </div>
          <div style="padding:12px 24px;background:#111827;text-align:center">
            <p style="margin:0;font-size:11px;color:#4b5563">Sent by TableBook SaaS • Auto-generated alert</p>
          </div>
        </div>`,
    });
    console.log(`[ManagerEmail] ✅ Delivery alert sent for order ${order.orderId}`);
  },
};
