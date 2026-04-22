import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
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
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { aiRouter } from "./aiRouter";
import { reportRouter } from "./reportRouter";
import { voiceRouter } from "./voiceRouter";
import { staffRouter } from "./staffRouter";
import { cloudDataRouter } from "./routers/cloudDataRouter";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  cloudData: cloudDataRouter,
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
        phone: z.string().optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const now = new Date().toISOString();
        const openId = `manager_${Date.now()}`;
        await db.insert(users).values({
          openId,
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
    changePin: publicProcedure
      .input(z.object({ oldPin: z.string().length(4), newPin: z.string().length(4) }))
      .mutation(async ({ input }) => {
        const matchingUsers = await db.select().from(users).where(eq(users.pinCode, input.oldPin)).limit(1);
        if (matchingUsers.length === 0) {
          throw new Error("Current PIN is incorrect.");
        }
        const user = matchingUsers[0];
        await db.update(users).set({ pinCode: input.newPin }).where(eq(users.id, user.id));
        return { success: true };
      }),

    login: publicProcedure
      .input(z.object({ pin: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!input.pin) {
          throw new Error("PIN is required");
        }

        // Validate pin against users table
        const matchingUsers = await db.select().from(users).where(eq(users.pinCode, input.pin)).limit(1);

        if (matchingUsers.length === 0) {
          throw new Error("Invalid Auth: Incorrect PIN entered.");
        }

        const user = matchingUsers[0];
        
        // Ensure user openId exists (for session token)
        if (!user.openId) {
            throw new Error("User configuration error");
        }
        
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
