-- Migration: Move from verified_business_profiles -> verified_owners
-- Purpose: Store owners by full_name; each owns up to 5 eligible businesses in companies JSONB array
-- Date: 2025-11-29

BEGIN;

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- 1) Create new table verified_owners
CREATE TABLE IF NOT EXISTS public.verified_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  companies JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_verified_owners_full_name UNIQUE (full_name),
  CONSTRAINT check_companies_is_array CHECK (jsonb_typeof(companies) = 'array'),
  CONSTRAINT check_companies_length_max_5 CHECK (jsonb_array_length(companies) <= 5)
);

COMMENT ON TABLE public.verified_owners IS 'Verified owners keyed by full_name; companies JSONB array holds up to 5 eligible businesses.';
COMMENT ON COLUMN public.verified_owners.full_name IS 'Owner full name (UTF-8, unique)';
COMMENT ON COLUMN public.verified_owners.companies IS 'Array of up to 5 JSON objects with business info (eik, names, entity_type, etc.)';

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_verified_owners_full_name ON public.verified_owners (full_name);
CREATE INDEX IF NOT EXISTS idx_verified_owners_full_name_ci ON public.verified_owners (lower(full_name));
CREATE INDEX IF NOT EXISTS idx_verified_owners_companies_gin ON public.verified_owners USING gin (companies jsonb_path_ops);

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.set_verified_owners_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_verified_owners_set_updated_at ON public.verified_owners;
CREATE TRIGGER trg_verified_owners_set_updated_at
  BEFORE UPDATE ON public.verified_owners
  FOR EACH ROW
  EXECUTE FUNCTION public.set_verified_owners_updated_at();

-- 2) Migrate data from verified_business_profiles -> verified_owners
--    We group by current_owner_name (non-null, non-empty), rank by data_quality_score desc then verified_at/created_at desc, keep top 5
--    Build compact company JSON objects. Adjust field list as needed.
WITH ranked AS (
  SELECT
    COALESCE(NULLIF(TRIM(current_owner_name), ''), NULL) AS full_name,
    jsonb_build_object(
      'id', id,
      'eik', eik,
      'business_name_en', business_name_en,
      'business_name_bg', business_name_bg,
      'entity_type', entity_type,
      'is_active', is_active,
      'vat_number', vat_number,
      'city_en', city_en,
      'region_en', region_en,
      'country_en', country_en,
      'phone_number', phone_number,
      'verified_at', verified_at,
      'last_checked_at', last_checked_at,
      'data_quality_score', data_quality_score,
      'profile_status', profile_status,
      'wallester_status', wallester_status
    ) AS company_obj,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(NULLIF(TRIM(current_owner_name), ''), NULL)
      ORDER BY COALESCE(data_quality_score, 0) DESC,
               COALESCE(verified_at, created_at) DESC
    ) AS rn
  FROM public.verified_business_profiles
  WHERE current_owner_name IS NOT NULL AND TRIM(current_owner_name) <> ''
), limited AS (
  SELECT full_name, company_obj
  FROM ranked
  WHERE rn <= 5
)
INSERT INTO public.verified_owners (full_name, companies)
SELECT full_name, jsonb_agg(company_obj)
FROM limited
GROUP BY full_name
ON CONFLICT (full_name) DO UPDATE SET
  companies = EXCLUDED.companies,
  updated_at = now();

-- 3) RLS policies (similar to previous table)
ALTER TABLE public.verified_owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read to authenticated" ON public.verified_owners;
DROP POLICY IF EXISTS "Allow all to service_role" ON public.verified_owners;

CREATE POLICY "Allow read to authenticated"
  ON public.verified_owners
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all to service_role"
  ON public.verified_owners
  FOR ALL
  TO service_role
  USING (true);

-- 4) Helper view (optional): owners_by_company to search owners by company EIK quickly
--    Note: This is not a compatibility view. It only helps lookups.
CREATE OR REPLACE VIEW public.owners_by_company AS
SELECT
  o.id AS owner_id,
  o.full_name,
  (c->>'eik') AS eik,
  c AS company
FROM public.verified_owners o
CROSS JOIN LATERAL jsonb_array_elements(o.companies) AS c;



COMMIT;
