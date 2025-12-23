# Verified Owners → n8n Integration & Improvements
## Deployment Guide
**Date:** 2025-12-19

## 📋 Обобщение на промените

Този deployment обновява системата за автоматизации около `verified_owners` таблицата с:
1. ✅ Почистване на дублирани n8n тригери
2. ✅ Подобрена логика за eligibility (EOOD, ET, OOD ≥50%)
3. ✅ Нов `waiting_list` формат с NKID, подобрени адреси и Wallester имена
4. ✅ Таблица `wallester_business_profiles` за проследяване на Wallester регистрации
5. ✅ n8n workflow за обработка на Supabase webhooks

---

## 🎯 Ключови подобрения

### 1. Eligibility Rules (в `registry_check`)
Сега компаниите са eligible за Wallester само ако:
- ✅ Тип: **EOOD** (100%), **ET** (едноличен търговец), или **OOD с ≥50% участие** на нашия owner
- ✅ Статус: **активни** (`status = 'N' или 'E'`)
- ✅ Име на английски: **официално** (не само транслитерация)

### 2. NKID Classification
Вместо дългия `subjectOfActivity` текст (хиляди символи), сега пазим:
- `nkid_code` – например "56.10"
- `nkid_description` – кратко описание като "Дейност на ресторанти и заведения за бързо обслужване"

### 3. Адресна логика (Street vs Block)
Новият `waiting_list` различава:
- **Street-based addresses**: `address_street` = "ul. Cherkovna 54"
- **Block-based addresses**: `address_block` = "92", `address_housing_estate` = "SUHA REKA", `address_street` = "Housing Estate SUHA REKA, Block 92, Entrance Б, Floor 1, Apt 2"

### 4. Wallester Business Names
Автоматично генериране на `business_name_wallester`:
- Ако името вече завършва на LTD/LLC/EOOD → оставяме го
- Ако е EOOD без суфикс → добавяме "SLLC"
- Примери:
  - "VERSAY 81 Ltd." → "VERSAY 81 Ltd." (без промяна)
  - "STANDART SELEKT 2023" (EOOD) → "STANDART SELEKT 2023 SLLC"

### 5. Ownership Tracking
Всяка компания вече пази `ownership_percent` (50-100%), което позволява:
- Коректно филтриране на OOD с малко участие
- Правилна приоритизация (EOOD → ET → OOD ≥50%)

---

## 📁 Файлове за deployment

### SQL Migrations (Supabase)
1. **`supabase/migrations/fix_verified_owners_triggers.sql`**
   - Маха стария SQL trigger `"n8n-trigger"` (за да няма двойни executions)
   - Оставя само Database Webhook `verified_owners_insert`

2. **`supabase/migrations/create_wallester_business_profiles.sql`**
   - Създава нова таблица за проследяване на Wallester профили
   - Предотвратява дублиращи регистрации
   - Пази статус и история за всеки бизнес

### Edge Functions (Supabase)
3. **`supabase/functions/registry_check/index.ts`**
   - Подобрена `extractVerifiedBusinesses()` – извлича `ownership_percent` и поддържа OOD ≥50%
   - Добавено NKID извличане (`nkid_code`, `nkid_description`)
   - По-точна eligibility логика

4. **`supabase/functions/users_pending_worker/index.ts`**
   - Нови helper функции: `makeWallesterName()`, `formatDetailedAddress()`
   - Подобрен `pickTopCompany()` (EOOD > ET > OOD приоритет)
   - Нов `waiting_list` формат с всички нови полета

### n8n Workflow
5. **`n8n_workflows/supabase_verified_owners_workflow.json`**
   - Webhook trigger
   - Function node за нормализиране на Supabase payload
   - IF node за различаване на INSERT vs UPDATE
   - Function node за разцепване на `waiting_list` на отделни items (по 1 компания)
   - Output summary за дебъг

---

## 🚀 Deployment Стъпки

### Стъпка 1: Deploy SQL Migrations
В Supabase SQL Editor (Production):

```sql
-- 1. Премахваме стария дублиран trigger
\i supabase/migrations/fix_verified_owners_triggers.sql

-- 2. Създаваме wallester_business_profiles таблица
\i supabase/migrations/create_wallester_business_profiles.sql
```

Или директно копирай съдържанието на файловете и го пусни в SQL Editor.

**Проверка:**
```sql
-- Трябва да има САМО Database Webhook, без SQL trigger
SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE event_object_table = 'verified_owners';

-- Трябва да види таблицата
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'wallester_business_profiles';
```

### Стъпка 2: Deploy Edge Functions
В Supabase Editor:

1. Отвори **Edge Functions → registry_check**
2. Замести с новия код от `supabase/functions/registry_check/index.ts`
3. Deploy

4. Отвори **Edge Functions → users_pending_worker**
5. Замести с новия код от `supabase/functions/users_pending_worker/index.ts`
6. Deploy

**Проверка:**
```bash
# Test registry_check
curl -X POST https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/registry_check \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Тестов Човек Тестов", "email": "test@example.com"}'
```

### Стъпка 3: Import n8n Workflow
На твоя Hostinger VPS n8n (`https://n8n.srv1201204.hstgr.cloud`):

1. В n8n → горе вдясно → **Import from file**
2. Качи `n8n_workflows/supabase_verified_owners_workflow.json`
3. Ще се появи workflow с 6 nodes:
   - Webhook
   - Normalize Payload
   - Is INSERT?
   - Explode Companies
   - Handle UPDATE
   - Output Summary
4. Провери, че Webhook node има същия path: `supabase-verified-owners`
5. Активирай workflow-а (Active = ON)

**Важно:** Ако вече имаш създаден стар "My workflow 2", можеш да:
- или го изтриеш и import-неш този нов;
- или ръчно добавиш останалите nodes към съществуващия.

### Стъпка 4: Провери Database Webhooks
В Supabase → **Database → Webhooks**:

Увери се, че имаш САМО:
- ✅ `verified_owners_insert` (Table: verified_owners, Events: INSERT + UPDATE, URL: `.../webhook/supabase-verified-owners`)

Ако има и стар webhook към `.../webhook/b90a1b29-...`, можеш да го изтриеш (или деактивираш).

---

## 🧪 Тестване

### Test 1: Ръчен INSERT в verified_owners
В Supabase Table Editor:
1. Добави нов ред в `verified_owners` (може да копираш съществуващ)
2. Отиди в n8n → **Executions**
3. Трябва да видиш ново изпълнение
4. Кликни го → провери:
   - Normalize Payload node показва `eventType: "INSERT"`
   - Explode Companies node показва отделни items за всяка компания от `waiting_list`
   - Output Summary показва `summary_business_wallester`, `summary_nkid` и т.н.

### Test 2: Автоматичен flow (през wallesters.com сайт)
1. Отиди на `wallesters.com` → започни нова регистрация
2. Попълни данни през chat assistant
3. Изчакай да се появи ред в `verified_owners` (може да отнеме 10-30 секунди)
4. Провери в n8n Executions дали има нов запис

### Test 3: Проверка на новия waiting_list формат
SQL в Supabase:
```sql
select full_name, 
       waiting_list->0->>'business_name_wallester' as wallester_name,
       waiting_list->0->>'nkid_code' as nkid,
       waiting_list->0->>'address_block' as block
from public.verified_owners
order by created_at desc
limit 3;
```

Очаквани резултати:
- `wallester_name` трябва да има " SLLC" за EOOD без суфикс
- `nkid` трябва да е код като "56.10"
- `block` ще е празен за street адреси, попълнен за block адреси

---

## 📊 Нов формат на `waiting_list`

### Стар формат (преди)
```json
{
  "EIK": "205521112",
  "VAT": "BG205521112",
  "business_name_en": "VERSAY 81 Ltd.",
  "street": "ul.Dvadeset i vtora 16",
  "address": "Bulgaria\nPazardzhik\n...",
  "subjectOfActivity": "ТЪРГОВИЯ С ВСЯКАКВИ СТОКИ... (1000+ символа)",
  "owner_first_name_en": "Asen",
  "owner_last_name_en": "Asenov"
}
```

### Нов формат (след deployment)
```json
{
  "EIK": "205521112",
  "VAT": "BG205521112",
  "business_name_en": "VERSAY 81 Ltd.",
  "business_name_wallester": "VERSAY 81 Ltd.",
  "entity_type": "EOOD",
  "ownership_percent": 100,
  
  "nkid_code": "56.10",
  "nkid_description": "Дейност на ресторанти...",
  
  "address_line": "Bulgaria\nPazardzhik\n...",
  "address_street": "ul.Dvadeset i vtora 16",
  "address_block": "",
  "address_housing_estate": "",
  "address_city": "s. Govedare",
  "address_postcode": "4453",
  
  "last_updated": "14.02.2019",
  "owner_first_name_en": "Asen",
  "owner_last_name_en": "Asenov",
  "owner_birthdate": "12.12.1992"
}
```

---

## 🔄 n8n Workflow Архитектура

```
Supabase Webhook (INSERT/UPDATE)
    ↓
Normalize Payload
  • Взима body.record и го слага на root ниво
  • Добавя eventType, table, schema, old
    ↓
Is INSERT? (IF node)
    ├─ TRUE → Explode Companies
    │   • Разцепва waiting_list на отделни items
    │   • Всеки item = 1 компания с всички полета
    │   ↓
    │   Output Summary
    │     • За дебъг/визуализация
    │     • След това можеш да добавиш Wallester nodes
    │
    └─ FALSE → Handle UPDATE
        • За момента само log
        • По-късно можеш да добавиш логика за specific updates
```

---

## 💡 Следващи стъпки (след deployment)

### 1. Премахване на излишни колони от `verified_owners`
След като потвърдиш, че новата система работи добре, можеш да махнеш старите allocation колони:

```sql
ALTER TABLE public.verified_owners
  DROP COLUMN IF EXISTS top_company,
  DROP COLUMN IF EXISTS allocated_phone_number,
  DROP COLUMN IF EXISTS allocated_sms_number_url,
  DROP COLUMN IF EXISTS allocated_sms_country_code,
  DROP COLUMN IF EXISTS email_alias_33mail,
  DROP COLUMN IF EXISTS email_alias_hostinger,
  DROP COLUMN IF EXISTS email_forwarding_active;
```

Тези данни вече ще живеят в:
- `wallester_business_profiles` (per-business данни)
- или в отделна `automation_allocations` таблица (per-owner ресурси)

### 2. Увеличаване на company limit (по желание)
Ако искаш да пазиш повече от 5 компании в `verified_owners.companies`:

```sql
-- Премахваме или увеличаваме check constraint
ALTER TABLE public.verified_owners 
  DROP CONSTRAINT IF EXISTS check_companies_length_max_5;

-- Ако искаш нов лимит (напр. 10)
ALTER TABLE public.verified_owners
  ADD CONSTRAINT check_companies_length_max_10 
  CHECK (jsonb_array_length(companies) <= 10);
```

### 3. Wallester Automation Workflow (следващ етап)
След "Output Summary" node в n8n, можеш да добавиш:
1. **Supabase node** → проверка дали EIK вече е в `wallester_business_profiles`
2. **IF node** → ако не е → продължаваме
3. **HTTP Request / Airtop Browser Agent** → Wallester регистрация
4. **Supabase node** → записване в `wallester_business_profiles` с `status = 'created/pending'`
5. **Telegram / Slack** → нотификация

---

## 📝 Нова структура на данни

### `user_registry_checks.companies` (RAW)
- Пълен списък от всички намерени компании (може 10-25)
- Съдържа `ownership_percent`, `nkid_code`, `nkid_description`, пълни `details`

### `verified_owners.companies` (max 5)
- Първите 5 eligible компании (compatibility със старите RPC функции)

### `verified_owners.waiting_list` (max 5)
- Структуриран JSON масив с всички нужни полета за Wallester
- Използва се в n8n за разцепване на companies

### `wallester_business_profiles` (tracking)
- Един ред per EIK когато регистрираме в Wallester
- Пази статус, errors, execution IDs
- Предотвратява дублиращи регистрации

---

## 🔐 Security Notes

### OpenAI API Key
⚠️ **ВАЖНО:** Ако все още ползваш стария OpenAI ключ, който бе споделен в чата, създай нов:
1. https://platform.openai.com → API keys
2. Create new key
3. Обнови във всички credentials (n8n cloud, n8n VPS, Airtop)
4. Revoke старият ключ

### Supabase Service Role Key
В edge functions има hardcoded service_role key. След deployment обнови environment variables:
```bash
# В Supabase → Project Settings → Edge Functions → Environment Variables
SUPABASE_SERVICE_ROLE_KEY=твоят_нов_ключ
```

---

## 🐛 Troubleshooting

### Webhook не се trigger-ва при INSERT
1. Провери Database Webhooks в Supabase → трябва да е Active
2. Провери n8n workflow → трябва да е Active = ON
3. Провери Webhook URL → трябва да е production URL (без `-test`)

### Двойни executions
След deployment на `fix_verified_owners_triggers.sql` това трябва да спре.
Ако все още виждаш двойни:
- Провери дали имаш 2 webhooks в Supabase → Database → Webhooks
- Провери с SQL:
  ```sql
  SELECT * FROM pg_trigger WHERE tgrelid = 'public.verified_owners'::regclass;
  ```

### `waiting_list` е празен
- Проверка на `user_registry_checks.companies` за същия email → има ли eligible компании?
- Проверка на logs на `users_pending_worker` → има ли грешки?

### NKID липсва (null)
- Не всички компании в CompanyBook API имат `nkids` поле
- Това е ОК – можеш да оставиш `nkid_code` и `nkid_description` като `null`
- В n8n просто провери преди употреба: `{{ $json.nkid_code || 'N/A' }}`

---

## 📈 Метрики и мониторинг

След deployment можеш да следиш:

```sql
-- Eligible компании per owner
SELECT full_name, 
       jsonb_array_length(waiting_list) as companies_ready,
       jsonb_array_length(companies) as companies_total
FROM public.verified_owners
ORDER BY created_at DESC
LIMIT 10;

-- Wallester статуси
SELECT wallester_status, count(*) 
FROM public.wallester_business_profiles
GROUP BY wallester_status;

-- n8n executions (via n8n UI)
-- Executions → filter по workflow "Supabase Verified Owners → n8n"
```

---

## 🎉 Готово!

След deployment на всички компоненти, системата ще:
1. ✅ Приема нови verified owners от wallesters.com сайт
2. ✅ Trigger-ва n8n автоматично (без дублиращи executions)
3. ✅ Разцепва компаниите на отделни items в n8n
4. ✅ Има всички нужни данни (NKID, адреси, Wallester имена, ownership %)
5. ✅ Готова за интеграция с Wallester registration flow

---

**За въпроси и support:**
- Supabase logs: Edge Functions → Function → Logs
- n8n logs: Workflow → Executions → кликни execution → виж всеки node
- GitHub commit за тези промени: ще бъде създаден след финален commit
