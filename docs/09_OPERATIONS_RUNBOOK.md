# Operations Runbook

This document provides concise operational procedures for managing the IntelliStamp application in the Preview/Staging environment.

## 1. Redeploying Preview
- **Purpose**: Force Vercel to rebuild and redeploy the latest commit, often to apply new environment variables.
- **Preconditions**: Vercel access, changes pushed to `claude/new-session-lld42`.
- **Steps**:
  1. Open Vercel dashboard for `intellistamp-inte`.
  2. Navigate to Deployments.
  3. Locate the latest deployment for `claude/new-session-lld42`.
  4. Click the three dots -> "Redeploy".
  5. Uncheck "Use existing build cache" if applying environment variables.
  6. Click "Redeploy".
- **Expected Result**: A new deployment completes successfully in ~1-2 minutes.
- **Rollback**: Cancel the build if stuck.

## 2. Rotating Preview Secrets
- **Purpose**: Replace compromised or old secrets in the Staging environment.
- **Preconditions**: Secure secret generation tool ready.
- **Steps**:
  1. Generate a new base64 secret (e.g., via PowerShell).
  2. Go to Vercel -> Project Settings -> Environment Variables.
  3. Edit the target variable (e.g., `ACCESS_GRANT_SECRET`) in the Preview environment.
  4. Save the variable.
  5. Trigger a manual redeployment without cache.
- **Expected Result**: New tokens generated post-deployment use the new secret. Old tokens will immediately invalidate.
- **Rollback**: Restore the old secret value and redeploy.

## 3. Adding a Staging Business
- **Purpose**: Create a fresh tenant for testing isolated flows.
- **Preconditions**: Staging URL open.
- **Steps**:
  1. Navigate to `/signup` on the Preview URL.
  2. Complete registration with a test email and secure password.
  3. Verify email (if required by Supabase auth).
  4. Complete business onboarding flow.
- **Expected Result**: Business dashboard loads, showing 0 customers.
- **Rollback**: Delete user from Supabase Auth dashboard.

## 4. Switching Plan for Testing
- **Purpose**: Test Pro vs. Free feature locks.
- **Preconditions**: Access to Supabase Staging SQL Editor.
- **Steps**:
  1. Open Supabase SQL Editor.
  2. Execute: `UPDATE businesses SET plan = 'pro' WHERE id = 'target-id';` (or 'free').
  3. Refresh the business dashboard in the browser.
- **Expected Result**: UI and API instantly enforce the new plan's rules.
- **Rollback**: Run the reverse SQL update.

## 5. Enabling Staff PIN
- **Purpose**: Turn on the PIN validator for manual dashboard actions.
- **Preconditions**: Business on Pro plan.
- **Steps**:
  1. Go to Business Dashboard -> Settings tab.
  2. Click "Set Staff PIN" (if not set) and configure a 4-digit PIN.
  3. Toggle "Staff PIN Validator" to ON.
- **Expected Result**: Subsequent manual stamp/redeem actions prompt for the PIN.
- **Rollback**: Toggle OFF.

## 6. Resetting Test PIN
- **Purpose**: Recover PIN if forgotten during testing.
- **Preconditions**: Active owner session.
- **Steps**:
  1. Go to Dashboard -> Settings.
  2. Click "Reset PIN".
  3. Enter new 4-digit PIN and the account login password.
  4. Submit.
- **Expected Result**: PIN updates, rate limits clear.
- **Rollback**: Re-reset if necessary.

## 7. Testing New Customer
- **Purpose**: Verify the QR and onboarding flow.
- **Preconditions**: Device with camera/browser.
- **Steps**:
  1. Open business scanner view on desktop.
  2. Scan QR with a mobile device.
  3. Enter a new, unused test phone number and name.
  4. Submit.
- **Expected Result**: Loyalty card renders with 1 stamp.
- **Rollback**: Delete customer record from Supabase Staging.

## 8. Testing Returning Customer
- **Purpose**: Verify rapid stamping flow.
- **Preconditions**: Customer exists for the business.
- **Steps**:
  1. Scan a fresh QR code from the dashboard.
  2. Enter the same phone number.
- **Expected Result**: Card opens instantly with an incremented stamp count.
- **Rollback**: None required.

## 9. Checking Rate Limits
- **Purpose**: Verify rate limit tables are functioning.
- **Preconditions**: Supabase Staging access.
- **Steps**:
  1. Fail a PIN entry 5 times intentionally.
  2. Open Supabase Table Editor -> `rate_limits`.
  3. View the hashed key and attempt count.
- **Expected Result**: Row exists with `attempts = 5` and a future `reset_time`.
- **Rollback**: Delete the row manually to clear the limit instantly for testing.

## 10. Checking Vercel Logs
- **Purpose**: Investigate 500 errors or logic failures.
- **Preconditions**: Vercel dashboard access.
- **Steps**:
  1. Open `intellistamp-inte` in Vercel.
  2. Go to the "Logs" tab.
  3. Filter by the specific deployment or environment.
  4. Look for `ERROR` outputs.
- **Expected Result**: Stack trace or clear error message isolated.
- **Rollback**: N/A.

## 11. Cleaning Staging Test Data
- **Purpose**: Prevent clutter in the Staging DB.
- **Preconditions**: Supabase SQL Editor access.
- **Steps**:
  1. Run: `DELETE FROM stamps;`
  2. Run: `DELETE FROM customers;`
  3. Run: `DELETE FROM rate_limits;`
- **Expected Result**: Tables empty, ready for fresh tests.
- **Rollback**: Do not run this on Production!

## 12. Investigating Failed QR
- **Purpose**: Debug 401s on scan.
- **Preconditions**: Issue reproducible.
- **Steps**:
  1. Check device time (must be synced via NTP).
  2. Ensure QR was scanned within its lifetime.
  3. Verify `QR_SECRET_KEY` matches between generation and validation (redeployment).
- **Expected Result**: Issue identified as time skew or environment mismatch.

## 13. Investigating Failed Stamp
- **Purpose**: Debug atomic transaction failures.
- **Preconditions**: Issue reproducible.
- **Steps**:
  1. Check `stamps` table for recent entries (cooldown block).
  2. Check Supabase RPC logs for `issue_stamp_atomic` errors.
  3. Verify business `stamps_required` configuration.
- **Expected Result**: Identify if cooldown or lock prevented the stamp.

## 14. Investigating Card-Access Failure
- **Purpose**: Debug 403 on card view.
- **Preconditions**: Issue reproducible.
- **Steps**:
  1. Check browser application tab for the presence of the `card_access` HttpOnly cookie.
  2. Verify the 5-minute window hasn't expired.
  3. Check Vercel logs for HMAC signature mismatch (usually implies variable change).
- **Expected Result**: Identify missing cookie or expired grant.

## 15. Preparing a Production Release
- **Purpose**: Finalize promotion from Staging.
- **Preconditions**: Complete test suite pass.
- **Steps**:
  1. Secure formal approval.
  2. Apply SQL migrations to Production strictly in order.
  3. Verify Production environment variables exist.
  4. Merge `claude/new-session-lld42` to `main`.
  5. Monitor Vercel Production deployment.
  6. Execute a single real-world smoke test on production.
- **Expected Result**: Zero downtime release.
- **Rollback**: Revert `main` commit and redeploy previous hash.
