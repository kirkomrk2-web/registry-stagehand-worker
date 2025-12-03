# 🚦 CompanyBook Rate Limit Solutions

## Проблемът
```
❌ HTTP 429: Rate limit exceeded. Maximum 100 requests per minute per IP
```

CompanyBook API позволява само **100 requests/минута per IP**.

При търсене с много компании:
- 1 person search: 1 request
- 5 candidates × relationships: 5 requests  
- 7 companies × details: 7 requests
= **13 requests за едно търсене**

## 🔧 Решения

### Решение 1: Добави Delay (най-бързо) ⚡

Добави delay между API заявките в HTML viewer:

```javascript
// В docs/registry_results_viewer.html

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// В searchByFullName() функцията, добави delay преди всяка company details заявка:
for(const comp of companies){
  if(!comp.eik) continue;
  
  // ⏱️ Изчакай 600ms между заявки (100 per min = 1 на 600ms)
  await sleep(600);
  
  try{
    const detailUrl = `${API_BASE}/company/${comp.eik}?with_data=true`;
    const detailData = await fetchJson(detailUrl);
    // ...
  }
}
```

**Pros:** Бързо fix  
**Cons:** Бавно търсене (7 компании × 600ms = ~4 секунди)

---

### Решение 2: Batch Processing с Queue 📦

Група заявките в batches от 10:

```javascript
async function processBatch(items, batchSize, delayMs, processFn) {
  const results = [];
  for(let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processFn));
    results.push(...batchResults);
    
    // Изчакай 1 минута между batches
    if(i + batchSize < items.length) {
      await sleep(delayMs);
    }
  }
  return results;
}

// Usage:
const enrichedCompanies = await processBatch(
  companies,
  10, // batch size (10 заявки наведнъж)
  60000, // 1 минута между batches
  async (comp) => {
    const detailUrl = `${API_BASE}/company/${comp.eik}?with_data=true`;
    return await fetchJson(detailUrl);
  }
);
```

**Pros:** По-бързо от Решение 1  
**Cons:** Все още има чакане

---

### Решение 3: Local Cache (Redis/File) 💾

Кешвай company details локално:

```javascript
// В server/companybook_proxy.mjs

import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = './cache/companybook';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

async function getCached(key) {
  const filePath = path.join(CACHE_DIR, `${key}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const cached = JSON.parse(data);
    if(Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  } catch {}
  return null;
}

async function setCache(key, data) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const filePath = path.join(CACHE_DIR, `${key}.json`);
  await fs.writeFile(filePath, JSON.stringify({
    timestamp: Date.now(),
    data
  }));
}

// В proxy endpoint:
app.get('/company/:eik', async (req, res) => {
  const { eik } = req.params;
  
  // Провери кеш първо
  const cached = await getCached(`company_${eik}`);
  if(cached) {
    return res.json(cached);
  }
  
  // Fetch от API
  const data = await fetchFromCompanyBook(eik);
  await setCache(`company_${eik}`, data);
  res.json(data);
});
```

**Pros:** Много бързо за повторни търсения  
**Cons:** Първото търсене все още бавно

---

### Решение 4: Rotating Proxies 🔄

Използвай rotating proxy service:

```javascript
// Proxy services:
// - Bright Data (luminati.io)
// - Oxylabs
// - Smartproxy

const proxyPool = [
  'http://proxy1.example.com:8080',
  'http://proxy2.example.com:8080',
  'http://proxy3.example.com:8080'
];

let currentProxyIndex = 0;

async function fetchWithRotatingProxy(url) {
  const proxy = proxyPool[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxyPool.length;
  
  const response = await fetch(url, {
    agent: new HttpsProxyAgent(proxy)
  });
  return response.json();
}
```

**Pros:** Заобикаля rate limit напълно  
**Cons:** Струва пари, сложно setup

---

### Решение 5: Browserbase MCP (ПРЕПОРЪЧВАМ) 🚀

Използвай Browserbase MCP за реални browser заявки вместо API:

```javascript
// Използвай Browserbase MCP tools (които имаш достъпни!)

// 1. Създай session
await cHJY3_0mcp0browserbase_session_create();

// 2. Navigate към CompanyBook search
await cHJY3_0mcp0browserbase_stagehand_navigate({
  url: 'https://www.companybook.bg/search?q=' + encodeURIComponent(fullName)
});

// 3. Extract резултати
const results = await cHJY3_0mcp0browserbase_stagehand_extract({
  instruction: 'Extract all company names, EIK numbers, and owner information from the search results'
});

// 4. За всяка компания, navigate и extract детайли
for(const company of results.companies) {
  await cHJY3_0mcp0browserbase_stagehand_navigate({
    url: `https://www.companybook.bg/company/${company.eik}`
  });
  
  const details = await cHJY3_0mcp0browserbase_stagehand_extract({
    instruction: 'Extract business name EN, legal form, status, address'
  });
}

// 5. Затвори session
await cHJY3_0mcp0browserbase_session_close();
```

**Pros:**
- Заобикаля API rate limit (scrape UI)
- Имаш го налично (MCP server)
- По-стабилно от rotating proxies

**Cons:**
- По-бавно от API (но без rate limit!)

---

### Решение 6: Hybrid Approach (Комбинация) 🎯

**ПРЕПОРЪЧИТЕЛНО:**

1. **За real-time търсене (UI):** Browserbase MCP
2. **За background enrichment:** Cache + Batch processing
3. **За Edge Function:** Rate limiting + queue

```javascript
// Структура:

// UI (HTML viewer) → Browserbase MCP scraping
//                  ↓
//          Quick results за user
//                  ↓
// Background worker → API с cache + batching
//                  ↓
//        Enrich records в DB
```

---

## 📝 За browser-a който показах

**Въпрос:** "Използваш ли Browserbase/Stagehand/browser-use?"

**Отговор:** 

Когато показах browser test преди малко, използвах **Puppeteer** вграден в Cline (моя AI tool). Това е **browser_action** tool който е част от Cline и работи за **всички проекти** (не зависи от твоя setup).

**НО** имаш и **Browserbase MCP server** наличен! Виждам го в tools:
- `cHJY3_0mcp0browserbase_session_create`
- `cHJY3_0mcp0browserbase_stagehand_navigate`
- `cHJY3_0mcp0browserbase_stagehand_extract`
- `cHJY3_0mcp0browserbase_stagehand_act`

**Разликата:**

| Feature | Cline Puppeteer | Browserbase MCP |
|---------|----------------|-----------------|
| Setup | Вграден | External service |
| Използва се за | Quick testing | Production scraping |
| Rate limits | N/A (local) | Обикаля scraping limits |
| Cost | Free | Плащано (но имаш го) |
| Capabilities | Basic | AI-powered (Stagehand) |

---

## 🚀 Препоръчителен план

### Краткосрочно (ДНЕС):

1. **Добави delay в HTML viewer** (600ms между company detail calls)
2. **Тествай с по-малко candidates** (limit=2 вместо 5)

### Средносрочно (ТАЗИ СЕДМИЦА):

1. **Имплементирай cache** в proxy server
2. **Batch processing** в Edge Function

### Дългосрочно (СЛЕДВАЩА СЕДМИЦА):

1. **Migrate към Browserbase MCP** за scraping
2. **Background worker** за enrichment
3. **Redis cache** за production

---

## 🎯 Препоръчвам СЕГА

**Най-лесното решение:**

Използвай **Browserbase MCP за HTML viewer** вместо API!

Ще направя пример ако искаш? Това ще заобиколи rate limit напълно! 🚀
