import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { restaurantRouter } from "./restaurantRouter";
import { tableRouter } from "./tableRouter";
import { bookingRouter } from "./bookingRouter";
// analyticsRouter removed — using analyticsRouterEnhanced only
import { analyticsRouterEnhanced } from "./analyticsRouter_enhanced";
import { deliveryRouter } from "./deliveryRouter";
import { reviewsRouter } from "./reviewsRouter";
import { menuRouter } from "./menuRouter";
import { webhookRouter } from "./webhookRouter";
import { z } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, restaurants } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { aiRouter } from "./aiRouter";
import { reportRouter } from "./reportRouter";
import { voiceRouter } from "./voiceRouter";
import { staffRouter } from "./staffRouter";
import { cloudDataRouter } from "./routers/cloudDataRouter";
import { dailySnapshotRouter } from "./routers/dailySnapshotRouter";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  cloudData: cloudDataRouter,
  dailySnapshot: dailySnapshotRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    /** Check if any manager user exists in DB (first-launch detection) */
    hasUsers: publicProcedure.query(async () => {
      const allUsers = await db.select().from(users).limit(1);
      return { exists: allUsers.length > 0 };
    }),

    /** First-time setup: create manager with chosen PIN */
    setPin: publicProcedure
      .input(z.object({ 
        pin: z.string().length(4), 
        name: z.string().optional(),
        email: z.string().email().optional().or(z.literal('')),
        phone: z.string().optional(),
        restaurantName: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const existingUsers = await db.select().from(users).limit(1);
        if (existingUsers.length > 0) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Setup already completed. Please log in with your PIN." 
          });
        }

        const now = new Date().toISOString();
        const openId = `manager_${Date.now()}`;
        const restaurantId = 'res_default';

        // 1. Ensure restaurant exists
        const existingRes = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
        if (existingRes.length === 0) {
          await db.insert(restaurants).values({
            id: restaurantId,
            name: input.restaurantName || 'TableBook Restaurant',
            slug: 'default',
            createdAt: now,
          });
        } else if (input.restaurantName) {
          // Update name if provided during setup
          await db.update(restaurants).set({ name: input.restaurantName }).where(eq(restaurants.id, restaurantId));
        }

        // 2. Create user
        await db.insert(users).values({
          openId,
          restaurantId,
          name: input.name || 'Manager',
          email: input.email || null,
          phone: input.phone || null,
          role: 'manager',
          pinCode: input.pin,
          lastSignedIn: now,
          createdAt: now,
        });
        // Auto-login after setup
        const token = await sdk.createSessionToken(openId);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        const newUser = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
        return { success: true, token, user: newUser[0] };
      }),

    /** Change PIN (requires old PIN for verification) */
    changePin: protectedProcedure
      .input(z.object({ oldPin: z.string().length(4), newPin: z.string().length(4) }))
      .mutation(async ({ input, ctx }) => {
        // Verify current user's PIN
        const userResult = await db.select().from(users).where(eq(users.openId, ctx.user.openId)).limit(1);
        const user = userResult[0];
        if (!user || user.pinCode !== input.oldPin) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current PIN is incorrect." });
        }
        
        await db.update(users).set({ pinCode: input.newPin }).where(eq(users.id, user.id));
        return { success: true };
      }),

    login: publicProcedure
      .input(z.object({ 
        pin: z.string().min(4).max(6),
        phoneNumber: z.string().optional(), // For unique identification
        restaurantId: z.string().optional() // Optional for now
      }))
      .mutation(async ({ input, ctx }) => {
        // 1. Identify the user
        let user: any | undefined;
        
        if (input.phoneNumber) {
          const result = await db.select().from(users).where(eq(users.phone, input.phoneNumber)).limit(1);
          user = result[0];
        } else {
          // Fallback search by PIN (Insecure for multi-tenant, but needed for legacy)
          const result = await db.select().from(users).where(eq(users.pinCode, input.pin)).limit(1);
          user = result[0];
        }

        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid Auth: User not found." });
        }

        // 2. Check Lockout
        if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
          const waitTime = Math.ceil((new Date(user.lockoutUntil).getTime() - Date.now()) / 60000);
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: `Account locked due to multiple failed attempts. Please try again in ${waitTime} minutes.` 
          });
        }

        // 3. Verify PIN
        if (user.pinCode !== input.pin) {
          const newFailedAttempts = (user.failedAttempts || 0) + 1;
          const updateData: any = { failedAttempts: newFailedAttempts };
          
          if (newFailedAttempts >= 5) {
            const lockoutDate = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
            updateData.lockoutUntil = lockoutDate.toISOString();
          }

          await db.update(users).set(updateData).where(eq(users.id, user.id));
          
          const remaining = 5 - newFailedAttempts;
          const msg = remaining > 0 
            ? `Incorrect PIN. ${remaining} attempts remaining before lockout.`
            : "Account locked for 15 minutes due to too many failed attempts.";
          
          throw new TRPCError({ code: "UNAUTHORIZED", message: msg });
        }

        // 4. Success - Reset attempts
        await db.update(users).set({ 
          failedAttempts: 0, 
          lockoutUntil: null,
          lastSignedIn: new Date().toISOString()
        }).where(eq(users.id, user.id));

        const token = await sdk.createSessionToken(user.openId);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return { success: true, token, user };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  restaurant: restaurantRouter,
  table: tableRouter,
  booking: bookingRouter,
  analytics: analyticsRouterEnhanced,
  ai: aiRouter,
  delivery: deliveryRouter,
  reviews: reviewsRouter,
  menu: menuRouter,
  webhook: webhookRouter,
  report: reportRouter,
  voice: voiceRouter,
  staff: staffRouter,
});

export type AppRouter = typeof appRouter;
