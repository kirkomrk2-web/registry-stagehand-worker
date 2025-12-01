-- Purpose: remove duplicate indexes reported by Performance Advisor
-- Safe to run multiple times.

-- 1) verified_owners: the UNIQUE constraint on full_name already creates an index
--    Our migration also created idx_verified_owners_full_name which duplicates it.
--    Keep the constraint-backed index (usually named verified_owners_full_name_key),
--    drop the manual one if present.

-- Inspect current full_name indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'verified_owners' AND indexdef ILIKE '%(full_name)%';

-- Drop duplicate manual unique index if it exists
DROP INDEX IF EXISTS public.idx_verified_owners_full_name;

-- 2) sms_numbers_pool: two identical indexes on assigned_to were detected
--    Example names from Advisor: idx_sms_numbers_pool_assigned_to vs idx_sms_pool_assigned_to
--    Keep the longer, more descriptive name and drop the shorter duplicate.

-- Inspect current assigned_to indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'sms_numbers_pool' AND indexdef ILIKE '%(assigned_to)%';

-- Drop the duplicate by conventional shorter name (adjust if your names differ)
DROP INDEX IF EXISTS public.idx_sms_pool_assigned_to;

-- 3) (Optional) Re-run Advisor after this change.
