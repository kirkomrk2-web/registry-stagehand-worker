-- =====================================================
-- Wallester Automation - Database Schema
-- =====================================================
-- This migration adds support for automated Wallester registration
-- with 33mailbox.com email integration and business lifecycle tracking

-- =====================================================
-- 1. EMAIL POOL MANAGEMENT
-- =====================================================

-- Table for managing email mailboxes (each supports 5 aliases)
CREATE TABLE IF NOT EXISTS business_email_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mailbox_email TEXT NOT NULL UNIQUE,     -- e.g., 'securebox@33mailbox.com'
  alias_count INTEGER DEFAULT 0,          -- Current number of aliases (max 5)
  status TEXT DEFAULT 'active',           -- 'active', 'full', 'inactive'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for tracking individual email aliases
CREATE TABLE IF NOT EXISTS business_email_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mailbox_id UUID REFERENCES business_email_pool(id) ON DELETE CASCADE,
  alias_email TEXT UNIQUE NOT NULL,       -- e.g., 'asenmetal81@33mailbox.com'
  assigned_to UUID REFERENCES verified_business_profiles(id),
  business_name TEXT,                     -- For reference
  status TEXT DEFAULT 'active',           -- 'active', 'used', 'released'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_aliases_status ON business_email_aliases(status);
CREATE INDEX IF NOT EXISTS idx_email_aliases_assigned ON business_email_aliases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_email_pool_status ON business_email_pool(status);

-- =====================================================
-- 2. PHONE NUMBER TRACKING (USED NUMBERS)
-- =====================================================

-- Table for tracking used/completed phone numbers
CREATE TABLE IF NOT EXISTS sms_numbers_used (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  country_code TEXT,
  sms_url TEXT,
  used_for_profile UUID,                  -- Which profile was this used for
  used_for_business TEXT,                 -- Business name for reference
  used_at TIMESTAMPTZ DEFAULT NOW(),
  wallester_registered BOOLEAN DEFAULT FALSE,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sms_used_profile ON sms_numbers_used(used_for_profile);

-- =====================================================
-- 3. COMPLETED BUSINESSES TRACKING
-- =====================================================

-- Table for businesses that completed Wallester registration
CREATE TABLE IF NOT EXISTS completed_businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_profile_id UUID,               -- Reference to original verified profile
  eik TEXT NOT NULL,
  vat_number TEXT,
  business_name_bg TEXT,
  business_name_en TEXT,
  legal_form_bg TEXT,
  business_structure_en TEXT,
  entity_type TEXT,
  full_address TEXT,
  street_en TEXT,
  city_en TEXT,
  region_en TEXT,
  country_en TEXT,
  postal_code TEXT,
  incorporation_date DATE,
  current_owner_name TEXT,                -- Full name of owner
  owner_first_name_en TEXT,
  owner_last_name_en TEXT,
  owner_birthdate DATE,
  owner_ident TEXT,
  phone_number TEXT,
  sms_country_code TEXT,
  email_alias TEXT,                       -- The 33mailbox alias used
  wallester_account_id TEXT,
  wallester_status TEXT,                  -- Final status
  registration_completed_at TIMESTAMPTZ DEFAULT NOW(),
  data_quality_score INTEGER,
  source TEXT,
  companies_jsonb JSONB,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_completed_eik ON completed_businesses(eik);
CREATE INDEX IF NOT EXISTS idx_completed_owner ON completed_businesses(current_owner_name);
CREATE INDEX IF NOT EXISTS idx_completed_wallester ON completed_businesses(wallester_account_id);

-- =====================================================
-- 4. UPDATE VERIFIED BUSINESS PROFILES
-- =====================================================

-- Add Wallester-specific columns
ALTER TABLE verified_business_profiles 
  ADD COLUMN IF NOT EXISTS profile_status TEXT DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS wallester_status TEXT,
  ADD COLUMN IF NOT EXISTS wallester_account_id TEXT,
  ADD COLUMN IF NOT EXISTS wallester_registration_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallester_registration_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS incorporation_document_url TEXT,
  ADD COLUMN IF NOT EXISTS selected_for_registration BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS registration_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_registration_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS registration_error TEXT;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON verified_business_profiles(profile_status);
CREATE INDEX IF NOT EXISTS idx_profiles_wallester_status ON verified_business_profiles(wallester_status);

-- Update SMS pool to track when numbers are archived
ALTER TABLE sms_numbers_pool
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- =====================================================
-- 5. SEED EMAIL POOL WITH EXISTING MAILBOXES
-- =====================================================

-- Insert existing mailboxes (you mentioned these exist)
INSERT INTO business_email_pool (mailbox_email, alias_count, status) 
VALUES 
  ('support@33mailbox.com', 2, 'active'),    -- 2/5 aliases used
  ('securebox@33mailbox.com', 0, 'active')   -- 0/5 aliases available
ON CONFLICT (mailbox_email) DO NOTHING;

-- Note: securebox2, securebox3, securebox4 to be created manually in Hostinger

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get next available mailbox for alias creation
CREATE OR REPLACE FUNCTION get_available_mailbox()
RETURNS UUID AS $$
DECLARE
  mailbox_id UUID;
BEGIN
  -- Find first mailbox with less than 5 aliases
  SELECT id INTO mailbox_id
  FROM business_email_pool
  WHERE status = 'active' AND alias_count < 5
  ORDER BY alias_count ASC, created_at ASC
  LIMIT 1;
  
  RETURN mailbox_id;
END;
$$ LANGUAGE plpgsql;

-- Function to assign email alias to a business
CREATE OR REPLACE FUNCTION assign_email_alias(
  p_business_id UUID,
  p_alias_email TEXT,
  p_business_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_mailbox_id UUID;
  v_alias_id UUID;
BEGIN
  -- Get available mailbox
  v_mailbox_id := get_available_mailbox();
  
  IF v_mailbox_id IS NULL THEN
    RAISE EXCEPTION 'No available mailbox found. All mailboxes are full.';
  END IF;
  
  -- Create alias
  INSERT INTO business_email_aliases (
    mailbox_id, 
    alias_email, 
    assigned_to, 
    business_name, 
    status,
    assigned_at
  )
  VALUES (
    v_mailbox_id,
    p_alias_email,
    p_business_id,
    p_business_name,
    'active',
    NOW()
  )
  RETURNING id INTO v_alias_id;
  
  -- Update mailbox alias count
  UPDATE business_email_pool
  SET alias_count = alias_count + 1,
      updated_at = NOW(),
      status = CASE WHEN alias_count + 1 >= 5 THEN 'full' ELSE 'active' END
  WHERE id = v_mailbox_id;
  
  RETURN v_alias_id;
END;
$$ LANGUAGE plpgsql;

-- Function to move phone number to used pool
CREATE OR REPLACE FUNCTION archive_phone_number(
  p_phone_id UUID,
  p_profile_id UUID,
  p_business_name TEXT
)
RETURNS VOID AS $$
DECLARE
  v_phone_record RECORD;
BEGIN
  -- Get phone number details
  SELECT * INTO v_phone_record
  FROM sms_numbers_pool
  WHERE id = p_phone_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Phone number not found';
  END IF;
  
  -- Insert into used pool
  INSERT INTO sms_numbers_used (
    phone_number,
    country_code,
    sms_url,
    used_for_profile,
    used_for_business,
    wallester_registered
  )
  VALUES (
    v_phone_record.phone_number,
    v_phone_record.country_code,
    v_phone_record.sms_url,
    p_profile_id,
    p_business_name,
    TRUE
  );
  
  -- Update original record
  UPDATE sms_numbers_pool
  SET status = 'archived',
      archived_at = NOW(),
      archive_reason = 'Used for Wallester registration'
  WHERE id = p_phone_id;
END;
$$ LANGUAGE plpgsql;

-- Function to move business to completed
CREATE OR REPLACE FUNCTION complete_business_registration(
  p_profile_id UUID,
  p_wallester_account_id TEXT
)
RETURNS UUID AS $$
DECLARE
  v_profile RECORD;
  v_completed_id UUID;
BEGIN
  -- Get profile details
  SELECT * INTO v_profile
  FROM verified_business_profiles
  WHERE id = p_profile_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  
  -- Insert into completed_businesses
  INSERT INTO completed_businesses (
    original_profile_id,
    eik,
    vat_number,
    business_name_bg,
    business_name_en,
    legal_form_bg,
    business_structure_en,
    entity_type,
    full_address,
    street_en,
    city_en,
    region_en,
    country_en,
    postal_code,
    incorporation_date,
    current_owner_name,
    owner_first_name_en,
    owner_last_name_en,
    owner_birthdate,
    owner_ident,
    phone_number,
    sms_country_code,
    email_alias,
    wallester_account_id,
    wallester_status,
    data_quality_score,
    source,
    companies_jsonb
  )
  VALUES (
    v_profile.id,
    v_profile.eik,
    v_profile.vat_number,
    v_profile.business_name_bg,
    v_profile.business_name_en,
    v_profile.legal_form_bg,
    v_profile.business_structure_en,
    v_profile.entity_type,
    v_profile.full_address,
    v_profile.street_en,
    v_profile.city_en,
    v_profile.region_en,
    v_profile.country_en,
    v_profile.postal_code,
    v_profile.incorporation_date,
    v_profile.current_owner_name,
    v_profile.owner_first_name_en,
    v_profile.owner_last_name_en,
    v_profile.owner_birthdate,
    v_profile.current_owner_ident,
    v_profile.phone_number,
    v_profile.sms_country_code,
    v_profile.email_alias_33mail,
    p_wallester_account_id,
    v_profile.wallester_status,
    v_profile.data_quality_score,
    v_profile.source,
    v_profile.companies_jsonb
  )
  RETURNING id INTO v_completed_id;
  
  -- Archive phone number
  IF v_profile.phone_number IS NOT NULL THEN
    PERFORM archive_phone_number(
      (SELECT id FROM sms_numbers_pool WHERE phone_number = v_profile.phone_number LIMIT 1),
      v_profile.id,
      v_profile.business_name_en
    );
  END IF;
  
  -- Delete from verified_business_profiles
  DELETE FROM verified_business_profiles WHERE id = p_profile_id;
  
  RETURN v_completed_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. VIEWS FOR MONITORING
-- =====================================================

-- View for businesses ready for registration
CREATE OR REPLACE VIEW businesses_ready_for_registration AS
SELECT 
  id,
  eik,
  business_name_en,
  current_owner_name,
  data_quality_score,
  phone_number,
  email_alias_33mail,
  profile_status,
  wallester_status,
  created_at
FROM verified_business_profiles
WHERE profile_status = 'verified'
  AND selected_for_registration = FALSE
  AND phone_number IS NOT NULL
  AND email_alias_33mail IS NOT NULL
  AND data_quality_score >= 70
ORDER BY data_quality_score DESC, created_at ASC;

-- View for active registrations
CREATE OR REPLACE VIEW active_registrations AS
SELECT 
  id,
  eik,
  business_name_en,
  current_owner_name,
  wallester_status,
  wallester_registration_started_at,
  registration_attempts,
  last_registration_attempt_at
FROM verified_business_profiles
WHERE profile_status = 'signing-up'
ORDER BY wallester_registration_started_at DESC;

-- =====================================================
-- 8. COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE business_email_pool IS 'Manages email mailboxes for 33mailbox.com, each supporting up to 5 aliases';
COMMENT ON TABLE business_email_aliases IS 'Tracks individual email aliases assigned to businesses';
COMMENT ON TABLE sms_numbers_used IS 'Archive of phone numbers that have been used for Wallester registration';
COMMENT ON TABLE completed_businesses IS 'Businesses that successfully completed Wallester registration';

COMMENT ON COLUMN verified_business_profiles.profile_status IS 'Lifecycle: verified → signing-up → registered';
COMMENT ON COLUMN verified_business_profiles.wallester_status IS 'Registration progress: pending → phone_verified → email_verified → completed';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Update email alias generation (no hyphens)
-- 2. Update emailMonitorWorker for 33mailbox.com
-- 3. Create wallesterRegistrationWorker
-- 4. Create orchestration logic
