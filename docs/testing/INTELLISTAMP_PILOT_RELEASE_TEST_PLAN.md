# IntelliStamp Pilot Release Test Plan

This document defines the comprehensive test plan to validate IntelliStamp's readiness for a 1–3 merchant pilot. 

**Important:** All results are marked `NOT TESTED` initially. A test should only be marked `PASS` after explicit manual verification on the deployed Preview/Staging environment. Automated test existence does not grant an automatic `PASS` for a manual test flow.

---

## 1. BUSINESS SIGNUP & ONBOARDING

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ONB-01 | P0 | Onboarding | New signup | No active session | 1. Go to signup<br>2. Enter email/password<br>3. Submit | Account created, redirected to onboarding | Both | Partial | NOT TESTED | DB row: `auth.users`, Screenshot | |
| ONB-02 | P0 | Onboarding | Login | Existing account | 1. Go to login<br>2. Enter credentials<br>3. Submit | Logs in successfully, redirects to dashboard (if onboarded) | Both | Partial | NOT TESTED | API response: 200 OK | |
| ONB-03 | P0 | Onboarding | Logout | Active session | 1. Click logout in dashboard | Session cleared, redirected to login | Both | No | NOT TESTED | Network tab: cookie cleared | |
| ONB-04 | P1 | Onboarding | Session persistence | Active session | 1. Login<br>2. Close tab<br>3. Reopen tab | Session persists, no re-login needed | Manual | No | NOT TESTED | Screenshot | |
| ONB-05 | P0 | Onboarding | Full onboarding flow | New signup | 1. Complete all 5 steps | Business created successfully, shows "Review in progress" | Both | Partial | NOT TESTED | DB row: `businesses`, Screenshot | |
| ONB-06 | P1 | Onboarding | Duplicate onboarding | Existing business | 1. Revisit /onboarding | Redirects to dashboard | Manual | No | NOT TESTED | Network tab: 302 Redirect | |
| ONB-07 | P0 | Onboarding | Default to pending | New signup completes onboarding | 1. Check DB or UI | Status is `pending` | Both | Yes | NOT TESTED | DB value: `approval_status = 'pending'` | |
| ONB-08 | P1 | Onboarding | Missing fields | In step 1-4 | 1. Leave required fields blank<br>2. Click next | Validation errors show | Both | No | NOT TESTED | Screenshot | |
| ONB-09 | P2 | Onboarding | Mobile onboarding | Mobile viewport | 1. Complete onboarding on phone | UI renders correctly, no overflow | Manual | No | NOT TESTED | Screenshot | |

## 2. BUSINESS LIFECYCLE (UI & API)

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LIF-01 | P0 | Lifecycle | Pending gating UI | Status: pending | 1. Visit /dashboard | Shows "Review in progress" screen, no operational tabs | Manual | No | NOT TESTED | Screenshot | |
| LIF-02 | P0 | Lifecycle | Suspended gating UI | Status: suspended | 1. Visit /dashboard | Shows Suspended screen | Manual | No | NOT TESTED | Screenshot | |
| LIF-03 | P0 | Lifecycle | Expired gating UI | Status: expired | 1. Visit /dashboard | Shows Expired screen | Manual | No | NOT TESTED | Screenshot | |
| LIF-04 | P0 | Lifecycle | Rejected gating UI | Status: rejected | 1. Visit /dashboard | Shows Rejected screen | Manual | No | NOT TESTED | Screenshot | |
| LIF-05 | P0 | Lifecycle | API Gating: Pending | Status: pending | 1. Call /api/stamp/issue with valid token | API returns 403 / "Business is pending" | Automated | Yes | NOT TESTED | API response: 403 | |
| LIF-06 | P0 | Lifecycle | API Gating: Suspended | Status: suspended | 1. Call /api/stamp/issue with valid token | API returns 403 / "Business is suspended" | Automated | Yes | NOT TESTED | API response: 403 | |
| LIF-07 | P0 | Lifecycle | API Gating: Rejected | Status: rejected | 1. Call /api/stamp/issue with valid token | API returns 403 / "Business is rejected" | Automated | Yes | NOT TESTED | API response: 403 | |
| LIF-08 | P0 | Lifecycle | API Gating: Expired | Status: expired | 1. Call /api/stamp/issue with valid token | API returns 403 / "Plan expired" | Automated | Yes | NOT TESTED | API response: 403 | |

## 3. ADMIN

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ADM-01 | P0 | Admin | Admin login | Admin email | 1. Login with admin credentials | Success | Manual | No | NOT TESTED | API response | |
| ADM-02 | P0 | Admin | Admin access | Admin session | 1. Visit /admin | Admin dashboard loads | Manual | No | NOT TESTED | Screenshot | |
| ADM-03 | P0 | Admin | Unauthorized access | Normal business | 1. Visit /admin | Redirects to /dashboard or 404 | Both | Yes | NOT TESTED | Network tab: 302 or 404 | |
| ADM-04 | P0 | Admin | Business list | Admin session | 1. View /admin | Shows all businesses, owner emails | Manual | No | NOT TESTED | Screenshot | |
| ADM-05 | P0 | Admin | Approve business | Pending business | 1. Click approve in admin | Business becomes active | Manual | No | NOT TESTED | DB value updated | |
| ADM-06 | P0 | Admin | Suspend business | Active business | 1. Click suspend | Business becomes suspended | Manual | No | NOT TESTED | DB value updated | |
| ADM-07 | P1 | Admin | Missing owner | DB modified to remove owner | 1. View /admin | Doesn't crash, shows gracefully | Manual | No | NOT TESTED | Screenshot | |

## 4. CORE STAMP FLOW

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FLO-01 | P0 | Stamp Flow | Golden Path | Active business | 1. Customer scans QR<br>2. Enters phone<br>3. Receives stamp | Stamp issued, UI updates | Both | Partial | NOT TESTED | DB row: `stamps`, Screenshot | |
| FLO-02 | P0 | Stamp Flow | Returning customer | Existing customer | 1. Scan QR<br>2. View card | Shows correct previous stamps | Both | Yes | NOT TESTED | Screenshot | |
| FLO-03 | P1 | Stamp Flow | Cooldown delay | Stamped within 4 hrs | 1. Try to stamp again | Rejected with 4 hours cooldown message | Both | Yes | NOT TESTED | API response | |
| FLO-04 | P0 | Stamp Flow | Concurrent requests | Customer scanning twice rapidly | 1. Fire two requests simultaneously | Only 1 stamp issued | Automated | Yes | NOT TESTED | DB row check (only 1 row added) | |
| FLO-05 | P0 | Stamp Flow | Expired QR | QR token > 60s old (Server enforced) | 1. Scan old QR | Rejected, ask to rescan | Automated | Yes | NOT TESTED | API response: 401 | |
| FLO-06 | P1 | Stamp Flow | Network interruption | Mid-stamp | 1. Throttle network, disconnect | Graceful error, no partial state | Manual | No | NOT TESTED | Screenshot of error | |

## 5. QR / COUNTER DISPLAY

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| QRC-01 | P0 | Counter | Auto-refresh | Auto-Refresh QR active | 1. Open Counter Display<br>2. Wait 30s UI / 60s Server | Token changes in UI, server expires at 60s | Manual | No | NOT TESTED | Screenshot | |
| QRC-02 | P1 | Counter | Full screen | Any | 1. Click Open Counter Display | Enters full screen mode | Manual | No | NOT TESTED | Screenshot | |
| QRC-03 | P2 | Counter | Mobile rendering | Mobile viewport | 1. Open Counter Display | Looks correct on mobile | Manual | No | NOT TESTED | Screenshot | |

## 6. STAFF PIN

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PIN-01a| P0 | Staff PIN | Set PIN (Free) | Free plan | 1. Go to Settings<br>2. Toggle Staff PIN | Blocked, Upgrade prompt shown | Both | Partial | NOT TESTED | Screenshot | |
| PIN-01b| P0 | Staff PIN | Set PIN (Pro) | Pro plan | 1. Go to Settings<br>2. Set 4 digit PIN | Saves successfully | Both | Partial | NOT TESTED | DB row: `businesses.staff_pin_hash` | |
| PIN-02 | P0 | Staff PIN | Correct PIN | Staff verified mode | 1. Customer scans<br>2. Staff enters correct PIN | Stamp issued | Both | Yes | NOT TESTED | API response: 200 OK | |
| PIN-03 | P0 | Staff PIN | Incorrect PIN | Staff verified mode | 1. Customer scans<br>2. Staff enters wrong PIN | Stamp rejected | Both | Yes | NOT TESTED | API response: 400 | |
| PIN-04 | P1 | Staff PIN | Rate limiting | Staff verified mode | 1. Enter wrong PIN 10 times in 5 mins | Locked out temporarily based on IP | Both | Partial | NOT TESTED | API response: 429 Too Many Requests | |

## 7. CUSTOMER CARD GRANT (Signed Token)

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CRD-01 | P0 | Card | View card | Valid token | 1. Open grant URL | Shows correct stamps for 5 minutes. (HMAC token) | Manual | No | NOT TESTED | Screenshot | |
| CRD-02 | P0 | Card | Tampered token | Valid token | 1. Modify HMAC signature<br>2. Load URL | Access denied | Automated | Yes | NOT TESTED | Network tab: 4xx | |
| CRD-03 | P1 | Card | Expired grant | Grant > 5 minutes old | 1. Load old URL | Requires re-verification (expires exactly at +5m) | Manual | No | NOT TESTED | Network tab: 401 | |

## 8. REWARDS

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| REW-01 | P0 | Rewards | Unlock | Stamps = Threshold | 1. Issue final stamp | Reward unlocks | Both | Partial | NOT TESTED | DB row: `milestones`, Screenshot | |
| REW-02 | P0 | Rewards | Redemption | Unlocked reward | 1. Staff clicks redeem | Reward marked redeemed | Both | Partial | NOT TESTED | DB value: `is_redeemed = true` | |
| REW-03 | P1 | Rewards | Duplicate redeem | Unlocked reward | 1. Click redeem twice rapidly | Only 1 redemption recorded | Automated | Yes | NOT TESTED | DB check | |

## 9. GOOGLE REVIEW REWARD

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| REV-01 | P1 | Reviews | Review link | Google link configured | 1. Customer views card | Review button visible | Manual | No | NOT TESTED | Screenshot | |
| REV-02 | P2 | Reviews | Empty link | No link configured | 1. Customer views card | Review button hidden | Manual | No | NOT TESTED | Screenshot | |

## 10. SOCIAL / CONTACT LINKS

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SOC-01 | P2 | Social | Valid links | Links configured | 1. Customer views card | Correct icons/links visible | Manual | No | NOT TESTED | Screenshot | |

## 11. CARD DESIGN / BRANDING

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BRN-01 | P1 | Branding | Color change | Settings | 1. Change brand color | Customer card reflects color | Manual | No | NOT TESTED | Screenshot | |
| BRN-02 | P2 | Branding | Logo upload | Settings | 1. Upload valid logo | Logo displays on card | Manual | No | NOT TESTED | Screenshot | |

## 12. CUSTOMERS

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CUS-01 | P1 | Customers | List | 1+ customers | 1. View customers tab | Shows correct list | Manual | No | NOT TESTED | Screenshot | |
| CUS-02 | P1 | Customers | Export | 1+ customers | 1. Click CSV export | Downloads correct CSV | Manual | No | NOT TESTED | CSV File | |

## 13. MESSAGES / CAMPAIGNS

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MSG-01 | P1 | Messages | Send Draft | Pro plan | 1. Compose message<br>2. Send | Records draft in DB. (No delivery pipeline implemented yet). | Manual | No | NOT TESTED | DB row: `campaigns`, API response | |

## 14. PLAN & FEATURE RESTRICTIONS

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PLN-01 | P1 | Plans | Staff PIN on Free | Free plan | 1. Try to enable Staff PIN | Blocked/Requires upgrade | Manual | No | NOT TESTED | Screenshot | |
| PLN-02 | P1 | Plans | Downgrade to Free | Pro business downgrades | 1. Use API / DB to change plan to free | Server prevents use of Pro features (Staff PIN, Messaging) | Both | No | NOT TESTED | API response | |
| PLN-03 | P1 | Plans | Expired Pro | Pro plan expired | 1. Use API / DB to set plan_expires_at to past | Server restricts operations and shows Expired view | Both | No | NOT TESTED | API response: 403 | |

## 15. MULTI-TENANT SECURITY

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SEC-01 | P0 | Security | Read cross-tenant | Business A | 1. Call API for Business B | 403 Forbidden / Not Found | Automated | Yes | NOT TESTED | API response | |
| SEC-02 | P0 | Security | Stamp cross-tenant | Business A | 1. Forge request for B | 403 Forbidden | Automated | Yes | NOT TESTED | API response | |

## 16. AUTH & SESSION SECURITY

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AUT-01 | P0 | Auth | Expired session | Expired Auth Token | 1. Try operational API | 401 Unauthorized | Automated | Yes | NOT TESTED | API response | |

## 17. RATE LIMITING / ABUSE

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RAT-01 | P0 | Limits | PIN Rate Limit | Active business | 1. Input wrong Staff PIN 10 times in 5 mins | 429 Too Many Requests (Limited by IP hash) | Automated | Yes | NOT TESTED | API response | |

## 18. ERROR UX

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ERR-01 | P1 | Errors | API 500 | Forced backend error | 1. Trigger failure | Shows friendly toast, no JSON | Manual | No | NOT TESTED | Screenshot | |

## 19. RESPONSIVENESS & DEVICE TESTING

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DEV-01 | P1 | Devices | Customer Scan | Safari iOS | 1. Scan QR on iPhone | Renders correctly | Manual | No | NOT TESTED | Screenshot | |
| DEV-02 | P1 | Devices | Customer Scan | Android Chrome | 1. Scan QR on Android | Renders correctly | Manual | No | NOT TESTED | Screenshot | |

## 20. ACCESSIBILITY / USABILITY

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ACC-01 | P2 | Usability | Keyboard nav | Dashboard | 1. Tab through UI | Focus states visible | Manual | No | NOT TESTED | Screenshot | |

## 21. DATABASE / MIGRATIONS

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DB-01 | P0 | Database | RLS Check | Staging | 1. Verify RLS policies on tables | Active and correct | Automated | Yes | NOT TESTED | DB query output | |

## 22. DEPLOYMENT / ENVIRONMENT

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DEP-01 | P0 | Deploy | Env Vars | Vercel | 1. Check all required vars | Present | Manual | No | NOT TESTED | Vercel dashboard screenshot | |

## 23. BACKUP / ROLLBACK

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BKP-01 | P0 | Backup | Rollback Vercel | Preview Env (Staging-safe) | 1. Identify current Preview deployment URL in Vercel.<br>2. Promote an older commit to Preview.<br>3. Verify older state.<br>4. Re-promote the known-good commit to Preview. | Rollback succeeds without touching Production. | Manual | No | NOT TESTED | Vercel logs/Screenshots | |

## 24. REAL-WORLD PILOT GOLDEN PATH (GOL-01)

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GOL-01 | P0 | E2E | Full lifecycle | Clean env | 1. Signup<br>2. Complete onboarding<br>3. View pending screen<br>4. Admin sees pending merchant<br>5. Approve + assign plan<br>6. Merchant refresh dashboard unlocks<br>7. Open Counter Display QR<br>8. Phone scans QR<br>9. Customer enters phone number<br>10. Stamp recorded<br>11. Customer card opens<br>12. Repeat visit & stamp<br>13. Hit reward threshold<br>14. Reward unlocks<br>15. Reward redemption by staff<br>16. Admin suspends merchant<br>17. Merchant access blocked<br>18. Admin reapproves<br>19. Access restored | Complete flow works flawlessly. | Manual | No | NOT TESTED | Screenshots at each step, DB snapshots | |

## 25. DATA CLEANUP

| Test ID | Priority | Area | Scenario | Preconditions | Exact Steps | Expected Result | Test Type | Current Automation Coverage | Result | Evidence | Bug ID / Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CLN-01 | P1 | Cleanup | Test data | End of testing | 1. Archive test business | Removes from active lists | Manual | No | NOT TESTED | DB snapshot | |


---

## A. P0 RELEASE GATE

All P0 tests must PASS for a Pilot release.
- ONB-01, ONB-02, ONB-03, ONB-05, ONB-07
- LIF-01, LIF-02, LIF-03, LIF-04, LIF-05, LIF-06, LIF-07, LIF-08
- ADM-01, ADM-02, ADM-03, ADM-04, ADM-05, ADM-06
- FLO-01, FLO-02, FLO-04, FLO-05
- QRC-01
- PIN-01a, PIN-01b, PIN-02, PIN-03
- CRD-01, CRD-02
- REW-01, REW-02
- SEC-01, SEC-02
- AUT-01
- RAT-01
- DB-01
- DEP-01
- BKP-01
- GOL-01

## B. AUTOMATION GAP ANALYSIS

- **Already Automated (Jest Unit/Integration):** Core logic (Stamp concurrency, cooldowns, invalid QRs, basic RLS policies, rate limits).
- **Partially Automated:** Auth flows (API covered, UI not), PIN logic (API covered, UI not).
- **Manual Only:** UI rendering, Device responsiveness, Full E2E Golden Path, Copy/Label verification, Vercel deployments.
- **Recommended Additions:** Implement Playwright for critical UI flows (Onboarding, Kiosk rendering, Golden Path scanning).

## C. MANUAL DEVICE TEST MATRIX

1. **iPhone (Safari)** - Primary customer target
2. **Android (Chrome)** - Primary customer target
3. **iPad/Tablet** - Merchant Counter Display target
4. **Desktop Chrome/Edge** - Merchant dashboard target

## D. PILOT GO/NO-GO CRITERIA

**GO:**
- 100% P0 pass
- no unresolved tenant isolation/security/data-loss bugs
- core scan-to-stamp-to-reward golden path passes
- admin lifecycle passes
- rollback procedure verified

**CONDITIONAL GO:**
- all P0 pass
- only low-risk P1/P2 defects remain

**NO-GO:**
- any P0 failure
- data corruption/loss
- tenant isolation failure
- authentication bypass
- stamp/reward integrity failure

## E. CURRENT READINESS SUMMARY

Based on code/test inspection:
- **Appears Ready:** Core APIs (Stamps, Auth, Multi-tenant security), Business Lifecycle state machine, New UX Copy.
- **Unverified Manually:** E2E physical device scan flow, exact UI rendering across multiple viewports, real Vercel Preview performance.
- **Likely Pilot Blockers:** Any UI bugs during the QR scan flow on mobile, or edge cases in the onboarding UX that trap new users.
- **Recommended Exact Execution Order:**
  1. GOL-01 (Full E2E flow first to catch major blockers)
  2. SEC-01, SEC-02 (Tenant isolation)
  3. ADM-01 to ADM-06 (Admin lifecycle)
  4. Device rendering matrix (DEV-01, DEV-02)
  5. Remainder of P0s.
