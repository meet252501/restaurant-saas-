/**
 * Drizzle ORM Schema for TableBook — SQLite dialect
 * Uses better-sqlite3 locally; ready for Turso (libsql) in production.
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

// ─── Users ───────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  openId:       text('open_id').notNull().unique(),
  restaurantId: text('restaurant_id').default('res_default'),
  name:         text('name'),
  email:        text('email'),
  phone:        text('phone'),
  pinCode:      text('pin_code'),          // Hashed POS login PIN
  password:     text('password'),
  loginMethod:  text('login_method').default('oauth'),
  role:         text('role').$type<'owner' | 'manager' | 'host' | 'waiter'>().default('waiter'),
  lastSignedIn:   text('last_signed_in'),    // ISO string
  failedAttempts: integer('failed_attempts').default(0),
  lockoutUntil:   text('lockout_until'),     // ISO string
  createdAt:      text('created_at'),        // ISO string
});
export type User = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;

// ─── Restaurants ──────────────────────────────────────────────────────
export const restaurants = sqliteTable('restaurants', {
  id:              text('id').primaryKey(),
  slug:            text('slug').unique(),
  name:            text('name').notNull(),
  address:         text('address'),
  city:            text('city'),
  pincode:         text('pincode'),
  phone:           text('phone'),
  email:           text('email'),
  whatsappNumber:  text('whatsapp_number'),
  pinCode:         text('pin_code').default('1234'),
  openingHours:    text('opening_hours'),   // JSON string
  cuisineType:     text('cuisine_type'),
  gstNumber:       text('gst_number'),
  instagramUrl:    text('instagram_url'),
  googleMapsUrl:   text('google_maps_url'),
  logoUrl:         text('logo_url'),
  fullyBooked:     integer('fully_booked').default(0),
  twilioSid:       text('twilio_sid'),
  twilioToken:     text('twilio_token'),
  twilioPhone:     text('twilio_phone'),
  createdAt:       text('created_at'),
});
export type Restaurant = InferSelectModel<typeof restaurants>;
export type InsertRestaurant = InferInsertModel<typeof restaurants>;

// ─── Tables ───────────────────────────────────────────────────────────
export const tables = sqliteTable('tables', {
  id:           text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  tableNumber:  integer('table_number').notNull(),
  capacity:     integer('capacity').notNull().default(4),
  status:       text('status')
                  .$type<'available' | 'occupied' | 'reserved' | 'cleaning' | 'blocked'>()
                  .default('available'),
});
export type Table = InferSelectModel<typeof tables>;
export type InsertTable = InferInsertModel<typeof tables>;

// ─── Customers ────────────────────────────────────────────────────────
export const customers = sqliteTable('customers', {
  id:           text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  name:         text('name').notNull(),
  phone:        text('phone'),
  email:        text('email'),
  visitCount:   integer('visit_count').default(0),
  notes:        text('notes'),
  tags:         text('tags').default(''),   // comma separated: vip,birthday,allergy
  createdAt:    text('created_at'),
});
export type Customer = InferSelectModel<typeof customers>;
export type InsertCustomer = InferInsertModel<typeof customers>;

// ─── Bookings ─────────────────────────────────────────────────────────
export const bookings = sqliteTable('bookings', {
  id:              text('id').primaryKey(),
  restaurantId:    text('restaurant_id').notNull(),
  customerId:      text('customer_id'),
  tableId:         text('table_id'),
  guestName:       text('guest_name'),
  guestPhone:      text('guest_phone'),
  bookingDate:     text('booking_date').notNull(),  // YYYY-MM-DD
  bookingTime:     text('booking_time').notNull(),  // HH:MM
  partySize:       integer('party_size').notNull().default(2),
  status:          text('status')
                     .$type<'pending' | 'confirmed' | 'seated' | 'done' | 'cancelled' | 'no_show'>()
                     .default('pending'),
  source:          text('source')
                     .$type<'online' | 'walkin' | 'phone' | 'staff_override'>()
                     .default('online'),
  coverCharge:     integer('cover_charge').default(0),
  paymentStatus:   text('payment_status').default('unpaid'),
  paymentId:       text('payment_id'),
  specialRequests: text('special_requests'),
  whatsappSent:    integer('whatsapp_sent', { mode: 'boolean' }).default(false),
  reminderSent:    integer('reminder_sent', { mode: 'boolean' }).default(false),
  finalBill:       integer('final_bill').default(0),
  createdAt:       text('created_at'),
  updatedAt:       text('updated_at'),
});
export type Booking = InferSelectModel<typeof bookings>;
export type InsertBooking = InferInsertModel<typeof bookings>;

// ─── Menu Items ───────────────────────────────────────────────────────
export const menuItems = sqliteTable('menu_items', {
  id:           text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  category:     text('category').notNull(),
  name:         text('name').notNull(),
  description:  text('description'),
  price:        integer('price').notNull(),
  foodType:     text('food_type').$type<'veg' | 'non-veg' | 'vegan'>().default('veg'),
  isAvailable:  integer('is_available', { mode: 'boolean' }).default(true),
  isSpecial:    integer('is_special', { mode: 'boolean' }).default(false),
  imageUrl:     text('image_url'),
  createdAt:    text('created_at'),
});
export type MenuItem = InferSelectModel<typeof menuItems>;
export type InsertMenuItem = InferInsertModel<typeof menuItems>;

// ─── Delivery Orders ──────────────────────────────────────────────────
export const deliveryOrders = sqliteTable('delivery_orders', {
  id:            text('id').primaryKey(),
  restaurantId:  text('restaurant_id').notNull(),
  platform:      text('platform').$type<'zomato' | 'swiggy' | 'direct'>(),
  externalId:    text('external_id'),
  customerName:  text('customer_name'),
  customerPhone: text('customer_phone'),
  totalAmount:   integer('total_amount').notNull(),
  status:        text('status')
                   .$type<'pending' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled'>()
                   .default('pending'),
  itemsSummary:  text('items_summary'),   // JSON string
  createdAt:     text('created_at'),
});
export type DeliveryOrder = InferSelectModel<typeof deliveryOrders>;
export type InsertDeliveryOrder = InferInsertModel<typeof deliveryOrders>;

// ─── Reviews Cache ─────────────────────────────────────────────────────
export const reviews = sqliteTable('reviews', {
  id:           text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  authorName:   text('author_name').notNull(),
  rating:       integer('rating').notNull(),
  text:         text('text'),
  relativeTime: text('relative_time'),
  isReplied:    integer('is_replied', { mode: 'boolean' }).default(false),
  replyText:    text('reply_text'),
  createdAt:    text('created_at'),
});
export type Review = InferSelectModel<typeof reviews>;
export type InsertReview = InferInsertModel<typeof reviews>;

// ─── Staff / Shifts ───────────────────────────────────────────────────
export const staff = sqliteTable('staff', {
  id:           text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  name:         text('name').notNull(),
  role:         text('role').$type<'manager' | 'waiter' | 'chef' | 'host'>().default('waiter'),
  phone:        text('phone'),
  pinCode:      text('pin_code'),
  isActive:     integer('is_active', { mode: 'boolean' }).default(true),
  createdAt:    text('created_at'),
});
export type Staff = InferSelectModel<typeof staff>;
export type InsertStaff = InferInsertModel<typeof staff>;
