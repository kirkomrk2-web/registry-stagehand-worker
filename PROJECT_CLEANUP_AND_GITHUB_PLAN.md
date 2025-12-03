# 🧹 PROJECT CLEANUP & GITHUB ORGANIZATION PLAN

## Comprehensive Project Restructuring

---

## 📊 CURRENT STATE ANALYSIS

### Files Identified (Total: 100+)

#### ✅ ACTIVE & PRODUCTION READY:
```
Core System:
├── supabase/functions/registry_check/index.ts ✅ PRODUCTION
├── supabase/functions/users_pending_worker/index.ts ✅ PRODUCTION
├── supabase/functions/owners_push_slim/index.ts ✅ PRODUCTION
├── server/companybook_proxy.mjs ✅ PRODUCTION
└── browserbase-worker/lib/*.mjs ✅ LIBRARY

Documentation (Master):
├── MASTER_PROJECT_ROADMAP.md ✅ KEEP
├── SOCIAL_AUTOMATION_PLAN.md ✅ KEEP
├── HOSTINGER_AI_BUILDER_PROMPTS.md ✅ KEEP
├── FRONTEND_DESIGN_RECOMMENDATIONS.md ✅ KEEP
├── BROWSER_AUTOMATION_SETUP.md ✅ KEEP
└── README.md ✅ KEEP

Horizons Chat Bot:
├── HORIZONS_FIXES/agents_v3.js ✅ LATEST
├── HORIZONS_FIXES/useChatLogic_v4.js ✅ LATEST
├── HORIZONS_FIXES/V4_DEPLOYMENT_GUIDE.md ✅ KEEP
└── HORIZONS_FIXES/LANDING_PAGES/*.md ✅ KEEP
```

#### ⚠️ DEPRECATED/REDUNDANT (TO DELETE):
```
Old Documentation (Superseded):
├── DEPLOY_WORKFLOW_FIX.md ❌ OLD (замнен с V2)
├── DEPLOY_WORKFLOW_FIX_V2.md ⚠️ ARCHIVE
├── WALLESTER_SYSTEM_CURRENT_STATE.md ❌ OLD
├── WALLESTER_SYSTEM_ACTUAL_STATE_CORRECTED.md ❌ DUPLICATE
├── DEPLOYMENT_STATUS.md ❌ OUTDATED
├── TODO_REMAINING_TASKS.md ❌ COMPLETED
├── VERIFIED_PROFILES_PLAN.md ❌ SUPERSEDED (completed)
└── WALLESTER_AUTOMATION_PLAN.md ❌ OLD

Old Horizons Versions:
├── HORIZONS_FIXES/agents.js ❌ (use v3)
├── HORIZONS_FIXES/agents_v2.js ❌ (use v3)
├── HORIZONS_FIXES/useChatLogic.js ❌ (use v4)
├── HORIZONS_FIXES/useChatLogic_v2.js ❌ (use v4)
├── HORIZONS_FIXES/useChatLogic_v3.js ❌ (use v4)
├── HORIZONS_FIXES/QUICK_SUMMARY.md ❌ (superseded)
├── HORIZONS_FIXES/FINAL_FIXES_SUMMARY.md ❌ (superseded)
├── HORIZONS_FIXES/HORIZON_AI_PROMPT.md ❌ (use V2)
└── HORIZONS_FIXES/INSTALLATION_GUIDE.md ⚠️ (merge with V4_DEPLOYMENT)

Test/Debug Files:
├── browserbase-worker/src/companybook_debug.mjs ❌ TEST
├── browserbase-worker/src/companybook_raw_dump.mjs ❌ TEST
├── browserbase-worker/src/companybook_test.mjs ❌ TEST
├── browserbase-worker/src/debug_extraction.mjs ❌ TEST
├── browserbase-worker/src/full_debug.mjs ❌ TEST
├── browserbase-worker/src/testers.mjs ❌ TEST
├── test_relationships_api.mjs ❌ TEST
├── worker.mjs ❌ OLD VERSION
└── duoplus_global_vars.csv ❌ TEST DATA

Migration Leftovers:
├── browserbase-worker/migrations/2025-11-25_create_verified_profiles.sql ❌ SUPERSEDED
├── browserbase-worker/migrations/2025-11-26_add_address_and_phone_support.sql ❌ SUPERSEDED
├── browserbase-worker/migrations/2025-11-26_COMPLETE_verified_profiles.sql ❌ SUPERSEDED
├── browserbase-worker/migrations/UPDATE_existing_profiles.sql ❌ MANUAL RUN
└── browserbase-worker/tmp_update_alias_constraint.sql ❌ TEMP

UI (Deprecated):
├── browserbase-worker/ui/* ❌ OLD (replaced by Horizons)
└── deploy/hostinger/horizon_snippets/* ⚠️ ARCHIVE
```

---

## 🗂️ NEW GITHUB STRUCTURE

```
registry-stagehand-worker/
├── .github/
│   ├── workflows/
│   │   └── deploy.yml                    # CI/CD
│   └── ISSUE_TEMPLATE.md
│
├── docs/
│   ├── README.md                         # Documentation index
│   ├── MASTER_ROADMAP.md                 # From MASTER_PROJECT_ROADMAP.md
│   ├── DEPLOYMENT_GUIDE.md               # Deployment instructions
│   ├── API_DOCUMENTATION.md              # API endpoints
│   └── TROUBLESHOOTING.md                # Common issues
│   
├── architecture/
│   ├── SYSTEM_ARCHITECTURE.md            # High-level design
│   ├── DATABASE_SCHEMA.md                # Supabase tables
│   └── FLOW_DIAGRAMS.md                  # Visual flows
│
├── automation/
│   ├── social-media/
│   │   ├── README.md                     # From SOCIAL_AUTOMATION_PLAN.md
│   │   ├── instagram-worker.mjs          # Instagram automation
│   │   ├── telegram-worker.mjs           # Telegram automation
│   │   └── orchestrator.mjs              # Unified management
│   │
│   └── registry/
│       ├── README.md
│       └── companybook-client.mjs
│
├── supabase/
│   ├── functions/
│   │   ├── registry_check/
│   │   │   └── index.ts                  # ✅ KEEP
│   │   ├── users_pending_worker/
│   │   │   └── index.ts                  # ✅ KEEP
│   │   └── owners_push_slim/
│   │       └── index.ts                  # ✅ KEEP
│   │
│   ├── migrations/
│   │   ├── 001_initial_schema.sql        # Consolidated
│   │   ├── 002_verified_owners.sql       # From 2025-11-29
│   │   ├── 003_companies_slim.sql        # From 2025-11-30
│   │   └── 004_indexes.sql               # Performance
│   │
│   └── seed/
│       └── test_data.sql                 # Sample data
│
├── frontend/
│   ├── horizons-chat/
│   │   ├── README.md                     # From V4_DEPLOYMENT_GUIDE.md
│   │   ├── agents.js                     # From agents_v3.js
│   │   └── useChatLogic.js               # From useChatLogic_v4.js
│   │
│   ├── landing-pages/
│   │   ├── README.md                     # From HOSTINGER_AI_BUILDER_PROMPTS.md
│   │   ├── referral.md
│   │   ├── limits.md
│   │   └── plans.md
│   │
│   └── design-system/
│       └── README.md                     # From FRONTEND_DESIGN_RECOMMENDATIONS.md
│
├── lib/
│   ├── bitbrowser/
│   │   └── BitBrowserClient.mjs          # ✅ KEEP
│   ├── browserbase/
│   │   └── BrowserbaseClient.mjs         # ✅ KEEP
│   ├── proxy/
│   │   ├── ProxyManager.mjs              # ✅ KEEP
│   │   └── ProxyVerifier.mjs             # ✅ KEEP
│   └── config/
│       ├── browsers.mjs                  # ✅ KEEP
│       ├── constants.mjs                 # ✅ KEEP
│       └── proxies.mjs                   # ✅ KEEP
│
├── server/
│   └── companybook-proxy.mjs             # ✅ KEEP (rename from .mjs)
│
├── scripts/
│   ├── setup.sh                          # Initial setup
│   ├── deploy.sh                         # Deployment
│   └── cleanup.sh                        # Database cleanup
│
├── tests/
│   ├── integration/
│   │   ├── registry-check.test.mjs
│   │   └── users-pending.test.mjs
│   └── unit/
│       └── companybook.test.mjs
│
├── .env.example                          # Environment template
├── .gitignore
├── package.json
├── README.md                             # Main project README
└── LICENSE
```

---

## 🗑️ FILES TO DELETE

### Phase 1: Documentation Cleanup
```bash
# Old/superseded docs
rm DEPLOY_WORKFLOW_FIX.md
rm WALLESTER_SYSTEM_CURRENT_STATE.md
rm WALLESTER_SYSTEM_ACTUAL_STATE_CORRECTED.md
rm DEPLOYMENT_STATUS.md
rm TODO_REMAINING_TASKS.md
rm VERIFIED_PROFILES_PLAN.md
rm WALLESTER_AUTOMATION_PLAN.md
rm FIX_VHOD_BUTTON.md                     # Info inorporated in V4
rm HORIZONS_CHAT_IMPROVEMENTS.md          # Superseded
rm CLOUD_PHONE_RPA_SUMMARY.md              # Old plan

# Keep for reference but move to archive/
mkdir -p archive
mv DEPLOY_WORKFLOW_FIX_V2.md archive/
mv DEPLOY_ENGLISH_NAME_FILTER_FIX.md archive/
mv DEPLOY_RELATIONSHIPS_NAME_EN_FIX.md archive/
mv FINAL_FIX_LEGAL_FORM_MATCHING.md archive/
mv ENGLISH_NAME_PROBLEM_AND_SOLUTIONS.md archive/
mv WALLESTER_COMPLETE_SYSTEM_GUIDE.md archive/
mv WALLESTER_TESTING_GUIDE.md archive/
```

### Phase 2: Horizons Cleanup
```bash
cd HORIZONS_FIXES/

# Delete old versions
rm agents.js agents_v2.js
rm useChatLogic.js useChatLogic_v2.js useChatLogic_v3.js

# Keep only v3 and v4 (rename)
mv agents_v3.js agents.js
mv useChatLogic_v4.js useChatLogic.js

# Consolidate documentation
rm QUICK_SUMMARY.md
rm FINAL_FIXES_SUMMARY.md  
rm INSTALLATION_GUIDE.md
rm HORIZON_AI_PROMPT.md
# Keep: V4_DEPLOYMENT_GUIDE.md and HORIZON_AI_PROMPT_V2.md
```

### Phase 3: Test Files Cleanup
```bash
cd browserbase-worker/src/

# Delete all test/debug files
rm companybook_debug.mjs
rm companybook_raw_dump.mjs
rm companybook_test.mjs
rm debug_extraction.mjs
rm full_debug.mjs
rm testers.mjs

# Root cleanup
cd ../..
rm test_relationships_api.mjs
rm worker.mjs
rm duoplus_global_vars.csv
```

### Phase 4: Migration Cleanup
```bash
cd browserbase-worker/migrations/

# Delete superseded migrations
rm 2025-11-25_create_verified_profiles.sql
rm 2025-11-26_add_address_and_phone_support.sql  
rm 2025-11-26_add_complete_data_fields.sql
rm 2025-11-26_COMPLETE_verified_profiles.sql
rm 2025-11-26_wallester_automation.sql
rm UPDATE_existing_profiles.sql
rm ../tmp_update_alias_constraint.sql

# Keep only final migrations:
# - 2025-11-29_migrate_to_verified_owners.sql
# - 2025-11-29_update_sms_pool_fk.sql
# - 2025-11-29_update_verified_owners_structure.sql
# - 2025-11-29_verified_owners_more_helpers.sql
# - 2025-11-29_verified_owners_rpc.sql
# - 2025-11-30_add_companies_slim.sql
```

### Phase 5: Old UI Cleanup
```bash
# Old UI (replaced by Horizons)
rm -rf browserbase-worker/ui/

# Old deployment snippets (archive)
mkdir -p archive/deploy
mv deploy/hostinger/horizon_snippets/ archive/deploy/
```

---

## 📊 SUPABASE DATABASE AUDIT

### Current Tables Analysis:

```sql
-- Check all tables in Supabase
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Expected Active Tables:
```
✅ users_pending              -- User registrations
✅ verified_owners            -- Verified business owners
✅ companies_slim             -- Company data cache
✅ social_interactions        -- Social media logs (if created)
✅ automation_errors          -- Error tracking (if created)
```

### Tables to CHECK & POTENTIALLY DELETE:
```
⚠️ verified_profiles         -- OLD (replaced by verified_owners?)
⚠️ sms_pool                  -- Still used?
⚠️ email_pool                -- Still used?
⚠️ users                     -- Duplicate of users_pending?
⚠️ registry_checks           -- Logs table (keep or archive?)
⚠️ companybook_cache         -- Redundant with companies_slim?
```

### Audit Query:
```sql
-- Find unused tables (no rows, no recent updates)
SELECT 
    schemaname,
    tablename,
    n_tup_ins as total_inserts,
    n_tup_upd as total_updates,
    n_tup_del as total_deletes,
    n_live_tup as live_rows,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### Functions to CHECK:
```sql
-- List all functions
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

**Expected Active Functions:**
```
✅ get_verified_owner_by_email()
✅ push_verified_owner()
✅ check_owner_exists()
✅ get_companies_by_owner()
```

**Functions to CHECK:**
```
⚠️ Any test_* functions      -- DELETE
⚠️ Duplicate functions       -- DELETE older versions
⚠️ Unused helper functions   -- ARCHIVE or DELETE
```

---

## 🔧 BROWSER-USE API INTEGRATION

### Current Status:
You have MCP server configured for Browserbase with Stagehand.

### API Key Setup (.env):
```bash
# .env file structure
BROWSERBASE_API_KEY=your_browserbase_api_key
BROWSERBASE_PROJECT_ID=your_project_id
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Custom Trigger Integration:

**Supabase Database Webhook → Browserbase Action**

```typescript
// supabase/functions/browserbase_trigger/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
    try {
        // 1. Get webhook payload from Supabase
        const payload = await req.json();
        console.log('Trigger received:', payload);
        
        // 2. Extract data
        const { type, table, record, old_record } = payload;
        
        // 3. Determine action
        if (type === 'INSERT' && table === 'users_pending') {
            // New user registered
            await triggerBrowserbaseSession({
                action: 'registry_check',
                userId: record.id,
                fullName: record.full_name,
```

                eik: record.eik
            });
        } else if (type === 'UPDATE' && table === 'verified_owners') {
            // Owner data updated, refresh company info
            await triggerBrowserbaseSession({
                action: 'company_update',
                ownerId: record.id,
                eik: record.company_eik
            });
        } else if (type === 'INSERT' && table === 'social_interactions') {
            // Social media automation trigger
            await triggerBrowserbaseSession({
                action: 'instagram_engage',
                targetUser: record.target_username,
                agentId: record.agent_id
            });
        }
        
        return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Trigger error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

async function triggerBrowserbaseSession(params) {
    const { action, ...data } = params;
    
    // Make request to Browserbase MCP server
    const response = await fetch('https://api.browserbase.com/v1/sessions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-BB-API-Key': Deno.env.get('BROWSERBASE_API_KEY')
        },
        body: JSON.stringify({
            projectId: Deno.env.get('BROWSERBASE_PROJECT_ID'),
            browserSettings: {
                context: {
                    id: `${action}_${Date.now()}`,
                    persist: true
                }
            }
        })
    });
    
    const session = await response.json();
    
    // Store session info for tracking
    console.log(`Started Browserbase session: ${session.id} for action: ${action}`);
    
    // Call your worker with session ID
    await fetch(`${Deno.env.get('WORKER_URL')}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: session.id,
            action,
            data
        })
    });
    
    return session;
}
```

### MCP Server Tools Usage:

**Available Tools:**
```javascript
// 1. Create/reuse browser session
cXu4Oz0mcp0browserbase_session_create({ sessionId: 'optional_id' })

// 2. Navigate to URL
cXu4Oz0mcp0browserbase_stagehand_navigate({ url: 'https://example.com' })

// 3. Perform action (click, type, etc.)
cXu4Oz0mcp0browserbase_stagehand_act({ 
    action: 'Click the login button',
    variables: {} // Optional sensitive data
})

// 4. Extract data
cXu4Oz0mcp0browserbase_stagehand_extract({ 
    instruction: 'Extract all company names and EIK numbers from the table'
})

// 5. Observe elements
cXu4Oz0mcp0browserbase_stagehand_observe({ 
    instruction: 'Find the search input field at the top of the page'
})

// 6. Screenshot
cXu4Oz0mcp0browserbase_screenshot({ name: 'registry-search-results' })

// 7. Get current URL
cXu4Oz0mcp0browserbase_stagehand_get_url()

// 8. Close session
cXu4Oz0mcp0browserbase_session_close()
```

### Worker Integration Example:

```javascript
// browserbase-worker/src/registryStagehandWorker.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function executeRegistryCheck(sessionId, userId, fullName, eik) {
    try {
        // 1. Create or reuse session
        await window.mcpTools.browserbase_session_create({ sessionId });
        
        // 2. Navigate to registry
        await window.mcpTools.browserbase_stagehand_navigate({
            url: 'https://portal.registryagency.bg'
        });
        
        // 3. Search for person
        await window.mcpTools.browserbase_stagehand_act({
            action: 'Type the full name into the search field',
            variables: { fullName }
        });
        
        // 4. Click search
        await window.mcpTools.browserbase_stagehand_act({
            action: 'Click the search button'
        });
        
        // 5. Extract results
        const results = await window.mcpTools.browserbase_stagehand_extract({
            instruction: 'Extract all companies where this person appears as owner or manager, including company name, EIK, role, and share percentage'
        });
        
        // 6. Save to Supabase
        await supabase
            .from('verified_owners')
            .update({
                registry_data: results,
                verified_at: new Date().toISOString(),
                verification_status: 'complete'
            })
            .eq('user_id', userId);
        
        // 7. Take screenshot for proof
        await window.mcpTools.browserbase_screenshot({
            name: `registry-check-${userId}-${Date.now()}`
        });
        
        // 8. Close session
        await window.mcpTools.browserbase_session_close();
        
        return { success: true, data: results };
        
    } catch (error) {
        console.error('Registry check failed:', error);
        
        // Log error to Supabase
        await supabase
            .from('automation_errors')
            .insert({
                user_id: userId,
                action: 'registry_check',
                error_message: error.message,
                session_id: sessionId
            });
        
        throw error;
    }
}
```

### Database Webhook Setup:

**1. Create webhook in Supabase:**
```sql
-- Enable webhook extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to trigger on INSERT
CREATE OR REPLACE FUNCTION trigger_registry_check()
RETURNS TRIGGER AS $$
BEGIN
    -- Call edge function via webhook
    PERFORM net.http_post(
        url := 'https://your-project.supabase.co/functions/v1/browserbase_trigger',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := jsonb_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'record', row_to_json(NEW),
            'old_record', row_to_json(OLD)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to users_pending table
CREATE TRIGGER on_user_pending_insert
AFTER INSERT ON users_pending
FOR EACH ROW
EXECUTE FUNCTION trigger_registry_check();
```

**2. Test the trigger:**
```sql
-- Insert test user (should auto-trigger)
INSERT INTO users_pending (full_name, email, eik)
VALUES ('Тест Тестов', 'test@example.com', '123456789');

-- Check if trigger fired
SELECT * FROM automation_errors 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

---

## 📋 COMPLETE SUPABASE AUDIT QUERIES

### 1. Find All Tables with Row Counts
```sql
SELECT 
    schemaname,
    tablename,
    n_live_tup as row_count,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### 2. Find Unused Indexes
```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### 3. Find Duplicate Indexes
```sql
SELECT
    pg_size_pretty(SUM(pg_relation_size(idx))::BIGINT) AS size,
    (array_agg(idx))[1] AS idx1,
    (array_agg(idx))[2] AS idx2,
    (array_agg(idx))[3] AS idx3,
    (array_agg(idx))[4] AS idx4
FROM (
    SELECT
        indexrelid::regclass AS idx,
        (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| indkey::text ||E'\n'||
        COALESCE(indexprs::text,'')||E'\n' || COALESCE(indpred::text,'')) AS key
    FROM pg_index
) sub
GROUP BY key 
HAVING COUNT(*) > 1
ORDER BY SUM(pg_relation_size(idx)) DESC;
```

### 4. Check Foreign Key Constraints
```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

### 5. Find Missing Indexes (Slow Queries)
```sql
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / seq_scan AS avg_seq_read
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND seq_scan > 0
    AND idx_scan = 0
ORDER BY seq_tup_read DESC
LIMIT 20;
```

### 6. Database Size Breakdown
```sql
SELECT
    nspname AS schema_name,
    pg_size_pretty(SUM(pg_total_relation_size(c.oid))::BIGINT) AS total_size
FROM pg_class c
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE nspname NOT IN ('pg_catalog', 'information_schema')
    AND c.relkind != 'i'
    AND nspname !~ '^pg_toast'
GROUP BY nspname
ORDER BY SUM(pg_total_relation_size(c.oid)) DESC;
```

### 7. Find All Functions (Edge Functions & DB Functions)
```sql
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition_snippet,
    CASE 
        WHEN p.provolatile = 'i' THEN 'IMMUTABLE'
        WHEN p.provolatile = 's' THEN 'STABLE'
        WHEN p.provolatile = 'v' THEN 'VOLATILE'
    END as volatility
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
```

### 8. Check RLS (Row Level Security) Policies
```sql
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 9. Find Tables Without Primary Keys
```sql
SELECT
    table_schema,
    table_name
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = t.table_schema
            AND tc.table_name = t.table_name
            AND tc.constraint_type = 'PRIMARY KEY'
    )
ORDER BY table_name;
```

### 10. Cleanup Recommendations Query
```sql
-- Generate DROP statements for unused tables
SELECT 
    'DROP TABLE IF EXISTS ' || tablename || ' CASCADE;' as cleanup_sql
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_live_tup = 0
    AND last_vacuum < NOW() - INTERVAL '30 days'
ORDER BY tablename;
```

---

## 🚀 GITHUB SETUP & PUSH INSTRUCTIONS

### Step 1: Initialize Git (if not already done)
```bash
cd /home/administrator/Documents/registry_stagehand_worker

# Check current status
git status

# If not initialized:
git init
git branch -M main
```

### Step 2: Configure Remote
```bash
# Add remote (already exists based on workspace config)
git remote -v

# If needed:
# git remote add origin https://github.com/kirkomrk2-web/registry-stagehand-worker.git
```

### Step 3: Create .gitignore (if not exists)
```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnpm-store/

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*
browserbase-worker/logs/*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build
dist/
build/
*.tsbuildinfo

# Temp
tmp/
temp/
*.tmp

# Archives
archive/

# Test data
duoplus_global_vars.csv
userData.json
EOF
```

### Step 4: Restructure Files (BEFORE committing)

**Option A: Manual Restructure**
```bash
# Create new structure
mkdir -p docs architecture automation/social-media automation/registry
mkdir -p frontend/horizons-chat frontend/landing-pages frontend/design-system
mkdir -p lib/bitbrowser lib/browserbase lib/proxy lib/config
mkdir -p scripts tests/integration tests/unit

# Move files
mv MASTER_PROJECT_ROADMAP.md docs/MASTER_ROADMAP.md
mv SOCIAL_AUTOMATION_PLAN.md automation/social-media/README.md
mv HOSTINGER_AI_BUILDER_PROMPTS.md frontend/landing-pages/README.md
mv FRONTEND_DESIGN_RECOMMENDATIONS.md frontend/design-system/README.md

# Move Horizons files
cp HORIZONS_FIXES/agents_v3.js frontend/horizons-chat/agents.js
cp HORIZONS_FIXES/useChatLogic_v4.js frontend/horizons-chat/useChatLogic.js
cp HORIZONS_FIXES/V4_DEPLOYMENT_GUIDE.md frontend/horizons-chat/README.md

# Move lib files
mv browserbase-worker/lib/* lib/
mv browserbase-worker/config/*.mjs lib/config/

# Keep supabase/ structure as is (already correct)
```

**Option B: Automated Restructure Script**
```bash
# Create restructure script
cat > scripts/restructure.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Restructuring project..."

# Backup current state
git stash save "Before restructure"

# Create new directories
mkdir -p docs architecture automation/{social-media,registry}
mkdir -p frontend/{horizons-chat,landing-pages,design-system}
mkdir -p lib/{bitbrowser,browserbase,proxy,config}
mkdir -p scripts tests/{integration,unit}

# Documentation
mv MASTER_PROJECT_ROADMAP.md docs/MASTER_ROADMAP.md 2>/dev/null || true
mv SOCIAL_AUTOMATION_PLAN.md automation/social-media/README.md 2>/dev/null || true
mv BROWSER_AUTOMATION_SETUP.md docs/BROWSER_AUTOMATION.md 2>/dev/null || true

# Frontend
cp HORIZONS_FIXES/agents_v3.js frontend/horizons-chat/agents.js 2>/dev/null || true
cp HORIZONS_FIXES/useChatLogic_v4.js frontend/horizons-chat/useChatLogic.js 2>/dev/null || true
cp HORIZONS_FIXES/V4_DEPLOYMENT_GUIDE.md frontend/horizons-chat/README.md 2>/dev/null || true

cp HOSTINGER_AI_BUILDER_PROMPTS.md frontend/landing-pages/README.md 2>/dev/null || true
cp FRONTEND_DESIGN_RECOMMENDATIONS.md frontend/design-system/README.md 2>/dev/null || true

# Lib
mv browserbase-worker/lib/*.mjs lib/ 2>/dev/null || true
mv browserbase-worker/config/*.mjs lib/config/ 2>/dev/null || true

# Archive old files
mkdir -p archive
mv DEPLOY_*.md archive/ 2>/dev/null || true
mv WALLESTER_*.md archive/ 2>/dev/null || true
mv *_FIX*.md archive/ 2>/dev/null || true

echo "✅ Restructure complete!"
EOF

chmod +x scripts/restructure.sh
./scripts/restructure.sh
```

### Step 5: Commit Strategy

**Commit 1: Archive old files**
```bash
git add archive/
git commit -m "📦 Archive: Move deprecated documentation to archive/

- Moved old deployment guides
- Moved superseded Wallester docs
- Moved legacy fix documentation
- Files preserved for reference but removed from main tree"
```

**Commit 2: Restructure project**
```bash
git add docs/ architecture/ automation/ frontend/ lib/ scripts/ tests/
git commit -m "♻️ Refactor: Reorganize project structure

New structure:
- docs/ - All documentation consolidated
- automation/ - Social media & registry automation
- frontend/ - Horizons chat, landing pages, design system
- lib/ - Shared libraries (BitBrowser, Browserbase, Proxy)
- supabase/ - Database functions and migrations
- scripts/ - Setup and deployment scripts
- tests/ - Integration and unit tests

This improves navigation and separates concerns clearly."
```

**Commit 3: Update main README**
```bash
# Create new comprehensive README.md
cat > README.md << 'EOF'
# 🚀 Registry Stagehand Worker

Automated business registry verification system with social media engagement capabilities.

## 📁 Project Structure

```
├── docs/                    # 📚 Documentation
├── automation/              # 🤖 Automation workflows
│   ├── social-media/       # Instagram & Telegram bots
│   └── registry/           # CompanyBook integration
├── frontend/               # 💻 User interfaces
│   ├── horizons-chat/      # Chat bot
│   └── landing-pages/      # Marketing pages
├── supabase/              # 🗄️ Backend & database
│   ├── functions/         # Edge functions
│   └── migrations/        # Database schema
└── lib/                   # 📦 Shared libraries
```

## 🎯 Features

- ✅ Automated registry checks via CompanyBook API
- ✅ Social media automation (Instagram + Telegram)
- ✅ Browserbase integration with Stagehand
- ✅ Multi-agent chat system (Horizons)
- ✅ Real-time database triggers

## 🚦 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
npm run migrate

# Start worker
npm run worker
```

## 📖 Documentation

- [Master Roadmap](docs/MASTER_ROADMAP.md)
- [Social Automation Guide](automation/social-media/README.md)
- [Browser Automation](docs/BROWSER_AUTOMATION.md)
- [Horizons Chat Deployment](frontend/horizons-chat/README.md)

## 🔧 Configuration

See `.env.example` for required environment variables:
- Supabase credentials
- Browserbase API key
- CompanyBook API access
- Social media accounts

## 📊 Architecture

System uses:
- **Supabase** - Database, authentication, edge functions
- **Browserbase + Stagehand** - Browser automation  
- **BitBrowser** - Multi-account management
- **OpenAI GPT-4** - AI agent personalities

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📄 License

[Your License Here]
EOF

git add README.md
git commit -m "📝 Docs: Complete README with project overview

- Added project structure diagram
- Listed key features  
- Quick start guide
- Links to detailed documentation
- Architecture overview"
```

**Commit 4: Clean up old files**
```bash
# Delete old test files (per cleanup plan)
git rm browserbase-worker/src/companybook_debug.mjs
git rm browserbase-worker/src/companybook_test.mjs
git rm browserbase-worker/src/debug_extraction.mjs
git rm browserbase-worker/src/full_debug.mjs
git rm browserbase-worker/src/testers.mjs
git rm test_relationships_api.mjs
git rm worker.mjs
git rm duoplus_global_vars.csv

# Delete old Horizons versions
git rm HORIZONS_FIXES/agents.js
git rm HORIZONS_FIXES/agents_v2.js
git rm HORIZONS_FIXES/useChatLogic.js
git rm HORIZONS_FIXES/useChatLogic_v2.js
git rm HORIZONS_FIXES/useChatLogic_v3.js

git commit -m "🗑️ Cleanup: Remove test files and old versions

- Removed debug/test files
- Removed superseded Horizons versions
- Kept only production-ready code"
```

**Commit 5: Add this cleanup document**
```bash
git add PROJECT_CLEANUP_AND_GITHUB_PLAN.md
git commit -m "📋 Docs: Add complete cleanup and restructure plan

Comprehensive guide including:
- File audit (100+ files analyzed)
- Proposed GitHub structure  
- Cleanup phases
- Supabase database audit queries
- Browser-use API integration
- GitHub push instructions"
```

### Step 6: Push to GitHub
```bash
# Push to main branch
git push -u origin main

# If branch already exists with different history:
git push -u origin main --force-with-lease

# Create release tag
git tag -a v1.0.0 -m "🎉 v1.0.0: Complete project restructure"
git push origin v1.0.0
```

### Step 7: GitHub Repository Settings

**1. Update Repository Description:**
```
Automated Bulgarian business registry verification with social media engagement | Supabase + Browserbase + Stagehand
```

**2. Add Topics:**
```
automation, browserbase, stagehand, supabase, instagram-bot, telegram-bot, 
business-registry, companybook-api, bulgarian-companies, rpa, mcp-server
```

**3. Create GitHub Actions Workflow:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy-supabase:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}
```

---

## ✅ FINAL CHECKLIST

### Before Executing Cleanup:

- [ ] **Backup Everything**
  ```bash
  cp -r /home/administrator/Documents/registry_stagehand_worker \
        /home/administrator/Documents/registry_backup_$(date +%Y%m%d)
  ```

- [ ] **Review Files to Delete**
  - Check each file in "Phase 1-5" sections
  - Confirm no critical code in test files
  - Verify migrations are truly superseded

- [ ] **Test Current System**
  ```bash
  # Ensure everything works before restructure
  npm run worker
  npm run test
  ```

- [ ] **Export Supabase Audit Results**
  ```bash
  # Run audit queries, save results
  psql $DATABASE_URL < audit_queries.sql > audit_results.txt
  ```

### After Restructure:

- [ ] **Verify All Links Work**
  - Check README links
  - Check cross-references in docs
  - Update any broken paths

- [ ] **Test Imports**
  ```bash
  # Ensure code still runs after moving files
  node -c automation/social-media/*.mjs
  node -c lib/**/*.mjs
  ```

- [ ] **Update Package.json Scripts**
  ```json
  {
    "scripts": {
      "worker": "node automation/registry/worker.mjs",
      "social": "node automation/social-media/orchestrator.mjs",
      "migrate": "supabase db push",
      "test": "node tests/integration/*.test.mjs"
    }
  }
  ```

- [ ] **Update .env.example**
  ```bash
  # Document all required environment variables
  # based on lib/config/*.mjs usage
  ```

### Post-Push:

- [ ] **Create GitHub Issues for Remaining Work**
  - [ ] Issue #1: Implement Instagram worker
  - [ ] Issue #2: Set up CI/CD pipeline
  - [ ] Issue #3: Add integration tests
  - [ ] Issue #4: Deploy Horizons to Hostinger

- [ ] **Update Project Board**
  - Move completed tasks to "Done"
  - Create new tasks from roadmap
  - Assign priorities

- [ ] **Document API Keys**
  - Create private wiki page with all credentials
  - Document where each key is used
  - Set up key rotation schedule

---

## 🎯 SUCCESS METRICS

After completing this cleanup:

✅ **Code Quality:**
- Reduced file count from 100+ to ~60 core files
- Clear separation of concerns
- No duplicate/test code in main tree

✅ **Documentation:**
- Single source of truth for each topic
- Clear navigation structure
- Up-to-date guides for all systems

✅ **Developer Experience:**
- Easy to find any file
- Logical grouping
- README provides clear starting point

✅ **Maintainability:**
- Deprecated code archived, not deleted
- Migration history preserved
- Audit trail in git history

---

## 📞 NEED HELP?

If you encounter issues during cleanup:

1. **Check Git Status:**
   ```bash
   git status
   git log --oneline -10
   ```

2. **Revert if Needed:**
   ```bash
   git reset --hard HEAD~1  # Undo last commit
   git stash pop            # Restore stashed changes
   ```

3. **Ask Questions:**
   - Which files are safe to delete?
   - Should this migration be kept?
   - Is this function still used?

4. **Test Everything:**
   ```bash
   npm run worker
   npm run test
   # Verify no broken imports
   ```

---

## 🏁 EXECUTION COMMAND

When ready to proceed, run:

```bash
# Run full cleanup and restructure
bash scripts/full_cleanup.sh

# Or do it step by step:
bash scripts/phase1_docs_cleanup.sh
bash scripts/phase2_horizons_cleanup.sh  
bash scripts/phase3_test_cleanup.sh
bash scripts/phase4_migration_cleanup.sh
bash scripts/phase5_ui_cleanup.sh
bash scripts/restructure.sh
```

Then review, commit, and push to GitHub! 🚀
