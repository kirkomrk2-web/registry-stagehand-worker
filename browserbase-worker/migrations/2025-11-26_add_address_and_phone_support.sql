-- Migration: Add address parsing and SMS phone number support
-- Date: 2025-11-26
-- Description: Adds detailed address fields and SMS number management

-- ============================================================================
-- 1. Add address columns to verified_business_profiles
-- ============================================================================

ALTER TABLE public.verified_business_profiles
  ADD COLUMN IF NOT EXISTS full_address TEXT,
  ADD COLUMN IF NOT EXISTS street_en TEXT,
  ADD COLUMN IF NOT EXISTS city_en TEXT,
  ADD COLUMN IF NOT EXISTS region_en TEXT,
  ADD COLUMN IF NOT EXISTS country_en TEXT DEFAULT 'Bulgaria',
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Add phone number columns
ALTER TABLE public.verified_business_profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS sms_number_url TEXT,
  ADD COLUMN IF NOT EXISTS sms_country_code TEXT;

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
-- 2. Add address columns to user_registry_checks (optional but useful)
-- ============================================================================

ALTER TABLE public.user_registry_checks
  ADD COLUMN IF NOT EXISTS full_addresses JSONB;

COMMENT ON COLUMN user_registry_checks.full_addresses IS 'Array of full addresses from matched companies';

-- ============================================================================
-- 3. Create SMS numbers pool table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sms_numbers_pool (
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

-- Indexes for SMS numbers pool
CREATE INDEX IF NOT EXISTS idx_sms_pool_status ON sms_numbers_pool(status);
CREATE INDEX IF NOT EXISTS idx_sms_pool_phone ON sms_numbers_pool(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_pool_assigned_to ON sms_numbers_pool(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sms_pool_country ON sms_numbers_pool(country_code);

COMMENT ON TABLE sms_numbers_pool IS 'Pool of virtual phone numbers for SMS verification';
COMMENT ON COLUMN sms_numbers_pool.phone_number IS 'The actual phone number (e.g., +358457399902X)';
COMMENT ON COLUMN sms_numbers_pool.sms_url IS 'URL to check messages (e.g., https://smstome.com/finland/phone/...)';
COMMENT ON COLUMN sms_numbers_pool.status IS 'available: ready to use, assigned: currently in use, used: completed, invalid: number no longer works';
COMMENT ON COLUMN sms_numbers_pool.assigned_to IS 'Reference to verified_business_profiles if assigned';

-- ============================================================================
-- 4. Create trigger to update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sms_pool_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sms_pool_updated_at ON sms_numbers_pool;

CREATE TRIGGER trigger_update_sms_pool_updated_at
  BEFORE UPDATE ON sms_numbers_pool
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_pool_updated_at();

-- ============================================================================
-- 5. Insert initial SMS numbers from the provided list
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
-- 6. Enable RLS policies for SMS numbers pool
-- ============================================================================

ALTER TABLE sms_numbers_pool ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read to authenticated" ON sms_numbers_pool;
DROP POLICY IF EXISTS "Allow all to service_role" ON sms_numbers_pool;

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
-- DONE
-- ============================================================================

COMMENT ON TABLE sms_numbers_pool IS 'Virtual phone numbers for Wallester card verification SMS codes';
