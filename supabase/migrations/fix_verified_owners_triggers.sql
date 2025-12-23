-- Migration: Clean up duplicate triggers for verified_owners
-- Remove old n8n-trigger and keep only the Database Webhook
-- Date: 2025-12-19

BEGIN;

-- Drop the old SQL trigger that points to old webhook URL
DROP TRIGGER IF EXISTS "n8n-trigger" ON public.verified_owners;

-- The Database Webhook "verified_owners_insert" (configured via UI) remains active
-- It handles both INSERT and UPDATE events to https://n8n.srv1201204.hstgr.cloud/webhook/supabase-verified-owners

COMMENT ON TABLE public.verified_owners IS 'Verified owners by full_name. Database Webhook verified_owners_insert triggers n8n on INSERT/UPDATE.';

COMMIT;
