# Complete Test Cases

## Summary (Verified against Commit `1eab29104887260b55a7f0f558ed66b366d612f6`)
- **Total Test Suites Passed:** 29
- **Total Tests Passed:** 288
- **Todo Tests:** 28
- **Skipped Tests:** 0
- **Failed Tests:** 0
- **TypeScript:** Passed
- **Build:** Passed
- **Lint:** 0 errors (20 pre-existing warnings in unmodified code)

---

## 1. QR Tests
| Test ID | Area | Preconditions | Steps | Expected result | Automated/Manual | Status |
|---|---|---|---|---|---|---|
| QR-01 | QR | Configured QR secret | Generate QR payload | Encoded with business ID and timestamp | Automated | Passed |
| QR-02 | QR | Valid QR token | Scan token within expiry window | Stamp process begins | Automated | Passed |
| QR-03 | QR | Expired QR token | Scan token > expiry window | Rejects with 401 | Automated | Passed |
| QR-04 | QR | Forged QR | Alter token signature and submit | Rejects with 401 | Automated | Passed |
| QR-05 | QR | Cross-business QR | Submit QR from Business A to Business B endpoint | Rejects mismatch | Automated | Passed |
| QR-06 | QR | Cooldown | Scan same QR rapidly twice | First passes, second fails | Automated | Passed |
| QR-07 | QR | Concurrent scans | Submit two exact parallel requests | Atomic lock drops one | Automated | Passed |
| QR-08 | QR | Replay attempt | Submit old but validly signed token | Nonce/time check rejects | Automated | Passed |

## 2. Customer Tests
| Test ID | Area | Preconditions | Steps | Expected result | Automated/Manual | Status |
|---|---|---|---|---|---|---|
| CUST-01 | Customer | Valid QR | Scan and enter new phone/name | Creates user, issues stamp | Automated | Passed |
| CUST-02 | Customer | Valid QR | Scan and enter existing phone | Identifies user, issues stamp | Automated | Passed |
| CUST-03 | Customer | Business A + B | Register same phone in B | Succeeds, keeps records isolated | Automated | Passed |
| CUST-04 | Customer | Staff Dashboard | Lookup customer | Phone matches return masked data | Automated | Passed |
| CUST-05 | Customer | QR scan | Complete flow | Permanent token is not exposed | Automated | Passed |

## 3. Stamping Tests
| Test ID | Area | Preconditions | Steps | Expected result | Automated/Manual | Status |
|---|---|---|---|---|---|---|
| STAMP-01 | Stamping | Valid request | Trigger atomic stamp RPC | Increments stamp count securely | Automated | Passed |
| STAMP-02 | Stamping | Recent stamp | Trigger atomic stamp RPC | Cooldown rejection | Automated | Passed |
| STAMP-03 | Stamping | DB error | Trigger atomic stamp RPC | Transaction rollback, fail closed | Automated | Passed |
| STAMP-04 | Stamping | Race condition | Send 5 simultaneous requests | Only 1 succeeds, 4 hit cooldown/lock | Automated | Passed |
| STAMP-05 | Stamping | Loyalty card | Reach threshold | Card marked redeemable | Automated | Passed |

## 4. Staff PIN Tests
| Test ID | Area | Preconditions | Steps | Expected result | Automated/Manual | Status |
|---|---|---|---|---|---|---|
| PIN-01 | Staff PIN | Free plan | Try setting PIN | Blocked (403) | Automated | Passed |
| PIN-02 | Staff PIN | Pro plan, no PIN | Submit 4-digit Set PIN | Successfully hashes and saves | Automated | Passed |
| PIN-03 | Staff PIN | Pro plan | Submit mismatched confirm PIN | Rejects with 400 | Automated | Passed |
| PIN-04 | Staff PIN | Pro plan | Submit non-numeric PIN | Rejects with 400 | Automated | Passed |
| PIN-05 | Staff PIN | Pro plan, has PIN | Submit Change PIN with valid old PIN | Updates securely | Automated | Passed |
| PIN-06 | Staff PIN | Pro plan, has PIN | Submit Change PIN with wrong old PIN | Fails, triggers rate limit | Automated | Passed |
| PIN-07 | Staff PIN | Pro plan | Exhaust attempts | Blocked by rate limiter | Automated | Passed |
| PIN-08 | Staff PIN | Pro plan | Submit Reset PIN with correct password | Successfully updates PIN | Automated | Passed |
| PIN-09 | Staff PIN | Pro plan | Submit Reset PIN with wrong password | Fails auth check | Automated | Passed |
| PIN-10 | Staff PIN | Manual Action | Validator ON | Manual stamp requires correct PIN | Automated | Passed |
| PIN-11 | Staff PIN | Manual Action | Validator OFF | Manual stamp proceeds without PIN | Automated | Passed |
| PIN-12 | Staff PIN | QR Flow | Customer scans QR | Customer is never asked for PIN | Automated | Passed |
| PIN-13 | Staff PIN | Database | Any PIN operation | `staff_pin` plaintext remains NULL | Automated | Passed |
| PIN-14 | Staff PIN | API Response | Query `/api/business/get` | `staff_pin_hash` is stripped/undefined | Automated | Passed |

## 5. Grant Access Tests
| Test ID | Area | Preconditions | Steps | Expected result | Automated/Manual | Status |
|---|---|---|---|---|---|---|
| GRANT-01 | Grant | Post-stamp | Issue temporary access grant | Generates exact token format | Automated | Passed |
| GRANT-02 | Grant | Token intercept | Modify signature | Validating grant fails | Automated | Passed |
| GRANT-03 | Grant | Cookie exchange | Pass grant to exchange URL | Returns HttpOnly cookie, clean redirect | Automated | Passed |
| GRANT-04 | Grant | Token expiry | Wait > 5 minutes | Grant exchange rejected | Automated | Passed |
| GRANT-05 | Grant | Token scoping | Attempt reward redemption with grant | Access denied (requires staff auth) | Automated | Passed |
| GRANT-06 | Grant | Data security | Inspect response | Permanent customer token omitted | Automated | Passed |

## 6. Deployment Smoke Tests
| Test ID | Area | Preconditions | Steps | Expected result | Automated/Manual | Status |
|---|---|---|---|---|---|---|
| DEP-01 | Deployment | Vercel | Check Preview environment variables | Exist securely, no secrets exposed | Manual | Passed |
| DEP-02 | Deployment | Supabase | Verify staging migrations applied | Tables and RPCs exist | Manual | Passed |
| DEP-03 | Deployment | UX | Open Preview URL on mobile | Renders correctly, no Vercel auth block | Manual | Passed |
| DEP-04 | Deployment | Integrity | Check production DB | Untouched by staging actions | Manual | Passed |
