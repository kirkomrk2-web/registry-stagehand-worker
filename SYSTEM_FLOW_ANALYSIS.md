# 🔍 ПЪЛЕН АНАЛИЗ НА СИСТЕМНИЯ ПРОЦЕС

## 📊 ОЧАКВАН ПРОЦЕС (Какво ТРЯБВА да се случва)

### Стъпка 1: User влиза на сайта
- User отваря wallesters.com
- Chat agent го пита за **3 имена + дата на раждане**
- User въвежда: "Даниел Миленов Мартинов", "15.03.1985"

### Стъпка 2: Запис в Supabase
- Данните се записват в таблица `users_pending` със status="pending"
- Полета: `full_name`, `email`, `birth_date`, `status="pending"`

### Стъпка 3: Автоматична обработка (TRIGGER)
- Database trigger или webhook **автоматично извиква** Edge Function `users_pending_worker`
- Функцията получава новия запис

### Стъпка 4: CompanyBook проверка
1. **Търси човека по 3те имена** в CompanyBook API
2. **Намира компании** където е `SoleCapitalOwner` (100% собственик)
3. За **ВСЯКА компания** прави **втора проверка по EIK** за:
   - Наличие на **английско име** (`companyNameTransliteration`)
   - **Статус на фирмата** (активна: status='N' или 'E')
   - **Правна форма** (ЕООД или ЕТ)

### Стъпка 5: Филтриране на резултати
- Взима **до 5 компании** които отговарят на условията:
  ✅ Има английско име
  ✅ Статус активен (N/E)
  ✅ ЕООД или ЕТ
  ✅ User е 100% собственик

### Стъпка 6: Запис в `verified_owners`
- Създава/обновява запис в `verified_owners` с:
  - `full_name`
  - `owner_birthdate`
  - `companies` (JSON масив с намерени компании)
  - `companies_slim` (филтрирани до 5 валидни)
  - `top_company` (най-добрата компания)

### Стъпка 7: Запис в `user_registry_checks` ⚠️ **ЛИПСВА!**
**ТОВА ТРЯБВА ДА СЕ СЛУЧВА, НО НЕ СЕ СЛУЧВА:**
- Записва резултата от проверката в `user_registry_checks`
- Полета:
  - `email` (от users_pending)
  - `full_name` 
  - `match_count` = брой на валидните компании (до 5)
  - `any_match` = TRUE ако има поне 1 валидна, иначе FALSE
  - `companies` = JSON с валидните компании
  - `status` = "completed"

### Стъпка 8: Обновяване на `users_pending`
- Обновява статус според резултата:
  - `status="ready_for_stagehand"` ако има валидни резултати
  - `status="no_match"` ако няма намерени компании
  - `status="error"` при грешка

---

## ⚙️ ТЕКУЩО СЪСТОЯНИЕ (Какво СЕ СЛУЧВА наистина)

### ✅ Работи:
1. **Запис в `users_pending`** - данните влизат правилно от chat agent
2. **`users_pending_worker` функция** - deployed и функционална
3. **CompanyBook интеграция** - проверката по 3 имена работи
4. **EIK deep check** - втора проверка за английско име работи
5. **Филтриране** - `buildCompaniesSlim()` правилно филтрира
6. **Запис в `verified_owners`** - данните се записват

### ❌ НЕ Работи:

#### 1. **ЛИПСВА АВТОМАТИЧНО ИЗВИКВАНЕ**
**Проблем:** Няма database trigger или webhook на `users_pending` INSERT
- ❌ Когато се добави нов user в `users_pending`, **НИКОЙ не извиква** `users_pending_worker`
- ✅ Функцията работи САМО ако я извикаш ръчно

**Решение:** Трябва да се създаде Supabase webhook:
```sql
-- Database trigger option 1: Supabase webhook
-- Via Supabase Dashboard: Database > Webhooks > Create Webhook
-- Trigger: INSERT on users_pending
-- URL: https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker
```

#### 2. **ЛИПСВА ЗАПИС В `user_registry_checks`**
**Проблем:** `users_pending_worker` НЕ ЗАПИСВА в `user_registry_checks`

Погледни кода на `users_pending_worker/index.ts`:
- ✅ Записва в `verified_owners` (ред ~200-250)
- ✅ Обновява `users_pending` статус (ред ~260)
- ❌ **НИКЪДЕ НЕ ЗАПИСВА** в `user_registry_checks`!

**Резултат:** Таблицата `user_registry_checks` остава празна или с неправилни данни:
```
match_count = 0 ❌ (трябва да е 2 за Даниел)
any_match = FALSE ❌ (трябва да е TRUE)
companies = [] ❌ (трябва да има 2 компании)
```

**Решение:** Трябва да добавим логика в `users_pending_worker` която:
```typescript
// След създаване на verified_owners запис:
await supabase.from("user_registry_checks").upsert({
  email: email,
  full_name: fullNameKey,
  match_count: companies_slim.length,
  any_match: companies_slim.length > 0,
  companies: companies_slim,
  status: companies_slim.length > 0 ? "completed" : "no_match",
  checked_at: new Date().toISOString()
});
```

#### 3. **STATUS UPDATES НЕ СА ПРАВИЛНИ**
**Проблем:** `users_pending` статус не отразява правилно резултата

От снимката вижда се че за "Даниел Миленов Мартинов":
- Има множество записи в `user_registry_checks`
- Всички показват match_count=0, any_match=FALSE
- Но знаем че има 2 валидни компании!

**Възможни причини:**
1. Worker-ът не е бил извикан автоматично
2. Worker-ът е имал грешка при извикване (CompanyBook API timeout)
3. Данните не са били записани поради липсата на логика за `user_registry_checks`

---

## 🔧 КАКВО ТРЯБВА ДА СЕ ОПРАВИ (Action Plan)

### Priority 1: ДОБАВИ WEBHOOK/TRIGGER
**Да се извиква `users_pending_worker` автоматично при INSERT**

**Опция A: Database Trigger (по-сложно, но по-сигурно)**
```sql
CREATE OR REPLACE FUNCTION trigger_users_pending_worker()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM http_post(
    'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker',
    json_build_object('row', row_to_json(NEW))::text,
    'application/json'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_users_pending_insert
  AFTER INSERT ON users_pending
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION trigger_users_pending_worker();
```

**Опция B: Supabase Webhook (по-лесно, препоръчвам)**
1. Отиди в Supabase Dashboard
2. Database > Webhooks > Create Webhook
3. Config:
   - **Table:** users_pending
   - **Events:** INSERT
   - **Type:** HTTP Request
   - **Method:** POST
   - **URL:** `https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker`
   - **Headers:** `{"Content-Type": "application/json"}`

### Priority 2: ДОБАВИ ЗАПИС В `user_registry_checks`
**Модифицирай `users_pending_worker/index.ts`**

Добави след ред ~250 (след verified_owners update):

```typescript
// 7.5) Write to user_registry_checks table
const { error: registryCheckErr } = await supabase
  .from("user_registry_checks")
  .upsert({
    email: email,
    full_name: fullNameKey,
    match_count: companies_slim.length,
    any_match: companies_slim.length > 0,
    companies: companies_slim,
    status: companies_slim.length > 0 ? "completed" : "no_match",
    checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'email' // Update if exists
  });

if (registryCheckErr) {
  console.error("Failed to write to user_registry_checks:", registryCheckErr);
  // Don't throw - continue with process
}
```

### Priority 3: ПОДОБРИ STATUS LOGIC
**Правилен статус според резултата:**

```typescript
// Determine final status
let finalStatus = "no_match";
if (companies_slim.length > 0) {
  finalStatus = "ready_for_stagehand";
} else if (companies.length > 0 && companies_slim.length === 0) {
  // Found companies but none match criteria (no english name, inactive, etc)
  finalStatus = "no_valid_match";
}

// Update users_pending
await supabase
  .from("users_pending")
  .update({ 
    status: finalStatus, 
    updated_at: new Date().toISOString() 
  })
  .eq("email", email);
```

---

## 📋 ТЕСТВАНЕ СЛЕД ФИКС

### Тест 1: Даниел Миленов Мартинов (2 валидни компании)
**Очакван резултат:**
- `users_pending.status` = "ready_for_stagehand" ✅
- `user_registry_checks.match_count` = 2 ✅
- `user_registry_checks.any_match` = TRUE ✅
- `user_registry_checks.companies` = [компания1, компания2] ✅
- `verified_owners` = запис със 2 companies_slim ✅

### Тест 2: Иван Петров Георгиев (1 валидна компания)
**Очакван резултат:**
- `users_pending.status` = "ready_for_stagehand" ✅
- `user_registry_checks.match_count` = 1 ✅
- `user_registry_checks.any_match` = TRUE ✅

### Тест 3: Мария Иванова Стоянова (0 компании)
**Очакван резултат:**
- `users_pending.status` = "no_match" ✅
- `user_registry_checks.match_count` = 0 ✅
- `user_registry_checks.any_match` = FALSE ✅

---

## 🎯 СЛЕДВАЩИ СТЪПКИ (ИЗВЪРШИ СЕГА)

### 1. Провери дали има webhook (2 min)
```bash
# Via Supabase Dashboard
# Go to: Database > Webhooks
# Should see webhook for users_pending INSERT event
```

### 2. Модифицирай users_pending_worker (10 min)
- Добави логика за запис в `user_registry_checks`
- Подобри status updates
- Redeploy функцията

### 3. Тествай с Даниел (5 min)
```bash
# 1. Delete old records
DELETE FROM users_pending WHERE full_name = 'Даниел Миленов Мартинов';
DELETE FROM user_registry_checks WHERE full_name = 'Даниел Миленов Мартинов';

# 2. Insert new test record
INSERT INTO users_pending (full_name, email, birth_date, status) 
VALUES ('Даниел Миленов Мартинов', 'daniel.test@example.com', '1985-03-15', 'pending');

# 3. Check results after 5 seconds
SELECT * FROM user_registry_checks WHERE full_name = 'Даниел Миленов Мартинов';
SELECT * FROM verified_owners WHERE full_name = 'Даниел Миленов Мартинов';
```

### 4. Провери резултатите
- `match_count` трябва да е 2
- `any_match` трябва да е TRUE
- `companies` масив трябва да има 2 елемента с английски имена
- `users_pending.status` трябва да е "ready_for_stagehand"

---

## 📞 РЕЗЮМЕ НА ПРОБЛЕМИТЕ

| # | Проблем | Impact | Priority | Status |
|---|---------|--------|----------|--------|
| 1 | Липсва автоматично извикване на worker | 🔴 HIGH | P1 | ❌ NOT FIXED |
| 2 | Не записва в user_registry_checks | 🔴 HIGH | P1 | ❌ NOT FIXED |
| 3 | Status updates неправилни | 🟡 MEDIUM | P2 | ❌ NOT FIXED |
| 4 | CompanyBook API може да timeout | 🟡 MEDIUM | P3 | ⚠️ NEEDS MONITORING |

---

**Дата:** 6 Декември 2025, 17:41  
**Автор:** Cline AI Assistant  
**Next Action:** Създай webhook + Модифицирай users_pending_worker
