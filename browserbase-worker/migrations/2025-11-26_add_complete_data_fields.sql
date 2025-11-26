-- Migration: Add Complete Data Fields for Business Verification
-- Date: 2025-11-26
-- Description: Adds VAT, email aliases, owner details, and verification code tracking

BEGIN;

-- Add VAT number (auto-generated from EIK)
ALTER TABLE verified_business_profiles
ADD COLUMN IF NOT EXISTS vat_number TEXT;

-- Add email aliases (33mail + Hostinger)
ALTER TABLE verified_business_profiles
ADD COLUMN IF NOT EXISTS email_alias_33mail TEXT,
ADD COLUMN IF NOT EXISTS email_alias_hostinger TEXT,
ADD COLUMN IF NOT EXISTS email_forwarding_active BOOLEAN DEFAULT FALSE;

-- Add owner details (parsed from CompanyBook)
ALTER TABLE verified_business_profiles
ADD COLUMN IF NOT EXISTS owner_first_name_en TEXT,
ADD COLUMN IF NOT EXISTS owner_last_name_en TEXT,
ADD COLUMN IF NOT EXISTS owner_birthdate DATE,
ADD COLUMN IF NOT EXISTS owner_ident TEXT;

-- Add incorporation document URL
ALTER TABLE verified_business_profiles
ADD COLUMN IF NOT EXISTS incorporation_document_url TEXT;

-- Add email verification tracking
ALTER TABLE verified_business_profiles
ADD COLUMN IF NOT EXISTS email_confirmation_code TEXT,
ADD COLUMN IF NOT EXISTS email_confirmation_received_at TIMESTAMPTZ;

-- Add SMS verification tracking
ALTER TABLE verified_business_profiles
ADD COLUMN IF NOT EXISTS sms_verification_code TEXT,
ADD COLUMN IF NOT EXISTS sms_verification_received_at TIMESTAMPTZ;

-- Create index on VAT number for quick lookups
CREATE INDEX IF NOT EXISTS idx_verified_profiles_vat_number 
ON verified_business_profiles(vat_number);

-- Create index on email aliases
CREATE INDEX IF NOT EXISTS idx_verified_profiles_email_alias 
ON verified_business_profiles(email_alias_33mail);

-- Create index for pending verifications (profiles waiting for codes)
CREATE INDEX IF NOT EXISTS idx_verified_profiles_pending_email_verification 
ON verified_business_profiles(email_confirmation_received_at) 
WHERE email_confirmation_received_at IS NULL AND email_alias_33mail IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_verified_profiles_pending_sms_verification 
ON verified_business_profiles(sms_verification_received_at) 
WHERE sms_verification_received_at IS NULL AND phone_number IS NOT NULL;

-- Add constraint: VAT number must be valid format (BG + digits)
ALTER TABLE verified_business_profiles
ADD CONSTRAINT check_vat_format 
CHECK (vat_number IS NULL OR vat_number ~ '^BG[0-9]{9,13}$');

-- Add constraint: Email alias must be valid 33mail format
ALTER TABLE verified_business_profiles
ADD CONSTRAINT check_email_alias_format 
CHECK (email_alias_33mail IS NULL OR email_alias_33mail ~ '^[a-z0-9-]+@madoff\.33mail\.com$');

-- Update data quality score calculation function
CREATE OR REPLACE FUNCTION calculate_data_quality_score(profile verified_business_profiles)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
BEGIN
    -- EIK present: 10 points
    IF profile.eik IS NOT NULL THEN
        score := score + 10;
    END IF;
    
    -- English business name: 15 points
    IF profile.business_name_en IS NOT NULL THEN
        score := score + 15;
    END IF;
    
    -- Address complete (city, region, postal): 20 points
    IF profile.city_en IS NOT NULL AND profile.region_en IS NOT NULL AND profile.postal_code IS NOT NULL THEN
        score := score + 20;
    END IF;
    
    -- Phone number assigned: 15 points
    IF profile.phone_number IS NOT NULL THEN
        score := score + 15;
    END IF;
    
    -- Email alias created: 10 points
    IF profile.email_alias_33mail IS NOT NULL THEN
        score := score + 10;
    END IF;
    
    -- Owner details complete: 15 points
    IF profile.owner_first_name_en IS NOT NULL AND 
       profile.owner_last_name_en IS NOT NULL AND 
       profile.owner_birthdate IS NOT NULL THEN
        score := score + 15;
    END IF;
    
    -- Incorporation date: 10 points
    IF profile.incorporation_date IS NOT NULL THEN
        score := score + 10;
    END IF;
    
    -- Incorporation document: 5 points
    IF profile.incorporation_document_url IS NOT NULL THEN
        score := score + 5;
    END IF;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to automatically update data_quality_score
CREATE OR REPLACE FUNCTION update_data_quality_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_quality_score := calculate_data_quality_score(NEW);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_data_quality_score ON verified_business_profiles;
CREATE TRIGGER trigger_update_data_quality_score
    BEFORE INSERT OR UPDATE ON verified_business_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_data_quality_score();

-- Create view for verification monitoring
CREATE OR REPLACE VIEW verification_monitoring AS
SELECT 
    id,
    eik,
    business_name_en,
    phone_number,
    email_alias_33mail,
    CASE 
        WHEN sms_verification_code IS NOT NULL THEN 'SMS Verified'
        WHEN phone_number IS NOT NULL THEN 'Awaiting SMS'
        ELSE 'No Phone'
    END AS sms_status,
    CASE 
        WHEN email_confirmation_code IS NOT NULL THEN 'Email Verified'
        WHEN email_alias_33mail IS NOT NULL THEN 'Awaiting Email'
        ELSE 'No Email'
    END AS email_status,
    data_quality_score,
    created_at,
    updated_at
FROM verified_business_profiles
ORDER BY updated_at DESC;

-- Grant permissions (adjust as needed for your setup)
GRANT SELECT ON verification_monitoring TO authenticated;
GRANT SELECT ON verification_monitoring TO service_role;

COMMIT;

-- Rollback script (for reference, don't execute):
/*
BEGIN;
ALTER TABLE verified_business_profiles
DROP COLUMN IF EXISTS vat_number,
DROP COLUMN IF EXISTS email_alias_33mail,
DROP COLUMN IF EXISTS email_alias_hostinger,
DROP COLUMN IF EXISTS email_forwarding_active,
DROP COLUMN IF EXISTS owner_first_name_en,
DROP COLUMN IF EXISTS owner_last_name_en,
DROP COLUMN IF EXISTS owner_birthdate,
DROP COLUMN IF EXISTS owner_ident,
DROP COLUMN IF EXISTS incorporation_document_url,
DROP COLUMN IF EXISTS email_confirmation_code,
DROP COLUMN IF EXISTS email_confirmation_received_at,
DROP COLUMN IF EXISTS sms_verification_code,
DROP COLUMN IF EXISTS sms_verification_received_at;

DROP TRIGGER IF EXISTS trigger_update_data_quality_score ON verified_business_profiles;
DROP FUNCTION IF EXISTS update_data_quality_score();
DROP FUNCTION IF EXISTS calculate_data_quality_score(verified_business_profiles);
DROP VIEW IF EXISTS verification_monitoring;
COMMIT;
*/
