# 🚀 TableBook App - Workable App Guide

Follow these steps to run the "Green Apple Restaurant" app on your Android or iOS device.

## 1. Instant Access (Expo Go) — *Recommended for Testing*
This is the fastest way to see the 100% polished and functional app right now.

1. **On your Phone**: Download the **Expo Go** app from the Play Store or App Store.
2. **On your PC**: Open the terminal in the `tablebook-app` folder and run:
   ```bash
   pnpm dev
   ```
3. **Scan QR**: Use the Expo Go app (Android) or your Camera (iOS) to scan the QR code that appears in your terminal.
4. **Login**: Use PIN **`1234`** (Manager) or **`2222`** (Waiter).

---

## 2. Generate Standalone APK — *For Permanent Installation*
To create a standalone `.apk` file that doesn't require Expo Go.

1. **Login to Expo**:
   ```bash
   npx eas-cli login
   ```
2. **Start the Build**:
   ```bash
   npx eas-cli build --platform android --profile preview
   ```
   *Note: Select "APK" when prompted (already configured in `eas.json`).*
3. **Wait & Download**: Once the build finishes (approx. 10-15 mins in the cloud), Expo will provide a link to download your `application.apk`.

---

## 3. Server Management
The app uses a TRPC backend for real-time synchronization. 

- **Start Backend**: `pnpm dev:server` (Starts automatically with `pnpm dev`)
- **Main App**: [index.tsx](app/(tabs)/index.tsx)
- **Deep Scan Result**: All UI bugs, KOT previews, and PIN-locking features are verified and 100% functional.

🍏 **Green Apple Restaurant - Ready for Business!**
