# IntelliStamp — Product Requirements Document

**Version:** 1.0  
**Last Updated:** 2026-06-05  
**Status:** Active

---

## Executive Summary

### What IntelliStamp Is

IntelliStamp is a digital loyalty stamp platform for local and independent businesses. It replaces paper punch cards with a smartphone-based system: businesses display a dynamic QR code at their counter; customers scan it to collect digital stamps; rewards are issued automatically when stamp cards are completed.

### Why It Exists

Paper loyalty cards fail businesses and customers alike:
- Cards get lost, forgotten, or forged
- Businesses have no visibility into customer behaviour
- There is no way to run campaigns or re-engage lapsed customers
- Redemption tracking is manual and unreliable

IntelliStamp solves this by putting the entire loyalty loop — issuance, tracking, redemption, and re-engagement — into a web-based product that requires no app install on either side.

### Business Problem Solved

| Problem | IntelliStamp Solution |
|---|---|
| Paper cards lost by customers | Digital stamps stored server-side, retrieved by phone number |
| No customer data | Every scan creates a customer record with phone, visit history, preferences |
| Static QR codes can be replayed | 30-second rotating token prevents QR replay fraud |
| No re-engagement tools | WhatsApp campaign system with audience filters |
| Forgery risk on paper cards | Server-side stamp issuance only |
| Redemption disputes | Server records every stamp, redemption, and reward event |

### Market Opportunity

The target market is the estimated 60+ million local businesses globally that run manual loyalty programmes. In India alone, there are 7+ million cafés, salons, gyms, and restaurants that rely on paper cards. This segment is under-served by enterprise loyalty platforms (Yotpo, Antavo) which require technical setup, annual contracts, and large teams to operate.

---

## Product Vision

> Every local business, regardless of size or technical sophistication, should be able to run a modern digital loyalty programme in under 10 minutes — with zero app installs, zero hardware, and zero ongoing technical maintenance.

---

## Product Goals

1. **Acquisition:** Enable a business owner to create a complete loyalty programme and generate a working QR in under 10 minutes.
2. **Activation:** First stamp issued to a real customer within 24 hours of signup.
3. **Retention:** Business returns to the dashboard at least twice a week to view new stamps and customer activity.
4. **Revenue:** Convert free businesses to paid plans via WhatsApp campaigns and advanced features.
5. **Scale:** Support 10,000+ simultaneous active businesses without infrastructure changes.

---

## User Personas

### Persona 1 — The Café Owner (Primary)

**Name:** Priya  
**Business:** Standalone café, 50–200 customers/day  
**Tech comfort:** Medium. Uses WhatsApp, Instagram, Swiggy. Not a developer.  
**Current loyalty:** Paper punch card. 30% of customers forget to bring it.  
**Pain points:** No data on customers, can't know who is about to churn, paper cards get lost.  
**Goal:** Know who her regulars are, reward them automatically, bring back customers who haven't visited in 30 days.

### Persona 2 — The Salon Owner

**Name:** Arjun  
**Business:** Boutique salon, appointment-based, 20–60 customers/day  
**Tech comfort:** Low. Uses phone for WhatsApp.  
**Current loyalty:** Verbal / manual. No system.  
**Pain points:** Customers go elsewhere without a retention mechanism.  
**Goal:** Simple system he can hand to a staff member. Just works, no training required.

### Persona 3 — The Gym Owner

**Name:** Deepa  
**Business:** Independent gym, monthly memberships + day passes  
**Tech comfort:** Medium-high. Uses fitness apps.  
**Goal:** Track visit frequency, reward milestones (e.g. 50th visit), run seasonal campaigns.

### Persona 4 — The Restaurant Owner

**Name:** Suresh  
**Business:** Mid-size restaurant, 100–400 covers/day  
**Tech comfort:** Medium. Uses Zomato, Petpooja POS.  
**Goal:** Identify repeat diners, create VIP tiers, promote slow weekdays.

### Persona 5 — The Customer (End User)

**Name:** Rahul  
**Age:** 25–40, urban professional  
**Behaviour:** Visits 3–5 local businesses regularly. Has never used a loyalty app but uses WhatsApp daily.  
**Goal:** Collect rewards without installing an app or carrying a card.  
**Key requirement:** Frictionless. Must work on their existing browser.

---

## User Stories

### Business Owner Stories

```
As a business owner
I want to set up a loyalty programme in under 10 minutes
So that I can start rewarding customers immediately without IT support

As a business owner
I want to display a QR code at my counter
So that customers can stamp their card themselves, without staff involvement

As a business owner
I want a staff PIN mode
So that only authorised staff can issue stamps, preventing abuse

As a business owner
I want to see all my customers in a dashboard
So that I can understand who my regulars are and how often they visit

As a business owner
I want to export my customer list to CSV
So that I can analyse data outside the platform or import it to other tools

As a business owner
I want to configure milestone rewards (e.g. free item on 10th, 25th, 50th visit)
So that I can reward high-frequency customers differently from one-time visitors

As a business owner
I want to send a WhatsApp campaign to customers who haven't visited in 30 days
So that I can re-engage churning customers before I lose them

As a business owner
I want a Google Review bonus stamp
So that I can incentivise customers to leave reviews without asking manually

As a business owner
I want the QR code to change every 30 seconds
So that customers cannot screenshot and share it to earn fraudulent stamps

As a business owner
I want to see rewards redeemed on my dashboard
So that I know what I'm giving away and can track ROI
```

### Customer Stories

```
As a customer
I want to scan a QR code to collect a stamp
So that I don't need to install an app or carry a paper card

As a customer
I want to see all my loyalty cards in one place
So that I can track progress across multiple businesses

As a customer
I want to be recognised automatically by my phone number
So that I don't have to remember a login or carry a card

As a customer
I want to be notified when my stamp card is complete
So that I know when I can claim my reward

As a customer
I want to earn milestone rewards for my loyalty
So that I feel valued beyond just the basic stamp card

As a customer
I want to scan the QR code from my card detail page
So that I can stamp from wherever I am without going back to the home screen
```

---

## Core Features

### Feature 1: Business Onboarding

**Description:** Multi-step wizard allowing a business owner to configure their loyalty programme from scratch.  
**Purpose:** Reduce time-to-first-QR to under 10 minutes.  
**Steps:** Business info → Stamp card setup (stamps required, reward, PIN) → Security mode → Milestone rewards (optional) → Go live.  
**User value:** Immediate. Business has a working loyalty system after 4 screens.  
**Business value:** Zero-touch onboarding removes the biggest barrier to conversion.  
**Dependencies:** Supabase Auth, `/api/business/create`, `/api/milestones/save`.

---

### Feature 2: Dynamic QR Code

**Description:** Each business has a QR code that encodes a time-limited token. The token rotates every 30 seconds.  
**Purpose:** Prevent QR code sharing, screenshots, and replay fraud.  
**Technical detail:** Token is a djb2 hash of `{bizId}-IS2024-{window}` where `window = Math.floor(Date.now() / 30000)`. Server accepts current or previous window.  
**User value:** Business owner can trust stamps are only issued to physical customers.  
**Business value:** Credibility of the loyalty programme.  
**Dependencies:** `src/lib/token.ts`, `QRDisplay.tsx`, `KioskMode.tsx`, `/api/stamp/issue`.

---

### Feature 3: Customer Identification

**Description:** Customers identify themselves by phone number only. No app install, no password, no email.  
**Purpose:** Zero-friction enrolment. Works on any smartphone browser.  
**Flow:** Customer scans QR → enters phone → (if new) enters name → stamp issued.  
**User value:** No account to create or remember.  
**Business value:** Higher participation rate vs. app-based systems.  
**Dependencies:** `/api/customer/identify`, `/api/customer/profile`, `localStorage`.

---

### Feature 4: Stamp Issuance

**Description:** Core transaction. Issues one stamp to a customer at a business, subject to validation rules.  
**Validation rules:**
- Token must be valid (current or previous 30-second window) if `dynamic_qr_enabled`
- Staff PIN must match if `staff_pin_enabled`
- 4-hour cooldown per customer-business pair
**Auto-enrolment:** Creates `business_customers` row if first visit.  
**Dependencies:** `/api/stamp/issue`, `src/lib/token.ts`.

---

### Feature 5: Reward Redemption

**Description:** When a customer completes a stamp card (reaches `stamps_required` stamps on the current cycle), they are eligible to redeem a reward.  
**Flow:** Customer sees "Ready to redeem" → taps claim → redemption code generated → business marks as redeemed.  
**Business rule:** `cards_redeemed` is incremented in `business_customers`. Stamp cycle resets automatically (modulo arithmetic).  
**Dependencies:** `/api/stamp/redeem`, `/redeem/[bizId]` page.

---

### Feature 6: Milestone Rewards

**Description:** Businesses can define custom rewards at specific visit thresholds (e.g. badge + reward at visit 15, 30, 50).  
**Conflict resolution:** When a stamp card completes AND a milestone is eligible simultaneously, `conflict_priority` determines order: `stamp` = give stamp first, defer milestone; `milestone` = give milestone first, defer stamp.  
**User value:** Surprise and delight moments beyond the basic stamp card.  
**Dependencies:** `milestones` table, `milestone_claims` table, `/api/stamp/issue` milestone logic, `RewardsTab.tsx`.

---

### Feature 7: Kiosk Mode

**Description:** Fullscreen mode for businesses to display a large QR code at the counter. Staff enter customer phone numbers directly. Wakelock prevents screen dimming.  
**Purpose:** Replaces the business owner's phone as the input device — a tablet or secondary screen shows the kiosk.  
**Staff flow:** Enter PIN → enter customer phone → stamp issued automatically.  
**Dependencies:** `KioskMode.tsx`, `/kiosk/[businessSlug]`, `/api/kiosk/stamp`.

---

### Feature 8: Google Review Bonus

**Description:** After a stamp is issued in kiosk mode, if the business has a Google Maps review link configured, a prompt appears offering one bonus stamp in exchange for a review.  
**Flow:** Stamp success → "Leave a review" prompt → customer taps "Open Google Review" → after 1 second delay → "Claim Bonus Stamp" button appears → bonus stamp issued.  
**One-time only:** `review_claimed` flag on `business_customers` prevents repeat claims.  
**Dependencies:** `business.gmb_link`, `/api/kiosk/review-bonus`, `review_claimed`.

---

### Feature 9: WhatsApp Campaigns

**Description:** Business owners can send a campaign message to opted-in customers, filtered by audience.  
**Audience segments:**
- All opted-in customers
- Inactive (no visit in 30+ days)
- Near reward (1–2 stamps away)
**Note:** Campaign records are created in the `campaigns` table. Actual message dispatch depends on an external WhatsApp API (currently recorded but not yet delivered via live integration).  
**Dependencies:** `/api/campaign/send`, `campaigns` table.

---

### Feature 10: Customer Loyalty Dashboard (/cards)

**Description:** A customer-facing page showing all their loyalty card progress across all enrolled businesses.  
**Identity:** Customer identifies by phone number. Session stored in `localStorage`.  
**Dependencies:** `/api/customer/profile`, `localStorage`.

---

### Feature 11: Individual Card View (/card/[token])

**Description:** Detailed stamp card for one business. Shows stamp progress, milestones, reward eligibility, and a "Scan QR to Stamp" button (opens camera scanner).  
**Reward result display:** Passed via `sessionStorage` from the scan page. Shown as a celebration banner.  
**Dependencies:** `/api/customer/by-token`, `StampCard.tsx`, `sessionStorage`.

---

### Feature 12: In-App QR Scanner (/scanner)

**Description:** Uses `BarcodeDetector` browser API to scan QR codes from the camera. Detects IntelliStamp scan URLs and redirects automatically.  
**Fallback:** For browsers that don't support `BarcodeDetector`, shows instructions to use the native camera app.  
**Dependencies:** `BarcodeDetector` browser API, `/scanner` page.

---

### Feature 13: Customer CSV Export

**Description:** Business owners can download all customers as a CSV file containing name, phone, stamp progress, lifetime visits, reward history, birthday, WhatsApp opt-in status, and milestone badges earned.  
**Dependencies:** `/api/business/export-customers`.

---

### Feature 14: Feature Toggles

**Description:** Business owners can toggle: Dynamic QR (on/off), Staff PIN (requires upgrade), WhatsApp campaigns (requires upgrade), 4-hour cooldown (always on, display only).  
**Dependencies:** `/api/business/update`, `FeatureToggles.tsx`.

---

## Business Rules

| Rule | Detail |
|---|---|
| Stamp cooldown | 4 hours per (customer, business) pair. Enforced server-side. |
| Token validity | 30-second windows. Current and previous window accepted. |
| Milestone conflict | Resolved by `conflict_priority` field on business. |
| Review bonus | One claim per customer per business lifetime. |
| Password minimum | 8 characters. |
| Staff PIN format | Exactly 4 digits. |
| Phone format | 10-digit Indian mobile (starts 6–9). |
| Stamps per card | 3 to 20 (configurable per business). |
| Campaign audience | Inactive = no stamp in 30 days. Near reward = 1–2 stamps remaining. |
| Customer token | UUID. Unique per customer. Used as URL-safe identifier. |
| Slug uniqueness | Derived from business name. 4-char UUID suffix added on collision. |

---

## Known Limitations

1. **WhatsApp dispatch not implemented.** Campaigns are recorded but not delivered via WhatsApp API. Requires Twilio/WABA integration.
2. **No real email notifications.** Reward events are visual only in the browser. No email/push.
3. **Single business per owner.** Dashboard shows one business per auth account.
4. **No offline mode.** Stamping requires internet connectivity.
5. **BarcodeDetector availability.** In-app scanner not supported on all browsers (see `/scanner` fallback).
6. **No refund / undo stamp** mechanism for staff errors.
7. **Redemption flow is partially implemented.** `/redeem/[bizId]` page exists but full staff-side confirmation UX is minimal.

---

## Future Opportunities

- Multi-location / franchise support
- Native iOS/Android app (PWA first)
- Stripe billing integration for plan upgrades
- WhatsApp Business API integration for real campaign delivery
- Email/SMS notification channels
- Advanced analytics (cohort, retention, LTV)
- Public business discovery page
- API access for POS integration
- Birthday reward automation
- Staff accounts with role-based access
