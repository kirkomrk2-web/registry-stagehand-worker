# Wallester Automation Realignment Plan

This plan consolidates the current state, remaining work, and a clean repository layout so we can drop the old “stagehand” naming and publish a single organized repo.

## 1) Current state (from SYSTEM_VERIFICATION_REPORT.md & COMBINED_CONTEXT_SNAPSHOT.md)
- n8n: Online at https://n8n.srv1201204.hstgr.cloud (login: miropetrovski12@gmail.com / MagicBoyy24#); 107 workflows, phone/email OTP subflows deployed.
- Supabase: Project `ansiaiuaygcfztabtknl` online (login: madoff1312@outlook.com / MagicBoyy24#); key tables `verified_owners`, `sms_numbers_pool`, `wallester_business_profiles`; edge functions `registry_check`, `users_pending_worker`, `registry_live_check`.
- Agent templates: `/home/administrator/Downloads/Ultimate_Browser_Agent.json` for Airtop browser automation; SMS/Email subflows in `n8n_workflows/`.
- Latest blocking errors: MCP GitHub server needs Bearer token header (fixed in `.vscode/mcp.json`, requires restart + token entry).

## 2) Remaining high-priority tasks
1) Merge “combined workflow” in n8n: Supabase trigger → waiting_list parse/sort (ownership desc) → per-business loop → SMS/Email subflows → Ultimate Browser Agent → optional Supabase write-back with status/artifacts. Use `n8n_workflows/supabase_verified_owners_workflow.json` as base, import logic from `phone_sms_workflow.json`, `email_verification_workflow.json`, and `Ultimate_Browser_Agent.json`.
2) Import `n8n_workflows/smstome_numbers_scraper.json` (if not already) and schedule every 6h to keep `sms_numbers_pool` warm.
3) Run full end-to-end test: seed `verified_owners.waiting_list`, confirm SMS/Email OTP capture, confirm agent completes Wallester flow, and write status back.
4) Rename project/repo away from “stagehand” to a neutral name (suggested: `wallester-automation-suite` or `registry-automation-suite`) and update docs accordingly.

## 3) Clean repository layout (proposed for new repo)
- `docs/` — rendered HTML viewers + high-level guides (keep `docs/registry_pipeline_visual.html`, `verified_owners_viewer.html`, `wallester_dashboard.html`, `companybook_checker.html`).
- `n8n_workflows/` — all exported workflows (`supabase_verified_owners_workflow.json`, `phone_sms_workflow.json`, `email_verification_workflow.json`, `smstome_numbers_scraper.json`, combined workflow when ready).
- `supabase/` — edge functions and migrations (`functions/registry_check`, `functions/users_pending_worker`, `functions/registry_live_check`, `migrations/create_sms_numbers_pool.sql`).
- `automation_scripts/` — helper scripts/tests now scattered across root (e.g., `test_*`, `check_*`, `worker.mjs`, `insert_daniel_manually.mjs`).
- `ops/` — operational checklists and runbooks (SYSTEM_VERIFICATION_REPORT.md, FINAL_DEPLOYMENT_STATUS.md, CHECK_* guides, QUICK_START.md).
- `mcp/` — MCP configs and setup instructions (`.vscode/mcp.json`, MCP_ACCESS_SETUP.md, WALLESTER_SMS_MCP_GUIDE.md).
- `README.md` — top-level overview + quick start; `CHANGELOG.md` — trimmed, dated changes; `LICENSE` — keep MIT if applicable.

## 4) Rename and publish steps (once structure is cleaned)
1) Create new folder/repo name (e.g., `wallester-automation-suite`), copy curated directories/files per layout above; drop obsolete names in docs.
2) Update internal references: README, SYSTEM_VERIFICATION_REPORT.md, COMBINED_CONTEXT_SNAPSHOT.md, and any “stagehand” mentions to the new name.
3) Re-export the final combined n8n workflow JSON and place it under `n8n_workflows/combined_wallester_flow.json`.
4) Push to GitHub (requires your token) and enable branch protection; add `.gitignore` to exclude secrets/Downloads.
5) For handoff, keep `COMBINED_CONTEXT_SNAPSHOT.md` and SYSTEM_VERIFICATION_REPORT.md synced with the final workflow state and login links.

## 5) MCP + Cline usage for this repo
- VS Code Cline → Remote MCP → `io.github.github/github-mcp-server` uses `https://api.githubcopilot.com/mcp/`. After restarting, when prompted for Authorization, paste your Copilot token **without** “Bearer”; the header now adds it automatically.
- Use Cline prompt from COMBINED_CONTEXT_SNAPSHOT.md §8.2 to build/patch the combined n8n workflow, then export back into `n8n_workflows/`.
- Avoid committing secrets: keep tokens in VS Code secrets store or environment, not in git.

## 6) Suggested execution order for the team (Codex + Cline)
1) Verify Supabase migrations/functions are current (redeploy if needed).
2) Build/update the combined n8n workflow and re-export to repo.
3) Import/schedule `smstome_numbers_scraper.json`.
4) Run E2E test with a real `verified_owners.waiting_list` payload; capture logs/screenshots.
5) Snapshot docs (SYSTEM_VERIFICATION_REPORT.md + COMBINED_CONTEXT_SNAPSHOT.md) with test results.
6) Rename repo and push the cleaned structure.
