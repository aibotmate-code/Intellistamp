# Database and Migrations

## 1. Key Tables
- **businesses**: Represents a tenant. Stores profile data, feature flags, plan status, and `staff_pin_hash`.
- **customers**: Represents an end customer, scoped explicitly by `business_id`.
- **stamps**: An immutable ledger recording individual stamps issued to a `customer_id`.
- **rate_limits**: Tracks failures and limits to protect against brute force and abuse.
- **milestones**: Configured thresholds for rewards per business.

## 2. Business/Customer Tenant Model
IntelliStamp operates as a strict multi-tenant system. The `businesses` table is the root tenant. A single phone number can exist multiple times in the `customers` table, provided each entry has a unique `business_id`. No customer data is shared between businesses.

## 3. Row Level Security (RLS) Status
All primary tables (`businesses`, `customers`, `stamps`) have RLS enabled. Policies restrict reads and writes such that an authenticated owner can only access records where `owner_id = auth.uid()` or related foreign-key constraints lead back to their `owner_id`.

## 4. Service-Role Boundaries
Sensitive operations like atomic stamping and rate-limit tracking bypass RLS by executing through PostgreSQL Stored Procedures (RPCs) running with `SECURITY DEFINER` privileges. These functions strictly validate inputs internally and are accessible only via the `service_role` key from secure API routes.

## 5. Migration History

### Migration 1: `20260802000000_issue_stamp_atomic.sql`
- **Purpose**: Implements the `issue_stamp_atomic` RPC.
- **Features**:
  - Atomic stamp issuance.
  - PostgreSQL advisory locking (`pg_advisory_xact_lock`) to prevent race conditions on concurrent scans.
  - Cooldown enforcement (rejects if last stamp is too recent).
  - Service-role-only execution (definer context).

### Migration 2: `20260802010000_rate_limit.sql`
- **Purpose**: Database-backed rate limiting.
- **Features**:
  - `rate_limits` table creation.
  - HMAC-derived keys (obscures the target identity).
  - Failure-only counters.
  - Fail-closed behavior on database errors.
  - Service-role-only RPC access (`check_rate_limit`, `reset_rate_limit`).

### Migration 3: `20260802020000_staff_pin_backfill.sql`
- **Purpose**: Migration away from plaintext Staff PINs.
- **Features**:
  - Remove plaintext Staff PIN usage.
  - Create valid bcrypt hashes (`staff_pin_hash`).
  - Clear legacy plaintext values.

*Note on Migration 3 Prerequisites:*
In Staging, the following structural change was required prior to hashing:
```sql
ALTER TABLE public.businesses
ALTER COLUMN staff_pin DROP NOT NULL;
```
The permanent migration script safely includes this handling.

## 6. Migration Ordering and Verification
Migrations must be executed strictly in numeric order via the Supabase CLI. After application to staging, developers must verify:
- Schema updates via the Supabase dashboard.
- RPC function ownership and execution permissions.
- RLS boundaries remain intact.

## 7. Rollback Considerations
Do not blindly reverse migrations by dropping tables or columns in production. If an issue is discovered, write a forward corrective migration to preserve data integrity and tenant boundaries.
