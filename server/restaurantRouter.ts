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

  info: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(restaurants).limit(1);
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
      twilioSid: z.string().regex(/^AC[a-f0-9]{32}$/, "Invalid Twilio Account SID").optional(),
      twilioToken: z.string().length(32, "Twilio Auth Token must be 32 characters").optional(),
      twilioPhone: z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid Twilio Phone Number (E.164 required)").optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const res = await db.select().from(restaurants).limit(1);
      const restaurant = res[0];
      if (!restaurant) throw new Error("Restaurant not found");

      await db.update(restaurants).set(input).where(eq(restaurants.id, restaurant.id));
      return { success: true };
    }),
});
