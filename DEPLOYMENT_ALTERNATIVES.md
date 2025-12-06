# 🚀 Alternative Deployment Options - CompanyBook Proxy
**Дата:** 3 Декември 2025, 16:57 EET  
**Проблем:** Railway requires payment method even for free tier

---

## ⚠️ Railway Status

**Issue:** `Your account is on a limited plan. Please visit railway.com/account/plans for details.`

**Solution:** Add payment method to Railway account

### Add Payment Method to Railway

1. Go to https://railway.com/account/plans
2. Click "Add Payment Method"
3. Enter credit/debit card details
4. Save

**After adding payment:**
- Free tier: $5 credit/month
- No charges until you exceed $5
- Perfect for CompanyBook proxy (usually $2-3/month)

**Then retry deployment:**
```bash
cd /home/administrator/Documents/registry_stagehand_worker
/home/administrator/.npm-global/bin/railway up
```

---

## 🌐 Alternative Option 1: Fly.io (Recommended if Railway doesn't work)

### Install Fly CLI

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Add to PATH
export PATH="$HOME/.fly/bin:$PATH"

# Login
flyctl auth login
```

### Deploy to Fly.io

```bash
cd /home/administrator/Documents/registry_stagehand_worker

# Create fly.toml
cat > fly.toml << 'EOF'
app = "companybook-proxy"

[build]

[env]
  PORT = "8080"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
EOF

# Launch app
flyctl launch --name companybook-proxy --region ams

# Deploy
flyctl deploy

# Get URL
flyctl info
```

**URL будет:** `https://companybook-proxy.fly.dev`

---

## 🖥️ Alternative Option 2: Simple VPS (DigitalOcean, Linode, etc.)

### Setup on VPS ($5/month droplet)

```bash
# 1. Create droplet on DigitalOcean/Linode
# Choose: Ubuntu 22.04, $5/month

# 2. SSH to server
ssh root@your-server-ip

# 3. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Install PM2
npm install -g pm2

# 5. Clone project
git clone https://github.com/kirkomrk2-web/registry-stagehand-worker.git
cd registry-stagehand-worker

# 6. Install dependencies
npm install

# 7. Start with PM2
pm2 start server/companybook_proxy.mjs --name companybook-proxy

# 8. Save PM2 process
pm2 save
pm2 startup

# 9. Setup Nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/proxy

# Add this config:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/proxy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 10. Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

**URL:** `https://your-domain.com`

---

## 🔥 Alternative Option 3: Heroku (Simple but paid)

### Deploy to Heroku

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install-ubuntu.sh | sh

# Login
heroku login

# Create app
cd /home/administrator/Documents/registry_stagehand_worker
heroku create companybook-proxy

# Create Procfile
echo "web: node server/companybook_proxy.mjs" > Procfile

# Commit changes
git add Procfile
git commit -m "Add Procfile for Heroku"

# Deploy
git push heroku main

# Get URL
heroku info
```

**URL:** `https://companybook-proxy-xxxx.herokuapp.com`

**Cost:** $7/month (Eco dyno)

---

## 📦 Alternative Option 4: Vercel Serverless (Edge Functions)

### Convert proxy to Vercel Edge Function

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Create api/proxy.js
mkdir -p api
cat > api/proxy.js << 'EOF'
export default async function handler(req, res) {
  const { name } = req.query;
  
  if (req.url.includes('/health')) {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }
  
  if (req.url.includes('/person-search')) {
    const apiUrl = `https://api.companybook.bg/api/get-person?name=${encodeURIComponent(name)}`;
    
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  
  return res.status(404).json({ error: 'Not found' });
}
EOF

# Create vercel.json
cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    { "src": "api/**/*.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/health", "dest": "/api/proxy" },
    { "src": "/person-search", "dest": "/api/proxy" }
  ]
}
EOF

# Deploy
vercel

# Production deploy
vercel --prod
```

**URL:** `https://your-project.vercel.app`

**Cost:** FREE!

---

## ⚡ Alternative Option 5: Supabase Edge Function as Proxy

### Create proxy Edge Function

```typescript
// supabase/functions/companybook_proxy/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  
  // Health check
  if (url.pathname === "/health") {
    return new Response(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
  
  // Person search
  if (url.pathname === "/person-search") {
    const name = url.searchParams.get("name");
    
    if (!name) {
      return new Response(
        JSON.stringify({ error: "Name parameter required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    try {
      const apiUrl = `https://api.companybook.bg/api/get-person?name=${encodeURIComponent(name)}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  
  return new Response("Not found", { status: 404 });
});
```

**Deploy:**
```bash
cd supabase/functions
supabase functions deploy companybook_proxy

# URL will be:
# https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/companybook_proxy
```

**Pros:**
- Free (Supabase has generous limits)
- Already integrated
- No extra service needed

**Cons:**
- Supabase IPs might still be blocked by CompanyBook
- But worth trying!

---

## 🎯 Recommendation

### Best Options в order:

1. **Add payment to Railway** (easiest, already setup)
   - Add card to railway.com/account/plans
   - Retry `railway up`
   - Done!

2. **Fly.io** (if Railway doesn't work)
   - Free tier is generous
   - Easy deployment
   - Good performance

3. **Simple VPS** (most control)
   - $5/month DigitalOcean
   - Full control
   - Can use for other services too

4. **Vercel Serverless** (quickest free option)
   - Completely free
   - Fast setup
   - But might have same IP block issue

5. **Supabase Edge Function** (worth trying first!)
   - Already using Supabase
   - Free
   - Might work or might have IP blocks

---

## 🧪 Quick Test: Supabase Edge Function Proxy

Let me create this right now as it's the quickest to test:

```bash
# Create directory
mkdir -p supabase/functions/companybook_proxy

# Create index.ts (see above)

# Deploy
supabase functions deploy companybook_proxy

# Test
curl "https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/companybook_proxy/health"
curl "https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/companybook_proxy/person-search?name=Даниел%20Миленов%20Мартинов"
```

**If this works:**
- Use: `https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/companybook_proxy`
- As COMPANYBOOK_PROXY environment variable
- No extra service needed!

**If this doesn't work (IP block):**
- Add payment to Railway OR
- Use Fly.io OR  
- Get a $5 VPS

---

## 📝 Next Steps

### Option A: Railway (if you add payment)
```bash
# Add payment at railway.com/account/plans
railway up
railway domain
# Copy URL → Use as COMPANYBOOK_PROXY
```

### Option B: Try Supabase Edge Function Proxy
```bash
# I'll create this for you now
# Test if it works
# If yes, use immediately
```

### Option C: Fly.io
```bash
curl -L https://fly.io/install.sh | sh
flyctl auth login
flyctl launch
flyctl deploy
```

---

**Last Updated:** 3 Декември 2025, 16:57 EET  
**Current Status:** Railway needs payment method  
**Recommended:** Try Supabase Edge Function first (free, quick)
