/**
 * Drizzle ORM Schema for TableBook
 * Defines all database tables and their TypeScript types.
 * When no DB is connected, mock data is used as fallback.
 */
import { mysqlTable, varchar, int, timestamp, text, boolean } from 'drizzle-orm/mysql-core';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

// ─── Users ───────────────────────────────────────────────────────────
export const users = mysqlTable('users', {
  id:           int('id').autoincrement().primaryKey(),
  openId:       varchar('open_id', { length: 255 }).notNull().unique(),
  restaurantId: varchar('restaurant_id', { length: 255 }).default('res_default'),
  name:         varchar('name', { length: 255 }),
  email:        varchar('email', { length: 255 }),
  pinCode:      varchar('pin_code', { length: 255 }), // Hashed POS login PIN
  loginMethod:  varchar('login_method', { length: 64 }).default('oauth'),
  role:         varchar('role', { length: 32 }).$type<'owner' | 'manager' | 'host' | 'waiter'>().default('waiter'),
  lastSignedIn: timestamp('last_signed_in').defaultNow(),
  createdAt:    timestamp('created_at').defaultNow(),
});
export type User = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

// ─── Restaurants ──────────────────────────────────────────────────────
export const restaurants = mysqlTable('restaurants', {
  id:              varchar('id', { length: 64 }).primaryKey(),
  slug:            varchar('slug', { length: 128 }).unique(),
  name:            varchar('name', { length: 255 }).notNull(),
  address:         text('address'),
  city:            varchar('city', { length: 128 }),
  pincode:         varchar('pincode', { length: 10 }),
  phone:           text('phone'),
  email:           text('email'),
  whatsappNumber:  text('whatsapp_number'),
  pinCode:         varchar('pin_code', { length: 4 }).default('1234'),
  openingHours:    text('opening_hours'),   // JSON string {lunch: "11:00-15:00", dinner: "18:30-23:00"}
  cuisineType:     varchar('cuisine_type', { length: 255 }),
  gstNumber:       varchar('gst_number', { length: 20 }),
  instagramUrl:    varchar('instagram_url', { length: 512 }),
  googleMapsUrl:   varchar('google_maps_url', { length: 1024 }),
  logoUrl:         varchar('logo_url', { length: 512 }),
  fullyBooked:     int('fully_booked').default(0),
  twilioSid:       varchar('twilio_sid', { length: 255 }),
  twilioToken:     varchar('twilio_token', { length: 255 }),
  twilioPhone:     varchar('twilio_phone', { length: 32 }),
  createdAt:       timestamp('created_at').defaultNow(),
});
export type Restaurant = InferSelectModel<typeof restaurants>;
export type InsertRestaurant = InferInsertModel<typeof restaurants>;

// ─── Tables ───────────────────────────────────────────────────────────
export const tables = mysqlTable('tables', {
  id:           varchar('id', { length: 64 }).primaryKey(),
  restaurantId: varchar('restaurant_id', { length: 64 }).notNull(),
  tableNumber:  int('table_number').notNull(),
  capacity:     int('capacity').notNull().default(4),
  status:       varchar('status', { length: 32 })
                  .$type<'available' | 'occupied' | 'reserved' | 'cleaning' | 'blocked'>()
                  .default('available'),
});
export type Table = InferSelectModel<typeof tables>;
export type InsertTable = InferInsertModel<typeof tables>;

// ─── Customers ────────────────────────────────────────────────────────
export const customers = mysqlTable('customers', {
  id:           varchar('id', { length: 64 }).primaryKey(),
  restaurantId: varchar('restaurant_id', { length: 64 }).notNull(),
  name:         varchar('name', { length: 255 }).notNull(),
  phone:        varchar('phone', { length: 32 }),
  email:        varchar('email', { length: 255 }),
  visitCount:   int('visit_count').default(0),
  notes:        text('notes'),
  createdAt:    timestamp('created_at').defaultNow(),
});
export type Customer = InferSelectModel<typeof customers>;
export type InsertCustomer = InferInsertModel<typeof customers>;

// ─── Bookings ─────────────────────────────────────────────────────────
export const bookings = mysqlTable('bookings', {
  id:              varchar('id', { length: 64 }).primaryKey(),
  restaurantId:    varchar('restaurant_id', { length: 64 }).notNull(),
  customerId:      varchar('customer_id', { length: 64 }),
  tableId:         varchar('table_id', { length: 64 }),
  bookingDate:     varchar('booking_date', { length: 16 }).notNull(),  // YYYY-MM-DD
  bookingTime:     varchar('booking_time', { length: 8 }).notNull(),   // HH:MM
  partySize:       int('party_size').notNull().default(2),
  status:          varchar('status', { length: 32 })
                     .$type<'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show'>()
                     .default('pending'),
  source:          varchar('source', { length: 32 })
                     .$type<'online' | 'walkin' | 'phone' | 'staff_override'>()
                     .default('online'),
  coverCharge:     int('cover_charge').default(0),
  paymentStatus:   varchar('payment_status', { length: 32 }).default('unpaid'),
  payment_id:      varchar('payment_id', { length: 255 }),
  specialRequests: text('special_requests'),
  whatsappSent:    boolean('whatsapp_sent').default(false),
  reminderSent:    boolean('reminder_sent').default(false),
  finalBill:       int('final_bill').default(0),
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow().onUpdateNow(),
});
export type Booking = InferSelectModel<typeof bookings>;
export type InsertBooking = InferInsertModel<typeof bookings>;

// ─── Menu Items ───────────────────────────────────────────────────────
export const menuItems = mysqlTable('menu_items', {
  id:           varchar('id', { length: 64 }).primaryKey(),
  restaurantId: varchar('restaurant_id', { length: 64 }).notNull(),
  category:     varchar('category', { length: 64 }).notNull(),
  name:         varchar('name', { length: 255 }).notNull(),
  description:  text('description'),
  price:        int('price').notNull(),
  foodType:     varchar('food_type', { length: 16 }).$type<'veg' | 'non-veg' | 'vegan'>().default('veg'),
  isAvailable:  boolean('is_available').default(true),
  isSpecial:    boolean('is_special').default(false),
  imageUrl:     varchar('image_url', { length: 512 }),
  createdAt:    timestamp('created_at').defaultNow(),
});
export type MenuItem = InferSelectModel<typeof menuItems>;
export type InsertMenuItem = InferInsertModel<typeof menuItems>;

// ─── Delivery Orders ──────────────────────────────────────────────────
export const deliveryOrders = mysqlTable('delivery_orders', {
  id:           varchar('id', { length: 64 }).primaryKey(),
  restaurantId: varchar('restaurant_id', { length: 64 }).notNull(),
  platform:     varchar('platform', { length: 32 }).$type<'zomato' | 'swiggy' | 'direct'>(),
  externalId:   varchar('external_id', { length: 64 }), // Zomato/Swiggy Order ID
  customerName: varchar('customer_name', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 32 }),
  totalAmount:  int('total_amount').notNull(),
  status:       varchar('status', { length: 32 })
                  .$type<'pending' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled'>()
                  .default('pending'),
  itemsSummary: text('items_summary'), // JSON string of items
  createdAt:    timestamp('created_at').defaultNow(),
});
export type DeliveryOrder = InferSelectModel<typeof deliveryOrders>;
export type InsertDeliveryOrder = InferInsertModel<typeof deliveryOrders>;

// ─── Reviews Cache ─────────────────────────────────────────────────────
export const reviews = mysqlTable('reviews', {
  id:           varchar('id', { length: 64 }).primaryKey(),
  restaurantId: varchar('restaurant_id', { length: 64 }).notNull(),
  authorName:   varchar('author_name', { length: 255 }).notNull(),
  rating:       int('rating').notNull(),
  text:         text('text'),
  relativeTime: varchar('relative_time', { length: 64 }),
  isReplied:    boolean('is_replied').default(false),
  replyText:    text('reply_text'),
  createdAt:    timestamp('created_at').defaultNow(),
});
export type Review = InferSelectModel<typeof reviews>;
export type InsertReview = InferInsertModel<typeof reviews>;
