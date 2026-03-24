# TableBook Mobile App - TODO

## Core Features

### Authentication & Setup
- [ ] Phone OTP authentication (Supabase Auth)
- [ ] Restaurant owner login flow
- [ ] Super admin login flow
- [ ] Kitchen staff login flow

### Customer Booking Widget
- [x] Date picker screen (no past dates)
- [x] Party size selector (1-20)
- [x] Time slot availability API integration
- [x] Guest details form (name, phone, occasion, notes)
- [x] Cover charge payment integration (Razorpay - mocked)
- [x] Booking confirmation screen with table number
- [x] WhatsApp confirmation message (mocked)

### Restaurant Owner - Table Management
- [x] Real-time table grid view with status colors
- [x] Single-tap table status change (Available/Occupied/Reserved/Cleaning/Blocked)
- [x] "Fully Booked" toggle to pause online bookings
- [ ] Walk-in form to add customers without prior booking
- [ ] Real-time sync via Supabase Realtime

### Restaurant Owner - Bookings Management
- [x] Today's bookings list with filtering
- [x] Search by guest name or phone
- [x] Booking detail drawer with full information
- [x] Status change actions (Confirm, Check-in, Complete, Cancel, Mark No-Show)
- [x] WhatsApp notification triggers on status change (mocked)
- [x] Booking notes editor

### Restaurant Owner - Analytics Dashboard
- [x] Today's revenue card
- [ ] Weekly revenue chart (Chart.js)
- [x] Occupancy rate gauge
- [x] No-show rate percentage with trend
- [x] Top booking times bar chart
- [x] Booking sources donut chart
- [x] Total customers counter
- [x] Repeat customers percentage

### WhatsApp Automation (Mocked)
- [x] Booking confirmation message template
- [x] 60-minute reminder message
- [x] 15-minute late alert message
- [x] Post-visit review request
- [x] Loyalty reward notification
- [x] Booking cancellation message
- [ ] Message log display in booking details

### Super Admin - Restaurant Onboarding
- [ ] Guided onboarding form (name, tables, hours, menu, WhatsApp key)
- [ ] Restaurant configuration setup
- [ ] Initial table creation

### Super Admin - Restaurant Management
- [ ] List of all active restaurants
- [ ] Restaurant status and subscription info
- [ ] Activate/deactivate restaurant subscription
- [ ] Last login date tracking

### Super Admin - Platform Analytics
- [ ] Total bookings this month
- [ ] WhatsApp messages sent count
- [ ] Active restaurants count
- [ ] Platform health metrics

## UI/UX Implementation

### Navigation & Layout
- [x] Tab bar navigation setup
- [x] Screen routing with Expo Router
- [x] Safe area handling for all screens
- [ ] Back button and navigation flow

### Styling & Theme
- [x] Tailwind CSS theme configuration
- [x] Color tokens implementation
- [x] Dark mode support
- [x] Custom component library (buttons, cards, badges)

### Forms & Validation
- [ ] React Hook Form integration
- [ ] Zod schema validation
- [ ] Form error handling and display
- [ ] Date/time picker components

### Real-Time Features
- [ ] Supabase Realtime subscription setup
- [ ] Table status live updates
- [ ] Booking list live updates
- [ ] Multi-session sync

## Data & API

### Database Schema
- [ ] Restaurants table
- [ ] Tables table
- [ ] Bookings table
- [ ] Customers table
- [ ] Users table (owners, managers, kitchen staff)
- [ ] Row-Level Security (RLS) policies

### API Endpoints
- [ ] POST /bookings - Create new booking
- [ ] PATCH /bookings/:id - Update booking status
- [ ] GET /bookings - List bookings
- [ ] PATCH /tables/:id - Update table status
- [ ] GET /availability - Get available time slots
- [ ] POST /walkins - Create walk-in booking
- [ ] GET /analytics - Get revenue and metrics

### Third-Party Integrations
- [x] Razorpay payment integration (mocked)
- [x] WhatsApp API integration (mocked)
- [ ] Google Maps integration for location links

## Project Analysis
- [x] Initial Project Discovery
    - [x] List project files and directory structure
    - [x] Identify technology stack and dependencies
- [x] Deep Analysis
    - [x] Analyze core functionality and logic
    - [x] Review UI/UX and design aesthetics
    - [x] Performance and SEO audit
    - [x] Security and Best Practices check
- [x] Reporting and Recommendations
    - [x] Document findings
    - [x] Provide 10+ actionable suggestions for improvements
    - [x] Create implementation plan for priority fixes

## Testing & Quality

- [ ] Unit tests for booking availability logic
- [ ] Integration tests for status updates
- [ ] End-to-end flow testing
- [ ] Real-time sync testing
- [ ] Cross-platform testing (iOS, Android, Web)

## Deployment & Launch

- [x] App icon and splash screen design
- [ ] Build configuration for iOS and Android
- [ ] Environment variables setup
- [ ] First checkpoint creation
- [ ] App publication and APK generation
