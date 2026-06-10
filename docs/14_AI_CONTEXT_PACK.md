# IntelliStamp — AI Coding Assistant Context Pack

**Version:** 1.0  
**Last Updated:** 2026-06-05  
**Purpose:** This document is the single source of truth for any AI coding assistant (Claude, Copilot, Cursor, etc.) working on the IntelliStamp codebase. Read this before writing any code.

---

## What IntelliStamp Is

A digital loyalty stamp platform for local businesses. Businesses display a rotating QR code; customers scan to earn stamps; rewards issue automatically. Web-only. No app install required.

**Deployed at:** Vercel  
**Stack:** Next.js 16.2.6 + TypeScript + Tailwind CSS + Supabase (PostgreSQL + Auth)

---

## Critical: Next.js Version Differences

This project uses **Next.js 16.2.6**, which has breaking changes from Next.js 13/14/15:

- Route params are `Promise<{ param: string }>` — must be awaited:
  ```typescript
  export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
  }
  ```
- `cookies()` from `next/headers` returns a `Promise` — must be awaited:
  ```typescript
  const cookieStore = await cookies()
  ```
- Middleware file is `proxy.ts` (not `middleware.ts`) — this is project-specific, not a Next.js change
- The `next/docs/` folder in node_modules contains accurate version-specific documentation

Do not assume behaviour from training data for Next.js 13/14/15. When in doubt, check `node_modules/next/dist/docs/`.

---

## Project Structure (Critical Files)

```
src/
├── app/
│   ├── (auth)/login/page.tsx          # Business owner login
│   ├── (auth)/signup/page.tsx         # Business owner signup
│   ├── (business)/dashboard/page.tsx  # Main business dashboard
│   ├── (business)/onboarding/page.tsx # Business setup wizard
│   ├── (customer)/card/[customerToken]/page.tsx  # Individual loyalty card
│   ├── (customer)/cards/page.tsx      # All cards for a customer
│   ├── (customer)/scan/[bizId]/page.tsx # QR scan + stamp flow
│   ├── (customer)/scanner/page.tsx    # In-app camera QR scanner
│   ├── api/auth/signup/route.ts
│   ├── api/business/{create,get,update,export-customers}/route.ts
│   ├── api/customer/{identify,profile,by-token}/route.ts
│   ├── api/stamp/{issue,redeem}/route.ts
│   ├── api/kiosk/{stamp,review-bonus}/route.ts
│   ├── api/milestones/[bizId]/route.ts
│   ├── api/milestones/customer/[customerId]/[bizId]/route.ts
│   ├── api/milestones/save/route.ts
│   ├── api/campaign/send/route.ts
│   ├── kiosk/[businessSlug]/page.tsx  # Kiosk mode page
│   └── redeem/[bizId]/page.tsx        # Reward redemption
├── components/
│   ├── business/QRDisplay.tsx         # QR token generator + canvas display
│   ├── business/KioskMode.tsx         # Fullscreen kiosk
│   ├── business/CustomerTable.tsx     # Customer list + CSV export
│   ├── business/RewardsTab.tsx        # Milestone config UI
│   ├── business/FeatureToggles.tsx    # Toggle settings
│   ├── business/StatsCard.tsx         # Stats display
│   └── customer/StampCard.tsx         # Customer loyalty card view
├── lib/
│   ├── supabase/client.ts             # Browser Supabase client (anon key)
│   ├── supabase/server.ts             # Server Supabase client (SERVICE ROLE KEY)
│   ├── token.ts                       # QR token generation + validation
│   ├── utils.ts                       # cn(), calculateCardState(), formatPhone()
│   └── validators.ts                  # All Zod schemas
├── types/index.ts                     # All TypeScript interfaces
└── proxy.ts                           # Route protection middleware
```

---

## Supabase Clients — Which to Use Where

| Context | File | Key | Use For |
|---|---|---|---|
| API routes (`/api/**`) | `src/lib/supabase/server.ts` | SERVICE_ROLE_KEY | All DB operations in API routes |
| Browser components | `src/lib/supabase/client.ts` | ANON_KEY | Auth state only |
| Route protection | `proxy.ts` via `createServerClient` | ANON_KEY | Session check only |

**Never use the service role client in browser components.** The service role key is server-only.

```typescript
// In API routes:
import { createClient } from '@/lib/supabase/server'
const supabase = createClient()

// In browser components (auth only):
import { createBrowserClient } from '@supabase/auth-helpers-nextjs'
const supabase = createBrowserClient(url, anonKey)
```

---

## Database Tables Quick Reference

| Table | Primary Key | Key Columns |
|---|---|---|
| `businesses` | `id` (uuid) | `owner_id`, `slug`, `staff_pin`, `stamps_required`, `plan` |
| `customers` | `id` (uuid) | `phone` (unique), `customer_token` (unique uuid) |
| `stamps` | `id` (uuid) | `customer_id`, `business_id`, `type`, `stamped_at` |
| `business_customers` | `id` (uuid) | `business_id`, `customer_id`, `cards_redeemed`, `review_claimed` |
| `milestones` | `id` (uuid) | `business_id`, `visit_number`, `badge`, `reward`, `is_active` |
| `milestone_claims` | `id` (uuid) | `customer_id`, `business_id`, `milestone_id` |
| `campaigns` | `id` (uuid) | `business_id`, `message`, `audience`, `total_sent` |

**Key derived calculations:**
```
total_stamps    = COUNT(stamps) WHERE customer_id AND business_id
card_stamps     = total_stamps % stamps_required          // current cycle position
cards_completed = floor(total_stamps / stamps_required)   // lifetime completed cards
redeemable      = cards_completed > cards_redeemed        // can claim reward
```

---

## QR Token Algorithm

```typescript
// In src/lib/token.ts
function djb2(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
  }
  return hash >>> 0
}

function generateToken(bizId: string, offset = 0): string {
  const window = Math.floor(Date.now() / 30000) + offset
  const hash = djb2(`${bizId}-IS2024-${window}`)
  return hash.toString(36).slice(0, 6).toUpperCase()
}

// Server validation — accepts current and previous window
function validateToken(bizId: string, token: string): boolean {
  return token === generateToken(bizId, 0) || token === generateToken(bizId, -1)
}
```

---

## Stamp Issuance Flow (What `/api/stamp/issue` Does)

1. Fetch business by `business_id`
2. If `dynamic_qr_enabled`: validate token (current or previous 30s window) → 400 if invalid
3. If `staff_pin_enabled`: timing-safe PIN compare → 401 if wrong
4. Check last stamp timestamp for this customer+business → 429 if < 4 hours ago
5. UPSERT `business_customers` (auto-enrol if first visit)
6. INSERT into `stamps`
7. COUNT all stamps → derive `card_stamps`, `cards_completed`, `stamp_complete`
8. Fetch eligible unclaimed milestones
9. Resolve conflict (stamp vs. milestone) based on `conflict_priority`
10. Return `{ success, stamp, card_state, reward_result }`

---

## Customer Identity Model

Customers are NOT auth users. They are identified by:
- **Phone number** (server-side primary key in `customers.phone`)
- **`customer_token`** (UUID, used in URLs — `/card/[token]`)
- **`localStorage`** key `customer_session` stores `{ id, phone, customer_token, name }`

`localStorage` is cleared when a customer clears browser data. Their DB record is preserved. They can re-identify by entering their phone number on `/cards`.

---

## Validation Patterns (Zod v4)

```typescript
import { z } from 'zod'

// Phone: 10-digit Indian mobile
z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')

// Staff PIN
z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits')

// GMB link (optional)
z.string().url('Enter a valid URL').optional().or(z.literal(''))

// UUID
z.string().uuid('Invalid ID format')

// Access first error:
result.error.issues[0].message  // NOT result.error.message
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=         # Browser-safe
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Browser-safe
SUPABASE_SERVICE_ROLE_KEY=        # SERVER ONLY — never in client components
NEXT_PUBLIC_APP_URL=              # Optional — base URL for QR codes
```

---

## Common Patterns

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({ ... })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    }
    const supabase = createClient()
    // ... business logic
    return NextResponse.json({ success: true, ... })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
```

### Supabase Query Patterns

```typescript
// Single row — returns null if not found (use maybeSingle, not single)
const { data, error } = await supabase
  .from('businesses')
  .select('*')
  .eq('id', id)
  .maybeSingle()

// Count
const { count } = await supabase
  .from('stamps')
  .select('*', { count: 'exact', head: true })
  .eq('customer_id', customerId)
  .eq('business_id', businessId)

// Upsert
await supabase
  .from('business_customers')
  .upsert({ business_id: bizId, customer_id: custId }, { onConflict: 'business_id,customer_id' })
```

---

## HTTP Status Codes Used

| Code | When |
|---|---|
| 200 | Success |
| 400 | Validation error or bad input |
| 401 | Wrong PIN or expired session |
| 404 | Resource not found |
| 429 | Stamp cooldown active |
| 500 | Unexpected server error |

---

## What NOT to Do

- **Do not** use `single()` — use `maybeSingle()` to avoid errors on empty results
- **Do not** expose `SUPABASE_SERVICE_ROLE_KEY` in any component or client-side code
- **Do not** use `params.slug` directly in Next.js 16 — `await params` first
- **Do not** add `console.log` to production code — use `console.error` for errors only
- **Do not** add WhatsApp delivery code without a confirmed WABA provider — campaigns are record-only
- **Do not** modify the `stamps` table with UPDATE or DELETE — it is an append-only audit log
- **Do not** use `cookies()` synchronously — it returns a Promise in Next.js 16

---

## Styling Conventions

- Framework: Tailwind CSS v4
- Utility: `cn()` from `src/lib/utils.ts` (wraps `clsx` + `tailwind-merge`)
- Dark theme: `bg-zinc-950`, `bg-zinc-900`, `text-white`, `text-zinc-400`
- Primary button: `bg-white text-zinc-950 rounded-lg`
- Inputs: `bg-zinc-800 border border-zinc-700 text-white rounded-lg`
- Errors: `text-red-400`
- Icons: `lucide-react`

---

## Key Business Rules (Always Enforce)

1. **4-hour stamp cooldown** per `(customer_id, business_id)` — enforced in `/api/stamp/issue` and `/api/kiosk/stamp`
2. **QR tokens expire after 60 seconds** — server accepts current and previous 30s window
3. **Staff PIN is timing-safe** — use `crypto.timingSafeEqual` not `===`
4. **Review bonus is one-time** — `review_claimed` on `business_customers`; check before issuing
5. **`redeemable` = `cards_completed > cards_redeemed`** — never short-circuit this logic
6. **Milestone claims are once per milestone per customer** — `UNIQUE(customer_id, milestone_id)` in DB
