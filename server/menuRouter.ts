/**
 * Menu Router — Digital Menu CRUD
 * Powers the QR digital menu system.
 * Authenticated write (owner/manager), public read (for customer QR scan)
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_core/trpc";
import { menuItems, MenuItem as DbMenuItem } from "./db";
import { getDb } from "./db";
import { eq, and } from "drizzle-orm";

export type MenuCategory = "starters" | "mains" | "breads" | "rice" | "desserts" | "drinks" | "combos";
export type FoodType = "veg" | "non-veg" | "vegan";

export interface MenuItem {
  id: string;
  restaurantId: string;
  category: MenuCategory;
  name: string;
  description: string;
  price: number;
  foodType: FoodType;
  isAvailable: boolean;
  isSpecial: boolean;
  imageUrl?: string;
}

// Green Apple Restaurant default menu
let LIVE_MENU: MenuItem[] = [
  // Starters
  { id: "mi1", restaurantId: "res_default", category: "starters", name: "Paneer Tikka", description: "Marinated cottage cheese grilled in tandoor", price: 180, foodType: "veg", isAvailable: true, isSpecial: true },
  { id: "mi2", restaurantId: "res_default", category: "starters", name: "Veg Spring Rolls", description: "Crispy rolls with mixed vegetables", price: 120, foodType: "veg", isAvailable: true, isSpecial: false },
  { id: "mi3", restaurantId: "res_default", category: "starters", name: "Hara Bhara Kebab", description: "Spinach and green pea patties", price: 140, foodType: "vegan", isAvailable: true, isSpecial: false },
  // Mains
  { id: "mi4", restaurantId: "res_default", category: "mains", name: "Paneer Butter Masala", description: "Rich creamy tomato-based gravy with cottage cheese", price: 280, foodType: "veg", isAvailable: true, isSpecial: true },
  { id: "mi5", restaurantId: "res_default", category: "mains", name: "Dal Makhani", description: "Slow-cooked black lentils with butter and cream", price: 220, foodType: "veg", isAvailable: true, isSpecial: false },
  { id: "mi6", restaurantId: "res_default", category: "mains", name: "Mix Veg Curry", description: "Seasonal vegetables in a spiced tomato-onion gravy", price: 200, foodType: "vegan", isAvailable: true, isSpecial: false },
  { id: "mi7", restaurantId: "res_default", category: "mains", name: "Kadai Paneer", description: "Spiced paneer with capsicum and onion in kadai gravy", price: 260, foodType: "veg", isAvailable: true, isSpecial: false },
  // Breads
  { id: "mi8", restaurantId: "res_default", category: "breads", name: "Butter Naan", description: "Soft leavened bread from tandoor, topped with butter", price: 45, foodType: "veg", isAvailable: true, isSpecial: false },
  { id: "mi9", restaurantId: "res_default", category: "breads", name: "Garlic Naan", description: "Naan infused with garlic and herbs", price: 55, foodType: "veg", isAvailable: true, isSpecial: false },
  { id: "mi10", restaurantId: "res_default", category: "breads", name: "Gujarati Thepla", description: "Spiced flatbread made with fenugreek leaves", price: 40, foodType: "veg", isAvailable: true, isSpecial: true },
  // Rice
  { id: "mi11", restaurantId: "res_default", category: "rice", name: "Veg Biryani", description: "Aromatic basmati rice layered with vegetables and spices", price: 220, foodType: "veg", isAvailable: true, isSpecial: false },
  { id: "mi12", restaurantId: "res_default", category: "rice", name: "Jeera Rice", description: "Cumin-flavoured steamed basmati rice", price: 140, foodType: "vegan", isAvailable: true, isSpecial: false },
  // Desserts
  { id: "mi13", restaurantId: "res_default", category: "desserts", name: "Gulab Jamun", description: "Soft milk-solid dumplings soaked in sugar syrup (3 pcs)", price: 80, foodType: "veg", isAvailable: true, isSpecial: false },
  { id: "mi14", restaurantId: "res_default", category: "desserts", name: "Mango Kulfi", description: "Traditional Indian ice cream with fresh mango", price: 100, foodType: "veg", isAvailable: true, isSpecial: true },
  // Drinks
  { id: "mi15", restaurantId: "res_default", category: "drinks", name: "Sweet Lassi", description: "Chilled yoghurt drink, mildly sweetened", price: 80, foodType: "veg", isAvailable: true, isSpecial: false },
  { id: "mi16", restaurantId: "res_default", category: "drinks", name: "Masala Chaas", description: "Spiced buttermilk with cumin and mint", price: 60, foodType: "veg", isAvailable: true, isSpecial: false },
  { id: "mi17", restaurantId: "res_default", category: "drinks", name: "Fresh Lime Soda", description: "Chilled lime juice with soda, sweet or salted", price: 70, foodType: "vegan", isAvailable: true, isSpecial: false },
  // Combos
  { id: "mi18", restaurantId: "res_default", category: "combos", name: "Lunch Thali (Full)", description: "Dal + 2 sabji + rice + 3 naan + raita + dessert", price: 250, foodType: "veg", isAvailable: true, isSpecial: true },
  { id: "mi19", restaurantId: "res_default", category: "combos", name: "Dinner Combo (2 Pax)", description: "2 curries + 4 breads + rice + 2 drinks", price: 480, foodType: "veg", isAvailable: true, isSpecial: false },
  { id: "mi20", restaurantId: "res_default", category: "combos", name: "Family Pack (6 Pax)", description: "Full thali × 6 with extra breads and desserts", price: 1200, foodType: "veg", isAvailable: true, isSpecial: true },
];

export const menuRouter = router({
  // Public: get menu by restaurant (used by QR menu page)
  getByRestaurant: publicProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (db) {
        const items = await db.select().from(menuItems).where(
          and(eq(menuItems.restaurantId, input.restaurantId), eq(menuItems.isAvailable, true))
        );
        if (items.length > 0) return items;
      }
      return LIVE_MENU.filter(m => m.restaurantId === input.restaurantId);
    }),

  // Protected: get full menu with unavailable items (for owners)
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      const restaurantId = ctx.user.restaurantId as string;
      if (db) {
        const items = await db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId as string));
        if (items.length > 0) return items;
      }
      return LIVE_MENU.filter(m => m.restaurantId === restaurantId);
    }),

  // Admin: toggle availability
  toggleAvailability: adminProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const restaurantId = ctx.user.restaurantId as string;
      if (db) {
        const item = await db
          .select()
          .from(menuItems)
          .where(
            and(
              eq(menuItems.id, input.itemId),
              eq(menuItems.restaurantId, restaurantId as string)
            )
          )
          .limit(1);
          
        if (item.length > 0) {
          const newStatus = !item[0].isAvailable;
          await db.update(menuItems).set({ isAvailable: newStatus }).where(eq(menuItems.id, input.itemId));
          return { success: true, isAvailable: newStatus };
        }
      }
      
      LIVE_MENU = LIVE_MENU.map(m =>
        (m.id === input.itemId && m.restaurantId === restaurantId) ? { ...m, isAvailable: !m.isAvailable } : m
      );
      const item = LIVE_MENU.find(m => m.id === input.itemId && m.restaurantId === restaurantId);
      return { success: true, isAvailable: item?.isAvailable };
    }),

  // Admin: add item
  addItem: adminProcedure
    .input(z.object({
      category: z.enum(["starters", "mains", "breads", "rice", "desserts", "drinks", "combos"]),
      name: z.string(),
      description: z.string(),
      price: z.number(),
      foodType: z.enum(["veg", "non-veg", "vegan"]),
      isSpecial: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = `mi_${Date.now()}`;
      const db = await getDb();
      const restaurantId = ctx.user.restaurantId as string;
      if (db) {
        await db.insert(menuItems).values({
          id,
          restaurantId: restaurantId as string,
          category: input.category,
          name: input.name,
          description: input.description,
          price: input.price,
          foodType: input.foodType as any,
          isSpecial: input.isSpecial,
          isAvailable: true,
        });
      }

      const newItem: MenuItem = {
        id,
        restaurantId,
        isAvailable: true,
        ...input,
      };
      LIVE_MENU.push(newItem);
      return newItem;
    }),

  // Admin: remove item
  removeItem: adminProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const restaurantId = ctx.user.restaurantId as string;
      if (db) {
        await db
          .delete(menuItems)
          .where(
            and(
              eq(menuItems.id, input.itemId),
              eq(menuItems.restaurantId, restaurantId)
            )
          );
      }
      LIVE_MENU = LIVE_MENU.filter(m => !(m.id === input.itemId && m.restaurantId === restaurantId));
      return { success: true };
    }),

  // Admin: update price
  updatePrice: adminProcedure
    .input(z.object({ itemId: z.string(), price: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const restaurantId = ctx.user.restaurantId as string;
      if (db) {
        await db
          .update(menuItems)
          .set({ price: input.price })
          .where(
            and(
              eq(menuItems.id, input.itemId),
              eq(menuItems.restaurantId, restaurantId)
            )
          );
      }
      LIVE_MENU = LIVE_MENU.map(m =>
        (m.id === input.itemId && m.restaurantId === restaurantId) ? { ...m, price: input.price } : m
      );
      return { success: true };
    }),
});
