# 🍏 TableBook Deployment Guide: The "0-Cost" Path
This guide focuses on hosting TableBook with **Zero ongoing monthly costs** for you, by leveraging free tiers and buyer-owned accounts.

---

## 🏗️ 1. Backend & API (Node.js/tRPC)
To host the server for free, use one of these providers:

### **Option A: Railway (Highly Recommended)**
- **Cost:** Free (Trial credits) or $5/m (Developer plan - usually covered by client).
- **Setup:** 
  1. Link your GitHub repo.
  2. Add the variables from `.env.example`.
  3. Railway auto-deploys on every `git push`.

### **Option B: Render.com**
- **Cost:** $0 (Free plan - Note: Server 'sleeps' after 15 mins of inactivity).
- **Setup:** Create a "Web Service", connect GitHub, and set the build command to `npm install && npm run build`.

---

## 🗄️ 2. Database (MySQL)
### **Aiven.io (MySQL Free Tier)**
- **Cost:** $0 
- **Setup:** Create a free MySQL instance. Copy the connection string into your `DATABASE_URL`.
- **Note:** Perfect for small/medium restaurants. No credit card required.

---

## 🤖 3. AI Assistant (Gemini)
### **Google AI Studio (Gemini 1.5 Flash)**
- **Cost:** $0 (Free Tier)
- **Rate Limit:** 15 requests per minute (More than enough for a restaurant staff).
- **Setup:** Generate an API Key at [aistudio.google.com](https://aistudio.google.com).

---

## 📲 4. Communications (WhatsApp/SMS)
### **Manual Mode (Starter Tier - $0 cost)**
- By default, if `MSG91_AUTH_KEY` is missing, TableBook generates the **Bill Text** on-screen for the staff to manually send.
- **Zero cost for you or the client.**

### **Auto Mode (Pro Tier - Buyer Pays)**
- If the client wants auto-send:
  1. Have THEM create an account on [MSG91.com](https://msg91.com).
  2. They add 1,000 credits (approx. ₹200).
  3. You plug in THEIR `authkey` in the `.env`.

---

## 📱 5. Mobile App (Expo/Android/iOS)
### **Expo Application Services (EAS)**
- **Cost:** $0 (Free for personal/small builds).
- **Setup:** 
  1. Run `npx eas login`.
  2. Run `npx eas build --platform android` to get a `.apk` for the client.
  3. Side-load the APK onto the restaurant's tablets.

---

## 💡 Pro Tip for Freelancers:
**"Don't host it on your account."** Always ask the client to create the Aiven/Railway accounts and invite you as a member. This ensures they own the data and YOU have zero recurring bills.
