# IntelliStamp Security Threat Model & Threat Matrix

---

## 1. System Boundary and Assets

IntelliStamp handles sensitive business metrics and customer phone numbers. The key components and boundaries include:

* **Customer Loyalty Token (UUID):** The credential stored in `localStorage` that grants access to a user's loyalty card details.
* **Staff validation PIN:** A 4-digit PIN configured by the owner for manual validation in kiosk mode.
* **Dynamic QR Tokens:** Cryptographically signed time-based tokens that authenticate a scan event.

---

## 2. Threat Modeling (STRIDE Methodology)

| Category | Threat | Target / Component | Severity | Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker spoofs a business scan by guessing or reusing a QR token. | Dynamic QR Scan (`/api/stamp/issue`) | **Medium** | Sign tokens with a cryptographically secured timestamp using unique server secrets. |
| **Tampering** | Attacker makes direct database inserts/updates to inflate stamp counts. | Supabase Database (`stamps` table) | **High** | Harden Supabase RLS policies. Drop public anonymous write access. |
| **Repudiation** | Attacker claims a valid stamp was issued by staff when it was not. | `/api/stamp/issue` / `stamps` | **Low** | Log all stamp events (staff manual PIN vs dynamic QR) with type fields. |
| **Info Leak** | Attacker enumerates phone numbers to scrape customer tokens and checkins. | `/api/customer/recover` | **High** | Implement owner PIN challenge or staff-mediated recovery instead of auto-leak. |
| **Denial of Service**| Attacker floods stamp issue endpoints, locking records or database. | `/api/stamp/issue` | **Medium** | Apply rate limiters to unauthenticated API routes (currently 10 req/15 min). |
| **Elevation of Priv.**| Attacker updates business details of another tenant (IDOR). | `PATCH /api/business/update` | **High** | Secure all writing endpoints using `requireUserAndBusiness` ownership check. |

---

## 3. Vulnerability Analysis & Risk Matrix

### [P0] Blocker 1: Public Anonymous Database Read/Write Backdoors
* **Location:** `schema.sql` (line 164 - 184)
* **Vulnerability:** Row Level Security (RLS) policies on sensitive tables use `true` for public access.
* **Exploit Scenario:**
  ```javascript
  // Any user with anon key can run this directly in the browser console:
  await supabase.from('stamps').insert({ customer_id: '...', business_id: '...' })
  ```
* **Impact:** High. Complete data leakage, manipulation of stamp metrics, and unauthorized card redemptions.
* **Short-Term Fix:** Drop the `Allow all` policies. Let Supabase default to denying access for the anon/authenticated key. Server routes run as `service_role` and bypass RLS automatically.

### [P0] Blocker 2: Customer Token Leakage (Account Hijacking)
* **Location:** `/api/customer/recover` (line 54 - 67) and `/api/customer/identify`
* **Vulnerability:** Unauthenticated endpoints return the full `customer_token` UUID by querying the phone number.
* **Exploit Scenario:** Attacker calls `/api/customer/recover` with a list of random phone numbers, collects active `customer_token` UUIDs, and loads them into their browser's local storage to hijack those loyalty wallets.
* **Impact:** High. Account takeover of customer cards and unauthorized reward redemptions.
* **Short-Term Fix:** Require staff PIN confirmation to regenerate or retrieve a token, or restrict the recovery flow during the pilot.

---

## 4. OWASP ASVS Compliance Checklist

* **V2: Authentication Verification:**
  - *Status:* **Fail** due to unauthenticated customer recovery path.
* **V3: Session Management:**
  - *Status:* **Pass** (Tokens stored in browser's local storage represent session; business owner uses secure Supabase auth cookies).
* **V4: Access Control (IDOR):**
  - *Status:* **Pass** (Owner-level operations are secure via `requireUserAndBusiness` ownership checks).
* **V5: Validation, Sanitization & Encoding:**
  - *Status:* **Pass** (Zod validation schemas are enforced on all critical endpoints).
* **V8: Data Protection (Secrets):**
  - *Status:* **Pass** (Sensitive variables are locked in server environments).
