# IntelliStamp — Database Documentation

**Version:** 1.0  
**Last Updated:** 2026-06-05  
**Database:** Supabase (PostgreSQL)  
**Extension:** `uuid-ossp`

---

## Entity Relationship Diagram

```
auth.users (Supabase managed)
    │
    │ 1:1 (owner_id)
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  businesses                                                       │
│  id (PK) • name • emoji • category • slug (unique)               │
│  stamps_required • reward • staff_pin • gmb_link                 │
│  dynamic_qr_enabled • staff_pin_enabled • whatsapp_enabled       │
│  plan • owner_phone • conflict_priority • owner_id (FK)          │
└──────────┬────────────────────────────────────────┬──────────────┘
           │ 1:N                                     │ 1:N
           ▼                                         ▼
┌────────────────────┐                    ┌────────────────────────┐
│  milestones        │                    │  campaigns             │
│  id (PK)           │                    │  id (PK)               │
│  business_id (FK)  │                    │  business_id (FK)      │
│  visit_number      │                    │  message               │
│  badge • reward    │                    │  audience              │
│  is_active         │                    │  sent_at               │
└────────┬───────────┘                    │  total_sent            │
         │ 1:N                            └────────────────────────┘
         ▼
┌────────────────────┐
│  milestone_claims  │
│  id (PK)           │
│  customer_id (FK)  │
│  business_id (FK)  │
│  milestone_id (FK) │
│  claimed_at        │
└────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  customers                                                        │
│  id (PK) • phone (unique) • customer_token (unique)              │
│  name • birthday_month • birthday_day                            │
│  whatsapp_optin • created_at                                     │
└──────────┬───────────────────────────────────────────────────────┘
           │ N:M via business_customers                  │ 1:N
           ▼                                             ▼
┌──────────────────────────────┐             ┌──────────────────────┐
│  business_customers          │             │  stamps              │
│  id (PK)                     │             │  id (PK)             │
│  business_id (FK)            │             │  customer_id (FK)    │
│  customer_id (FK)            │             │  business_id (FK)    │
│  review_claimed              │             │  type                │
│  cards_redeemed              │             │  stamped_at          │
│  enrolled_at                 │             └──────────────────────┘
│  UNIQUE(business_id,         │
│         customer_id)         │
└──────────────────────────────┘

┌──────────────────────────────┐
│  otp_store                   │
│  id (PK) • phone • otp       │
│  expires_at • used           │
│  created_at                  │
└──────────────────────────────┘
```

---

## Table Reference

### `businesses`

**Purpose:** Stores merchant/business account configuration for each loyalty programme.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | Primary key |
| `name` | text | NOT NULL | — | Business display name |
| `emoji` | text | NOT NULL | `'🏪'` | One-character emoji for branding |
| `category` | text | NOT NULL | — | e.g. `Cafe`, `Salon`, `Gym` |
| `stamps_required` | integer | NOT NULL | `8` | Stamps to complete one card (3–20) |
| `reward` | text | NOT NULL | — | Reward description (e.g. "Free coffee") |
| `staff_pin` | text | NOT NULL | — | 4-digit PIN for staff validation |
| `gmb_link` | text | NULL | — | Google Maps review URL |
| `dynamic_qr_enabled` | boolean | NOT NULL | `true` | Rotating QR token enabled |
| `staff_pin_enabled` | boolean | NOT NULL | `false` | Require PIN for stamps |
| `whatsapp_enabled` | boolean | NOT NULL | `false` | WhatsApp campaign feature |
| `plan` | text | NOT NULL | `'free'` | `'free'` or `'pro'` |
| `owner_phone` | text | NULL | — | Business owner's phone |
| `slug` | text | NOT NULL | `''` | URL-safe unique identifier |
| `conflict_priority` | text | NOT NULL | `'stamp'` | `'stamp'` or `'milestone'` |
| `owner_id` | uuid | NULL | — | FK → `auth.users(id)` |
| `created_at` | timestamptz | NOT NULL | `now()` | Creation timestamp |

**Indexes:**
- `businesses_owner_idx` on `owner_id`
- Unique constraint on `slug`

**RLS Policy:** `"Owner access only"` — `owner_id = auth.uid()` (service role bypasses)

---

### `customers`

**Purpose:** Stores end-user identity. One record per unique phone number across all businesses.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | Primary key |
| `phone` | text | NOT NULL | — | 10-digit Indian mobile. Unique. |
| `name` | text | NULL | — | Customer first name |
| `birthday_month` | text | NULL | — | e.g. `'January'` |
| `birthday_day` | integer | NULL | — | Day of month (1–31) |
| `whatsapp_optin` | boolean | NOT NULL | `true` | Consent for WhatsApp campaigns |
| `customer_token` | uuid | NOT NULL | `uuid_generate_v4()` | Public URL-safe identifier. Unique. |
| `created_at` | timestamptz | NOT NULL | `now()` | First scan timestamp |

**Usage Notes:**
- `customer_token` is used in URLs (`/card/[customerToken]`) and is not sensitive but should be treated as a personal identifier
- `phone` is the primary lookup key — never expose it in client-facing URLs
- A customer record is shared across all businesses they've visited

---

### `business_customers`

**Purpose:** Junction table linking customers to businesses. Tracks per-business state: redemptions and review status.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | Primary key |
| `business_id` | uuid | NOT NULL | — | FK → `businesses(id)` ON DELETE CASCADE |
| `customer_id` | uuid | NOT NULL | — | FK → `customers(id)` ON DELETE CASCADE |
| `review_claimed` | boolean | NOT NULL | `false` | Google review bonus claimed |
| `cards_redeemed` | integer | NOT NULL | `0` | Lifetime reward redemptions |
| `enrolled_at` | timestamptz | NOT NULL | `now()` | First stamp timestamp |

**Constraints:**
- `UNIQUE(business_id, customer_id)` — one row per customer per business
- Both FKs have `ON DELETE CASCADE`

**Usage Notes:**
- Created (or updated via UPSERT) on every first stamp at a business
- `cards_redeemed` is incremented by `/api/stamp/redeem`
- `review_claimed` is set by `/api/kiosk/review-bonus`
- Used to determine `redeemable` status: `cards_completed > cards_redeemed`

---

### `stamps`

**Purpose:** Append-only log of every stamp event.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | Primary key |
| `customer_id` | uuid | NOT NULL | — | FK → `customers(id)` ON DELETE CASCADE |
| `business_id` | uuid | NOT NULL | — | FK → `businesses(id)` ON DELETE CASCADE |
| `type` | text | NOT NULL | `'regular'` | `'regular'` or `'bonus_review'` |
| `stamped_at` | timestamptz | NOT NULL | `now()` | Exact timestamp of stamp |

**Indexes:**
- `stamps_customer_business_idx` on `(customer_id, business_id)` — used for cooldown check and count queries
- `stamps_stamped_at_idx` on `stamped_at DESC` — used for recent stamp lookups

**Usage Notes:**
- Never deleted (audit trail). `cards_completed` is derived from `COUNT(*) / stamps_required`.
- Cooldown is calculated as `now() - MAX(stamped_at) < 4 hours`
- `bonus_review` stamps count towards the stamp total and are included in card progress

---

### `milestones`

**Purpose:** Business-defined reward thresholds at specific visit counts.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | Primary key |
| `business_id` | uuid | NOT NULL | — | FK → `businesses(id)` ON DELETE CASCADE |
| `visit_number` | integer | NOT NULL | — | Total visit count when milestone triggers |
| `badge` | text | NOT NULL | — | Display label (e.g. `"🥈 Silver"`) |
| `reward` | text | NOT NULL | — | Reward text (e.g. `"Free latte"`) |
| `is_active` | boolean | NOT NULL | `true` | Soft-disable without deleting |
| `created_at` | timestamptz | NOT NULL | `now()` | — |

**Indexes:**
- `milestones_business_id_idx` on `business_id`

**Usage Notes:**
- Milestones are replaced wholesale on save (`DELETE` all then `INSERT` new)
- Only `is_active = true` milestones are evaluated during stamp issuance
- Multiple milestones can be defined per business at different visit counts

---

### `milestone_claims`

**Purpose:** Tracks which milestones each customer has already received. Prevents double-claiming.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | Primary key |
| `customer_id` | uuid | NOT NULL | — | FK → `customers(id)` ON DELETE CASCADE |
| `business_id` | uuid | NOT NULL | — | FK → `businesses(id)` ON DELETE CASCADE |
| `milestone_id` | uuid | NOT NULL | — | FK → `milestones(id)` ON DELETE CASCADE |
| `claimed_at` | timestamptz | NOT NULL | `now()` | — |

**Constraints:**
- `UNIQUE(customer_id, milestone_id)` — one claim per customer per milestone

**Indexes:**
- `milestone_claims_customer_milestone_idx` on `(customer_id, milestone_id)`

---

### `campaigns`

**Purpose:** Records campaign sends. Tracks audience, message, and delivery counts.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | Primary key |
| `business_id` | uuid | NOT NULL | — | FK → `businesses(id)` ON DELETE CASCADE |
| `message` | text | NOT NULL | — | Campaign message text (max 320 chars) |
| `audience` | text | NOT NULL | `'all'` | `'all'`, `'inactive'`, or `'near_reward'` |
| `sent_at` | timestamptz | NOT NULL | `now()` | When campaign was triggered |
| `total_sent` | integer | NOT NULL | `0` | Number of customers in audience |
| `delivered` | integer | NOT NULL | `0` | Actual deliveries (currently = 0, no API) |

---

### `otp_store`

**Purpose:** Temporary store for OTP codes used in the legacy phone-based auth flow.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `uuid_generate_v4()` | Primary key |
| `phone` | text | NOT NULL | — | Phone number |
| `otp` | text | NOT NULL | — | 4-digit code |
| `expires_at` | timestamptz | NOT NULL | `now() + 10 min` | Auto-expiry |
| `used` | boolean | NOT NULL | `false` | Prevents replay |
| `created_at` | timestamptz | NOT NULL | `now()` | — |

> **Note:** OTP-based login was removed from the customer scan flow in a previous release. This table remains but `otp_store` may be unused in current flows. The `/api/auth/verify` route still references it.

---

## Row Level Security Summary

| Table | RLS | Policy |
|---|---|---|
| `businesses` | ENABLED | `"Owner access only"`: `owner_id = auth.uid()` |
| `customers` | ENABLED | `"Allow all"`: `true` |
| `stamps` | ENABLED | `"Allow all"`: `true` |
| `business_customers` | ENABLED | `"Allow all"`: `true` |
| `campaigns` | ENABLED | `"Allow all"`: `true` |
| `otp_store` | ENABLED | `"Allow all"`: `true` |
| `milestones` | ENABLED | `"Allow all"`: `true` |
| `milestone_claims` | ENABLED | `"Allow all"`: `true` |

> **Important:** All API routes use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS entirely. RLS policies are a safety net for direct anon-key access only.

---

## Grants

```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
```

---

## Cascade Behaviour

| Delete | Cascades To |
|---|---|
| DELETE businesses | → stamps, business_customers, milestones, milestone_claims, campaigns |
| DELETE customers | → stamps, business_customers, milestone_claims |
| DELETE milestones | → milestone_claims |
