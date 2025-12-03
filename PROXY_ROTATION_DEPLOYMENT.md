# Dynamic Proxy Rotation - Deployment Guide

## 📋 Overview

Система за динамична ротация на проксита с визуален мониторинг в реално време.

## 🎯 Components Created

### 1. DynamicProxyRotator (`browserbase-worker/lib/DynamicProxyRotator.mjs`)
- **Health tracking** - всеки прокси има health score (0-100%)
- **Automatic rotation** - автоматична ротация на всеки 5 минути
- **Failure recovery** - автоматично превключване при грешки
- **Statistics** - детайлна статистика за requests, successes, failures
- **Country verification** - проверка дали проксито е от правилната държава

### 2. Proxy Status API Server (`server/proxy_status_server.mjs`)
- **Real-time API** на порт 4322
- Endpoints:
  - `GET /status` - пълен статус на всички проксита
  - `GET /stats` - само статистика
  - `GET /proxies` - списък с проксита
  - `GET /current` - текущо активно прокси
  - `POST /rotate` - форсирана ротация
  - `POST /recover` - възстановяване на проксита с нисък health
  - `POST /reset` - reset на статистиката
  - `GET /success/:id` - маркиране на успешна заявка
  - `GET /failure/:id?error=msg` - маркиране на неуспешна заявка
  - `GET /verified/:id?country=XX` - маркиране като verified

### 3. Updated Viewers
- **registry_results_viewer.html** - добавен proxy status panel
- **registry_pipeline_visual.html** - (готово за update)

## 🚀 Deployment Steps

### Step 1: Install Dependencies (ако има нови)
```bash
cd /home/administrator/Documents/registry_stagehand_worker
npm install
```

### Step 2: Configure Proxies
Конфигурирай проксита в environment variables или в `.env` file:

```bash
# Proxy 1
PROXY_1_ENABLED=true
PROXY_1_TYPE=custom
PROXY_1_URL=http://your-proxy-1:port
PROXY_1_USERNAME=user1
PROXY_1_PASSWORD=pass1
PROXY_1_REGION=BG
PROXY_1_GEO=default

# Proxy 2
PROXY_2_ENABLED=true
PROXY_2_TYPE=custom
PROXY_2_URL=http://your-proxy-2:port
PROXY_2_USERNAME=user2
PROXY_2_PASSWORD=pass2
PROXY_2_REGION=BG

# Proxy 3
PROXY_3_ENABLED=true
PROXY_3_TYPE=browserbase
PROXY_3_REGION=BG

# Proxy 4
PROXY_4_ENABLED=false
```

### Step 3: Start Proxy Status Server
```bash
# Terminal 1 - Proxy Status Server
node server/proxy_status_server.mjs
```

Сървърът ще стартира на http://localhost:4322 и ще започне автоматична ротация.

### Step 4: Start CompanyBook Proxy (existing)
```bash
# Terminal 2 - CompanyBook API Proxy
node server/companybook_proxy.mjs
```

### Step 5: Open Viewers
```bash
# Open in browser
firefox docs/registry_results_viewer.html
# or
firefox docs/registry_pipeline_visual.html
```

## 📊 Visual Dashboard Features

### Proxy Status Panel Shows:
1. **Overall Statistics**
   - Uptime (minutes)
   - Healthy Proxies count
   - Total Requests
   - Success Rate (%)

2. **Individual Proxy Cards**
   - Name and ID
   - Current status (IDLE/ACTIVE/ERROR/ROTATING)
   - Health percentage (color-coded)
   - Request statistics (total, success, failures)
   - Last used timestamp
   - Verification status (country)
   - Last error message (if any)

3. **Auto-refresh**
   - Auto-refresh every 10 seconds
   - Manual refresh button

## 🔧 Integration with Existing Workers

### For registryWorker.mjs or similar:
```javascript
import { DynamicProxyRotator } from './lib/DynamicProxyRotator.mjs';
import { getProxiesConfig } from './config/proxies.mjs';

// Initialize rotator
const proxies = getProxiesConfig();
const rotator = new DynamicProxyRotator(proxies);
rotator.startAutoRotation(5 * 60 * 1000); // 5 minutes

// In your worker loop:
async function processJob() {
  const proxy = rotator.getNext();
  
  try {
    // Use proxy for request
    const result = await makeRequest(proxy);
    
    // Mark success
    rotator.markSuccess(proxy.id);
    
  } catch (error) {
    // Mark failure
    rotator.markFailure(proxy.id, error.message);
    
    // Optionally force rotation
    if (error.isProxyError) {
      rotator.rotateNow();
    }
  }
}
```

### Report to Proxy Status Server:
```javascript
// After successful request
await fetch(`http://localhost:4322/success/${proxy.id}`);

// After failed request
await fetch(`http://localhost:4322/failure/${proxy.id}?error=${encodeURIComponent(error.message)}`);

// After verification
await fetch(`http://localhost:4322/verified/${proxy.id}?country=BG`);
```

## 🎨 Customization

### Change Rotation Interval:
```javascript
// In server/proxy_status_server.mjs
rotator.startAutoRotation(10 * 60 * 1000); // 10 minutes instead of 5
```

### Enable Simulation Mode (for testing):
```bash
SIMULATE_ACTIVITY=true node server/proxy_status_server.mjs
```

### Adjust Health Recovery:
```javascript
// In DynamicProxyRotator.mjs
proxy.health = Math.min(100, proxy.health + 10); // More aggressive recovery
```

## 📈 Monitoring

### Check Current Status:
```bash
curl http://localhost:4322/status | jq
```

### Force Rotation:
```bash
curl -X POST http://localhost:4322/rotate
```

### Recover Proxies:
```bash
curl -X POST http://localhost:4322/recover
```

### Reset Statistics:
```bash
curl -X POST http://localhost:4322/reset
```

## 🐛 Troubleshooting

### Proxy server not starting:
- Check if port 4322 is available
- Check proxy configuration in config/proxies.mjs
- Check environment variables

### Proxies showing 0% health:
```bash
curl -X POST http://localhost:4322/recover
```

### Viewer not showing proxy status:
- Ensure proxy_status_server.mjs is running on port 4322
- Check browser console for CORS errors
- Refresh manually with the 🔄 button

## 🔐 Security Notes

1. **Proxy credentials** - Store in environment variables, not in code
2. **API access** - The status server has no authentication, consider adding if exposed
3. **CORS** - Currently allows all origins (`*`), restrict in production

## 📝 Next Steps

1. ✅ Integrate rotator with existing workers (registryWorker, etc.)
2. ✅ Add proxy verification step before use
3. ✅ Set up monitoring alerts (webhook on low health)
4. ✅ Add logging to file for analysis
5. ✅ Create dashboard for historical data

## 🎉 Benefits

- ✅ **Automatic rotation** - No manual intervention needed
- ✅ **Health tracking** - Know which proxies are working
- ✅ **Visual monitoring** - See status in real-time
- ✅ **Failure recovery** - Auto-switch on errors
- ✅ **Statistics** - Track usage and success rates
- ✅ **Easy integration** - Simple API for workers

---

**Status**: ✅ Ready for deployment
**Version**: 1.0
**Date**: 2025-12-03
