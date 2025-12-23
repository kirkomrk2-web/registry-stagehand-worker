-- Enable public READ access for verified_owners table
-- This allows the public HTML viewer to work with ANON key

-- Enable RLS if not already enabled
ALTER TABLE verified_owners ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public read access to verified_owners" ON verified_owners;

-- Create policy for public read access
CREATE POLICY "Allow public read access to verified_owners"
ON verified_owners
FOR SELECT
TO anon
USING (true);

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'verified_owners';
