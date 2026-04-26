import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { db, bookings, deliveryOrders, customers } from "../db";
import { eq, and, sql } from "drizzle-orm";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function currentHour() {
  return new Date().getHours();
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const dailySnapshotRouter = router({

  /** Get today's full live snapshot — resets naturally each new day */
  getSnapshot: protectedProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const today = todayStr();
      const restaurantId = ctx.user.restaurantId as string;

      try {
        // ── Bookings today ───────────────────────────────────────────────
        const allBookings: any[] = await db!
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.restaurantId, restaurantId),
              eq(bookings.bookingDate, today)
            )
          );

        const totalBookings    = allBookings.length;
        const seatedBookings   = allBookings.filter((b: any) => b.status === "seated").length;
        const doneBookings     = allBookings.filter((b: any) => b.status === "done").length;
        const pendingBookings  = allBookings.filter((b: any) => b.status === "pending" || b.status === "confirmed").length;
        const cancelledBookings = allBookings.filter((b: any) => b.status === "cancelled" || b.status === "no_show").length;
        const walkinBookings   = allBookings.filter((b: any) => b.status === "walkin").length;
        const totalCovers      = allBookings.reduce((s: number, b: any) => s + (b.partySize || 0), 0);
        const diningRevenue    = allBookings.reduce((s: number, b: any) => s + (b.finalBill || 0), 0);

        // Hourly distribution (0-23)
        const bookingsByHour: Record<number, number> = {};
        for (const b of allBookings) {
          const hr = parseInt((b.bookingTime || "0:0").split(":")[0], 10);
          bookingsByHour[hr] = (bookingsByHour[hr] || 0) + 1;
        }
        const peakHour = Object.entries(bookingsByHour).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

        // ── Delivery orders today ────────────────────────────────────────
        const allOrdersResult: any[] = await db!
          .select()
          .from(deliveryOrders)
          .where(eq(deliveryOrders.restaurantId, restaurantId));

        const allOrders = allOrdersResult.filter((o: any) => 
          o.createdAt && o.createdAt.startsWith(today)
        );

        const totalOrders      = allOrders.length;
        const deliveryRevenue  = allOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0);
        const zomatoOrders     = allOrders.filter((o: any) => o.platform === "zomato").length;
        const swiggyOrders     = allOrders.filter((o: any) => o.platform === "swiggy").length;
        const directOrders     = allOrders.filter((o: any) => o.platform === "direct").length;
        const pendingOrders    = allOrders.filter((o: any) => o.status === "pending" || o.status === "preparing").length;

        // ── Totals ───────────────────────────────────────────────────────
        const totalRevenue = diningRevenue + deliveryRevenue;
        const avgOrderValue = totalOrders > 0 ? Math.round(deliveryRevenue / totalOrders) : 0;

        // ── Hourly revenue trend (last 8 working hours up to now) ────────
        const now = currentHour();
        const hourlyRevenue: { hour: string; revenue: number; bookings: number }[] = [];
        for (let h = Math.max(9, now - 7); h <= now; h++) {
          const label = `${h.toString().padStart(2, "0")}:00`;
          const hBookings = allBookings.filter((b: any) => parseInt((b.bookingTime || "0").split(":")[0], 10) === h);
          const hOrders   = allOrders.filter((o: any) => new Date(o.createdAt || "").getHours() === h);
          hourlyRevenue.push({
            hour: label,
            revenue: hBookings.reduce((s: number, b: any) => s + (b.finalBill || 0), 0)
                   + hOrders.reduce((s: number, o: any) => s + (o.totalAmount || 0), 0),
            bookings: hBookings.length,
          });
        }

        // ── Status breakdown for donut chart ────────────────────────────
        const statusBreakdown = [
          { label: "Seated",    value: seatedBookings,    color: "#34d399" },
          { label: "Done",      value: doneBookings,      color: "#818cf8" },
          { label: "Pending",   value: pendingBookings,   color: "#f59e0b" },
          { label: "Cancelled", value: cancelledBookings, color: "#f87171" },
        ].filter(s => s.value > 0);

        return {
          date: today,
          generatedAt: new Date().toISOString(),
          // KPIs
          totalRevenue,
          diningRevenue,
          deliveryRevenue,
          totalBookings,
          totalCovers,
          totalOrders,
          avgOrderValue,
          pendingBookings,
          pendingOrders,
          walkinBookings,
          // Platform split
          platformSplit: { zomato: zomatoOrders, swiggy: swiggyOrders, direct: directOrders },
          // Peak hour
          peakHour: peakHour ? `${peakHour}:00` : null,
          bookingsByHour,
          // Charts
          hourlyRevenue,
          statusBreakdown,
        };
      } catch (err: any) {
        console.warn("[DailySnapshot] DB error, returning zeros:", err.message);
        // Graceful fallback so UI never crashes
        return {
          date: today,
          generatedAt: new Date().toISOString(),
          totalRevenue: 0, diningRevenue: 0, deliveryRevenue: 0,
          totalBookings: 0, totalCovers: 0, totalOrders: 0,
          avgOrderValue: 0, pendingBookings: 0, pendingOrders: 0,
          walkinBookings: 0,
          platformSplit: { zomato: 0, swiggy: 0, direct: 0 },
          peakHour: null, bookingsByHour: {},
          hourlyRevenue: [], statusBreakdown: [],
        };
      }
    }),
});
