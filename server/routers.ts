import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { db, schema } from "./db";
const { users, restaurants } = schema;
import { restaurantRouter } from "./restaurantRouter";
import { tableRouter } from "./tableRouter";
import { bookingRouter } from "./bookingRouter";
// analyticsRouter removed — using analyticsRouterEnhanced only
import { analyticsRouterEnhanced } from "./analyticsRouter_enhanced";
import { deliveryRouter } from "./deliveryRouter";
import { reviewsRouter } from "./reviewsRouter";
import { menuRouter } from "./menuRouter";
import { webhookRouter } from "./webhookRouter";
import { sdk } from "./_core/sdk";
import { aiRouter } from "./aiRouter";
import { reportRouter } from "./reportRouter";
import { voiceRouter } from "./voiceRouter";
import { staffRouter } from "./staffRouter";
import { cloudDataRouter } from "./routers/cloudDataRouter";
import { dailySnapshotRouter } from "./routers/dailySnapshotRouter";

import { authRouter } from "./routers/authRouter";

export const appRouter = router({
  system: systemRouter,
  cloudData: cloudDataRouter,
  dailySnapshot: dailySnapshotRouter,
  auth: authRouter,

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
