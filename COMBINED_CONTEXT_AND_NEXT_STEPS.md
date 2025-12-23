# Combined Context, Current State, and Next Steps (Wallester Automation)
**Date:** 2025-12-20

This document consolidates the latest project context, current state, key files, credentials, and step-by-step guidance to continue and finish the Wallester automation system. It is intended to be a single source of truth for Codex/Cline/Tembo/ChatGPT Agent Mode.

---

## ✅ Current State Summary

**Goal:** A single, fully visible n8n workflow that orchestrates:
- Supabase `verified_owners` webhook trigger
- `waiting_list` filtering + sorting by `ownership_percent`
- Per-business loop to extract fields and store into memory
- SMS OTP sub-workflow + Email OTP sub-workflow
- Ultimate Browser Agent orchestration to complete Wallester registration
- Optional Supabase write-back with status and outputs

**Status:** ~95% complete. Core components exist; the final task is wiring them into one combined workflow and deploying any pending Supabase changes if not already deployed.

---

## 📌 Key Links

**GitHub repo:** https://github.com/kirkomrk2-web/registry-stagehand-worker

**Supabase project:** https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl

**n8n VPS:** https://n8n.srv1201204.hstgr.cloud

---

## 🔑 Access Credentials / Keys

> These are copied from existing project instructions. Handle securely.

**Supabase**
- Login: `madoff1312@outlook.com / MagicBoyy24#`
- Project ref: `ansiaiuaygcfztabtknl`

**n8n VPS**
- Login: `miropetrovski12@gmail.com / MagicBoyy24#`

**smstome.com**
- Login: `kirkomrk@gmail.com / zdraveibobi12`

**Tembo API Key**
- `94b92aea2abe7655b06b1cf41e69fa077565951253da989499fc42fc21331664`

---

## 🧠 Core Workflow Logic (Target Shape)

1. **Trigger**
   - Supabase webhook (new/updated `verified_owners` row).
2. **Split Out / Set**
   - Extract top-level fields (owner info, email aliases, etc.).
3. **waiting_list parsing**
   - Parse JSON array if needed.
4. **Filter + Sort**
   - Filter eligible businesses (or apply business logic).
   - Sort by `ownership_percent` DESC (100 → 0).
5. **Loop / Split Out**
   - Iterate each business.
6. **Per-business extraction**
   - Map fields to variables: EIK, VAT, NKID, addresses, Wallester name, ownership.
7. **Sub-workflows**
   - Execute Phone (SMS OTP) workflow.
   - Execute Email workflow.
8. **Browser Agent**
   - Feed business + OTP context into Ultimate Browser Agent to complete registration.
9. **Optional Supabase write-back**
   - Save status, phone/email used, results.

---

## 🧩 Key Files to Reference / Use

**Supabase**
- `supabase/migrations/create_sms_numbers_pool.sql`
- `supabase/functions/registry_check/index.ts`
- `supabase/functions/users_pending_worker/index.ts`

**n8n workflows**
- `n8n_workflows/supabase_verified_owners_workflow.json`
- `n8n_workflows/phone_sms_workflow.json`
- `n8n_workflows/email_verification_workflow.json`
- `n8n_workflows/smstome_numbers_scraper.json`

**Ultimate Browser Agent**
- `/home/administrator/Downloads/Ultimate_Browser_Agent.json`

**Deployment / instructions**
- `CHATGPT_DEPLOYMENT_INSTRUCTIONS.md`
- `FINAL_DEPLOYMENT_STATUS.md`

---

## ✅ What’s Already Done

- `sms_numbers_pool` migration prepared and fixed for safe deployment.
- Supabase edge functions updated with waiting_list fields (ownership %, NKID, addresses, Wallester name formatting).
- n8n workflows for SMS and Email OTP exist and are structurally correct.
- SMS numbers scraper workflow created and ready to import.
- Ultimate Browser Agent JSON is available as a template.

---

## ⏳ What Still Needs to Be Done (High Priority)

1. **Deploy remaining Supabase changes** (if not yet deployed):
   - Run `create_sms_numbers_pool.sql`.
   - Re-deploy `registry_check` and `users_pending_worker` functions.

2. **Create a single combined n8n workflow**:
   - Merge `supabase_verified_owners_workflow` logic with Ultimate Browser Agent.
   - Insert the SMS + Email sub-workflows into the main flow.
   - Add sticky notes for clarity.

3. **Verify end-to-end execution**:
   - Trigger from Supabase → confirm per-business loop.
   - Confirm SMS/email OTP outputs.
   - Confirm browser agent uses outputs.

---

## ✅ Prompt for Codex / Cline (Implementation Steps)

> Use this prompt verbatim with Codex/Cline to continue implementation in steps.

```
You are continuing the Wallester automation system in this repo:
https://github.com/kirkomrk2-web/registry-stagehand-worker

Goal: build one combined n8n workflow (Supabase webhook → waiting_list filter/sort → per-business loop → SMS + Email subflows → Ultimate Browser Agent).

Files to use:
- n8n_workflows/supabase_verified_owners_workflow.json
- n8n_workflows/phone_sms_workflow.json
- n8n_workflows/email_verification_workflow.json
- /home/administrator/Downloads/Ultimate_Browser_Agent.json
- supabase/functions/registry_check/index.ts
- supabase/functions/users_pending_worker/index.ts

Steps:
1) Parse waiting_list from Supabase payload (string or JSON).
2) Filter eligible businesses and sort by ownership_percent DESC.
3) Split Out to loop each business.
4) Map per-business fields into variables and memory context.
5) Execute SMS workflow and Email workflow (capture OTP outputs).
6) Feed everything into Ultimate Browser Agent nodes for registration steps.
7) Add sticky notes to document each segment.

Use existing workflow JSON structures and reuse node patterns.
```

---

## ✅ Prompt for Tembo Task Creation

```
Create a Tembo task to update the n8n workflow for Wallester automation. Use this repo:
https://github.com/kirkomrk2-web/registry-stagehand-worker
Target branch: work

Task: Combine Supabase webhook trigger, waiting_list filtering/sorting, per-business loop, SMS + Email subflows, and Ultimate Browser Agent into a single workflow JSON. Add sticky notes. Ensure variables are mapped for business and OTP context.
```

**Tembo SDK snippet:**
```ts
import Tembo from '@tembo-io/sdk';

const client = new Tembo({ apiKey: '94b92aea2abe7655b06b1cf41e69fa077565951253da989499fc42fc21331664' });

const task = await client.task.create({
  prompt: 'Combine Supabase webhook → waiting_list sort/filter → per-business loop → SMS + Email subflows → Ultimate Browser Agent into one n8n workflow JSON with notes.',
  agent: 'claudeCode:claude-4-5-sonnet',
  repositories: ['https://github.com/kirkomrk2-web/registry-stagehand-worker'],
  branch: 'work',
  queueRightAway: true,
});
```

---

## ✅ Prompt for ChatGPT Agent Mode (UI Deployment)

> Use the existing `CHATGPT_DEPLOYMENT_INSTRUCTIONS.md` as the authoritative deployment guide. The steps include:
- SQL migration deploy
- Edge function re-deploy
- n8n workflow import
- Airtop profile check

---

## 📌 Notes

- The n8n combined workflow should be the **single source of orchestration** and **visible end-to-end**.
- Reuse node structures from `Ultimate_Browser_Agent.json` to keep consistent tool wiring.
- Add sticky notes in the workflow UI for maintainability.

