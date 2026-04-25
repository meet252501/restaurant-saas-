/**
 * Delivery Router — Zomato / Swiggy Online Order Sync
 * Pulls online orders into the floor management app.
 * Simulation mode: returns mock orders. Live mode: requires Zomato business API webhooks.
 * Env var: ZOMATO_API_KEY (optional, enables live webhook mode)
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { deliveryOrders } from "./db";
import { getDb } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { NotificationService } from "./_core/notification";
import { ThermalPrintService } from '../lib/ThermalPrintService';
import { GoogleSheetsService, ManagerEmailService } from './_core/googleSheets';

// Realistic Zomato/Swiggy mock orders for Green Apple Restaurant
interface MockDeliveryOrder {
  id: string;
  platform: "zomato" | "swiggy" | "direct";
  orderId: string;
  customerName: string;
  items: { name: string; qty: number; price: number; }[];
  total: number;
  status: "pending" | "preparing" | "dispatched" | "delivered" | "cancelled";
  estimatedDelivery: string;
  placedAt: string;
}

const MOCK_DELIVERY_ORDERS: MockDeliveryOrder[] = [
  {
    id: "zmt_001",
    platform: "zomato",
    orderId: "ZMT-GDH-9872634",
    customerName: "Meera Joshi",
    items: [
      { name: "Paneer Butter Masala", qty: 2, price: 280 },
      { name: "Naan", qty: 4, price: 40 },
      { name: "Raita", qty: 1, price: 60 },
    ],
    total: 700,
    status: "preparing",
    estimatedDelivery: "13:45",
    placedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
  },
  {
    id: "swy_001",
    platform: "swiggy",
    orderId: "SWG-8841029",
    customerName: "Arjun Mehta",
    items: [
      { name: "Veg Thali (Full)", qty: 3, price: 220 },
      { name: "Lassi", qty: 2, price: 80 },
    ],
    total: 820,
    status: "dispatched",
    estimatedDelivery: "13:30",
    placedAt: new Date(Date.now() - 28 * 60_000).toISOString(),
  },
  {
    id: "zmt_002",
    platform: "zomato",
    orderId: "ZMT-GDH-9873100",
    customerName: "Sunita Patel",
    items: [{ name: "Family Combo (6 pax)", qty: 1, price: 1200 }],
    total: 1200,
    status: "pending",
    estimatedDelivery: "14:10",
    placedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
  },
];

let liveOrders = [...MOCK_DELIVERY_ORDERS];

export const deliveryRouter = router({
  today: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const restaurantId = ctx.user.restaurantId as string;
    
    // In a real multi-tenant app, liveOrders would be filtered or stored in DB per restaurant
    let orders = liveOrders.filter(o => (o as any).restaurantId === restaurantId || !o.hasOwnProperty('restaurantId'));
    
    if (db) {
      try {
        const dbOrders = await db
          .select()
          .from(deliveryOrders)
          .where(eq(deliveryOrders.restaurantId, restaurantId as string))
          .orderBy(desc(deliveryOrders.createdAt))
          .limit(50);
          
        if (dbOrders.length > 0) {
          orders = dbOrders.map((o: any) => ({
            id: o.id,
            platform: o.platform as "zomato" | "swiggy",
            orderId: o.externalId || o.id,
            customerName: o.customerName || "Guest",
            items: (() => { try { const parsed = JSON.parse(o.itemsSummary || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })(),
            total: o.totalAmount,
            status: o.status as any,
            estimatedDelivery: "TBD",
            placedAt: (o.createdAt as unknown as string) || new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.error("[DeliveryRouter] DB fetch failed, using memory fallback", e);
      }
    }

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    return {
      orders: orders,
      summary: {
        total: orders.length,
        revenue: totalRevenue,
        zomato: orders.filter(o => o.platform === "zomato").length,
        swiggy: orders.filter(o => o.platform === "swiggy").length,
        pending: orders.filter(o => o.status === "pending").length,
        preparing: orders.filter(o => o.status === "preparing").length,
        dispatched: orders.filter(o => o.status === "dispatched").length,
      },
      isSimulated: !process.env.ZOMATO_API_KEY,
    };
  }),

  listByRange: protectedProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() })) // ISO Date range
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const restaurantId = ctx.user.restaurantId as string;
      
      if (!db) return [];

      const dbOrders = await db
        .select()
        .from(deliveryOrders)
        .where(
          and(
            eq(deliveryOrders.restaurantId, restaurantId),
            gte(deliveryOrders.createdAt, input.startDate),
            lte(deliveryOrders.createdAt, input.endDate)
          )
        )
        .orderBy(desc(deliveryOrders.createdAt));
        
      return dbOrders.map((o: any) => ({
        id: o.id,
        platform: o.platform as "zomato" | "swiggy",
        orderId: o.externalId || o.id,
        customerName: o.customerName || "Guest",
        items: (() => { try { const parsed = JSON.parse(o.itemsSummary || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } })(),
        total: o.totalAmount,
        status: o.status as any,
        placedAt: (o.createdAt as unknown as string) || new Date().toISOString(),
      }));
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      orderId: z.string(),
      status: z.enum(["pending", "preparing", "dispatched", "delivered", "cancelled"]),
    }))
    .mutation(({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      liveOrders = liveOrders.map(o =>
        (o.id === input.orderId && (o as any).restaurantId === restaurantId) ? { ...o, status: input.status } : o
      );
      return { success: true };
    }),

  // Webhook endpoint for Zomato/Swiggy to push new orders
  ingest: protectedProcedure
    .input(z.object({
      platform: z.enum(["zomato", "swiggy"]),
      orderId: z.string(),
      customerName: z.string(),
      items: z.array(z.object({ name: z.string(), qty: z.number(), price: z.number() })),
      total: z.number(),
    }))
    .mutation(({ input, ctx }) => {
      const restaurantId = ctx.user.restaurantId as string;
      const newOrder: MockDeliveryOrder & { restaurantId: string } = {
        id: `${input.platform}_${Date.now()}`,
        restaurantId: restaurantId as string,
        platform: input.platform,
        orderId: input.orderId,
        customerName: input.customerName,
        items: input.items,
        total: input.total,
        status: "pending",
        estimatedDelivery: "TBD",
        placedAt: new Date().toISOString(),
      };
      liveOrders.unshift(newOrder);
      console.log(`[DeliveryRouter] 📦 New ${input.platform} order #${input.orderId} from ${input.customerName} for ${restaurantId} (₹${input.total})`);
      
      // AUTO-AUTOMATION: Instant Kitchen Ticket Printing
      ThermalPrintService.printKOT({ 
        id: newOrder.orderId, 
        name: newOrder.customerName, 
        items: input.items.map(i => `${i.qty}x ${i.name}`).join(", "), 
        platform: newOrder.platform 
      }).catch(e => console.error("[Printer] Error:", e));

      return { success: true, order: newOrder };
    }),

  sendInvoice: protectedProcedure
    .input(z.object({
      orderId: z.string(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const restaurantId = ctx.user.restaurantId as string;
      
      const orders = await db
        .select()
        .from(deliveryOrders)
        .where(
          and(
            eq(deliveryOrders.id, input.orderId),
            eq(deliveryOrders.restaurantId, restaurantId as string)
          )
        );
        
      const order = orders[0];
      if (!order) return { success: false, error: "Order not found" };

      const targetPhone = input.phone || order.customerPhone;
      if (!targetPhone) return { success: false, error: "No phone number available for this order" };

      const result = await NotificationService.sendWhatsAppInvoice(targetPhone, {
        name: order.customerName || "Customer",
        id: order.externalId || order.id,
        items: order.itemsSummary || "Order items",
        total: order.totalAmount
      });

      return { success: true, result };
    }),
});
