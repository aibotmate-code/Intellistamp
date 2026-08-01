# IntelliStamp QA Test Matrix

---

## 1. Test Coverage Overview
* **Total Jest Tests:** 139 Tests (13 Suites)
* **Unit Test Coverage:** 88% (business logic, helpers, and verification rules)
* **API Integration Coverage:** 92% (routes mock auth and Supabase DB transactions)
* **End-to-End Playwright Coverage:** **0%** (Blocker: Needs Playwright configuration and coverage)

---

## 2. Test Cases Matrix

| # | Journey Scenario | Action / Input | Expected Outcome | Boundary / Verification |
|---|---|---|---|---|
| **1** | Business Signup/Login | POST `/api/auth/signup` with valid email & password. | User created, database confirmed, 200 returned. | Minimum password length (8 chars), duplicate email returns 400. |
| **2** | Suspended Business | GET `/api/business/get` where `plan = 'suspended'`. | Returns business metadata but block issue operations. | Co-branding features automatically fall back to unbranded default. |
| **3** | Onboarding Flow | POST `/api/business/create` with valid fields. | Hashed staff PIN created, business single row inserted. | Validates PIN is exactly 4 digits. Emoji check between 1-4 characters. |
| **4** | QR Token Validation | Validate dynamic token timestamp in `/api/stamp/issue`. | Checks if timestamp is inside the window. | Expired token returns 401. Replay token returns 409 conflict. |
| **5** | New Customer Signup | POST `/api/customer/identify` with new phone. | Customer row inserted, customer_token returned. | Phone format normalized (Indian mobile format: regex `/^[6-9]\d{9}$/`). |
| **6** | Existing Customer | POST `/api/customer/identify` with existing phone. | Returns existing profile (UUID token). | No duplicate customer rows created in `customers` table. |
| **7** | Browser Recovery | POST `/api/customer/recover` with enrolled phone. | Returns wallet credentials. | Exposes customer token UUID. Needs token hardening check. |
| **8** | Staff Lookup | POST `/api/business/customer-lookup` with phone. | Returns matches for this business context. | Staff PIN must be supplied. Cross-tenant queries return empty/404. |
| **9** | Kiosk Stamping | POST `/api/kiosk/stamp` with staff PIN. | PIN verified, stamp issued, metrics incremented. | Cooldown checked (4 hours). Incorrect PIN returns 401. |
| **10** | Cooldown Enforcement | Issue two stamps for same customer within 4 hours. | Second request blocked with 429 status code. | Tested under parallel concurrency (handled by DB trigger lock). |
| **11** | Multi-screen scans | Concurrent scans of same token by multiple browsers. | First insert succeeds. Subsequent attempts fail with 409. | Checked via unique `stamp_token` constraint on `stamps` table. |
| **12** | Milestones claims | Exceed visit target for active milestone. | Claim inserted into `milestone_claims` table. | Checked via unique milestone constraint to prevent duplicate claims. |
| **13** | Reward Eligibility | Check completed cards count inside `/api/stamp/redeem`. | Returns eligibility value based on stamps count. | `cards_redeemed` checked. If zero finished cards, returns 400. |
| **14** | Reward Redemption | POST `/api/stamp/redeem` to obtain verification code. | Increment `cards_redeemed` counter, returns code. | Optimistic locking prevents double counter increment (returns 409 conflict). |
| **15** | Review Bonus Stamp | Issue stamp with `type = 'bonus_review'`. | Stamp created, `review_claimed` set to true. | Customers can only receive one review stamp (verified via DB check). |
| **16** | Branding preview | Render `<StampCard>` inside `BrandingWrapper`. | Renders correctly using CSS variable overrides. | Falls back to default colors if custom branding disabled. |
| **17** | Cross-tenant isolation | Authenticated Owner A updates Owner B's settings. | Blocked with 404/403 status code. | Owner check enforced on all endpoints via `requireUserAndBusiness`. |
| **18** | File Uploads | Upload 3 MB executable file instead of logo. | Rejected with 400 error. File is not written to bucket. | Enforces 2 MB size limits and checks image signatures (PNG/JPG/WebP). |
| **19** | API Rate Limiting | Trigger `/api/auth/signup` 6 times within 15 minutes. | 6th call blocked with 429 status. | Rate limit keys scoped to caller IP. |
| **20** | Database Timeout | Mock DB connection failure on API call. | Returns 500 error with generic "Something went wrong". | No raw database logs or stack traces exposed to client. |
