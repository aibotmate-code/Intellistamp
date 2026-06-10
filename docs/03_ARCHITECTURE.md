# IntelliStamp — Architecture Document

**Version:** 1.0  
**Last Updated:** 2026-06-05

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                    │
│                                                                    │
│  ┌─────────────────┐        ┌──────────────────────────────┐     │
│  │  Business Owner  │        │        Customer              │     │
│  │  (Browser/Phone) │        │  (Smartphone browser)        │     │
│  └────────┬────────┘        └──────────────┬───────────────┘     │
│           │                                │                       │
└───────────┼────────────────────────────────┼─────────────────────┘
            │                                │
            ▼                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                            │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                     proxy.ts (Middleware)                  │    │
│  │   • Protects /dashboard + /onboarding                     │    │
│  │   • Reads Supabase session from cookies                   │    │
│  │   • Redirects → /login if unauthenticated                 │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                   Next.js 16 App Router                    │    │
│  │                                                            │    │
│  │  Pages                      API Routes                    │    │
│  │  ─────                      ──────────                    │    │
│  │  / (landing)                /api/auth/*                   │    │
│  │  /login                     /api/business/*               │    │
│  │  /signup                    /api/customer/*               │    │
│  │  /onboarding                /api/stamp/*                  │    │
│  │  /dashboard                 /api/kiosk/*                  │    │
│  │  /scan/[bizId]              /api/milestones/*             │    │
│  │  /card/[token]              /api/campaign/*               │    │
│  │  /cards                                                    │    │
│  │  /scanner                                                  │    │
│  │  /kiosk/[slug]                                             │    │
│  │  /redeem/[bizId]                                           │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend)                             │
│                                                                    │
│  ┌────────────────────┐  ┌──────────────────────────────────┐   │
│  │   Auth Service     │  │   PostgreSQL Database             │   │
│  │   (email+password) │  │   8 tables + RLS policies         │   │
│  └────────────────────┘  └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Customer Journey — Full Flow Diagram

```
Customer at Business Counter
           │
           ▼
    ┌──────────────┐
    │ Sees QR code  │  (displayed in kiosk or on business's phone)
    └──────┬───────┘
           │  Scans with phone camera (or /scanner in-app)
           ▼
    ┌─────────────────────┐
    │ Opens /scan/[bizId]  │  URL: origin/scan/{uuid}?t={6-char-token}
    │ ?t={token}           │
    └──────┬──────────────┘
           │
           ▼
    ┌─────────────────────┐      ┌────────────────────────────┐
    │ localStorage session │─YES─▶│ Auto-stamps immediately     │
    │ exists?              │      │ (no input required)         │
    └──────┬──────────────┘      └──────────────┬─────────────┘
           │ NO                                  │
           ▼                                     │
    ┌─────────────────┐                          │
    │ Enter phone     │                          │
    │ number          │                          │
    └──────┬──────────┘                          │
           │                                     │
           ▼                                     │
    ┌──────────────────────┐                     │
    │ GET /api/customer/   │                     │
    │ profile?phone=...    │                     │
    └──────┬───────────────┘                     │
           │                                     │
    ┌──────┴──────┐                              │
    │ 404 = new   │ 200 = existing               │
    ▼             ▼                              │
┌────────┐  ┌────────────┐                      │
│ Enter  │  │ Save to     │                     │
│ name   │  │ localStorage│                     │
└──┬─────┘  └──────┬──────┘                    │
   │               │                            │
   ▼               ▼                            │
┌──────────────────────┐                        │
│ POST /api/stamp/issue │◀───────────────────────┘
│ customer_id, bizId,   │
│ token, type='regular' │
└──────┬───────────────┘
       │
   ┌───┴────────────────────────────────┐
   │ Cooldown check (4hr)               │
   │ Token validation (30s window)      │
   │ Auto-enrol if new                  │
   │ Insert stamp                       │
   │ Milestone resolution               │
   └───┬────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Success screen                    │
│ Shows stamp progress animation    │
│ reward_result via sessionStorage  │
└──────────────┬───────────────────┘
               │ tap "View My Card"
               ▼
     /card/[customerToken]?biz=[bizId]
```

---

## Business Owner Journey

```
Business Owner Visit
       │
       ▼
┌──────────────┐
│  / (landing) │
└──────┬───────┘
       │ clicks "I'm a Business Owner"
       ▼
┌──────────────────────┐
│ Session exists?       │
└──┬──────────┬─────────┘
   │ YES      │ NO
   ▼          ▼
/dashboard  /login ──▶ /signup
               │           │
               ▼           ▼
        signInWithPassword  POST /api/auth/signup
               │           (admin createUser, email_confirm=true)
               ▼           ▼
          /dashboard    signInWithPassword
                             │
                             ▼
                        /onboarding

/onboarding
  Step 1: Business info (name, category, emoji, phone)
  Step 2: Stamp card config (stamps, reward, PIN, GMB link)
  Step 3: Security mode (basic / smart / strict)
  Step 4: Milestones (optional)
  Step 5: Success → /dashboard

/dashboard
  Tab: QR Stamper → Display QR + optional staff validator
  Tab: Customers  → Roster table + CSV export
  Tab: Rewards    → Milestone config + reward settings
  Tab: Campaigns  → Audience + message + send
  Tab: Settings   → GMB link + feature toggles
```

---

## Authentication Flow

```
SIGNUP FLOW:
─────────────────────────────────────────────────────
Browser          /api/auth/signup         Supabase Auth
   │                    │                      │
   │──POST {email,pw}──▶│                      │
   │                    │──admin.createUser───▶│
   │                    │   email_confirm:true  │
   │                    │◀──{userId}────────────│
   │◀──{success}────────│                      │
   │                    │                      │
   │──signInWithPassword──────────────────────▶│
   │◀──session cookie──────────────────────────│
   │                    │                      │
   │──router.push('/onboarding')               │

LOGIN FLOW:
─────────────────────────────────────────────────────
Browser          Supabase Auth SDK
   │                    │
   │──signInWithPassword({email,pw})──▶│
   │◀──session (HTTP-only cookie)──────│
   │──router.push('/dashboard')         │

PROTECTED ROUTE ACCESS:
─────────────────────────────────────────────────────
Browser          proxy.ts              Supabase Auth
   │                │                      │
   │──GET /dashboard▶│                      │
   │                │──getSession(cookies)─▶│
   │                │◀──session ────────────│
   │                │                      │
   ├─session exists─▶ NextResponse.next()  │
   │                │                      │
   └─no session────▶ redirect('/login')    │
```

---

## QR Code Flow

```
GENERATION (Business Side):
──────────────────────────────────────────────────────
QRDisplay.tsx / KioskMode.tsx
   │
   │ Every 30 seconds:
   │   window = Math.floor(Date.now() / 30000)
   │   hash = djb2("${bizId}-IS2024-${window}")
   │   token = base36(hash).slice(0,6).toUpperCase()
   │
   │ QR encodes:
   │   `${origin}/scan/${bizId}?t=${token}`
   │
   ▼
Canvas QR rendered on screen

VALIDATION (Server Side):
──────────────────────────────────────────────────────
/api/stamp/issue receives { business_id, token, ... }
   │
   │ if (business.dynamic_qr_enabled) {
   │   currentToken  = generateToken(bizId, 0)
   │   previousToken = generateToken(bizId, -1)
   │   valid = (token === currentToken || token === previousToken)
   │ }
   │
   └─ Invalid → 400 "Invalid or expired token"
   └─ Valid   → proceed to stamp issuance
```

---

## Stamp Issuance Flow (Detailed)

```
POST /api/stamp/issue
{ customer_id, business_id, token, staff_pin?, type? }
           │
           ▼
    Fetch business record
           │
           ▼
    dynamic_qr_enabled? ─YES─▶ validateToken() ─FAIL─▶ 400
           │ NO
           ▼
    staff_pin_enabled? ──YES──▶ timingSafe(pin) ─FAIL─▶ 401
           │ NO
           ▼
    Check last stamp timestamp
    (customer_id + business_id)
           │
    < 4 hours? ──YES──▶ 429 { cooldown_hours }
           │ NO
           ▼
    UPSERT business_customers
    (auto-enrol if first visit)
           │
           ▼
    INSERT stamps record
           │
           ▼
    COUNT stamps for this customer at this business
    (total = N)
    card_stamps = N % stamps_required
    cards_completed = floor(N / stamps_required)
    stamp_complete = (card_stamps === 0 && total > 0)
           │
           ▼
    Fetch eligible milestones (visit_number <= total, is_active)
    Fetch prior milestone claims
    Find first unclaimed eligible milestone
           │
    ┌──────┴─────────────────────────────────────┐
    │  BOTH stamp_complete + unclaimed_milestone  │
    │  conflict_priority = 'stamp'               │──▶ Give stamp, defer milestone
    │  conflict_priority = 'milestone'           │──▶ Claim milestone, defer stamp
    ├────────────────────────────────────────────┤
    │  stamp_complete ONLY                        │──▶ Give stamp reward
    ├────────────────────────────────────────────┤
    │  unclaimed_milestone ONLY                   │──▶ Claim milestone
    └────────────────────────────────────────────┘
           │
           ▼
    Return { success, stamp, card_state, reward_result }
```

---

## Milestone Processing Flow

```
Milestone Definition (set by business):
  visit_number: 15 → badge: "🥈 Silver", reward: "Free latte"
  visit_number: 30 → badge: "🥇 Gold",   reward: "Free meal"

At stamp issuance (visit N):
  eligible = milestones WHERE visit_number <= N AND is_active = true
  unclaimed = eligible WHERE milestone_id NOT IN (customer's claims)
  pick = first unclaimed (lowest visit_number)

  If pick exists:
    INSERT milestone_claims { customer_id, business_id, milestone_id }
    reward_result = { type: 'milestone', milestone: pick }

On frontend (StampCard.tsx):
  If reward_result.type === 'milestone':
    Show celebration banner with badge + reward text
    Auto-dismiss after 8 seconds
    Store in sessionStorage to survive navigation
```

---

## Data Flow: Customer Card State

```
GET /api/customer/by-token?token=X&bizId=Y

  1. SELECT customer WHERE customer_token = X
  2. SELECT COUNT(stamps) WHERE customer_id = customer.id AND business_id = Y
  3. SELECT business WHERE id = Y
  4. SELECT cards_redeemed FROM business_customers WHERE ...

  card_state = {
    total_stamps:    COUNT(stamps),
    card_stamps:     total % stamps_required,       // current cycle
    cards_completed: floor(total / stamps_required), // lifetime cards
    cards_redeemed:  business_customers.cards_redeemed,
    redeemable:      cards_completed > cards_redeemed
  }
```

---

## Kiosk Mode Flow

```
/kiosk/[businessSlug]
  │
  ▼ Load business by slug
  │
  ▼ Staff enters 4-digit PIN → unlock
  │
  ▼ Staff enters customer phone number
  │
  ▼ POST /api/kiosk/stamp { business_id, phone, pin }
    │
    ├─ Find/create customer by phone
    ├─ Validate PIN (timing-safe)
    ├─ Check cooldown
    ├─ Upsert business_customers
    ├─ Insert stamp
    ├─ Resolve milestones
    └─ Return { customer_id, review_claimed, card_state, reward_result }
  │
  ▼ Success screen
  │
  ├─ business.gmb_link AND NOT review_claimed?
  │  ├─ Show "Leave a review → get bonus stamp" prompt
  │  ├─ Customer taps "Open Google Review" → opens GMB link
  │  └─ After 1s → show "Claim Bonus Stamp"
  │     POST /api/kiosk/review-bonus { business_id, customer_id, pin }
  │     ├─ Verify not already claimed
  │     ├─ Issue type='bonus_review' stamp
  │     └─ Set review_claimed = true
  │
  └─ "Next Customer" → reset phone input
```
