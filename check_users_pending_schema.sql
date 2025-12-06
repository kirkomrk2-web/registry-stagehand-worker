-- Провери схемата на users_pending
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users_pending'
ORDER BY ordinal_position;
