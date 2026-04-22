# 📊 Google Sheets & Manager Email Auto-Setup Guide
**Time required: ~5 minutes**

---

## 🎯 What This Does

Once set up, TableBook will **automatically**:

| Event | Action |
|---|---|
| 📅 New Booking | → Appends row to `📅 Bookings` sheet tab |
| 📅 New Booking | → Sends instant email alert to manager |
| 🚴 Zomato/Swiggy Order | → Appends row to `🚴 Delivery` sheet tab |
| 🚴 New Delivery Order | → Sends instant email alert to manager |
| 🌙 Every Night 11:30 PM | → Appends daily summary to `📊 Daily Reports` tab |
| 🌙 Every Night 11:30 PM | → Sends rich HTML email report to manager |

> **No configuration = Simulation mode** — All actions just print to your server logs instead of failing. Safe to run without any setup.

---

## 🔑 Step 1: Create Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) → **New Spreadsheet**
2. Name it: `TableBook — Green Apple Restaurant`
3. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/👉THIS_PART👈/edit
   ```

---

## ☁️ Step 2: Create Google Cloud Service Account (5 minutes)

1. Go to → [console.cloud.google.com](https://console.cloud.google.com)
2. **Create a project** → name it `tablebook-prod`
3. **Enable APIs**:
   - Search `Google Sheets API` → Enable
   - Search `Google Drive API` → Enable
4. **IAM & Admin** → **Service Accounts** → **Create Service Account**
   - Name: `tablebook-sheets`
   - Role: `Editor`
5. Click the service account → **Keys** tab → **Add Key** → **JSON**
6. Download the JSON file — it looks like:
   ```json
   {
     "client_email": "tablebook-sheets@tablebook-prod.iam.gserviceaccount.com",
     "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIB..."
   }
   ```

---

## 🔗 Step 3: Share Sheet with Service Account

1. Open your Google Sheet
2. Click **Share** (top right)
3. Enter the `client_email` from the JSON file
4. Give **Editor** access → **Send**

---

## ⚙️ Step 4: Update Your `.env`

Add these lines to your `.env` file:

```bash
# Google Sheets
GOOGLE_SERVICE_ACCOUNT_EMAIL="tablebook-sheets@tablebook-prod.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID="YOUR_SHEET_ID_FROM_URL"

# Manager Email Alerts (uses Gmail)
MANAGER_EMAIL="manager@greenapple.in"
EMAIL_FROM="your.gmail@gmail.com"
EMAIL_PASSWORD="your_app_password_here"  # NOT your Gmail pass — use App Password
```

> [!IMPORTANT]
> **Gmail App Password** (not your real password):
> Gmail → Settings → Security → 2-Step Verification → App Passwords → Create one

---

## ✅ Step 5: Verify It's Working

Restart your server and create a test booking. You should see in your server logs:

```
[GoogleSheets] ✅ Booking bk_1234567890 synced to Sheets
[ManagerEmail] ✅ Booking alert sent to manager@greenapple.in
```

And in your Google Sheet:
```
📅 Bookings | bk_1234... | Raj Patel | +91 98765... | 2026-04-16 | 19:00 | 4 | confirmed | phone | t3
```

---

## 🗂️ Sheet Structure (Auto-created)

| Tab Name | Columns |
|---|---|
| 📅 **Bookings** | ID, Customer, Phone, Date, Time, Party Size, Status, Source, Table, Synced At |
| 🚴 **Delivery** | Order ID, Platform, Customer, Items, Total ₹, Status, Placed At, Synced At |
| 📊 **Daily Reports** | Date, Bookings, Delivery Orders, Revenue, Occupancy %, Synced At |

---

## 📧 Manager Email Examples

### Booking Alert Email:
- **Subject:** `📅 New Booking — Raj Patel (2026-04-16 19:00)`
- **Body:** Dark-themed card with customer details + Sheet link button

### Nightly Report Email:
- **Subject:** `📊 Daily Business Report — 2026-04-16`
- **Body:** KPI cards — Bookings count, Delivery count, Revenue + Sheet link

---

## 💡 No Google Cloud Account? (Alternative)

If you don't want to set up Google Cloud, you can still use the **Gmail auto-email** feature alone by setting only:

```bash
MANAGER_EMAIL="manager@greenapple.in"
EMAIL_FROM="your.gmail@gmail.com"
EMAIL_PASSWORD="your_app_password"
```

The system will email the manager on every booking without needing Sheets.
