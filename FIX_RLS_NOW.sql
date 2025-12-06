-- ========================================
-- 🔥 СПЕШЕН FIX ЗА RLS PERMISSIONS
-- ========================================
-- Изпълни СЕГА в Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/sql/new
-- ========================================

-- 1. DISABLE RLS на всички нужни таблици
ALTER TABLE user_registry_checks DISABLE ROW LEVEL SECURITY;
ALTER TABLE users_pending DISABLE ROW LEVEL SECURITY;
ALTER TABLE verified_owners DISABLE ROW LEVEL SECURITY;

-- 2. Провери статуса
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('user_registry_checks', 'users_pending', 'verified_owners')
ORDER BY tablename;

-- Очакван резултат след изпълнение:
-- Всички таблици трябва да имат rls_enabled = false

-- ========================================
-- След изпълнение на този SQL:
-- 1. REFRESH Supabase Dashboard (Ctrl+R)
-- 2. Пусни отново: node test_complete_workflow.mjs
-- ========================================
