# IntelliStamp — Deployment Guide

**Version:** 1.0  
**Last Updated:** 2026-06-05

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 18+ | LTS recommended |
| npm | 9+ | Bundled with Node.js |
| Git | Any | — |
| Supabase account | — | Free tier sufficient for development |
| Vercel account | — | Free tier for deployment |

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/aibotmate-code/intellistamp.git
cd intellistamp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Where to find these values:
- Supabase Dashboard → Project Settings → API

> **Warning:** Never commit `.env.local` to version control. It is listed in `.gitignore`.

### 4. Set Up the Database

In the Supabase Dashboard:
1. Navigate to **SQL Editor → New Query**
2. Paste the full contents of `schema.sql`
3. Click **Run**

This creates all tables, indexes, RLS policies, and grants.

### 5. Start the Development Server

```bash
npm run dev
```

Application runs at `http://localhost:3000`.

---

## Project Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server (after build) |
| `npm run lint` | Run ESLint |

---

## Environment Variables Reference

| Variable | Required | Exposure | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public (browser) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public (browser) | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Service role key — bypasses RLS. Never expose to client. |
| `NEXT_PUBLIC_APP_URL` | No | Public (browser) | Base URL of the app. Used for QR code URL generation. Defaults to `window.location.origin` on client. |
| `NODE_ENV` | Auto | — | Set automatically by platform: `development` or `production` |

---

## Database Schema Management

### Applying Schema Changes

There is no migration runner. Schema changes are applied manually via Supabase SQL Editor.

**Process:**
1. Write the SQL change (e.g. `ALTER TABLE ...`)
2. Test in Supabase staging project (if applicable)
3. Apply in Supabase Dashboard → SQL Editor
4. Update `schema.sql` in the repository to reflect the new state

### Full Schema Reset (Development Only)

To reset the development database:
1. Supabase Dashboard → Table Editor → Delete all rows, or
2. SQL Editor → Run `DROP TABLE` statements in reverse dependency order, then re-run `schema.sql`

---

## Vercel Deployment

### Initial Setup

1. Import the repository in Vercel Dashboard
2. Framework preset: **Next.js** (auto-detected)
3. Add environment variables in **Vercel → Project → Settings → Environment Variables**:

| Variable | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<id>.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<anon-key>` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `<service-role-key>` | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Production |

4. Click **Deploy**

### Continuous Deployment

Vercel auto-deploys on push to `main`:
- Push to `main` → Production deployment
- Push to any other branch → Preview deployment (unique URL)

### Custom Domain

1. Vercel Dashboard → Project → Domains
2. Add your custom domain (e.g. `intellistamp.com`)
3. Configure DNS as instructed by Vercel

---

## Production Checklist

Before going live, verify:

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel and not exposed to the browser
- [ ] `NEXT_PUBLIC_APP_URL` is set to the production domain
- [ ] All Supabase RLS policies are applied (`schema.sql` run successfully)
- [ ] Supabase project is on a paid plan if expecting >500MB database or >2GB egress
- [ ] Supabase Auth → Email settings: confirm "Enable email confirmations" is **OFF** (signup auto-confirms)
- [ ] Test the full stamp flow end-to-end in production before announcing to customers

---

## Rollback

### Vercel Rollback

1. Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click **...** → **Promote to Production**

This is instant. No code changes required.

### Database Rollback

There is no automated DB rollback. For schema changes:
- Keep the previous SQL in a comment/file before applying
- Apply the reverse SQL manually if a rollback is needed

---

## Troubleshooting

### Build Fails on Vercel

**Check:** Vercel Build Logs → look for TypeScript errors  
**Common cause:** Missing type declarations or import errors  
**Fix:** Run `npm run build` locally first to catch errors before pushing

### `SUPABASE_SERVICE_ROLE_KEY` errors in API routes

**Symptom:** `500` errors from any `/api/*` route  
**Check:** Vercel → Environment Variables — confirm the key is set for the correct environment  
**Fix:** Add/update the variable and redeploy

### Auth session not persisting after login

**Symptom:** Dashboard redirects to `/login` on refresh  
**Check:** Supabase Dashboard → Authentication → Cookies settings  
**Fix:** Ensure `@supabase/auth-helpers-nextjs` is correctly configured in `src/lib/supabase/client.ts` and `proxy.ts`

### QR code tokens not validating

**Symptom:** `"Invalid or expired token"` error immediately after scanning  
**Check:** Server clock vs. client clock skew. Token window = `Math.floor(Date.now() / 30000)`. Server accepts `window` and `window - 1`.  
**Fix:** If server time is badly skewed (>60s), check Vercel region time. Typically not an issue on Vercel.

### Supabase "row count exceeded" on free plan

**Symptom:** Inserts fail silently or return errors after ~50,000 rows  
**Fix:** Upgrade Supabase plan or archive old stamp records

---

## Supabase Configuration Notes

### Auth Settings Required

- Email confirmations: **Disabled** (the app uses admin `createUser` with `email_confirm: true`)
- OTP expiry: Default (irrelevant — OTP flow is not active)

### Connection Pooling

Not currently configured. For production with >100 concurrent users, enable Supabase connection pooler (Transaction mode, port 6543) and update the `NEXT_PUBLIC_SUPABASE_URL` to the pooler URL in server-side contexts.

---

## Monitoring

No structured monitoring is configured. Recommended additions for production:

| Tool | Purpose |
|---|---|
| Vercel Analytics | Page views, performance |
| Sentry | Error tracking and alerting |
| Supabase Dashboard | DB query performance, connection counts |
| Uptime Robot / Better Uptime | Availability monitoring |
