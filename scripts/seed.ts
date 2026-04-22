/**
 * TableBook — Database Seed Script
 * Creates all tables in local SQLite and seeds initial restaurant data.
 * Drops existing tables to ensure a clean slate.
 * Generates 8 weeks of realistic bookings and customers for commercial testing.
 * Run with: pnpm db:seed
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import path from 'path';
import * as schema from '../drizzle/schema';
import crypto from 'crypto';

const DB_PATH = path.resolve('./tablebook.db');

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomPastDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  // Optional: Randomize time slightly if needed, but let's just return the date.
  return d;
}

async function seed() {
  console.log('🌱 TableBook Seed Script (Commercial Reset)');
  console.log(`📁 Database: ${DB_PATH}\n`);

  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });

  // ── 1. Wipe Everything ───────────────────────────────────────────
  console.log('🧹 Dropping existing tables for a clean slate...');
  sqlite.exec(`
    DROP TABLE IF EXISTS bookings;
    DROP TABLE IF EXISTS customers;
    DROP TABLE IF EXISTS tables;
    DROP TABLE IF EXISTS menu_items;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS staff;
    DROP TABLE IF EXISTS delivery_orders;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS restaurants;
  `);

  // ── 2. Create Tables ─────────────────────────────────────────────
  console.log('🏗️ Creating tables...');
  sqlite.exec(`
    CREATE TABLE restaurants (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      pincode TEXT,
      phone TEXT,
      email TEXT,
      whatsapp_number TEXT,
      pin_code TEXT DEFAULT '1234',
      opening_hours TEXT,
      cuisine_type TEXT,
      gst_number TEXT,
      instagram_url TEXT,
      google_maps_url TEXT,
      logo_url TEXT,
      fully_booked INTEGER DEFAULT 0,
      twilio_sid TEXT,
      twilio_token TEXT,
      twilio_phone TEXT,
      created_at TEXT
    );

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      open_id TEXT NOT NULL UNIQUE,
      restaurant_id TEXT DEFAULT 'res_default',
      name TEXT,
      email TEXT,
      phone TEXT,
      pin_code TEXT,
      login_method TEXT DEFAULT 'oauth',
      role TEXT DEFAULT 'manager',
      last_signed_in TEXT,
      created_at TEXT
    );

    CREATE TABLE tables (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      table_number INTEGER NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 4,
      status TEXT DEFAULT 'available'
    );

    CREATE TABLE customers (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      visit_count INTEGER DEFAULT 0,
      notes TEXT,
      tags TEXT DEFAULT '',
      created_at TEXT
    );

    CREATE TABLE bookings (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      customer_id TEXT,
      table_id TEXT,
      guest_name TEXT,
      guest_phone TEXT,
      booking_date TEXT NOT NULL,
      booking_time TEXT NOT NULL,
      party_size INTEGER NOT NULL DEFAULT 2,
      status TEXT DEFAULT 'pending',
      source TEXT DEFAULT 'online',
      cover_charge INTEGER DEFAULT 0,
      payment_status TEXT DEFAULT 'unpaid',
      payment_id TEXT,
      special_requests TEXT,
      whatsapp_sent INTEGER DEFAULT 0,
      reminder_sent INTEGER DEFAULT 0,
      final_bill INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE menu_items (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      food_type TEXT DEFAULT 'veg',
      is_available INTEGER DEFAULT 1,
      is_special INTEGER DEFAULT 0,
      image_url TEXT,
      created_at TEXT
    );

    CREATE TABLE delivery_orders (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      platform TEXT,
      external_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      total_amount INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      items_summary TEXT,
      created_at TEXT
    );

    CREATE TABLE reviews (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      text TEXT,
      relative_time TEXT,
      is_replied INTEGER DEFAULT 0,
      reply_text TEXT,
      created_at TEXT
    );

    CREATE TABLE staff (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'waiter',
      phone TEXT,
      pin_code TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    );
  `);
  console.log('✅ Tables created.');

  const now = new Date().toISOString();
  const RID = 'res_default';

  // ── 3. Seed Basic Data ───────────────────────────────────────────
  sqlite.prepare(`
    INSERT INTO restaurants (id, slug, name, city, phone, pin_code, opening_hours, cuisine_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(RID, 'green-apple', 'Green Apple', 'Chandigarh', '+91 9876543210', '1234',
    JSON.stringify({ lunch: '11:00-15:00', dinner: '18:30-23:00' }), 'Indian, Chinese', now);

  // Default Admin User
  sqlite.prepare(`
    INSERT INTO users (open_id, restaurant_id, name, email, pin_code, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('admin_1', RID, 'Admin Manager', 'admin@tablebook.com', '1234', 'manager', now);
  console.log('✅ Default Admin User created (PIN: 1234)');

  const tableData = [
    { id: 'tbl_1', num: 1, cap: 2 }, { id: 'tbl_2', num: 2, cap: 2 },
    { id: 'tbl_3', num: 3, cap: 4 }, { id: 'tbl_4', num: 4, cap: 4 },
    { id: 'tbl_5', num: 5, cap: 4 }, { id: 'tbl_6', num: 6, cap: 6 },
    { id: 'tbl_7', num: 7, cap: 6 }, { id: 'tbl_8', num: 8, cap: 8 },
    { id: 'tbl_9', num: 9, cap: 8 }, { id: 'tbl_10', num: 10, cap: 12 },
  ];
  const insertTable = sqlite.prepare('INSERT INTO tables (id, restaurant_id, table_number, capacity, status) VALUES (?, ?, ?, ?, ?)');
  tableData.forEach(t => insertTable.run(t.id, RID, t.num, t.cap, 'available'));

  const menuData = [
    { id: 'mi_1', cat: 'Starters', name: 'Paneer Tikka', price: 320, type: 'veg', special: true },
    { id: 'mi_2', cat: 'Starters', name: 'Chicken 65', price: 380, type: 'non-veg', special: false },
    { id: 'mi_3', cat: 'Mains', name: 'Butter Chicken', price: 420, type: 'non-veg', special: true },
    { id: 'mi_4', cat: 'Mains', name: 'Dal Makhani', price: 280, type: 'veg', special: false },
    { id: 'mi_5', cat: 'Breads', name: 'Butter Naan', price: 60, type: 'veg', special: false },
    { id: 'mi_6', cat: 'Drinks', name: 'Mango Lassi', price: 120, type: 'veg', special: true },
  ];
  const insertItem = sqlite.prepare(`
    INSERT INTO menu_items (id, restaurant_id, category, name, price, food_type, is_available, is_special, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  menuData.forEach(m => insertItem.run(m.id, RID, m.cat, m.name, m.price, m.type, m.special ? 1 : 0, now));

  // ── 4. Seed Random 8-Week Data ───────────────────────────────────
  console.log('🕰️ Generating 8 weeks of historical data...');
  const customerNames = [
    "Raj Patel", "Priya Sharma", "Anjali Singh", "Vikram Mehta", "Amir Desai", 
    "Sunita Rao", "Karan Johar", "Neha Dupia", "Aditya Roy", "Simran Kaur",
    "Mukesh Ambani", "Anita Desai", "Suresh Raina", "Gautam Gambhir", "Virat K"
  ];

  const insertCus = sqlite.prepare(`
    INSERT INTO customers (id, restaurant_id, name, phone, visit_count, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBooking = sqlite.prepare(`
    INSERT INTO bookings (id, restaurant_id, customer_id, table_id, guest_name, guest_phone, booking_date, booking_time, party_size, status, final_bill, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalBookings = 0;
  
  // Create Customer Records
  const generatedCustomers = customerNames.map((name, idx) => {
    return {
      id: `cus_${idx}`,
      name,
      phone: `+91 90000000${idx.toString().padStart(2, '0')}`,
      visitCount: 0
    };
  });

  const statuses = ['completed', 'completed', 'completed', 'completed', 'cancelled', 'no-show', 'seated', 'confirmed'];
  
  // 56 Days = 8 weeks
  for (let i = 56; i >= 0; i--) {
    const historicalDate = generateRandomPastDate(i);
    const dateStr = historicalDate.toISOString().split('T')[0];
    
    // Generate between 5 and 25 bookings per day
    let dailyBookings = randomInt(5, 25);

    // Weekends have more traffic
    const isWeekend = historicalDate.getDay() === 0 || historicalDate.getDay() === 6;
    if (isWeekend) dailyBookings += randomInt(10, 20);

    for (let b = 0; b < dailyBookings; b++) {
      const bId = crypto.randomUUID();
      const customer = generatedCustomers[randomInt(0, generatedCustomers.length - 1)];
      const isHistorical = i > 0;
      
      const status = isHistorical ? 
        ['completed', 'completed', 'completed', 'cancelled', 'no-show'][randomInt(0, 4)]
        : ['confirmed', 'seated', 'pending'][randomInt(0, 2)];

      if (status === 'completed') customer.visitCount += 1;

      const timeOptions = ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'];
      const timeStr = timeOptions[randomInt(0, timeOptions.length - 1)];
      const pax = randomInt(2, 6);
      const bill = status === 'completed' ? randomInt(800, 4500) : 0;
      const tId = tableData[randomInt(0, tableData.length - 1)].id;
      const source = randomInt(0, 10) > 2 ? 'walk-in' : 'online';

      insertBooking.run(bId, RID, customer.id, tId, customer.name, customer.phone, dateStr, timeStr, pax, status, bill, source, now);
      totalBookings++;
    }
  }

  // Finalize Customers
  generatedCustomers.forEach(c => {
    let tags = '';
    if (c.visitCount > 10) tags = 'vip';
    else if (c.visitCount > 3) tags = 'repeat';
    insertCus.run(c.id, RID, c.name, c.phone, c.visitCount, tags, now);
  });

  console.log(`✅ Generated ${generatedCustomers.length} Customers`);
  console.log(`✅ Generated ${totalBookings} Historical & Active Bookings`);

  sqlite.close();
  console.log('\n🎉 Database seeded successfully! Run `pnpm dev` to start the backend & web app.');
  console.log(`📦 DB file: ${DB_PATH}`);
}

seed().catch(e => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
