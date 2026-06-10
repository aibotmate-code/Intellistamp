# IntelliStamp — API Reference

**Version:** 1.0  
**Base URL:** `https://{your-domain}`  
**Format:** JSON  
**Authentication:** Service role key (server-side only). No API key required on client — requests are made from Next.js pages in the same origin.

---

## Authentication Routes

### POST /api/auth/signup

Create a new business owner account. Email is auto-confirmed (no verification email sent).

**Authentication:** None required.

**Request Body:**
```json
{
  "email": "owner@example.com",
  "password": "mypassword123"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Minimum 8 characters |

**Success Response (200):**
```json
{
  "success": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**
| Status | Error | Cause |
|---|---|---|
| 400 | `"Invalid email address"` | Malformed email |
| 400 | `"Password must be at least 8 characters"` | Short password |
| 400 | `"User already registered"` | Duplicate email |
| 500 | `"Something went wrong. Please try again."` | Supabase error |

---

### POST /api/auth/verify

Send or verify a phone OTP. (Legacy route — retained but not used in primary flows.)

**Send OTP Request:**
```json
{ "phone": "9876543210" }
```

**Verify OTP Request:**
```json
{ "phone": "9876543210", "otp": "4823" }
```

**Verify Response (200):**
```json
{
  "success": true,
  "customer": { "id": "...", "phone": "9876543210", "customer_token": "..." },
  "isNewCustomer": false
}
```

---

## Business Routes

### POST /api/business/create

Create a new business loyalty programme. Requires an authenticated owner session (cookie).

**Authentication:** Supabase session cookie.

**Request Body:**
```json
{
  "name": "Cafe Mocha",
  "category": "Cafe",
  "emoji": "☕",
  "owner_phone": "9876543210",
  "stamps_required": 6,
  "reward": "Free coffee",
  "staff_pin": "1234",
  "gmb_link": "https://g.page/r/...",
  "dynamic_qr_enabled": true,
  "staff_pin_enabled": false
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | Min 2 chars |
| `category` | string | Yes | One of: `Cafe`, `Salon`, `Gym`, `Restaurant`, `Jewellery`, `Spa`, `Bakery`, `Other` |
| `emoji` | string | Yes | Single emoji character |
| `owner_phone` | string | Yes | 10-digit Indian mobile (6–9 prefix) |
| `stamps_required` | integer | Yes | 3 to 20 |
| `reward` | string | Yes | Min 3 chars |
| `staff_pin` | string | Yes | Exactly 4 digits |
| `gmb_link` | string | No | Valid URL starting `http://` or `https://` |
| `dynamic_qr_enabled` | boolean | Yes | — |
| `staff_pin_enabled` | boolean | Yes | — |

**Success Response (200):**
```json
{
  "success": true,
  "business": {
    "id": "550e8400-...",
    "name": "Cafe Mocha",
    "slug": "cafe-mocha",
    "stamps_required": 6,
    "reward": "Free coffee",
    "dynamic_qr_enabled": true,
    "staff_pin_enabled": false,
    "plan": "free",
    "created_at": "2026-06-05T10:00:00Z"
  }
}
```

**Error Responses:**
| Status | Error | Cause |
|---|---|---|
| 400 | `"Business name is required (min 2 chars)"` | Validation |
| 400 | `"PIN must be exactly 4 digits"` | Validation |
| 500 | `"Failed to create business. Please try again."` | DB error |

---

### GET /api/business/get

Fetch business details, stats, and customer roster.

**Authentication:** None (uses service role server-side).

**Query Parameters (one required):**

| Parameter | Description |
|---|---|
| `bizId` | Business UUID |
| `ownerPhone` | Owner's 10-digit phone |
| `slug` | Business URL slug |
| `ownerId` | Auth user UUID (returns business for that owner) |

**Example:**
```
GET /api/business/get?ownerId=550e8400-...
GET /api/business/get?slug=cafe-mocha
GET /api/business/get?bizId=550e8400-...
```

**Success Response (200):**
```json
{
  "business": {
    "id": "550e8400-...",
    "name": "Cafe Mocha",
    "emoji": "☕",
    "stamps_required": 6,
    "reward": "Free coffee",
    "gmb_link": "https://g.page/r/..."
  },
  "stats": {
    "total_customers": 142,
    "total_stamps": 867,
    "rewards_redeemed": 45
  },
  "customers": [
    {
      "id": "...",
      "customer": { "id": "...", "phone": "98765...", "name": "Rahul" },
      "total_stamps": 14,
      "card_stamps": 2,
      "can_stamp": true,
      "last_stamp": "2026-06-04T18:30:00Z"
    }
  ]
}
```

**Error Responses:**
| Status | Error |
|---|---|
| 400 | `"bizId, ownerPhone, slug, or ownerId required"` |
| 404 | `"Business not found"` |

---

### PATCH /api/business/update

Update business toggles and settings.

**Request Body:**
```json
{
  "id": "550e8400-...",
  "dynamic_qr_enabled": true,
  "staff_pin_enabled": false,
  "whatsapp_enabled": false,
  "gmb_link": "https://g.page/r/..."
}
```

All fields except `id` are optional.

**Success Response (200):**
```json
{
  "success": true,
  "business": { "id": "...", "gmb_link": "...", ... }
}
```

---

### GET /api/business/export-customers

Download customer data as CSV.

**Query Parameters:**
| Parameter | Required | Description |
|---|---|---|
| `bizId` | Yes | Business UUID |

**Response:** `text/csv` attachment.

**CSV Columns:**
```
name, phone, current_cycle_stamps, lifetime_visits, last_visit_at,
rewards_earned, rewards_redeemed, whatsapp_optin,
birthday_month, birthday_day, enrolled_at, milestone_badges_earned
```

---

## Customer Routes

### POST /api/customer/identify

Find or create a customer by phone number.

**Request Body:**
```json
{
  "phone": "9876543210",
  "name": "Rahul"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `phone` | string | Yes | 10-digit Indian mobile. `+91` prefix stripped. |
| `name` | string | No | Used only when creating new customer |

**Success Response (200):**
```json
{
  "customer": {
    "id": "...",
    "phone": "9876543210",
    "customer_token": "uuid-here",
    "name": "Rahul",
    "whatsapp_optin": true
  },
  "isNew": false
}
```

---

### GET /api/customer/profile

Fetch customer profile with all loyalty card states.

**Query Parameters (one required):**
| Parameter | Description |
|---|---|
| `customerId` | Customer UUID |
| `phone` | 10-digit phone number |

**Success Response (200):**
```json
{
  "customer": {
    "id": "...",
    "phone": "9876543210",
    "name": "Rahul",
    "customer_token": "uuid-here"
  },
  "cards": [
    {
      "business_id": "...",
      "business": { "id": "...", "name": "Cafe Mocha", "emoji": "☕", "stamps_required": 6 },
      "total_stamps": 14,
      "card_stamps": 2,
      "cards_completed": 2,
      "cards_redeemed": 2
    }
  ]
}
```

**Error Responses:**
| Status | Error |
|---|---|
| 400 | `"customerId or phone required"` |
| 404 | `"Customer not found"` |

---

### PATCH /api/customer/profile

Update customer preferences.

**Request Body:**
```json
{
  "customer_id": "...",
  "name": "Rahul K.",
  "birthday_month": "March",
  "birthday_day": 15,
  "whatsapp_optin": true
}
```

---

### GET /api/customer/by-token

Fetch customer and card state for a specific business using the customer's public token.

**Query Parameters:**
| Parameter | Required | Description |
|---|---|---|
| `token` | Yes | Customer's `customer_token` (UUID) |
| `bizId` | No | Business UUID — if provided, returns card state |

**Success Response (200):**
```json
{
  "customer": { "id": "...", "name": "Rahul" },
  "business": { "id": "...", "name": "Cafe Mocha", "stamps_required": 6, "reward": "Free coffee" },
  "card_state": {
    "total_stamps": 14,
    "card_stamps": 2,
    "cards_completed": 2,
    "cards_redeemed": 2,
    "redeemable": false
  }
}
```

---

## Stamp Routes

### POST /api/stamp/issue

Issue a loyalty stamp to a customer. The primary transaction endpoint.

**Request Body:**
```json
{
  "customer_id": "550e8400-...",
  "business_id": "550e8400-...",
  "token": "X7K3P2",
  "staff_pin": "1234",
  "type": "regular"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `customer_id` | string | Yes | Valid UUID |
| `business_id` | string | Yes | Valid UUID |
| `token` | string | Yes | 6-char uppercase string |
| `staff_pin` | string | No | Required if `staff_pin_enabled = true` |
| `type` | string | No | `'regular'` (default) or `'bonus_review'` |

**Success Response (200):**
```json
{
  "success": true,
  "stamp": { "id": "...", "type": "regular", "stamped_at": "2026-06-05T..." },
  "card_state": {
    "total_stamps": 6,
    "card_stamps": 6,
    "cards_completed": 1,
    "can_stamp": false,
    "cooldown_remaining_hours": 4,
    "redeemable": true
  },
  "reward_result": {
    "type": "stamp",
    "reward": "Free coffee"
  }
}
```

**reward_result variants:**
```json
// Stamp reward only
{ "type": "stamp", "reward": "Free coffee" }

// Milestone reward only
{ "type": "milestone", "milestone": { "badge": "🥈 Silver", "reward": "Free latte" } }

// Stamp wins, milestone deferred
{ "type": "stamp", "reward": "Free coffee", "deferred_milestone": { "badge": "🥈 Silver", ... } }

// Milestone wins, stamp deferred
{ "type": "milestone", "milestone": { ... }, "deferred_stamp": true }

// No reward (mid-card stamp)
null
```

**Error Responses:**
| Status | Error | Cause |
|---|---|---|
| 400 | `"Invalid or expired token. Please scan the QR again."` | Bad/expired QR token |
| 400 | `"Invalid staff PIN"` | Wrong PIN (timing-safe comparison) |
| 404 | `"Business not found"` | Invalid business_id |
| 429 | `"You already stamped recently. Next stamp available in Xh."` | Cooldown active |
| 429 | `{ "cooldown_hours": 3 }` | Cooldown metadata |
| 500 | `"Failed to issue stamp. Please try again."` | DB insert error |

---

### POST /api/stamp/redeem

Redeem a completed stamp card. Increments `cards_redeemed`.

**Request Body:**
```json
{
  "customer_id": "...",
  "business_id": "..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "code": "ABCD12",
  "reward": "Free coffee"
}
```

---

## Kiosk Routes

### POST /api/kiosk/stamp

Issue a stamp from kiosk mode (staff enters customer phone number).

**Request Body:**
```json
{
  "business_id": "550e8400-...",
  "phone": "9876543210",
  "pin": "1234"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `business_id` | string | Yes | Valid UUID |
| `phone` | string | Yes | 10-digit Indian mobile |
| `pin` | string | Yes | 4-digit staff PIN |

**Success Response (200):**
```json
{
  "success": true,
  "customer_id": "...",
  "customer_token": "uuid-here",
  "review_claimed": false,
  "card_state": { ... },
  "reward_result": { ... }
}
```

**Error Responses:**
| Status | Error | Cause |
|---|---|---|
| 401 | `"Invalid PIN"` | Wrong staff PIN |
| 429 | `{ "cooldown_hours": 4 }` | Cooldown active |

---

### POST /api/kiosk/review-bonus

Issue one bonus stamp in exchange for a Google review. One-time per customer per business.

**Request Body:**
```json
{
  "business_id": "...",
  "customer_id": "...",
  "pin": "1234"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "card_state": { "card_stamps": 4, ... }
}
```

**Error Responses:**
| Status | Error | Cause |
|---|---|---|
| 400 | `"No Google review link configured"` | `gmb_link` not set |
| 400 | `"Review bonus already claimed"` | `review_claimed = true` |
| 401 | `"Invalid PIN"` | Wrong PIN |

---

## Milestone Routes

### GET /api/milestones/[bizId]

Fetch all active milestones for a business.

**Response (200):**
```json
{
  "milestones": [
    { "id": "...", "visit_number": 15, "badge": "🥈 Silver", "reward": "Free latte", "is_active": true }
  ]
}
```

---

### GET /api/milestones/customer/[customerId]/[bizId]

Fetch milestone statuses for a specific customer.

**Response (200):**
```json
{
  "milestones": [
    {
      "id": "...",
      "visit_number": 15,
      "badge": "🥈 Silver",
      "reward": "Free latte",
      "is_active": true,
      "earned": true,
      "visits_remaining": 0
    }
  ]
}
```

---

### POST /api/milestones/save

Replace all milestones for a business. Also updates conflict priority and optionally stamps_required/reward.

**Request Body:**
```json
{
  "business_id": "...",
  "conflict_priority": "stamp",
  "stamps_required": 6,
  "reward": "Free coffee",
  "milestones": [
    { "visit_number": 15, "badge": "🥈 Silver", "reward": "Free latte", "is_active": true },
    { "visit_number": 30, "badge": "🥇 Gold",   "reward": "Free meal",  "is_active": true }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "milestones": [ ... ],
  "business": { ... }
}
```

---

## Campaign Routes

### POST /api/campaign/send

Record and trigger a campaign send to opted-in customers.

**Request Body:**
```json
{
  "business_id": "...",
  "message": "Hi {name}! You're 2 stamps away from a free coffee. Visit us today! ☕",
  "audience": "near_reward"
}
```

| Field | Rules |
|---|---|
| `message` | 1–320 characters. `{name}` is replaced with customer first name. |
| `audience` | `'all'`, `'inactive'` (30+ days), or `'near_reward'` (1–2 stamps away) |

**Success Response (200):**
```json
{
  "success": true,
  "campaign": { "id": "...", "total_sent": 23, "delivered": 0 },
  "total_sent": 23
}
```

> **Note:** `delivered` is always 0 until WhatsApp API integration is implemented. `total_sent` reflects the audience size.
