-- Create verified_business_profiles table
-- This table stores only verified businesses (EOOD and ET with English names, currently active)

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_verified_profiles_eik ON verified_business_profiles(eik);
CREATE INDEX IF NOT EXISTS idx_verified_profiles_entity_type ON verified_business_profiles(entity_type);
CREATE INDEX IF NOT EXISTS idx_verified_profiles_is_active ON verified_business_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_verified_profiles_verified_at ON verified_business_profiles(verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_verified_profiles_business_name_en ON verified_business_profiles(business_name_en);
CREATE INDEX IF NOT EXISTS idx_verified_profiles_incorporation_date ON verified_business_profiles(incorporation_date DESC);
CREATE INDEX IF NOT EXISTS idx_verified_profiles_owner ON verified_business_profiles(current_owner_name);

-- Full-text search on business names
CREATE INDEX IF NOT EXISTS idx_verified_profiles_name_search ON verified_business_profiles 
  USING gin(to_tsvector('english', business_name_en || ' ' || COALESCE(business_name_bg, '')));

-- Enable Row Level Security
ALTER TABLE verified_business_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read to authenticated" ON verified_business_profiles;
DROP POLICY IF EXISTS "Allow all to service_role" ON verified_business_profiles;

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

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_verified_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_verified_profiles_updated_at ON verified_business_profiles;

CREATE TRIGGER trigger_update_verified_profiles_updated_at
  BEFORE UPDATE ON verified_business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_verified_profiles_updated_at();

-- Add table comment
COMMENT ON TABLE verified_business_profiles IS 
  'Verified business profiles: EOOD and ET entities with English names and active status. Only current ownership, no historical data.';

COMMENT ON COLUMN verified_business_profiles.business_name_en IS 'English transliteration - REQUIRED for verification';
COMMENT ON COLUMN verified_business_profiles.entity_type IS 'EOOD (single-member LLC) or ET (sole trader)';
COMMENT ON COLUMN verified_business_profiles.is_active IS 'Currently active business - no historical records';
COMMENT ON COLUMN verified_business_profiles.data_quality_score IS 'Data completeness score (0-100)';
