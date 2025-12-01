# Registry Check English Name Filter Fix - Deployment Summary

**Date:** 2025-12-01  
**Status:** ✅ DEPLOYED

---

## Problem Identified

The registry_check edge function was incorrectly configured:
1. **Initial Issue:** English name filter was made OPTIONAL, allowing companies without English transliterations
2. **User Requirement:** ONLY companies with English names should be accepted for Wallester automation
3. **Root Cause:** CompanyBook API returns `companyNameTransliteration.name = null` for most Bulgarian companies

---

## Solution Implemented

### 1. **registry_check Edge Function** (DEPLOYED ✅)
**File:** `supabase/functions/registry_check/index.ts`

**Filter Logic (Lines 180-195):**
```typescript
// CRITICAL FILTERS:

// 1. Filter for ACTIVE status (N or E)
const status = String(comp.status || '').toUpperCase();
const isActive = status === 'N' || status === 'E';
if (!isActive) continue;

// 2. Filter for ENGLISH NAME (REQUIRED - must have transliteration)
const englishName = comp.companyNameTransliteration?.name || null;
if (!englishName) {
  console.log(`[FILTER] Skipping ${e} - no English transliteration name`);
  continue; // ✅ REJECTS companies without English names
}

// 3. Filter for TYPE (EOOD or ET only)
const legalForm = String(comp.legalForm || '').toLowerCase();
const isEOOD = legalForm.includes('еоод') || legalForm.includes('eood');
const isET = legalForm.includes('ет') || legalForm.includes('et');
if (!isEOOD && !isET) continue;
```

**Result:** Only companies that pass ALL three filters are returned.

---

## Complete Automation Flow

### Step 1: User Submits Data (Horizons Frontend)
- **File:** `horizons-export/.../useChatLogic.js`
- User enters full name + email in chatbot
- Creates `users_pending` record with `status='pending'`
- Calls `registry_check` edge function

### Step 2: Registry Check Validation
- **Function:** `registry_check`
- Searches CompanyBook for person by full name
- Extracts companies where person is 100% owner or ET trader
- **Applies strict filters:**
  - ✅ Company is ACTIVE (status N or E)
  - ✅ Company has ENGLISH transliteration name (NOT NULL)
  - ✅ Company is EOOD or ET type
- Stores results in `user_registry_checks` table
- Updates `users_pending.status` to `ready_for_stagehand` (if matches found)

### Step 3: Verified Owners Creation
- **Function:** `users_pending_worker` (auto-triggered by frontend)
- Creates `verified_owners` record with:
  - `full_name`, `owner_first_name_en`, `owner_last_name_en`, `owner_birthdate`
  - `companies` array (up to 5 qualifying businesses)
  - `top_company` (best EOOD, or longest English name)
  - `companies_slim` (minimal data for quick lookups)

### Step 4: Phone & Email Allocation (Automatic)
- **Function:** `users_pending_worker` (continued)
- **Phone Assignment:**
  - Queries `sms_numbers_pool` table for first available phone
  - Updates phone status to `assigned`, sets `assigned_to=owner_id`
  - Stores in `verified_owners.allocated_phone_number`
- **Email Assignment:**
  - Generates unique `33mail` alias from company/owner name
  - Ensures uniqueness by appending numbers if needed
  - Stores in `verified_owners.email_alias_33mail`

### Step 5: Ready for Wallester Registration
- Owner record now has:
  - ✅ Up to 5 verified companies (all with English names)
  - ✅ Allocated phone number from pool
  - ✅ Unique email alias for registration
  - ✅ Ready for Stagehand automation

---

## Key Tables

### `verified_owners`
- **Purpose:** Store verified business owners with allocated resources
- **Key Columns:**
  - `id` (uuid, PK)
  - `full_name` (text, unique)
  - `owner_first_name_en`, `owner_last_name_en`, `owner_birthdate`
  - `companies` (jsonb array, up to 5)
  - `top_company` (jsonb, best company for registration)
  - `allocated_phone_number` (text)
  - `allocated_sms_number_url` (text)
  - `email_alias_33mail` (text)

### `sms_numbers_pool`
- **Purpose:** Pool of phone numbers for SMS verification
- **Key Columns:**
  - `id` (uuid, PK)
  - `phone_number` (text)
  - `sms_url` (text, API endpoint to retrieve SMS)
  - `status` ('available' | 'assigned' | 'blocked')
  - `assigned_to` (uuid, FK to verified_owners.id)

### `users_pending`
- **Purpose:** Track chatbot submissions awaiting processing
- **Key Columns:**
  - `email`, `full_name`
  - `status` ('pending' | 'ready_for_stagehand' | 'no_match')

---

## Testing the Flow

### Manual Test via Edge Function
```bash
# Test registry_check with real Bulgarian name
curl -X POST https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/registry_check \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Асен Митков Асенов",
    "email": "test@example.com"
  }'
```

**Expected Result:**
- Returns companies with English names ONLY
- Companies without `companyNameTransliteration.name` are filtered out
- Updates `users_pending` status appropriately

### Check Database
```sql
-- View verified owners with allocations
SELECT 
  full_name,
  allocated_phone_number,
  email_alias_33mail,
  jsonb_array_length(companies) as company_count,
  top_company->>'business_name_en' as top_company_name
FROM verified_owners
ORDER BY created_at DESC
LIMIT 5;

-- Check phone pool availability
SELECT status, count(*) 
FROM sms_numbers_pool 
GROUP BY status;
```

---

## Important Notes

1. **English Name Requirement IS STRICT:** Companies without English transliterations will be rejected. This is intentional for Wallester requirements.

2. **Phone/Email Auto-Assignment:** Happens automatically when `users_pending_worker` creates a new `verified_owners` record. No triggers needed.

3. **Frontend Integration:** The Horizons chatbot already calls both `registry_check` and `users_pending_worker` in sequence (fixed in `useChatLogic.js`).

4. **CompanyBook API Limitation:** Most Bulgarian companies don't have English transliterations in CompanyBook. The filter will reject these, which is the desired behavior per your requirements.

---

## Next Steps

1. ✅ **COMPLETED:** Deploy registry_check with English name filter
2. ⏭️ **NEXT:** Test with real owner names that have companies with English transliterations
3. ⏭️ **NEXT:** Monitor `verified_owners` table to confirm phone/email allocations working
4. ⏭️ **NEXT:** Proceed with Wallester automation using Browser Use Cloud API

---

## Deployment Commands

```bash
# Deploy registry_check
cd /home/administrator/Documents/registry_stagehand_worker
supabase functions deploy registry_check

# Deploy users_pending_worker (if needed)
supabase functions deploy users_pending_worker
```

## Support Files

- `docs/registry_pipeline_visual.html` - Interactive CompanyBook API tester
- `server/companybook_proxy.mjs` - Local proxy for testing (port 4321)
- `supabase/functions/registry_check/index.ts` - Main filtering logic
- `supabase/functions/users_pending_worker/index.ts` - Owner creation + allocation logic
