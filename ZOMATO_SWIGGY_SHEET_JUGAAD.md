# 🍏 Zomato & Swiggy Integration: The "Sheet Jugaad" Setup Guide

This guide explains how to integrate Zomato and Swiggy orders into TableBook using a **Google Sheet** as a middleman (the "Jugaad" method). This is useful because Zomato/Swiggy don't provide public API access to most individual restaurants.

---

## 🏗️ 1. How it Works
1. **Trigger:** Zomato/Swiggy sends an **Order Confirmation Email** to your restaurant's Gmail.
2. **Bridge:** A **Google Apps Script** (attached to a Sheet) monitors your Gmail for these emails.
3. **Action:** The script extracts order details (Items, Total, ID) and sends them to your TableBook Server's `delivery.ingest` endpoint.

---

## 📑 2. Setup the "Jugaad" Sheet
1. Create a new **Google Sheet**.
2. Go to **Extensions > Apps Script**.
3. Paste the following script (replace `YOUR_SERVER_URL` and `API_KEY`):

```javascript
// TABLEBOOK INTEGRATION SCRIPT
const SERVER_URL = "https://your-tablebook-server.railway.app"; 
const API_KEY = "your-zomato-api-key-from-env"; // Matches ZOMATO_API_KEY in .env

function monitorInbox() {
  const threads = GmailApp.search("from:noreply@zomato.com is:unread");
  
  for (const thread of threads) {
    const messages = thread.getMessages();
    const body = messages[0].getPlainBody();
    
    // 🔍 Extracting data using Regex (Jugaad!)
    const orderId = body.match(/Order ID: ([\w-]+)/)?.[1] || "ZMT-" + Date.now();
    const customer = body.match(/Customer: ([\w\s]+)/)?.[1] || "Guest";
    const total = parseFloat(body.match(/Total: ₹([\d.]+)/)?.[1] || "0");
    
    // 📦 Push to TableBook
    const payload = {
      platform: "zomato",
      orderId: orderId,
      customerName: customer,
      items: [{ name: "Zomato Order", qty: 1, price: total }],
      total: total
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload)
    };
    
    UrlFetchApp.fetch(`${SERVER_URL}/api/trpc/delivery.ingest`, options);
    
    // Mark as read so we don't process it twice
    thread.markRead();
  }
}
```

4. Click **Triggers** (Clock icon) → **Add Trigger**.
5. Choose `monitorInbox` → **Minutes timer** → **Every 1 minute**.

---

## 🛠️ 3. Environment Extraction (.env)

Based on the deep scan of your system variables and the codebase, here is your extracted production `.env` configuration template.

> [!IMPORTANT]
> Fill in the missing keys from your dashboard.

```bash
# === DATABASE ===
DATABASE_URL="mysql://meet252501:your_password_here@aiven-db-host:3306/defaultdb"

# === AI & CLOUD ===
GEMINI_API_KEY="AIzaSy..." # Get from aistudio.google.com
BUILT_IN_FORGE_API_URL="https://forge.example.com"
BUILT_IN_FORGE_API_KEY="your_forge_key"

# === NOTIFICATIONS (MSG91) ===
MSG91_AUTH_KEY="your_msg91_auth_key"
MSG91_WHATSAPP_NUMBER="91..."
OWNER_PHONE="91..."

# === PAYMENTS ===
RAZORPAY_KEY_ID="rzp_live_..."
RAZORPAY_KEY_SECRET="..."

# === INTEGRATIONS ===
ZOMATO_API_KEY="secret_jugaad_key_123" # Must match Google Apps Script
GOOGLE_PLACES_API_KEY="AIzaSy..."

# === APP IDS ===
VITE_APP_ID="56b65f60-c589-40c2-9214-5a6954c44fd4"
EXPO_PUBLIC_SERVER_PORT="3000"
```

---

## 🚀 4. Final Verification
1. Ensure your server is deployed to **Railway** or **Render**.
2. Update the `HttpUrl` in `lib/trpc.ts` or set `EXPO_PUBLIC_SERVER_URL` to your live domain.
3. Test by sending a mock "Zomato" email to yourself and running the Google Script.
