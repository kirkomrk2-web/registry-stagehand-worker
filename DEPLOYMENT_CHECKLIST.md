# Deployment Checklist – Wallester n8n System
**Date:** 2025-12-19

## ✅ Какво да deploy-неш

### SQL Migrations (Supabase SQL Editor)
- [x] `fix_verified_owners_triggers.sql` – ВЕЧЕ DEPLOY-НАТ ✅
- [x] `create_wallester_business_profiles.sql` – ВЕЧЕ DEPLOY-НАТ ✅
- [ ] `create_sms_numbers_pool.sql` – **ОБНОВЕН (fix-нат за колона platform)** → пусни ОТНОВО

**Как:**
```sql
-- Copy-paste съдържанието от обновения create_sms_numbers_pool.sql
-- Той вече има ALTER TABLE ADD COLUMN IF NOT EXISTS
-- Ще работи дори таблицата да съществува
```

**Не е проблем** да пуснеш SQL migration няколко пъти – те имат защита с `IF EXISTS` / `IF NOT EXISTS`.

---

### Edge Functions (Supabase)
**ДА, трябва да re-deploy И ДВЕТЕ**, защото имат критични промени:

#### 1. registry_check → RE-DEPLOY ✅
**Нови неща:**
- `ownership_percent` извличане за OOD
- `nkid_code` и `nkid_description` от company.nkids[0]
- Подобрена eligibility логика (EOOD/ET/OOD ≥50%)

**Как:**
1. Supabase → Edge Functions → `registry_check`
2. Copy-paste кода от `supabase/functions/registry_check/index.ts`
3. Deploy

#### 2. users_pending_worker → RE-DEPLOY ✅
**Нови неща:**
- `makeWallesterName()` функция (добавя SLLC за EOOD)
- `formatDetailedAddress()` за street vs block
- Обновен `pickTopCompany()` (EOOD > ET > OOD приоритет)
- Нов waiting_list формат с всички полета

**Как:**
1. Supabase → Edge Functions → `users_pending_worker`
2. Copy-paste кода от `supabase/functions/users_pending_worker/index.ts`
3. Deploy

---

### n8n Workflows (VPS)
Трябва да import-неш само **НОВИТЕ 2**:

- [ ] `phone_sms_workflow.json` – НОВ workflow
- [ ] `email_verification_workflow.json` – НОВ workflow
- [x] `supabase_verified_owners_workflow.json` – **ВЕЧЕ IMPORT-НАТ И ТЕСТВАН** ✅

**Main workflow вече работи** (видяхме в тестовете), не е нужно да го импортваш отново освен ако не искаш да го презапишеш с по-новата версия.

**Как:**
1. n8n VPS → Import from file
2. Избери `phone_sms_workflow.json` → Import
3. Save → Active = ON
4. Повтори за `email_verification_workflow.json`

---

## 🔄 Какво е deploy-нато вече vs какво остава

### ✅ Вече deploy-нато (от по-рано)
- Първите 2 SQL migrations (triggers, wallester_business_profiles)
- Main n8n workflow (supabase_verified_owners_workflow.json)

### 🔄 Трябва да deploy-неш СЕГА
1. **SQL:** Обновения `create_sms_numbers_pool.sql` (fix-нат за platform колона)
2. **Edge Functions:** И двете (`registry_check` + `users_pending_worker`) – имат критични промени
3. **n8n:** Phone и Email workflows (нови)

### 📝 Защо е важно да re-deploy-неш edge functions
Без тези промени:
- `waiting_list` няма да има `nkid_code`, `nkid_description`
- `waiting_list` няма да има `business_name_wallester` (с SLLC)
- `waiting_list` няма да има правилните `address_block` / `address_housing_estate` полета
- `ownership_percent` няма да се записва

Т.е. Phone и Email workflows ще работят, но Main workflow няма да има правилните данни за Wallester.

---

## 📋 Deployment Order (препоръчителен)

```
1. SQL → create_sms_numbers_pool.sql (обновен)
   ↓
2. Edge Functions → registry_check (обновен)
   ↓
3. Edge Functions → users_pending_worker (обновен)
   ↓
4. n8n → Import phone_sms_workflow.json
   ↓
5. n8n → Import email_verification_workflow.json
   ↓
6. Test: Добави нов user в wallesters.com → провери в n8n дали waiting_list има новите полета
```

---

## 🧪 Test след deployment

### 1. Провери waiting_list формат
```sql
SELECT 
  full_name,
  waiting_list->0->>'business_name_wallester' as wallester_name,
  waiting_list->0->>'nkid_code' as nkid,
  waiting_list->0->>'ownership_percent' as ownership,
  waiting_list->0->>'address_block' as block
FROM public.verified_owners
ORDER BY created_at DESC
LIMIT 1;
```

Трябва да видиш:
- `wallester_name` с " SLLC" ако е EOOD
- `nkid` като "56.10" (или null)
- `ownership` като "100"
- `block` попълнен за block адреси, празен за street

### 2. Провери n8n Executions
- Отвори Main workflow → Executions
- Последното execution → Explode Companies → Output
- Трябва да виждаш всички нови полета в items-ите

---

## ⚠️ Важно

### Не се притеснявай за повторни deployments
- SQL migrations са **idempotent** (безопасни за повторно пускане)
- Edge functions просто презаписват старата версия
- n8n workflows може да import-ваш колкото пъти искаш

### RLS Warnings (може да ги игнорираш)
Supabase AI Assistant показва warnings за RLS на някои таблици – това е ОК:
- Таблиците са `public` но с RLS enabled
- `service_role` има пълен достъп
- `authenticated` users имат read достъп
- Това е правилната security настройка за твоя случай

---

## 🎉 След deployment

Системата ще е готова за:
1. Автоматично приемане на нови verified owners
2. Разцепване на 5 компании в n8n
3. Allocation на SMS номера
4. Генериране на email aliases
5. Scraping на verification codes
6. **(следващ етап)** Пълна Wallester регистрация с Airtop

---

**Къде сме сега:** 90% готови.  
**Какво остава:** Само да add-неш Wallester Airtop logic в Main workflow (след като Phone/Email са готови и тествани).
