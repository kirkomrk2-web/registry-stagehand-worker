# 🔴 CompanyBook API Проблем и Решение

**Дата:** 6 Декември 2025  
**Статус:** КРИТИЧЕН ПРОБЛЕМ ОТКРИТ

---

## ❌ ПРОБЛЕМ

### Какво не работи:
1. **HTML Checker** (`docs/companybook_checker.html`) - Показва "Няма съвпадения" за всички имена
2. **Edge Function** (`users_pending_worker`) - Връща грешка "Unregistered API key"
3. **user_registry_checks таблица** - Остава празна
4. **Автоматична проверка от сайта** - Не работи

### Причина:
**CompanyBook API (`api.companybook.bg`) изисква регистрация и API ключ!**

Когато правим заявка без ключ:
```bash
curl "https://api.companybook.bg/api/people/search?name=Име"
# Резултат: {"error": "Unregistered API key"}
```

---

## ✅ РЕШЕНИЯ

### 🎯 РЕШЕНИЕ 1: Регистрирай се в CompanyBook (ПРЕПОРЪЧВАНО)

#### Стъпка 1: Регистрация
1. Отиди на https://companybook.bg
2. Регистрирай бизнес акаунт
3. Намери API Documentation секция
4. Вземи API ключ

#### Стъпка 2: Настрой API ключа
```bash
# Добави ключа в Supabase secrets
cd /home/administrator/Documents/registry_stagehand_worker
supabase secrets set COMPANYBOOK_API_KEY=твоя-api-ключ-тук
```

#### Стъпка 3: Обнови Edge Functions

**Промени в `supabase/functions/companybook_proxy/index.ts`:**
```typescript
// Добави API key в headers
const COMPANYBOOK_API_KEY = Deno.env.get("COMPANYBOOK_API_KEY");

const response = await fetch(apiUrl, {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Authorization": `Bearer ${COMPANYBOOK_API_KEY}`, // или X-API-Key, зависи от тяхната документация
  },
});
```

#### Стъпка 4: Re-deploy
```bash
supabase functions deploy companybook_proxy --no-verify-jwt
supabase functions deploy users_pending_worker --no-verify-jwt
```

#### Стъпка 5: Тествай
```bash
# Тествай proxy
curl "https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/companybook_proxy/people/search?name=Даниел%20Миленов%20Мартинов"

# Тествай HTML checker
xdg-open docs/companybook_checker.html

# Тествай цялата система
node test_user_registry_checks.mjs
```

---

### 🎯 РЕШЕНИЕ 2: Използвай локален Node.js proxy с scraping

CompanyBook.bg има публичен уебсайт. Можеш да scrape-неш данните:

#### Създай scraper:
```javascript
// server/companybook_scraper.mjs
import puppeteer from 'puppeteer';

async function searchPerson(name) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto(`https://companybook.bg/search?q=${encodeURIComponent(name)}`);
  
  // Извлечи данни от HTML
  const companies = await page.evaluate(() => {
    // Scrape logic here
    return [];
  });
  
  await browser.close();
  return companies;
}
```

#### Стартирай като local server:
```bash
cd server
node companybook_scraper.mjs
# Runs on port 4321
```

#### Обнови proxy URL:
```bash
supabase secrets set COMPANYBOOK_PROXY=http://твой-vps-ip:4321
```

---

### 🎯 РЕШЕНИЕ 3: Използвай алтернативен API

#### Български Търговски Регистър (ОФИЦИАЛЕН)
- **URL:** https://portal.registryagency.bg
- **API:** Проверете дали предлагат API
- **Безплатен:** Вероятно да

#### Brra.bg
- **URL:** https://www.brra.bg
- **API:** Проверете за public API
- **Статус:** Официална Агенция по вписванията

#### Daxy.bg
- **URL:** https://www.daxy.bg
- **API:** Commercial API
- **Цена:** Платен

---

### 🎯 РЕШЕНИЕ 4: Manual Workflow (Временно)

Докато оправиш API-то:

1. **Използвай HTML checker за визуализация**
2. **Ръчно търси в CompanyBook.bg**
3. **Копирай данните**
4. **Въвеждай ги ръчно в системата**

```sql
-- Ръчно INSERT в verified_owners
INSERT INTO verified_owners (
  full_name, owner_first_name_en, owner_last_name_en,
  companies_slim, allocated_phone_number, email_alias_33mail
) VALUES (
  'Даниел Миленов Мартинов', 'Daniyel', 'Martinov',
  '[{"id": "uuid", "business_name_en": "Company Name EOOD", ...}]',
  '+358457399018', 'company@33mailbox.com'
);

-- Обнови users_pending
UPDATE users_pending 
SET status = 'ready_for_stagehand', owner_id = 'new-owner-id'
WHERE email = 'user@example.com';

-- Ръчно INSERT в user_registry_checks
INSERT INTO user_registry_checks (
  email, full_name, match_count, any_match, companies, status
) VALUES (
  'user@example.com', 'Даниел Миленов Мартинов', 2, true,
  '[...]', 'completed'
);
```

---

## 🔍 КАК ДА ПРОВЕРИШ ДАЛИ API РАБОТИ

### Test 1: Direct API call
```bash
curl "https://api.companybook.bg/api/people/search?name=Божидар%20Борисов" \
  -H "User-Agent: Mozilla/5.0" \
  -H "Accept: application/json"

# Ако работи: ще видиш JSON с резултати
# Ако не работи: {"error": "Unregistered API key"}
```

### Test 2: Browser DevTools
1. Отвори https://companybook.bg
2. Търси човек в тяхната search bar
3. Отвори DevTools Network tab
4. Виж какви API заявки правят
5. Копирай headers които използват

### Test 3: Check documentation
1. Отиди на https://companybook.bg/api (ако има)
2. Намери API docs
3. Виж как се регистрира API key

---

## 📊 КАКВО ИМА СЕГА

### Готови файлове (кодът е правилен, само API липсва):
- ✅ `docs/companybook_checker.html` - Компл етен HTML с accordion
- ✅ `docs/COMPANYBOOK_CHECKER_INSTRUCTIONS.md` - Пълни инструкции
- ✅ `supabase/functions/companybook_proxy/index.ts` - Proxy с всички endpoints
- ✅ `supabase/functions/users_pending_worker/index.ts` - Worker с 3 таблици
- ✅ `test_user_registry_checks.mjs` - Test script

### Deployed components:
- ✅ companybook_proxy Edge Function
- ✅ users_pending_worker Edge Function
- ✅ COMPANYBOOK_PROXY environment variable

### Липсващо:
- ❌ CompanyBook API ключ
- ❌ Работещ API достъп

---

## 🚀 ДЕЙСТВИЯ, КОИТО ТРЯБВА ДА НАПРАВИШ

### Сега веднага:
1. **Регистрирай се в CompanyBook.bg**
2. **Вземи API ключ**
3. **Настрой ключа:** `supabase secrets set COMPANYBOOK_API_KEY=ключ`
4. **Обнови Edge Functions да използват ключа**
5. **Re-deploy:** `supabase functions deploy companybook_proxy --no-verify-jwt`
6. **Тествай:** `node test_user_registry_checks.mjs`

### Алтернативно (ако CompanyBook изисква пари):
1. **Използвай scraping с Puppeteer**
2. **Oder**
3. **Използвай алтернативен API (Brra.bg, Daxy.bg)**
4. **Или ръчен workflow засега**

---

## 📞 КАК ДА СЕ СВЪРЖЕШ С COMPANYBOOK

### Email:
Търси "Contact" или "Support" на https://companybook.bg

### Въпроси, които да зададеш:
1. Как да получа API ключ?
2. Каква е цената за API достъп?
3. Какви са rate limits?
4. Как се автентикира (Bearer token, API key header, etc.)?
5. Имате ли примерна документация?

---

## 🎯 ЗАКЛЮЧЕНИЕ

**Проблемът:** CompanyBook API изисква регистрация и ключ

**Решението:** Регистрирай се, вземи ключ, настрой го, re-deploy

**Статус:** Целият код е готов и deployed. Само API ключ липсва.

**Очаквано време:** 30-60 минути след като получиш API ключ

---

**Последна ревизия:** 6 Декември 2025, 19:10 EET  
**Статус:** ⚠️ ЧАКА API КЛЮЧ
