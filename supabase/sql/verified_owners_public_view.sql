-- One-shot SQL: ensure companies_slim exists, create public view, enable RLS, add anon read policy
-- Run this in Supabase SQL editor
BEGIN;

-- 1) Column (idempotent)
ALTER TABLE public.verified_owners
  ADD COLUMN IF NOT EXISTS companies_slim JSONB; -- [{id,business_name_en,eik,vat,entity_type,city_en,region_en,country_en}]

-- 2) View with minimal public fields
CREATE OR REPLACE VIEW public.verified_owners_public AS
SELECT
  id,
  full_name,
  owner_first_name_en,
  owner_last_name_en,
  owner_birthdate,
  allocated_phone_number,
  email_alias_33mail,
  companies_slim,
  updated_at
FROM public.verified_owners;

-- 3) RLS + anon read-only policy (idempotent)
ALTER TABLE public.verified_owners_public ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='verified_owners_public' AND policyname='anon_can_read_verified_owners_public'
  ) THEN
    CREATE POLICY anon_can_read_verified_owners_public
      ON public.verified_owners_public
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END$$;

COMMIT;
