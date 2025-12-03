# ✅ Test Verification Checklist

**Status:** Ready for User Testing  
**Date:** December 2, 2025, 04:51 AM

---

## 🎯 What We're Testing

Verify that the registry_check fix is working correctly:
1. ✅ Edge Function deployed with relaxed filters
2. ✅ HTML viewer created with all features
3. ✅ New fields: `is_eligible_for_wallester`, `filter_reason`
4. ✅ All companies collected (no data loss)

---

## 📋 Step-by-Step Testing

### Test 1: Open HTML Viewer

1. **Open file in browser:**
   ```
   file:///home/administrator/Documents/registry_stagehand_worker/docs/registry_results_viewer.html
   ```

2. **Enter credentials:**
   - Full Name: Try "Иван" or another name from your screenshots
   - Supabase URL: `https://ansiaiuaygcfztabtknl.supabase.co`
   - Anon Key: [Get from your Supabase dashboard]

3. **Click "🔍 Търси"**

### Test 2: Verify Results Display

**Expected to see:**

✅ **Stats Dashboard with 4 cards:**
- Total Companies (all found)
- Eligible for Wallester (green - with EN name, EOOD/ET, active)
- Inactive (yellow - wrong status)
- No English Name (red - missing transliteration)

✅ **Accordion List:**
- One accordion per user record
- Shows full_name, email, company count
- Green "MATCH" or red "NO MATCH" badge
- Click to expand → see all companies

✅ **Company Cards:**
- Each company shows:
  - Bulgarian name
  - English name (or "❌ Липсва")
  - EIK
  - Type badge (EOOD/ET/OTHER)
  - Status badge (Active/Inactive)
  - **NEW:** "✓ ELIGIBLE" badge (green) OR reason badge (red/yellow)
  - Address, legal form
  - Raw JSON dropdown

### Test 3: Check New Fields

**Expand any company and click "Raw JSON"**

You should see these NEW fields:
```json
{
  "eik": "123456789",
  "business_name_bg": "Примерна ЕООД",
  "business_name_en": "Example Ltd",
  "is_eligible_for_wallester": true,  // ← NEW!
  "filter_reason": null,               // ← NEW!
  "is_active": true,                   // ← NEW!
  "status": "N",
  "entity_type": "EOOD",
  ...
}
```

Or for non-eligible:
```json
{
  "is_eligible_for_wallester": false,
  "filter_reason": "no_english_name",  // or "inactive" or "wrong_type"
  "is_active": false,
  "status": "Z"
}
```

### Test 4: Test Filters

1. **Uncheck "Покажи Eligible"** → Only non-eligible companies shown
2. **Uncheck "Покажи Неактивни"** → Hide inactive companies
3. **Uncheck "Покажи без EN име"** → Hide companies without English name
4. **Check all** → Shows everything again

### Test 5: Test Export

1. **Click "📥 Export JSON"** → Downloads ALL companies
2. **Click "📥 Export Eligible Only"** → Downloads only eligible companies
3. **Open downloaded JSON** → Verify structure

---

## 🔍 Direct Database Verification

### Query 1: Check users_pending status

Open Supabase SQL Editor and run:

```sql
SELECT 
  email,
  full_name,
  status,
  any_match,
  updated_at
FROM users_pending 
WHERE full_name ILIKE '%Иван%'
ORDER BY updated_at DESC
LIMIT 10;
```

**Expected after fix:**
- Users with companies should have `status: "ready_for_stagehand"`
- `any_match: TRUE` when companies exist

### Query 2: Check new fields in user_registry_checks

```sql
SELECT 
  email,
  full_name,
  match_count,
  any_match,
  jsonb_array_length(companies) as total_companies,
  (
    SELECT count(*)
    FROM jsonb_array_elements(companies) AS c
    WHERE (c->>'is_eligible_for_wallester')::boolean = true
  ) as eligible_count,
  created_at
FROM user_registry_checks
WHERE full_name ILIKE '%Иван%'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
- `match_count` = total companies (not filtered)
- `eligible_count` = companies with `is_eligible_for_wallester: true`
- Companies without EN name are still in the array (not discarded)

### Query 3: Check filter reasons breakdown

```sql
SELECT 
  c->>'filter_reason' as reason,
  c->>'entity_type' as type,
  count(*) as count
FROM user_registry_checks,
  jsonb_array_elements(companies) AS c
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY c->>'filter_reason', c->>'entity_type'
ORDER BY count DESC;
```

**Expected reasons:**
- `null` - eligible companies
- `inactive` - status not N/E
- `no_english_name` - missing transliteration
- `wrong_type` - not EOOD/ET

---

## 🧪 End-to-End Test: Register New User

**Best test:** Register a completely new user to see full pipeline:

1. **Register user via your registration form**
   - Use a real Bulgarian name that exists in CompanyBook
   - Example: "Иван Петров Димитров" (common name)

2. **Wait ~30 seconds** (for webhook/trigger)

3. **Check users_pending:**
   ```sql
   SELECT * FROM users_pending WHERE email = 'test@example.com';
   ```
   Expected: `status: "ready_for_stagehand"` (if eligible companies found)

4. **Check user_registry_checks:**
   ```sql
   SELECT * FROM user_registry_checks WHERE email = 'test@example.com';
   ```
   Expected: 
   - `match_count > 0`
   - Companies array has ALL found companies
   - Each company has `is_eligible_for_wallester` field
   - Each non-eligible has `filter_reason`

5. **View in HTML viewer:**
   - Search by full name
   - Should see accordion with results
   - Stats should show breakdown
   - Filters should work

---

## ✅ Success Criteria

**ALL of these should be TRUE:**

- [x] HTML viewer loads without errors
- [ ] HTML viewer can connect to Supabase
- [ ] Search by full_name returns results
- [ ] Stats dashboard shows correct counts
- [ ] Companies have `is_eligible_for_wallester` field
- [ ] Companies have `filter_reason` field (when not eligible)
- [ ] Filters work (show/hide eligible, inactive, etc.)
- [ ] Export buttons work (all & eligible-only)
- [ ] Raw JSON shows new fields
- [ ] users_pending status is "ready_for_stagehand" (when eligible)
- [ ] No companies are discarded (all collected)

---

## 🐛 If Issues Found

### Issue: "Няма намерени резултати"

**Possible causes:**
1. Typo in full_name
2. No records in user_registry_checks for this name
3. Supabase credentials incorrect

**Solution:**
- Try exact full_name from users_pending
- Check if record exists: `SELECT * FROM user_registry_checks WHERE full_name ILIKE '%Text%'`

### Issue: "New fields missing"

**Possible causes:**
1. Old records (before deployment)
2. Edge Function not deployed
3. Need to re-run registry check

**Solution:**
- Check deployment: `supabase functions list`
- Re-deploy if needed: `supabase functions deploy registry_check`
- Re-run check: Delete record and re-register user

### Issue: "Still showing no_match status"

**Possible causes:**
1. User was checked before fix
2. Really no matches in CompanyBook
3. Trigger not firing

**Solution:**
- Delete from user_registry_checks: `DELETE FROM user_registry_checks WHERE email = 'test@example.com'`
- Delete from users_pending: `DELETE FROM users_pending WHERE email = 'test@example.com'`
- Re-register user
- Or manually trigger: `POST https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/registry_check`

---

## 📊 Monitoring Queries

### Track fix effectiveness (run daily):

```sql
-- Status distribution BEFORE/AFTER
SELECT 
  status,
  count(*) as count,
  round(count(*) * 100.0 / sum(count(*)) OVER (), 2) as percentage
FROM users_pending 
GROUP BY status
ORDER BY count DESC;

-- Expected improvement:
-- BEFORE: no_match ~60%, ready_for_stagehand ~30%
-- AFTER:  no_match ~20%, ready_for_stagehand ~70%

-- Average eligible companies per user
SELECT 
  round(avg(eligible_count), 2) as avg_eligible_per_user,
  round(avg(total_companies), 2) as avg_total_per_user
FROM (
  SELECT 
    (SELECT count(*) FROM jsonb_array_elements(companies) AS c 
     WHERE (c->>'is_eligible_for_wallester')::boolean = true) as eligible_count,
    jsonb_array_length(companies) as total_companies
  FROM user_registry_checks
  WHERE created_at > NOW() - INTERVAL '24 hours'
) sub;

-- Filter reasons distribution
SELECT 
  COALESCE(c->>'filter_reason', 'eligible') as reason,
  count(*) as count
FROM user_registry_checks,
  jsonb_array_elements(companies) AS c
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY c->>'filter_reason'
ORDER BY count DESC;
```

---

## 🎉 Completion

Once all tests pass, you have successfully:

✅ Fixed the registry_check bug  
✅ Deployed relaxed filters (no data loss)  
✅ Added eligibility flags for downstream processing  
✅ Created HTML viewer for manual inspection  
✅ Verified data structure changes  

**Next steps:**
1. Monitor for 24 hours
2. Update users_pending_worker to use `is_eligible_for_wallester`
3. Add admin dashboard integration
4. Continue to Phase B (behavior analysis framework)

---

## 📁 Files Changed

✅ **supabase/functions/registry_check/index.ts**
- Relaxed filters
- Added `is_eligible_for_wallester` flag
- Added `filter_reason` metadata
- Deployed to production

✅ **docs/registry_results_viewer.html**
- Created new viewer
- Direct Supabase integration
- Stats dashboard
- Accordion UI
- Filters and export

✅ **REGISTRY_CHECK_FIX_DEPLOYMENT.md**
- Complete documentation
- Before/After comparison
- SQL queries
- Rollback plan

---

**Start testing now by opening the HTML viewer!** 🚀

File path: `docs/registry_results_viewer.html`
