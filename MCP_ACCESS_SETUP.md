# MCP Access Setup за Cline
## За автоматизирано deployment и testing
**Date:** 2025-12-20

---

## 🎯 Какво искам да мога да правя

1. **Supabase:**
   - Deploy на SQL migrations (copy-paste в SQL Editor)
   - Deploy на Edge Functions (редактиране и deploy)
   - Четене на таблици и проверка на данни
   - Проверка на webhooks статус

2. **n8n VPS:**
   - Import на workflows
   - Редактиране на workflows (add nodes, connections)
   - Проверка на Executions
   - Activate/Deactivate workflows

3. **Browser Testing:**
   - Отваряне на n8n UI
   - Отваряне на Supabase Dashboard
   - Тестване на wallesters.com flow

---

## 🔧 Опции за достъп

### Опция 1: Browser Automation (chrome-har-capturer или подобен)
**За:**
- Supabase UI interaction
- n8n UI interaction
- Visual testing

**Какво ми трябва:**
```bash
# Може да използвам browser_action tool (ако е enabled)
# Или Puppeteer/Playwright
```

**Credentials needed:**
- Supabase login (email/pass или session token)
- n8n VPS login (email/pass)

### Опция 2: API достъп (по-добър вариант)
**Supabase:**
```bash
# Supabase Management API
curl -X POST https://api.supabase.com/v1/projects/{ref}/database/migrations \
  -H "Authorization: Bearer {access_token}" \
  --data-binary @migration.sql
```

**n8n:**
```bash
# n8n API
curl https://n8n.srv1201204.hstgr.cloud/api/v1/workflows \
  -H "X-N8N-API-KEY: {api_key}" \
  -H "Content-Type: application/json"
```

**Какво ми трябва:**
- Supabase Access Token (от Settings → API)
- n8n API Key (от Settings → API)

### Опция 3: SSH + CLI (най-директен)
**Supabase:**
```bash
# Supabase CLI
npx supabase db push --project-ref ansiaiuaygcfztabtknl
npx supabase functions deploy registry_check
```

**n8n:**
```bash
# SSH към VPS
ssh root@72.61.154.188
# Docker команди за n8n
docker exec n8n n8n import:workflow --input=workflow.json
```

**Какво ми трябва:**
- Supabase CLI credentials/token
- SSH ключ или парола за VPS

---

## 📋 Какво препоръчвам

### За момента (Manual deployment с моята помощ)
Ти правиш deployment ръчно според `DEPLOYMENT_CHECKLIST.md`:
1. Copy-paste SQL migrations
2. Copy-paste Edge Functions код
3. Import n8n workflows от файлове

Аз съм създал всички файлове готови за употреба.

### За бъдеще (Automated deployment)
Създаваме **Deployment Automation Workflow** в n8n, който:
1. Чете migrations от GitHub
2. Пуска ги в Supabase през API
3. Deploy-ва Edge Functions
4. Import-ва workflows
5. Тества и докладва

---

## 🌐 Browser Access Setup

Ако искаш да ми дадеш browser достъп:

### За Supabase
```
URL: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl
Login: [твоя imейл]
Password: [или session sharing]
```

### За n8n VPS
```
URL: https://n8n.srv1201204.hstgr.cloud
Login: [admin email]
Password: [парола]
```

Алтернативно: можеш да експортнеш **session cookies** и аз да ги използвам.

---

## 🔐 Security Considerations

### Не препоръчвам да споделяш:
- Master passwords
- Service role keys

### По-безопасно е да споделиш:
- Read-only API tokens
- Временни browser sessions
- SSH keys за specific операции

### Или просто:
Ти правиш deployment ръчно по checklist-а (5 минути работа):
1. Copy-paste fix-натия `create_sms_numbers_pool.sql` → RUN
2. Copy-paste `registry_check/index.ts` → Deploy
3. Copy-paste `users_pending_worker/index.ts` → Deploy
4. Import 2 workflow JSON-а в n8n

---

## 📖 За n8n Subflows (от линка, който прати)

Въпреки че не мога да отворя PDF-а директно, знам че n8n subflows са:
- **Execute Workflow node** – вика друг workflow като "функция"
- **Wait node** – изчаква известно време
- **Loop node** – повтаря nodes няколко пъти
- **Split in Batches** – обработва големи масиви на парчета

Създадените от мен workflows **вече ползват тези концепции**:
- Phone/Email workflows имат **Loop nodes** за polling
- Main workflow ще ползва **Execute Workflow** за Phone/Email
- **IF nodes** за branching logic

---

## 💡 Предложение

Сега можеш да:

**Вариант A (бързо, 5 мин):**  
Deploy-ни ръчно по `DEPLOYMENT_CHECKLIST.md` → готово!

**Вариант B (по-сложно):**  
Дай ми достъп (API keys/browser session) и аз ще направя deployment автоматично.

Кажи ми кой вариант предпочиташ?
