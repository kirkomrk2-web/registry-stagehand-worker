# Wallester System - Complete Current State Analysis
**Date:** December 1, 2025, 12:33 AM  
**Purpose:** Document entire user flow, identify what works vs what's broken/missing

---

## 🎯 GOAL: What the System Should Do

### User Journey (Intended Flow)
1. **User visits wallesters.com**
2. **User submits**: 3 names (first, middle, last) + birthdate + email
3. **System searches Bulgarian registry** (CompanyBook API) for person
4. **System finds companies** owned 100% by this person (EOOD/ET only)
5. **System assigns resources**: phone number (SMS), email alias (33mailbox)
6. **System creates Wallester account** automatically using:
   - Business details from registry
   - Assigned phone/email
   - Automated browser workflow
7. **User gets Wallester business account** ready to use

---

## 📊 CURRENT STATE: What Actually Exists

### ✅ WORKING COMPONENTS

#### 1. **Database Schema** (mostly complete on Nov 29, 2025)
- ✅ `users_pending` - stores incoming user requests
- ✅ `user_registry_checks` - logs CompanyBook search results
- ✅ `verified_owners` - main data structure (NEW as of Nov 29)
  - Stores owner details + up to 5 companies as JSON
  - Has `top_company` field
  - Includes phone/email allocations
- ✅ `sms_numbers_pool` - Finnish virtual numbers (+358...)
- ✅ `owners_by_company` view - lookup helper
- ⚠️ LEGACY tables still exist but being phased out:
  - `verified_business_profiles` (OLD)
  - Various `business_*` tables

**Status:** Migration to `verified_owners` complete, but legacy tables not removed yet

#### 2. **CompanyBook API Integration** ✅
- ✅ `/api/people/search` - find person by name
- ✅ `/api/people/{ident}?with_data=true` - get person details
- ✅ `/api/relationships/{identifier}` - get ownership data
- ✅ `/api/companies/{uic}?with_data=true` - get company details
- ✅ Address parsing (city_en, region_en, postal_code)
- ✅ English name transliteration

**File:** `browserbase-worker/src/companybook.mjs`  
**Status:** Fully operational

#### 3. **Supabase Edge Functions**

**A. `registry_check`** ✅
- **Purpose:** Initial search when user submits data
- **Input:** `{ full_name, email }`
- **Actions:**
  - Searches CompanyBook for person
  - Finds 100% owned EOOD/ET companies
  - Requires English name for company
  - Writes results to `user_registry_checks`
  - Updates `users_pending.status` → `ready_for_stagehand` or `no_match`
- **File:** `supabase/functions/registry_check/index.ts`
- **Status:** ✅ Deployed and working
- **Test Result:** Returns `no_match` for "Daniel Milenov Martinov" (expected - strict filters)

**B. `users_pending_worker`** ✅
- **Purpose:** Process pending users, create verified_owners records
- **Input:** `{ row }` or empty (picks first pending)
- **Actions:**
  - Searches CompanyBook (detailed search)
  - Derives birthdate from name variations
  - Creates/updates `verified_owners` record
  - Stores up to 5 companies in JSON
  - Selects `top_company` (best quality score)
  - Allocates phone from `sms_numbers_pool`
  - Generates email alias (33mailbox format)
  - Updates `users_pending.status`
- **File:** `supabase/functions/users_pending_worker/index.ts`
- **Status:** ✅ Deployed and working
- **Test Result:** Works, returned `no_match` for test name

**C. `owners_push_slim`** ✅
- **Purpose:** Bulk insert/update companies data
- **File:** `supabase/functions/owners_push_slim/index.ts`
- **Status:** ✅ Deployed (added Nov 30)

#### 4. **Local Workers** (Node.js scripts)

**A. Registry Local Worker** ✅
- **Purpose:** Offline testing, direct CompanyBook queries
- **File:** `browserbase-worker/src/registryLocalWorker.mjs`
- **Status:** ✅ Operational
- **Output:** Creates verified profiles with parsed data

**B. SMS Monitor Worker** 🟡 (exists but needs integration)
- **Purpose:** Poll smstome.com URLs for SMS verification codes
- **File:** `browserbase-worker/src/smsMonitorWorker.mjs`
- **Status:** 🟡 Code exists, needs testing/integration

**C. Email Monitor Worker** 🟡 (exists but needs integration)
- **Purpose:** Monitor Hostinger IMAP for Wallester verification emails
- **File:** `browserbase-worker/src/emailMonitorWorker.mjs`
- **Status:** 🟡 Code exists, needs testing/integration

**D. Wallester Registration Worker** 🔴 (incomplete)
- **Purpose:** Automate Wallester signup via browser automation
- **File:** `browserbase-worker/src/wallesterRegistrationWorker.mjs`
- **Status:** 🔴 EXISTS but likely incomplete/untested
- **Missing:** Full workflow implementation with Browser Use Cloud

---

## ❌ BROKEN / MISSING COMPONENTS

### 🔴 CRITICAL MISSING: User Data Submission Form

**THE BIG PROBLEM:**

The WordPress plugin (`deploy/hostinger/wp-wallester-chat-agent.php`) only provides a **chat widget for support** - it does NOT collect:
- ❌ 3 names (first, middle, last / full name)
- ❌ Birthdate
- ❌ Email

**Current chat widget ONLY collects:**
- ✅ Chat messages (free text)
- ❌ NO structured data fields

**What's Missing:**
1. **HTML form on wallesters.com** to collect:
   ```
   - Full Name (3 names)
   - Birthdate
   - Email
   ```

2. **Form submission handler** that calls Supabase edge function:
   ```javascript
   // Should POST to: registry_check endpoint
   {
     "full_name": "Асен Митков Асенов",
     "email": "user@example.com"
   }
   ```

3. **WordPress integration** (or standalone page) with the form

**SOLUTION NEEDED:** Create a data collection form that:
- Captures 3 names + birthdate + email
- Validates input
- Calls `registry_check` edge function
- Shows user feedback/status

---

### 🟡 INCOMPLETE: Wallester Automation Workflow

**What Exists:**
- ✅ `wallesterRegistrationWorker.mjs` file exists
- ✅ Plan document (`WALLESTER_AUTOMATION_PLAN.md`) complete
- ✅ Browser automation strategy defined

**What's Missing:**
1. **Integration with Browser Use Cloud** 
   - Worker needs to use Browser Use API
   - Session management
   - Form filling logic for Wallester

2. **SMS/Email code extraction integration**
   - Monitoring workers exist but not integrated
   - Code extraction → database → worker handoff

3. **Orchestration**
   - No main loop checking for `signing-up` status
   - No trigger to start automation
   - No error handling/retry logic

4. **Testing**
   - Never tested end-to-end
   - No verification of Wallester account creation

---

### 🟡 INCOMPLETE: Email System Migration

**Current Status:**
- 🔴 Still using `@madoff.33mail.com` in code
- 🔴 Should be `@33mailbox.com`
- ⚠️ Mailbox structure not fully set up
  - Only `support@33mailbox.com` active
  - `securebox@33mailbox.com` created but untested
  - Need to create: `securebox2`, `securebox3`, `securebox4`

**Action Required:**
1. Update all email generation code to use `33mailbox.com`
2. Create additional mailboxes on Hostinger
3. Set up forwarding rules
4. Test IMAP monitoring

---

### ⚠️ DATABASE CLEANUP NEEDED

**Duplicate Indexes:**
- ✅ SQL script exists: `supabase/sql/2025-11-29_remove_duplicate_indexes.sql`
- 🔴 NOT EXECUTED YET
- Impact: Performance Advisor warnings

**Legacy Tables:**
- 🔴 `verified_business_profiles` - should be removed after confirming migration
- 🔴 Various `business_*` tables - audit usage, then remove
- 🔴 `wrappers_flow_stats`, `verification_monitoring`, `user_verifications` - audit then clean

**Action Required:**
1. Run duplicate index removal SQL
2. Audit legacy table usage
3. Create backup/archive
4. Drop unused tables

---

### ⚠️ MISSING: Wallester Referral Link Integration

**Critical Detail:**
- ✅ Referral link defined in `WALLESTER_AUTOMATION_PLAN.md`:
  ```
  https://wallester.com/atrk?c=8eb23415-1a08-4b07-93c3-2e624e2367a7&promo=direct_link
  ```
- 🔴 Not confirmed if worker uses this link
- 🔴 Must be hardcoded in automation script

---

## 📋 DATA FLOW MAP (Current Reality)

```
┌─────────────────────────────────────────────────────────────┐
│                    WALLESTER SYSTEM                         │
└─────────────────────────────────────────────────────────────┘

❌ MISSING: User Form on wallesters.com
   │ (Should collect: 3 names + birthdate + email)
   ▼
   
🔴 GAP: No submission mechanism to Supabase
   │
   ▼

✅ Supabase Edge Function: registry_check
   │ Input: { full_name, email }
   │ ├─> Searches CompanyBook API
   │ ├─> Finds companies (strict filters)
   │ └─> Writes to: user_registry_checks
   ▼
   
✅ Table: users_pending
   │ status: 'pending' → 'ready_for_stagehand' or 'no_match'
   ▼

✅ Supabase Edge Function: users_pending_worker  
   │ (Can be triggered manually or by scheduler)
   │ ├─> Detailed CompanyBook search
   │ ├─> Creates verified_owners record
   │ ├─> Allocates phone from sms_numbers_pool
   │ ├─> Generates email alias
   │ └─> Stores up to 5 companies + top_company
   ▼

✅ Table: verified_owners
   │ Contains: owner info, companies JSON, phone, email alias
   │ Status field: 'verified'
   ▼

🔴 GAP: No trigger to start Wallester automation
   │ (Should check for verified_owners with status='verified')
   ▼

🟡 Wallester Registration Worker (incomplete)
   │ ├─> Should launch Browser Use Cloud session
   │ ├─> Fill Wallester signup form with referral link
   │ ├─> Submit phone for SMS verification
   │ │   ▼
   │ │   🟡 SMS Monitor (exists, not integrated)
   │ │   └─> Extracts code from smstome.com
   │ │
   │ ├─> Submit email for verification  
   │ │   ▼
   │ │   🟡 Email Monitor (exists, not integrated)
   │ │   └─> Extracts code from support@33mailbox.com IMAP
   │ │
   │ └─> Complete registration
   ▼

❌ MISSING: Status updates back to database
   │ (Should update verified_owners.wallester_status)
   ▼

❌ MISSING: Notification to user
   (Account ready, login details, etc.)
```

---

## 🔧 WHAT NEEDS TO BE FIXED (Priority Order)

### Priority 1: CRITICAL - User Data Entry

**Problem:** No way for users to submit their data!

**Solution:**
1. Create HTML form (can embed in WordPress or standalone page):
   ```html
   <form id="wallester-registration">
     <input name="full_name" placeholder="Пълно име (3 имена)"  />
     <input name="birthdate" type="date" />
     <input name="email" type="email" />
     <button>Провери в регистъра</button>
   </form>
   ```

2. Add JavaScript to call registry_check:
   ```javascript
   async function submitRegistration(data) {
     const response = await fetch(
       'https://YOUR_PROJECT.supabase.co/functions/v1/registry_check',
       {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': 'Bearer ANON_KEY'
         },
         body: JSON.stringify(data)
       }
     );
     return response.json();
   }
   ```

3. Show user feedback based on response

**Files to Create/Modify:**
- New: `deploy/hostinger/wallester-registration-form.html`
- New: `deploy/hostinger/wallester-form-handler.js`
- Modify: WordPress page or plugin to include form

---

### Priority 2: HIGH - Complete Wallester Automation

**Problem:** Registration worker incomplete, never tested

**Solution:**
1. **Integrate Browser Use Cloud:**
   ```javascript
   // In wallesterRegistrationWorker.mjs
   import axios from 'axios';
   
   const browserUseAPI = axios.create({
     baseURL: 'https://api.browser-use.com/api/v2',
     headers: { 'X-Browser-Use-API-Key': process.env.BROWSER_USE_API_KEY }
   });
   
   // Create task to fill Wallester form
   const task = await browserUseAPI.post('/tasks', {
     task: `Go to ${WALLESTER_REFERRAL_LINK}, fill signup form...`,
     maxSteps: 50
   });
   ```

2. **Connect SMS/Email monitors:**
   - Run monitors as separate processes
   - Poll database for codes
   - Update worker to wait for codes

3. **Add orchestration loop:**
   ```javascript
   // Main loop in wallesterRegistrationWorker.mjs
   while (true) {
     const pending = await supabase
       .from('verified_owners')
       .select('*')
       .eq('status', 'verified')
       .limit(1)
       .single();
     
     if (pending) {
       await processWallesterRegistration(pending);
     }
     
     await sleep(60000); // Check every minute
   }
   ```

**Files to Modify:**
- `browserbase-worker/src/wallesterRegistrationWorker.mjs`
- `browserbase-worker/src/smsMonitorWorker.mjs`
- `browserbase-worker/src/emailMonitorWorker.mjs`

---

### Priority 3: MEDIUM - Database Cleanup

**Problem:** Duplicate indexes, legacy tables

**Solution:**
1. Run SQL script:
   ```bash
   # In Supabase SQL Editor
   # Execute: supabase/sql/2025-11-29_remove_duplicate_indexes.sql
   ```

2. Audit legacy tables:
   ```sql
   -- Check if verified_business_profiles is still used
   SELECT COUNT(*) FROM verified_business_profiles;
   
   -- If migration complete and backups exist, DROP
   DROP TABLE IF EXISTS verified_business_profiles CASCADE;
   ```

3. Update Performance Advisor → Rerun linter

---

### Priority 4: MEDIUM - Email System Migration

**Problem:** Still using wrong domain, mailboxes not set up

**Solution:**
1. Update email generation in:
   - `supabase/functions/users_pending_worker/index.ts`
   - Change from `@madoff.33mail.com` to `@33mailbox.com`

2. Create mailboxes in Hostinger:
   - `securebox2@33mailbox.com`
   - `securebox3@33mailbox.com`
   - `securebox4@33mailbox.com`

3. Set up forwarding: all → `support@33mailbox.com`

4. Test IMAP monitoring from `emailMonitorWorker.mjs`

---

### Priority 5: LOW - Testing & Validation

**Problem:** System never tested end-to-end

**Solution:**
1. Use real Bulgarian names with known companies
2. Test each component separately
3. Test full workflow
4. Document test results
5. Create troubleshooting guide

---

## 📝 KEY FINDINGS

### ✅ What Works Well
1. **CompanyBook API integration** - solid, tested
2. **Database schema** - well designed (after Nov 29 migration)
3. **Edge functions** - deployed and functional
4. **Phone number pool** - structured and ready
5. **Planning documents** - comprehensive

### ❌ What's Broken
1. **NO USER INPUT FORM** - users can't submit data! (CRITICAL)
2. **Wallester automation incomplete** - never tested
3. **SMS/Email monitors not integrated** - exist but orphaned
4. **No orchestration** - nothing triggers automation
5. **Email domain outdated** - still using old 33mail.com

### 🤔 What's Unclear
1. **How do users currently submit data?** - Is there a form somewhere else?
2. **Is Wallester worker tested at all?** - Any logs/evidence?
3. **What triggers automation?** - Manual? Scheduled? Never?

---

## 🚀 RECOMMENDED NEXT STEPS

### Step 1: Clarify Current User Flow
**Action:** Confirm how users currently provide their 3 names + birthdate + email
- Is there an existing form?
- Is data entered manually into database?
- Is there a different WordPress page/plugin?

### Step 2: Create Data Entry Form (if missing)
**Action:** Build submission form on wallesters.com
- HTML form with validation
- JavaScript handler calling registry_check
- User feedback/status display

### Step 3: Test Edge Functions with Real Data
**Action:** Use actual Bulgarian person with known companies
- Test `registry_check`
- Test `users_pending_worker`
- Verify `verified_owners` record creation

### Step 4: Complete Wallester Automation
**Action:** Finish wallesterRegistrationWorker.mjs
- Add Browser Use Cloud integration
- Connect SMS/Email monitors
- Test with one real business

### Step 5: Database Cleanup
**Action:** Remove duplicates, archive legacy tables

---

## 📞 QUESTIONS FOR USER

1. **How do users currently submit their data (3 names + birthdate + email)?**
   - Is there an existing form we haven't seen?
   - Or is this functionality completely missing?

2. **Has Wallester automation ever been tested?**
   - Any logs or evidence of it running?
   - Any Wallester accounts successfully created?

3. **What should trigger the automation?**
   - Manual start?
   - Scheduled (cron)?
   - Immediate after registry check?

4. **Priority: What to fix first?**
   - Build user form?
   - Complete Wallester automation?
   - Test existing components?

---

**Document Status:** Complete analysis of current system state  
**Next Action:** Await user clarification on missing pieces before proceeding with fixes
