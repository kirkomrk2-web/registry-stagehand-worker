-- Провери какво има в user_registry_checks
-- Копирай тези SQL заявки в Supabase SQL Editor

-- 1. Брой на всички записи
SELECT count(*) as total_records FROM user_registry_checks;

-- 2. Последните 10 записа (за да видим какви имена има)
SELECT 
  full_name,
  email,
  match_count,
  any_match,
  created_at
FROM user_registry_checks
ORDER BY created_at DESC
LIMIT 10;

-- 3. Търси имена като "Асен"
SELECT 
  full_name,
  email,
  match_count
FROM user_registry_checks
WHERE full_name ILIKE '%Асен%'
ORDER BY created_at DESC;

-- 4. Търси имена като "Митков"
SELECT 
  full_name,
  email,
  match_count
FROM user_registry_checks
WHERE full_name ILIKE '%Митков%'
ORDER BY created_at DESC;

-- 5. Всички уникални имена (първите 20)
SELECT DISTINCT full_name 
FROM user_registry_checks 
ORDER BY full_name 
LIMIT 20;
