# 🔧 Deploy users_pending_worker with Proxy Support
**Date:** 3 December 2025  
**Priority:** 🔴 HIGH  
**Status:** Ready to deploy

---

## 🎯 What Was Fixed

**Problem:** The `users_pending_worker` Edge Function was trying to call CompanyBook API directly from Supabase cloud, but CompanyBook blocks cloud/datacenter IPs.

**Solution:** Added `COMPANYBOOK_PROXY` environment variable support so the Edge Function can route requests through our local proxy server.

---

## 📝 Changes Made

### File Modified
- `supabase/functions/users_pending_worker/index.ts`

### Key Changes
```typescript
// BEFORE:
const COMPANYBOOK_API_BASE = "https://api.companybook.bg/api";

// AFTER:
const COMPANYBOOK_PROXY = Deno.env.get("COMPANYBOOK_PROXY");
const COMPANYBOOK_API_BASE = COMPANYBOOK_PROXY || "https://api.companybook.bg/api";

console.log(`[users_pending_worker] Using CompanyBook API: ${COMPANYBOOK_PROXY ? 'PROXY' : 'DIRECT'} - ${COMPANYBOOK_API_BASE}`);
```

### Added Functions
- `getCompanyDetails(uic: string)` - Fetch company details for building companies_slim array

---

## 🚀 Deployment Steps

### Option A: Deploy to Cloud (Recommended for Production)

#### Step 1: Deploy CompanyBook Proxy to Cloud
Before deploying the Edge Function, you need to deploy the proxy server to a public URL.

**Option 1: Railway.app (Easiest)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy proxy
cd /home/administrator/Documents/registry_stagehand_worker
railway up --service companybook-proxy

# Set start command in Railway dashboard:
# node server/companybook_proxy.mjs
```

**Option 2: Fly.io**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Deploy
cd /home/administrator/Documents/registry_stagehand_worker
flyctl launch --name companybook-proxy
flyctl deploy
```

**Option 3: VPS (DigitalOcean, Linode, etc.)**
```bash
# SSH to your VPS
ssh user@your-vps-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone https://github.com/kirkomrk2-web/registry-stagehand-worker.git
cd registry-stagehand-worker
npm install

# Run with PM2
npm install -g pm2
pm2 start server/companybook_proxy.mjs --name companybook-proxy
pm2 save
pm2 startup

# Setup firewall
sudo ufw allow 4321/tcp
```

#### Step 2: Deploy Edge Function with Proxy URL
```bash
cd /home/administrator/Documents/registry_stagehand_worker/supabase/functions/users_pending_worker

# Deploy function (if you have Supabase CLI)
supabase functions deploy users_pending_worker

# OR manually upload via Supabase Dashboard:
# 1. Go to https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/functions
# 2. Click "Create Function" or select existing "users_pending_worker"
# 3. Copy/paste the entire index.ts content
# 4. Save
```

#### Step 3: Add Environment Variable
```bash
# Via Supabase CLI
supabase secrets set COMPANYBOOK_PROXY=https://your-proxy-url.railway.app

# OR via Supabase Dashboard:
# 1. Go to Project Settings > Edge Functions
# 2. Click "Add Secret"
# 3. Name: COMPANYBOOK_PROXY
# 4. Value: https://your-proxy-url (no trailing slash)
# 5. Save
```

#### Step 4: Test Deployment
```bash
# Test Edge Function
curl -X POST \
  'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "full_name": "Даниел Миленов Мартинов",
    "email": "test@example.com",
    "status": "pending"
  }'

# Expected response:
# {
#   "status": "ok",
#   "owner_id": "...",
#   "full_name": "Даниел Миленов Мартинов",
#   "companies": [...],
#   ...
# }
```

---

### Option B: Local Testing (Quick Test)

If you just want to test locally before cloud deployment:

#### Step 1: Start Local Proxy
```bash
cd /home/administrator/Documents/registry_stagehand_worker
node server/companybook_proxy.mjs
# Should start on http://localhost:4321
```

#### Step 2: Test Edge Function Locally
```bash
# Install Supabase CLI if not already installed
curl https://github.com/supabase/cli/releases/download/v1.27.7/supabase_1.27.7_linux_amd64.deb -L -o supabase.deb
sudo dpkg -i supabase.deb

# Start Supabase local
supabase start

# Serve function locally with proxy env var
cd supabase/functions/users_pending_worker
COMPANYBOOK_PROXY=http://localhost:4321 supabase functions serve users_pending_worker

# Test in another terminal
curl -X POST \
  'http://localhost:54321/functions/v1/users_pending_worker' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "full_name": "Даниел Миленов Мартинов",
    "email": "test@example.com",
    "status": "pending"
  }'
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] CompanyBook proxy is accessible (curl https://your-proxy-url/health)
- [ ] Edge Function logs show "Using CompanyBook API: PROXY"
- [ ] Edge Function can find person data (returns owner_id)
- [ ] verified_owners table gets new records
- [ ] users_pending status updates to "ready_for_stagehand"
- [ ] Phone numbers are allocated
- [ ] Email aliases are generated

---

## 🔍 Troubleshooting

### Issue: Function logs show "DIRECT" instead of "PROXY"
**Solution:** COMPANYBOOK_PROXY env var not set correctly. Check:
```bash
# Via Supabase CLI
supabase secrets list

# Should show:
# COMPANYBOOK_PROXY=https://your-proxy-url
```

### Issue: Function returns "no_match" but person exists
**Solution:** Proxy might be down or unreachable. Check:
```bash
# Test proxy directly
curl https://your-proxy-url/health

# Check proxy logs (if using Railway/Fly)
railway logs --service companybook-proxy
# OR
flyctl logs
```

### Issue: Proxy works locally but not from Supabase
**Solution:** Firewall/CORS issue. Ensure:
1. Proxy server allows requests from Supabase cloud IPs
2. Port is open (4321 or custom)
3. HTTPS is configured if using custom domain

### Issue: "fetch failed" errors
**Solution:** DNS or networking issue. Verify:
```bash
# From your local machine
curl https://your-proxy-url/person-search?name=Test

# Should return JSON, not HTML/error page
```

---

## 📊 Monitoring

### Check Edge Function Logs
```bash
# Via Supabase CLI
supabase functions logs users_pending_worker

# Via Dashboard
# https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/logs/edge-functions
```

### Check Proxy Logs
```bash
# Railway
railway logs --service companybook-proxy

# Fly.io
flyctl logs

# VPS with PM2
pm2 logs companybook-proxy
```

### Monitor Success Rate
```sql
-- Check processed users
SELECT 
  status,
  COUNT(*) as count
FROM users_pending
GROUP BY status;

-- Should show:
-- pending: 0
-- ready_for_stagehand: X
-- no_match: Y (should be minimal)
```

---

## 🎯 Next Steps After Deployment

1. **Test with Real Users**
   - Process 10 test users
   - Verify all data is correct
   - Check phone allocation

2. **Setup Monitoring**
   - Configure error alerts (Sentry)
   - Setup uptime monitoring for proxy
   - Create dashboard for success metrics

3. **Scale Up**
   - Add more SMS numbers to pool
   - Implement rate limiting
   - Add caching layer

4. **Documentation**
   - Update README_FINAL.md with proxy URL
   - Document any edge cases found
   - Create runbook for common issues

---

## 📞 Quick Commands Reference

```bash
# Deploy Edge Function
supabase functions deploy users_pending_worker

# Set environment variable
supabase secrets set COMPANYBOOK_PROXY=https://your-proxy-url

# View logs
supabase functions logs users_pending_worker --tail

# Test function
curl -X POST \
  'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"full_name": "Test User", "email": "test@example.com", "status": "pending"}'

# Check database
psql $DATABASE_URL -c "SELECT * FROM verified_owners ORDER BY created_at DESC LIMIT 5;"
```

---

## 🔗 Related Documentation

- `README_FINAL.md` - Main project overview
- `PROJECT_STATUS_COMPLETE.md` - Full system documentation
- `NEXT_STEPS_ACTION_PLAN.md` - Priority tasks list
- `server/companybook_proxy.mjs` - Proxy server code

---

**Last Updated:** 3 December 2025, 15:44 EET  
**Status:** ✅ Code ready, pending deployment
