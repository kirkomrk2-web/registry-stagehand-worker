# Deploy users_pending_worker (Supabase Dashboard UI)

This guide walks you through deploying the Edge Function `users_pending_worker` via the Supabase Dashboard and testing it.

## Prerequisites
- Project URL and keys (do not hardcode keys into code):
  - SUPABASE_URL = https://<project-ref>.supabase.co
  - SUPABASE_SERVICE_ROLE_KEY (Service role secret)
  - SUPABASE_ANON_KEY (Anon key) – for invoking the function when Verify JWT is ON.
- The function source code is in: `supabase/functions/users_pending_worker/index.ts`.
- `sms_numbers_pool` has at least one row with status = `available` (so allocation can succeed).

## 1) Create the function in Dashboard
1. Open Supabase Dashboard → Edge Functions → "Deploy a new function".
2. Name: `users_pending_worker` (must match exactly).
3. In the code editor, paste the contents of `supabase/functions/users_pending_worker/index.ts` (TypeScript is supported in the Deno runtime; the UI will transpile it).
4. Save.

## 2) Configure Function Settings
- Verify JWT with legacy secret: ON (recommended). You will pass the Anon key as `Authorization: Bearer <ANON_KEY>` when invoking.
- CORS: The function already sets permissive CORS headers (`*`). Adjust later if needed.

## 3) Add Function Secrets (Environment variables)
In the function’s Settings → Secrets (or Environment variables):
- `SUPABASE_URL` → `https://<project-ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` → your Service Role key
(Optionally add `COMPANYBOOK_API_KEY` if you later secure CompanyBook; the current code does not require it.)

Save changes, then Deploy the function.

## 4) Test with curl (from your machine)
Export your anon key:

```bash
export SUPABASE_ANON_KEY='<YOUR_ANON_KEY>'
```

Invoke with a sample row (the function accepts either a `row` object or tries to fetch the first `pending` user):

```bash
curl -sS -i -X POST "https://<project-ref>.supabase.co/functions/v1/users_pending_worker" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "row": {
      "full_name": "Иван Иванов",
      "email": "registry.test+'"'"$(date +%s)"'"'@example.com",
      "status": "pending"
    }
  }'
```

Expected result (200 OK) with JSON including:
- `status: "ok"`
- `owner_id` (UUID in verified_owners)
- `allocated_phone_number` (if a number was available)
- `email_alias_33mail` (generated unique alias)
- users_pending status updated to `ready_for_stagehand`

If `companies` is empty from CompanyBook or no match is found, `users_pending` may become `no_match`.

## 5) Validate database changes
Run quick checks in SQL editor:

```sql
-- Was a verified owner inserted/updated?
select id, full_name, email_alias_33mail, allocated_phone_number, top_company
from public.verified_owners
order by created_at desc
limit 5;

-- Did the user move to ready_for_stagehand?
select email, status, updated_at from public.users_pending
order by updated_at desc
limit 5;
```

## 6) Optional: schedule periodic runs
Use Supabase Scheduled Triggers to POST to the function every few minutes:
- Target: `https://<project-ref>.supabase.co/functions/v1/users_pending_worker`
- Method: POST
- Headers: `Authorization: Bearer <ANON_KEY>`, `Content-Type: application/json`
- Body: `{}` (empty) – the function will pick the first `pending` user.

## Notes
- The function uses the Service Role key internally to perform writes with RLS bypass, so keep secrets only in function settings.
- The function requires `sms_numbers_pool` to have rows with `status = 'available'` for phone allocation.
- Email alias uniqueness is enforced by checking existing `verified_owners.email_alias_33mail`; add a unique index later if you want strict constraint.
