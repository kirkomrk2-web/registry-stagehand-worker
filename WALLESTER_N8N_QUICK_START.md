# Wallester + n8n VPS – Quick Start Guide
**Date:** 2025-12-19

## 🎯 Какво имаме сега

Пълна **multi-workflow автоматизация** за Wallester бизнес регистрации, работеща на твоя **Hostinger n8n VPS**.

### Архитектура (4 workflows)
```
1. MAIN: Supabase Verified Owners → n8n
   ↓ Приема нови verified owners
   ↓ Разцепва waiting_list на 5 компании
   ↓ За всяка компания:
      ├─ Проверява дали вече е регистрирана
      └─ Ако не е → стартира регистрация:
           ├─ Phone Workflow → SMS номер + код
           ├─ Email Workflow → alias + код
           └─ Wallester Registration (Airtop)

2. Phone - SMS Allocation & Scraping
   → Взима номер от sms_numbers_pool
   → Scrape-ва SMS код от smstome.com

3. Email - Alias Creation & Code Scraping
   → Генерира alias @workmail.pro
   → Scrape-ва email код от Hostinger webmail

4. Wallester Registration (ще бъде добавен)
   → Airtop agent попълва multi-step форма
```

---

## 📦 Какво е създадено

### SQL Migrations (Supabase)
- `supabase/migrations/fix_verified_owners_triggers.sql` – премахва дублиращи тригери
- `supabase/migrations/create_wallester_business_profiles.sql` – tracking на Wallester профили
- `supabase/migrations/create_sms_numbers_pool.sql` – pool от SMS номера

### Edge Functions (Supabase) – обновени
- `supabase/functions/registry_check/index.ts` – NKID, ownership %, OOD ≥50%
- `supabase/functions/users_pending_worker/index.ts` – нов waiting_list формат

### n8n Workflows (ready for import)
- `n8n_workflows/supabase_verified_owners_workflow.json` – MAIN workflow
- `n8n_workflows/phone_sms_workflow.json` – Phone + SMS scraping
- `n8n_workflows/email_verification_workflow.json` – Email + code scraping

### Документация
- `VERIFIED_OWNERS_N8N_DEPLOYMENT.md` – deployment инструкции
- `WALLESTER_AUTOMATION_ARCHITECTURE.md` – пълна архитектура
- `WALLESTER_N8N_QUICK_START.md` – този файл

---

## 🚀 Deployment в 5 стъпки

### 1. Deploy SQL (Supabase)
Копирай и пусни в Supabase SQL Editor:
```sql
-- Migrations
\i supabase/migrations/fix_verified_owners_triggers.sql
\i supabase/migrations/create_wallester_business_profiles.sql
\i supabase/migrations/create_sms_numbers_pool.sql
```

### 2. Deploy Edge Functions (Supabase)
- Edge Functions → `registry_check` → Deploy нова версия
- Edge Functions → `users_pending_worker` → Deploy нова версия

### 3. Добави SMS номера (Supabase)
```sql
INSERT INTO public.sms_numbers_pool 
  (phone_number, country_code, country, platform, sms_url, status)
VALUES 
  ('+447481793989', '+44', 'UK', 'smstome', 
   'http://smstome.com/united-kingdom/phone/447481793989/sms/13384', 
   'available');
-- Добави още номера по същия формат
```

### 4. Import n8n Workflows (VPS)
В `https://n8n.srv1201204.hstgr.cloud`:
1. Import → `supabase_verified_owners_workflow.json` → Save → Active ON
2. Import → `phone_sms_workflow.json` → Save → Active ON  
3. Import → `email_verification_workflow.json` → Save → Active ON

### 5. Настрой Airtop Profiles
Увери се, че имаш Airtop profiles:
- `smstome` – с login kirkomrk@gmail.com / zdraveibobi12
- `mail-hostinger` – с login за support@33mailbox.com
- `wallester` – (ще се създаде при първа употреба или ръчно)

---

## ✅ Проверка че работи

### Test Phone Workflow
```bash
curl -X POST https://n8n.srv1201204.hstgr.cloud/webhook/phone-sms-scraper \
  -H "Content-Type: application/json" \
  -d '{"owner_id": "test-uuid", "eik": "12345"}'
```

Очакван резултат (след ~30-60 сек):
```json
{
  "phone_number": "+447481793989",
  "sms_url": "http://smstome.com/...",
  "sms_code": "123456",
  "status": "success"
}
```

### Test Email Workflow
```bash
curl -X POST https://n8n.srv1201204.hstgr.cloud/webhook/email-verification-scraper \
  -H "Content-Type: application/json" \
  -d '{"owner_id": "test-uuid", "eik": "12345", "business_name_en": "Test Company"}'
```

Очакван резултат:
```json
{
  "email_alias": "testcompany123@workmail.pro",
  "email_code": "654321",
  "status": "success"
}
```

### Test Main Workflow
Просто добави нов ред в `verified_owners` (Table Editor) → провери n8n Executions.

---

## 📋 Какво следва (в бъдеще)

### Immediate Next Steps
1. **Допълни Main Workflow** с:
   - Execute Workflow nodes за Phone/Email
   - Airtop nodes за Wallester регистрация (multi-step form)
   - Supabase INSERT в wallester_business_profiles

2. **Тествай end-to-end** с един реален signup през wallesters.com

3. **Монитори errors** в n8n Executions и Supabase logs

### По-късно
- Добави Telegram/Slack нотификации
- Dashboard за проследяване на Wallester статуси
- Automatic retry логика при fail
- "Next batch" функция за owners с >5 eligible компании

---

## 🔧 Настройки

### 33mail.com Setup (еднократно)
1. Login в 33mail.com
2. Добави домейн `workmail.pro`
3. Forwarding адрес → `support@33mailbox.com` (Hostinger mail)
4. От този момент всяко използване на `*@workmail.pro` автоматично създава alias и forward-ва към support@33mailbox.com

### Hostinger VPS (n8n)
- URL: https://n8n.srv1201204.hstgr.cloud
- SSH: `ssh root@72.61.154.188`
- Credentials вече са setup-нати (Supabase, Airtop)

### Supabase Project
- URL: https://ansiaiuaygcfztabtknl.supabase.co
- Webhooks активни за `verified_owners` към n8n VPS

---

## 💡 Key Concepts

### Waiting List Format (нов)
Вместо дълги `subjectOfActivity` текстове, сега имаме:
- `nkid_code` + `nkid_description` (кратко, структурирано)
- Отделни адресни полета (street vs block)
- `business_name_wallester` (с SLLC за EOOD)
- `ownership_percent` (за OOD filtering)

### Multi-Step Wallester Form
```
Page 1: Country + Business Name + Phone
   ↓ Submit → SMS изпратен
Page 2: SMS Code
   ↓ Verify → Email форма
Page 3: Email Address
   ↓ Submit → Email изпратен
Page 4: Email Code
   ↓ Verify → Business Details Form
Page 5: Full Business Information (EIK, address, owner, NKID...)
   ↓ Submit → Registration Complete
```

### Loop Strategy
Phone и Email workflows ползват **polling loops**:
- Проверяват на всеки 8-10 секунди
- Max 12-15 iterations (~2 минути общо)
- Ако code не е намерен → timeout error

---

## 🎓 Как да добавиш Wallester registration в Main Workflow

След "Output Summary" node добави:

```
1. HTTP Request → Phone Workflow
   POST /webhook/phone-sms-scraper
   Body: { owner_id, eik, business_name }
   
2. HTTP Request → Email Workflow
   POST /webhook/email-verification-scraper
   Body: { owner_id, eik, business_name_en }
   
3. Airtop Browser Agent → Page 1
   "Navigate to Wallester referral link
    Fill: Country=Bulgaria, Business={{ business_name_wallester }}, Phone={{ phone_number }}
    Click Submit"
   
4. Airtop Browser Agent → Page 2
   "Enter SMS code: {{ sms_code }}"
   
5. Airtop Browser Agent → Page 3
   "Enter email: {{ email_alias }}"
   
6. Airtop Browser Agent → Page 4
   "Enter email code: {{ email_code }}"
   
7. Airtop Browser Agent → Page 5
   "Fill all business details:
    EIK={{ eik }}, VAT={{ vat }},
    Address={{ address_line }}, Street={{ address_street }}, Block={{ address_block }},
    Owner={{ owner_first_name_en }} {{ owner_last_name_en }}, Birthdate={{ owner_birthdate }},
    NKID={{ nkid_code }}, Activity={{ nkid_description }}
    Submit registration"
   
8. Supabase INSERT → wallester_business_profiles
   Save account_id, status='created', execution_id
```

---

## 📞 Support

За въпроси относно deployment:
- Провери `VERIFIED_OWNERS_N8N_DEPLOYMENT.md`
- Провери `WALLESTER_AUTOMATION_ARCHITECTURE.md`
- n8n Executions logs
- Supabase Edge Function logs

**Версия:** 1.0 (2025-12-19)
