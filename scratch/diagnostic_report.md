# Diagnostic Trace Report

## Root Cause
The codebase **does not** contain any logic that automatically redirects an authenticated user from `/admin` to `/dashboard`. The redirect you are experiencing is likely caused by **browser-cached 308 Permanent Redirects** from a previous deployment (before `/admin` was implemented, when Next.js may have fallen back to `/` or another route that redirected to `/dashboard`), or an environment configuration issue causing a fallback.

## Execution Path (Current Codebase)
When an authenticated Intellical admin visits `/admin`:
1. **Middleware (`src/proxy.ts`)**: Evaluates `path === '/admin'`. Since `/admin` is not in `['/dashboard', '/onboarding']`, it returns `NextResponse.next()` without modifying the request.
2. **Layout (`src/app/admin/layout.tsx`)**: Executes `await requireIntellicalAdmin()`.
3. **Auth Helper (`src/lib/auth/index.ts`)**: `requireIntellicalAdmin()` fetches the session via `requireUser()`. It then verifies if `session.user.email` exists in `process.env.INTELLICAL_ADMIN_EMAILS`.
4. **Condition**: If the email matches, it returns the `AuthUser`. (It **does not** call `requireBusiness()`).
5. **Page (`src/app/admin/page.tsx`)**: The server successfully renders the Admin Dashboard HTML. No client-side redirects (e.g., `router.push('/dashboard')`) exist in the layout or page.

If `INTELLICAL_ADMIN_EMAILS` is misconfigured or the email doesn't match:
1. `requireIntellicalAdmin()` returns a 403 `NextResponse`.
2. `AdminLayout` catches this (`adminOrError instanceof Response`) and executes `redirect('/login')`.
3. The user lands on `/login`. If they manually log in again, `src/app/(auth)/login/page.tsx` executes `router.push('/dashboard')`.

## Exact File / Line
There is no exact file or line causing an automatic `/dashboard` redirect for `/admin` in the current branch (`claude/new-session-lld42`). The only automatic redirects to `/dashboard` in the codebase are:
- `src/app/(business)/onboarding/page.tsx` (Client-side, upon successful business creation)
- `src/app/(auth)/login/page.tsx` (Client-side, upon manual form submission)

## Smallest Proposed Fix
Since the code is structurally correct and `requireBusiness()` is not called anywhere in the `/admin` path, perform the following to resolve the perceived redirect:
1. Hard-refresh the browser or clear the cache to remove old 308 Permanent Redirects.
2. Verify `INTELLICAL_ADMIN_EMAILS` on Vercel Preview is a comma-separated list matching your exact login email.
3. Ensure no Vercel Edge rewrites or `next.config.js` (uncommitted) exist in the Preview environment.
