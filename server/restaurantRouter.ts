import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { restaurants } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const restaurantRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }: { input: { id: string } }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(restaurants).where(eq(restaurants.id, input.id)).limit(1);
      return result[0] || null;
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }: { input: { slug: string } }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(restaurants).where(eq(restaurants.slug, input.slug)).limit(1);
      return result[0] || null;
    }),

  info: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(restaurants).where(eq(restaurants.id, ctx.user.restaurantId)).limit(1);
      return result[0] || null;
    }),

  updateInfo: protectedProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      pincode: z.string().optional(),
      cuisineType: z.string().optional(),
      gstNumber: z.string().optional(),
      openingHours: z.string().optional(),
      instagramUrl: z.string().optional(),
      googleMapsUrl: z.string().optional(),
      pinCode: z.string().optional(),
      twilioSid: z.union([z.literal(''), z.string().regex(/^AC[a-f0-9]{32}$/, "Invalid Twilio Account SID")]).optional(),
      twilioToken: z.union([z.literal(''), z.string().length(32, "Twilio Auth Token must be 32 characters")]).optional(),
      twilioPhone: z.union([z.literal(''), z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid Twilio Phone Number")]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const restaurantId = ctx.user.restaurantId;

      await db.update(restaurants).set(input).where(eq(restaurants.id, restaurantId));
      return { success: true };
    }),
});
