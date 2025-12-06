# 🚂 Railway Deployment Guide - CompanyBook Proxy
**Дата:** 3 Декември 2025, 16:50 EET  
**Цел:** Deploy CompanyBook Proxy to Railway.app for public access

---

## 📋 Pre-Deployment Checklist

### ✅ Completed
- [x] Railway CLI installed (`npm install -g @railway/cli`)
- [x] `railway.json` configuration created
- [x] `package.json` updated with start scripts
- [x] CompanyBook proxy tested locally (PID 1871182, Port 4321)

### 📝 Needed
- [ ] Railway account (sign up at https://railway.app)
- [ ] Railway login completed
- [ ] Project deployed
- [ ] Public URL obtained
- [ ] Supabase Edge Function updated with proxy URL

---

## 🚀 Step-by-Step Deployment

### Step 1: Create Railway Account (if not already)

1. Go to https://railway.app
2. Click "Login" or "Start a New Project"
3. Sign up with GitHub (recommended) or email
4. Verify your account

**Why Railway?**
- ✅ Free tier: $5 credit/month
- ✅ Easy deployment
- ✅ Public URLs automatically
- ✅ Good for Node.js apps
- ✅ Real-time logs

---

### Step 2: Login to Railway CLI

```bash
# In terminal, run:
railway login

# This will:
# 1. Open browser for authentication
# 2. Ask you to authorize the CLI
# 3. Return to terminal when done
```

**Expected output:**
```
🚝 Logging in...
✔ Open the browser to continue: https://railway.app/cli-login?...
✔ Logged in as your-email@example.com
```

---

### Step 3: Initialize Railway Project

```bash
cd /home/administrator/Documents/registry_stagehand_worker

# Initialize new Railway project
railway init

# You'll be asked:
# "Enter your project name:" → companybook-proxy
# "Select a starter template:" → Empty Project (press Enter)
```

**Expected output:**
```
🎉 Created project companybook-proxy
✔ Linked to project companybook-proxy
```

---

### Step 4: Deploy to Railway

```bash
# Deploy the project
railway up

# This will:
# 1. Package your code
# 2. Upload to Railway
# 3. Install dependencies (npm install)
# 4. Start the server (npm start)
# 5. Give you a deployment URL
```

**Expected output:**
```
🚀 Uploading...
✔ Build started
✔ Build successful
✔ Deployment successful
🌐 Deployment URL: https://companybook-proxy-production-xxxx.up.railway.app
```

**⚠️ SAVE THIS URL!** You'll need it for the Edge Function.

---

### Step 5: Verify Deployment

```bash
# Test health endpoint
curl https://your-railway-url.up.railway.app/health

# Expected: {"status":"ok","timestamp":"..."}

# Test person search
curl "https://your-railway-url.up.railway.app/person-search?name=Даниел%20Миленов%20Мартинов"

# Expected: JSON with person data
```

---

### Step 6: Configure Port (if needed)

Railway automatically assigns a PORT environment variable. Our proxy uses:
```javascript
const PORT = process.env.PORT || 4321;
```

So it should work automatically! But if you see errors, you can set it manually:

```bash
# Set PORT variable in Railway
railway variables set PORT=4321
```

Check in Railway Dashboard:
- Go to https://railway.app/dashboard
- Select "companybook-proxy" project
- Click "Variables" tab
- Should see: PORT = (automatically assigned by Railway)

---

### Step 7: Check Logs

```bash
# View real-time logs
railway logs

# Or in Railway Dashboard:
# Project → Deployments → Click latest → Logs
```

**Healthy logs should show:**
```
[CompanyBook Proxy] Server running on port 4321
[CompanyBook Proxy] Health check: OK
```

---

### Step 8: Get Public URL

```bash
# Get deployment URL
railway domain

# Or find in Railway Dashboard:
# Project → Settings → Domains
```

**Example URL:**
```
https://companybook-proxy-production-a1b2c3.up.railway.app
```

**Copy this URL** - you'll use it as `COMPANYBOOK_PROXY` environment variable.

---

## 🔧 Update Supabase Edge Function

### Option A: Via Supabase CLI

```bash
# Set environment variable
supabase secrets set COMPANYBOOK_PROXY=https://your-railway-url.up.railway.app

# Deploy Edge Function
cd supabase/functions/users_pending_worker
supabase functions deploy users_pending_worker

# Verify
supabase functions logs users_pending_worker --tail
```

Look for log: `[users_pending_worker] Using CompanyBook API: PROXY`

---

### Option B: Via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/functions
2. Select or create `users_pending_worker` function
3. Copy code from: `supabase/functions/users_pending_worker/index.ts`
4. Paste into editor
5. Click **"Settings"** or **"Secrets"**
6. Add new secret:
   - **Name:** `COMPANYBOOK_PROXY`
   - **Value:** `https://your-railway-url.up.railway.app`
7. Save
8. Deploy/Redeploy function

---

## 🧪 End-to-End Test

### Test 1: Railway Proxy Works

```bash
# Health check
curl https://your-railway-url.up.railway.app/health

# Expected: {"status":"ok",...}

# Person search
curl "https://your-railway-url.up.railway.app/person-search?name=Даниел%20Миленов%20Мартинов"

# Expected: JSON with person data including companies
```

### Test 2: Edge Function Uses Proxy

```bash
# Call Edge Function with test user
curl -X POST \
  'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "full_name": "Даниел Миленов Мартинов",
    "email": "test@example.com",
    "status": "pending"
  }'

# Expected output:
# {
#   "status": "ok",
#   "owner_id": "...",
#   "full_name": "Даниел Миленов Мартинов",
#   "companies": [...],
#   "phone_number": "+358...",
#   "email_alias": "...",
#   ...
# }

# Check logs to confirm proxy usage
supabase functions logs users_pending_worker --tail
# Should see: "[users_pending_worker] Using CompanyBook API: PROXY - https://your-railway-url..."
```

### Test 3: Database Population

```sql
-- Check verified_owners table
SELECT 
  id, full_name, 
  array_length(companies_slim, 1) as num_companies,
  phone_number, email_alias,
  created_at
FROM verified_owners 
WHERE full_name ILIKE '%Даниел%'
ORDER BY created_at DESC 
LIMIT 1;

-- Expected: 1 row with Даниел's data

-- Check users_pending status
SELECT id, full_name, owner_id, status 
FROM users_pending 
WHERE status = 'ready_for_stagehand'
ORDER BY created_at DESC 
LIMIT 5;

-- Expected: User with status = 'ready_for_stagehand'
```

---

## 📊 Railway Dashboard Overview

### Project Dashboard
- **URL:** https://railway.app/dashboard
- **Project:** companybook-proxy
- **Service:** companybook-proxy

### Tabs:
1. **Overview** - Deployment status, metrics
2. **Deployments** - History of deploys
3. **Logs** - Real-time application logs
4. **Metrics** - CPU, Memory, Network usage
5. **Variables** - Environment variables
6. **Settings** - General project settings
7. **Domains** - Public URL configuration

### Important Metrics to Monitor:
- **CPU Usage:** Should be < 50% normally
- **Memory:** Should be < 512 MB
- **Requests:** Track request rate
- **Errors:** Should be 0 in normal operation

---

## 🔄 Update & Redeploy

If you make changes to the proxy code:

```bash
cd /home/administrator/Documents/registry_stagehand_worker

# Make your changes to server/companybook_proxy.mjs

# Redeploy
railway up

# Check logs
railway logs
```

**Note:** Railway automatically redeploys on git push if you connect the GitHub repo.

---

## 🆘 Troubleshooting

### Issue 1: "railway: command not found" after install

**Solution:**
```bash
# Check npm global bin path
npm config get prefix

# Should be something like /home/administrator/.nvm/versions/node/v20.x.x

# Add to PATH if needed
export PATH="$PATH:$(npm config get prefix)/bin"

# Or reinstall
npm install -g @railway/cli
```

### Issue 2: "Error: No project linked"

**Solution:**
```bash
# Re-initialize
railway init

# Link to existing project
railway link
```

### Issue 3: Deployment succeeds but returns 502/503

**Solution:**
- Check PORT is set correctly (Railway auto-sets it)
- Verify proxy is listening on `0.0.0.0`, not `localhost`
- Check Railway logs: `railway logs`

### Issue 4: "CompanyBook API still returns errors"

**Solution:**
- Test Railway URL directly: `curl https://your-url/health`
- Check CompanyBook API keys if required
- Verify proxy code handles errors properly
- Check Railway logs for detailed error messages

### Issue 5: Edge Function still shows "DIRECT" not "PROXY"

**Solution:**
```bash
# Verify environment variable is set
supabase secrets list

# Should show:
# COMPANYBOOK_PROXY=https://your-railway-url...

# If not showing, set it again
supabase secrets set COMPANYBOOK_PROXY=https://your-railway-url.up.railway.app

# Redeploy Edge Function
supabase functions deploy users_pending_worker
```

---

## 💰 Railway Pricing & Limits

### Free Tier
- **Credit:** $5/month
- **Limitations:**
  - ~500 hours of runtime/month
  - Shared resources
  - Good for development & testing

### Costs
- **Typical usage for proxy:** ~$2-5/month
- **Overage:** If you exceed $5, you'll need to upgrade

### Monitor Usage:
- Dashboard → Usage tab
- Set up billing alerts
- Optimize code to reduce runtime

---

## 🎯 Next Steps After Deployment

### 1. Update Documentation
```bash
# Update READY_TO_DEPLOY_SUMMARY.md with Railway URL
echo "COMPANYBOOK_PROXY=https://your-railway-url.up.railway.app" >> .env.production
```

### 2. Test Complete Workflow
- Test with 3 real names
- Verify Edge Function processes correctly
- Check database has new verified_owners
- Confirm phone allocation works

### 3. Add Monitoring
- Setup error alerts in Railway
- Configure uptime monitoring (e.g., UptimeRobot)
- Add logging to Supabase for tracking

### 4. Scale Up
- Add more SMS numbers to pool (10+ numbers)
- Test with higher volume
- Monitor Railway metrics

### 5. Configure Domain (Optional)
```bash
# Add custom domain in Railway
railway domain add proxy.walle.bg

# Configure DNS:
# CNAME proxy.walle.bg → your-railway-url.up.railway.app
```

---

## 📞 Quick Reference Commands

```bash
# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# View logs
railway logs

# Check status
railway status

# Get URL
railway domain

# Set environment variable
railway variables set KEY=value

# Link to existing project
railway link

# Open dashboard
railway open
```

---

## ✅ Success Criteria

Deployment is successful when:

- [x] Railway URL is accessible
- [x] `/health` endpoint returns `{"status":"ok"}`
- [x] `/person-search?name=Test` returns JSON data
- [x] Supabase Edge Function uses proxy (logs show "PROXY")
- [x] Edge Function returns `owner_id` for valid names
- [x] Database tables populated correctly
- [x] No errors in Railway logs
- [x] Response time < 3 seconds

---

## 🔗 Resources

- **Railway Docs:** https://docs.railway.app
- **Railway CLI:** https://docs.railway.app/develop/cli
- **Pricing:** https://railway.app/pricing
- **Dashboard:** https://railway.app/dashboard
- **Status:** https://railway.app/status

---

**Last Updated:** 3 Декември 2025, 16:50 EET  
**Status:** ✅ Ready to deploy  
**Next Action:** Run `railway login` and follow this guide
