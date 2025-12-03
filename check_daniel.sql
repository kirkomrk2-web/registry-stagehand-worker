-- Check if Daniel Milenov Martinov exists in verified_owners
SELECT 
  id,
  full_name,
  owner_first_name_en,
  owner_last_name_en,
  allocated_phone_number,
  email_alias_33mail,
  companies,
  top_company,
  companies_slim,
  created_at
FROM verified_owners 
WHERE full_name ILIKE '%Даниел%Мартинов%'
ORDER BY created_at DESC
LIMIT 5;
