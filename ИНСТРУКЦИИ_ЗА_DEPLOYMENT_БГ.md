# Wallester n8n Workflows - Инструкции за Deployment (БГ)

## 📋 Какво сме създали

Създадени са 3 автоматични workflow-та за Wallester регистрация:

1. **SMS OTP Scraper** - Взима SMS кодове от smsto.me
2. **Email OTP Scraper** - Взима email кодове от workmail.pro  
3. **Wallester Combined Automation** - Главният workflow, който управлява всичко

## 🚀 СТЪПКА 1: Влез в n8n

1. Отвори: https://n8n.srv1201204.hstgr.cloud
2. Влез с:
   - Email: miropetrovski12@gmail.com
   - Password: MagicBoyy24#

## 📥 СТЪПКА 2: Импортирай Sub-Workflows

### 2.1 Импортирай SMS OTP Scraper

1. В n8n кликни горе вдясно: **"Add workflow"**
2. Избери: **"Import from File"**
3. Избери файла: `n8n_workflows/sms_otp_scraper_subflow.json`
4. След като се импортира:
   - Кликни на node "Scrape SMS OTP"
   - В дясното меню намери "Credentials"
   - Избери вече създадения "Airtop account" credential
   - Ако няма такъв, създай го (виж СТЪПКА 3)
5. **ВАЖНО**: Копирай Workflow ID!
   - Горе в URL адреса ще видиш нещо като: `/workflow/ABC123XYZ`
   - Копирай `ABC123XYZ` - това е твоят SMS Scraper Workflow ID
   - Запази го някъде (ще ти трябва по-късно)
6. **НЕ го активирай** - остави го неактивен
7. Кликни **Save**

### 2.2 Импортирай Email OTP Scraper

1. Кликни **"Add workflow"** → **"Import from File"**
2. Избери: `n8n_workflows/email_otp_scraper_subflow.json`
3. След импортиране:
   - Кликни на node "Scrape Email OTP"
   - Актуализирай Airtop credential
4. **ВАЖНО**: Копирай Workflow ID от URL
   - Запази го като "Email Scraper Workflow ID"
5. **НЕ го активирай**
6. Кликни **Save**

## 🔑 СТЪПКА 3: Създай Credentials (Ако нямаш)

### 3.1 Supabase API Credential

1. Отиди на: https://n8n.srv1201204.hstgr.cloud/credentials
2. Кликни: **"Add credential"**
3. Търси: "Supabase"
4. Попълни:
   - **Name**: `Supabase API`
   - **Host**: `https://ansiaiuaygcfztabtknl.supabase.co`
   - **Service Role Secret**: 
     - Отвори Supabase: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl
     - Влез: madoff1312@outlook.com / MagicBoyy24#
     - Отиди на: Settings → API → Service Role Key (secret)
     - Копирай ключа и го постави тук
5. Кликни **Save**

### 3.2 Airtop API Credential

1. В n8n credentials, кликни: **"Add credential"**
2. Търси: "Airtop"
3. Попълни:
   - **Name**: `Airtop account`
   - **API Key**: Твоят Airtop API ключ от Airtop dashboard
4. Кликни **Save**

### 3.3 Google Sheets OAuth2 Credential

1. В n8n credentials, кликни: **"Add credential"**
2. Търси: "Google Sheets"
3. Избери: "OAuth2"
4. Попълни:
   - **Name**: `Google Sheets OAuth2`
5. Кликни на бутона за OAuth2 authentication
6. Влез в твоя Google акаунт
7. Разреши достъп до Google Sheets
8. Кликни **Save**

### 3.4 Създай Airtop Profiles

**ВАЖНО**: Трябва да създадеш 3 профила в Airtop dashboard:

1. **Влез в Airtop**: https://app.airtop.ai (или твоят Airtop URL)

2. **Създай Profile: "smstome"**
   - Purpose: За логване в smsto.me
   - Credentials: kirkomrk@gmail.com / zdraveibobi12
   
3. **Създай Profile: "workmail"**
   - Purpose: За достъп до workmail.pro
   
4. **Създай Profile: "wallester"**
   - Purpose: За Wallester автоматизация
   - Може да остане празен (без login credentials)

## 📊 СТЪПКА 4: Подготви Google Sheet

1. Отвори: https://docs.google.com/spreadsheets/d/1xjBUp2i5PGb4L6WSkBHN8sG8qp5EUp3oxssuX6XE-tQ/edit

2. Провери структурата (трябва да има тези колони):

   | A (number) | B (status) | C (last_used_at) | D (note) |
   |------------|------------|------------------|----------|
   | +447481793989 | available | | |
   | +447481793990 | available | | |
   | +447481793991 | available | | |

3. **Важни правила**:
   - Номерата ТРЯБВА да започват с +44
   - Status може да е: празно, "available", "reserved", "used"
   - Workflow-ът автоматично ще актуализира status

## 🔧 СТЪПКА 5: Импортирай Главния Workflow

1. В n8n, кликни: **"Add workflow"** → **"Import from File"**
2. Избери: `n8n_workflows/wallester_combined_automation.json`
3. След импортиране, workflow-ът ще се зареди с много nodes

### 5.1 Актуализирай Supabase Nodes

Намери тези nodes и актуализирай credentials:

1. **Node: "Check EIK in Wallester DB"**
   - Кликни на него
   - В дясно → Credentials → Избери `Supabase API`

2. **Node: "Save to Supabase"**
   - Кликни на него
   - В дясно → Credentials → Избери `Supabase API`

### 5.2 Актуализирай Google Sheets Nodes

Намери тези nodes и актуализирай credentials:

1. **Node: "Read Phone Numbers"**
   - Кликни на него
   - Credentials → Избери `Google Sheets OAuth2`

2. **Node: "Mark Phone Reserved"**
   - Credentials → Избери `Google Sheets OAuth2`

3. **Node: "Mark Phone Used"**
   - Credentials → Избери `Google Sheets OAuth2`

### 5.3 Актуализирай Airtop Nodes

Намери всички Airtop nodes и актуализирай credentials:

1. **"Airtop: Initial Form (Phone)"** → Credentials: `Airtop account`
2. **"Airtop: Submit SMS OTP"** → Credentials: `Airtop account`
3. **"Airtop: Enter Email"** → Credentials: `Airtop account`
4. **"Airtop: Submit Email OTP"** → Credentials: `Airtop account`
5. **"Airtop: Fill Business Details"** → Credentials: `Airtop account`

### 5.4 Свържи Sub-Workflow IDs (КРИТИЧНО!)

**Това е МНО ВАЖНО - без това няма да работи!**

1. **Намери node: "Get SMS OTP"**
   - Кликни на него
   - В дясно, намери полето: **"Workflow ID"**
   - Кликни на dropdown и избери workflow: **"SMS OTP Scraper (Sub-workflow)"**
   - ИЛИ ръчно въведи Workflow ID, който записа в стъпка 2.1

2. **Намери node: "Get Email OTP"**
   - Кликни на него
   - В дясно, намери полето: **"Workflow ID"**
   - Избери workflow: **"Email OTP Scraper (Sub-workflow)"**
   - ИЛИ ръчно въведи Email Scraper Workflow ID от стъпка 2.2

### 5.5 Копирай Webhook URL

1. Намери node: **"Supabase Webhook"** (първият node в началото)
2. Кликни на него
3. В дясно ще видиш: **"Production URL"**
4. Копирай целия URL (ще изглежда така):
   ```
   https://n8n.srv1201204.hstgr.cloud/webhook/wallester-automation
   ```
5. Запази го - ще ти трябва за следващата стъпка

6. Кликни **Save** за да запазиш workflow-а

## 🗄️ СТЪПКА 6: Конфигурирай Supabase

### 6.1 Създай Таблица wallester_business_profiles (ако не съществува)

1. Отиди на: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl
2. Влез: madoff1312@outlook.com / MagicBoyy24#
3. Кликни на: **SQL Editor** (от лявото меню)
4. Кликни: **New query**
5. Копирай и paste-ни този SQL:

```sql
-- Създай таблица за Wallester профили
CREATE TABLE IF NOT EXISTS wallester_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES verified_owners(id),
  eik TEXT NOT NULL UNIQUE,
  business_name TEXT,
  phone_used TEXT,
  email_used TEXT,
  status TEXT DEFAULT 'pending',
  reference_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Включи Row Level Security
ALTER TABLE wallester_business_profiles ENABLE ROW LEVEL SECURITY;

-- Създай policy за service role
CREATE POLICY "Service role can do everything"
  ON wallester_business_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Индекс за бързо търсене по EIK
CREATE INDEX IF NOT EXISTS idx_wallester_eik ON wallester_business_profiles(eik);
```

6. Кликни: **Run** (или Ctrl+Enter)
7. Трябва да видиш: "Success. No rows returned"

### 6.2 Конфигурирай Webhook в Supabase

1. В Supabase Dashboard, отиди на: **Database** → **Webhooks** (от лявото меню)
2. Кликни: **Create a new hook** или **Enable Webhooks**
3. Попълни формата:

   - **Name**: `Wallester Automation Trigger`
   - **Table**: Избери `verified_owners`
   - **Events**: Маркирай само ✅ **INSERT**
   - **Type**: Избери `HTTP Request`
   - **Method**: `POST`
   - **URL**: Paste-ни webhook URL от стъпка 5.5
     ```
     https://n8n.srv1201204.hstgr.cloud/webhook/wallester-automation
     ```
   - **HTTP Headers**: Кликни "Add header" и добави:
     - Key: `Content-Type`
     - Value: `application/json`

4. Кликни: **Create webhook** или **Confirm**

## ✅ СТЪПКА 7: Активирай Workflow-a

1. Върни се в n8n: https://n8n.srv1201204.hstgr.cloud/workflows
2. Отвори workflow-а: **"Wallester Combined Automation (MAIN)"**
3. Провери всичко:
   - ✅ Всички credentials са конфигурирани
   - ✅ Sub-workflow IDs са свързани
   - ✅ Google Sheet е готов с номера
   - ✅ Supabase webhook е създаден
4. Горе вдясно, намери toggle бутона (ON/OFF)
5. Кликни за да го **активираш** (трябва да стане зелен)
6. Workflow-ът е LIVE! 🎉

## 🧪 СТЪПКА 8: Тествай Системата

### Тест 1: Ръчен Тригер

1. В главния workflow, кликни: **Execute Workflow**
2. Намери node "Supabase Webhook"
3. Кликни: **Listen for test event**
4. Отвори нов tab и изпрати POST заявка (с Postman или curl):

```bash
curl -X POST https://n8n.srv1201204.hstgr.cloud/webhook/wallester-automation \
  -H "Content-Type: application/json" \
  -d '{
    "type": "INSERT",
    "table": "verified_owners",
    "record": {
      "id": "test-uuid",
      "full_name": "Test Owner",
      "owner_first_name_en": "John",
      "owner_last_name_en": "Doe",
      "owner_birthdate": "1990-01-01",
      "referral_url": "https://wallester.com/business/?ref=TEST",
      "waiting_list": [
        {
          "EIK": "123456789",
          "VAT": "BG123456789",
          "business_name_en": "Test Company Ltd",
          "business_name_wallester": "Test Company Ltd",
          "entity_type": "EOOD",
          "ownership_percent": 100,
          "nkid_code": "62.01",
          "nkid_description": "Computer programming",
          "address_city": "Sofia",
          "address_postcode": "1000",
          "address_street": "Test Street",
          "address_number": "1"
        }
      ]
    }
  }'
```

5. Гледай execution-а в реално време!

### Тест 2: Реален Тест с Истински Данни

1. Отиди в Supabase: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl
2. Отвори Table Editor → verified_owners
3. Добави нов ред с реални данни
4. Webhook-ът автоматично ще се тригне!
5. Провери execution: https://n8n.srv1201204.hstgr.cloud/executions

## 📊 Мониторинг

### Проверка на Executions
- Отиди на: https://n8n.srv1201204.hstgr.cloud/executions
- Филтрирай по: "Wallester Combined Automation (MAIN)"
- Виж статуса: Success (зелено) или Error (червено)

### Проверка на Phone Pool
- Отвори Google Sheet
- Гледай колоната "status"
- Брой available номера = готови за употреба

### Проверка на Резултати
В Supabase SQL Editor:
```sql
-- Виж последните 10 регистрации
SELECT * FROM wallester_business_profiles 
ORDER BY created_at DESC LIMIT 10;

-- Брой по статус
SELECT status, COUNT(*) 
FROM wallester_business_profiles 
GROUP BY status;
```

## 🔧 Често Срещани Проблеми

### "No available UK phone numbers"
**Решение**: Добави повече +44 номера в Google Sheet със status "available"

### "SMS OTP not found"
**Причина**: SMS-ът се забави или не пристигна
**Решение**: 
- Провери smsto.me ръчно
- Увери се че kirkomrk@gmail.com login работи
- Увеличи времето за изчакване

### "Email OTP not found"
**Причина**: Email-ът се забави
**Решение**: Провери workmail.pro достъпа

### "Airtop agent timeout"
**Причина**: Сайтът се зарежда бавно
**Решение**: Виж Airtop session logs за детайли

## 🎉 Готово!

Системата е настроена и работи! Workflow-ът автоматично ще:

1. ✅ Приема webhook от Supabase
2. ✅ Обработва всеки бизнес от waiting_list
3. ✅ Прескача дубликати (EIK-ове)
4. ✅ Взима телефон от Google Sheet
5. ✅ Генерира email
6. ✅ Попълва Wallester формите
7. ✅ Scrape-ва SMS и Email OTP кодове
8. ✅ Записва в Supabase
9. ✅ Маркира телефона като "used"

**Всичко е автоматично!** 🚀

## 📞 Поддръжка

Ако имаш проблеми:
1. Виж execution logs в n8n
2. Провери credentials
3. Провери дали има available номера в Google Sheet
4. Виж пълната документация: `WALLESTER_WORKFLOWS_DEPLOYMENT_GUIDE.md`
