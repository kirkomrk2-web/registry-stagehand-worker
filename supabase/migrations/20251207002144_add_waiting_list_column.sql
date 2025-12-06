-- Add waiting_list column to verified_owners table
-- This replaces top_company with a structured JSON array containing full business details

ALTER TABLE verified_owners 
ADD COLUMN IF NOT EXISTS waiting_list JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN verified_owners.waiting_list IS 'Structured list of businesses with full details for Wallester registration';
