# IntelliStamp — Technical Requirements Document

**Version:** 1.0  
**Last Updated:** 2026-06-05

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.6 | Full-stack React framework (App Router) |
| React | 19.2.4 | UI rendering |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| `clsx` + `tailwind-merge` | latest | Dynamic classname composition |
| `qrcode` | 1.5.4 | QR code generation (canvas) |
| `lucide-react` | 1.17.0 | Icon library |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Next.js API Routes | 16.2.6 | REST API layer (no separate server) |
| Zod | 4.4.3 | Request schema validation |
| `@supabase/supabase-js` | 2.106.2 | Database client (service role) |
| `@supabase/auth-helpers-nextjs` | 0.15.0 | Auth session management (SSR/cookies) |

### Database

| Technology | Detail |
|---|---|
| Supabase (PostgreSQL) | Hosted Postgres with Row Level Security |
| `uuid-ossp` extension | UUID generation (`uuid_generate_v4()`) |
| RLS | Enabled on all tables |

### Authentication

| Layer | Method |
|---|---|
| Business owners | Supabase email/password Auth |
| Session storage | HTTP-only cookies (managed by `@supabase/auth-helpers-nextjs`) |
| Customers | Phone number → `localStorage` session (no auth) |
| Staff validation | 4-digit PIN checked server-side (timing-safe comparison) |

### Hosting

- **Platform:** Vercel (inferred from `next.config.ts` and deployment URL `intellistamp-inte.vercel.app`)
- **Edge Runtime:** Not used. All routes use Node.js runtime.

### External Services

| Service | Usage | Status |
|---|---|---|
| Supabase | Database + Auth | Active |
| Google Maps | Review link (external, user-provided URL) | Passive (no API key required) |
| WhatsApp Business API | Campaign delivery | Not yet integrated — campaigns logged only |

---

## Folder Structure

```
/home/user/Intellistamp/
├── docs/                          # Documentation (this folder)
├── public/                        # Static assets
├── schema.sql                     # Full database schema
├── src/
│   ├── app/                       # Next.js App Router pages + API routes
│   │   ├── (auth)/                # Route group: auth pages (no layout)
│   │   │   ├── login/page.tsx     # Business owner login
│   │   │   └── signup/page.tsx    # Business owner registration
│   │   ├── (business)/            # Route group: business-facing pages
│   │   │   ├── dashboard/page.tsx # Main business dashboard
│   │   │   └── onboarding/page.tsx# Business setup wizard
│   │   ├── (customer)/            # Route group: customer-facing pages
│   │   │   ├── card/[customerToken]/page.tsx  # Individual loyalty card
│   │   │   ├── cards/page.tsx     # All loyalty cards (phone lookup)
│   │   │   ├── scan/[bizId]/page.tsx # QR landing + stamp flow
│   │   │   └── scanner/page.tsx   # In-app camera QR scanner
│   │   ├── api/                   # REST API endpoints
│   │   │   ├── auth/
│   │   │   │   ├── signup/route.ts
│   │   │   │   └── verify/route.ts
│   │   │   ├── business/
│   │   │   │   ├── create/route.ts
│   │   │   │   ├── get/route.ts
│   │   │   │   ├── update/route.ts
│   │   │   │   └── export-customers/route.ts
│   │   │   ├── campaign/
│   │   │   │   └── send/route.ts
│   │   │   ├── customer/
│   │   │   │   ├── by-token/route.ts
│   │   │   │   ├── identify/route.ts
│   │   │   │   └── profile/route.ts
│   │   │   ├── kiosk/
│   │   │   │   ├── review-bonus/route.ts
│   │   │   │   └── stamp/route.ts
│   │   │   ├── milestones/
│   │   │   │   ├── [bizId]/route.ts
│   │   │   │   ├── customer/[customerId]/[bizId]/route.ts
│   │   │   │   └── save/route.ts
│   │   │   └── stamp/
│   │   │       ├── issue/route.ts
│   │   │       └── redeem/route.ts
│   │   ├── kiosk/[businessSlug]/page.tsx  # Kiosk mode page
│   │   ├── redeem/[bizId]/page.tsx        # Reward redemption page
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Landing page
│   ├── components/
│   │   ├── business/              # Business-side UI components
│   │   │   ├── CustomerTable.tsx
│   │   │   ├── FeatureToggles.tsx
│   │   │   ├── KioskMode.tsx
│   │   │   ├── QRDisplay.tsx
│   │   │   ├── RewardsTab.tsx
│   │   │   └── StatsCard.tsx
│   │   ├── customer/              # Customer-side UI components
│   │   │   └── StampCard.tsx
│   │   └── ui/                    # Shared primitive components
│   │       ├── Alert.tsx
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Spinner.tsx
│   │       ├── Toast.tsx
│   │       └── Toggle.tsx
│   ├── lib/                       # Shared utilities and clients
│   │   ├── supabase/
│   │   │   ├── client.ts          # Browser Supabase client (anon key)
│   │   │   ├── middleware.ts      # Empty updateSession (placeholder)
│   │   │   └── server.ts          # Server Supabase client (service role)
│   │   ├── token.ts               # QR token generation + validation
│   │   ├── utils.ts               # cn(), calculateCardState(), formatPhone(), timeSince()
│   │   └── validators.ts          # All Zod schemas
│   ├── types/
│   │   └── index.ts               # All TypeScript interfaces
│   └── proxy.ts                   # Route protection middleware (Next.js proxy)
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
└── package.json
```

---

## Application Architecture

### Request Routing

```
Browser Request
      │
      ▼
┌─────────────────┐
│   proxy.ts      │  ← Checks session for /dashboard, /onboarding
│   (Middleware)  │  ← Redirects to /login if unauthenticated
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Next.js App Router              │
│                                         │
│  Route Groups:                          │
│  /(auth)      → login, signup           │
│  /(business)  → dashboard, onboarding   │
│  /(customer)  → cards, card, scan       │
│  /api/*       → REST handlers           │
│  /kiosk/*     → Kiosk pages             │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Supabase       │  ← All DB ops via service_role (bypasses RLS)
│  (PostgreSQL)   │  ← Auth session via anon key + cookies
└─────────────────┘
```

### Supabase Client Usage

| Context | Client | Key Used | RLS |
|---|---|---|---|
| Route protection (proxy.ts) | `createServerClient` (auth-helpers) | `ANON_KEY` | Enforced |
| API routes | `createClient` (supabase-js) | `SERVICE_ROLE_KEY` | Bypassed |
| Browser components (auth) | `createBrowserClient` (auth-helpers) | `ANON_KEY` | Enforced |
| Server components | `createServerClient` (auth-helpers) | `ANON_KEY` | Enforced |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (exposed to browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key (exposed to browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key — **never expose to browser** |
| `NODE_ENV` | Auto | `development` or `production` (set by platform) |

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security. It is only used in server-side API routes (`src/app/api/**`). It is never passed to client components.

---

## Security Model

### Authentication Layers

| Layer | Mechanism |
|---|---|
| Business owner auth | Supabase email/password. Session in HTTP-only cookie. |
| Route protection | `proxy.ts` reads session from cookie before rendering `/dashboard`, `/onboarding`. |
| API auth | Most API routes use service role key + validate inputs via Zod. |
| Customer identity | Phone number + `localStorage`. No auth — customers are not authenticated users. |
| Staff operations | 4-digit PIN validated server-side using timing-safe string comparison. |

### QR Fraud Prevention

- Tokens rotate every 30 seconds
- Server accepts current (`offset=0`) and previous (`offset=-1`) windows to handle clock skew
- Token algorithm: `djb2 hash(bizId + "IS2024" + window)` → 6-char uppercase base36

### Input Validation

All API routes validate inputs with Zod before touching the database:
- Phone numbers: Regex `^[6-9]\d{9}$` (Indian mobile)
- Staff PINs: `^\d{4}$`
- UUIDs: `.uuid()` Zod validator
- Stamp token: 6-char string
- Passwords: Minimum 8 characters

### SQL Injection

Not applicable — all database operations use Supabase JS client with parameterised queries.

---

## Error Handling

### API Routes

All API routes follow this pattern:

```typescript
try {
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }
  // ... business logic
} catch {
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}
```

### HTTP Status Codes Used

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Validation error or bad input |
| 401 | Authentication failure (wrong PIN, expired session) |
| 404 | Resource not found |
| 429 | Rate limited (stamp cooldown) |
| 500 | Internal server error |

### Frontend Error Handling

- All API calls check `res.ok` before reading the response body
- Error messages are displayed in-context (below the relevant form field or as an Alert)
- Network errors are caught with `try/catch` and show a generic retry message

---

## Logging

- **Server logs:** `console.error()` in API routes for unexpected DB errors and creation failures
- **Client logs:** None. Errors surfaced to user via state, not console.
- **No structured logging system** is currently in place (e.g. no Datadog, Sentry, or LogRocket).

> **Technical debt:** Adding error monitoring (Sentry) would significantly improve production debuggability.

---

## Performance Considerations

| Area | Current Approach | Risk |
|---|---|---|
| QR display | Canvas re-render every second (token countdown) | Low — single canvas element |
| Dashboard data load | Single fetch for all customers on mount | Medium — could be slow for >500 customers |
| Stamp issuance | Sequential DB queries (business → cooldown → upsert → insert → count → milestones) | Medium — ~5 DB queries per stamp |
| Cards page | Fetches all stamps for customer and groups by business in JS | Medium — could be slow for customers with many stamps |

---

## Scalability Considerations

| Concern | Current State | Recommended Path |
|---|---|---|
| DB connections | Direct Supabase client per request | Use Supabase connection pooler for high traffic |
| Token generation | Stateless hash — scales infinitely | N/A |
| Campaign delivery | No real delivery — just DB record | Integrate async queue (BullMQ, Inngest) for WhatsApp |
| Multi-region | Single Supabase region | Add Supabase read replicas for global deployment |
| File storage | Not used | Add Supabase Storage for business logos |
