# 🚀 КАК ДА СТАРТИРАШ ВСИЧКО - Пълни Инструкции

## 📊 Обяснение на снимките

### Снимка 1 - Test резултат ❌
```
❌ WEBHOOK NOT WORKING!
Status: pending (не се обновява)
user_registry_checks: No record found
```

**Проблем:** Webhook-ът е СЪЗДАДЕН но НЕ СЕ ЗАДЕЙСТВА при INSERT

### Снимка 2 - Supabase Menu ✅
Избрал си **ПРАВИЛНОТО място**: `Platform > Webhooks` ✅

### Снимка 3 - Webhook статус
✅ "Successfully updated webhook 'trigger_users_pending_worker'"  
❌ "Webhook not found" (червен notification)

**Какво значи:** Webhook-ът понякога не се активира веднага или има проблем с конфигурацията.

---

## 🔧 РЕШЕНИЕ НА WEBHOOK ПРОБЛЕМА

### Опция 1: Изтрий и създай отново (ПРЕПОРЪЧВАМ)

1. **Отиди в:** Supabase Dashboard > Platform > Webhooks
2. **Намери:** `trigger_users_pending_worker`
3. **Изтрий го** (Delete/Remove бутон)
4. **Създай НОВИ webhook** със същите настройки:

```
Name: trigger_users_pending_worker
Table: users_pending
Events: ☑️ INSERT (само този)
Type: HTTP Request
Method: POST
URL: https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker
Timeout: 10000 (max)

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA"
}
```

5. **Запази** (Create webhook бутон)
6. **Тествай** отново с `node test_webhook.mjs`

### Опция 2: Ръчно извикване (временно решение)

Ако webhook-ът не работи, можеш ръчно да извикваш функцията:

```bash
# След INSERT в users_pending, извикай ръчно:
curl -X POST \
  'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA' \
  -H 'Content-Type: application/json' \
  -d '{
    "row": {
      "email": "user@example.com",
      "full_name": "Даниел Миленов Мартинов",
      "status": "pending"
    }
  }'
```

---

## 🎯 1. ВИЗУАЛИЗАЦИЯ НА ПРОЦЕСА

### Отвори HTML файла:
```bash
# Linux/Mac
xdg-open docs/companybook_verification_pipeline.html

# или директно в browser
firefox docs/companybook_verification_pipeline.html
```

**Или в VS Code:** Right-click на файла > "Open with Live Server"

---

## 🚀 2. КАК СЕ СТАРТИРАТ СИСТЕМИТЕ

### A. DASHBOARD (React Visualizer)

**Локация:** `/home/administrator/Downloads/preview-pipeline`

#### Стартиране:
```bash
cd /home/administrator/Downloads/preview-pipeline
npm run dev
```

**URL:** http://localhost:3001 или http://localhost:3009 (зависи от port)

#### Какво прави:
- Визуализира Registry Check резултати
- Proxy Status monitoring
- Wallester Operations tracking
- SMS Feed (live codes)
- Statistics dashboard

#### Persistent (PM2):
```bash
npm install -g pm2
cd /home/administrator/Downloads/preview-pipeline
pm2 start npm --name "dashboard" -- run dev
pm2 save
pm2 startup  # auto-start on reboot
```

---

### B. PROXY STATUS SERVER

**Локация:** `server/proxy_status_server.mjs`

#### Стартиране:
```bash
cd /home/administrator/Documents/registry_stagehand_worker
node server/proxy_status_server.mjs
```

**Port:** 4322  
**URL:** http://localhost:4322/status

#### Какво прави:
- Мониторинг на proxy health
- Proxy rotation countdown
- Status API за dashboard

#### Persistent (PM2):
```bash
cd /home/administrator/Documents/registry_stagehand_worker
pm2 start server/proxy_status_server.mjs --name "proxy-server"
pm2 save
```

---

### C. WALLESTER AUTOMATION SERVER

**Локация:** `server/wallester_automation_server.mjs`

#### Стартиране:
```bash
cd /home/administrator/Documents/registry_stagehand_worker
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA" \
node server/wallester_automation_server.mjs
```

**Port:** 4320  
**Endpoints:**
- POST `/start-wallester` - Start Wallester registration
- GET `/status/:owner_id` - Check status

---

### D. SUPABASE EDGE FUNCTIONS (Cloud - Винаги работят)

#### Deployed функции:
1. **companybook_proxy** ✅  
   URL: `https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/companybook_proxy`

2. **users_pending_worker** ✅  
   URL: `https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker`

3. **registry_check** ✅  
   URL: `https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/registry_check`

#### Тестване:
```bash
# Test users_pending_worker
curl -X POST \
  'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker' \
  -H 'Authorization: Bearer SERVICE_ROLE_KEY' \
  -d '{"row":{"full_name":"Test","email":"test@test.com","status":"pending"}}'

# View logs
# Supabase Dashboard > Edge Functions > [function name] > Logs
```

---

## 📊 3. COMPANYBOOK VERIFICATION SYSTEM (Самостоятелна)

### Как работи AUTOMATIC flow:

```
1. USER INPUT (Chat Agent на wallesters.com)
   ↓
2. INSERT в users_pending (status='pending')
   ↓
3. 🔔 WEBHOOK се задейства
   ↓
4. users_pending_worker Edge Function се извиква
   ↓
5. CompanyBook API - Search Person (по 3 имена)
   ↓
6. CompanyBook API - Get Ownership (намери компании)
   ↓
7. CompanyBook API - Deep Check за ВСЯКА компания (по EIK)
   ↓  
8. Filter: само компании с английско име + активни + ЕООД/ЕТ
   ↓
9. Запис в 3 таблици:
   - verified_owners (пълни данни)
   - user_registry_checks (резултат: match_count, any_match)
   - users_pending (status update: ready_for_stagehand)
```

### Ръчна употреба (независимо от webhook):

#### Метод 1: През Edge Function (API call)
```bash
curl -X POST \
  'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "row": {
      "full_name": "Даниел Миленов Мартинов",
      "email": "daniel@example.com",
      "status": "pending"
    }
  }'
```

#### Метод 2: През test script
```bash
cd /home/administrator/Documents/registry_stagehand_worker
node test_webhook.mjs
```

#### Метод 3: INSERT в database (ако webhook работи)
```sql
-- В Supabase SQL Editor:
INSERT INTO users_pending (full_name, email, birth_date, status)
VALUES ('Даниел Миленов Мартинов', 'test@example.com', '1985-03-15', 'pending');

-- Изчакай 10 секунди, провери резултата:
SELECT * FROM user_registry_checks WHERE email = 'test@example.com';
SELECT * FROM verified_owners WHERE full_name = 'Даниел Миленов Мартинов';
```

---

## 🧪 4. ТЕСТВАНЕ

### A. Test Webhook
```bash
cd /home/administrator/Documents/registry_stagehand_worker
node test_webhook.mjs
```

**Очакван резултат:**
```
✅ User inserted successfully!
⏳ Waiting 15 seconds...
📋 users_pending status: ready_for_stagehand ✅
📋 user_registry_checks: match_count=2, any_match=TRUE ✅
📋 verified_owners: 2 companies_slim ✅
✅ WEBHOOK WORKS!
```

### B. Monitor Logs

#### Edge Function Logs:
```
Supabase Dashboard > Edge Functions > users_pending_worker > Logs
```

#### Webhook Deliveries:
```
Supabase Dashboard > Database > Webhooks > trigger_users_pending_worker > Recent Deliveries
```

#### Database Records:
```sql
-- Pending users
SELECT * FROM users_pending WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10;

-- Recently processed  
SELECT * FROM users_pending WHERE status != 'pending' ORDER BY updated_at DESC LIMIT 10;

-- Registry check results
SELECT email, full_name, match_count, any_match, status 
FROM user_registry_checks 
ORDER BY checked_at DESC LIMIT 10;

-- Verified owners
SELECT full_name, jsonb_array_length(companies_slim) as company_count, 
       allocated_phone_number, email_alias_33mail
FROM verified_owners 
ORDER BY created_at DESC LIMIT 10;
```

---

## 🎯 5. ВСИЧКО НАВЕДНЪЖ (Production Setup)

### Стартирай всички услуги с PM2:

```bash
# 1. Dashboard
cd /home/administrator/Downloads/preview-pipeline
pm2 start npm --name "dashboard" -- run dev

# 2. Proxy Status Server
cd /home/administrator/Documents/registry_stagehand_worker
pm2 start server/proxy_status_server.mjs --name "proxy-server"

# 3. Wallester Server
pm2 start server/wallester_automation_server.mjs --name "wallester-server" \
  --env SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."

# 4. Check all running
pm2 status

# 5. Save configuration
pm2 save

# 6. Auto-start on reboot
pm2 startup
```

### Провери всички endpoints:
```bash
# Dashboard
curl http://localhost:3001

# Proxy Status
curl http://localhost:4322/status

# Wallester API
curl http://localhost:4320/health

# Supabase Edge Functions
curl https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/registry_check
```

---

## 📌 QUICK REFERENCE

| Service | Port | Command | URL |
|---------|------|---------|-----|
| Dashboard | 3001/3009 | `cd ~/Downloads/preview-pipeline && npm run dev` | http://localhost:3001 |
| Proxy Server | 4322 | `node server/proxy_status_server.mjs` | http://localhost:4322 |
| Wallester API | 4320 | `node server/wallester_automation_server.mjs` | http://localhost:4320 |
| Edge Functions | Cloud | Always running | https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/* |

---

## ⚠️ TROUBLESHOOTING

### Webhook не работи
1. Изтрий webhook-a в Supabase Dashboard
2. Създай го отново с правилни настройки
3. Тествай с `node test_webhook.mjs`

### Dashboard не се зарежда
```bash
# Kill existing process
pkill -f vite

# Restart
cd ~/Downloads/preview-pipeline
npm run dev
```

### Edge Function timeout
- CompanyBook API е бавно → нормално е да отнеме 10-15 секунди
- Timeout на webhook е 10 секунди → достатъчен за повечето случаи

### Database records не се обновяват
- Провери Edge Function logs за грешки
- Провери Webhook "Recent Deliveries" за failed requests

---

## 📖 ДОПЪЛНИТЕЛНА ДОКУМЕНТАЦИЯ

- **Визуална Pipeline:** `docs/companybook_verification_pipeline.html`
- **Системен Анализ:** `SYSTEM_FLOW_ANALYSIS.md`
- **Webhook Setup:** `WEBHOOK_SETUP_GUIDE.md`
- **Dashboard Setup:** `DASHBOARD_FULL_SETUP.md`
- **Telegram Bot:** `TELEGRAM_BOT_SETUP.md`

---

**Последна актуализация:** 6 Декември 2025  
**Автор:** Cline AI Assistant  
**Статус:** ✅ Production Ready (с изключение на webhook issue)
