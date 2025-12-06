# 🔗 WEBHOOK SETUP GUIDE - Auto-trigger users_pending_worker

## 🎯 Цел
Автоматично да се извиква `users_pending_worker` Edge Function всеки път когато се добави нов запис в `users_pending` таблицата.

---

## 📋 Стъпки за създаване на Webhook

### Метод 1: Supabase Dashboard (ПРЕПОРЪЧВАМ) ✅

#### Стъпка 1: Отвори Supabase Dashboard
1. Отиди на: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl
2. Login ако е нужно

#### Стъпка 2: Създай Webhook
1. В left sidebar кликни на **Database**
2. Кликни на **Webhooks** tab
3. Кликни **Create a new hook** бутон

#### Стъпка 3: Конфигурирай Webhook
Попълни формата така:

**Name:**
```
trigger_users_pending_worker
```

**Table:**
```
users_pending
```

**Events:** (избери)
- ☑️ **Insert** (само този, другите остават unchecked)
- ☐ Update
- ☐ Delete

**Type:**
```
HTTP Request
```

**Method:**
```
POST
```

**URL:**
```
https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker
```

**HTTP Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_HERE"
}
```

⚠️ **ВАЖНО:** Замени `YOUR_SERVICE_ROLE_KEY_HERE` с твоя service role key от:
- Dashboard > Settings > API > `service_role` secret

**HTTP Params:** (остави празно)

**Timeout (ms):**
```
30000
```

#### Стъпка 4: Запази
1. Кликни **Create webhook** 
2. Webhook-ът ще се появи в списъка

#### Стъпка 5: Test (Optional)
1. След създаване, кликни на webhook-а
2. Кликни **Send test event**
3. Провери logs в Dashboard > Edge Functions > users_pending_worker

---

### Метод 2: SQL Trigger (По-advanced вариант)

Алтернативно, можеш да използваш SQL trigger директно в базата:

```sql
-- 1. Create function to call Edge Function
CREATE OR REPLACE FUNCTION notify_users_pending_worker()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Use pg_net to make HTTP request asynchronously
  SELECT net.http_post(
    url := 'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object('row', row_to_json(NEW))
  ) INTO request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger on INSERT
CREATE TRIGGER on_users_pending_insert
  AFTER INSERT ON users_pending
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_users_pending_worker();
```

⚠️ **Забележка:** За да работи SQL trigger-а, трябва да активираш `pg_net` extension и да конфигурираш `service_role_key` в database settings.

---

## ✅ Проверка че Webhook работи

### Тест 1: Добави test user
```sql
-- В Supabase SQL Editor
INSERT INTO users_pending (full_name, email, birth_date, status) 
VALUES ('Test User', 'test@example.com', '1990-01-01', 'pending');
```

### Тест 2: Провери logs
1. Отиди на Dashboard > Edge Functions > users_pending_worker
2. Кликни **Logs** tab
3. Трябва да видиш log entry с нов request след ~2-5 секунди

### Тест 3: Провери резултата
```sql
-- След 10 секунди, провери дали е обработен
SELECT * FROM users_pending WHERE email = 'test@example.com';
-- status трябва да е сменен на "ready_for_stagehand" или "no_match"

SELECT * FROM user_registry_checks WHERE email = 'test@example.com';
-- трябва да има запис с match_count и companies
```

---

## 🐛 Troubleshooting

### Webhook не се извиква
**Проблем:** След INSERT в `users_pending`, webhook-ът не се задейства

**Решения:**
1. Провери че webhook-ът е **enabled** (не е paused)
2. Провери че **Events** включва **Insert**
3. Провери че **Table** е точно `users_pending` (не users_pending_worker)
4. Провери Webhook Logs в Dashboard > Database > Webhooks > [твоя webhook] > Logs

### Webhook се извиква, но функцията гърми
**Проблем:** Webhook се задейства но има 500 error

**Решения:**
1. Провери Edge Function logs: Dashboard > Edge Functions > users_pending_worker > Logs
2. Търси error messages в логовете
3. Най-честа грешка: CompanyBook API timeout или invalid response
4. Провери дали `COMPANYBOOK_PROXY` env var е set правилно

### Status остава на "pending"
**Проблем:** User се добавя, но status не се обновява

**Решения:**
1. Провери дали webhook-ът изпраща правилен payload:
```json
{
  "row": {
    "full_name": "...",
    "email": "...",
    "status": "pending"
  }
}
```

2. Тествай функцията ръчно:
```bash
curl -X POST \
  'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "row": {
      "full_name": "Test User",
      "email": "test@example.com",
      "status": "pending"
    }
  }'
```

---

## 📊 Monitoring

### Check Webhook status
- Dashboard > Database > Webhooks > [твоя webhook]
- Виж **Recent Deliveries** за статус на последните извиквания

### Check Function logs
- Dashboard > Edge Functions > users_pending_worker > Logs
- Филтрирай по date/time
- Търси за errors или успешни executions

### Check Database records
```sql
-- Pending users
SELECT * FROM users_pending WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10;

-- Recently processed
SELECT * FROM users_pending WHERE status != 'pending' ORDER BY updated_at DESC LIMIT 10;

-- Registry checks results
SELECT 
  email, 
  full_name, 
  match_count, 
  any_match, 
  status,
  checked_at
FROM user_registry_checks 
ORDER BY checked_at DESC 
LIMIT 10;
```

---

## 🎉 Success Criteria

Webhook-ът работи правилно ако:

✅ При INSERT в `users_pending` се вижда request в Webhook Logs  
✅ Edge Function logs показват successful execution  
✅ `users_pending.status` се обновява автоматично (не остава "pending")  
✅ `user_registry_checks` получава нов запис с правилни данни  
✅ `verified_owners` се попълва с компаниите на user-а  

---

**Дата:** 6 Декември 2025  
**Статус:** Ready for setup  
**Време за setup:** ~5 минути
