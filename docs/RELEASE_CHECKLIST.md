# IntelliStamp v1.0 Release & Deployment Checklist

---

## 1. Pre-Release Actions

- [ ] Ensure all local changes are fully integrated and compile cleanly (`npm run build` succeeds).
- [ ] Confirm all unit tests are passing (`npm run test` is 13/13 PASS).
- [ ] Verify ESLint runs without warnings (`npm run lint`).
- [ ] Check that `NEXT_PUBLIC_TENANT_BRANDING_ENABLED` is set to `'true'` on build systems.

---

## 2. Environment Variables Checklist

Ensure the following variables are configured in Vercel settings (Staging / Production):

| Variable Name | Environment | Value Type | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | All | URL | Supabase project API endpoint. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | String | Anon client-side token. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | String | Server secret key. Never expose to client. |
| `NEXT_PUBLIC_APP_URL` | Production | URL | Base production domain. |
| `NEXT_PUBLIC_TENANT_BRANDING_ENABLED`| Production | String (`true`/`false`) | Enable co-branding features toggle. |

---

## 3. Supabase Schema Migration Execution

When applying database updates (triggers and RLS locks):
1. **Take a Backup:** Confirm Supabase is backed up before running SQL.
2. **Apply Migration Script:** Run the hardening SQL migrations in SQL Editor.
3. **Verify:** Run the verification query to confirm triggers are active.

---

## 4. Rollback and Disaster Mitigation Procedure

If the release fails or critical bugs are reported in production:

```mermaid
graph TD
    Alert[Critical Bug Reported] --> CheckLogs[Check Logs & Dashboard Metrics]
    CheckLogs --> RevertGit[Revert Vercel Deployment to Previous Successful Build]
    RevertGit --> DBCheck{Does Database require rollback?}
    DBCheck -- Yes --▶ RunRollbackSQL[Execute database rollback queries in SQL Editor]
    DBCheck -- No --▶ VerifySmoke[Verify smoke tests on reverted instance]
    RunRollbackSQL --> VerifySmoke
```

### Rollback SQL Action (Cooldown Trigger Rollback)
```sql
DROP TRIGGER IF EXISTS enforce_stamp_cooldown_trigger ON public.stamps;
DROP FUNCTION IF EXISTS check_stamp_cooldown();
```

---

## 5. Post-Deployment Smoke Test Checklist

- [ ] Register a new business owner and onboarding profile.
- [ ] Access the **🎨 Branding** tab in Settings, upload a logo, and verify preview updates.
- [ ] Open the customer scan flow, perform a mock scan, and verify stamps increment.
- [ ] Verify that double clicking or rapid scanning blocks with a **cooldown active** message (429).
- [ ] Confirm no database errors are exposed to the frontend console.
