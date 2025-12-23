# File Audit Summary (by recency and relevance)

This audit groups files by modification date and probable relevance. Nothing was deleted; this is to guide cleanup and handoff. Dates from `find … | sort` (run 2025-12-22).

## 1) Active/Recent (Dec 19–22) — keep in focus
- `n8n_workflows/supabase_verified_owners_workflow.json`
- `n8n_workflows/phone_sms_workflow.json`
- `n8n_workflows/email_verification_workflow.json`
- `n8n_workflows/smstome_numbers_scraper.json`
- `MCP_ACCESS_SETUP.md`
- `FINAL_DEPLOYMENT_STATUS.md`
- `CHATGPT_DEPLOYMENT_INSTRUCTIONS.md`
- `COMBINED_CONTEXT_SNAPSHOT.md`
- `SYSTEM_VERIFICATION_REPORT.md`
- `.vscode/mcp.json` (fixed Bearer header)
- `.vscode/settings.json` (recent IDE settings)
- `PROJECT_REALIGNMENT_PLAN.md`
- `BROWSER_USE_AI_TELEGRAM_PROMPT.txt`
- `package-lock.json` (refreshed)

## 2) Important but slightly older (Dec 10–18) — likely keep
- `WALLESTER_AUTOMATION_ARCHITECTURE.md`
- `WALLESTER_N8N_QUICK_START.md`
- `VERIFIED_OWNERS_N8N_DEPLOYMENT.md`
- `WALLESTER_AUTOMATION_PLAN.md`
- `FINAL_FIX_LEGAL_FORM_MATCHING.md`
- `MULTI_ACCOUNT_AUTHENTIC_SYSTEM.md`, `multi-account-system/schema_extensions.sql`
- `EVA_AI_SYSTEM_ARCHITECTURE.md` + `eva/*` (separate AI module; keep but segregate)
- `wallester/*` + `.wallester_keys/*` (Wallester client/keys; protect secrets)
- `telegram-bot/*` (bot side-project; isolate if not in use)
- `HOSTINGER_*`, `RAILWAY_*`, `NETLIFY_*` guides (deployment notes; archive section)

## 3) Tests/diagnostics (many `test_*.mjs`, `check_*.mjs/sql`)
- Located at repo root and `server/`. These appear to be one-off verifications, data checks, or debugging scripts. Preserve, but move to `automation_scripts/` or `tests/` in the new structure and mark as legacy where appropriate.

## 4) Legacy/side modules (candidates to archive, not delete)
- `browserbase-worker/`, `browserbase-worker@0.2.0/`, `node/` (older browser automation scaffolding).
- `HORIZONS_FIXES/` and `HOSTINGER_FIXED_FILES/` (project-specific patches unrelated to current Wallester flow).
- `docs/AUTOMA_*` and `docs/registry_*` older visuals/manuals—keep in `docs/archive/` if not referenced.
- `REFERRAL_*`, `SOCIAL_AUTOMATION_PLAN.md`, `EVA_*` — marketing/AI extras; keep but separate from core.

## 5) Secrets and sensitive files (do NOT commit)
- `.env`, `browserbase-worker/.env`, `wallester/.env`, `.wallester_keys/*.pem`, any tokens in configs (e.g., `cline_mcp_settings.json` contains live API keys). Rotate and move to secret storage; ensure `.gitignore` covers them.

## 6) Suggested next actions for cleanup (without deleting)
1) Move tests/diagnostics (`test_*.mjs`, `check_*.mjs/sql`) into `automation_scripts/` (or `tests/`) with a short README noting “legacy/test”.
2) Group side projects: `browserbase-worker*`, `HORIZONS_FIXES/`, `eva/`, `multi-account-system/`, `telegram-bot/`, `wallester/` into dedicated folders or `archive/` if not active.
3) In `docs/`, keep current visuals (`registry_pipeline_visual.html`, `verified_owners_viewer.html`, `wallester_dashboard.html`, `companybook_checker.html`) at top level; move older AUTOMA/registry variations into `docs/archive/`.
4) Keep active ops docs together: `COMBINED_CONTEXT_SNAPSHOT.md`, `SYSTEM_VERIFICATION_REPORT.md`, `PROJECT_REALIGNMENT_PLAN.md`, `FINAL_DEPLOYMENT_STATUS.md`, `CHATGPT_DEPLOYMENT_INSTRUCTIONS.md`, `MCP_ACCESS_SETUP.md`.
5) Ensure `.gitignore` covers all secret files before any new repo push; rotate exposed keys from `cline_mcp_settings.json`.

## 7) Ready-made prompt for Cline (cleanup + workflow export)
```
Goal: Organize the repo per PROJECT_REALIGNMENT_PLAN.md without deleting files, then finalize the combined n8n workflow.

Steps:
1) Verify MCP token prompt uses the fixed .vscode/mcp.json (Bearer is added automatically). Re-enter the raw Copilot token when prompted.
2) Move all test/diagnostic scripts (test_*.mjs, check_*.mjs/sql, worker.mjs) into automation_scripts/ (create if missing) and add a README noting they are legacy/test helpers.
3) Move side/legacy modules into archive/ (or subfolders): browserbase-worker*, HORIZONS_FIXES/, HOSTINGER_FIXED_FILES/, eva/, multi-account-system/, telegram-bot/, wallester/ (leave .wallester_keys inside archive/secret-storage and ensure .gitignore).
4) In docs/, keep the main visuals (registry_pipeline_visual.html, verified_owners_viewer.html, wallester_dashboard.html, companybook_checker.html) at root; move AUTOMA_* and older registry_* variants into docs/archive/.
5) Ensure .gitignore excludes .env, .wallester_keys/*.pem, browserbase-worker/.env, wallester/.env, any tokens; do NOT commit secrets.
6) Build/update the combined n8n workflow using:
   - n8n_workflows/supabase_verified_owners_workflow.json (base)
   - n8n_workflows/phone_sms_workflow.json
   - n8n_workflows/email_verification_workflow.json
   - /home/administrator/Downloads/Ultimate_Browser_Agent.json
   Then export as n8n_workflows/combined_wallester_flow.json.
7) Run an E2E test with a sample verified_owners.waiting_list payload; update COMBINED_CONTEXT_SNAPSHOT.md and SYSTEM_VERIFICATION_REPORT.md with results and links.
8) Prepare new repo structure (e.g., wallester-automation-suite) following PROJECT_REALIGNMENT_PLAN.md; no secrets in git.
```
