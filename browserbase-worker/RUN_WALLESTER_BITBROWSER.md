# Run Wallester Signup via BitBrowser

Prereqs
- BitBrowser app running locally
- A BitBrowser Profile ID with proxy/fingerprint configured: `bitXZHVWIMDY0`
- Local API: `https://127.0.0.1:54345` with header `x-api-key: 982aeb6c361a4030befbf17ed6145d90`
- `.env` already set (see project root) with SUPABASE and BitBrowser variables
- Supabase has at least one business row with:
  - `profile_status='verified'` (or `signing-up`)
  - `phone_number` and `email_alias_33mail` populated
  - For `--owner` mode, a row whose `current_owner_name` matches your argument

Quick API sanity test (optional)
```bash
# Start profile (may open a browser window)
curl -k -X POST \
  -H 'x-api-key: 982aeb6c361a4030befbf17ed6145d90' \
  'https://127.0.0.1:54345/api/v1/browser/start?user_id=bitXZHVWIMDY0'

# Stop profile
curl -k -X POST \
  -H 'x-api-key: 982aeb6c361a4030befbf17ed6145d90' \
  'https://127.0.0.1:54345/api/v1/browser/stop?user_id=bitXZHVWIMDY0'
```

Run the worker
```bash
cd browserbase-worker
# Option A: by owner (recommended)
npm run wallester:bit -- --profile 'bitXZHVWIMDY0' --owner 'Full Name'

# Option B: first profile in signing-up status
npm run wallester:bit -- --profile 'bitXZHVWIMDY0'
```

Logs to expect
- `[BitBrowser] Starting profile ...` when connecting to local API
- `awaiting_sms` then `awaiting_email` status updates on Supabase row
- On success: `completed`

Troubleshooting
- If you see `No eligible business found`, pick an owner that has a `verified` row with phone/email, or set one row to `signing-up`.
- If connection fails with certificate issues, the client already allows self‑signed certs; confirm local API is listening on 54345 and the token header name is `x-api-key`.
- If SMS/email codes don’t arrive, ensure `monitor:sms` and `monitor:email` workers are running, or insert test codes into the row to validate the flow.
