-- UPDATE existing profiles with missing data (VAT, email aliases, owner names)
-- Run this AFTER the main migration to populate existing records

-- Update VAT numbers (BG + EIK)
UPDATE verified_business_profiles
SET vat_number = 'BG' || eik
WHERE vat_number IS NULL AND eik IS NOT NULL;

-- Update email aliases based on business name
UPDATE verified_business_profiles
SET email_alias_33mail = lower(regexp_replace(
    regexp_replace(business_name_en, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
)) || '@madoff.33mail.com'
WHERE email_alias_33mail IS NULL AND business_name_en IS NOT NULL;

-- Update Hostinger forwarding email
UPDATE verified_business_profiles
SET email_alias_hostinger = 'admin@wallesters.com'
WHERE email_alias_hostinger IS NULL;

-- Parse owner names (basic split on first/last token)
UPDATE verified_business_profiles
SET 
    owner_first_name_en = split_part(current_owner_name, ' ', 1),
    owner_last_name_en = split_part(current_owner_name, ' ', -1)
WHERE owner_first_name_en IS NULL 
  AND current_owner_name IS NOT NULL 
  AND current_owner_name <> '';

-- Show updated records to verify
SELECT 
    id,
    eik,
    vat_number,
    business_name_en,
    email_alias_33mail,
    owner_first_name_en,
    owner_last_name_en,
    data_quality_score
FROM verified_business_profiles
ORDER BY created_at DESC
LIMIT 5;
