# 🎯 ФИНАЛНИ ИНСТРУКЦИИ ЗА ТЕСТВАНЕ

## ✅ Какво направихме до сега:

1. ✅ **Deploy-нахме обновения `registry_check`** Edge Function
   - Сега функцията автоматично:
     - Записва в `user_registry_checks`
     - Обновява `users_pending.status`
     - Извиква `users_pending_worker`
     - Изпраща email notification
   - Deployment URL: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/functions

2. ✅ **Създадохме тест скрипт** (`test_complete_workflow.mjs`)
   - Тества целия workflow от начало до край
   - Проверява всички таблици

3. ✅ **Подготвени са frontend файлове** за Hostinger:
   - `HOSTINGER_FIXED_FILES/useRegistryCheck.js`
   - `HOSTINGER_FIXED_FILES/useChatLogic.js`
   - `HOSTINGER_FIXED_FILES/README_DEPLOYMENT.md`

---

## 🚀 СЛЕДВАЩИ СТЪПКИ:

### Стъпка 1: Тествай Backend Workflow ⚡

Първо трябва да тестваме backend-a преди да пипаме frontend-a:

```bash
# 1. Отвори Supabase Dashboard и копирай service_role key:
#    https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/settings/api
#    (Виж секция "Project API keys" → "service_role" → Copy)

# 2. Пусни теста с новия key:
SUPABASE_SERVICE_ROLE_KEY="ТВОЯТ_НОВ_SERVICE_ROLE_KEY" node test_complete_workflow.mjs
```

**⚠️ ВАЖНО:** Използвай НОВИЯ service_role key който ти дадоха (не стария)!

### Очаквани резултати:

✅ Теста трябва да мине през:
- Стъпка 1: Insert в `users_pending` ✓
- Стъпка 2: Извикване на `registry_check` ✓
- Стъпка 3: Проверка на `user_registry_checks` ✓
- Стъпка 4: Проверка на `users_pending.status` ✓
- Стъпка 5: Проверка на `verified_owners` ✓

**Ако теста МИНЕ УСПЕШНО** → Премини към Стъпка 2  
**Ако теста ПАДНЕ** → Виж секцията "Debugging" по-долу

---

### Стъпка 2: Провери Database Permissions 🔐

Ако теста падне с грешка за permissions (напр. "new row violates row-level security policy"), изпълни:

```sql
-- Отвори Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/sql/new

-- Copy-paste съдържанието на HOSTINGER_FIXED_FILES/FIX_DATABASE_PERMISSIONS.sql
-- И натисни "Run"
```

След това тествай отново с `node test_complete_workflow.mjs`.

---

### Стъпка 3: Deploy на Hostinger (само след успешен backend тест!) 🌐

**ВАЖНО: Прави това САМО след като backend теста мине успешно!**

1. **Backup текущите файлове:**
   ```
   Hostinger File Manager → src/hooks/
   - Преименувай useRegistryCheck.js → useRegistryCheck.js.backup
   - Преименувай useChatLogic.js → useChatLogic.js.backup
   ```

2. **Quality новите файлове:**
   ```
   Upload към src/hooks/:
   - HOSTINGER_FIXED_FILES/useRegistryCheck.js
   - HOSTINGER_FIXED_FILES/useChatLogic.js
   ```

3. **Rebuild (ако е нужно):**
   ```bash
   npm run build
   # или
   yarn build
   ```

4. **Тествай реалния сайт:**
   - Отвори https://wallesters.com (или твоя домейн)
   - Отвори чата
   - Кликни "Създай профил"
   - Попълни тестови данни
   - Очаквай съобщение БЕЗ грешки

---

## 🔍 Debugging

### Ако теста падне на "Insert в users_pending":

**Причина:** Невалиден service_role key или RLS блокира

**Решение:**
1. Провери че използваш правилния НОВИ service_role key
2. Изпълни `FIX_DATABASE_PERMISSIONS.sql` в Supabase SQL Editor

---

### Ако теста мине но няма записи в verified_owners:

**Причина:** `users_pending_worker` не се е изпълнил или имаше грешка

**Решение:**
1. Провери Supabase Function Logs:
   ```
   https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/functions/registry_check/logs
   ```
2. Търси за имейла който тестваш
3. Виж дали имаше error при извикването на `users_pending_worker`

---

### Ако registry_check върне 0 matches:

**Причина:** Тестовото име няма регистрирани фирми в CompanyBook

**Решение:**
1. Използвай real Bulgarian name с companies:
   ```javascript
   // В test_complete_workflow.mjs промени на real име:
   { full_name: "Реално Име Фамилия", email: "test@test.bg" }
   ```
2. Or test with known business owner

---

### Ако frontend има "Unregistered API key" error:

**Причина:** НЕ си копирал новите файлове правилно

**Решение:**
1. Провери че файловете са качени в `src/hooks/`
2. Провери че файловете са правилно копирани (не са празни/корумпирани)
3. Clear browser cache и refresh
4. Rebuild проекта

---

## 📊 Как да проверя че всичко работи?

### Backend проверка:

```bash
# Пусни теста:
SUPABASE_SERVICE_ROLE_KEY="твоят_key" node test_complete_workflow.mjs

# Очаквай:
# ✅ Insert успешен
# ✅ registry_check отговор (match_count > 0)
# ✅ user_registry_checks запис намерен
# ✅ users_pending status updated
# ✅ verified_owners записи намерени
```

### Frontend проверка:

1. Отвори https://wallesters.com
2. Open Browser Console (F12)
3. Отвори чата → "Създай профил"
4. Попълни формата
5. **НЕ трябва** да видиш:
   - ❌ "Unregistered API key"
   - ❌ "Registry check failed"
   - ❌ "Invalid credentials"
6. **Трябва** да видиш:
   - ✅ "Перфектно! Вашите данни са запазени..."
   - ✅ Съобщение за следващи стъпки

### Database проверка:

```sql
-- В Supabase SQL Editor:

-- 1. Провери users_pending:
SELECT * FROM users_pending 
WHERE email = 'test@example.com' 
ORDER BY created_at DESC LIMIT 5;

-- 2. Провери user_registry_checks:
SELECT * FROM user_registry_checks 
WHERE email = 'test@example.com'
ORDER BY created_at DESC LIMIT 5;

-- 3. Провери verified_owners:
SELECT * FROM verified_owners 
WHERE email = 'test@example.com'
ORDER BY created_at DESC LIMIT 5;
```

---

## 🎉 Success Criteria

Workflow е успешен когато:

1. ✅ Backend тестът мине БЕЗ грешки
2. ✅ Данните се записват в `user_registry_checks`
3. ✅ Status в `users_pending` се обновява
4. ✅ Данните влизат в `verified_owners` (ако има matches)
5. ✅ Frontend работи БЕЗ грешки
6. ✅ Потребителите могат да се регистрират чрез чата

---

## 📞 Следващи действия:

1. **СЕГА:** Пусни теста с новия service_role key
2. **След успешен тест:** Deploy на Hostinger файловете
3. **След deploy:** Тествай реалния сайт
4. **След потвърждение:** Готов си! 🎉

---

**Създадено:** 06.12.2025  
**Версия:** 1.0  
**Status:** ✅ Ready for Testing
