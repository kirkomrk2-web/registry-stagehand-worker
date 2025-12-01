-- Migration: Detach sms_numbers_pool.assigned_to FK to support owner/company UUID mapping
-- Date: 2025-11-29

BEGIN;

-- Drop FK to verified_business_profiles so we can store owner-company synthetic IDs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'sms_numbers_pool'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name ILIKE '%assigned_to%'
  ) THEN
    ALTER TABLE public.sms_numbers_pool DROP CONSTRAINT IF EXISTS sms_numbers_pool_assigned_to_fkey;
  END IF;
END$$;

-- Document new semantics of assigned_to
COMMENT ON COLUMN public.sms_numbers_pool.assigned_to IS 'Generic UUID referencing owner-company synthetic ID used by workers (no FK).';

COMMIT;
