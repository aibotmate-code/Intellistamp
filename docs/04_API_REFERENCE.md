# API Reference

This document outlines the core API routes implemented in IntelliStamp. All requests to protected endpoints resolve the business identity entirely server-side.

## Business Management Routes

### `GET /api/business/get`
- **Purpose**: Fetches the authenticated owner's business profile.
- **Authentication**: Required (Owner).
- **Context**: Owner.
- **Input Contract**: None (Session based).
- **Response Contract**: Returns business record (id, name, plan, stamps_required, etc.). `has_staff_pin` is a boolean.
- **Safe Error Responses**: `401 Unauthorized`.
- **Plan Requirements**: None.
- **Rate Limits**: None explicitly, protected by Auth.
- **Tenant Isolation**: Strictly returns the business associated with the authenticated user.
- **Classification**: Read-only.

### `POST /api/business/settings/pin`
- **Purpose**: Manage the Staff PIN (Set, Change, Reset).
- **Authentication**: Required (Owner).
- **Context**: Owner.
- **Input Contract**:
  ```json
  {
    "action": "set" | "change" | "reset",
    "current_pin": "optional for change",
    "new_pin": "exactly four digits",
    "confirm_pin": "must match new_pin",
    "account_password": "required for reset"
  }
  ```
  *(Note: `business_id` is not accepted. The business is resolved securely server-side.)*
- **Response Contract**: `{ "message": "Success" }`
- **Safe Error Responses**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden` (Plan restrictions), `429 Too Many Requests`.
- **Plan Requirements**: Pro Plan required. Free plan receives 403.
- **Rate Limits**: 5 attempts per 15 minutes (Database-backed). Fail-closed.
- **Tenant Isolation**: Resolved via owner session.
- **Classification**: State-changing.

### `POST /api/business/update`
- **Purpose**: Update business settings (e.g., name, thresholds).
- **Authentication**: Required (Owner).
- **Context**: Owner.
- **Classification**: State-changing.

## Customer Identification & Lookup Routes

### `POST /api/customer/identify`
- **Purpose**: Identifies or creates a customer when scanning a QR code.
- **Authentication**: Not Required (Public QR Flow).
- **Context**: Customer.
- **Input Contract**: `{ "phone": "string", "name": "optional string", "qr_token": "string" }`
- **Response Contract**: `{ "customerId": "uuid" }`
- **Safe Error Responses**: `400 Bad Request`, `401 Unauthorized` (Invalid QR).
- **Rate Limits**: IP-based limits apply.
- **Tenant Isolation**: Customer is scoped to the business encoded in the validated QR token.
- **Classification**: State-changing (may create a user).

### `GET /api/business/customer-lookup`
- **Purpose**: Staff searches for a customer by phone.
- **Authentication**: Required (Owner/Staff).
- **Context**: Staff/Owner.
- **Classification**: Read-only.

## Stamp & Reward Routes

### `POST /api/stamp/issue`
- **Purpose**: Issues a stamp via the QR scanned flow.
- **Authentication**: Not Required (Validated via signed QR).
- **Context**: Customer.
- **Input Contract**: `{ "qr_token": "string", "customer_id": "uuid" }`
- **Response Contract**: `{ "success": true, "access_grant": "string" }`
- **Safe Error Responses**: `429 Too Many Requests` (Cooldown), `401 Unauthorized` (Bad QR).
- **Tenant Isolation**: Customer must belong to the business in the QR token.
- **Classification**: State-changing (Atomic via `issue_stamp_atomic` RPC).

### `POST /api/kiosk/stamp`
- **Purpose**: Manual staff stamping from the dashboard.
- **Authentication**: Required (Owner session).
- **Context**: Staff.
- **Input Contract**: `{ "customer_id": "uuid", "staff_pin": "optional 4-digit string" }`
- **Safe Error Responses**: `403 Forbidden` (Invalid PIN).
- **Classification**: State-changing.

### `POST /api/stamp/redeem`
- **Purpose**: Redeems a completed loyalty card.
- **Authentication**: Required (Owner session).
- **Context**: Staff.
- **Input Contract**: `{ "customer_id": "uuid", "staff_pin": "optional string" }`
- **Classification**: State-changing.

## Token & Grant Routes

### `GET /api/business/qr-token`
- **Purpose**: Generates the rotating QR code payload for display on the dashboard.
- **Authentication**: Required (Owner).
- **Context**: Owner.
- **Classification**: Read-only (Generates ephemeral token).

### `GET /api/customer/grant-exchange`
- **Purpose**: Exchanges a short-lived access grant for an HttpOnly card-viewing cookie.
- **Authentication**: Not Required (Grant validates via signature).
- **Context**: Customer.
- **Classification**: State-changing (Sets cookie).

### `GET /api/customer/card-access`
- **Purpose**: Validates the HttpOnly cookie and loads the temporary read-only card.
- **Authentication**: Requires valid HttpOnly cookie.
- **Context**: Customer.
- **Classification**: Read-only.
