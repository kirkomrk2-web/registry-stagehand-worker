BEGIN;

ALTER TABLE verified_business_profiles
  DROP CONSTRAINT IF EXISTS check_email_alias_format;

UPDATE verified_business_profiles
SET email_alias_33mail = regexp_replace(lower(business_name_en), '[^a-z0-9]', '', 'g') || '@33mailbox.com'
WHERE email_alias_33mail IS NOT NULL
  AND email_alias_33mail NOT ILIKE '%@33mailbox.com';

ALTER TABLE verified_business_profiles
  ADD CONSTRAINT check_email_alias_format
  CHECK (
    email_alias_33mail IS NULL
    OR email_alias_33mail ~ '^[a-z0-9]+@33mailbox\.com$'
  );

COMMIT;
