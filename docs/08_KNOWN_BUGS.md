# IntelliStamp — Known Bugs & Technical Debt

**Version:** 1.0  
**Last Updated:** 2026-06-05

---

## Active Known Bugs

### BUG-001 — WhatsApp Campaign Delivered Count Always Zero

**Severity:** Medium  
**Area:** Campaign feature  
**Description:** The `delivered` field on the `campaigns` table is always `0`. The `total_sent` count reflects audience size, but no messages are actually dispatched. The feature is visually complete but non-functional.  
**Root cause:** WhatsApp Business API integration is not implemented. The `/api/campaign/send` route inserts a campaign record but does not call any external API.  
**Workaround:** None. Inform business owners that campaigns are "queued" until WhatsApp integration is live.  
**Fix:** Integrate Twilio WABA or Meta WABA (see Roadmap P0.1).

---

### BUG-002 — BarcodeDetector Unavailable on Firefox

**Severity:** Low  
**Area:** `/scanner` page  
**Description:** Firefox does not support the `BarcodeDetector` API. Users on Firefox see the "Your browser doesn't support..." fallback screen and must use the native camera app.  
**Root cause:** `BarcodeDetector` is a Chrome/Android-only API as of 2026. Not available on Firefox or Safari on iOS.  
**Workaround:** Fallback screen instructs users to open camera app and scan the QR code.  
**Fix:** No complete fix possible without a third-party library (e.g. `zxing-js`). Adding `zxing-js` would provide cross-browser support but adds ~100KB to the bundle.

---

### BUG-003 — Redemption Flow Lacks Staff Confirmation

**Severity:** Medium  
**Area:** `/redeem/[bizId]` page  
**Description:** The redemption page exists and increments `cards_redeemed`, but there is no staff-side confirmation step. A customer could theoretically self-redeem without staff knowledge.  
**Root cause:** Redemption UX was not fully designed. The page exists to unblock the core flow but the staff-facing confirmation is missing.  
**Fix:** Add staff PIN confirmation to the redemption page (see Roadmap P0.3).

---

### BUG-004 — Single Business Per Owner Account

**Severity:** Medium  
**Area:** Dashboard / Business creation  
**Description:** Each Supabase auth account can only manage one business. If a business already exists for `owner_id`, the dashboard shows it; there is no way to create a second business.  
**Root cause:** Architectural decision — dashboard fetches business by `ownerId` and assumes one result. No multi-business UI exists.  
**Workaround:** Create a second Supabase auth account for a second business.  
**Fix:** Multi-business support (see Roadmap P0.2).

---

### BUG-005 — No Undo for Accidental Stamps

**Severity:** Low  
**Area:** Stamp issuance  
**Description:** Once a stamp is issued, there is no mechanism to reverse it. Staff errors result in a permanent extra stamp on the customer's card.  
**Root cause:** Stamps table is append-only (intentional audit trail). No delete or undo endpoint exists.  
**Fix:** Add time-windowed undo (within 5 minutes of issuance) — see Roadmap P0.4.

---

### BUG-006 — Cooldown Timer Not Shown to Customer

**Severity:** Low  
**Area:** `/scan/[bizId]` page  
**Description:** When a customer scans within the 4-hour cooldown window, the 429 error is shown, but the UI does not clearly display how long they must wait. The `cooldown_remaining_hours` value is returned by the API but may not be prominently surfaced in the UI.  
**Workaround:** The error text includes remaining hours.

---

### BUG-007 — `otp_store` Table Populated But Unused

**Severity:** Info  
**Area:** Auth / Database  
**Description:** The `otp_store` table exists and the `/api/auth/verify` route still reads/writes it, but the OTP verification flow is not used in any active page. The table may accumulate stale rows.  
**Root cause:** OTP-based customer auth was removed. The API route was retained for legacy compatibility.  
**Fix:** Drop `otp_store` table and delete `/api/auth/verify` route once confirmed unused.

---

## Recently Fixed Bugs

### FIXED-001 — Scan QR Button Auto-Stamped Wrong Business *(Fixed 2026-06-04)*

**Severity:** Critical  
**Description:** The "Scan QR to Stamp" button on `/card/[customerToken]` navigated to `/scan/[bizId]`. The scan page auto-stamps when a `localStorage` session exists. This caused stamps to be issued to the current card's business without any physical QR scan, and potentially to a different business than the one the customer was visiting.  
**Fix:** Changed button destination from `/scan/${bizId}` to `/scanner`. All stamps now require a physical QR scan.  
**Files:** `src/app/(customer)/card/[customerToken]/page.tsx`

---

### FIXED-002 — `/cards` Page Had No User Flow for New Visitors *(Fixed 2026-06-04)*

**Severity:** High  
**Description:** When a customer navigated to `/cards` with no `localStorage` session (first visit or cleared browser), the page loaded a blank state with no way to identify themselves and view their cards.  
**Fix:** Added a phone identification screen as the first state. Customers enter their phone number to look up their loyalty cards.  
**Files:** `src/app/(customer)/cards/page.tsx`

---

### FIXED-003 — Dashboard 404 Showed Error to New Owners *(Fixed 2026-06-04)*

**Severity:** Medium  
**Description:** A newly-signed-up business owner who hadn't completed onboarding would see a 404 or error state on `/dashboard` because no business existed for their `owner_id`.  
**Fix:** When `/api/business/get` returns 404, dashboard auto-redirects to `/onboarding`.  
**Files:** `src/app/(business)/dashboard/page.tsx`

---

### FIXED-004 — GMB Link Not Editable After Onboarding *(Fixed 2026-06-04)*

**Severity:** Medium  
**Description:** The Google Maps review link (`gmb_link`) could be set during onboarding but had no edit UI in the dashboard. Businesses that skipped it or needed to update it had no way to do so.  
**Fix:** Added GMB link editor modal to the dashboard Settings tab. Calls `PATCH /api/business/update`.  
**Files:** `src/app/(business)/dashboard/page.tsx`, `src/app/api/business/update/route.ts`

---

## Technical Debt

### DEBT-001 — No Structured Error Monitoring

**Impact:** Production errors are invisible unless a user reports them.  
**Current state:** `console.error()` in API routes only. No aggregation, alerting, or stack traces in production.  
**Recommended fix:** Add Sentry (`@sentry/nextjs`). Estimated 2 hours to integrate.

---

### DEBT-002 — No Database Migration System

**Impact:** Schema changes are applied manually and are hard to track. Risk of prod/dev schema drift.  
**Current state:** Single `schema.sql` file applied manually via Supabase SQL Editor.  
**Recommended fix:** Adopt a migration runner (Supabase CLI with `supabase db push`, or `goose`/`sqitch`).

---

### DEBT-003 — Dashboard Loads All Customers at Once

**Impact:** Slow dashboard load for businesses with >500 customers.  
**Current state:** `GET /api/business/get` fetches all customers, all stamps, and all stats in one response.  
**Recommended fix:** Add server-side pagination to the customer list. Fetch stats separately.

---

### DEBT-004 — No Test Suite

**Impact:** Regressions are caught manually or by users.  
**Current state:** No unit tests, integration tests, or E2E tests.  
**Recommended fix:**
- Unit tests: Vitest for `src/lib/token.ts`, `src/lib/utils.ts`, validators
- Integration tests: Playwright for critical paths (signup → create business → scan → stamp → redeem)

---

### DEBT-005 — Supabase Middleware Placeholder

**Impact:** `src/lib/supabase/middleware.ts` exports an empty `updateSession` function. The actual session refresh is handled by `proxy.ts` directly.  
**Current state:** Dead code. The file exists but does nothing.  
**Recommended fix:** Either implement proper session refresh in the middleware or delete the file.

---

### DEBT-006 — Hard-Coded Indian Phone Number Validation

**Impact:** The product cannot expand internationally without a code change.  
**Current state:** All phone validation uses `^[6-9]\d{9}$` (Indian mobile format). This is in Zod schemas and UI labels.  
**Recommended fix:** Parameterise country/format. In the short term, document the constraint clearly.

---

### DEBT-007 — No Connection Pooling

**Impact:** Under high load, Supabase may reject connections due to the limit on the free/starter plan (20–60 direct connections).  
**Current state:** Every API request creates a fresh Supabase client with a direct connection.  
**Recommended fix:** Enable Supabase Pooler (Transaction mode) in production.
