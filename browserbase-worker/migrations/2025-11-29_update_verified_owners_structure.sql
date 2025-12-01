-- Migration: Update verified_owners with owner-centric fields and allocations
-- Date: 2025-11-29

BEGIN;

-- Add owner-level fields and allocation fields
ALTER TABLE public.verified_owners
  ADD COLUMN IF NOT EXISTS owner_first_name_en TEXT,
  ADD COLUMN IF NOT EXISTS owner_last_name_en TEXT,
  ADD COLUMN IF NOT EXISTS owner_birthdate DATE,
  ADD COLUMN IF NOT EXISTS top_company JSONB,
  ADD COLUMN IF NOT EXISTS allocated_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS allocated_sms_number_url TEXT,
  ADD COLUMN IF NOT EXISTS allocated_sms_country_code TEXT,
  ADD COLUMN IF NOT EXISTS email_alias_33mail TEXT,
  ADD COLUMN IF NOT EXISTS email_alias_hostinger TEXT,
  ADD COLUMN IF NOT EXISTS email_forwarding_active BOOLEAN DEFAULT false;

-- Helpful indexes for lookups
CREATE INDEX IF NOT EXISTS idx_verified_owners_first_last ON public.verified_owners (lower(owner_first_name_en), lower(owner_last_name_en));
CREATE INDEX IF NOT EXISTS idx_verified_owners_email_alias ON public.verified_owners (lower(email_alias_33mail));

-- Ensure companies array elements DO NOT contain phone/email by convention (cannot enforce in CHECK easily)
COMMENT ON COLUMN public.verified_owners.top_company IS 'Denormalized top result chosen from companies (no phone/email fields).';
COMMENT ON COLUMN public.verified_owners.companies IS 'Up to 5 businesses for the owner (no phone or email fields).';

COMMIT;
