# IntelliStamp — Pricing & Packaging

**Version:** 1.0  
**Last Updated:** 2026-06-05  
**Status:** Draft — billing not yet implemented in product

---

## Overview

IntelliStamp uses a freemium model. The free plan provides core stamping functionality. Paid plans unlock customer communication (WhatsApp campaigns), advanced security, and analytics features.

Billing is not implemented in v1.0. Plan enforcement is tracked via the `plan` field (`'free'` or `'pro'`) on the `businesses` table. Stripe integration is on the roadmap.

---

## Plans

### Starter — Free

**Target:** New businesses, trial users, small shops (<30 customers/day)

| Feature | Included |
|---|---|
| Stamp card (custom stamps, reward, PIN) | ✅ |
| Dynamic QR code (30s rotation) | ✅ |
| Dashboard — customer list | ✅ Up to 100 customers |
| Milestone rewards | ✅ Up to 2 milestones |
| Kiosk mode | ✅ |
| Google Review bonus | ✅ |
| CSV export | ✅ |
| Staff PIN mode | ❌ |
| WhatsApp campaigns | ❌ |
| Advanced analytics | ❌ |
| Priority support | ❌ |

**Price:** ₹0 / month

---

### Growth — Pro

**Target:** Active businesses with repeat customers who want engagement tools

| Feature | Included |
|---|---|
| Everything in Starter | ✅ |
| Unlimited customers | ✅ |
| Staff PIN mode | ✅ |
| WhatsApp campaigns (all segments) | ✅ |
| Milestone rewards — unlimited | ✅ |
| Advanced analytics (charts, trends) | ✅ |
| Birthday reward automation | ✅ |
| Priority support (4h SLA) | ✅ |

**Price:** ₹999 / month (annual: ₹799/month billed ₹9,588/year)

---

### Business — Scale

**Target:** Multi-staff businesses, franchises, high-volume locations

| Feature | Included |
|---|---|
| Everything in Growth | ✅ |
| Staff accounts (up to 5 staff logins) | ✅ |
| Multi-location support | ✅ |
| Campaign scheduling | ✅ |
| API access | ✅ |
| Dedicated onboarding call | ✅ |
| SLA: same-day support | ✅ |

**Price:** ₹2,499 / month (annual: ₹1,999/month billed ₹23,988/year)

---

### Enterprise — Custom

**Target:** Chains, franchise networks, POS-integrated businesses (50+ locations)

| Feature | Included |
|---|---|
| Everything in Scale | ✅ |
| Custom milestones and rewards logic | ✅ |
| POS integration (Petpooja, Ginesys) | ✅ |
| White-label branding | ✅ |
| Dedicated account manager | ✅ |
| SLA: 2-hour response, 99.9% uptime SLA | ✅ |
| Custom contract | ✅ |

**Price:** Custom — contact sales

---

## Add-Ons (Future)

| Add-On | Price | Notes |
|---|---|---|
| Extra WhatsApp messages (beyond plan limit) | ₹0.20 / message | Once WhatsApp delivery is live |
| Additional business location | ₹499 / location / month | On Scale plan |
| Data archiving (>12 months retention) | ₹199 / month | Future feature |

---

## Trial Policy

- Free plan is permanent — no trial period or expiry
- Growth plan: 14-day free trial (no credit card required)
- Trial → paid: automatic upgrade or manual plan selection

---

## Refund Policy

- Monthly plans: no refunds on partial months
- Annual plans: pro-rated refund within 30 days of purchase
- Trials: no charge until trial ends

---

## Plan Enforcement (Technical)

Current state: Not enforced in code. The `plan` field exists on the `businesses` table but feature toggles are not gated by plan.

**Planned enforcement:**
- Staff PIN → check `business.plan === 'pro'`
- WhatsApp campaigns → check `business.whatsapp_enabled && business.plan === 'pro'`
- Campaign audience segments → only `'all'` on free plan; `'inactive'` and `'near_reward'` on pro

**Implementation path:** Stripe webhooks update `plan` field. API routes check plan tier before executing gated actions.

---

## Competitive Positioning

| Platform | Price | Target | Key gap vs. IntelliStamp |
|---|---|---|---|
| Yotpo Loyalty | Custom (₹20,000+/mo) | Enterprise e-commerce | Too expensive, requires tech setup |
| Antavo | Custom | Enterprise | No SMB plan, complex |
| Stamp Me | ~₹500–1,500/mo | SMB | App install required; limited to English |
| Loyverse | Free–₹1,500/mo | Retail / POS | POS-first, not QR-first |
| Paper punch cards | ₹0 | All | No data, easily forged, lost by customers |

**IntelliStamp's advantage:** Zero app install (web-only), fastest setup (<10 min), Indian market focus, WhatsApp-native.

---

## Discount & Partnership Guidelines

| Scenario | Discount |
|---|---|
| Annual payment | 20% off monthly rate |
| NGO / educational institution | 50% off Growth plan — requires verification |
| Referral (existing customer) | 1 month free for referrer + 1 month free for new customer |
| Business association / chamber of commerce bulk | Custom — contact sales |
