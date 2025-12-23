# NSocks Proxy - Успешен Тест и Deployment План

## ✅ ТЕСТ РЕЗУЛТАТ - УСПЕШЕН!

```
Total tested: 5
✅ Successful: 5 (100%)
❌ Failed: 0
⏱️  Average response time: 3003ms (~3 секунди)
```

### Работещи Bulgarian Proxies:

```
1. 5.78.24.25:20682 (3139ms)
2. 5.78.24.25:20683 (2772ms)
3. 5.78.24.25:20684 (3030ms)
4. 5.78.24.25:20685 (2983ms)
5. 5.78.24.25:20686 (3090ms)
```

Всички proxies са **SOCKS5 протокол** и работят с CompanyBook API! 🚀

---

## 📱 Важно: Cloud Phone / Static IP - НЕ Е Нужен!

### ❓ Въпросът:
> "Дали мога да setupна един cloud phone или личен laptop и да го настроя със static IP и как да направя така че постоянно да може да се използва?"

### ✅ Отговор: **НЕ, не е нужно!**

Ето как работи NSocks системата:

### 🔄 Как работят NSocks proxies:

```
┌─────────────────────────┐
│   Supabase Edge Func    │  (Това ти вика NSocks API)
│   (некой IP адрес)      │
└───────────┬─────────────┘
            │
            │ 1. Вика NSocks API за proxy листа
            ↓
┌─────────────────────────┐
│   NSocks API Server     │
│   api.nsocks.com        │
└───────────┬─────────────┘
            │
            │ 2. Връща списък с български proxies
            ↓
┌─────────────────────────┐
│  Bulgarian Proxies      │
│  5.78.24.25:20682       │  (NSocks ги управлява, не ти!)
│  5.78.24.25:20683       │
└───────────┬─────────────┘
            │
            │ 3. Твоят код използва proxy за заявка
            ↓
┌─────────────────────────┐
│  CompanyBook API        │
│  api.companybook.bg     │
└─────────────────────────┘
```

### 🎯 Какво означава това за теб:

1. **НЕ трябва** да държиш собствен laptop включен 24/7
2. **НЕ трябва** да настройваш cloud phone със static IP
3. **НЕ управляваш** самите proxies - NSocks го прави вместо теб
4. **Proxies работят** през NSocks инфраструктурата

### 🔐 Какво трябва да направиш:

#### За текущата среда (твоя локален компютър):

✅ **Вече направено:**
- Добавил си IP `91.223.100.77` в NSocks IP Allowlist
- Този IP може да вика NSocks API за proxies

#### За Production (Supabase):

Когато deploy-неш в Supabase Edge Functions, те ще викат NSocks API от **техен IP адрес**. Ще трябва да добавиш този IP в allowlist-а когато първо deploy-неш.

**Как да разбереш IP-то на Supabase:**
```typescript
// В Edge Function-а добави временно:
console.log('My IP:', await (await fetch('https://api.ipify.org')).text());
```

После виж logs в Supabase Dashboard и добави това IP в NSocks allowlist.

---

## 🚀 Deployment План

### Вариант 1: Direct Integration в Supabase Edge Functions

**Предимства:**
- Няма нужда от допълнителен сървър
- Proxies се rotating автоматично
- Бърз deployment

**Стъпки:**

#### 1. Update users_pending_worker за NSocks

Създай нов файл `supabase/functions/users_pending_worker/nsocks.ts`:

```typescript
import { SocksProxyAgent } from 'npm:socks-proxy-agent@8';

const NSOCKS_API_KEY = Deno.env.get('NSOCKS_API_KEY') || '';
const NSOCKS_API_URL = `https://api.nsocks.com/web_v1/ip/get-ip-v3?num=10&cc=BG&protocol=1&format=txt&life=30&pt=9&app_key=${NSOCKS_API_KEY}`;

let proxyCache: string[] = [];
let proxyIndex = 0;
let lastFetch = 0;

async function getProxies(): Promise<string[]> {
  const now = Date.now();
  
  // Refresh proxies every 25 minutes (life=30)
  if (now - lastFetch > 25 * 60 * 1000 || proxyCache.length === 0) {
    try {
      const response = await fetch(NSOCKS_API_URL);
      const text = await response.text();
      proxyCache = text.trim().split(/\r?\n/).filter(line => line.trim());
      lastFetch = now;
      proxyIndex = 0;
      console.log(`✅ Fetched ${proxyCache.length} proxies from NSocks`);
    } catch (error) {
      console.error('❌ Failed to fetch NSocks proxies:', error);
      // Use old cache if available
    }
  }
  
  return proxyCache;
}

export async function getNextProxy(): Promise<string | null> {
  const proxies = await getProxies();
  
  if (proxies.length === 0) {
    return null;
  }
  
  const proxy = proxies[proxyIndex % proxies.length];
  proxyIndex++;
  
  return proxy;
}

export async function createProxyAgent(): Promise<any | undefined> {
  const proxy = await getNextProxy();
  
  if (!proxy) {
    return undefined;
  }
  
  const [host, port] = proxy.split(':');
  const proxyUrl = `socks5://${host}:${port}`;
  
  return new SocksProxyAgent(proxyUrl);
}
```

#### 2. Update CompanyBook API calls

В `index.ts` промени fetch calls да използват proxy:

```typescript
import { createProxyAgent } from './nsocks.ts';

// Example usage:
const agent = await createProxyAgent();

const response = await fetch(companyBookUrl, {
  agent,  // Add proxy agent
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json'
  }
});
```

#### 3. Set Environment Variables

В Supabase Dashboard → Edge Functions → Settings:

```bash
NSOCKS_API_KEY=caf457626467d5c4ee3af3a583238a0d
```

#### 4. Get Supabase Edge Function IP

Deploy променената функция и провери logs за да видиш IP-то:

```bash
supabase functions deploy users_pending_worker
```

After first run, check logs and add IP to NSocks allowlist.

---

### Вариант 2: Proxy Middleware Server (По-сложно)

Ако искаш собствен proxy middleware:

```
You → Deploy Server (Railway/Render) → NSocks → CompanyBook
          ↑
    Runs 24/7, no laptop needed
```

**Стъпки:**

1. **Deploy `server/companybook_proxy.mjs` to Railway:**

```bash
# Вече имаш Railway config в railway.json
railway up
```

2. **Set ENV variables на Railway:**
```bash
NSOCKS_API_KEY=caf457626467d5c4ee3af3a583238a0d
```

3. **Get Railway IP и добави в NSocks allowlist**

4. **Update Supabase ENV:**
```bash
COMPANYBOOK_PROXY=https://your-app.railway.app
```

---

## 🎯 Препоръка: Кое да избереш?

### ✅ Препоръчвам **Вариант 1** (Direct Integration):

**Защо:**
- По-просто
- По-бързо
- Няма допълнителни сървъри да поддържаш
- NSocks rotating се случва директно в Edge Function
- По-евтино (no Railway costs)

**Минуси:**
- Всеки Edge Function runtime environment трябва да whitelist-неш IP-то му
- Трябва да добавиш NSocks код в Edge Function

### Вариант 2 е добър ако:
- Искаш централизиран proxy service за няколко различни services
- Искаш да следиш proxy usage статистика на едно място
- Имаш нужда от custom proxy logic

---

## 📋 Next Steps (Препоръчвам Вариант 1):

### Готово ✅:
- [x] NSocks account setup
- [x] IP whitelist (91.223.100.77)
- [x] Proxies тествани - 100% работят
- [x] SOCKS5 protocol confirmed

### Следва 🔨:
- [ ] Създай `nsocks.ts` helper в Edge Function
- [ ] Update `index.ts` за използване на proxies
- [ ] Deploy в Supabase
- [ ] Провери logs за Supabase IP
- [ ] Добави Supabase IP в NSocks allowlist
- [ ] Test production deployment

---

## 💡 Важни Бележки

### NSocks IP Allowlist:

**Трябва да добавиш различни IP-та за:**
1. ✅ Твоя локален компютър (91.223.100.77) - вече добавено
2. ⏳ Supabase Edge Functions IP (след deployment)
3. ⏳ Development машина (ако тестваш от друго място)

### NSocks Package Info:

Виж в dashboard-а:
- **Package status:** Активен ли е
- **Remaining bandwidth:** Колко трафик ти остава
- **Expiration date:** Кога изтича package-а
- **Daily limit:** Дневен лимит на заявки

### Performance:

- **Без proxy:** ~500-1000ms response time
- **С NSocks proxy:** ~3000ms (3s) response time
- **Trade-off:** По-бавно, но неограничен брой заявки

---

## 🎊 Заключение

**Отговор на въпроса ти:**

> **НЕ, не трябва** да държиш laptop включен или да setupваш cloud phone със static IP!

NSocks работят като **managed proxy service**:
- ТЕ управляват proxies (5.78.24.25:XXXX)
- ТИ само викаш техния API за списък с proxies
- Proxies се refreshват автоматично
- Няма нужда от 24/7 машина

**Единственото което трябва:**
- Whitelist-ни IP адресите от които викаш NSocks API (локален компютър, Supabase, etc.)
- Използвай proxies в кода си
- That's it! 🎉

Кажи ми кой вариант искаш да използваме и ще помогна с deployment! 🚀
