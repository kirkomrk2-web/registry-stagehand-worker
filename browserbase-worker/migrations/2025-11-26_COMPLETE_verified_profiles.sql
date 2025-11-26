-- COMPLETE Migration: Create verified_business_profiles with all columns
-- Date: 2025-11-26
-- Description: Drop and recreate verified_business_profiles with complete structure
--             Including base columns + address parsing + SMS phone support

-- ============================================================================
-- 1. DROP existing table if it has wrong structure
-- ============================================================================

DROP TABLE IF EXISTS public.verified_business_profiles CASCADE;

-- ============================================================================
-- 2. CREATE TABLE with COMPLETE structure (all columns at once)
-- ============================================================================

CREATE TABLE public.verified_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business identifiers
  eik TEXT NOT NULL,
  business_name_bg TEXT NOT NULL,
  business_name_en TEXT NOT NULL,
  
  -- Classification
  legal_form_bg TEXT NOT NULL,
  business_structure_en TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('EOOD', 'ET')),
  
  -- Address fields (structured)
  full_address TEXT,
  street_en TEXT,
  city_en TEXT,
  region_en TEXT,
  country_en TEXT DEFAULT 'Bulgaria',
  postal_code TEXT,
  
  -- Legacy location (kept for compatibility)
  address TEXT,
  region TEXT,
  municipality TEXT,
  
  -- Phone number fields
  phone_number TEXT,
  sms_number_url TEXT,
  sms_country_code TEXT,
  
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

-- ============================================================================
-- 3. CREATE indexes for performance
-- ============================================================================

CREATE INDEX idx_verified_profiles_eik ON verified_business_profiles(eik);
CREATE INDEX idx_verified_profiles_entity_type ON verified_business_profiles(entity_type);
CREATE INDEX idx_verified_profiles_is_active ON verified_business_profiles(is_active);
CREATE INDEX idx_verified_profiles_verified_at ON verified_business_profiles(verified_at DESC);
CREATE INDEX idx_verified_profiles_business_name_en ON verified_business_profiles(business_name_en);
CREATE INDEX idx_verified_profiles_incorporation_date ON verified_business_profiles(incorporation_date DESC);
CREATE INDEX idx_verified_profiles_owner ON verified_business_profiles(current_owner_name);
CREATE INDEX idx_verified_profiles_city ON verified_business_profiles(city_en);
CREATE INDEX idx_verified_profiles_phone ON verified_business_profiles(phone_number);

-- Full-text search on business names
CREATE INDEX idx_verified_profiles_name_search ON verified_business_profiles 
  USING gin(to_tsvector('english', business_name_en || ' ' || COALESCE(business_name_bg, '')));

-- ============================================================================
-- 4. Add column comments
-- ============================================================================

COMMENT ON TABLE verified_business_profiles IS 
  'Verified business profiles: EOOD and ET entities with English names and active status. Only current ownership, no historical data.';

COMMENT ON COLUMN verified_business_profiles.business_name_en IS 'English transliteration - REQUIRED for verification';
COMMENT ON COLUMN verified_business_profiles.entity_type IS 'EOOD (single-member LLC) or ET (sole trader)';
COMMENT ON COLUMN verified_business_profiles.is_active IS 'Currently active business - no historical records';
COMMENT ON COLUMN verified_business_profiles.data_quality_score IS 'Data completeness score (0-100)';
COMMENT ON COLUMN verified_business_profiles.full_address IS 'Complete address from CompanyBook API';
COMMENT ON COLUMN verified_business_profiles.street_en IS 'Parsed street name and number';
COMMENT ON COLUMN verified_business_profiles.city_en IS 'Parsed city name';
COMMENT ON COLUMN verified_business_profiles.region_en IS 'Parsed region/province';
COMMENT ON COLUMN verified_business_profiles.country_en IS 'Country name (default Bulgaria)';
COMMENT ON COLUMN verified_business_profiles.postal_code IS 'Postal/ZIP code';
COMMENT ON COLUMN verified_business_profiles.phone_number IS 'Assigned virtual phone number for verification';
COMMENT ON COLUMN verified_business_profiles.sms_number_url IS 'URL to check SMS messages for this number';
COMMENT ON COLUMN verified_business_profiles.sms_country_code IS 'Country code for the phone number (FI, UK, BG, etc.)';

-- ============================================================================
-- 5. Enable RLS policies
-- ============================================================================

ALTER TABLE verified_business_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to authenticated users
CREATE POLICY "Allow read to authenticated" 
  ON verified_business_profiles 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy: Allow service role full access
CREATE POLICY "Allow all to service_role" 
  ON verified_business_profiles 
  FOR ALL 
  TO service_role 
  USING (true);

-- ============================================================================
-- 6. Create trigger to update updated_at
-- ============================================================================

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

-- ============================================================================
-- 7. Add address column to user_registry_checks (if not exists)
-- ============================================================================

ALTER TABLE public.user_registry_checks
  ADD COLUMN IF NOT EXISTS full_addresses JSONB;

COMMENT ON COLUMN user_registry_checks.full_addresses IS 'Array of full addresses from matched companies';

-- ============================================================================
-- 8. CREATE SMS numbers pool table
-- ============================================================================

DROP TABLE IF EXISTS public.sms_numbers_pool CASCADE;

CREATE TABLE public.sms_numbers_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Phone number details
  phone_number TEXT NOT NULL UNIQUE,
  sms_url TEXT NOT NULL,
  country_code TEXT NOT NULL,
  country_name TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'used', 'invalid')),
  assigned_to UUID REFERENCES public.verified_business_profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- SMS tracking
  last_message_at TIMESTAMPTZ,
  last_message_from TEXT,
  last_verification_code TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- ============================================================================
-- 9. Indexes for SMS numbers pool
-- ============================================================================

CREATE INDEX idx_sms_pool_status ON sms_numbers_pool(status);
CREATE INDEX idx_sms_pool_phone ON sms_numbers_pool(phone_number);
CREATE INDEX idx_sms_pool_assigned_to ON sms_numbers_pool(assigned_to);
CREATE INDEX idx_sms_pool_country ON sms_numbers_pool(country_code);

COMMENT ON TABLE sms_numbers_pool IS 'Pool of virtual phone numbers for SMS verification';
COMMENT ON COLUMN sms_numbers_pool.phone_number IS 'The actual phone number (e.g., +358457399902X)';
COMMENT ON COLUMN sms_numbers_pool.sms_url IS 'URL to check messages (e.g., https://smstome.com/finland/phone/...)';
COMMENT ON COLUMN sms_numbers_pool.status IS 'available: ready to use, assigned: currently in use, used: completed, invalid: number no longer works';
COMMENT ON COLUMN sms_numbers_pool.assigned_to IS 'Reference to verified_business_profiles if assigned';

-- ============================================================================
-- 10. Create trigger for SMS pool updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sms_pool_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sms_pool_updated_at
  BEFORE UPDATE ON sms_numbers_pool
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_pool_updated_at();

-- ============================================================================
-- 11. Insert initial SMS numbers from the provided list
-- ============================================================================

INSERT INTO public.sms_numbers_pool (phone_number, sms_url, country_code, country_name, status)
VALUES
  ('+3584573999024', 'https://smstome.com/finland/phone/3584573999024/sms/12881', 'FI', 'Finland', 'available'),
  ('+3584573999023', 'https://smstome.com/finland/phone/3584573999023/sms/12880', 'FI', 'Finland', 'available'),
  ('+3584573999022', 'https://smstome.com/finland/phone/3584573999022/sms/12879', 'FI', 'Finland', 'available'),
  ('+3584573999021', 'https://smstome.com/finland/phone/3584573999021/sms/12878', 'FI', 'Finland', 'available'),
  ('+3584573999020', 'https://smstome.com/finland/phone/3584573999020/sms/12877', 'FI', 'Finland', 'available'),
  ('+3584573999019', 'https://smstome.com/finland/phone/3584573999019/sms/12876', 'FI', 'Finland', 'available'),
  ('+3584573999018', 'https://smstome.com/finland/phone/3584573999018/sms/12875', 'FI', 'Finland', 'available'),
  ('+3584573999017', 'https://smstome.com/finland/phone/3584573999017/sms/12874', 'FI', 'Finland', 'available'),
  ('+3584573999016', 'https://smstome.com/finland/phone/3584573999016/sms/12873', 'FI', 'Finland', 'available'),
  ('+3584573999015', 'https://smstome.com/finland/phone/3584573999015/sms/12872', 'FI', 'Finland', 'available')
ON CONFLICT (phone_number) DO NOTHING;

-- ============================================================================
-- 12. Enable RLS policies for SMS numbers pool
-- ============================================================================

ALTER TABLE sms_numbers_pool ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to authenticated users
CREATE POLICY "Allow read to authenticated" 
  ON sms_numbers_pool 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy: Allow service role full access
CREATE POLICY "Allow all to service_role" 
  ON sms_numbers_pool 
  FOR ALL 
  TO service_role 
  USING (true);

-- ============================================================================
-- DONE - Complete structure ready!
-- ============================================================================

COMMENT ON TABLE sms_numbers_pool IS 'Virtual phone numbers for Wallester card verification SMS codes';
