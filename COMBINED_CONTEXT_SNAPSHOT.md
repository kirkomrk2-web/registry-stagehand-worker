# Combined Context Snapshot (Current State)

This document consolidates the latest project context, workflow state, credentials/keys provided in conversation, and actionable next steps. It is intended for handoff to automation agents (Codex, Cline, Tembo) to continue work in a step-by-step manner.

## 1) Why this file exists

The user requested a single, combined snapshot of:
- Current progress and state
- Relevant files and locations
- Keys/credentials explicitly provided in conversation
- Instructions/prompts for Codex/Cline/Tembo to continue the project
- A clear step-by-step continuation plan

## 2) Active project goal (high level)

Build and deploy a complete Wallester automation system using:
- Supabase (database + edge functions)
- n8n (workflow orchestration)
- Airtop / Ultimate Browser Agent (browser automation)
- ChatGPT Agent Mode (manual deployment automation)

The immediate focus is to merge and update n8n workflows to handle Supabase `verified_owners` rows and process the `waiting_list` JSON array correctly, then orchestrate SMS + Email OTP subflows and the Ultimate Browser Agent in one combined workflow.

## 3) Current state summary (from conversation)

### 3.1 Supabase
- Tables involved: `verified_owners`, `sms_numbers_pool`, `wallester_business_profiles`.
- Edge functions:
  - `supabase/functions/registry_check/index.ts`
  - `supabase/functions/users_pending_worker/index.ts`
- Migration:
  - `supabase/migrations/create_sms_numbers_pool.sql`
- The `waiting_list` array in `verified_owners` is the key payload for candidate companies. It contains fields such as:
  - `EIK`, `VAT`, `nkid_code`, `entity_type`, `address_*`,
  - `business_name_en`, `business_name_wallester`,
  - `ownership_percent`.

### 3.2 n8n workflows
- `n8n_workflows/supabase_verified_owners_workflow.json` (main orchestration; needs updating to new `waiting_list` logic).
- `n8n_workflows/phone_sms_workflow.json` (SMS allocation + OTP scraping).
- `n8n_workflows/email_verification_workflow.json` (Email alias + OTP scraping).
- `n8n_workflows/smstome_numbers_scraper.json` (scrapes smstome numbers and populates `sms_numbers_pool`).
- `/home/administrator/Downloads/Ultimate_Browser_Agent.json` (agent template for Airtop browser automation).

### 3.3 Browser automation / Airtop
- The Ultimate Browser Agent workflow is used as the base template for the combined workflow.
- Airtop tools (Start Browser, Load URL, Type, Query, Click, End Session) are wired into an agent node.

### 3.4 Deployment and verification
- ChatGPT Agent Mode is expected to assist with UI tasks (Supabase, n8n UI imports).
- `CHATGPT_DEPLOYMENT_INSTRUCTIONS.md` contains step-by-step deployment guidance.

## 4) IDE open tabs (user-provided context)

- `Ultimate_Browser_Agent.json` (`/home/administrator/Downloads/Ultimate_Browser_Agent.json`)
- `CHATGPT_DEPLOYMENT_INSTRUCTIONS.md`
- `n8n_workflows/smstome_numbers_scraper.json`
- `FINAL_DEPLOYMENT_STATUS.md`
- `MCP_ACCESS_SETUP.md`

## 5) Credentials / keys explicitly provided (from prior conversation)

> NOTE: These values were provided by the user in the prior conversation context.

- Tembo API key:
  - `94b92aea2abe7655b06b1cf41e69fa077565951253da989499fc42fc21331664`

- smstome credentials (from workflow instructions):
  - Email: `kirkomrk@gmail.com`
  - Password: `zdraveibobi12`

- n8n login (from prior automation context):
  - URL: `https://n8n.srv1201204.hstgr.cloud`
  - Email: `miropetrovski12@gmail.com`
  - Password: `MagicBoyy24#`

## 6) Required combined workflow (target shape)

One consolidated n8n workflow with this structure:

1. **Webhook / Supabase Trigger**
   - Receives `verified_owners` row payload.

2. **Split / Set**
   - Split top-level fields into variables.
   - Parse `waiting_list` JSON if needed.

3. **Filter + Sort**
   - Filter eligible businesses (flag or threshold).
   - Sort by `ownership_percent` descending (100% → 0%).

4. **Loop (Split Out / Item Lists)**
   - Iterate each business in `waiting_list`.

5. **Per-business variable extraction**
   - Extract EIK, VAT, NKID, address, names, ownership, etc.
   - Store into variables and agent memory context.

6. **Subflow calls**
   - Execute Phone/SMS workflow.
   - Execute Email workflow.

7. **Ultimate Browser Agent execution**
   - Feed business context and OTP outputs into browser automation.

8. **Optional write-back to Supabase**
   - Update `verified_owners` or `wallester_business_profiles` with status and artifacts.

9. **Sticky notes**
   - Explain each section for maintainability.

## 7) “Next steps” plan (actionable and ordered)

1. **Update Supabase deployments (if pending)**
   - Apply `supabase/migrations/create_sms_numbers_pool.sql`.
   - Redeploy edge functions:
     - `supabase/functions/registry_check/index.ts`
     - `supabase/functions/users_pending_worker/index.ts`

2. **Create/merge combined n8n workflow**
   - Start from `n8n_workflows/supabase_verified_owners_workflow.json`.
   - Import patterns from `/home/administrator/Downloads/Ultimate_Browser_Agent.json`.
   - Ensure the flow includes the SMS and Email subflows via Execute Workflow nodes.

3. **Update waiting_list logic**
   - Parse `waiting_list` (string → JSON array if necessary).
   - Filter eligible items.
   - Sort by `ownership_percent` desc.
   - Loop each item with a Split Out / Item Lists node.

4. **Inject agent memory context**
   - Map per-business fields into memory input for the browser agent.

5. **Wire OTP results into agent**
   - Outputs from SMS and Email workflows feed into browser agent prompt/context.

6. **Add sticky notes and comments**
   - Document each logical block in the workflow for easy handoff.

## 8) Prompts for Codex / Cline / Tembo

### 8.1 Codex prompt

```
You are implementing a combined n8n workflow for Wallester automation.

Use these files as references:
- n8n_workflows/supabase_verified_owners_workflow.json (base orchestration)
- n8n_workflows/phone_sms_workflow.json (SMS)
- n8n_workflows/email_verification_workflow.json (Email)
- /home/administrator/Downloads/Ultimate_Browser_Agent.json (agent template)

Implement a single combined workflow that:
1) Receives a Supabase webhook for verified_owners.
2) Splits top-level fields, parses waiting_list JSON.
3) Filters eligible items and sorts by ownership_percent desc.
4) Iterates each business and extracts fields into variables and agent memory.
5) Executes SMS + Email subflows, uses outputs in the browser agent.
6) Optionally writes status back to Supabase.
7) Adds sticky notes describing each block.

Preserve node naming consistency and keep logic visually grouped.
```

### 8.2 Cline prompt

```
Please update the n8n workflows so we have ONE combined workflow that:
- Starts with Supabase verified_owners webhook trigger
- Splits top-level columns into variables
- Parses waiting_list and sorts by ownership_percent desc
- Iterates each business entry
- Extracts EIK/VAT/NKID/address/name fields into variables
- Runs SMS and Email subflows
- Executes Ultimate Browser Agent with the per-business context + OTP codes
- Adds sticky notes for each logical section

Reference files:
- n8n_workflows/supabase_verified_owners_workflow.json
- n8n_workflows/phone_sms_workflow.json
- n8n_workflows/email_verification_workflow.json
- /home/administrator/Downloads/Ultimate_Browser_Agent.json
```

### 8.3 Tembo prompt (task.create)

```
Prompt: Create a single combined n8n workflow that merges Supabase verified_owners trigger logic with the Ultimate Browser Agent and SMS/Email OTP subflows. Parse waiting_list, filter eligible items, sort by ownership_percent desc, loop each item, extract business fields into variables/memory, execute OTP subflows, then run the browser agent with the collected context and codes. Add sticky notes. Update Supabase migration/functions if needed.

Repositories: https://github.com/<ORG>/<REPO>
Branch: <YOUR_BRANCH>
Agent: claudeCode:claude-4-5-sonnet (or configured agent)
```

## 9) Tembo API usage (if needed)

```ts
import Tembo from '@tembo-io/sdk';

const client = new Tembo({
  apiKey: '94b92aea2abe7655b06b1cf41e69fa077565951253da989499fc42fc21331664',
});

const task = await client.task.create({
  prompt: 'Create combined n8n workflow for verified_owners + Ultimate Browser Agent + SMS/Email OTP subflows',
  agent: 'claudeCode:claude-4-5-sonnet',
  repositories: ['https://github.com/<ORG>/<REPO>'],
  branch: '<YOUR_BRANCH>',
  queueRightAway: true,
});

console.log(task.id);
```

## 10) Where to check the GitHub information

Once this repository is pushed to GitHub, check the repo (or the branch you are working on) for this file:

- `COMBINED_CONTEXT_SNAPSHOT.md`

You can share the GitHub link of this file after pushing. Example URL format:

```
https://github.com/<ORG>/<REPO>/blob/<BRANCH>/COMBINED_CONTEXT_SNAPSHOT.md
```

---

## 11) Quick reference: key files mentioned

- `CHATGPT_DEPLOYMENT_INSTRUCTIONS.md`
- `FINAL_DEPLOYMENT_STATUS.md`
- `MCP_ACCESS_SETUP.md`
- `n8n_workflows/supabase_verified_owners_workflow.json`
- `n8n_workflows/phone_sms_workflow.json`
- `n8n_workflows/email_verification_workflow.json`
- `n8n_workflows/smstome_numbers_scraper.json`
- `supabase/functions/registry_check/index.ts`
- `supabase/functions/users_pending_worker/index.ts`
- `supabase/migrations/create_sms_numbers_pool.sql`
- `/home/administrator/Downloads/Ultimate_Browser_Agent.json`
