# IntelliStamp — Architecture Decision Log

**Version:** 1.0  
**Last Updated:** 2026-06-05

---

This document records significant architectural and product decisions, why they were made, and what alternatives were considered. Decisions are listed in reverse chronological order.

---

## ADR-010 — "Scan QR to Stamp" Opens Camera Scanner, Not Scan Page

**Date:** 2026-06-04  
**Status:** Accepted

**Context:**  
The `/card/[customerToken]` detail page had a "Scan QR to Stamp" button that navigated to `/scan/[bizId]` with the current business's ID. The `/scan` page auto-stamps when a `localStorage` session exists. This caused stamps to be issued silently, without a physical QR scan, and to the wrong business if the customer opened the wrong card.

**Decision:**  
Changed the button destination to `/scanner`. All stamps require a physical QR scan regardless of whether a `localStorage` session exists.

**Consequences:**
- Eliminates the cross-business stamp bug
- Every stamp requires physical presence at a business
- Slightly more friction for repeat customers (must scan QR, not just tap button)

---

## ADR-009 — In-App QR Scanner Using BarcodeDetector API

**Date:** 2026-06-04  
**Status:** Accepted

**Context:**  
Customers needed an in-app way to scan QR codes. Relying on the native camera app works but breaks the web app experience. `BarcodeDetector` is a native browser API with no bundle size cost.

**Decision:**  
Built `/scanner` using the `BarcodeDetector` browser API with `getUserMedia` for camera access. Added a fallback screen for Firefox and older browsers.

**Alternatives considered:**
- `zxing-js` — cross-browser but adds ~100KB to bundle
- Native camera app — no bundle cost but exits the web app context

**Consequences:**
- Zero bundle size cost
- Does not work on Firefox or older Safari (shown fallback instructions)
- Will work on all modern Android browsers and Chrome on iOS

---

## ADR-008 — RLS Policy: "Owner Access Only" on Businesses Table

**Date:** 2026-06-04  
**Status:** Accepted

**Context:**  
The `businesses` table had an "Allow all" RLS policy (matching all other tables). This was a security risk — any authenticated user could read any business record via the anon key.

**Decision:**  
Changed to `owner_id = auth.uid()` policy on `businesses`. All other tables retain "Allow all" policies as they are only accessed server-side via the service role key.

**Consequences:**
- Direct anon-key reads of `businesses` are restricted to the owning user
- API routes are unaffected (service role key bypasses RLS)
- Marginally more secure if the anon key is ever used client-side for business reads

---

## ADR-007 — Customer Identity via Phone + localStorage (No Auth)

**Date:** Pre-launch  
**Status:** Accepted

**Context:**  
Customers need to be identified across businesses and sessions. Options were: email/password auth, SMS OTP, or phone + localStorage.

**Decision:**  
Phone number as the primary identifier, stored in `localStorage` after first entry. No auth required.

**Rationale:**
- Zero friction: no account creation, no password, no email
- Phone number is already known to the business
- `localStorage` persists across sessions on the same device
- The OTP flow was attempted (see `otp_store` table and `/api/auth/verify`) but removed as overly complex for the use case

**Consequences:**
- No identity verification — a user can claim any phone number
- Stamps are to phone numbers, not verified identities
- Clearing browser localStorage loses the session (customer must re-enter phone)
- Known limitation: not suitable for high-fraud scenarios

---

## ADR-006 — Stamps Table as Append-Only Audit Log

**Date:** Pre-launch  
**Status:** Accepted

**Context:**  
Stamp count could be stored as a counter (integer column) or as individual records.

**Decision:**  
Individual records in an append-only `stamps` table. `cards_completed = floor(COUNT(*) / stamps_required)`.

**Rationale:**
- Full audit trail for every stamp event
- Can derive any aggregate (current cycle, lifetime count, daily stamps) from the log
- Cannot be manipulated by editing a single column

**Consequences:**
- More storage than a counter
- Slightly more complex queries (COUNT instead of SELECT)
- No DELETE or UPDATE on stamps — any undo must be handled at the application level

---

## ADR-005 — Dynamic QR Token: djb2 Hash, 30-Second Window

**Date:** Pre-launch  
**Status:** Accepted

**Context:**  
QR replay fraud is a risk — a customer screenshots the QR and shares it. A static QR code is trivially shareable.

**Decision:**  
Token = `base36(djb2(bizId + "IS2024" + window)).slice(0,6).toUpperCase()`, where `window = Math.floor(Date.now() / 30000)`. Server accepts `window` and `window - 1`.

**Rationale:**
- Stateless — no DB lookup to generate or validate a token
- 30-second window is short enough to prevent sharing but long enough to handle clock skew
- `djb2` is fast and simple
- "IS2024" salt prevents trivial token prediction if the algorithm is known

**Consequences:**
- Tokens are not cryptographically strong — a motivated attacker who knows the algorithm could predict them
- Clock skew of >60 seconds would cause valid scans to fail (rare in practice)
- The `dynamic_qr_enabled` flag can disable this check entirely for businesses that don't need it

---

## ADR-004 — Supabase Auth Helpers for Session Management (Not Custom JWT)

**Date:** Pre-launch  
**Status:** Accepted

**Context:**  
Business owner sessions need to persist across page loads and be readable server-side for route protection.

**Decision:**  
Use `@supabase/auth-helpers-nextjs` v0.15.0 for session management. Sessions stored in HTTP-only cookies. `proxy.ts` reads the cookie to protect `/dashboard` and `/onboarding`.

**Consequences:**
- Session storage is handled by the library (no custom JWT implementation)
- HTTP-only cookies prevent XSS-based session theft
- The library is a wrapper over `@supabase/ssr` — API may differ from community examples

---

## ADR-003 — All API Routes Use Service Role Key (Bypass RLS)

**Date:** Pre-launch  
**Status:** Accepted

**Context:**  
API routes need to read and write across all tables, including `businesses` (which has an owner-scoped RLS policy).

**Decision:**  
All API routes (`src/app/api/**`) use `SUPABASE_SERVICE_ROLE_KEY`. This bypasses all RLS policies entirely. RLS policies are a safety net for direct client access only.

**Rationale:**
- Simpler server-side logic — no need to forward user sessions to server clients
- All access control happens at the API route level (Zod validation, PIN checks, token checks)
- Keeps the API layer as the single trust boundary

**Consequences:**
- If a service role key is leaked, it grants full DB access
- The key must never appear in client-side code or be exposed in browser network requests
- API routes are responsible for all access control — no defence-in-depth at the DB layer

---

## ADR-002 — Next.js App Router with No Edge Runtime

**Date:** Pre-launch  
**Status:** Accepted

**Context:**  
Next.js 16 supports App Router and Edge Runtime. Edge functions have lower latency but limited Node.js compatibility (no full `crypto`, no `Buffer`, etc.).

**Decision:**  
All routes use Node.js runtime. No Edge Runtime used.

**Rationale:**
- `@supabase/supabase-js` is not fully compatible with Edge Runtime in all versions
- The timing-safe PIN comparison uses `crypto.timingSafeEqual` (Node.js `Buffer` API)
- Complexity not justified at current scale

---

## ADR-001 — Single Supabase Project for Auth + Database

**Date:** Pre-launch  
**Status:** Accepted

**Context:**  
Supabase can be used for Auth only, Database only, or both together.

**Decision:**  
Single Supabase project handles both Auth (email/password for business owners) and the PostgreSQL database.

**Rationale:**
- Simpler configuration — one URL, two keys
- Supabase Auth has native `admin.createUser` with `email_confirm: true` (useful for instant signup)
- `auth.uid()` is available directly in RLS policies

**Consequences:**
- Both systems go down together if the Supabase project has an outage
- Migrating to a different auth provider requires decoupling two systems
