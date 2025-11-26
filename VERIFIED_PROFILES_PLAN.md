# Verified Business Profiles Implementation Plan

## Overview
Create a filtered subset of businesses that meet strict verification criteria, including both EOOD companies AND ET (sole traders) with English names and active status.

## Requirements Analysis

### Criteria for `verified_business_profiles` table:

1. **English Name Required** ✅
   - `englishName` field must be populated (not null, not "none")
   - Applies to both EOOD and ET

2. **Active Status Only** ✅
   - Company/ET must be currently active
   - Filter using `isActive === true` from relationships
   - Exclude historical/closed businesses

3. **Current Data Only** ✅
   - No historical ownership records
   - No transferred positions
   - Data reflects current state at time of check

4. **Include ET (Sole Traders)** 🆕
   - Previously we filtered ONLY EOOD
   - Now accept ET if they have English name registered
   - Verify ET is active

---

## Database Schema

### Table: `verified_business_profiles`

```sql
CREATE TABLE IF NOT EXISTS public.verified_business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Business identifiers
  eik TEXT NOT NULL UNIQUE,
  business_name_bg TEXT NOT NULL,
  business_name_en TEXT NOT NULL, -- REQUIRED
  
  -- Classification
  legal_form_bg TEXT NOT NULL,
  business_structure_en TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'EOOD' or 'ET'
  
  -- Location
  address TEXT,
  region TEXT,
  municipality TEXT,
  
  -- Dates
  incorporation_date DATE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  activity_status TEXT, -- 'active', 'suspended', etc.
  
  -- Ownership (optional - for tracking who owns it)
  current_owner_name TEXT,
  current_owner_ident TEXT,
  
  -- Source
  source TEXT NOT NULL DEFAULT 'companybook',
  data_quality_score INTEGER, -- 0-100 based on completeness
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Denormalized for quick queries
  companies_jsonb JSONB, -- full CompanyBook payload if needed
  
  -- Indexes
  CONSTRAINT unique_eik UNIQUE(eik)
);

-- Indexes for performance
CREATE INDEX idx_verified_profiles_eik ON verified_business_profiles(eik);
CREATE INDEX idx_verified_profiles_entity_type ON verified_business_profiles(entity_type);
CREATE INDEX idx_verified_profiles_is_active ON verified_business_profiles(is_active);
CREATE INDEX idx_verified_profiles_verified_at ON verified_business_profiles(verified_at DESC);
CREATE INDEX idx_verified_profiles_business_name_en ON verified_business_profiles(business_name_en);
CREATE INDEX idx_verified_profiles_incorporation_date ON verified_business_profiles(incorporation_date DESC);

-- Full-text search on business names
CREATE INDEX idx_verified_profiles_name_search ON verified_business_profiles 
  USING gin(to_tsvector('english', business_name_en || ' ' || COALESCE(business_name_bg, '')));

-- RLS (Row Level Security)
ALTER TABLE verified_business_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" 
  ON verified_business_profiles FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy: Allow service role full access
CREATE POLICY "Allow service role full access" 
  ON verified_business_profiles FOR ALL 
  TO service_role 
  USING (true);
```

---

## CompanyBook API Updates

### New Functions Needed in `companybook.mjs`

#### 1. **isET()** - Check if entity is sole trader
```javascript
function isET(legalForm = "") {
  const s = String(legalForm).toLowerCase();
  return (
    s.includes("ет ") ||
    s === "ет" ||
    s.includes("едноличен търговец") ||
    s.includes("sole trader") ||
    s.includes("et")
  );
}
```

#### 2. **isEOODorET()** - Accept both EOOD and ET
```javascript
function isEOODorET(legalForm = "") {
  return isEOOD(legalForm) || isET(legalForm);
}
```

#### 3. **hasValidEnglishName()** - Check if English name is present
```javascript
function hasValidEnglishName(englishName) {
  if (!englishName) return false;
  const s = String(englishName).trim().toLowerCase();
  return s !== "" && s !== "none" && s !== "null" && s !== "n/a";
}
```

#### 4. **extractVerifiedBusinesses()** - Main filtering logic
```javascript
/**
 * Extract only verified businesses (EOOD or ET with English name, currently active)
 * @param {Array} companies - Raw company results from findSoleOwnerCompaniesByName
 * @returns {Array} Filtered verified businesses
 */
export function extractVerifiedBusinesses(companies) {
  return companies.filter(company => {
    // Rule 1: Must have valid English name
    if (!hasValidEnglishName(company.englishName)) {
      return false;
    }
    
    // Rule 2: Must be EOOD or ET (with English name)
    if (!isEOODorET(company.legalForm)) {
      return false;
    }
    
    // Rule 3: Must be numeric EIK (no hashed IDs)
    if (!isNumericEik(company.eik)) {
      return false;
    }
    
    // Rule 4: If source is from relationships, it should already be filtered
    // for isActive=true in extractSoleOwnerCompanyEIKsFromRelationships
    
    // Additional quality checks
    if (!company.companyName || company.companyName.trim() === "") {
      return false;
    }
    
    return true;
  });
}
```

#### 5. **Update findSoleOwnerCompaniesByName()** - Add ET support
```javascript
// In extractEOODSoleOwnersFromPerson, change:
if (isEOODOwner && isEOOD(legalForm) && isNumericEik(eik)) {
// To:
if (isEOODOwner && isEOODorET(legalForm) && isNumericEik(eik) && hasValidEnglishName(englishName)) {
```

#### 6. **calculateDataQualityScore()** - Score completeness
```javascript
/**
 * Calculate data quality score (0-100)
 */
function calculateDataQualityScore(business) {
  let score = 0;
  const weights = {
    eik: 20,
    companyName: 20,
    englishName: 20,
    legalForm: 10,
    address: 10,
    incorporationDate: 10,
    businessStructureEn: 10
  };
  
  Object.entries(weights).forEach(([field, weight]) => {
    if (business[field] && String(business[field]).trim() !== "" && business[field] !== "none") {
      score += weight;
    }
  });
  
  return score;
}
```

---

## Worker Updates

### New File: `browserbase-worker/src/verifiedProfilesWorker.mjs`

```javascript
// verifiedProfilesWorker.mjs
// Worker to populate and maintain verified_business_profiles table

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { findSoleOwnerCompaniesByName, extractVerifiedBusinesses } from "./companybook.mjs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Process a single user and extract verified profiles
 */
async function processUserForVerifiedProfiles(user) {
  const fullName = user.full_name.trim();
  console.log(`[INFO] Processing ${fullName} for verified profiles...`);
  
  try {
    // Get all companies (EOOD + ET with English names)
    const allCompanies = await findSoleOwnerCompaniesByName(fullName, { limit: 20 });
    
    // Filter to verified only
    const verified = extractVerifiedBusinesses(allCompanies);
    
    console.log(`[INFO] Found ${verified.length} verified businesses for ${fullName}`);
    
    // Insert/update each verified business
    for (const biz of verified) {
      await upsertVerifiedProfile({
        eik: biz.eik,
        business_name_bg: biz.companyName,
        business_name_en: biz.englishName,
        legal_form_bg: biz.legalForm,
        business_structure_en: biz.businessStructureEn || mapBusinessStructureEn(biz.legalForm),
        entity_type: isET(biz.legalForm) ? 'ET' : 'EOOD',
        address: biz.address,
        incorporation_date: biz.incorporationDate,
        is_active: true, // we already filtered for active
        current_owner_name: fullName,
        current_owner_ident: user.ident || null,
        source: biz.source || 'companybook',
        data_quality_score: calculateDataQualityScore(biz),
        companies_jsonb: biz
      });
    }
    
    return verified.length;
  } catch (e) {
    console.error(`[ERROR] Failed to process ${fullName}:`, e.message);
    return 0;
  }
}

/**
 * Upsert a verified profile (insert or update if EIK exists)
 */
async function upsertVerifiedProfile(profile) {
  const { error } = await supabase
    .from("verified_business_profiles")
    .upsert(
      {
        ...profile,
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: "eik" }
    );
  
  if (error) {
    console.error(`[ERROR] Failed to upsert profile EIK=${profile.eik}:`, error.message);
  } else {
    console.log(`[OK] Upserted verified profile: ${profile.business_name_en} (${profile.eik})`);
  }
}

/**
 * Batch process all checked users
 */
async function processAllCheckedUsers() {
  console.log("[INFO] Fetching all checked users from user_registry_checks...");
  
  const { data: checks, error } = await supabase
    .from("user_registry_checks")
    .select("*")
    .gt("match_count", 0)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("[ERROR]", error);
    return;
  }
  
  console.log(`[INFO] Processing ${checks.length} user checks...`);
  let totalVerified = 0;
  
  for (const check of checks) {
    const count = await processUserForVerifiedProfiles({
      full_name: check.full_name,
      email: check.email
    });
    totalVerified += count;
  }
  
  console.log(`[DONE] Total verified profiles added/updated: ${totalVerified}`);
}

// CLI mode
const mode = process.argv[2];

if (mode === "--all") {
  await processAllCheckedUsers();
  process.exit(0);
} else if (mode === "--name") {
  const name = process.argv[3];
  if (!name) {
    console.error("Usage: node verifiedProfilesWorker.mjs --name 'Full Name'");
    process.exit(1);
  }
  await processUserForVerifiedProfiles({ full_name: name });
  process.exit(0);
} else {
  console.log("Usage:");
  console.log("  node verifiedProfilesWorker.mjs --all");
  console.log("  node verifiedProfilesWorker.mjs --name 'Асен Митков Асенов'");
  process.exit(1);
}
```

---

## Integration with Registry Worker

### Update `registryLocalWorker.mjs`

Add a post-processing step to populate verified profiles:

```javascript
// After successful insert to user_registry_checks:
if (status === "checked" && companies.length > 0) {
  try {
    const { extractVerifiedBusinesses } = await import("./companybook.mjs");
    const verified = extractVerifiedBusinesses(companies);
    
    // Insert verified profiles
    for (const biz of verified) {
      await supabase.from("verified_business_profiles").upsert({
        eik: biz.eik,
        business_name_bg: biz.companyName,
        business_name_en: biz.englishName,
        legal_form_bg: biz.legalForm,
        business_structure_en: biz.businessStructureEn,
        entity_type: isET(biz.legalForm) ? 'ET' : 'EOOD',
        address: biz.address,
        incorporation_date: biz.incorporationDate,
        is_active: true,
        current_owner_name: fullName,
        source: biz.source,
        data_quality_score: calculateDataQualityScore(biz),
        last_checked_at: new Date().toISOString()
      }, { onConflict: "eik" });
    }
    
    console.log(`[INFO] Added ${verified.length} verified profiles`);
  } catch (e) {
    console.warn("[WARN] Failed to populate verified profiles:", e.message);
  }
}
```

---

## Migration Files

### File: `browserbase-worker/migrations/2025-11-25_create_verified_profiles.sql`

```sql
-- Create verified_business_profiles table
CREATE TABLE IF NOT EXISTS public.verified_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business identifiers
  eik TEXT NOT NULL,
  business_name_bg TEXT NOT NULL,
  business_name_en TEXT NOT NULL,
  
  -- Classification
  legal_form_bg TEXT NOT NULL,
  business_structure_en TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('EOOD', 'ET')),
  
  -- Location
  address TEXT,
  region TEXT,
  municipality TEXT,
  
  -- Dates
  incorporation_date DATE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  activity_status TEXT,
  
  -- Ownership
  current_owner_name TEXT,
  current_owner_ident TEXT,
  
  -- Source
  source TEXT NOT NULL DEFAULT 'companybook',
  data_quality_score INTEGER CHECK (data_quality_score BETWEEN 0 AND 100),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  companies_jsonb JSONB,
  
  CONSTRAINT unique_eik UNIQUE(eik)
);

-- Indexes
CREATE INDEX idx_verified_profiles_eik ON verified_business_profiles(eik);
CREATE INDEX idx_verified_profiles_entity_type ON verified_business_profiles(entity_type);
CREATE INDEX idx_verified_profiles_is_active ON verified_business_profiles(is_active);
CREATE INDEX idx_verified_profiles_verified_at ON verified_business_profiles(verified_at DESC);
CREATE INDEX idx_verified_profiles_business_name_en ON verified_business_profiles(business_name_en);
CREATE INDEX idx_verified_profiles_incorporation_date ON verified_business_profiles(incorporation_date DESC);
CREATE INDEX idx_verified_profiles_owner ON verified_business_profiles(current_owner_name);

-- Full-text search
CREATE INDEX idx_verified_profiles_name_search ON verified_business_profiles 
  USING gin(to_tsvector('english', business_name_en || ' ' || COALESCE(business_name_bg, '')));

-- RLS
ALTER TABLE verified_business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read to authenticated" ON verified_business_profiles 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all to service_role" ON verified_business_profiles 
  FOR ALL TO service_role USING (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_verified_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_verified_profiles_updated_at
  BEFORE UPDATE ON verified_business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_verified_profiles_updated_at();

COMMENT ON TABLE verified_business_profiles IS 
  'Verified business profiles: EOOD and ET entities with English names and active status';
```

---

## Testing Plan

### Phase 1: Schema & Functions
```bash
# 1. Apply migration
psql -h <supabase-host> -U postgres -d postgres -f migrations/2025-11-25_create_verified_profiles.sql

# 2. Test CompanyBook functions
npm run companybook:test -- --name "Асен Митков Асенов"
# Verify: Should return EOOD + ET with English names
```

### Phase 2: Worker Testing
```bash
# 3. Test single user
node src/verifiedProfilesWorker.mjs --name "Асен Митков Асенов"

# 4. Check Supabase
# Query: SELECT * FROM verified_business_profiles;
# Verify: Only entries with englishName, active status, EOOD or ET

# 5. Batch process all
node src/verifiedProfilesWorker.mjs --all
```

### Phase 3: Integration
```bash
# 6. Test integrated flow
npm run registry:local -- --name "Test User"
# Verify: Both user_registry_checks AND verified_business_profiles populated
```

---

## Quality Assurance Checklist

- [ ] English name is required and validated (not "none")
- [ ] ET entities are included if they have English names
- [ ] Only active businesses (isActive === true)
- [ ] No historical/transferred ownership records
- [ ] Numeric EIK only (no hashed IDs)
- [ ] Data quality score calculated
- [ ] Duplicate EIKs handled via upsert
- [ ] RLS policies configured
- [ ] Indexes created for performance
- [ ] Full-text search enabled
- [ ] Updated_at triggers working

---

## API Endpoints (Future)

### Query Examples
```sql
-- Get all verified EOOD
SELECT * FROM verified_business_profiles 
WHERE entity_type = 'EOOD' AND is_active = true
ORDER BY verified_at DESC;

-- Get verified ET with high quality scores
SELECT * FROM verified_business_profiles 
WHERE entity_type = 'ET' AND data_quality_score >= 80
ORDER BY data_quality_score DESC;

-- Search by English name
SELECT * FROM verified_business_profiles 
WHERE business_name_en ILIKE '%metal%';

-- Get recent verifications
SELECT * FROM verified_business_profiles 
WHERE verified_at >= NOW() - INTERVAL '7 days'
ORDER BY verified_at DESC;
```

---

## Next Steps

1. ✅ Review this plan
2. ⏳ Apply SQL migration to create table
3. ⏳ Update `companybook.mjs` with new functions
4. ⏳ Create `verifiedProfilesWorker.mjs`
5. ⏳ Test with sample data
6. ⏳ Integrate with `registryLocalWorker.mjs`
7. ⏳ Batch process existing user_registry_checks
8. ⏳ Create UI for verified_business_profiles table

---

## Notes

- **ET Inclusion**: This is a significant change from EOOD-only filtering
- **English Name Requirement**: Both EOOD and ET must have valid English names
- **Active Status**: Critical to exclude historical data
- **Data Quality**: Score helps prioritize high-quality entries
- **Upsert Logic**: Prevents duplicates while allowing updates
- **Performance**: Indexes ensure fast queries

Ready to implement! 🚀
