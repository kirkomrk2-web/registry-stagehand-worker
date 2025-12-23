# n8n Combined Wallester Flow Spec (with Google Sheet phone pool)

This doc describes exactly how to build the single combined n8n workflow that handles Supabase → waiting_list parsing → per-business loop → phone/email prep → Airtop browser agent → OTP SMS/Email → final business form. It also adds a Google Sheet phone pool (UK +44 numbers) usage/marking flow.

## 0) Inputs & credentials
- Supabase: service role key; tables: `verified_owners`, `wallester_business_profiles`, `sms_numbers_pool` (optional fallback).
- Google Sheet (public edit per user): `https://docs.google.com/spreadsheets/d/1xjBUp2i5PGb4L6WSkBHN8sG8qp5EUp3oxssuX6XE-tQ/edit?usp=sharing`
  - Tab columns (assumed): `number`, `status`, `last_used_at`, `note`
  - Credential: Google Sheets OAuth in n8n (create if not present).
- smstome (for OTP scraping when used): kirkomrk@gmail.com / zdraveibobi12
- Airtop/Ultimate Browser Agent: session start + stagehand nodes from `/home/administrator/Downloads/Ultimate_Browser_Agent.json`
- Email alias flow: `email_verification_workflow.json`
- SMS flow: `phone_sms_workflow.json`

## 1) High-level flow
1) **Trigger**: Supabase webhook (verified_owners insert/update).
2) **Normalize**: Set/Function node to parse payload, ensure waiting_list is JSON array, map owner `first_name_en`, `last_name_en`, `birthdate`, `referral_url`.
3) **Split businesses**: Split Out / Item Lists node over waiting_list; sort by ownership_percent desc.
4) **Deduplicate**: For each business, check existing Wallester accounts (Supabase `wallester_business_profiles` or dedicated table). Skip if EIK already registered.
5) **Assemble identity**: Extract business fields (name_en, city, postcode, street/number/flat, EIK, VAT=`BG${EIK}`, NKID if present, description/category if present, owner full name, birthdate, ownership_percent).
6) **Phone selection (Google Sheet)**:
   - Read sheet rows, filter `status` != used.
   - Pick first available number (numbers start with +44).
   - Mark as “reserved” in sheet (update row: status=reserved, last_used_at=now, note=wallester <business_name_en>).
7) **Email generation**:
   - Lowercase business name slug + 2–3 random digits + `@workmail.pro`.
   - Store email + phone for later OTP steps.
8) **Airtop agent (browser)**:
   - Start session; open `referral_url`.
   - Accept cookies popup.
   - Click header “Start”.
   - Fill form: business name (EN), country=Bulgaria, phone country code=+44, phone number body (without +44 if the form expects split), submit to request SMS OTP.
   - Wait for state change, avoid aggressive clicks.
9) **SMS OTP retrieval**:
   - Execute subflow `phone_sms_workflow.json` OR inside agent use smstome session:
     - Login smstome (kirkomrk@gmail.com / zdraveibobi12).
     - Open SMS inbox URL for the selected number.
     - Poll a few seconds; extract 6-digit Wallester code.
   - Fill OTP in Wallester form; proceed.
10) **Email step**:
    - Fill generated email; submit to request email OTP.
    - Execute subflow `email_verification_workflow.json` to fetch OTP for that alias.
    - Fill OTP; proceed.
11) **Business details form**:
    - Fill remaining fields: EIK, VAT, phone (same), email (same), city/region, street + number/flat, business category, short description.
    - Owner role: select option that combines beneficial owner + manager; set ownership_percent.
    - Provide owner first/last name (EN) and birthdate.
12) **Finish**:
    - Wait for final page load; optionally capture screenshot/artifacts.
    - Update Supabase `wallester_business_profiles` with status + artifacts + phone/email used; mark Google Sheet row as `used`.
    - End Airtop session.

## 2) Node-by-node outline

### 2.1 Trigger & normalize
- `Webhook (Supabase)`: receives verified_owners payload.
- `Function: normalize_payload`:
  - Parse waiting_list (string → JSON if needed).
  - Extract owner: first_name_en, last_name_en, birthdate, referral_url (if provided separately, set default).
  - Add top-level business list: waiting_list sorted by ownership_percent desc.

### 2.2 Split & filter
- `Item Lists` (or Split Out): iterate waiting_list.
- `IF: already_registered`:
  - Query Supabase table `wallester_business_profiles` (by EIK).
  - If found, route to “skip” path with note.

### 2.3 Prepare business context
- `Set business_vars`:
  - business_name_en, business_name_wallester, EIK, VAT (`BG${EIK}`), NKID (if any), ownership_percent.
  - address fields: city, region, postcode, street, number/flat.
  - description/category if available.
  - owner_full_name_en = `${first_name_en} ${last_name_en}`.
  - birthdate.
  - referral_url.

### 2.4 Phone selection (Google Sheets)
- `Google Sheets → Read`:
  - Spreadsheet: `1xjBUp2i5PGb4L6WSkBHN8sG8qp5EUp3oxssuX6XE-tQ`
  - Range: the phone list tab.
- `Function: pick_phone`:
  - Filter rows where status != used (or empty).
  - Pick first; store `phone_number_full` (expect +44 prefix).
  - Derive `phone_country_code=+44`, `phone_body` (strip +44).
- `Google Sheets → Update`:
  - Mark picked row: status=reserved, last_used_at=now, note=`wallester ${business_name_en}`.

### 2.5 Email generation
- `Function: make_email`:
  - slug = business_name_en lowercased, alnum only.
  - rand = 2–3 digits.
  - email = `${slug}${rand}@workmail.pro`.

### 2.6 Airtop agent orchestration
- `Execute Workflow`: (optional) invoke SMS/Email subflows as helpers later.
- `Start Browser Session` (from Ultimate_Browser_Agent.json)
- `Navigate referral_url`
- `Handle cookies popup` (click Accept).
- `Click Start` (header button).
- `Fill first form`: business name EN, country=Bulgaria, phone code +44, phone body, submit/request SMS OTP.
- `Wait/Poll` for OTP request state.

### 2.7 SMS OTP
- Path A: Use agent to login smstome and read SMS.
- Path B: Call subflow `phone_sms_workflow.json` to fetch code.
- Extract 6-digit OTP; inject into Wallester form; submit.

### 2.8 Email OTP
- Fill email field (generated).
- Submit request.
- Call subflow `email_verification_workflow.json` to fetch code.
- Fill OTP; submit.

### 2.9 Business details form
- Fill EIK, VAT, phone, email, city/region, postcode, street+number/flat, business category, description.
- Owner section: first_name_en, last_name_en, birthdate; select role (beneficial owner + manager); set ownership_percent; provide contact email/phone again if required.

### 2.10 Finalize
- Wait for confirmation; take screenshot.
- Supabase write-back:
  - `wallester_business_profiles`: status=completed/pending_review, artifacts (screenshot link), phone/email used.
  - Optionally update `verified_owners` row with wallester_status.
- Google Sheet update: set phone row status=`used`, last_used_at=now, note=`wallester ${business_name_en}`.
- Close browser session.

## 3) Prompts/sticky notes for the workflow
- Sticky note on trigger: “Supabase verified_owners webhook; expects waiting_list array.”
- Sticky note on normalize: “Parse waiting_list, map owner (first/last/birthdate/referral_url), sort by ownership_percent desc.”
- Sticky note on dedupe: “Skip if EIK already in wallester_business_profiles.”
- Sticky note on phone/email prep: “Pick phone from Google Sheet, reserve; generate workmail.pro alias.”
- Sticky note on agent: “Start Airtop session, navigate referral, accept cookies, start application, request OTP.”
- Sticky note on OTP blocks: “SMS OTP via smstome/subflow; Email OTP via email subflow.”
- Sticky note on final form: “Fill business + owner details, set ownership%, capture artifacts, write back Supabase; mark phone used.”

## 4) Cline execution checklist
1) Ensure Copilot MCP token prompt uses `.vscode/mcp.json` (Bearer auto-added). Enter raw token when asked.
2) Implement nodes above starting from `n8n_workflows/supabase_verified_owners_workflow.json`; import Airtop nodes from `/home/administrator/Downloads/Ultimate_Browser_Agent.json`; reuse subflows `phone_sms_workflow.json`, `email_verification_workflow.json`.
3) Add Google Sheets credential and nodes for phone selection/reservation and final mark-as-used.
4) Export finished workflow as `n8n_workflows/combined_wallester_flow.json`.
5) Run E2E test with sample waiting_list; log OTP steps; update COMBINED_CONTEXT_SNAPSHOT.md and SYSTEM_VERIFICATION_REPORT.md with results/links and note the phone row used in Sheets.
6) Keep secrets out of git; ensure .gitignore covers env/keys; rotate exposed tokens in `cline_mcp_settings.json`.
