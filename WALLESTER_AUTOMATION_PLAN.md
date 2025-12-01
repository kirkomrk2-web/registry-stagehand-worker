# Wallester Automation Implementation Plan

## 📋 Overview

This document outlines the complete plan for implementing automated Wallester Business account registration with 33mailbox.com email integration and SMS verification.

**Status:** Planning Phase  
**Last Updated:** November 26, 2025

---

## 🎯 Key Requirements

### 1. Email System Migration
- **FROM:** `@madoff.33mail.com` 
- **TO:** `@33mailbox.com`

### 2. Mailbox Structure
**Current Active Mailboxes:**
- `support@33mailbox.com` (Primary receiving mailbox - 2/5 aliases used)
- `securebox@33mailbox.com` (Active - 0/5 aliases available)

**Additional Mailboxes to Create:**
- `securebox2@33mailbox.com`
- `securebox3@33mailbox.com`
- `securebox4@33mailbox.com`

**Alias Limit:** 5 aliases per mailbox (Hostinger free plan)

### 3. Email Forwarding
- All business aliases forward to parent mailbox
- All mailboxes forward to `support@33mailbox.com`
- IMAP monitoring connects to `support@33mailbox.com`

### 4. Referral Link (CRITICAL)
**Must use:** `https://wallester.com/atrk?c=8eb23415-1a08-4b07-93c3-2e624e2367a7&promo=direct_link`

This preserves the referral tracking code.

---

## 🗄️ Database Schema Changes

### New Table: `business_email_pool`

```sql
CREATE TABLE IF NOT EXISTS business_email_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mailbox_email TEXT NOT NULL,           -- e.g., 'securebox@33mailbox.com'
  alias_count INTEGER DEFAULT 0,         -- Current number of aliases (max 5)
  status TEXT DEFAULT 'active',          -- 'active', 'full', 'inactive'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_email_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mailbox_id UUID REFERENCES business_email_pool(id),
  alias_email TEXT UNIQUE NOT NULL,      -- e.g., 'asenmetal81@33mailbox.com'
  assigned_to UUID REFERENCES verified_business_profiles(id),
  business_name TEXT,                    -- For reference
  status TEXT DEFAULT 'active',          -- 'active', 'used', 'released'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ
);
```

### Update `verified_business_profiles`

```sql
ALTER TABLE verified_business_profiles 
  ADD COLUMN IF NOT EXISTS profile_status TEXT DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS wallester_status TEXT,
  ADD COLUMN IF NOT EXISTS wallester_account_id TEXT,
  ADD COLUMN IF NOT EXISTS wallester_registration_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallester_registration_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS incorporation_document_url TEXT;

-- Status values: 'verified', 'signing-up', 'registered', 'active', 'failed'
-- wallester_status: 'pending', 'phone_verified', 'email_verified', 'completed'
```

---

## 📧 Email Alias Generation Logic

### Pattern
```
{businessname}@33mailbox.com
```

### Examples
- `ASEN METAL 81 Ltd.` → `asenmetal81@33mailbox.com`
- `VERSAY 81 Ltd.` → `versay81@33mailbox.com`
- `FERBUL` → `ferbul@33mailbox.com`

### Rules
1. Remove all special characters except letters and numbers
2. Convert to lowercase
3. No hyphens or spaces
4. If alias already exists, append number: `asenmetal812@33mailbox.com`

---

## 🔄 Workflow: Business Status Lifecycle

### Phase 1: Discovery → `verified`
```
users_pending (status='pending')
    ↓
Registry check via CompanyBook API
    ↓
verified_business_profiles (profile_status='verified')
```

**Current Implementation:** ✅ Complete

### Phase 2: Selection → `signing-up`
```
Select highest quality_score business for user
    ↓
Assign email alias from pool
    ↓
Assign phone number from SMS pool
    ↓
Update profile_status='signing-up'
    ↓
wallester_status='pending'
```

**Implementation Needed:** 🔴 New

### Phase 3: Registration → `registered`
```
Launch Browserbase session
    ↓
Navigate to Wallester signup (with referral link)
    ↓
Fill form with business data
    ↓
Submit phone for SMS verification
    ↓
Monitor SMS, extract code
    ↓
Submit phone code (wallester_status='phone_verified')
    ↓
Submit email for verification
    ↓
Monitor email, extract code
    ↓
Submit email code (wallester_status='email_verified')
    ↓
Complete registration
    ↓
profile_status='registered'
    ↓
wallester_status='completed'
```

**Implementation Needed:** 🔴 New

---

## 🤖 Wallester Registration Automation

### Step-by-Step Browser Actions

#### 1. Launch & Navigate
```javascript
// Launch with referral link
await page.goto('https://wallester.com/atrk?c=8eb23415-1a08-4b07-93c3-2e624e2367a7&promo=direct_link');

// Handle cookie banner
await page.click('button:has-text("Reject all")');

// Click "Start free" in header
await page.click('a:has-text("Start free")');
```

#### 2. Fill Registration Form

**Country Selection:**
```javascript
// Select Bulgaria
await page.selectOption('select#country', 'BG');
// or
await page.click('div:has-text("Country of company registration")');
await page.click('li:has-text("Bulgaria")');
```

**Company Name:**
```javascript
await page.fill('input#company-name', business.business_name_en);
// Example: "ASEN METAL 81 Ltd."
```

**Phone Country Code:**
```javascript
// Select country code matching SMS number
await page.selectOption('select#phone-code', '+358'); // Finland
```

**Phone Number:**
```javascript
// Enter phone without country code
await page.fill('input#phone-number', '4573999024015');
```

**Agreement Checkbox:**
```javascript
await page.check('input#agreement');
```

**Submit:**
```javascript
await page.click('button.wa-account-form__submit:has-text("Continue")');
```

#### 3. SMS Verification

**Wait for code input:**
```javascript
await page.waitForSelector('input[name="verification-code"]');
```

**Monitor SMS:**
```javascript
// In parallel: smsMonitorWorker extracts code
// Poll smstome.com for new messages
// Extract 6-digit code
// Store in verified_business_profiles.sms_verification_code
```

**Submit code:**
```javascript
const smsCode = await getSMSCode(profile.id); // from database
await page.fill('input[name="verification-code"]', smsCode);
await page.click('button:has-text("Continue")');
```

#### 4. Email Verification

**Enter email:**
```javascript
await page.fill('input[name="email"]', business.email_alias_33mailbox);
// Example: asenmetal81@33mailbox.com
await page.click('button:has-text("Continue")');
```

**Monitor email:**
```javascript
// emailMonitorWorker connects to support@33mailbox.com IMAP
// Waits for email from noreply@wallester.com
// Extracts code from HTML: <div style="color: #356be8">179019</div>
// Stores in verified_business_profiles.email_confirmation_code
```

**Submit code:**
```javascript
const emailCode = await getEmailCode(profile.id); // from database
await page.fill('input[name="email-code"]', emailCode);
await page.click('button:has-text("Continue")');
```

#### 5. Complete Registration

```javascript
// Registration complete - capture any account ID or confirmation
// Update database: profile_status='registered', wallester_status='completed'
// Close browser session
```

---

## 📝 Code Extraction Patterns

### SMS Code (from smstome.com)
**Pattern:** 6-digit number from Wallester  
**Sender:** Typically shows as "WALLESTER" or similar  
**Regex:** `/\b(\d{6})\b/`

### Email Code (from Wallester emails)
**HTML Structure:**
```html
<div style="font-size: 32px;
      font-weight: 700;
      line-height: 38.4px;
      color: #356be8;
      text-align: center;">
  179019
</div>
```

**Text Pattern:** "Use this code to sign in: {CODE}"  
**Regex:** `/Use this code to sign in:\s*(\d{6})/i`

---

## 🎛️ Configuration Changes

### Environment Variables

```env
# 33mailbox.com Configuration
MAILBOX_DOMAIN=33mailbox.com
PRIMARY_MAILBOX=support@33mailbox.com

# Wallester
WALLESTER_REFERRAL_LINK=https://wallester.com/atrk?c=8eb23415-1a08-4b07-93c3-2e624e2367a7&promo=direct_link

# Hostinger IMAP (unchanged)
HOSTINGER_IMAP_HOST=imap.hostinger.com
HOSTINGER_IMAP_PORT=993
HOSTINGER_IMAP_USER=support@33mailbox.com
HOSTINGER_IMAP_PASSWORD=your_password
```

---

## 🔧 Implementation Tasks

### Phase 1: Database & Email Pool Management
- [ ] Create `business_email_pool` table
- [ ] Create `business_email_aliases` table
- [ ] Update `verified_business_profiles` with new columns
- [ ] Seed `business_email_pool` with existing mailboxes
- [ ] Create email alias assignment function
- [ ] Update email generation logic (remove hyphens)

### Phase 2: Email Monitor Updates
- [ ] Update IMAP connection to `support@33mailbox.com`
- [ ] Update email code extraction for Wallester format
- [ ] Add sender validation (must be from @wallester.com)
- [ ] Add timestamp checking (recent emails only)
- [ ] Store codes with business profile reference

### Phase 3: Business Selection Logic
- [ ] Create function to select best business for user
- [ ] Implement status transition: `verified` → `signing-up`
- [ ] Assign email alias from pool
- [ ] Assign phone number from SMS pool
- [ ] Validate all required data present before selection

### Phase 4: Wallester Registration Worker
- [ ] Create `wallesterRegistrationWorker.mjs`
- [ ] Implement Browserbase session management
- [ ] Implement form filling logic
- [ ] Implement SMS code waiting & submission
- [ ] Implement email code waiting & submission
- [ ] Add error handling & retry logic
- [ ] Add session cleanup

### Phase 5: Orchestration & Monitoring
- [ ] Create main orchestration worker
- [ ] Poll for `profile_status='signing-up'` businesses
- [ ] Launch registration process
- [ ] Monitor progress through wallester_status
- [ ] Handle failures and retries
- [ ] Log all actions for debugging

### Phase 6: Testing & Validation
- [ ] Test email alias generation
- [ ] Test email forwarding (alias → mailbox → support)
- [ ] Test SMS code extraction
- [ ] Test email code extraction
- [ ] Test full registration flow (end-to-end)
- [ ] Test error scenarios

---

## ⚠️ Important Considerations

### 1. Email Alias Limits
- Monitor alias usage per mailbox
- Auto-create new mailboxes when approaching limit
- Track which aliases are active vs released

### 2. Verification Code Timing
- SMS codes expire quickly (usually 3 minutes)
- Email codes also time-sensitive
- Need fast polling intervals (15-30 seconds)
- Store received timestamp for validation

### 3. Referral Link Preservation
- ALWAYS use the referral link for signup
- Do NOT navigate to regular signup page
- Verify referral parameter present in URL

### 4. Data Requirements
Before starting registration, verify business has:
- ✅ EIK (company ID)
- ✅ VAT number
- ✅ Business name (English)
- ✅ Full address (parsed)
- ✅ Owner first & last name (English)
- ✅ Incorporation date
- ✅ Email alias assigned
- ✅ Phone number assigned

### 5. Error Handling
- Browser crashes → retry with new session
- SMS timeout → mark failed, release resources
- Email timeout → mark failed, release resources
- Form validation errors → log details, mark failed
- Network errors → retry with exponential backoff

---

## 📊 Monitoring & Logging

### Key Metrics to Track
- Registrations attempted
- Registrations completed
- SMS codes received (timing)
- Email codes received (timing)
- Failures (by reason)
- Email alias usage
- Phone number usage

### Log Storage
```
browserbase-worker/logs/wallester/
  ├── registration_attempts.log
  ├── sms_codes.log
  ├── email_codes.log
  ├── errors.log
  └── {profile_id}_{timestamp}.json
```

---

## 🚀 Deployment Steps

1. **Database Migration**
   ```bash
   # Run in Supabase SQL Editor
   # Execute new table creation
   # Execute column additions
   # Seed email pool
   ```

2. **Update Existing Code**
   ```bash
   # Update emailMonitorWorker.mjs
   # Update email alias generation in registryLocalWorker.mjs
   ```

3. **Deploy New Workers**
   ```bash
   # Add wallesterRegistrationWorker.mjs
   # Add wallesterOrchestrator.mjs
   ```

4. **Configure Hostinger**
   ```
   # Set up forwarding rules
   # Verify IMAP access to support@33mailbox.com
   # Test alias creation
   ```

5. **Testing**
   ```bash
   # Test with one business first
   # Monitor logs carefully
   # Verify codes extracted correctly
   # Verify registration completes
   ```

---

## ✅ Success Criteria

Registration is successful when:
1. Business status updated to `registered`
2. Wallester account ID captured
3. All verification codes received and used
4. No errors in logs
5. Email and phone resources properly tracked

---

## 📞 Support & Troubleshooting

### Common Issues

**Email alias not working:**
- Verify alias created in Hostinger
- Check forwarding rules
- Test direct email send

**SMS code not received:**
- Check smstome.com page loads
- Verify phone number format
- Check SMS polling is running

**Email code not received:**
- Verify IMAP connection
- Check email arrived in support@33mailbox.com
- Verify sender is noreply@wallester.com

**Registration form fails:**
- Check all required fields populated
- Verify country code matches phone
- Check for validation errors in browser console

---

## 🔗 References

- Hostinger Email Alias: https://www.hostinger.com/support/5240877-how-to-set-up-an-email-alias-with-hostinger-email/
- Wallester Referral Link: https://wallester.com/atrk?c=8eb23415-1a08-4b07-93c3-2e624e2367a7&promo=direct_link
- smstome.com: https://smstome.com/country/finland/

---

**Next Step:** Review this plan and confirm approach before implementation starts.
