# 2026-06-16: Performance fixes and mobile-number recovery

Two separate pieces of work landed on the same day. They are independent of each other.

---

## Section 1: Performance fixes

### 1a. Region mismatch — serverless functions pinned to Singapore

**Problem.** Vercel deploys serverless functions to `iad1` (US East, Virginia) by default.
The Supabase project sits in `ap-southeast-1` (Singapore). Every database call was crossing
the Pacific, adding roughly 150–250 ms of unnecessary round-trip latency to each request.

**Fix.** `vercel.json` now pins all functions to `sin1` (Singapore).

```json
{
  "regions": ["sin1"]
}
```

**File changed:** `vercel.json` (commit `d676596`)

---

### 1b. Supabase client hoisted to module scope across all API routes

**Problem.** Every route handler was calling `createClient(url, key)` at the top of the
`POST`/`GET` function body. In a warm serverless function instance (which is reused across
many requests), this meant the client — including its internal HTTP agent and connection
pool — was re-created on every single request.

**Fix.** `const supabase = createClient(...)` moved to module scope in all 16 affected
route files. It now runs once when the module is first loaded and is reused for all
subsequent requests on that warm instance.

The one exception to the pattern is `src/app/api/business/create/route.ts`, which uses
two clients: a service-role `createClient` (hoisted) and a per-request `createServerClient`
from `@supabase/auth-helpers-nextjs` that requires the live `cookies()` store and must
stay inside the handler.

**Files changed** (commit `74037eb`):

| File | Change |
|---|---|
| `src/app/api/auth/signup/route.ts` | Hoisted |
| `src/app/api/auth/verify/route.ts` | Hoisted |
| `src/app/api/business/create/route.ts` | Hoisted service-role client; `createServerClient` stays in handler |
| `src/app/api/business/export-customers/route.ts` | Hoisted |
| `src/app/api/business/get/route.ts` | Hoisted |
| `src/app/api/campaign/send/route.ts` | Hoisted |
| `src/app/api/customer/by-token/route.ts` | Hoisted |
| `src/app/api/customer/identify/route.ts` | Hoisted |
| `src/app/api/customer/profile/route.ts` | Hoisted (two handlers, `GET` and `PATCH`, now share one module-level client) |
| `src/app/api/kiosk/review-bonus/route.ts` | Hoisted |
| `src/app/api/kiosk/stamp/route.ts` | Hoisted + parallelized (see 1c) |
| `src/app/api/milestones/[bizId]/route.ts` | Hoisted |
| `src/app/api/milestones/customer/[customerId]/[bizId]/route.ts` | Hoisted |
| `src/app/api/milestones/save/route.ts` | Hoisted |
| `src/app/api/stamp/issue/route.ts` | Hoisted + parallelized (see 1c) |
| `src/app/api/stamp/redeem/route.ts` | Hoisted |

---

### 1c. Independent DB reads parallelized in hot-path routes

**Problem.** The two routes that run on every stamp event (`kiosk/stamp` and `stamp/issue`)
were executing all database queries sequentially even when later queries had no dependency
on earlier results. At 8–10 ms per round trip (within the Singapore region) this was
acceptable, but unnecessary.

**Fix.** Independent fetches wrapped in `Promise.all`. Genuinely dependent steps
(cooldown check, stamp insert, stamp count after insert) remain sequential since they each
depend on the result of the previous one.

**`src/app/api/kiosk/stamp/route.ts`** — two `Promise.all` groups:

1. Business fetch and customer-by-phone fetch run in parallel (neither depends on the other).
2. After the stamp has been inserted and counted: milestone eligibility check,
   prior milestone claims query, and `business_customers.review_claimed` lookup all run
   in parallel.

**`src/app/api/stamp/issue/route.ts`** — one `Promise.all` group:

1. Business fetch and most-recent-stamp fetch (for cooldown) run in parallel. Token/PIN
   validation that previously gated the cooldown lookup now happens after both resolve.

---

### 1d. Database indexes and RLS policy fix

**Problem.** Several foreign-key columns (`stamps.business_id`, `campaigns.business_id`,
`milestone_claims.business_id`, `milestone_claims.milestone_id`,
`business_customers.customer_id`) had no explicit index, causing sequential scans on those
columns. Additionally, the RLS policy on `businesses` was defined as
`USING (owner_id = auth.uid())`, which causes Postgres to re-evaluate `auth.uid()` and
`auth.role()` for every row scanned rather than once per query.

**Fix.** Indexes added with `CREATE INDEX IF NOT EXISTS` on each column above. The
`businesses` RLS policy was rewritten to wrap `auth.uid()` in a subquery so it is
evaluated once per statement.

**Migration SQL:** applied directly in the Supabase SQL editor (not tracked as a file in
this repo). The exact SQL was not captured here at the time; retrieve it from the Supabase
dashboard → Database → Migrations or SQL editor history.

<!-- TODO: paste the exact applied SQL here once retrieved from Supabase dashboard -->

**What to know before touching this area:**
- `schema.sql` in the repo root is the idempotent baseline; it does not contain the
  incremental index migration above.
- If you ever re-run `schema.sql` from scratch, add the missing indexes back manually.

---

## Section 2: Mobile-number recovery and staff lookup

### Feature summary

Customers can now recover their loyalty card after clearing browser storage (or switching
devices) by entering the phone number they enrolled with. Staff can look up a customer by
phone number from the business dashboard and issue a stamp without needing the QR code or
the customer's device.

The existing QR/token/browser session flow is completely unchanged. All new code is
additive.

---

### Key architectural fact

`customers.phone` is **globally unique across the entire system** — one phone number maps
to exactly one `customers` row regardless of how many businesses that customer has visited.
Customer identity (name, phone, `customer_token`) lives on the `customers` table and is
shared across businesses.

Per-business enrollment and loyalty progress are scoped through `business_customers`
(the join table): `(business_id, customer_id)` unique pair. Stamps and milestone claims
are also filtered by `business_id`.

No new column was added. The existing `phone` column on `customers` is the identity anchor
for all mobile-number lookups.

---

### Security model

Both new API endpoints enforce the same rule: **a `business_customers` row must exist for
the specific `business_id` before any customer data is returned.** A phone enrolled with
Business A will return `{ found: false }` when looked up from Business B's context until
the customer actually enrolls with Business B. The two not-found cases (phone doesn't exist
at all, phone exists but not linked to this business) produce identical responses so neither
leaks information about cross-business enrollment.

`/api/business/customer-lookup` additionally requires an authenticated owner session. The
`business_id` in the request body is always re-validated against `session.user.id` via a
join on `businesses.owner_id` before any customer data is accessed, preventing a logged-in
owner from querying another owner's business.

---

### Files added or modified (commit `8f6e94b`)

**New files:**

| File | Role |
|---|---|
| `src/lib/phone.ts` | `normalizeIndianPhone(raw)` — strips country/trunk prefixes, validates 10-digit Indian mobile pattern (starts 6–9), returns normalized 10-digit string or `null` |
| `src/lib/__tests__/phone.test.ts` | 11 unit tests covering bare 10-digit, `+91`/`91`/`091`/`0091`/`09` prefixes, whitespace, invalid leading digit, too-short input, and `isValidIndianPhone` |
| `src/app/api/customer/recover/route.ts` | `POST /api/customer/recover` — customer self-service recovery; takes `{ business_id, phone }`, returns `{ found, customer? }` with no distinction between "phone not found" and "phone found but not enrolled here" |
| `src/app/api/business/customer-lookup/route.ts` | `POST /api/business/customer-lookup` — staff lookup; session-authenticated, validates business ownership, returns customer details + card state + reward + last visit date |
| `src/app/(customer)/recover/[bizId]/page.tsx` | Customer-facing "Recover my card" page at `/recover/[bizId]`; on success restores `customer_session` in localStorage and redirects to the existing `/card/[customerToken]` page |
| `src/components/business/CustomerLookup.tsx` | Staff-facing "Find customer by mobile number" UI component; renders inside the Customers tab; "Issue Stamp" button calls the existing `/api/kiosk/stamp` endpoint (same code path as the kiosk flow, not a new implementation) |

**Modified files:**

| File | Change |
|---|---|
| `src/lib/validators.ts` | Added `customerRecoverSchema` and `customerLookupSchema` (Zod) |
| `src/app/(customer)/scan/[bizId]/page.tsx` | Added "Already enrolled? Recover my card" link below the Continue button in the login flow state |
| `src/app/(business)/dashboard/page.tsx` | Imported `CustomerLookup` and mounted it at the top of the Customers tab, passing `businessId`, `stampsRequired`, `staffPin`, and an `onStamped` callback that refreshes the customer list |

---

### Product caveat: staff-only access is owner-gated for now

The "Find customer by mobile number" UI (`CustomerLookup`) lives inside the
owner-authenticated business dashboard. It is not accessible from the public PIN-only
kiosk page (`/kiosk/[businessSlug]`). Non-owner staff who only have the staff PIN and
access to the kiosk URL cannot use the phone lookup yet. This is an intentional scope
decision, not an oversight — extending it to the kiosk flow would require either surfacing
the staff PIN entry UI there or adding a separate staff auth mechanism.

---

### Things to know before touching this area

- Phone normalization (`src/lib/phone.ts`) is currently only used by the two new API routes.
  The existing `customer/identify` and `kiosk/stamp` routes store whatever phone string
  they receive (no normalization). If you add normalization to those routes, test that
  existing customers whose phones were stored without normalization still match — the
  `customers.phone` unique constraint will handle de-duplication going forward, but stored
  values from before may vary in format.
- The `UNIQUE` constraint on `customers.phone` already creates an implicit btree index in
  Postgres; no separate index was needed for the new lookup paths.
- `business_customers` has a composite unique on `(business_id, customer_id)`. Existing
  stamp routes use `upsert(..., { onConflict: 'business_id,customer_id', ignoreDuplicates: true })`
  so same-phone second-business enrollment already creates a new link without duplicating
  the `customers` row.
