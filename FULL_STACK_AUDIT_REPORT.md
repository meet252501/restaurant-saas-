# Full-Stack Deep Scan Audit Report: TableBook App

**Author:** Manus AI
**Date:** March 21, 2026

This document provides a comprehensive full-stack audit of the `tablebook-app` project. The scan evaluated the project structure, frontend components, backend API, database schema, and overall architecture to identify missing features, gaps, and areas for improvement.

## 1. Executive Summary

The `tablebook-app` is a React Native (Expo) application with an Express/tRPC backend and a MySQL database managed by Drizzle ORM. The project demonstrates a solid foundation for a restaurant management system, including features like booking management, table assignments, offline sync capabilities, and third-party integrations (Twilio, Razorpay, MSG91).

However, the deep scan revealed several critical gaps, particularly in testing, offline synchronization completeness, type safety, and error handling. The most pressing issue is the lack of genuine integration tests, as the current test suite relies heavily on synthetic assertions rather than exercising the actual application logic.

## 2. Frontend Architecture & Gaps

The frontend is built using Expo Router for navigation and `@tanstack/react-query` combined with tRPC for data fetching.

### 2.1 Strengths
- **Modern Stack:** Utilizes React 19, Expo Router, and NativeWind for styling.
- **Offline-First Approach:** Implements an `OfflineSync` service (`lib/offlineSync.ts`) to queue bookings when the device is offline.
- **Component Structure:** Well-organized `app` directory with clear separation of concerns (e.g., `(tabs)`, `booking`, `menu`).

### 2.2 Missing Components & Improvements
- **Incomplete Offline Sync:** The `OfflineSync` service lacks robust conflict resolution. It currently retries failed syncs up to three times but does not handle scenarios where a table might have been booked by another user while the device was offline.
- **Missing Real UI Tests:** The `__tests__/ui-accessibility.test.ts` file contains conceptual checks rather than actual component rendering tests. Genuine component-level tests using `@testing-library/react-native` are required.
- **Error Boundaries:** There is no global error boundary implemented in `app/_layout.tsx` to catch and gracefully handle React rendering errors.

## 3. Backend Architecture & Gaps

The backend is an Express server utilizing tRPC for type-safe API routes, with WebSockets for real-time updates.

### 3.1 Strengths
- **Type Safety:** tRPC ensures end-to-end type safety between the frontend and backend.
- **Centralized Error Handling:** `server/_core/errorHandler.ts` provides a structured way to log and retry failed operations, especially for third-party services.
- **Real-Time Updates:** WebSockets are configured in `server/_core/index.ts` to broadcast events like booking changes.

### 3.2 Missing Components & Improvements
- **Authentication Gaps:** The `auth.login` mutation in `server/routers.ts` relies on a simple PIN check. While functional for a POS system, it lacks robust session management and role-based access control (RBAC) enforcement across all protected routes. The `auth.logout.test.ts` is currently skipped, indicating incomplete validation of the auth flow.
- **Database Transaction Handling:** While `bookingRouter.ts` uses transactions to prevent double-bookings, the fallback mechanism to mock data when the database is unavailable could lead to data inconsistency in a production environment.
- **Missing Integration Tests:** The `__tests__/integration.10-10.test.ts` file is entirely synthetic. It does not test the actual tRPC routers or database interactions. Real integration tests using a test database are urgently needed.

## 4. Database Schema & Data Integrity

The database schema is defined using Drizzle ORM in `drizzle/schema.ts`.

### 4.1 Strengths
- **Comprehensive Schema:** Covers users, restaurants, tables, customers, bookings, menu items, delivery orders, and reviews.
- **Clear Relationships:** Logical foreign key relationships (e.g., `restaurantId` linking tables, bookings, and customers).

### 4.2 Missing Components & Improvements
- **Type Errors:** The `tsc-errors.txt` file highlights type mismatches, such as attempting to insert a `loyaltyVisits` property that does not exist in the schema, and missing `id` properties in batch inserts. These must be resolved to ensure data integrity.
- **Missing Indexes:** The schema lacks explicit indexes on frequently queried columns (e.g., `bookingDate`, `status`), which will impact performance as the dataset grows.
- **Soft Deletes:** There is no mechanism for soft deletes (e.g., a `deletedAt` column). Deleting a record currently removes it permanently, which is risky for audit trails.

## 5. Third-Party Integrations

The application integrates with several external services for notifications and payments.

### 5.1 Strengths
- **Multi-Provider Notifications:** Supports both Twilio and MSG91 for SMS and WhatsApp notifications (`server/_core/notification.ts`).
- **Payment Gateway:** Integrates Razorpay for handling deposits on large bookings.

### 5.2 Missing Components & Improvements
- **Webhook Security:** The webhook endpoints (e.g., for Razorpay or Zomato) need robust signature verification to prevent spoofing.
- **Fallback Mechanisms:** If MSG91 fails, the system falls back to Twilio, but if both fail, the error is only logged. A dead-letter queue for failed notifications should be implemented.

## 6. Actionable Recommendations

To elevate the `tablebook-app` to a production-ready state, the following actions are recommended:

| Priority | Category | Action Item |
| :--- | :--- | :--- |
| **High** | Testing | Replace synthetic tests in `__tests__/integration.10-10.test.ts` with real integration tests against a test database. |
| **High** | Type Safety | Resolve the TypeScript errors listed in `tsc-errors.txt` to ensure the Drizzle ORM queries match the schema. |
| **Medium** | Offline Sync | Implement conflict resolution in `lib/offlineSync.ts` to handle double-booking scenarios when coming back online. |
| **Medium** | Database | Add indexes to frequently queried columns in `drizzle/schema.ts` and implement soft deletes. |
| **Medium** | Security | Enforce Role-Based Access Control (RBAC) on all sensitive tRPC routes and verify webhook signatures. |
| **Low** | Frontend | Add a global React Error Boundary in `app/_layout.tsx` to prevent app crashes from unhandled exceptions. |

## 7. Conclusion

The `tablebook-app` is a well-structured project with a strong technological foundation. By addressing the identified gaps in testing, type safety, and offline synchronization, the application will achieve the reliability and robustness required for a commercial restaurant management system.
