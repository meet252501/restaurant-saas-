/**
 * AI Router — Restaurant Intelligence Assistant
 *
 * Uses Ollama (local LLM) with live restaurant data injected as context.
 * Falls back to mock data when DB is unavailable.
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { MOCK_BOOKINGS, MOCK_TABLES } from "./mockData";
import { getDb, isMockMode } from "./db";
import { bookings, tables, deliveryOrders } from "./db";
import { eq, sql } from "drizzle-orm";
import ollama from "ollama";

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getRestaurantContext() {
  const todayDate = new Date().toISOString().split("T")[0];

  // Try real DB first
  if (!isMockMode()) {
    try {
      const db = getDb();
      if (db) {
        const [bookingStats] = await db.select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
          confirmed: sql<number>`sum(case when status = 'confirmed' then 1 else 0 end)`,
          cancelled: sql<number>`sum(case when status in ('cancelled','no_show') then 1 else 0 end)`,
        }).from(bookings).where(eq(bookings.bookingDate, todayDate));

        const [tableStats] = await db.select({
          total: sql<number>`count(*)`,
          occupied: sql<number>`sum(case when status = 'occupied' then 1 else 0 end)`,
          available: sql<number>`sum(case when status = 'available' then 1 else 0 end)`,
        }).from(tables);

        const [deliveryStats] = await db.select({
          revenue: sql<number>`coalesce(sum(total_amount), 0)`,
        }).from(deliveryOrders).where(sql`date(created_at) = ${todayDate}`);

        const totalTables = Number(tableStats?.total ?? 0);
        const occupiedTables = Number(tableStats?.occupied ?? 0);

        return {
          date: todayDate,
          totalBookings: Number(bookingStats?.total ?? 0),
          pendingBookings: Number(bookingStats?.pending ?? 0),
          confirmedBookings: Number(bookingStats?.confirmed ?? 0),
          cancelledBookings: Number(bookingStats?.cancelled ?? 0),
          availableTables: Number(tableStats?.available ?? 0),
          occupiedTables,
          totalTables,
          occupancy: totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0,
          projectedRevenue: Number(deliveryStats?.revenue ?? 0),
          dataSource: "live_db",
        };
      }
    } catch (e) {
      console.warn("[AIRouter] DB query failed, falling back to mock data:", e);
    }
  }

  // Fallback: mock data
  const todayBookings = MOCK_BOOKINGS.filter(b => b.bookingDate === todayDate);
  const availableTables = MOCK_TABLES.filter(t => t.status === "available");
  const occupiedTables  = MOCK_TABLES.filter(t => t.status === "occupied");

  return {
    date: todayDate,
    totalBookings: todayBookings.length,
    pendingBookings: todayBookings.filter(b => b.status === "pending").length,
    confirmedBookings: todayBookings.filter(b => b.status === "confirmed").length,
    cancelledBookings: todayBookings.filter(b => b.status === "cancelled" || b.status === "no_show").length,
    availableTables: availableTables.length,
    occupiedTables: occupiedTables.length,
    totalTables: MOCK_TABLES.length,
    occupancy: Math.round((occupiedTables.length / Math.max(MOCK_TABLES.length, 1)) * 100),
    projectedRevenue: todayBookings.reduce((sum, b) => sum + (b.partySize * 850), 0),
    dataSource: "mock",
  };
}

// ── Router ────────────────────────────────────────────────────────────────────
export const aiRouter = router({
  chat: protectedProcedure
    .input(z.object({ restaurantId: z.string(), message: z.string(), model: z.string().optional() }))
    .mutation(async ({ input }) => {
      const ctx = await getRestaurantContext();

      const systemPrompt = `You are a smart restaurant assistant AI for a restaurant management app called TableBook.
You must answer ONLY questions related to this restaurant's operations.
Keep responses concise, professional, and under 3 sentences.
Do NOT use markdown headers, just plain text and bolding.
Use emojis sparingly. Always be helpful and action-oriented.

LIVE RESTAURANT DATA (${ctx.date}) [source: ${ctx.dataSource}]:
- Total bookings today: ${ctx.totalBookings} (${ctx.pendingBookings} pending, ${ctx.confirmedBookings} confirmed)
- Cancellations/no-shows: ${ctx.cancelledBookings}
- Tables: ${ctx.totalTables} total, ${ctx.occupiedTables} occupied, ${ctx.availableTables} available
- Occupancy rate: ${ctx.occupancy}%
- Projected daily revenue: ₹${ctx.projectedRevenue.toLocaleString("en-IN")}`;

      try {
        const selectedModel = input.model || 'qwen2.5:0.5b';
        console.log(`[AIRouter] Calling local Ollama model ${selectedModel} (data: ${ctx.dataSource})...`);
        const response = await ollama.chat({
          model: selectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input.message }
          ],
        });

        console.log(`[AIRouter] ✅ Ollama local response generated.`);
        return { response: response.message.content, source: "ollama_local" };
      } catch (e: any) {
        console.error("[AIRouter] Ollama error:", e.message);
        
        let fallbackMsg = "⚠️ Local AI Offline. Please ensure Ollama is running (`ollama run qwen2.5:0.5b`).";
        if (e.message.includes("model 'qwen2.5:0.5b' not found")) {
            fallbackMsg = "⚠️ Local AI Model missing. Open terminal and run: `ollama run qwen2.5:0.5b` to download.";
        } else if (e.code === 'ECONNREFUSED') {
            fallbackMsg = "⚠️ Cannot connect to Local AI. Is Ollama running on your machine?";
        }

        return { 
            response: fallbackMsg + `\n\nFallback basic data: Occupancy is ${ctx.occupancy}%, revenue is ₹${ctx.projectedRevenue.toLocaleString("en-IN")}.`, 
            source: "local_error" 
        };
      }
    }),

  /** Test endpoint to verify AI is working */
  ping: protectedProcedure.query(async () => {
    try {
        await ollama.list();
        return { status: "local_ai_live", message: "Ollama Local AI is active and connected!" };
    } catch {
        return { status: "local_error", message: "Ollama not reachable." };
    }
  }),

  /** List available models in local Ollama */
  listModels: protectedProcedure.query(async () => {
    try {
      const response = await ollama.list();
      return { success: true, models: response.models };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }),

  /** Pull a model from Ollama registry */
  pullModel: protectedProcedure
    .input(z.object({ model: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // ollama.pull can take a while and stream progress, but for simplicity here we await it
        await ollama.pull({ model: input.model });
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }),
});
