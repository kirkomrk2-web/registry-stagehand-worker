# Wallester n8n Workflows - Complete Deployment Guide

## 📋 Overview

This guide provides step-by-step instructions to deploy the complete Wallester automation system to your n8n instance. The system consists of:

1. **SMS OTP Scraper (Sub-workflow)** - Retrieves SMS verification codes from smsto.me
2. **Email OTP Scraper (Sub-workflow)** - Retrieves email verification codes from workmail.pro
3. **Wallester Combined Automation (MAIN)** - Orchestrates the entire registration process

## 🎯 Prerequisites

Before starting, ensure you have:

- ✅ n8n VPS running at: https://n8n.srv1201204.hstgr.cloud
- ✅ Login credentials: miropetrovski12@gmail.com / MagicBoyy24#
- ✅ Supabase project configured with proper credentials
- ✅ Airtop API key and profiles set up
- ✅ Google Sheet with UK phone numbers: https://docs.google.com/spreadsheets/d/1xjBUp2i5PGb4L6WSkBHN8sG8qp5EUp3oxssuX6XE-tQ/edit?usp=sharing
- ✅ smsto.me account: kirkomrk@gmail.com / zdraveibobi12

## 📊 Google Sheet Structure

Your Google Sheet should have the following columns:

| Column A | Column B | Column C | Column D |
|----------|----------|----------|----------|
| number   | status   | last_used_at | note |
| +447481793989 | available | | |
| +447481793990 | available | | |
| +447481793991 | available | | |

**Important Notes:**
- Numbers MUST start with +44 (UK country code)
- Status values: empty, "available", "reserved", "used"
- The workflow will automatically update status to "reserved" when picked, then "used" when completed
- Sheet must be accessible with edit permissions via Google Sheets OAuth2

## 🚀 Step-by-Step Deployment

### STEP 1: Set Up Credentials in n8n

#### 1.1 Supabase API Credential
1. Go to https://n8n.srv1201204.hstgr.cloud/credentials
2. Click "Add credential" → Search for "Supabase"
3. Name: `Supabase API`
4. Add:
   - **Host**: `https://ansiaiuaygcfztabtknl.supabase.co`
   - **Service Role Secret**: Your Supabase service role key
5. Save credential

#### 1.2 Airtop API Credential
1. Click "Add credential" → Search for "Airtop"
2. Name: `Airtop account`
3. Add your Airtop API key
4. Save credential

#### 1.3 Google Sheets OAuth2 Credential
1. Click "Add credential" → Search for "Google Sheets"
2. Name: `Google Sheets OAuth2`
3. Follow OAuth2 flow to connect your Google account
4. Grant edit permissions for the spreadsheet
5. Save credential

### STEP 2: Create Airtop Profiles

You need to create 3 Airtop profiles for different services:

#### 2.1 Profile: "smstome"
- **Purpose**: For logging into smsto.me to scrape SMS codes
- **Credentials**: 
  - Email: kirkomrk@gmail.com
  - Password: zdraveibobi12
- Create this profile in your Airtop dashboard

#### 2.2 Profile: "workmail"
- **Purpose**: For accessing workmail.pro to scrape email verification codes
- **Note**: May require setting up login credentials or using direct URL access

#### 2.3 Profile: "wallester"
- **Purpose**: For Wallester business registration automation
- **Note**: This can be a clean profile without pre-configured logins

### STEP 3: Import Sub-Workflows

#### 3.1 Import SMS OTP Scraper
1. Go to https://n8n.srv1201204.hstgr.cloud/workflows
2. Click "Add workflow" → "Import from File"
3. Select: `n8n_workflows/sms_otp_scraper_subflow.json`
4. After import:
   - Update Airtop credential to use your `Airtop account`
   - **IMPORTANT**: Note the Workflow ID (you'll need this later)
   - Set workflow to **INACTIVE** (sub-workflows should not auto-trigger)
5. Save the workflow

#### 3.2 Import Email OTP Scraper
1. Click "Add workflow" → "Import from File"
2. Select: `n8n_workflows/email_otp_scraper_subflow.json`
3. After import:
   - Update Airtop credential to use your `Airtop account`
   - **IMPORTANT**: Note the Workflow ID
   - Set workflow to **INACTIVE**
4. Save the workflow

### STEP 4: Import Main Combined Workflow

1. Click "Add workflow" → "Import from File"
2. Select: `n8n_workflows/wallester_combined_automation.json`
3. After import, you need to configure several nodes:

#### 4.1 Update Supabase Nodes
Find these nodes and update credentials:
- **Check EIK in Wallester DB** → Use `Supabase API` credential
- **Save to Supabase** → Use `Supabase API` credential

#### 4.2 Update Google Sheets Nodes
Find these nodes and update credentials:
- **Read Phone Numbers** → Use `Google Sheets OAuth2` credential
- **Mark Phone Reserved** → Use `Google Sheets OAuth2` credential
- **Mark Phone Used** → Use `Google Sheets OAuth2` credential

#### 4.3 Update Airtop Nodes
Find these nodes and update credentials (use `Airtop account`):
- **Airtop: Initial Form (Phone)**
- **Airtop: Submit SMS OTP**
- **Airtop: Enter Email**
- **Airtop: Submit Email OTP**
- **Airtop: Fill Business Details**

#### 4.4 Link Sub-Workflow IDs
This is **CRITICAL**:

1. Find the node: **Get SMS OTP**
   - Click on it
   - In the "Workflow ID" field, select the SMS OTP Scraper workflow you imported in Step 3.1
   - OR manually enter its workflow ID

2. Find the node: **Get Email OTP**
   - Click on it
   - In the "Workflow ID" field, select the Email OTP Scraper workflow you imported in Step 3.2
   - OR manually enter its workflow ID

#### 4.5 Configure Webhook
1. Find the **Supabase Webhook** node
2. Note the webhook URL (it will be something like):
   ```
   https://n8n.srv1201204.hstgr.cloud/webhook/wallester-automation
   ```
3. You'll need to configure this webhook in Supabase (see Step 5)

### STEP 5: Configure Supabase Webhook

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl
2. Navigate to **Database** → **Webhooks**
3. Create a new webhook:
   - **Name**: `Wallester Automation Trigger`
   - **Table**: `verified_owners`
   - **Events**: Check `INSERT`
   - **Type**: `HTTP Request`
   - **Method**: `POST`
   - **URL**: `https://n8n.srv1201204.hstgr.cloud/webhook/wallester-automation`
   - **HTTP Headers**:
     ```json
     {
       "Content-Type": "application/json"
     }
     ```
4. Save the webhook

### STEP 6: Create wallester_business_profiles Table (If Not Exists)

Run this SQL in Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS wallester_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES verified_owners(id),
  eik TEXT NOT NULL UNIQUE,
  business_name TEXT,
  phone_used TEXT,
  email_used TEXT,
  status TEXT DEFAULT 'pending',
  reference_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE wallester_business_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
CREATE POLICY "Service role can do everything"
  ON wallester_business_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for faster EIK lookups
CREATE INDEX idx_wallester_eik ON wallester_business_profiles(eik);
```

### STEP 7: Activate the Main Workflow

1. Open the **Wallester Combined Automation (MAIN)** workflow
2. Review all nodes to ensure credentials are properly set
3. Click the toggle to **ACTIVATE** the workflow
4. The workflow is now live and listening for Supabase webhooks

## 🔍 Workflow Logic Explained

### Phase 1: Data Reception & Normalization
1. **Supabase Webhook** receives verified_owners data
2. **Normalize & Map Data** parses waiting_list JSON and extracts owner details
3. **Split Out Businesses** creates separate execution paths for each business

### Phase 2: Duplicate Check
4. **Check EIK in Wallester DB** queries Supabase to see if business already registered
5. **Is New Business?** routes to either continue or skip

### Phase 3: Resource Allocation
6. **Read Phone Numbers** fetches all rows from Google Sheet
7. **Select Phone & Generate Email** picks first available UK number and creates email
   - Email format: `<businessname><2digits>@workmail.pro`
   - Example: `company47@workmail.pro`
8. **Mark Phone Reserved** updates Google Sheet status to "reserved"

### Phase 4: Wallester Registration (Airtop Browser Automation)

#### Step 4.1: Initial Form
9. **Airtop: Initial Form (Phone)**
   - Navigates to referral URL
   - Handles cookie popup
   - Fills business name, country (Bulgaria), phone (+44)
   - Submits to request SMS OTP

#### Step 4.2: SMS Verification
10. **Get SMS OTP** (calls sub-workflow)
    - Logs into smsto.me
    - Navigates to SMS inbox for the selected number
    - Extracts 6-digit OTP code
11. **Airtop: Submit SMS OTP**
    - Types OTP character by character
    - Submits and waits for email field

#### Step 4.3: Email Entry
12. **Airtop: Enter Email**
    - Types generated email address
    - Submits to request email OTP

#### Step 4.4: Email Verification
13. **Get Email OTP** (calls sub-workflow)
    - Accesses workmail.pro for the generated email
    - Extracts 6-digit OTP code
14. **Airtop: Submit Email OTP**
    - Types email OTP
    - Submits and waits for redirect to main form

#### Step 4.5: Complete Business Form
15. **Prepare Business Details**
    - Formats all business data for final form
    - Builds full address string
16. **Airtop: Fill Business Details**
    - Fills all business information (EIK, VAT, address, etc.)
    - Fills owner information (names, birthdate, ownership %)
    - Selects business category based on NKID
    - Submits final form
    - Waits for confirmation

### Phase 5: Data Storage & Cleanup
17. **Save to Supabase** - Writes completed profile to wallester_business_profiles
18. **Mark Phone Used** - Updates Google Sheet status to "used"
19. **Final Success Output** - Returns completion summary

## 🎯 Testing the Workflow

### Test 1: Manual Webhook Trigger
1. Go to the main workflow
2. Click "Execute Workflow" button
3. In the webhook node, click "Listen for test event"
4. Send a test POST request to the webhook URL with sample data:

```json
{
  "type": "INSERT",
  "table": "verified_owners",
  "record": {
    "id": "test-uuid",
    "full_name": "Test Owner",
    "owner_first_name_en": "John",
    "owner_last_name_en": "Doe",
    "owner_birthdate": "1990-01-01",
    "referral_url": "https://wallester.com/business/?ref=YOURREF",
    "waiting_list": [
      {
        "EIK": "123456789",
        "VAT": "BG123456789",
        "business_name_en": "Test Company Ltd",
        "business_name_wallester": "Test Company Ltd",
        "entity_type": "EOOD",
        "ownership_percent": 100,
        "nkid_code": "62.01",
        "nkid_description": "Computer programming activities",
        "address_city": "Sofia",
        "address_postcode": "1000",
        "address_street": "Test Street",
        "address_number": "1",
        "description_en": "IT services company"
      }
    ]
  }
}
```

### Test 2: End-to-End with Real Data
1. Insert a real record into Supabase `verified_owners` table
2. The webhook should automatically trigger
3. Monitor execution at: https://n8n.srv1201204.hstgr.cloud/executions
4. Check Google Sheet to see phone number status updates
5. Verify final record in `wallester_business_profiles` table

## 🔧 Troubleshooting

### Issue: "No available UK phone numbers"
**Solution**: Check your Google Sheet
- Ensure numbers start with +44
- Ensure status column is empty or "available"
- Add more numbers if all are used

### Issue: SMS OTP not found
**Possible Causes:**
- SMS took longer than expected to arrive
- Wrong phone number or SMS URL
- smsto.me login failed

**Solution:**
- Check smsto.me manually to see if SMS arrived
- Verify smsto.me credentials
- Increase wait time in SMS scraper instructions

### Issue: Email OTP not found
**Possible Causes:**
- Email delivery delay
- Wrong email format
- workmail.pro access issue

**Solution:**
- Check if email alias was created properly
- Verify workmail.pro accessibility
- Increase max_wait_seconds parameter

### Issue: Airtop agent fails on form filling
**Possible Causes:**
- Wallester website structure changed
- Timeout issues
- Network problems

**Solution:**
- Review Airtop live view URL (sent to Slack if configured)
- Check Airtop session logs
- Adjust agent instructions if needed

### Issue: Duplicate EIK error
**Expected Behavior**: The workflow automatically skips businesses with existing EIK
- Check **Skip Duplicate** node output
- Review `wallester_business_profiles` table for existing records

## 📊 Monitoring & Maintenance

### Daily Checks
1. **Execution Status**: Check n8n executions page for failures
2. **Phone Pool**: Ensure Google Sheet has available numbers
3. **Supabase Records**: Verify new profiles are being created

### Weekly Maintenance
1. **Refresh Phone Numbers**: Add new UK numbers to Google Sheet
2. **Review Failed Executions**: Investigate any errors
3. **Update Airtop Profiles**: Ensure logins still work

### Monthly Review
1. **Success Rate**: Calculate % of successful registrations
2. **Performance**: Check average execution time
3. **Optimize**: Update agent instructions based on learnings

## 🎨 Customization Options

### Change Email Domain
Edit the **Select Phone & Generate Email** node:
```javascript
const emailAddress = `${businessSlug}${randomDigits}@yourdomain.com`;
```

### Add More Business Categories
Update the **Airtop: Fill Business Details** instructions with more NKID mappings

### Change Referral URL
Update in Supabase `verified_owners.referral_url` column or set default in **Normalize & Map Data** node

### Add Retry Logic
Wrap Airtop nodes in Error Trigger to retry failed steps

## 📞 Support & Resources

- **n8n Dashboard**: https://n8n.srv1201204.hstgr.cloud
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl
- **Google Sheet**: https://docs.google.com/spreadsheets/d/1xjBUp2i5PGb4L6WSkBHN8sG8qp5EUp3oxssuX6XE-tQ/edit
- **System Verification Report**: See `SYSTEM_VERIFICATION_REPORT.md`
- **Architecture Docs**: See `WALLESTER_AUTOMATION_ARCHITECTURE.md`

## ✅ Deployment Checklist

Use this checklist to ensure everything is properly configured:

- [ ] All credentials created in n8n (Supabase, Airtop, Google Sheets)
- [ ] Airtop profiles created (smstome, workmail, wallester)
- [ ] SMS OTP Scraper sub-workflow imported and workflow ID noted
- [ ] Email OTP Scraper sub-workflow imported and workflow ID noted
- [ ] Main workflow imported with all credentials updated
- [ ] Sub-workflow IDs linked in "Get SMS OTP" and "Get Email OTP" nodes
- [ ] Google Sheet structured correctly with +44 numbers
- [ ] Supabase webhook configured pointing to n8n webhook URL
- [ ] wallester_business_profiles table created in Supabase
- [ ] Main workflow activated
- [ ] Test execution completed successfully
- [ ] Monitoring setup in place

## 🎉 You're Ready!

Once all items in the checklist are complete, your Wallester automation system is fully operational. The system will:

1. ✅ Automatically trigger when new verified_owners are added to Supabase
2. ✅ Process each business in the waiting_list
3. ✅ Skip duplicates automatically
4. ✅ Allocate phone numbers from your Google Sheet pool
5. ✅ Generate unique email addresses
6. ✅ Complete the entire Wallester registration process via Airtop
7. ✅ Handle SMS and email OTP verification automatically
8. ✅ Store results in Supabase
9. ✅ Mark phone numbers as used in Google Sheet

**Happy Automating! 🚀**
