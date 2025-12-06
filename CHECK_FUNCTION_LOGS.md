# 🔍 КАК ДА ПРОВЕРИШ FUNCTION LOGS

## Стъпки:

1. **Отвори Function Logs:**
   ```
   https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/functions/registry_check/logs
   ```

2. **Търси за:**
   - Email: `ivan_test_1765047043359@test.bg`
   - Или последните 5-10 минути

3. **Какво да търсиш:**
   - ✅ `[registry_check] Inserting into user_registry_checks for...`
   - ❌ `Failed to insert user_registry_checks`
   - ❌ Някакви error messages

4. **Copy-paste логовете тук за да видим къде е проблемът**

---

## Алтернативно - провери директно в базата:

```sql
-- Отвори SQL Editor и провери ръчно:
SELECT * FROM user_registry_checks 
ORDER BY created_at DESC 
LIMIT 10;

-- Също провери има ли записи за имейла:
SELECT * FROM user_registry_checks 
WHERE email LIKE '%ivan_test%'
ORDER BY created_at DESC;
```

Ако видиш записи там, значи registry_check работи, но теста чете твърде рано.

Ако НЕ видиш записи, значи registry_check има bug при INSERT.
