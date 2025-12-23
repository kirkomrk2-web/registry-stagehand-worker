# WebAgentPro - AI SaaS Blueprint (На Български)

## 🎯 Какво Строим

**WebAgentPro** е AI-powered SaaS платформа, която позволява на потребителите да автоматизират web задачи чрез естествен език. Използва Claude 3.5 Haiku AI agent с Airtop Browser за изпълнение на сложни browser automation задачи.

**Примери за употреба:**
- "Намери топ 10 продукта в ProductHunt и извади данните в JSON"
- "Попълни формата на този сайт с тези данни"
- "Направи research на конкурентите в тази индустрия"
- "Извади всички контакти от тази LinkedIn страница"

---

## 1. N8N AUTOMATION - Моят Backend

### Какво прави?
Използва Claude 3.5 Haiku AI agent с Airtop Browser Agent за автоматизиране на web интеракции. AI-ят може да:
- Натиска бутони и линкове
- Попълва форми
- Извлича информация от страници
- Навигира през сайтове
- Query-ва съдържание на страници

### Input Format
```json
{
  "job_id": "uuid-от-нашата-база",
  "prompt": "Текстова инструкция от потребителя",
  "airtop_profile": "име-на-profile (optional)"
}
```

### Output Format
```json
{
  "job_id": "uuid-от-нашата-база",
  "status": "completed | failed",
  "results": "Synthesis на резултатите от AI agent-а",
  "execution_time": 45.2,
  "session_id": "airtop-session-id",
  "live_view_url": "https://app.airtop.ai/sessions/xxx/live"
}
```

### Колко време отнема?
- Прости задачи: 10-30 секунди
- Средни задачи: 30-90 секунди
- Сложни задачи: 2-5 минути

### Webhook URLs
```
POST от нашата app КЪМ n8n:
https://n8n.srv1201204.hstgr.cloud/webhook/webagentpro-jobs

POST от n8n КЪМ нашата app:
https://webagentpro.com/api/webhooks/n8n
```

---

## 2. FRONTEND ✅ Pre-configured

**Framework:** Next.js 14 с App Router (НЕ Pages Router)
**Styling:** Tailwind CSS + shadcn/ui компоненти
**Защо:** Frontend + API в един проект, лесен deploy, AI го познава добре

### Страници

#### `/` - Landing Page
- Hero секция с примери
- Features (AI automation, browser control, structured output)
- Pricing таблица
- CTA за signup

#### `/login` - Login Page
- Email/Password форма
- "Forgot password" link
- Google OAuth бутон (optional)

#### `/signup` - Registration Page
- Email/Password/Confirm форма
- Terms of Service checkbox
- Google OAuth signup (optional)

#### `/dashboard` - Main Dashboard
- Sidebar navigation
- Job submission form (textarea за prompt)
- List с последни 10 jobs (title, status, created_at)
- Statistics cards (total jobs, success rate, credits used)

#### `/dashboard/jobs` - All Jobs List
- Пагинирана таблица с всички jobs
- Filters (status, date range)
- Search bar
- Bulk actions

#### `/dashboard/jobs/[id]` - Job Details Page
- Input prompt display
- Status indicator (pending/running/completed/failed)
- Live View iframe (ако job-ът е running)
- Results display (formatted JSON или text)
- Execution time, timestamps
- Retry button (ако е failed)

#### `/dashboard/settings` - Settings Page
- **Profile Tab:** Email, name, change password
- **Airtop Profiles Tab:** List/Create/Delete Airtop browser profiles
- **Subscription Tab:** Current plan, usage, upgrade/downgrade
- **API Keys Tab:** Generate API keys за programmatic access

#### `/dashboard/billing` - Billing Page
- Invoice history
- Payment method management (Stripe)
- Upgrade/Downgrade план

---

## 3. BACKEND / API ✅ Pre-configured

**Използва:** Next.js API Routes (вградени в Next.js)
**Защо:** Без отделен backend server, всичко в един проект

### API Endpoints

#### `POST /api/jobs`
Създава нов automation job и тригва n8n workflow.

**Request:**
```json
{
  "prompt": "Find the top 10 products on ProductHunt",
  "airtop_profile": "my-profile" // optional
}
```

**Response:**
```json
{
  "id": "job-uuid",
  "status": "pending",
  "created_at": "2025-12-23T14:30:00Z",
  "estimated_time": 60
}
```

**Logic:**
1. Провери subscription limits (jobs/месец)
2. Създай job record в DB (status: pending)
3. Извикай n8n webhook с job_id и prompt
4. Върни job_id на frontend

---

#### `GET /api/jobs`
Връща списък с jobs за текущия потребител.

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (filter: all|pending|running|completed|failed)
- `search` (търси в prompt)

**Response:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "prompt": "Find...",
      "status": "completed",
      "created_at": "...",
      "completed_at": "...",
      "execution_time": 45.2
    }
  ],
  "total": 156,
  "page": 1,
  "pages": 8
}
```

---

#### `GET /api/jobs/[id]`
Връща детайли за конкретен job.

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "prompt": "Full prompt text",
  "airtop_profile": "my-profile",
  "status": "completed",
  "results": "Structured output from AI",
  "live_view_url": "https://...",
  "session_id": "airtop-session",
  "execution_time": 45.2,
  "created_at": "...",
  "started_at": "...",
  "completed_at": "...",
  "error_message": null
}
```

---

#### `POST /api/webhooks/n8n`
Приема резултати от n8n след завършване на job.

**Security:** Webhook secret за валидация

**Request от n8n:**
```json
{
  "job_id": "uuid",
  "status": "completed",
  "results": "AI output",
  "session_id": "airtop-session",
  "live_view_url": "https://...",
  "execution_time": 45.2,
  "webhook_secret": "shared-secret"
}
```

**Logic:**
1. Валидирай webhook_secret
2. Намери job по job_id
3. Update job record:
   - status → completed/failed
   - results → AI output
   - completed_at → now()
   - execution_time → от n8n
4. Trigger real-time update на frontend (via Supabase Realtime)

---

#### `GET /api/executions/[id]/live`
Проксира live view URL от Airtop (за да избегнем CORS issues).

**Response:**
```json
{
  "live_view_url": "https://app.airtop.ai/sessions/xxx/live",
  "session_id": "xxx",
  "status": "active"
}
```

---

#### `POST /api/airtop-profiles`
Създава нов Airtop browser profile.

**Request:**
```json
{
  "name": "linkedin-profile",
  "description": "LinkedIn login saved"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "linkedin-profile",
  "created_at": "..."
}
```

---

#### `GET /api/airtop-profiles`
Връща списък с Airtop profiles на потребителя.

**Response:**
```json
{
  "profiles": [
    {
      "id": "uuid",
      "name": "linkedin-profile",
      "description": "...",
      "created_at": "...",
      "last_used": "..."
    }
  ]
}
```

---

#### `DELETE /api/airtop-profiles/[id]`
Изтрива Airtop profile.

---

## 4. DATABASE ✅ Pre-configured

**Използва:** Supabase (Postgres)
**Защо:** Free tier, страхотен dashboard, auth included

### Database Schema (SQL)

```sql
-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'business')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired')),
  jobs_this_month INTEGER DEFAULT 0,
  jobs_limit INTEGER DEFAULT 10, -- зависи от tier
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOBS TABLE
-- ============================================
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  airtop_profile TEXT, -- име на Airtop profile (optional)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  results TEXT, -- structured output от AI
  session_id TEXT, -- Airtop session ID
  live_view_url TEXT,
  execution_time NUMERIC, -- в секунди
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Index за бързи queries
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- ============================================
-- AIRTOP_PROFILES TABLE
-- ============================================
CREATE TABLE airtop_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  airtop_profile_id TEXT, -- ID от Airtop API
  is_default BOOLEAN DEFAULT FALSE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'business')),
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'trialing')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USAGE_LOGS TABLE (за analytics)
-- ============================================
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'job_created', 'job_completed', 'job_failed'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Profiles: Потребителите виждат само своя profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Jobs: Потребителите виждат само своите jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role може да прави всичко (за webhook-а)
CREATE POLICY "Service role can update jobs"
  ON jobs FOR UPDATE
  TO service_role
  USING (true);

-- Airtop Profiles RLS
ALTER TABLE airtop_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own airtop profiles"
  ON airtop_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Reset jobs_this_month всеки месец (ще използваме cron job)
CREATE OR REPLACE FUNCTION reset_monthly_job_counts()
RETURNS void AS $$
BEGIN
  UPDATE profiles SET jobs_this_month = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CLEANUP JOB (изтрива jobs по-стари от 30 дни)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM jobs 
  WHERE completed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

---

## 5. AUTHENTICATION ✅ Pre-configured

**Използва:** Supabase Auth
**Защо:** Идва с database-а, handles email/password + OAuth

### Auth Flow

#### Sign Up
1. Потребителят попълва email/password
2. Supabase Auth създава user
3. Автоматично се създава profile record (via trigger или manual insert)
4. Default subscription: Free tier (10 jobs/месец)
5. Redirect към /dashboard

#### Login
1. Email/password authentication
2. Supabase връща JWT token
3. Token се съхранява в httpOnly cookie
4. Redirect към /dashboard

#### Protected Routes
Middleware проверява за auth token:
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

#### OAuth (Optional)
- Google Sign-In
- GitHub Sign-In
- LinkedIn Sign-In

---

## 6. HOSTING ✅ Pre-configured

### App Hosting
**Platform:** Vercel (free tier)
**Защо:** Създаден за Next.js, push-to-deploy, автоматичен SSL

**Deploy Process:**
1. Connect GitHub repo към Vercel
2. Vercel автоматично detect-ва Next.js
3. Configure environment variables
4. Every push към `main` → automatic deploy

### n8n Hosting
**Current:** Self-hosted at https://n8n.srv1201204.hstgr.cloud
**No changes needed** - използваме го както е

### Domain
**Production:** webagentpro.com (ще купим)
**Development:** webagentpro.vercel.app (Vercel default)

---

## 7. N8N ↔ APP CONNECTION ✅

### Как Работи Интеграцията

```
┌─────────────────┐
│  User submits   │
│  prompt on site │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/jobs  │
│ Creates job     │
│ (status: pending)│
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ POST to n8n webhook  │
│ { job_id, prompt }   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ n8n: Claude Agent    │
│ executes automation  │
│ (status: running)    │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────────┐
│ n8n: POST results back   │
│ to /api/webhooks/n8n     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────┐
│ Update job record    │
│ (status: completed)  │
│ results saved        │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Frontend shows       │
│ results to user      │
└──────────────────────┘
```

### n8n Webhook Configuration

#### 1. Update n8n Workflow
В твоя n8n workflow "Automate Web Interactions with Claude 3.5 Haiku":

**Промени "On form submission" trigger към "Webhook" trigger:**
- URL: `/webhook/webagentpro-jobs`
- Method: POST
- Authentication: Header (X-Webhook-Secret)

**След "AI Agent" node, добави "HTTP Request" node:**
- Method: POST
- URL: `https://webagentpro.com/api/webhooks/n8n`
- Headers:
  ```json
  {
    "Content-Type": "application/json",
    "X-Webhook-Secret": "{{ $env.WEBHOOK_SECRET }}"
  }
  ```
- Body:
  ```json
  {
    "job_id": "{{ $json.job_id }}",
    "status": "completed",
    "results": "{{ $json.output.results }}",
    "session_id": "{{ $('Start browser').item.json.sessionId }}",
    "live_view_url": "{{ $('Window').item.json.data.liveViewUrl }}",
    "execution_time": "{{ $json.executionTime }}"
  }
  ```

#### 2. Error Handling Node
Добави "On Error" node:
- Trigger on workflow error
- POST към `/api/webhooks/n8n` с:
  ```json
  {
    "job_id": "{{ $json.job_id }}",
    "status": "failed",
    "error_message": "{{ $json.error }}"
  }
  ```

### Webhook Secret
За сигурност, използваме shared secret:

**Generate:**
```bash
openssl rand -base64 32
```

**Store:**
- n8n: Environment variable `WEBHOOK_SECRET`
- Next.js: Environment variable `N8N_WEBHOOK_SECRET`

**Validate in API:**
```typescript
// api/webhooks/n8n/route.ts
const secret = request.headers.get('X-Webhook-Secret')
if (secret !== process.env.N8N_WEBHOOK_SECRET) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

## 8. SUBSCRIPTION PLANS ✅

### Pricing Tiers

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| **Price** | $0/месец | $29/месец | $99/месец |
| **Jobs/месец** | 10 | 100 | Unlimited |
| **Execution time limit** | 2 min | 5 min | 10 min |
| **Airtop profiles** | 1 (default) | 5 | Unlimited |
| **Live View** | ❌ | ✅ | ✅ |
| **Job history** | 7 days | 30 days | 90 days |
| **Priority queue** | ❌ | ❌ | ✅ |
| **API access** | ❌ | ✅ | ✅ |
| **Support** | Email | Email + Chat | Priority + Phone |

### Stripe Integration

**Products:**
```javascript
// Stripe Dashboard Products
{
  "free": { priceId: null },
  "pro": { priceId: "price_xxx_pro_monthly" },
  "business": { priceId: "price_xxx_business_monthly" }
}
```

**Endpoints:**
- `POST /api/checkout` - Create Stripe checkout session
- `POST /api/portal` - Customer portal за manage subscription
- `POST /api/webhooks/stripe` - Handle subscription events

---

## 9. ENVIRONMENT VARIABLES ✅

### Local Development (.env.local)

```bash
# ============================================
# SUPABASE
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://ansiaiuaygcfztabtknl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# ============================================
# N8N
# ============================================
N8N_WEBHOOK_URL=https://n8n.srv1201204.hstgr.cloud/webhook/webagentpro-jobs
N8N_WEBHOOK_SECRET=your-generated-secret-here

# ============================================
# AIRTOP
# ============================================
AIRTOP_API_KEY=your-airtop-api-key
AIRTOP_DEFAULT_PROFILE=your-default-profile-name

# ============================================
# STRIPE (Payment Processing)
# ============================================
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_xxx_pro
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=price_xxx_business

# ============================================
# APP CONFIG
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=WebAgentPro
```

### Production (Vercel)
Същите environment variables, но с production URLs и keys.

---

## 10. FILE STRUCTURE ✅

```
webagentpro/
├── .env.local                    # Environment variables
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
│
├── app/                          # Next.js 14 App Router
│   ├── layout.tsx                # Root layout с auth provider
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Global styles + Tailwind
│   │
│   ├── (auth)/                   # Auth pages (grouped route)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   │
│   ├── dashboard/                # Protected dashboard routes
│   │   ├── layout.tsx            # Dashboard layout със sidebar
│   │   ├── page.tsx              # Main dashboard
│   │   │
│   │   ├── jobs/
│   │   │   ├── page.tsx          # All jobs list
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Job details
│   │   │
│   │   ├── settings/
│   │   │   ├── page.tsx          # Settings tabs
│   │   │   ├── profile/
│   │   │   ├── airtop-profiles/
│   │   │   └── api-keys/
│   │   │
│   │   └── billing/
│   │       └── page.tsx          # Billing & subscription
│   │
│   └── api/                      # API Routes
│       ├── jobs/
│       │   ├── route.ts          # GET /api/jobs, POST /api/jobs
│       │   └── [id]/
│       │       └── route.ts      # GET /api/jobs/[id]
│       │
│       ├── airtop-profiles/
│       │   ├── route.ts          # GET, POST
│       │   └── [id]/
│       │       └── route.ts      # DELETE
│       │
│       ├── webhooks/
│       │   ├── n8n/
│       │   │   └── route.ts      # POST webhook от n8n
│       │   └── stripe/
│       │       └── route.ts      # POST webhook от Stripe
│       │
│       ├── checkout/
│       │   └── route.ts          # POST create checkout session
│       │
│       └── portal/
│           └── route.ts          # POST customer portal
│
├── components/                   # React компоненти
│   ├── ui/                       # shadcn/ui base компоненти
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── DashboardShell.tsx
│   │
│   ├── jobs/
│   │   ├── JobForm.tsx           # Form за създаване на job
│   │   ├── JobCard.tsx           # Card компонент за job
│   │   ├── JobsList.tsx          # List от jobs
│   │   ├── JobDetails.tsx        # Детайли за job
│   │   └── LiveViewEmbed.tsx     # Embed за Airtop live view
│   │
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── AuthProvider.tsx
│   │
│   └── billing/
│       ├── PricingCards.tsx
│       ├── SubscriptionCard.tsx
│       └── UsageChart.tsx
│
├── lib/                          # Utility libraries
│   ├── supabase/
│   │   ├── client.ts             # Supabase client за frontend
│   │   ├── server.ts             # Supabase client за server
│   │   └── middleware.ts         # Auth middleware
│   │
│   ├── stripe/
│   │   ├── client.ts
│   │   └── webhooks.ts
│   │
│   ├── n8n/
│   │   └── client.ts             # Helper за n8n API calls
│   │
│   └── utils.ts                  # General utilities (cn, formatDate, etc)
│
├── types/                        # TypeScript types
│   ├── database.ts               # Supabase generated types
│   ├── jobs.ts
│   ├── subscriptions.ts
│   └── index.ts
│
├── hooks/                        # Custom React hooks
│   ├── useJobs.ts
│   ├── useSubscription.ts
│   ├── useAirtopProfiles.ts
│   └── useAuth.ts
│
└── public/                       # Static assets
    ├── logo.svg
    ├── favicon.ico
    └── images/
```

---

## 11. КЛЮЧОВИ КОМПОНЕНТИ (Примери)

### JobForm Component
```typescript
// components/jobs/JobForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useJobs } from '@/hooks/useJobs'

export function JobForm() {
  const [prompt, setPrompt] = useState('')
  const { createJob, isCreating } = useJobs()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createJob({ prompt })
    setPrompt('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Опиши задачата която искаш да автоматизираш..."
        rows={4}
      />
      <Button type="submit" disabled={isCreating}>
        {isCreating ? 'Създава се...' : 'Стартирай Job'}
      </Button>
    </form>
  )
}
```

### useJobs Hook
```typescript
// hooks/useJobs.ts
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useJobs() {
  const [isCreating, setIsCreating] = useState(false)
  const supabase = createClient()

  const createJob = async ({ prompt }: { prompt: string }) => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await response.json()
      return data
    } finally {
      setIsCreating(false)
    }
  }

  return { createJob, isCreating }
}
```

---

## 12. REALTIME UPDATES ✅

### Supabase Realtime
За да виждаме job status updates в real-time:

```typescript
// В JobDetails компонента
useEffect(() => {
  const channel = supabase
    .channel('job-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'jobs',
        filter: `id=eq.${jobId}`
      },
      (payload) => {
        // Update UI с новия status
        setJob(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [jobId])
```

---

## 13. NEXT STEPS - Стъпка по Стъпка

### Фаза 1: Setup (1 ден)
1. ✅ Създай Next.js проект
2. ✅ Setup Supabase проект
3. ✅ Създай database schema
4. ✅ Configure Supabase Auth
5. ✅ Install dependencies (Tailwind, shadcn/ui)

### Фаза 2: Authentication (1 ден)
1. ✅ Login/Signup pages
2. ✅ Auth middleware
3. ✅ Profile creation flow
4. ✅ Protected routes

### Фаза 3: Core Features (3-4 дни)
1. ✅ Dashboard layout
2. ✅ Job submission form
3. ✅ Jobs list component
4. ✅ Job details page
5. ✅ API endpoints (jobs CRUD)

### Фаза 4: n8n Integration (2 дни)
1. ✅ Update n8n workflow
2. ✅ Webhook endpoint
3. ✅ Job status updates
4. ✅ Error handling

### Фаза 5: Live View (1 ден)
1. ✅ Embed Airtop live view
2. ✅ Real-time updates

### Фаза 6: Airtop Profiles (2 дни)
1. ✅ Profiles CRUD
2. ✅ Profile selection in job form
3. ✅ Default profile logic

### Фаза 7: Subscriptions (3 дни)
1. ✅ Stripe setup
2. ✅ Pricing page
3. ✅ Checkout flow
4. ✅ Usage limits enforcement
5. ✅ Billing dashboard

### Фаза 8: Polish (2-3 дни)
1. ✅ Landing page design
2. ✅ Error states
3. ✅ Loading states
4. ✅ Toast notifications
5. ✅ Responsive design

### Фаза 9: Deploy (1 ден)
1. ✅ Vercel deployment
2. ✅ Environment variables
3. ✅ Domain setup
4. ✅ Testing

---

## 14. ГОТОВИ СМЕ ДА ЗАПОЧНЕМ! 🚀

### Какво Да Направим Сега?

**Опция 1:** Започни с Setup
```bash
npx create-next-app@latest webagentpro
cd webagentpro
npm install @supabase/supabase-js @stripe/stripe-js
npx shadcn-ui@latest init
```

**Опция 2:** Започни с Database Schema
Отвори Supabase SQL Editor и изпълни SQL-а от секция 4.

**Опция 3:** Започни с n8n Update
Update-ни твоя n8n workflow да използва webhook-ове.

---

## 📞 След Завършване

Когато всичко е готово, ще имаме:

- ✅ Production-ready SaaS платформа
- ✅ AI-powered web automation
- ✅ Subscription billing system
- ✅ User authentication & profiles
- ✅ Job management & history
- ✅ Live view на browser sessions
- ✅ Scalable архитектура

**Всичко е готово за coding! Кажи ми от къде искаш да започнем! 💪**
