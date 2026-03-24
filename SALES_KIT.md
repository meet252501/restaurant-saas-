# 🚀 TableBook: Freelancer Sales & Pricing Kit
TableBook is designed to be **Sold as a Service (Local)** or **Sold as a Template (Global)**. Use this kit to maximize your profits.

---

## 🌎 Strategy 1: The Global Marketplace (Template)
*Best for: CodeCanyon, Gumroad, or your own website.*

### **Pricing Tiers**
| Tier | Price | What's Included? |
| :--- | :--- | :--- |
| **Starter (Code Only)** | **$29 - $39** | Full Source Code + .env.example + Setup Docs. User handles hosting. |
| **Pro (Code + Support)** | **$79 - $99** | Source Code + 6 Months of Bug Support + 1-hour Setup Call. |
| **Extended (Commercial)** | **$199+** | License to use TableBook to build and sell to 10+ clients. |

**Top 3 Global Selling Points:**
1. **Glassmorphic UI:** Wows clients instantly.
2. **0-Cost Internal Stack:** Uses Gemini Free and manual WhatsApp fallbacks.
3. **Cross-Platform:** Built with React Native / Expo.

---

## 🇮🇳 Strategy 2: The Local Client (Service)
*Best for: Local Restaurants in your city.*

### **Pricing for India (Recommended)**
- **Setup Fee:** ₹5,000 — ₹15,000 (One-time setup).
- **Maintenance:** ₹500/month (To keep the server running if they don't want to handle it).

**The "Pitch" to a Restaurant Owner:**
> *"Sir, Zomato/Swiggy take 20% commission on every order. TableBook gives you your own Digital Menu and WhatsApp invoicing for 0% commission. It pays for itself in just 1 week."*

---

## 💎 High-Value Features to Highlight:
1. **WhatsApp Billing:** No need for expensive thermal printers. Send bills directly to customer phones.
2. **QR Menu Generator:** Stop printing physical menus. Let customers scan and order.
3. **Daily Owner Report:** Every night at 11 PM, the owner gets a WhatsApp "Profit Report" automatically.
4. **Staff Security:** Secure "Manager Only" sections with a PIN.

---

## 🛠️ Your Delivery Process:
1. **Customize:** Change the Logo and Restaurant Name in `lib/restaurant.ts`.
2. **Build:** Run `npx eas build --platform android` to get the `.apk`.
3. **Deploy:** Use Aiven.io (DB) and Railway (Server).
4. **Handover:** Show the staff how to use the 'Manual Send' button for bills if they don't want to pay for MSG91.
