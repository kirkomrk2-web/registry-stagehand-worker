-- Add top-level arrays to store enriched CompanyBook fields per check
-- Each column is a JSONB array aligned with the companies array order

ALTER TABLE user_registry_checks
  ADD COLUMN IF NOT EXISTS english_names JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS legal_forms_bg JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS business_structures_en JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS incorporation_dates JSONB DEFAULT '[]'::jsonb;

-- Optional: record the data source for this check (e.g., "companybook"), if not present
ALTER TABLE user_registry_checks
  ADD COLUMN IF NOT EXISTS source TEXT;
