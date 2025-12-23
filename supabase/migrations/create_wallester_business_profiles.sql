-- Migration: Create wallester_business_profiles table
-- Track Wallester registration attempts and status for each business
-- Date: 2025-12-19

BEGIN;

CREATE TABLE IF NOT EXISTS public.wallester_business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  owner_id uuid NOT NULL REFERENCES public.verified_owners(id) ON DELETE CASCADE,
  eik text NOT NULL,
  
  -- Business identification
  business_name_en text NOT NULL,
  business_name_wallester text NOT NULL,
  entity_type text,
  
  -- Wallester tracking
  wallester_account_id text,              -- ID from Wallester if account created
  wallester_status text NOT NULL,         -- 'pending', 'created', 'approved', 'rejected', 'closed', 'error'
  wallester_error text,                   -- Error message if failed
  wallester_submitted_at timestamptz,     -- When we sent the registration
  wallester_response_at timestamptz,      -- When we got response
  
  -- Metadata
  n8n_execution_id text,                  -- Link to n8n execution for debugging
  attempts integer DEFAULT 1,             -- How many times we tried
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallester_profiles_eik ON public.wallester_business_profiles(eik);
CREATE INDEX IF NOT EXISTS idx_wallester_profiles_owner ON public.wallester_business_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_wallester_profiles_status ON public.wallester_business_profiles(wallester_status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_wallester_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallester_profiles_updated_at ON public.wallester_business_profiles;
CREATE TRIGGER trg_wallester_profiles_updated_at
  BEFORE UPDATE ON public.wallester_business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_wallester_profiles_updated_at();

-- RLS policies
ALTER TABLE public.wallester_business_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read to authenticated" ON public.wallester_business_profiles;
DROP POLICY IF EXISTS "Allow all to service_role" ON public.wallester_business_profiles;

CREATE POLICY "Allow read to authenticated"
  ON public.wallester_business_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all to service_role"
  ON public.wallester_business_profiles
  FOR ALL
  TO service_role
  USING (true);

COMMENT ON TABLE public.wallester_business_profiles IS 'Track Wallester registration status for each business to prevent duplicates and track history';

COMMIT;
