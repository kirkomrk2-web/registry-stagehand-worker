# 🚀 QUICK START GUIDE
**Registry Stagehand Worker - Бързо Стартиране**

---

## ⚡ 5-МИНУТНО СТАРТИРАНЕ

### 1. Стартирай Основните Сървъри

```bash
cd /home/administrator/Documents/registry_stagehand_worker

# Terminal 1: CompanyBook Proxy (Port 4321)
node server/companybook_proxy.mjs

# Terminal 2: Proxy Status Monitor (Port 4322)
node server/proxy_status_server.mjs

# Terminal 3: Wallester API (Port 4323)
SUPABASE_URL="https://ansiaiuaygcfztabtknl.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA" \
node server/wallester_automation_server.mjs
```

### 2. Отвори Visual Dashboards

```bash
# В браузър отвори:
firefox docs/registry_results_viewer.html    # Registry резултати
firefox docs/wallester_dashboard.html        # Wallester automation
firefox docs/registry_pipeline_visual.html   # Pipeline visualizer
```

### 3. Тествай Системата

```bash
# Run full workflow test
SUPABASE_URL="https://ansiaiuaygcfztabtknl.supabase.co" \
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjg2NjksImV4cCI6MjA3ODY0NDY2OX0.-a4CakCH4DhHGOG1vMo9nVdtW0ux252QqXRi-7CA_gA" \
node test_full_workflow.mjs
```

---

## 🎯 ОСНОВНИ ENDPOINTS

### CompanyBook Proxy (4321)
```bash
# Person search
curl "http://localhost:4321/person-search?name=Даниел%20Миленов%20Мартинов"

# Company details
curl "http://localhost:4321/company-details/208341137"
```

### Proxy Status (4322)
```bash
# Status
curl http://localhost:4322/status

# All proxies
curl http://localhost:4322/proxies

# Force rotation
curl -X POST http://localhost:4322/rotate
```

### Wallester API (4323)
```bash
# Health check
curl http://localhost:4323/health

# Create account (requires owner_id from verified_owners)
curl -X POST http://localhost:4323/create-account \
  -H "Content-Type: application/json" \
  -d '{"owner_id":"919b0dbe-f9a7-49f1-98ad-ea51048412a7"}'
```

---

## 📊 SUPABASE КОНФИГУРАЦИЯ

```bash
# URLs
SUPABASE_URL="https://ansiaiuaygcfztabtknl.supabase.co"

# Anon Key (client-side, read-only)
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjg2NjksImV4cCI6MjA3ODY0NDY2OX0.-a4CakCH4DhHGOG1vMo9nVdtW0ux252QqXRi-7CA_gA"

# Service Role Key (server-side, full access)
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA"
```

---

## ✅ ПРОВЕРКА НА СИСТЕМАТА

### 1. Провери CompanyBook Proxy
```bash
curl -s http://localhost:4321/health | jq
# Expected: {"status":"ok"}
```

### 2. Провери Proxy Status
```bash
curl -s http://localhost:4322/stats | jq
# Expected: JSON with activeProxies, healthyProxies, etc.
```

### 3. Провери Wallester API
```bash
curl -s http://localhost:4323/health | jq
# Expected: {"status":"healthy","supabase":true}
```

### 4. Провери Supabase Edge Function
```bash
curl -X POST https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/registry_check \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test","email":"test@test.com"}' | jq
```

### 5. Провери Database
```bash
# With service_role key
SUPABASE_URL="https://ansiaiuaygcfztabtknl.supabase.co" \
SUPABASE_ANON_KEY="<service_role_key>" \
node check_daniel_db.mjs
```

---

## 🔧 TROUBLESHOOTING

### Проблем: Port already in use
```bash
# Find process
lsof -i :4321  # or :4322, :4323
# Kill process
kill -9 <PID>
```

### Проблем: Supabase connection fails
```bash
# Test connection
curl https://ansiaiuaygcfztabtknl.supabase.co/rest/v1/ \
  -H "apikey: <ANON_KEY>"
```

### Проблем: CompanyBook API blocks requests
- Use local proxy (port 4321)
- Proxy auto-rotates every 5 minutes
- Check proxy health: `curl http://localhost:4322/proxies`

### Проблем: verified_owners RLS error
- Use SERVICE_ROLE_KEY instead of ANON_KEY
- SERVICE_ROLE bypasses RLS policies

---

## 📚 ДОКУМЕНТАЦИЯ

**Основни:**
- `PROJECT_STATUS_COMPLETE.md` - Пълен статус на проекта
- `HOSTINGER_INTEGRATION_GUIDE.md` - Hostinger AI Builder интеграция
- `QUICK_START.md` - Този файл

**Специфични:**
- `PROXY_ROTATION_DEPLOYMENT.md` - Proxy rotation setup
- `WALLESTER_COMPLETE_SYSTEM_GUIDE.md` - Wallester система
- `BROWSERBASE_MCP_GUIDE.md` - Browser automation
- `HORIZONS_FIXES/V4_DEPLOYMENT_GUIDE.md` - Chat agent deploy

---

## 🎬 СЛЕДВАЩИ СТЪПКИ

1. **Оправи users_pending_worker Edge Function**
   - Добави COMPANYBOOK_PROXY environment variable
   - Deploy: `supabase functions deploy users_pending_worker`

2. **Добави SMS Numbers в Pool**
   - Минимум 10 номера от smstome.com
   - INSERT в `sms_numbers_pool` table

3. **Имплементирай Wallester Automation**
   - Интегрирай Browserbase MCP в `server/wallester_automation_server.mjs`
   - Тествай account creation flow

4. **Deploy на Production**
   - Host CompanyBook proxy на cloud (Railway/Fly.io)
   - Deploy Edge Functions
   - Configure CORS

5. **Hostinger Integration**
   - Build chat widget: `cd horizons-walle-bg. && npm run build`
   - Upload to Hostinger
   - Add to website via Custom Code

---

**Last Updated:** 3 Декември 2025  
**Version:** 1.0.0
