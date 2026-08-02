# Product Requirements Document (PRD)

## 1. Product Overview
IntelliStamp is a frictionless, web-based digital loyalty platform. It enables brick-and-mortar businesses to issue digital stamps via secure QR codes without requiring end customers to download applications, register passwords, or navigate complex sign-up forms. 

## 2. Personas
- **The Customer**: A shopper wanting rewards quickly without hassle.
- **The Business Owner**: A manager focused on retaining customers and protecting against loyalty fraud.
- **The Staff Member**: An employee operating the system at the checkout counter.

## 3. User Stories
- As a customer, I want to scan a QR code and instantly receive a stamp just by entering my phone number.
- As a customer, I want to view my current stamp progress immediately after scanning.
- As a business owner, I want to require a Staff PIN for manual operations to prevent employee abuse.
- As a business owner, I want to reset my Staff PIN securely if I forget it.

## 4. Functional Requirements
- Secure QR token generation and validation.
- Customer identification via phone number.
- Atomic stamp issuance logic preventing race conditions.
- Stored and managed Staff PIN hashes (bcrypt).
- Ephemeral, read-only card access generation.

## 5. Non-Functional Requirements
- **Performance**: Stamp issuance must complete in under 2 seconds.
- **Security**: Strict multi-tenant isolation; fail-closed behavior on DB/Rate Limit errors.
- **Scalability**: Database-backed rate limiting to protect endpoints from abuse.

## 6. Detailed Customer Flow
### New Customer
1. Scan QR → QR is verified server-side
2. Enter phone and name
3. Customer is created for that business
4. Atomic stamp transaction succeeds
5. Read-only access grant is issued
6. Grant is exchanged for an HttpOnly cookie
7. Card opens

### Returning Customer
1. Scan QR → Enter phone
2. Existing business-scoped customer is identified
3. Atomic stamp transaction succeeds
4. Read-only access grant is issued
5. Grant is exchanged for an HttpOnly cookie
6. Card opens

## 7. Detailed Business-Owner Flow
- Authenticates securely.
- Accesses Dashboard Settings.
- Manages Staff PIN lifecycle (Set, Change, Reset).
- Toggles feature behavior based on plan entitlement.

## 8. Staff/Manual Stamp Flow
- Accesses authenticated business dashboard.
- Executes customer lookup.
- **Staff PIN required only when the enabled and entitled feature applies**.
- Completes atomic stamp transaction.
- Result displayed.

## 9. QR Lifecycle
- Generated server-side using a strict HMAC signature.
- Includes timestamp, business ID, and nonce.
- Rotates dynamically in the UI.
- Validated server-side on scan to prevent replay and forgery.

## 10. Stamp Lifecycle
- Evaluated for cooldown constraints (e.g., 4 hours).
- Issued atomically via database RPC (`issue_stamp_atomic`).
- Appended to customer history.

## 11. Card-Access Lifecycle
- Temporary read-only grant generated post-stamp.
- Exchanged via endpoint for an HttpOnly cookie.
- Allows card viewing for up to 5 minutes.
- Explicitly blocks redemption or data mutation.

## 12. Reward Lifecycle
- Customer completes the required stamp count.
- Reward state calculated dynamically on fetch.
- Staff member manually validates and processes redemption on the dashboard.

## 13. PIN Management Lifecycle
Pro owner can:
- **Set PIN**: Create a new 4-digit PIN (if none exists).
- **Change PIN**: Update PIN using the correct current PIN.
- **Reset PIN**: Reset PIN using authenticated account-password re-verification.
- **Enable/Disable**: Toggle the validator on or off.

*The application must never provide "View PIN".*

## 14. Error Handling
- Meaningful client-side messaging ("Incorrect PIN", "QR Expired").
- Fail-closed security mechanisms.

## 15. Empty States
- Dashboard shows "Not set" when Staff PIN is absent.
- New customers show 1 stamp out of N.

## 16. Plan Entitlements
- **Free**: PIN toggle locked; API denies Set/Change/Reset calls.
- **Pro**: PIN management unlocked.

## 17. Accessibility Expectations
- High-contrast modals.
- Clearly labeled inputs for screen readers.

## 18. Mobile UX
- Responsive design.
- Numeric keypads triggered for PIN inputs.

## 19. Security Requirements
- Passwords and PINs never stored in plaintext.
- Rate limiting on verification endpoints.
- HttpOnly cookies for session and temporary tokens.

## 20. Privacy Requirements
- Minimal data collection (phone number only required).
- Strict separation of customer profiles between distinct businesses.

## 21. Observability Requirements
- Audit logs for operations (e.g., PIN resets).
- No sensitive data exposed in console logs.

## 22. Acceptance Criteria
- **Smart Mode**: QR rotates automatically.
- **PIN Validator ON**: Dashboard prompts for PIN before manual stamp.
- **PIN Validator OFF**: Dashboard allows manual stamp without PIN.
- **Free-plan locked state**: Toggle disabled, upgrade nudge visible.
- **Set PIN**: Successfully hashes and saves exactly 4 digits.
- **Change PIN**: Rejects incorrect old PIN; updates correctly otherwise.
- **Reset PIN**: Requires password; creates new hash securely.
- **Invalid PIN**: Returns clear error, triggers rate limit.
- **Expired QR**: Rejects stamp request.
- **Cooldown**: Blocks secondary stamp within window.
- **Successful Stamp**: Updates DB atomically, triggers temporary read-only grant.
- **Temporary Card Expiry**: Blocks access strictly after 5 minutes.

## 23. Known Limitations
- Current grant exchange uses a URL parameter before redirect scrub.

## 24. Release Criteria
- Passes 100% of automated test suites.
- Staging environment manually verified against all core flows.
- Documentation fully updated.
