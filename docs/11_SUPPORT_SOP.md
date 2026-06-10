# IntelliStamp — Support SOP

**Version:** 1.0  
**Last Updated:** 2026-06-05  
**Audience:** IntelliStamp support team

---

## Support Channels

| Channel | SLA | Notes |
|---|---|---|
| WhatsApp (owner) | 4 hours (business hours) | Primary channel for business owners |
| Email | 24 hours | Formal issues, billing |
| In-app feedback | 48 hours | Future implementation |

**Business hours:** 9am–7pm IST, Monday–Saturday

---

## Issue Classification

| Severity | Definition | Response Time |
|---|---|---|
| P1 — Critical | System down, stamps not issuing for any business | < 1 hour |
| P2 — High | A business cannot use a core feature | < 4 hours |
| P3 — Medium | Feature degraded, workaround exists | < 24 hours |
| P4 — Low | UI glitch, cosmetic issue | < 72 hours |

---

## Playbook: Stamp Not Issuing

**Reported as:** "QR not working", "Stamp not going through", "Error when scanning"

### Triage Steps

1. Ask for the **exact error message** shown on screen
2. Ask which **device and browser** the customer is using
3. Ask if the error is for **one customer or all customers**

### Resolution by Error

| Error Message | Cause | Fix |
|---|---|---|
| "Invalid or expired token. Please scan the QR again." | Customer scanned a screenshot or waited >60s | Advise to scan the live QR code displayed at the business |
| "Invalid staff PIN" | Wrong PIN entered | Confirm PIN in dashboard Settings tab → Security → Staff PIN |
| "You already stamped recently. Next stamp available in Xh." | 4-hour cooldown active | Expected behaviour. Advise customer to return after the cooldown. |
| "Business not found" | Invalid QR code or deleted business | Check if business exists in dashboard; regenerate QR |
| 500 error / blank screen | Server error | Escalate to engineering; check Vercel deployment logs |

---

## Playbook: Customer Can't See Their Stamps

**Reported as:** "My stamps aren't showing", "Card is empty", "I can't find my loyalty card"

### Triage Steps

1. Ask what **phone number** the customer used to stamp
2. Ask if they are on the **same device** they scanned with
3. Ask them to go to the **cards page** (`/cards`) and enter their phone number

### Resolution

| Scenario | Fix |
|---|---|
| Customer used a different phone number each time | Stamps are stored per phone number. Cannot merge accounts in v1.0. Advise consistent phone number going forward. |
| Customer cleared browser data / switched device | `localStorage` session lost. They can re-identify by entering their phone on `/cards`. Their stamps are still on the server. |
| Stamp shows on dashboard but not on card | Ask customer to hard-refresh (`Ctrl+Shift+R` or clear cache). |
| Stamp count looks wrong | Check dashboard Customers tab — compare total stamps shown there vs. what customer expects. |

---

## Playbook: Login / Account Access

**Reported as:** "I can't log in", "Forgot password", "Account locked"

### Steps

1. Confirm the email address used to sign up
2. Ask them to try **Forgot Password** on the login page
3. If no reset email arrives: check spam folder; wait 2 minutes
4. If still no access: escalate to engineering for Supabase Admin password reset

### Engineering Escalation: Manual Password Reset

In Supabase Dashboard:
1. Authentication → Users
2. Find the user by email
3. Click **...** → **Send password recovery email**, or **Reset password** (sets a temporary password)

---

## Playbook: Dashboard Not Loading / Showing Wrong Data

**Reported as:** "Dashboard is blank", "I don't see my customers", "Stats are wrong"

### Steps

1. Ask them to **hard-refresh** the dashboard (`Ctrl+Shift+R`)
2. Ask them to **log out and log back in** (clears session state)
3. If the Customers tab is empty but stamps have been issued: check if the `owner_id` on the business matches their auth user ID
4. If dashboard redirects to `/onboarding` loop: their business creation may have failed — check Supabase `businesses` table for their `owner_id`

---

## Playbook: Google Review Bonus Not Showing

**Reported as:** "The review button isn't appearing", "Kiosk doesn't show review option"

### Triage

1. Is the business using **kiosk mode** (`/kiosk/[slug]`)? The review bonus only appears in kiosk mode, not in the regular QR stamp flow.
2. Does the business have a **Google Maps review link** configured? Check: Dashboard → Settings → Google Review Link.
3. Has the specific customer already claimed their review bonus? The `review_claimed` flag is one-time per customer per business.

### Resolution

| Scenario | Fix |
|---|---|
| `gmb_link` not set | Owner goes to Dashboard → Settings → Google Review Link → set it |
| Customer already claimed | Expected behaviour. Cannot be reset in v1.0. |
| Not using kiosk mode | Advise owner to use `/kiosk/[slug]` instead of the dashboard QR |

---

## Playbook: WhatsApp Campaign Not Delivered

**Reported as:** "I sent a campaign but customers didn't get the message"

### Resolution

This is a **known limitation in v1.0**. WhatsApp delivery is not yet implemented. Campaigns are recorded in the database (`campaigns` table) but no messages are sent.

**Script for owner:**
> "WhatsApp campaign delivery is coming soon. For now, the campaign records your intended audience and message. We'll notify you when live delivery is enabled on your plan."

Do not escalate to engineering — this is expected behaviour.

---

## Playbook: CSV Export Issues

**Reported as:** "Export isn't downloading", "CSV file is empty"

### Steps

1. Confirm they are on the **Customers tab** in the dashboard
2. Ask them to click **Export CSV** button
3. If nothing downloads: check browser download permissions / pop-up blocker
4. If CSV downloads but is empty: check if any customers have stamped at this business

### CSV Column Reference

```
name, phone, current_cycle_stamps, lifetime_visits, last_visit_at,
rewards_earned, rewards_redeemed, whatsapp_optin,
birthday_month, birthday_day, enrolled_at, milestone_badges_earned
```

---

## Playbook: BarcodeDetector Not Working

**Reported as:** "Camera won't open", "QR scanner says unsupported"

### Resolution

This is a **browser compatibility issue**. `BarcodeDetector` is only available on Chrome/Android.

| Browser | Supported |
|---|---|
| Chrome (Android, Desktop) | Yes |
| Samsung Internet | Yes |
| Safari (iOS 17+) | Partial — test needed |
| Firefox | No |

**Workaround:** Instruct the customer to use their device's native camera app to scan the QR code. The QR code encodes a URL — any camera that can scan QR codes will open it in the browser.

---

## Escalation to Engineering

Escalate when:
- A stamp is issued but `card_state` shows incorrect counts
- Supabase returns `500` errors for multiple businesses
- Authentication tokens are not persisting (users being logged out unexpectedly)
- Any data inconsistency between dashboard stats and actual stamp records

**What to include in the escalation:**
1. Business name or ID (from Supabase `businesses` table)
2. Customer phone number (if relevant)
3. Exact error message or screenshot
4. Time the issue occurred (IST)
5. Steps to reproduce

**Escalation contact:** Engineering Slack channel / GitHub Issues

---

## Data Requests (GDPR / Privacy)

If a customer requests deletion of their data:
1. Find their record in Supabase `customers` table by phone number
2. Delete the `customers` row — this cascades to `stamps`, `business_customers`, `milestone_claims`
3. Confirm deletion to the requester in writing

If a business owner requests account deletion:
1. Delete from Supabase Authentication → Users
2. Delete the `businesses` row — cascades to all business-related data
3. Note: customer records are shared across businesses. Deleting a business does not delete customers.
