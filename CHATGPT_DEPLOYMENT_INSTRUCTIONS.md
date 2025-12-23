# ChatGPT Agent Instructions – Wallester n8n Deployment
**For:** ChatGPT Code Interpreter / Agent Mode
**Date:** 2025-12-20

---

## 🎯 Your Mission

You are a deployment automation agent. Your task is to complete the deployment of Wallester automation system components to Supabase and n8n VPS.

---

## 📋 Context

**Project:** Wallester business registration automation  
**Stack:** Supabase (database + edge functions) + n8n (workflows on Hostinger VPS)  
**Status:** 95% complete, needs final deployment of updated components

**GitHub Repo:** https://github.com/kirkomrk2-web/registry-stagehand-worker

---

## 🔑 Access Credentials

### Supabase
- **URL:** https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl
- **Login:** madoff1312@outlook.com / MagicBoyy24#
- **Project Ref:** ansiaiuaygcfztabtknl

### n8n VPS  
- **URL:** https://n8n.srv1201204.hstgr.cloud
- **Login:** miropetrovski12@gmail.com / MagicBoyy24#

### smstome.com (for Airtop profile setup)
- **Login:** kirkomrk@gmail.com / zdraveibobi12

---

## 📁 Files to Deploy

All files are in the GitHub repo at:
- `supabase/migrations/create_sms_numbers_pool.sql`
- `supabase/functions/registry_check/index.ts`
- `supabase/functions/users_pending_worker/index.ts`
- `n8n_workflows/smstome_numbers_scraper.json`

---

## 🚀 Tasks to Complete

### TASK 1: Deploy SQL Migration (Supabase)

1. Navigate to https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/sql/new
2. Login if needed
3. Open file: `supabase/migrations/create_sms_numbers_pool.sql`
4. Copy entire contents
5. Paste into Supabase SQL Editor
6. Click "Run" button
7. Verify: Check for success message (should say "Success. No rows returned")

**Expected result:** `sms_numbers_pool` table now has columns: platform, sms_url, country, notes

### TASK 2: Deploy Edge Function - registry_check

1. Navigate to https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/functions
2. Find "registry_check" in the list
3. Click on it to open editor
4. Open local file: `supabase/functions/registry_check/index.ts`
5. Select ALL existing code in Supabase editor and DELETE
6. Copy entire contents from local file
7. Paste into Supabase editor
8. Click "Deploy" button
9. Wait for deployment to complete (shows "Deployed" status)

**Changes in this version:**
- Extracts `ownership_percent` from relationships
- Supports OOD companies with ≥50% ownership
- Extracts NKID code and description
- Improved eligibility logic

### TASK 3: Deploy Edge Function - users_pending_worker

1. Navigate to https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/functions
2. Find "users_pending_worker" in the list
3. Click on it to open editor
4. Open local file: `supabase/functions/users_pending_worker/index.ts`
5. Select ALL existing code and DELETE
6. Copy entire contents from local file
7. Paste into editor
8. Click "Deploy"
9. Wait for success

**Changes in this version:**
- New `makeWallesterName()` function (adds SLLC for EOOD)
- New `formatDetailedAddress()` (handles street vs block addresses)
- Updated `pickTopCompany()` (EOOD > ET > OOD priority)
- New waiting_list format with NKID, detailed addresses, Wallester names

### TASK 4: Import SMS Scraper Workflow (n8n)

1. Navigate to https://n8n.srv1201204.hstgr.cloud
2. Login if needed
3. Click "Create workflow" dropdown → "Import from file"
4. Upload: `n8n_workflows/smstome_numbers_scraper.json`
5. Workflow will open with 4 nodes:
   - Schedule Trigger (every 6 hours)
   - Scrape smstome Numbers (Airtop)
   - Parse Numbers (Function)
   - Insert to Supabase
6. Verify credentials are linked (should show green checkmarks)
7. Save workflow
8. Click "Execute workflow" to test
9. Check Supabase `sms_numbers_pool` table for new numbers

### TASK 5: Verify Airtop Profile Setup

1. In n8n, check if "smstome" Airtop profile exists
2. If not, you may need to create it with:
   - Profile name: smstome
   - Login URL: https://smstome.com
   - Credentials: kirkomrk@gmail.com / zdraveibobi12

---

## ✅ Success Criteria

After completing all tasks, verify:

### In Supabase:
```sql
-- Check sms_numbers_pool has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sms_numbers_pool' 
ORDER BY ordinal_position;
-- Should show: platform, sms_url, country, notes

-- Test a new signup flow
-- Check waiting_list format in verified_owners
SELECT waiting_list->0->>'nkid_code', 
       waiting_list->0->>'business_name_wallester',
       waiting_list->0->>'address_block'
FROM verified_owners
ORDER BY created_at DESC
LIMIT 1;
-- Should show NKID codes, Wallester names with SLLC, block addresses
```

### In n8n:
- SMS Numbers scraper workflow imported and executable
- Phone workflow has Supabase + Airtop credentials
- Email workflow has Airtop credential
- Main workflow is active and has recent successful executions

---

## 🐛 Troubleshooting

### If SQL migration fails:
- Error about "platform does not exist" → Use the UPDATED version (already fix-ed)
- Error about foreign key → The fix-ed version handles orphan cleanup automatically

### If Edge Function deploy fails:
- Verify you're logged in as madoff1312@outlook.com
- Check if there are syntax errors in copied code
- Try refreshing the page and re-paste

### If n8n workflow import fails:
- Verify JSON file is valid
- Check if credentials exist before saving
- You can manually create credentials if auto-detection fails

---

## 📊 Expected Outcomes

### After registry_check deployment:
New signups will have companies in `user_registry_checks` with:
- `ownership_percent`: 50-100
- `nkid_code`: "56.10" etc
- `nkid_description`: Short activity description

### After users_pending_worker deployment:
New `verified_owners` will have `waiting_list` with:
- `business_name_wallester`: Original name or with " SLLC"
- `address_block`, `address_housing_estate`: For block-based addresses
- `nkid_code`, `nkid_description`: Instead of long subjectOfActivity

### After SMS scraper:
`sms_numbers_pool` table will auto-populate with UK numbers from smstome every 6 hours.

---

## 💡 Tips for Automation

- Take screenshots at each step for verification
- If you encounter 2FA or CAPTCHA, report it immediately
- For long-running operations (like Airtop scraping), wait at least 60 seconds before checking results
- All workflows use UPSERT logic, so running them multiple times is safe

---

## 🎓 Learning Resources

The deployment follows standard practices for:
- Supabase Migrations (SQL DDL with safeguards)
- Deno Edge Functions (TypeScript serverless)
- n8n Workflow JSON (declarative node graphs)
- Airtop Browser Agent (AI-controlled browser automation)

---

**Good luck with the deployment! 🚀**
