-- ========================================
-- FIX DATABASE PERMISSIONS FOR EDGE FUNCTIONS
-- ========================================
-- 
-- Проблем: Edge функциите (registry_check, users_pending_worker)
-- не могат да записват в таблиците заради Row Level Security (RLS)
--
-- Решение: Disable RLS или създай policies за service_role
-- ========================================

-- OPTION 1: Disable RLS напълно (препоръчително за развитие)
ALTER TABLE user_registry_checks DISABLE ROW LEVEL SECURITY;
ALTER TABLE users_pending DISABLE ROW LEVEL SECURITY;
ALTER TABLE verified_owners DISABLE ROW LEVEL SECURITY;

-- OPTION 2: Ако искаш да запазиш RLS, създай policies za service_role

-- Policy за insert в user_registry_checks
DROP POLICY IF EXISTS "service_role_full_access" ON user_registry_checks;
CREATE POLICY "service_role_full_access" ON user_registry_checks
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy за update в users_pending
DROP POLICY IF EXISTS "service_role_full_access" ON users_pending;
CREATE POLICY "service_role_full_access" ON users_pending
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy за insert/update в verified_owners
DROP POLICY IF EXISTS "service_role_full_access" ON verified_owners;
CREATE POLICY "service_role_full_access" ON verified_owners
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Провери текущите policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('user_registry_checks', 'users_pending', 'verified_owners');
