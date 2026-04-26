import { pgTable, text, integer, boolean, timestamp, serial, uniqueIndex } from 'drizzle-orm/pg-core';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

// ─── Users ───────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id:           serial('id').primaryKey(),
  openId:       text('open_id').notNull().unique(),
  restaurantId: text('restaurant_id').default('res_default'),
  name:         text('name'),
  email:        text('email'),
  phone:        text('phone'),
  pinCode:      text('pin_code'),
  password:     text('password'),
  loginMethod:  text('login_method').default('oauth'),
  role:         text('role').default('waiter'),
  lastSignedIn:   text('last_signed_in'),
  failedAttempts: integer('failed_attempts').default(0),
  lockoutUntil:   text('lockout_until'),
  createdAt:      text('created_at'),
});

// ─── Restaurants ──────────────────────────────────────────────────────
export const restaurants = pgTable('restaurants', {
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
  openingHours:    text('opening_hours'),
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

// ─── Tables ───────────────────────────────────────────────────────────
export const tables = pgTable('tables', {
  id:           text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  tableNumber:  integer('table_number').notNull(),
  capacity:     integer('capacity').notNull().default(4),
  status:       text('status').default('available'),
});

// ─── Customers ────────────────────────────────────────────────────────
export const customers = pgTable('customers', {
  id:           text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  name:         text('name').notNull(),
  phone:        text('phone'),
  email:        text('email'),
  visitCount:   integer('visit_count').default(0),
  notes:        text('notes'),
  tags:         text('tags').default(''),
  createdAt:    text('created_at'),
});

// ─── Bookings ─────────────────────────────────────────────────────────
export const bookings = pgTable('bookings', {
  id:              text('id').primaryKey(),
  restaurantId:    text('restaurant_id').notNull(),
  customerId:      text('customer_id'),
  tableId:         text('table_id'),
  guestName:       text('guest_name'),
  guestPhone:      text('guest_phone'),
  bookingDate:     text('booking_date').notNull(),
  bookingTime:     text('booking_time').notNull(),
  partySize:       integer('party_size').notNull().default(2),
  status:          text('status').default('pending'),
  source:          text('source').default('online'),
  coverCharge:     integer('cover_charge').default(0),
  paymentStatus:   text('payment_status').default('unpaid'),
  paymentId:       text('payment_id'),
  specialRequests: text('special_requests'),
  whatsappSent:    boolean('whatsapp_sent').default(false),
  reminderSent:    boolean('reminder_sent').default(false),
  finalBill:       integer('final_bill').default(0),
  createdAt:       text('created_at'),
  updatedAt:       text('updated_at'),
});

// ─── Menu Items ───────────────────────────────────────────────────────
export const menuItems = pgTable('menu_items', {
  id:           text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  category:     text('category').notNull(),
  name:         text('name').notNull(),
  description:  text('description'),
  price:        integer('price').notNull(),
  foodType:     text('food_type').default('veg'),
  isAvailable:  boolean('is_available').default(true),
  isSpecial:    boolean('is_special').default(false),
  imageUrl:     text('image_url'),
  createdAt:    text('created_at'),
});

// ─── Delivery Orders ──────────────────────────────────────────────────
export const deliveryOrders = pgTable('delivery_orders', {
  id:            text('id').primaryKey(),
  restaurantId:  text('restaurant_id').notNull(),
  platform:      text('platform'),
  externalId:    text('external_id'),
  customerName:  text('customer_name'),
  customerPhone: text('customer_phone'),
  totalAmount:   integer('total_amount').notNull(),
  status:        text('status').default('pending'),
  itemsSummary:  text('items_summary'),
  createdAt:     text('created_at'),
});

// ─── Reviews Cache ─────────────────────────────────────────────────────
export const reviews = pgTable('reviews', {
  id:           text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  authorName:   text('author_name').notNull(),
  rating:       integer('rating').notNull(),
  text:         text('text'),
  relativeTime: text('relative_time'),
  isReplied:    boolean('is_replied').default(false),
  replyText:    text('reply_text'),
  createdAt:    text('created_at'),
});

// ─── Staff / Shifts ───────────────────────────────────────────────────
export const staff = pgTable('staff', {
  id:           text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull(),
  name:         text('name').notNull(),
  role:         text('role').default('waiter'),
  phone:        text('phone'),
  pinCode:      text('pin_code'),
  isActive:     boolean('is_active').default(true),
  createdAt:    text('created_at'),
});
