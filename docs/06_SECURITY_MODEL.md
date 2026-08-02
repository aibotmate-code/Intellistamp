# Security Model

IntelliStamp employs a defense-in-depth security model to protect both tenant (business) data and customer interactions, ensuring a frictionless user experience does not compromise integrity.

## Threat Model
Primary threats mitigated:
- Forgery of QR stamps.
- Replay attacks using intercepted QR codes.
- Rapid concurrent stamping (race conditions).
- Brute-force attacks against Staff PINs.
- Cross-tenant data leakage (accessing another business's customers).
- Malicious staff actions (prevented via PIN limits).

## Authentication
- **Business Owners**: Standard session-based authentication via Supabase Auth.
- **Customers**: Fully anonymous interaction verified dynamically via secure HMAC tokens and HttpOnly session grants.

## Authorization & Multi-Tenant Separation
- **RLS**: Row Level Security heavily restricts database access based on `auth.uid()`.
- **API Resolution**: Client-provided `business_id` is never trusted for protected mutations. The server enforces resolution via the active session `owner_id`.
- **Service-Role**: Highly privileged operations (atomic transactions, rate-limit writes) are isolated inside `SECURITY DEFINER` RPCs invoked exclusively via a backend `service_role` client.

## Signed Rotating QR Lifecycle
- **Generation**: The dashboard fetches a signed token containing `businessId`, `timestamp`, and a `nonce`, hashed with `QR_SECRET_KEY`.
- **Validation**: When scanned, the server performs a constant-time signature verification.
- **Protection**: Replay and cooldown protections reject expired or rapidly reused tokens.

## Atomic Database Transaction
Stamp issuance bypasses standard RLS to execute the `issue_stamp_atomic` RPC. This function:
- Establishes a transaction advisory lock.
- Verifies the business.
- Enforces the 4-hour cooldown mathematically at the database layer.
- Commits or rolls back atomically to prevent concurrency bugs.

## Rate Limiting
- A central rate limiter protects sensitive endpoints (like Staff PIN management).
- Keys are hashed with `RATE_LIMIT_KEY_SECRET` to prevent identifying users from the rate limit table.
- Fail-closed design: If the DB is unreachable, the endpoint rejects the request rather than failing open.

## Staff PIN Hashing
- PINs are hashed using standard `bcrypt`.
- The `staff_pin_hash` is exclusively used server-side and stripped out before any API returns business data (`GET /api/business/get`).
- Plaintext PINs are strictly never logged or persisted.

## Temporary Access Grants
Upon a successful scan and stamp, the server issues a read-only access grant.
### Format Concept
`{version}:access:view_card:{customerId}:{businessId}:{issuedAt}:{expiresAt}:{nonce}:{HMAC_Signature}`

### Rules
- **Scope**: Explicitly limited to `view_card`. No stamp issuance, customer editing, or reward redemption is permitted.
- **Lifetime**: Maximum five-minute expiry.
- **Validation**: Requires constant-time signature verification against `ACCESS_GRANT_SECRET`.
- **Cross-Business Rejection**: Customer IDs and Business IDs must match perfectly.
- **Hidden Tokens**: The permanent customer token is never exposed to the client in this flow. No data is written to localStorage.

## HttpOnly Cookie Flow
To prevent XSS extraction, the access grant is exchanged server-side for an HttpOnly cookie, which is then used to render the card view.
*Current limitation/consideration*: The initial exchange currently uses a query parameter. The URL is immediately scrubbed through a redirect, and no-store/no-referrer headers are applied. Moving to a POST-body exchange is a future hardening improvement (note: infrastructure access logs may still capture query strings momentarily).

## Secret Management & Data Minimization
- Secrets (e.g., `ACCESS_GRANT_SECRET`, `QR_SECRET_KEY`) must never be prefixed with `NEXT_PUBLIC_`.
- Safe logging ensures passwords, tokens, and PINs are stripped before `console.log`.
- Minimal customer data is collected (only phone numbers, securely stored).

## Production vs. Staging Separation
Staging uses a completely separate Supabase project and isolated Vercel environment variables. Secrets and data are not shared between environments.

## Known Security Limitations
- Grant exchange via URL parameter (scrubbed, but still present in transit).
- Lack of multi-factor authentication (MFA) enforcement on business owner accounts (relies on Supabase default).
