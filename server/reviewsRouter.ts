/**
 * Google Reviews Router
 * Fetches the restaurant's Google reviews using Google Places API.
 * Simulation mode: returns realistic sample reviews.
 * Env vars: GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { reviews } from "./db";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

const PLACE_ID = process.env.GOOGLE_PLACE_ID || "ChIJGreen_Apple_Gandhinagar";
const API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";

// Realistic sample reviews for Green Apple Restaurant
const MOCK_REVIEWS = [
  {
    authorName: "Hetal Patel",
    rating: 5,
    text: "Amazing all-you-can-eat experience! Paneer dishes were absolutely divine. Staff was very attentive and the ambiance is great for family dinners.",
    relativeTimeDescription: "2 weeks ago",
    profilePhotoUrl: null,
    time: Date.now() - 14 * 24 * 3600_000,
  },
  {
    authorName: "Rohan Shah",
    rating: 4,
    text: "Great value for money. ₹350/person for unlimited thali is unbeatable in Sector 16. Food was fresh and the service was quick.",
    relativeTimeDescription: "1 month ago",
    profilePhotoUrl: null,
    time: Date.now() - 30 * 24 * 3600_000,
  },
  {
    authorName: "Kavita Desai",
    rating: 5,
    text: "Best vegetarian restaurant in Gandhinagar! Love the happy hour menu. We come here every weekend as a family.",
    relativeTimeDescription: "3 weeks ago",
    profilePhotoUrl: null,
    time: Date.now() - 21 * 24 * 3600_000,
  },
  {
    authorName: "Amit Trivedi",
    rating: 4,
    text: "Good food, nice atmosphere. Gets busy during dinner rush. Recommend booking in advance for weekends.",
    relativeTimeDescription: "2 months ago",
    profilePhotoUrl: null,
    time: Date.now() - 60 * 24 * 3600_000,
  },
  {
    authorName: "Priyanka Nair",
    rating: 5,
    text: "Came for a birthday dinner — the staff was so welcoming! Great range of Gujarati and North Indian options. Will definitely be back.",
    relativeTimeDescription: "1 week ago",
    profilePhotoUrl: null,
    time: Date.now() - 7 * 24 * 3600_000,
  },
];

async function fetchGoogleReviews() {
  if (!API_KEY) return { reviews: MOCK_REVIEWS, rating: 4.6, totalRatings: 429, isSimulated: true };

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews,rating,user_ratings_total&key=${API_KEY}`
    );
    const data = await res.json() as any;
    return {
      reviews: (data.result?.reviews || []).map((r: any) => ({
        authorName: r.author_name,
        rating: r.rating,
        text: r.text,
        relativeTimeDescription: r.relative_time_description,
        profilePhotoUrl: r.profile_photo_url,
        time: r.time * 1000,
      })),
      rating: data.result?.rating || 4.6,
      totalRatings: data.result?.user_ratings_total || 429,
      isSimulated: false,
    };
  } catch (e) {
    return { reviews: MOCK_REVIEWS, rating: 4.6, totalRatings: 429, isSimulated: true };
  }
}

export const reviewsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    let dbFormattedReviews: any[] = [];
    const restaurantId = ctx.user.restaurantId as string;
    
    try {
      const dbReviews = await db
        .select()
        .from(reviews)
        .where(eq(reviews.restaurantId, restaurantId))
        .orderBy(desc(reviews.createdAt))
        .limit(10);
        
      if (dbReviews.length > 0) {
        dbFormattedReviews = dbReviews.map((r: any) => ({
          authorName: r.authorName,
          rating: r.rating,
          text: r.text,
          relativeTimeDescription: r.relativeTime,
          profilePhotoUrl: null,
          time: r.createdAt ? new Date(r.createdAt as unknown as string).getTime() : Date.now(),
          isReplied: r.isReplied,
          replyText: r.replyText,
        }));
      }
    } catch (e) {
      console.error("[ReviewsRouter] DB fetch failed", e);
    }
    
    const googleData = await fetchGoogleReviews();
    
    return {
      reviews: [...dbFormattedReviews, ...googleData.reviews],
      rating: googleData.rating,
      totalRatings: googleData.totalRatings + dbFormattedReviews.length,
      isSimulated: googleData.isSimulated,
    };
  }),

  submitReply: adminProcedure
    .input(z.object({
      reviewId: z.string(),
      replyText: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;

      const result = await db.update(reviews)
        .set({ isReplied: true, replyText: input.replyText })
        .where(
          and(
            eq(reviews.id, input.reviewId),
            eq(reviews.restaurantId, restaurantId)
          )
        );

      const affectedRows = (result as any).rowsAffected ?? (result as any).changes ?? 0;
      if (affectedRows === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Review not found or access denied." });
      }
      return { success: true };
    }),
});
