# Wallester n8n Workflows - Quick Reference

## 📦 Created Workflows

### 1. SMS OTP Scraper Sub-Workflow
**File**: `n8n_workflows/sms_otp_scraper_subflow.json`
**Purpose**: Scrapes SMS verification codes from smsto.me
**Inputs**:
- `phone_number`: Full phone with country code (e.g., +447481793989)
- `sms_url`: Direct SMS inbox URL
- `expected_sender`: SMS sender name (e.g., "Wallester")

**Output**:
- `otp_code`: 6-digit verification code
- `success`: Boolean
- `message`: Status message

### 2. Email OTP Scraper Sub-Workflow
**File**: `n8n_workflows/email_otp_scraper_subflow.json`
**Purpose**: Scrapes email verification codes from workmail.pro
**Inputs**:
- `email_address`: Email to check (e.g., company47@workmail.pro)
- `expected_sender`: Email sender name
- `max_wait_seconds`: Timeout (default: 60)

**Output**:
- `otp_code`: 6-digit verification code
- `success`: Boolean
- `message`: Status message

### 3. Wallester Combined Automation (MAIN)
**File**: `n8n_workflows/wallester_combined_automation.json`
**Purpose**: Complete end-to-end Wallester business registration
**Trigger**: Supabase webhook from `verified_owners` table INSERT

**Workflow Phases**:
1. ✅ **Data Normalization** - Parse webhook payload
2. ✅ **Business Iteration** - Loop through waiting_list
3. ✅ **Duplicate Check** - Skip if EIK exists
4. ✅ **Phone Selection** - Get UK number from Google Sheet
5. ✅ **Email Generation** - Create workmail.pro alias
6. ✅ **Wallester Form 1** - Fill initial form (business name, phone)
7. ✅ **SMS OTP** - Scrape and submit SMS code
8. ✅ **Email Entry** - Enter generated email
9. ✅ **Email OTP** - Scrape and submit email code
10. ✅ **Business Form** - Fill complete business details
11. ✅ **Data Storage** - Save to Supabase
12. ✅ **Phone Cleanup** - Mark phone as used

## 🔑 Required Credentials

### n8n Credentials (3 total)
1. **Supabase API**
   - Host: `https://ansiaiuaygcfztabtknl.supabase.co`
   - Service Role Key: (from Supabase settings)

2. **Airtop account**
   - API Key: (from Airtop dashboard)

3. **Google Sheets OAuth2**
   - OAuth2 flow with edit permissions
   - Sheet ID: `1xjBUp2i5PGb4L6WSkBHN8sG8qp5EUp3oxssuX6XE-tQ`

### Airtop Profiles (3 total)
1. **smstome** - Login: kirkomrk@gmail.com / zdraveibobi12
2. **workmail** - For workmail.pro access
3. **wallester** - Clean profile for Wallester automation

## 📊 Google Sheet Structure

**URL**: https://docs.google.com/spreadsheets/d/1xjBUp2i5PGb4L6WSkBHN8sG8qp5EUp3oxssuX6XE-tQ/edit

**Columns**:
- **A (number)**: Phone with +44 prefix (e.g., +447481793989)
- **B (status)**: empty/"available"/"reserved"/"used"
- **C (last_used_at)**: Timestamp
- **D (note)**: Notes (e.g., "wallester Company Name")

**Workflow Updates**:
- Picks first available number → marks as "reserved"
- After completion → marks as "used"

## 🔗 Important URLs

### n8n
- **Dashboard**: https://n8n.srv1201204.hstgr.cloud
- **Workflows**: https://n8n.srv1201204.hstgr.cloud/workflows
- **Executions**: https://n8n.srv1201204.hstgr.cloud/executions
- **Credentials**: https://n8n.srv1201204.hstgr.cloud/credentials
- **Login**: miropetrovski12@gmail.com / MagicBoyy24#

### Supabase
- **Dashboard**: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl
- **SQL Editor**: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/sql/new
- **Login**: madoff1312@outlook.com / MagicBoyy24#

### Resources
- **Google Sheet**: https://docs.google.com/spreadsheets/d/1xjBUp2i5PGb4L6WSkBHN8sG8qp5EUp3oxssuX6XE-tQ/edit
- **smsto.me**: http://smstome.com (kirkomrk@gmail.com / zdraveibobi12)

## 🚀 Quick Deploy Steps

### 1. Import Workflows (5 mins)
```bash
# Navigate to n8n workflows page
# Import in this order:
1. sms_otp_scraper_subflow.json → Note Workflow ID
2. email_otp_scraper_subflow.json → Note Workflow ID  
3. wallester_combined_automation.json
```

### 2. Update Credentials (5 mins)
- All Supabase nodes → Use "Supabase API" credential
- All Airtop nodes → Use "Airtop account" credential
- All Google Sheets nodes → Use "Google Sheets OAuth2" credential

### 3. Link Sub-Workflows (2 mins)
- "Get SMS OTP" node → Link to SMS scraper workflow ID
- "Get Email OTP" node → Link to Email scraper workflow ID

### 4. Configure Webhook (3 mins)
- Copy webhook URL from "Supabase Webhook" node
- Add webhook in Supabase Dashboard → Database → Webhooks
- Table: `verified_owners`, Event: `INSERT`

### 5. Activate (1 min)
- Activate main workflow only
- Sub-workflows stay inactive

**Total Time: ~15 minutes**

## 📋 Deployment Checklist

```
Phase 1: Credentials
[ ] Supabase API credential created
[ ] Airtop account credential created  
[ ] Google Sheets OAuth2 credential created
[ ] Airtop profiles created (smstome, workmail, wallester)

Phase 2: Workflows
[ ] SMS OTP Scraper imported (workflow ID: _______)
[ ] Email OTP Scraper imported (workflow ID: _______)
[ ] Main workflow imported

Phase 3: Configuration
[ ] All Supabase nodes updated with credentials
[ ] All Airtop nodes updated with credentials
[ ] All Google Sheets nodes updated with credentials
[ ] Sub-workflow IDs linked in main workflow
[ ] Webhook URL copied

Phase 4: Supabase Setup
[ ] Webhook created in Supabase
[ ] wallester_business_profiles table exists
[ ] Table has proper RLS policies

Phase 5: Resources
[ ] Google Sheet has UK +44 numbers
[ ] Numbers have proper status columns
[ ] Sheet is accessible via OAuth2

Phase 6: Activation
[ ] Main workflow activated
[ ] Test execution successful
```

## 🧪 Quick Test

### Test Data for Webhook
```json
{
  "type": "INSERT",
  "table": "verified_owners",
  "record": {
    "id": "test-uuid",
    "full_name": "John Doe",
    "owner_first_name_en": "John",
    "owner_last_name_en": "Doe",
    "owner_birthdate": "1990-01-01",
    "referral_url": "https://wallester.com/business/?ref=TEST",
    "waiting_list": [
      {
        "EIK": "123456789",
        "VAT": "BG123456789",
        "business_name_en": "Test Ltd",
        "business_name_wallester": "Test Ltd",
        "entity_type": "EOOD",
        "ownership_percent": 100,
        "nkid_code": "62.01",
        "nkid_description": "Computer programming",
        "address_city": "Sofia",
        "address_postcode": "1000",
        "address_street": "Test St",
        "address_number": "1"
      }
    ]
  }
}
```

### Expected Flow
1. Webhook receives data ✅
2. Data normalized ✅
3. Business split into items ✅
4. EIK checked (not found) ✅
5. Phone selected from sheet ✅
6. Email generated ✅
7. Phone marked "reserved" ✅
8. Airtop starts registration ✅
9. SMS OTP scraped ✅
10. Email OTP scraped ✅
11. Business form completed ✅
12. Saved to Supabase ✅
13. Phone marked "used" ✅

## 🔧 Common Issues & Quick Fixes

### "No available UK phone numbers"
**Fix**: Add more +44 numbers to Google Sheet with status="available"

### "SMS OTP not found"
**Fix**: Check smsto.me manually, verify credentials, increase wait time

### "Email OTP not found"  
**Fix**: Verify workmail.pro access, check email generation logic

### "Airtop agent timeout"
**Fix**: Check Airtop session logs, adjust instructions, verify profile

### "EIK already exists"
**Expected**: Workflow skips duplicates automatically

## 📊 Monitoring Commands

### Check Workflow Status
```
Visit: https://n8n.srv1201204.hstgr.cloud/executions
Filter by: "Wallester Combined Automation (MAIN)"
```

### Check Phone Pool
```
Open Google Sheet
Count rows where status = "available"
```

### Check Supabase Data
```sql
-- See recent completions
SELECT * FROM wallester_business_profiles 
ORDER BY created_at DESC LIMIT 10;

-- Count by status
SELECT status, COUNT(*) FROM wallester_business_profiles 
GROUP BY status;
```

## 🎯 Success Metrics

### Per Execution
- ✅ Webhook received: Yes/No
- ✅ Businesses processed: Count
- ✅ Duplicates skipped: Count
- ✅ Registrations completed: Count
- ✅ Phones used: Count
- ✅ Average execution time: ~5-10 minutes per business

### Daily
- Total executions: X
- Success rate: Y%
- Available phones remaining: Z

## 📞 Quick Support

| Issue | Check | Fix |
|-------|-------|-----|
| Workflow not triggering | Supabase webhook | Verify URL and events |
| Credentials error | n8n credentials page | Re-authenticate |
| Phone pool empty | Google Sheet | Add more numbers |
| Airtop failure | Airtop dashboard | Check session logs |
| Duplicate EIK | Supabase table | Expected behavior |

## 📚 Documentation Files

- **Full Deployment Guide**: `WALLESTER_WORKFLOWS_DEPLOYMENT_GUIDE.md`
- **System Architecture**: `WALLESTER_AUTOMATION_ARCHITECTURE.md`
- **Verification Report**: `SYSTEM_VERIFICATION_REPORT.md`
- **Flow Specification**: `N8N_COMBINED_FLOW_SPEC.md`

## 🎉 That's It!

**3 workflows, 15-minute setup, full automation.**

Start by importing workflows, configuring credentials, and activating. The system will handle everything from phone allocation to OTP verification to final form submission automatically!

**Questions?** See the full deployment guide or check execution logs in n8n.
