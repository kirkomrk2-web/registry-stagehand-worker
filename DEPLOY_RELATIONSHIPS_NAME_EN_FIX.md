# DEPLOY: Fix for English Name Search in Relationships Data

## Problem Description

The registry check was returning 0 businesses for valid users because it was searching for English business names (`name_en`) in the wrong location:

- ❌ **WRONG**: Looking in `Person` data from `/people/search` 
- ❌ **WRONG**: Looking only in `companyNameTransliteration` from company details
- ✅ **CORRECT**: Should look in `Relationships` data from `/relationships` endpoint

### Example from Relationships Data:
```json
{
  "entity": {
    "id": "206009036",
    "type": "company",
    "name": "ВАЛ ИВ ХРИС",
    "name_en": "\"VAL IV HRIS\" LTD.",  // ← This is where the English name exists!
    "legalForm": "Еднолично дружество с ограничена отговорност"
  }
}
```

## What Was Fixed

### 1. Extract English Name from Relationships Entity
**File**: `supabase/functions/registry_check/index.ts`

**Function**: `extractVerifiedBusinesses()`

**Change**: Now captures `name_en` from the relationship entity:
```typescript
const nameEn = entity.name_en || null; // CRITICAL: Capture English name from relationships entity
companies.push({
  eik: uic,
  business_name_bg: name,
  business_name_en: nameEn, // Store the English name from relationships
  // ...
});
```

### 2. Use Captured English Name in Filter
**Change**: Filter now checks the captured `business_name_en` first:
```typescript
// 2. Filter for ENGLISH NAME (REQUIRED - must exist in relationships)
// English name comes from relationships entity.name_en, NOT from companyNameTransliteration
const englishName = company.business_name_en || comp.companyNameTransliteration?.name || null;
if (!englishName) {
  console.log(`[FILTER] Skipping ${e} - no English name (checked relationships and transliteration)`);
  continue;
}
```

## Impact

- ✅ Users with businesses that have official English names will now be properly matched
- ✅ Filter correctly identifies businesses with `name_en` field
- ✅ No more false "no_match" results for valid EIK/EOOD/ET businesses

## Deployment Steps

### 1. Deploy the Edge Function
```bash
cd /home/administrator/Documents/registry_stagehand_worker

# Deploy the updated registry_check function
npx supabase functions deploy registry_check --project-ref avmghhepfvcsxfnkicaj
```

### 2. Verify Deployment
Check the Supabase dashboard:
- Go to Edge Functions → registry_check
- Verify the last deployment timestamp is recent

### 3. Test with Real Data
```bash
# Test with a user that previously returned 0 businesses
curl -X POST 'https://avmghhepfvcsxfnkicaj.supabase.co/functions/v1/registry_check' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Иван Христев Димитров",
    "email": "test@example.com"
  }'
```

Expected result:
- Should now return `match_count > 0`
- Should include companies with `business_name_en` populated
- Companies like "VAL IV HRIS" LTD. should appear in results

### 4. Check Logs
Monitor the function logs for filter messages:
```
[FILTER] ✓ 206009036 passed all filters ("VAL IV HRIS" LTD., ..., N)
```

## Rollback Plan

If issues occur, revert the changes:
```bash
git checkout HEAD~1 supabase/functions/registry_check/index.ts
npx supabase functions deploy registry_check --project-ref avmghhepfvcsxfnkicaj
```

## Related Documentation

- `ENGLISH_NAME_PROBLEM_AND_SOLUTIONS.md` - Original problem analysis
- `DEPLOY_REGISTRY_CHECK_FIX.md` - Previous related fix
- `docs/registry_pipeline_visual.html` - Visual pipeline documentation

## Verification Checklist

- [ ] Function deployed successfully
- [ ] Test with known user returns businesses (match_count > 0)
- [ ] English names are populated in results
- [ ] Logs show companies passing filter
- [ ] users_pending status updates correctly to "ready_for_stagehand"

---

**Deployed by**: [Your Name]  
**Date**: 2025-12-01  
**Commit**: [Git commit hash after deployment]
