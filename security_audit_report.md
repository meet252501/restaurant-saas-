# Security Audit & Vulnerability Report: TableBook

I have performed an autonomous "Shannon" style security audit of your codebase. Below are the discovered vulnerabilities and recommended fixes.

## 🔴 Critical Vulnerabilities

### 1. Massive Data Exposure (IDOR in Bookings)
- **Location**: `server/bookingRouter.ts` (Procedures: `listByDate`, `getById`, `updateStatus`)
- **Type**: Insecure Direct Object Reference (IDOR)
- **Description**: These procedures are marked as `publicProcedure` and do not verify the requester's identity. 
- **Impact**: 
    - **Privacy Breach**: Any person can download the full guest list (names, phone numbers) of *any* restaurant.
    - **Business Sabotage**: Competitors can cancel all bookings of a rival restaurant via the `updateStatus` endpoint.
- **Fix**: Convert to `protectedProcedure` or `adminProcedure` and enforce `where(eq(bookings.restaurantId, ctx.user.restaurantId))`.

### 2. Cross-Tenant Data Leak (IDOR in Analytics)
- **Location**: `server/analyticsRouter_enhanced.ts` (All procedures)
- **Type**: Broken Access Control / Cross-Tenant Leak
- **Description**: Procedures like `todayKPIs` and `thirtyDayTrends` use `input.restaurantId` instead of `ctx.user.restaurantId`.
- **Impact**: Any logged-in staff member from any restaurant can view the revenue, top customers, and performance metrics of *any other* restaurant on the platform.
- **Fix**: Ignore `input.restaurantId` and force the use of `ctx.user.restaurantId` in all queries.

### 3. Staff-Side IDOR (Table/Booking Manipulation)
- **Location**: `server/staffRouter.ts` (Procedures: `updateTableStatus`, `checkInCustomer`, `checkOutCustomer`, `markNoShow`)
- **Type**: Broken Access Control
- **Description**: These procedures only use the resource ID (e.g., `tableId`, `bookingId`) in the database `where` clause without verifying that the resource belongs to the logged-in staff member's restaurant.
- **Impact**: A malicious competitor with a staff account can sabotage other restaurants by blocking their tables or marking active bookings as "cancelled" or "no_show".
- **Fix**: Add `eq(tables.restaurantId, ctx.user.restaurantId)` and `eq(bookings.restaurantId, ctx.user.restaurantId)` to the `where` clauses.

### 4. Unauthenticated PIN Change (Authentication Bypass)
- **Location**: `server/routers.ts` (Procedure: `auth.changePin`)
- **Type**: Broken Access Control
- **Description**: The `changePin` mutation is a `publicProcedure`. This means an attacker doesn't need to be logged in to change a staff member's PIN. They only need to guess a 4-digit PIN (1 in 10,000 chance) to overwrite it.
- **Impact**: An attacker could lock out all staff or change the Manager's PIN to gain full admin access.
- **Fix**: Move `changePin` to `protectedProcedure` and ensure it only changes the *currently logged-in* user's PIN.

## 🟡 High-Priority Vulnerabilities

### 2. Dependency Security Risk
- **Location**: `package.json`
- **Description**: `npm audit` identified 51 vulnerabilities. Several are **High Severity**:
    - `undici`: Resource exhaustion in Node.js Fetch API.
    - `tar`: Arbitrary file write via path traversal.
    - `rollup`: Arbitrary file write.
- **Fix**: Run `npm update` and `npm audit fix` to patch infrastructure dependencies.

### 3. PIN Brute-Force Opportunity
- **Location**: `server/routers.ts` (Procedure: `auth.login`)
- **Description**: Your login relies on a 4-digit PIN. With 10,000 combinations, a script can brute-force this in minutes. While our new rate-limiter helps, a more targeted lockout (e.g., 5 failed attempts = 1 hour lockout for that specific user) is needed for commercial security.
- **Fix**: Implement a `failedLoginAttempts` counter in the `users` table.

## 🔵 Medium/Low-Priority Findings

### 4. Excessive Payload Limit
- **Location**: `server/_core/index.ts`
- **Description**: `express.json({ limit: "50mb" })` allows massive JSON payloads.
- **Impact**: Denial of Service (DoS) by exhausting server memory.
- **Fix**: Lower the limit to `500kb` for standard API requests.

### 5. Permissive CORS Policy
- **Location**: `server/_core/index.ts`
- **Description**: The server reflects any `Origin` header.
- **Impact**: Potential for cross-site attacks if a user visits a malicious site while logged into the dashboard.
- **Fix**: Restrict allowed origins to your production domains.

---

# Remediation Plan

I will now proceed to fix the **Critical Auth Bypass** and the **Excessive Payload Limit**. I will also update the dependencies to clear the High-Severity audits.
