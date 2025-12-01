-- Migration: Additional helpers for verified_owners
-- Date: 2025-11-29

BEGIN;

-- 1) Replace owners_by_company view to include company_id for easier lookups
CREATE OR REPLACE VIEW public.owners_by_company AS
SELECT
  o.id AS owner_id,
  o.full_name,
  (c->>'eik')::text AS eik,
  c AS company,
  (c->>'id')::text AS company_id
FROM public.verified_owners o
CROSS JOIN LATERAL jsonb_array_elements(o.companies) AS c;

-- Helpful indexes


-- 2) Find by company_id (legacy verified_business_profiles.id stored in company JSON)
CREATE OR REPLACE FUNCTION public.owners_find_by_company_id(p_company_id uuid)
RETURNS TABLE(owner_id uuid, eik text, company jsonb)
LANGUAGE sql
STABLE
AS $$
  SELECT obc.owner_id, obc.eik, obc.company
  FROM public.owners_by_company obc
  WHERE obc.company_id = p_company_id::text
  LIMIT 1;
$$;

-- 3) Find by phone number (owner-level allocation)
CREATE OR REPLACE FUNCTION public.owners_find_by_phone(p_phone text)
RETURNS TABLE(owner_id uuid, eik text, company jsonb)
LANGUAGE sql
STABLE
AS $$
  SELECT o.id AS owner_id,
         COALESCE(o.top_company->>'eik', '') AS eik,
         o.top_company AS company
  FROM public.verified_owners o
  WHERE o.allocated_phone_number = p_phone
  LIMIT 1;
$$;

-- 4) Find by email alias (33mail) (owner-level allocation)
CREATE OR REPLACE FUNCTION public.owners_find_by_email_alias(p_alias text)
RETURNS TABLE(owner_id uuid, eik text, company jsonb)
LANGUAGE sql
STABLE
AS $$
  SELECT o.id AS owner_id,
         COALESCE(o.top_company->>'eik', '') AS eik,
         o.top_company AS company
  FROM public.verified_owners o
  WHERE lower(o.email_alias_33mail) = lower(p_alias)
  LIMIT 1;
$$;

COMMIT;
