# IntelliStamp — Product Roadmap

**Version:** 1.0  
**Last Updated:** 2026-06-05

---

## Current State (v1.0)

### Shipped Features

| Feature | Status | Notes |
|---|---|---|
| Business onboarding (5-step wizard) | ✅ Live | Name, category, emoji, phone, stamps, reward, PIN, security mode, milestones |
| Dynamic QR code (30s rotating token) | ✅ Live | djb2 hash, current+previous window accepted |
| Customer identification (phone only) | ✅ Live | No app install, no password |
| Stamp issuance with cooldown (4h) | ✅ Live | Token + PIN validation; auto-enrol |
| Reward redemption | ✅ Live | `cards_redeemed` counter, redeemable flag |
| Milestone rewards | ✅ Live | Visit-count thresholds, conflict priority, `milestone_claims` |
| Kiosk mode (tablet/fullscreen) | ✅ Live | Staff enters phone, wakelock, QR display |
| Google Review bonus stamp | ✅ Live | One-time per customer, `review_claimed` flag |
| WhatsApp campaigns (record only) | ✅ Partial | DB record created; actual delivery not implemented |
| Customer `/cards` dashboard | ✅ Live | All loyalty cards in one view, phone lookup |
| Individual card view (`/card/[token]`) | ✅ Live | Stamp grid, milestone display, reward banner |
| In-app QR scanner (`/scanner`) | ✅ Live | BarcodeDetector API, fallback for unsupported browsers |
| Customer CSV export | ✅ Live | Full customer + stamp data |
| Business dashboard (stats + roster) | ✅ Live | Total customers, stamps, rewards redeemed |
| Feature toggles | ✅ Live | Dynamic QR, Staff PIN, WhatsApp, cooldown |
| GMB link management | ✅ Live | Set/edit from onboarding and dashboard Settings |
| Owner email in dashboard header | ✅ Live | — |
| Password show/hide on login/signup | ✅ Live | — |
| 404 → auto-redirect to onboarding | ✅ Live | For new owners with no business yet |

---

## P0 — Critical / Next Sprint

These are blockers or near-blockers for business viability.

### P0.1 — WhatsApp Campaign Delivery

**Problem:** Campaigns are recorded but never delivered. The feature is effectively non-functional.  
**Solution:** Integrate Twilio WhatsApp Business API or official WABA provider.  
**Effort:** Medium (3–5 days)  
**Dependencies:** Twilio/WABA account, webhook endpoint for delivery receipts  
**Impact:** Core monetisation feature — directly tied to plan upgrades

### P0.2 — Multi-Business Support Per Owner

**Problem:** One auth account = one business. The PRD acknowledges this as a known limitation.  
**Solution:** Allow `owner_id` to have multiple businesses. Update dashboard to support business selector.  
**Effort:** Medium (2–3 days)  
**Impact:** Blocks franchise/multi-location use case; frustrating for power users

### P0.3 — Redemption Flow (Staff Side)

**Problem:** `/redeem/[bizId]` page exists but has minimal UX. Staff have no clear confirmation step.  
**Solution:** Add proper staff confirmation screen — staff enters PIN to confirm redemption. Show reward name and customer name.  
**Effort:** Small (1–2 days)  
**Impact:** Redemption disputes — staff need to verify redemptions are legitimate

### P0.4 — Undo / Cancel Stamp

**Problem:** No way for staff to reverse an accidentally-issued stamp.  
**Solution:** Add "Undo last stamp" option (within 5 minutes) on dashboard QR stamper tab.  
**Effort:** Small (1 day)  
**Constraints:** Must not allow removal of older stamps — time-window only

---

## P1 — High Value / Next Quarter

### P1.1 — Stripe Billing Integration

**Description:** Gate "pro" features behind a paid plan. Charge monthly via Stripe.  
**Pro features (initial):** Staff PIN mode, WhatsApp campaigns, advanced analytics  
**Effort:** Large (5–8 days)  
**Dependencies:** Stripe account, webhook handler, plan enforcement in API routes

### P1.2 — Birthday Reward Automation

**Description:** Auto-send a reward (e.g. bonus stamp or voucher) to customers in their birthday month.  
**Implementation:** Cron job on Vercel, query customers WHERE birthday_month = current_month, send WhatsApp.  
**Effort:** Small–Medium (2–3 days)  
**Dependencies:** WhatsApp delivery (P0.1)

### P1.3 — Advanced Dashboard Analytics

**Description:** Charts and trends for stamp volume, reward redemption rate, customer retention.  
**Effort:** Medium (3–4 days)  
**Implementation:** Supabase aggregate queries, recharts/chart.js frontend

### P1.4 — Staff Accounts with Role-Based Access

**Description:** Business owner can create staff accounts (email + PIN). Staff can only access kiosk and QR stamper — not customer data or settings.  
**Effort:** Large (5–7 days)  
**Dependencies:** New `staff_accounts` table, separate auth flow

### P1.5 — PWA / Add to Home Screen

**Description:** Make the customer card view installable as a PWA so customers can add it to their home screen.  
**Implementation:** `manifest.json`, service worker, offline fallback  
**Effort:** Small (1–2 days)  
**Impact:** Higher return visit rate from customers

### P1.6 — Push Notifications (Web Push)

**Description:** Notify customers when their card is complete or when a milestone is earned.  
**Effort:** Medium (3–4 days)  
**Dependencies:** PWA (P1.5), service worker, push subscription management

---

## P2 — Future / Backlog

### P2.1 — Multi-Location / Franchise Support

**Description:** A single brand with multiple locations shares one stamp card. Stamps are earned at any location.  
**Effort:** Large (7–10 days)  
**Complexity:** High — requires location-level business records linked to a parent brand

### P2.2 — API Access (POS Integration)

**Description:** REST API with API key auth for POS system integration (e.g. Petpooja, Ginesys).  
**Effort:** Medium (3–5 days)  
**Enables:** B2B integrations without manual QR scanning

### P2.3 — Public Business Discovery Page

**Description:** A directory of businesses using IntelliStamp. Customers can find and enrol without scanning.  
**Effort:** Medium (3–4 days)

### P2.4 — Native iOS / Android App

**Description:** Wrapper app for the customer loyalty view. Improves camera performance vs. `BarcodeDetector` in browser.  
**Effort:** Large (10–20 days)  
**Alternative:** Improve PWA first

### P2.5 — Advanced Customer Segmentation

**Description:** Cohort analysis, LTV calculation, churn prediction. Export filtered segments.  
**Effort:** Large (7–10 days)

### P2.6 — Email / SMS Notifications

**Description:** Alternative to WhatsApp for markets where WhatsApp opt-in is low.  
**Effort:** Medium (3–5 days)  
**Dependencies:** Email provider (Resend/SendGrid), SMS provider (Twilio SMS)

### P2.7 — Business Logo / Branding Customisation

**Description:** Upload a business logo. Shown on customer card view instead of emoji.  
**Effort:** Small (1–2 days)  
**Dependencies:** Supabase Storage

### P2.8 — Campaign Scheduling

**Description:** Schedule a WhatsApp campaign to send at a future date/time.  
**Effort:** Medium (3–4 days)  
**Dependencies:** WhatsApp delivery (P0.1), Vercel Cron Jobs

---

## Versioning Strategy

IntelliStamp uses a milestone-based release cycle (not SemVer):

| Milestone | Theme | Key Deliverable |
|---|---|---|
| v1.0 (current) | Foundation | QR stamping, kiosk, milestones, dashboard |
| v1.1 | Monetisation | Stripe billing, WhatsApp delivery |
| v1.2 | Retention | Birthday rewards, push notifications, PWA |
| v2.0 | Scale | Multi-location, staff accounts, POS API |
