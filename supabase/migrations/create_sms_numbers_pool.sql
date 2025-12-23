-- Migration: Upgrade sms_numbers_pool table
-- Add missing columns for platform tracking
-- Date: 2025-12-19

BEGIN;

-- Create table if it doesn't exist (with all columns)
CREATE TABLE IF NOT EXISTS public.sms_numbers_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  country_code text,
  country text,
  platform text,
  sms_url text,
  status text DEFAULT 'available',
  assigned_to uuid,
  assigned_at timestamptz,
  last_used_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns if table already exists
ALTER TABLE public.sms_numbers_pool
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS sms_url text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;

-- Update NOT NULL constraints only if columns exist
DO $$
BEGIN
  -- Make platform NOT NULL if column exists and has data
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='sms_numbers_pool' AND column_name='platform') THEN
    -- First set default value for existing NULL rows
    UPDATE public.sms_numbers_pool SET platform = 'smstome' WHERE platform IS NULL;
    -- Then add NOT NULL constraint
    ALTER TABLE public.sms_numbers_pool ALTER COLUMN platform SET NOT NULL;
  END IF;
  
  -- Make sms_url NOT NULL
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='sms_numbers_pool' AND column_name='sms_url') THEN
    ALTER TABLE public.sms_numbers_pool ALTER COLUMN sms_url SET NOT NULL;
  END IF;
END $$;

-- Add foreign key with orphan cleanup
DO $$
BEGIN
  -- Only proceed if verified_owners table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'verified_owners'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'verified_owners' AND column_name = 'id'
  ) THEN
    -- Clean up orphan references first
    UPDATE public.sms_numbers_pool s
    SET assigned_to = NULL
    WHERE assigned_to IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.verified_owners v
        WHERE v.id = s.assigned_to
      );
    
    -- Add FK if not present
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'sms_numbers_pool_assigned_to_fkey'
    ) THEN
      ALTER TABLE public.sms_numbers_pool
        ADD CONSTRAINT sms_numbers_pool_assigned_to_fkey
        FOREIGN KEY (assigned_to)
        REFERENCES public.verified_owners(id)
        ON DELETE SET NULL;
    END IF;
  ELSE
    RAISE NOTICE 'Skipping FK: public.verified_owners(id) not found.';
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_pool_status ON public.sms_numbers_pool(status);
CREATE INDEX IF NOT EXISTS idx_sms_pool_platform ON public.sms_numbers_pool(platform);
CREATE INDEX IF NOT EXISTS idx_sms_pool_assigned ON public.sms_numbers_pool(assigned_to);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_sms_pool_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sms_pool_updated_at ON public.sms_numbers_pool;
CREATE TRIGGER trg_sms_pool_updated_at
  BEFORE UPDATE ON public.sms_numbers_pool
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sms_pool_updated_at();

-- RLS policies
ALTER TABLE public.sms_numbers_pool ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read to authenticated" ON public.sms_numbers_pool;
DROP POLICY IF EXISTS "Allow all to service_role" ON public.sms_numbers_pool;

CREATE POLICY "Allow read to authenticated"
  ON public.sms_numbers_pool
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all to service_role"
  ON public.sms_numbers_pool
  FOR ALL
  TO service_role
  USING (true);

COMMENT ON TABLE public.sms_numbers_pool IS 'Pool of available SMS numbers for Wallester registrations. n8n allocates and scrapes codes from smstome/fanytel.';

-- Example seed data (optional - add your real numbers here)
-- INSERT INTO public.sms_numbers_pool (phone_number, country_code, country, platform, sms_url, status)
-- VALUES 
--   ('+447481793989', '+44', 'UK', 'smstome', 'http://smstome.com/united-kingdom/phone/447481793989/sms/13384', 'available');

COMMIT;
