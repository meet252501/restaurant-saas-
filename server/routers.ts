import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { restaurantRouter } from "./restaurantRouter";
import { tableRouter } from "./tableRouter";
import { bookingRouter } from "./bookingRouter";
import { analyticsRouter } from "./analyticsRouter";
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

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    login: publicProcedure
      .input(z.object({ pin: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        let user;
        // Auto-login as manager if no DB, or first user if DB exists
        if (!process.env.DATABASE_URL) {
          user = {
            openId: "mock-manager",
            name: "Admin",
            role: "manager"
          };
        } else {
          const allUsers = await db.select().from(users).limit(1);
          if (allUsers.length > 0) {
            user = allUsers[0];
          } else {
            user = {
              openId: "default-admin",
              name: "Admin",
              role: "manager"
            };
          }
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
