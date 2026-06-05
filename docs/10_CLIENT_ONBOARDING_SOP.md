# IntelliStamp — Client Onboarding SOP

**Version:** 1.0  
**Last Updated:** 2026-06-05  
**Audience:** IntelliStamp sales and onboarding team

---

## Overview

This SOP covers the end-to-end process for onboarding a new business client onto IntelliStamp — from first contact to their first real customer stamp.

---

## Stage 1: Lead Qualification

**Goal:** Confirm the lead is a fit before investing onboarding time.

### Qualifying Questions

1. What type of business? *(Cafe, Salon, Gym, Restaurant, Jewellery, Spa, Bakery, Other)*
2. How many customers per day? *(Target: 20–500/day)*
3. Do you currently run any loyalty programme? *(Paper card, none, other app)*
4. Do you have a smartphone at your counter? *(Required for QR display)*
5. Do you have a Google Maps business listing? *(Optional — enables review bonus feature)*

### Disqualifying Criteria

- Fewer than 10 customers per day (ROI too low for the business)
- B2B or service business with no walk-in customers
- Business that requires POS integration (not supported in v1.0)

---

## Stage 2: Account Creation

**Who does this:** The business owner, with guidance from onboarding agent if needed.

### Steps

1. Direct business owner to the signup page
2. They create an account with their **business email** and a password (min 8 characters)
3. After signup, they are auto-redirected to `/onboarding`

**Common issue:** Owner uses a personal Gmail instead of a business email. This is fine — it's just the login credential, not shown to customers.

---

## Stage 3: Onboarding Wizard Walk-Through

The onboarding wizard has 5 steps. Walk the owner through each step on a call or via a quick video guide.

### Step 1: Business Info

| Field | Guidance |
|---|---|
| Business name | Use the name customers know (e.g. "Cafe Mocha", not "Mocha Ventures Pvt Ltd") |
| Category | Pick the closest match. "Other" is fine. |
| Emoji | Fun branding element. Recommend ☕ for cafes, ✂️ for salons, 💪 for gyms. |
| Phone number | Owner's mobile — used for support contact, not shown to customers |

### Step 2: Stamp Card Setup

| Field | Guidance |
|---|---|
| Stamps required | Recommend 6–8. Too low (3–4) = reward feels cheap. Too high (12+) = customers lose motivation. |
| Reward | Be specific: "Free coffee" not "Free item". Customers see this. |
| Staff PIN | 4 digits. Write it down. Don't use "1234" or "0000". |
| Google Review link | Paste the Google Maps review URL. Enables the review bonus feature. |

**How to get the Google Review link:**
1. Search the business on Google Maps
2. Click "Write a review"
3. Copy the URL from the browser address bar
4. Alternatively: Google Business Profile → Get more reviews → Copy link

### Step 3: Security Mode

| Mode | Setting | Use Case |
|---|---|---|
| Basic | Dynamic QR on, PIN off | Counter with tablet; staff watches |
| Smart | Dynamic QR on, PIN on | Self-service or high-fraud risk |
| Strict | Dynamic QR on, PIN on | Same as Smart but PIN required every time |

**Recommendation:** Start with Basic. Enable Staff PIN only if the owner reports stamp abuse.

### Step 4: Milestones (Optional)

Milestones are bonus rewards at specific visit counts (e.g. "Free latte on 15th visit").

**Recommendation for first setup:** Skip milestones initially. Add them after the basic card is working and the owner understands the product.

**If setting milestones:**
- Use visit numbers that feel meaningful: 10, 25, 50
- Keep rewards achievable: a free item, a discount, not a free service worth ₹2000+
- Set conflict priority to "Stamp first" (default) unless owner explicitly wants milestone to show first

### Step 5: Go Live

Owner is shown their QR code. The business is live.

---

## Stage 4: Go-Live Testing

**Goal:** Confirm the stamp flow works before the owner starts using it with real customers.

### Test Checklist

1. **Display the QR code** on the dashboard QR Stamper tab
2. **Scan it with a test phone** — should open `/scan/[bizId]?t=...`
3. **Enter a test phone number** (owner's own phone is fine)
4. **Enter a name** → stamp should issue
5. **Verify the stamp appears** on the card view
6. **Check the dashboard** → customer appears in Customers tab

### Common Issues at Go-Live

| Issue | Cause | Fix |
|---|---|---|
| "Invalid or expired token" | Scanned an old screenshot of the QR | Scan the live QR directly |
| "Invalid staff PIN" | PIN mistyped | Confirm PIN in Settings → Security |
| Stamp issued but customer card shows 0 | localStorage issue on test phone | Hard-refresh the card page |
| QR code not displaying | Dashboard not loaded / business not created | Reload dashboard; check onboarding completed |

---

## Stage 5: Owner Training (10-Minute Walkthrough)

Cover these topics with the owner:

### Dashboard Tabs

| Tab | What it shows |
|---|---|
| QR Stamper | The rotating QR code + optional staff validator |
| Customers | All customers, stamps, last visit, redemption status |
| Rewards | Milestone configuration |
| Campaigns | Send a WhatsApp message to customer segments |
| Settings | GMB link, feature toggles, export CSV |

### Daily Operations

- **Stamping:** Leave the QR Stamper tab open on a tablet at the counter. Customers scan it themselves.
- **Kiosk mode:** Use `/kiosk/[slug]` on a dedicated tablet for a more polished customer experience.
- **Rewarding customers:** When `can_redeem` shows on a customer's card, direct them to `/redeem/[bizId]`.
- **Review bonus:** Works automatically if `gmb_link` is set and kiosk mode is used.

### Key Business Rules to Explain

- Stamps have a **4-hour cooldown** per customer per business. Prevents gaming.
- The QR code **rotates every 30 seconds**. Screenshots don't work after 30 seconds.
- Customer data is **never deleted** — even if a customer stops visiting, their history is preserved.

---

## Stage 6: Post-Onboarding Follow-Up

### Day 1

- Check if the owner has issued their first real stamp (visible in Customers tab)
- Resolve any technical issues reported

### Day 7

- Review customer count on dashboard
- If >0 customers: confirm owner knows how to view and export data
- If 0 customers: diagnose — is the QR displayed? Is staff trained?

### Day 30

- Review total stamps and rewards redeemed
- Suggest enabling milestones if >20 customers enrolled
- Discuss upgrading to Pro plan if WhatsApp campaigns are relevant

---

## Escalation Paths

| Issue | Who to contact |
|---|---|
| Technical bug (stamp not issuing, QR broken) | Engineering — open GitHub issue or direct message |
| Account access lost (owner forgot password) | Supabase Auth → Users → Reset password |
| Billing question | Account manager |
| Data export request (GDPR/privacy) | Engineering — manual CSV export via dashboard |

---

## Quick-Start Video Script (2 Minutes)

> "Welcome to IntelliStamp. I'm going to show you how to get your loyalty programme running in under 2 minutes.
>
> After signing up, you'll be on the setup wizard. Enter your business name, pick a category, and choose an emoji.
>
> Next, set how many stamps earn a reward — I recommend 6. Type your reward name — like 'Free coffee' — and create a 4-digit staff PIN.
>
> Now go to your dashboard. You'll see your QR code. This is what your customers scan.
>
> Pull out your phone, open the camera, and scan it. Enter a phone number — use yours to test. And done — your first stamp!
>
> Check the Customers tab on your dashboard. You're there.
>
> That's it. Display this QR code at your counter. Every scan earns a stamp. When a customer fills their card, they get your reward automatically."
