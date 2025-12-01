# Deploy guide: owners_push_slim + users_pending_worker + DB migration

This guide covers the end-to-end steps to enable pushing slim company records (EOOD/ET, active, with English name) into verified_owners.companies_slim via:
- Supabase Edge Function owners_push_slim (manual/admin push)
- Supabase Edge Function users_pending_worker (automatic population)
- Database migration to add verified_owners.companies_slim JSONB

Prerequisites
- Supabase CLI installed and authenticated: https://supabase.com/docs/guides/cli
- Project ref and URLs handy. Example base URL for functions: https://<project>.supabase.co/functions/v1
- Service role key (for server-side function usage) and anon key (for invoking Edge functions)

1) Apply DB migration
The repo includes migration file:
- browserbase-worker/migrations/2025-11-30_add_companies_slim.sql

Options to apply it:
- Through Supabase SQL Editor (paste and run the file’s content)
- Using psql:
  psql "postgres://<user>:<pass>@<host>:5432/postgres" -f browserbase-worker/migrations/2025-11-30_add_companies_slim.sql

This adds column verified_owners.companies_slim JSONB.

2) Configure function secrets
owners_push_slim requires an admin push key. Set it as a function secret:
- Key: ADMIN_PUSH_KEY

users_pending_worker requires service role key to upsert into tables:
- Key: SUPABASE_SERVICE_ROLE_KEY

Using Supabase CLI:
- Set project ref in an env var for convenience:
  export PROJECT_REF=<your-project-ref>

- Set secrets:
  supabase secrets set --project-ref $PROJECT_REF ADMIN_PUSH_KEY="<strong-random-key>"
  supabase secrets set --project-ref $PROJECT_REF SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

Note: SUPABASE_URL is provided by platform. If needed, you can set SUPABASE_URL too.

3) Deploy Edge functions
From repo root:
- Deploy users_pending_worker:
  supabase functions deploy users_pending_worker --project-ref $PROJECT_REF

- Deploy owners_push_slim:
  supabase functions deploy owners_push_slim --project-ref $PROJECT_REF

- (Optional) Deploy/refresh registry_check if you changed it:
  supabase functions deploy registry_check --project-ref $PROJECT_REF

4) Test the functions
Curl examples (replace placeholders):

- owners_push_slim (manual push)
  export BASE_URL="https://<project>.supabase.co/functions/v1"
  export SUPABASE_ANON_KEY="<anon-key>"      # optional, Authorization header
  export ADMIN_PUSH_KEY="<admin-push-key>"   # required
  export FULL_NAME="Асен Митков Асенов"

  curl -i -X POST "$BASE_URL/owners_push_slim" \
    -H "Content-Type: application/json" \
    -H "x-admin-key: $ADMIN_PUSH_KEY" \
    ${SUPABASE_ANON_KEY:+-H "Authorization: Bearer $SUPABASE_ANON_KEY"} \
    --data '{
      "full_name": "'"$FULL_NAME"'",
      "companies": [
        {
          "id": "test-'"$(date +%s)"'",
          "business_name_en": "EMEL-MITKOVA LTD",
          "eik": "208248188",
          "vat": "BG208248188",
          "entity_type": "EOOD",
          "city_en": "Svilengrad",
          "region_en": "Haskovo",
          "country_en": "Bulgaria"
        }
      ]
    }'

- users_pending_worker (auto populate + allocations)
  export BASE_URL="https://<project>.supabase.co/functions/v1"
  export SUPABASE_ANON_KEY="<anon-key>"
  export FULL_NAME="Асен Митков Асенов"
  export EMAIL="test+'"$(date +%s)"'@example.com"

  curl -i -X POST "$BASE_URL/users_pending_worker" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    --data '{"row": {"full_name":"'"$FULL_NAME"'","email":"'"$EMAIL"'","status":"pending"}}'

5) Use the Live Visual tool to push
The HTML tool docs/registry_pipeline_visual.html now has:
- Auto enrichment by EIK and a block showing eligible companies with_data
- A Push to Supabase (owners_push_slim) action that:
  - Requires Base URL (https://<project>.supabase.co/functions/v1)
  - ADMIN_PUSH_KEY
  - Optionally SUPABASE_ANON_KEY
  - Uses the name from the input field as full_name and sends filtered slim companies

Start local proxy, then open the HTML in your browser:
- node server/companybook_proxy.mjs
- Open docs/registry_pipeline_visual.html in a browser (file:// path)

6) Verification checklist
- verified_owners has companies_slim populated for the pushed full_name
- Entries contain only: id, business_name_en, eik, vat, entity_type, city_en, region_en, country_en
- users_pending_worker writes companies (raw) and companies_slim (filtered) when processing a pending user
- owners_push_slim accepts push and upserts by full_name, creating owner row if not present

Troubleshooting
- owners_push_slim returns 401 unauthorized → ensure ADMIN_PUSH_KEY secret is set and header provided
- users_pending_worker returns Nothing to process → provide row payload with status:"pending" or create a pending user row first
- No eligible companies in slim → ensure company meets rules: legal form EOOD/ET, status N/E, English name present
