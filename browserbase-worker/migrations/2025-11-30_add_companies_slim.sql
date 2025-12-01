-- Migration: Add companies_slim JSONB to verified_owners
-- Date: 2025-11-30

BEGIN;

ALTER TABLE public.verified_owners
  ADD COLUMN IF NOT EXISTS companies_slim JSONB; -- array of {id, business_name_en, eik, vat, entity_type, city_en, region_en, country_en}

COMMENT ON COLUMN public.verified_owners.companies_slim IS 'Slim list of verified companies (EOOD/ET, 100% owned) with english name: [{id, business_name_en, eik, vat, entity_type, city_en, region_en, country_en}]';

COMMIT;
