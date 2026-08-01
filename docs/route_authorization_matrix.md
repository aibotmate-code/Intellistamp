# Route Authorization Matrix

| Route | Method | Authentication | Rate Limit | Protection Mechanism |
|-------|--------|----------------|------------|----------------------|
| `/api/auth/signup` | `POST` | Public | Yes (IP) | Supabase Admin Client; Rate Limited via RPC |
| `/api/auth/verify` | `POST` | Public | Yes (IP) | Rate Limited via RPC |
| `/api/auth/callback` | `GET` | Public | No | Uses PKCE exchange for secure session recovery |
| `/api/business/create` | `POST` | Authenticated Business | No | Supabase Auth session required |
| `/api/business/get` | `GET` | Authenticated Business | No | RLS + Session; Excludes `staff_pin` |
| `/api/business/update` | `POST` | Authenticated Business | No | RLS + Session; Excludes `staff_pin` plaintext write |
| `/api/business/qr-token` | `GET` | Authenticated Business | No | Session check; Generates HMAC-SHA256 signed token |
| `/api/customer/identify` | `POST` | Public (Kiosk) | Yes (Biz+IP) | Rate Limited; Replaced token with safe success boolean |
| `/api/customer/recover` | `POST` | Public (Customer) | Yes (IP) | Rate Limited; Enumeration safe response |
| `/api/kiosk/stamp` | `POST` | Public (Kiosk) | Yes (PIN) | Requires valid `business_id` and bcrypt hashed `staff_pin`; atomic locking |
| `/api/kiosk/review-bonus` | `POST` | Public (Kiosk) | Yes (PIN) | Requires valid `business_id` and bcrypt hashed `staff_pin` |
| `/api/stamp/issue` | `POST` | Customer Token | Yes (Biz/QR) | Requires HMAC-SHA256 valid signed token or hashed PIN; atomic locking; cooldowns |
| `/api/milestones/create` | `POST` | Authenticated Business | No | RLS + Session |
| `/api/campaign/update` | `POST` | Authenticated Business | No | RLS + Session |

## Notes

- **Public (Kiosk)** routes assume physical access to the venue and rely on the staff PIN for protection. Rate limiting mitigates brute force.
- **Atomic Locking**: Stamp issuance utilizes `pg_advisory_xact_lock` within a PostgreSQL RPC to prevent concurrency bugs and race conditions.
- **Tokens**: Customer identifying routes no longer leak the `customer_token` to anonymous viewers.
- **PINs**: All staff PINs are stored securely via bcrypt hash. Plaintext fallback has been entirely removed.
- **Dynamic QR**: Dynamic QR routes rely on a server-side HMAC-SHA256 signed token (`QR_SECRET_KEY`) bound to the business, ensuring anti-forgery and preventing spoofing.
