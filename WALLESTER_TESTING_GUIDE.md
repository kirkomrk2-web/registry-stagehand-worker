# Wallester Automation Testing Guide

## Overview
This guide provides step-by-step instructions to test the complete Wallester Business account registration automation system.

## Prerequisites Checklist

### 1. Database Migration
- [ ] Run migration in Supabase SQL Editor:
  ```
  File: browserbase-worker/migrations/2025-11-26_wallester_automation.sql
  ```
- [ ] Verify tables created: `business_email_pool`, `business_email_aliases`, `sms_numbers_used`, `completed_businesses`
- [ ] Verify `verified_business_profiles` updated with new columns: `profile_status`, `wallester_status`, etc.

### 2. Hostinger Email Setup
- [ ] Create additional mailboxes in Hostinger:
  - `securebox2@33mailbox.com`
  - `securebox3@33mailbox.com`
  - `securebox4@33mailbox.com`

- [ ] Configure email forwarding rules in Hostinger:
  1. Go to Email → Forwarders
  2. Add catch-all forwarder for `@33mailbox.com` domain → forward to `support@33mailbox.com`
  3. Test by sending email to `test123@33mailbox.com` → should arrive in `support@33mailbox.com` inbox

### 3. Environment Variables
Add to `browserbase-worker/.env`:
```bash
# Hostinger IMAP Credentials
PRIMARY_MAILBOX=support@33mailbox.com
HOSTINGER_IMAP_USER=support@33mailbox.com
HOSTINGER_IMAP_PASSWORD=your_password_here
HOSTINGER_IMAP_HOST=imap.hostinger.com
HOSTINGER_IMAP_PORT=993

# smstome.com Credentials (already configured)
SMSTOME_API_KEY=your_api_key
SMSTOME_PROJECT_SECRET=your_project_secret

# Supabase Credentials (already configured)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Browserbase Credentials (already configured)
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_project_id
```

### 4. Verify Verified Business Profiles
You need at least one business with:
- `profile_status = 'verified'`
- `quality_score > 0`
- `full_name` populated (will be used as account owner)
- `business_name_en` formatted correctly (no hyphens, alphanumeric only for email)

## Testing Steps

### Step 1: Initialize Email Mailbox Pool
```bash
cd browserbase-worker
```

Run SQL to initialize mailbox pool (in Supabase SQL Editor):
```sql
-- Insert email mailboxes
INSERT INTO business_email_pool (mailbox_email, max_aliases, aliases_used)
VALUES 
  ('support@33mailbox.com', 5, 2),  -- Already has 2 aliases
  ('securebox@33mailbox.com', 5, 0),
  ('securebox2@33mailbox.com', 5, 0),
  ('securebox3@33mailbox.com', 5, 0),
  ('securebox4@33mailbox.com', 5, 0)
ON CONFLICT (mailbox_email) DO NOTHING;
```

Verify:
```bash
npm run wallester:list
```

Expected output:
```
📊 WALLESTER AUTOMATION STATUS

📬 Email Mailbox Pool:
   support@33mailbox.com: 2/5 aliases used
   securebox@33mailbox.com: 0/5 aliases used
   securebox2@33mailbox.com: 0/5 aliases used
   securebox3@33mailbox.com: 0/5 aliases used
   securebox4@33mailbox.com: 0/5 aliases used

✅ Available capacity: 23 aliases

🎯 Ready for Registration:
   [List of verified businesses]

📝 Active Registrations: 0
✅ Completed Registrations: 0
```

### Step 2: Start Monitoring Services
Open 2 terminal windows:

**Terminal 1 - SMS Monitor:**
```bash
cd browserbase-worker
npm run monitor:sms
```

Expected output:
```
🔍 SMS Monitor Worker Started
📱 Monitoring for Wallester verification codes...
⏱️  Checking every 10 seconds
```

**Terminal 2 - Email Monitor:**
```bash
cd browserbase-worker
npm run monitor:email
```

Expected output:
```
📧 Email Monitor Worker Started
📬 Connecting to IMAP: imap.hostinger.com:993
✅ IMAP connected successfully
🔍 Monitoring for verification codes...
⏱️  Checking every 10 seconds
```

### Step 3: Run Single Registration Test (Recommended First)
Open a **3rd terminal**:

```bash
cd browserbase-worker
npm run wallester:register -- --owner "Your Name Here"
```

Replace `"Your Name Here"` with the exact `full_name` from one of your verified businesses.

**What to expect:**
1. Worker selects highest quality_score business for that owner
2. Generates email alias (e.g., `asenmetal81@33mailbox.com`)
3. Assigns mailbox and creates alias record
4. Creates Browserbase session
5. Navigates to `https://wallester.com/atrk?c=8eb23415-1a08-4b07-93c3-2e624e2367a7&promo=direct_link`
6. Fills registration form
7. Waits for SMS code (Terminal 1 will show detection)
8. Enters SMS code
9. Waits for email code (Terminal 2 will show detection)
10. Enters email code
11. Extracts Wallester account ID
12. Calls `complete_business_registration()` function
13. Moves business to `completed_businesses` table
14. Archives phone number to `sms_numbers_used`
15. Closes browser session

**Expected final output:**
```
✅ REGISTRATION COMPLETED SUCCESSFULLY!

📋 Registration Details:
   Owner: Your Name Here
   Business: ASEN METAL 81 LTD
   Email: asenmetal81@33mailbox.com
   Phone: +358XXXXXXXXXX
   Account ID: wallester-account-id
   
   Business moved to completed_businesses
   Phone number archived: +358XXXXXXXXXX
```

### Step 4: Verify Database Changes
Run in Supabase SQL Editor:

```sql
-- Check business was moved to completed_businesses
SELECT business_name_en, full_name, wallester_account_id, completed_at 
FROM completed_businesses 
ORDER BY completed_at DESC 
LIMIT 5;

-- Check phone was archived
SELECT phone_number, used_for_business, used_at 
FROM sms_numbers_used 
ORDER BY used_at DESC 
LIMIT 5;

-- Check email alias was created
SELECT alias_email, mailbox_email, business_name 
FROM business_email_aliases 
ORDER BY assigned_at DESC 
LIMIT 5;

-- Check business was removed from verified_business_profiles
SELECT COUNT(*) FROM verified_business_profiles 
WHERE business_name_en = 'YOUR_COMPLETED_BUSINESS_NAME';
-- Should return 0
```

### Step 5: Test Continuous Monitoring Mode (Optional)
```bash
cd browserbase-worker
npm run wallester:register
```

This runs in continuous mode:
- Polls database every 30 seconds
- Finds all unique owners with verified businesses
- Registers one business per owner
- Continues until all verified businesses are processed

**Stop with:** `Ctrl+C`

## Troubleshooting

### Issue: "No available mailbox found"
**Solution:** Verify mailbox pool initialized:
```sql
SELECT * FROM business_email_pool;
```

### Issue: SMS code timeout
**Possible causes:**
1. SMS monitor not running (check Terminal 1)
2. Phone number not available in smstome.com
3. SMS not received within 3 minutes

**Solution:**
- Check SMS monitor logs
- Verify phone number exists in `sms_phone_numbers` table
- Check smstome.com dashboard for incoming SMS

### Issue: Email code timeout
**Possible causes:**
1. Email monitor not running (check Terminal 2)
2. Email forwarding not configured correctly
3. IMAP credentials incorrect

**Solution:**
- Check email monitor logs
- Test email forwarding: send test email to alias
- Verify IMAP credentials in .env file

### Issue: Browser automation fails
**Possible causes:**
1. Browserbase API key issues
2. Wallester website changed their UI
3. Network connectivity issues

**Solution:**
- Check Browserbase dashboard for session logs
- Verify API key and project ID in .env
- Check if referral link is still valid

### Issue: "Business already has a Wallester account"
**Solution:** This is expected behavior - the system prevents duplicate registrations.

### Issue: Database function errors
**Solution:** 
- Verify migration was run successfully
- Check Supabase logs for detailed error messages
- Ensure service role key has proper permissions

## Success Criteria

✅ **System is working correctly if:**
1. SMS monitor detects incoming codes within seconds
2. Email monitor detects incoming codes within seconds
3. Registration completes without timeouts
4. Business moves to `completed_businesses` table
5. Phone number moves to `sms_numbers_used` table
6. Email alias created in `business_email_aliases` table
7. Wallester account ID extracted and stored

## Performance Metrics

**Expected timings:**
- SMS code arrival: 10-30 seconds
- SMS code detection: 0-10 seconds (depends on polling interval)
- Email code arrival: 30-60 seconds
- Email code detection: 0-10 seconds (depends on polling interval)
- Total registration time: 3-5 minutes per business

## Monitoring Commands

```bash
# Check current status
npm run wallester:list

# View verified businesses ready for registration
npm run verified:list

# View statistics
npm run verified:stats

# Monitor SMS in real-time
npm run monitor:sms

# Monitor email in real-time
npm run monitor:email

# Run both monitors
npm run monitor:all
```

## Security Notes

🔒 **Important:**
- Never commit `.env` file to version control
- Keep IMAP credentials secure
- Rotate API keys regularly
- Monitor Browserbase usage to avoid quota exhaustion
- Keep Supabase service role key secure

## Next Steps After Successful Testing

1. ✅ Verify all completed registrations in Wallester dashboard
2. ✅ Confirm referral tracking is working
3. ✅ Set up monitoring/alerting for failed registrations
4. ✅ Document any edge cases discovered during testing
5. ✅ Consider adding retry logic for network failures
6. ✅ Implement rate limiting if needed to avoid triggering anti-bot measures

## Support

If you encounter issues not covered in this guide:
1. Check Browserbase session logs
2. Check Supabase logs
3. Review console output from all 3 terminals
4. Verify all environment variables are set correctly
5. Confirm Hostinger email forwarding is working

---

**Created:** 2025-11-26  
**Last Updated:** 2025-11-26  
**Version:** 1.0.0
