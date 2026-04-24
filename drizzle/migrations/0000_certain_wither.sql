CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`customer_id` text,
	`table_id` text,
	`guest_name` text,
	`guest_phone` text,
	`booking_date` text NOT NULL,
	`booking_time` text NOT NULL,
	`party_size` integer DEFAULT 2 NOT NULL,
	`status` text DEFAULT 'pending',
	`source` text DEFAULT 'online',
	`cover_charge` integer DEFAULT 0,
	`payment_status` text DEFAULT 'unpaid',
	`payment_id` text,
	`special_requests` text,
	`whatsapp_sent` integer DEFAULT false,
	`reminder_sent` integer DEFAULT false,
	`final_bill` integer DEFAULT 0,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`visit_count` integer DEFAULT 0,
	`notes` text,
	`tags` text DEFAULT '',
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `delivery_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`platform` text,
	`external_id` text,
	`customer_name` text,
	`customer_phone` text,
	`total_amount` integer NOT NULL,
	`status` text DEFAULT 'pending',
	`items_summary` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` integer NOT NULL,
	`food_type` text DEFAULT 'veg',
	`is_available` integer DEFAULT true,
	`is_special` integer DEFAULT false,
	`image_url` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text,
	`name` text NOT NULL,
	`address` text,
	`city` text,
	`pincode` text,
	`phone` text,
	`email` text,
	`whatsapp_number` text,
	`pin_code` text DEFAULT '1234',
	`opening_hours` text,
	`cuisine_type` text,
	`gst_number` text,
	`instagram_url` text,
	`google_maps_url` text,
	`logo_url` text,
	`fully_booked` integer DEFAULT 0,
	`twilio_sid` text,
	`twilio_token` text,
	`twilio_phone` text,
	`created_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `restaurants_slug_unique` ON `restaurants` (`slug`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`author_name` text NOT NULL,
	`rating` integer NOT NULL,
	`text` text,
	`relative_time` text,
	`is_replied` integer DEFAULT false,
	`reply_text` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'waiter',
	`phone` text,
	`pin_code` text,
	`is_active` integer DEFAULT true,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` text PRIMARY KEY NOT NULL,
	`restaurant_id` text NOT NULL,
	`table_number` integer NOT NULL,
	`capacity` integer DEFAULT 4 NOT NULL,
	`status` text DEFAULT 'available'
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`open_id` text NOT NULL,
	`restaurant_id` text DEFAULT 'res_default',
	`name` text,
	`email` text,
	`phone` text,
	`pin_code` text,
	`login_method` text DEFAULT 'oauth',
	`role` text DEFAULT 'waiter',
	`last_signed_in` text,
	`failed_attempts` integer DEFAULT 0,
	`lockout_until` text,
	`created_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_open_id_unique` ON `users` (`open_id`);