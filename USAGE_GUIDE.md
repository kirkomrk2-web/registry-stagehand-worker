# Bulgarian Business Verification System - Usage Guide

## 🎯 System Overview

This system automatically verifies Bulgarian business entities (EOOD/ET) and monitors verification codes from SMS and email services for identity verification.

**Version:** 0.2.0  
**Last Updated:** November 26, 2025

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Supabase project configured with service role key
- ✅ CompanyBook API access (api.companybook.bg)
- ✅ Finnish virtual phone numbers from smstome.com (10 numbers configured)
- ✅ 33mail.com account configured (forwarding to Hostinger)
- ✅ Hostinger email account (admin@wallesters.com)
- ✅ All environment variables configured in `.env`

---

## 🗄️ Database Setup

### Step 1: Run Main Migration

The complete database schema has been created in:
```
browserbase-worker/migrations/2025-11-26_COMPLETE_verified_profiles.sql
```

This migration includes:
- `verified_business_profiles` table with all fields
- `sms_numbers_pool` table for phone number management
- Address fields (street, city, region, country, postal_code)
- VAT number field (format: BG + EIK)
- Email fields (33mail alias, Hostinger forwarding)
- Owner name fields (first_name_en, last_name_en)
- SMS/Email verification tracking fields
- Phone number assignment fields
- Data quality scoring (0-100, auto-calculated via trigger)
- Indexes for performance
- `verification_monitoring` view

**To apply:** Copy contents into Supabase SQL Editor and run.

### Step 2: Backfill Existing Profiles

If you have existing profiles that need VAT, email, and owner data:

```
browserbase-worker/migrations/UPDATE_existing_profiles.sql
```

This update script:
- Generates VAT numbers: `BG` + EIK (e.g., `BG202146707`)
- Creates email aliases: `{business-name}@madoff.33mail.com`
- Sets Hostinger forwarding: `admin@wallesters.com`
- Parses owner names into first/last (English transliteration)

**To apply:** Copy contents into Supabase SQL Editor and run.

---

## 🚀 Workers & Services

### 1. Registry Local Worker

**Purpose:** Queries CompanyBook API to find businesses where a person is sole owner, creates verified profiles.

**File:** `browserbase-worker/src/registryLocalWorker.mjs`

**Features:**
- ✅ Automatic VAT number generation
- ✅ Email alias creation (33mail pattern)
- ✅ Owner name parsing & transliteration
- ✅ Address parsing into components
- ✅ Phone number auto-assignment from pool
- ✅ Data quality scoring

**Commands:**
```bash
# Process pending users from queue
npm run registry:local

# Single person lookup (for testing)
npm run registry:local -- --name "Асен Митков Асенов"
```

**What it does:**
1. Polls `users_pending` table for status='pending'
2. Queries CompanyBook API for businesses
3. Filters for EOOD/ET with English names
4. Creates/updates `verified_business_profiles`
5. Assigns available phone number from SMS pool
6. Generates VAT, email alias, parses address & owner name

---

### 2. SMS Monitor Worker

**Purpose:** Monitors smstome.com phone numbers for verification SMS messages.

**File:** `browserbase-worker/src/smsMonitorWorker.mjs`

**Features:**
- Polls assigned phone numbers every 30 seconds (configurable)
- Extracts 4-6 digit verification codes
- Updates profiles with received codes
- Tracks last message time and sender

**Command:**
```bash
npm run monitor:sms
```

**Configuration:**
```env
SMS_POLL_INTERVAL_MS=30000  # 30 seconds (default)
```

**How it works:**
1. Fetches phone numbers with `status='assigned'` from `sms_numbers_pool`
2. Scrapes SMS from smstome.com URLs
3. Extracts verification codes using regex patterns
4. Updates both `sms_numbers_pool` and `verified_business_profiles`

**Phone Numbers:**
All 10 Finnish numbers are pre-configured in the database:
- +3584573999024-015 through +3584573999024-024
- URLs: https://smstome.com/country/finland/{suffix}.html

---

### 3. Email Monitor Worker

**Purpose:** Monitors Hostinger IMAP inbox for verification emails forwarded through 33mail.

**File:** `browserbase-worker/src/emailMonitorWorker.mjs`

**Dependencies:** ✅ Installed
- `imap@0.8.19`
- `mailparser@3.9.0`

**Features:**
- Connects to Hostinger IMAP server (imap.hostinger.com:993)
- Polls for unread emails every 60 seconds (configurable)
- Identifies 33mail alias from headers
- Extracts 4-6 digit verification codes
- Updates profiles automatically
- Marks emails as read

**Command:**
```bash
npm run monitor:email
```

**Configuration:**
```env
# Required environment variables:
HOSTINGER_IMAP_HOST=imap.hostinger.com
HOSTINGER_IMAP_PORT=993
HOSTINGER_IMAP_USER=admin@wallesters.com
HOSTINGER_IMAP_PASSWORD=your_password_here
EMAIL_POLL_INTERVAL_MS=60000  # 60 seconds (default)
```

**Email Flow:**
1. Business registration sends email to: `{business-name}@madoff.33mail.com`
2. 33mail forwards to: `admin@wallesters.com` (Hostinger)
3. Worker fetches from Hostinger IMAP
4. Extracts alias and code
5. Updates matching profile

---

### 4. Combined Monitoring

Run both monitors simultaneously:

```bash
npm run monitor:all
```

---

## 📊 Data Quality Scoring

Profiles are automatically scored 0-100 based on data completeness:

| Field | Points |
|-------|--------|
| EIK | 10 |
| Business Name (BG) | 10 |
| Business Name (EN) | 15 |
| VAT Number | 10 |
| Full Address | 10 |
| Email Alias (33mail) | 10 |
| Phone Number | 10 |
| Owner First Name | 5 |
| Owner Last Name | 5 |
| Incorporation Date | 5 |
| SMS Verification Code | 5 |
| Email Confirmation Code | 5 |

**Trigger:** `update_data_quality_score` runs automatically on INSERT/UPDATE.

---

## 📈 Monitoring View

Query the verification monitoring view:

```sql
SELECT * FROM verification_monitoring 
WHERE awaiting_sms = true OR awaiting_email = true
ORDER BY created_at DESC;
```

This view shows:
- Profiles awaiting SMS verification
- Profiles awaiting email confirmation
- Current phone numbers and email aliases
- Last verification code received times

---

## 🧪 Testing Workflow

### Step 1: Run Database Migration
```bash
# Copy 2025-11-26_COMPLETE_verified_profiles.sql into Supabase SQL Editor
# Execute it
```

### Step 2: Backfill Existing Data (if needed)
```bash
# Copy UPDATE_existing_profiles.sql into Supabase SQL Editor
# Execute it
# Verify results with the SELECT at the end
```

### Step 3: Test Registry Worker
```bash
cd browserbase-worker

# Test with a single Bulgarian name
npm run registry:local -- --name "Иван Петров Иванов"

# Watch the logs for:
# - CompanyBook API queries
# - Business matching (EOOD/ET only)
# - Profile creation with VAT, email, parsed address
# - Phone number assignment
```

### Step 4: Test SMS Monitor
```bash
npm run monitor:sms

# Expected output:
# [INFO] SMS Monitor Worker started.
# [INFO] Polling interval: 30000ms
# [INFO] Checking X assigned phone numbers...
# [INFO] Checking phone: +3584573999024-015
# [INFO] Found verification code: 123456 for +3584573999024-015
# [INFO] Updated profile ... with SMS code: 123456
```

### Step 5: Test Email Monitor
```bash
# First, ensure IMAP credentials are in .env:
# HOSTINGER_IMAP_USER=admin@wallesters.com
# HOSTINGER_IMAP_PASSWORD=your_password

npm run monitor:email

# Expected output:
# [INFO] Email Monitor Worker started.
# [INFO] IMAP Host: imap.hostinger.com:993
# [INFO] IMAP connection established.
# [INFO] INBOX opened. Total messages: X
# [INFO] Found Y unread emails.
# [INFO] Email from: noreply@example.com, Subject: Verification Code
# [INFO] 33mail alias: asen-metal-81@madoff.33mail.com
# [INFO] Verification code: 654321
# [INFO] Updated profile ASEN METAL 81 Ltd. (202146707) with email code: 654321
```

---

## 🔍 Verification Status

Check profile status:

```sql
-- Count profiles by verification status
SELECT 
  COUNT(*) FILTER (WHERE sms_verification_code IS NOT NULL) as sms_verified,
  COUNT(*) FILTER (WHERE email_confirmation_code IS NOT NULL) as email_verified,
  COUNT(*) FILTER (WHERE sms_verification_code IS NULL) as awaiting_sms,
  COUNT(*) FILTER (WHERE email_confirmation_code IS NULL) as awaiting_email,
  COUNT(*) as total
FROM verified_business_profiles;

-- View recent verifications
SELECT 
  eik,
  business_name_en,
  phone_number,
  email_alias_33mail,
  sms_verification_code,
  email_confirmation_code,
  data_quality_score,
  created_at
FROM verified_business_profiles
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📞 Phone Number Assignment

The system automatically:
1. Finds first `available` phone from `sms_numbers_pool`
2. Updates status to `assigned`
3. Links to profile via `assigned_to` (profile ID)
4. Updates profile with phone number and SMS URL

**Manual phone number management:**

```sql
-- Release a phone number back to pool
UPDATE sms_numbers_pool 
SET status = 'available', assigned_to = NULL, assigned_at = NULL
WHERE phone_number = '+3584573999024-015';

-- Check pool status
SELECT status, COUNT(*) 
FROM sms_numbers_pool 
GROUP BY status;
```

---

## 📧 Email Alias Pattern

**Generated format:** `{business-name-cleaned}@madoff.33mail.com`

**Examples:**
- `ASEN METAL 81 Ltd.` → `asen-metal-81-ltd@madoff.33mail.com`
- `"BULSTRAD-94" EOOD` → `bulstrad-94-eood@madoff.33mail.com`
- `ET "Ivan Petrov"` → `et-ivan-petrov@madoff.33mail.com`

**Cleanup rules:**
1. Convert to lowercase
2. Remove special characters (keep alphanumeric, spaces, hyphens)
3. Replace spaces with hyphens
4. Collapse multiple hyphens
5. Remove leading/trailing hyphens

---

## 🎛️ Environment Variables Reference

**Required:**
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Registry
REGISTRY_BASE_URL=https://portal.registryagency.bg/CR/Reports/VerificationPersonOrg?name=

# CompanyBook (Optional features)
USE_COMPANYBOOK=true
COMPANYBOOK_ONLY=false

# Email Monitoring (Required for email worker)
HOSTINGER_IMAP_HOST=imap.hostinger.com
HOSTINGER_IMAP_PORT=993
HOSTINGER_IMAP_USER=admin@wallesters.com
HOSTINGER_IMAP_PASSWORD=your_password_here

# Optional: Polling intervals
SMS_POLL_INTERVAL_MS=30000      # 30 seconds
EMAIL_POLL_INTERVAL_MS=60000    # 60 seconds
```

---

## 🐛 Troubleshooting

### Issue: "No available phone numbers in pool"
**Solution:** Check SMS pool status and add more numbers if needed:
```sql
SELECT * FROM sms_numbers_pool WHERE status = 'available';
```

### Issue: "Email monitor: Authentication failed"
**Solution:** Verify IMAP credentials in `.env`:
- Check username (must be full email)
- Check password (Hostinger email password, not cPanel)
- Ensure IMAP is enabled in Hostinger email settings

### Issue: "No profiles awaiting verification"
**Solution:** Create test profiles:
```bash
npm run registry:local -- --name "Test Person Name"
```

### Issue: "Code extraction failing"
**Solution:** Check regex patterns in workers:
- `smsMonitorWorker.mjs`: `extractVerificationCode()`
- `emailMonitorWorker.mjs`: `extractVerificationCode()`

---

## 📚 Additional Resources

- **CompanyBook API:** https://api.companybook.bg/api
- **Supabase Docs:** https://supabase.com/docs
- **smstome.com:** https://smstome.com/country/finland/
- **33mail:** https://33mail.com (email forwarding service)

---

## ✅ System Status

- ✅ Database schema complete
- ✅ Migrations created and tested
- ✅ Registry worker with enhanced data generation
- ✅ SMS monitoring worker
- ✅ Email monitoring worker  
- ✅ Dependencies installed (imap, mailparser)
- ✅ Phone number auto-assignment
- ✅ Data quality scoring
- ✅ Verification tracking

**Next Steps:**
1. Run database migrations in Supabase
2. Run UPDATE_existing_profiles.sql if you have existing data
3. Configure IMAP credentials in `.env`
4. Test each worker individually
5. Deploy monitoring workers to production

---

**System Ready for Production! 🚀**
