# Proxy и Rate Limiting - Текущо състояние

## ❌ Rotating Proxies - НЕ се използват

При теста на 22те имена **НЕ използвахме rotating proxies**. Всички заявки вървят директно към CompanyBook API.

### Какво имаме в кода:

```typescript
// В users_pending_worker/index.ts:
const COMPANYBOOK_PROXY = Deno.env.get("COMPANYBOOK_PROXY");
const COMPAN YBOOK_API_BASE = COMPANYBOOK_PROXY || "https://api.companybook.bg/api";
```

**Текущо състояние:** COMPANYBOOK_PROXY е празна, така че използваме **директен достъп**.

### Rate Limiting защита:

В теста `test_all_22_names.mjs` имаме:

```javascript
// Забавяне между имена
await new Promise(r => setTimeout(r, 500));  // 0.5s след insert
await new Promise(r => setTimeout(r, 2000)); // 2s след registry_check
```

**Общо забавяне:** ~2.5 секунди между всяко име = **~10.4 секунди средно на име**

### Защо работи без proxies:

1. **CompanyBook API е доста толерантен** към rate limiting
2. **Забавяне между заявки** (2.5s) е достатъчно
3. **Функциите използват различни endpoints:**
   - `/api/people/search` 
   - `/api/people/{id}`
   - `/api/relationships/{id}`
   - `/api/companies/{uic}`

## ✅ Препоръки за Production

### За по-голям мащаб (50+ имена):

1. **Enabling Proxy:**
```bash
# В Supabase Environment Variables:
COMPANYBOOK_PROXY=https://your-proxy-server.com
```

2. **Използване на ProxyRotator** (вече имаме кода):
```javascript
// В browserbase-worker/lib/DynamicProxyRotator.mjs
// Automatic rotation на proxies от списък
```

3. **Увеличаване на забавянията:**
```javascript
// За > 50 имена:
await new Promise(r => setTimeout(r, 3000)); // 3s между имена
```

### Текущи лимити на CompanyBook:

- **Без proxy:** ~100-150 заявки/час (прогнозно)
- **С proxy:** Неограничено (зависи от proxy pool)

## 🔧 Как да активираме proxies:

### Опция 1: Използване на съществуващия proxy pool

```javascript
// config/proxies.mjs вече съдържа списък с proxies
const PROXY_LIST = [
  { host: '185.199.229.156', port: 7492, user: 'user', pass: 'pass' },
  // ... още proxies
];
```

### Опция 2: Външен proxy service

Deploy на `server/companybook_proxy.mjs`:
```bash
# Railway/Render deployment
node server/companybook_proxy.mjs
```

След това set environment variable:
```bash
COMPANYBOOK_PROXY=https://your-proxy.railway.app
```

## 📊 Заключение за теста на 22 имена:

- ✅ **Без proxies** - 17/22 успешни (77%)
- ✅ **Без rate limit грешки** - 0 errors
- ✅ **Време:** 229s / 22 имена = **10.4s средно на име**

**За текущия обем на използване proxies НЕ са необходими.**

Ако планирате да обработвате 100+ имена на ден, тогава препоръчвам активиране на proxy rotation.
