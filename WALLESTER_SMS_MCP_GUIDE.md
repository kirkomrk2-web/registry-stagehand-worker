# 📱 Wallester SMS Monitor - MCP Integration Guide

**Automated SMS code extraction from smstome.com using Browserbase MCP Server**

---

## 🎯 Overview

This system monitors smstome.com phone numbers for Wallester verification codes using Browserbase MCP tools integrated with Supabase.

### Flow:
```
Supabase (sms_numbers_pool: status='assigned')
    ↓
Browserbase MCP Worker
    ↓
Navigate to smstome.com SMS page
    ↓
Extract SMS messages (Stagehand AI)
    ↓
Find Wallester verification code
    ↓
Update Supabase with code
```

---

## 📋 Prerequisites

### 1. Browserbase MCP Server

You already have this configured! The MCP server provides these tools:

```javascript
cHJY3_0mcp0browserbase_session_create()     // Create browser session
cHJY3_0mcp0browserbase_stagehand_navigate() // Navigate to URL
cHJY3_0mcp0browserbase_stagehand_extract()  // Extract data with AI
cHJY3_0mcp0browserbase_screenshot()         // Take screenshot
cHJY3_0mcp0browserbase_session_close()      // Close session
```

### 2. Supabase Database

Required table: `sms_numbers_pool`

```sql
CREATE TABLE IF NOT EXISTS sms_numbers_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT UNIQUE NOT NULL,
    sms_url TEXT NOT NULL,
    country_code TEXT DEFAULT 'FI',
    country_name TEXT DEFAULT 'Finland',
    status TEXT DEFAULT 'available',
    assigned_to TEXT,
    last_message_at TIMESTAMPTZ,
    last_message_from TEXT,
    last_verification_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_numbers_pool_status ON sms_numbers_pool(status);
CREATE INDEX idx_sms_numbers_pool_phone ON sms_numbers_pool(phone_number);
```

### 3. Environment Variables

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SMS_POLL_INTERVAL_MS=30000  # Check every 30 seconds
```

---

## 🚀 Usage

### Method 1: Via AI Assistant (Recommended)

Simply ask the AI assistant:

```
"Check smstome.com for Wallester verification codes"
```

The assistant will:
1. Fetch available phone from Supabase
2. Create Browserbase session using MCP
3. Navigate to SMS URL
4. Extract messages
5. Find Wallester code
6. Update Supabase

### Method 2: Direct Function Call

```javascript
import { 
  checkPhoneNumberMCP, 
  getAvailablePhone, 
  pollPhoneForCode 
} from './browserbase-worker/src/wallesterSmsMonitorMCP.mjs';

// Get first available phone
const phone = await getAvailablePhone();

// Poll for code (waits up to 5 minutes)
const result = await pollPhoneForCode(phone);

console.log('Code:', result.code);
```

### Method 3: CLI Mode

```bash
# Single check (gets first available phone, polls for 5 min)
node browserbase-worker/src/wallesterSmsMonitorMCP.mjs once

# Continuous monitoring (checks all assigned phones every 30s)
node browserbase-worker/src/wallesterSmsMonitorMCP.mjs watch
```

---

## 📊 Supabase Integration

### Adding Phone Numbers

```sql
-- Add UK phone from your smstome.com account
INSERT INTO sms_numbers_pool (phone_number, sms_url, country_code, country_name, status)
VALUES (
    '+447482733784',
    'https://smstome.com/uk/phone/447482733784/sms/12345',
    'UK',
    'United Kingdom',
    'available'
);

-- Add Finnish phones (you already have these)
INSERT INTO sms_numbers_pool (phone_number, sms_url, country_code, country_name, status)
VALUES 
    ('+3584573999024', 'https://smstome.com/finland/phone/3584573999024/sms/12881', 'FI', 'Finland', 'available'),
    ('+3584573999023', 'https://smstome.com/finland/phone/3584573999023/sms/12880', 'FI', 'Finland', 'available');
```

### Check Pool Status

```sql
-- See available phones
SELECT phone_number, status, country_name 
FROM sms_numbers_pool 
WHERE status = 'available';

-- See assigned phones (waiting for codes)
SELECT phone_number, assigned_to, last_verification_code
FROM sms_numbers_pool 
WHERE status = 'assigned';

-- See phones with codes received
SELECT phone_number, last_verification_code, last_message_from, last_message_at
FROM sms_numbers_pool 
WHERE last_verification_code IS NOT NULL;
```

### Assign Phone to User

```sql
-- Mark phone as assigned to a user/registration
UPDATE sms_numbers_pool
SET 
    status = 'assigned',
    assigned_to = 'wallester_registration_123',
    updated_at = NOW()
WHERE phone_number = '+447482733784';
```

### Release Phone Back to Pool

```sql
-- After code is used, release phone
UPDATE sms_numbers_pool
SET 
    status = 'available',
    assigned_to = NULL,
    last_verification_code = NULL,
    updated_at = NOW()
WHERE phone_number = '+447482733784';
```

---

## 🔄 Automated Workflow

### Full Wallester Registration Flow:

```javascript
// 1. Get available phone from pool
const phone = await getAvailablePhone();

if (!phone) {
    throw new Error('No available phones in pool');
}

// 2. Assign to user
await assignPhone(phone.id, `user_${userId}`);

// 3. Start Wallester registration (separate process)
await startWallesterRegistration({
    phone: phone.phone_number,
    userId: userId
});

// 4. Poll for SMS code
const smsResult = await pollPhoneForCode(phone, 5 * 60 * 1000); // 5 min timeout

if (!smsResult) {
    throw new Error('SMS code not received within timeout');
}

// 5. Use code in Wallester registration
await submitWallesterCode(smsResult.code);

// 6. Release phone back to pool
await supabase
    .from('sms_numbers_pool')
    .update({ 
        status: 'available', 
        assigned_to: null 
    })
    .eq('id', phone.id);
```

---

## 🎨 MCP Tools Deep Dive

### Tool 1: Create Session

```javascript
await window.mcpTools.browserbase_session_create({
    sessionId: 'wallester-sms-123'
});
```

### Tool 2: Navigate

```javascript
await window.mcpTools.browserbase_stagehand_navigate({
    url: 'https://smstome.com/finland/phone/3584573999024/sms/12881'
});
```

### Tool 3: Extract Data (AI-Powered)

```javascript
const messages = await window.mcpTools.browserbase_stagehand_extract({
    instruction: 'Extract all SMS messages. For each message get sender name and full text.'
});

// Returns:
// [
//   { from: "Wallester", text: "Your verification code is 123456" },
//   { from: "Amazon", text: "Your code: 789012" }
// ]
```

### Tool 4: Screenshot (for debugging)

```javascript
await window.mcpTools.browserbase_screenshot({
    name: 'sms-page-wallester-123'
});
```

### Tool 5: Close Session

```javascript
await window.mcpTools.browserbase_session_close();
```

---

## 🐛 Debugging

### Enable Verbose Logging

```javascript
// Add to wallesterSmsMonitorMCP.mjs
process.env.DEBUG = 'true';
```

### Test Single Phone

```bash
# Test with specific phone
node -e "
import('./browserbase-worker/src/wallesterSmsMonitorMCP.mjs').then(m => {
    m.checkPhoneNumberMCP({
        id: 'test-id',
        phone_number: '+447482733784',
        sms_url: 'https://smstome.com/uk/phone/447482733784/sms/12345'
    });
});
"
```

### Common Issues

**Issue: "MCP tools not available"**
- Solution: Run script via AI assistant, not directly with node
- The MCP tools are only available in Browserbase MCP environment

**Issue: "No messages extracted"**
- Check SMS URL is correct
- Verify phone number is active on smstome.com
- Try taking screenshot to see page content

**Issue: "Code not found in messages"**
- Check regex patterns in `extractWallesterCode()`
- Wallester codes are 6 digits
- Message might be in different format than expected

---

## 📈 Monitoring & Analytics

### Track Code Reception Rate

```sql
-- Success rate
SELECT 
    COUNT(*) FILTER (WHERE last_verification_code IS NOT NULL) as codes_received,
    COUNT(*) as total_assigned,
    ROUND(100.0 * COUNT(*) FILTER (WHERE last_verification_code IS NOT NULL) / COUNT(*), 2) as success_rate
FROM sms_numbers_pool
WHERE status = 'assigned' OR status = 'used';
```

### Average Wait Time

```sql
-- Average time to receive code
SELECT 
    AVG(EXTRACT(EPOCH FROM (last_message_at - updated_at))) as avg_wait_seconds
FROM sms_numbers_pool
WHERE last_message_at IS NOT NULL 
    AND last_verification_code IS NOT NULL;
```

### Most Active Senders

```sql
SELECT 
    last_message_from as sender,
    COUNT(*) as message_count
FROM sms_numbers_pool
WHERE last_message_from IS NOT NULL
GROUP BY last_message_from
ORDER BY message_count DESC;
```

---

## 🔗 Integration with Wallester Registration

### Supabase Edge Function Trigger

Create edge function to auto-monitor when phone is assigned:

```typescript
// supabase/functions/wallester_sms_monitor/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Get payload from webhook
    const { record } = await req.json();
    
    // Check if phone was just assigned
    if (record.status === 'assigned' && !record.last_verification_code) {
        
        // Trigger Browserbase session via MCP
        const response = await fetch('https://api.browserbase.com/v1/sessions', {
            method: 'POST',
            headers: {
                'X-BB-API-Key': Deno.env.get('BROWSERBASE_API_KEY')!,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                projectId: Deno.env.get('BROWSERBASE_PROJECT_ID'),
                metadata: {
                    action: 'wallester_sms_monitor',
                    phoneId: record.id,
                    phoneNumber: record.phone_number,
                    smsUrl: record.sms_url
                }
            })
        });
        
        const session = await response.json();
        
        console.log(`Started monitoring session: ${session.id} for ${record.phone_number}`);
        
        return new Response(JSON.stringify({ ok: true, sessionId: session.id }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json' }
    });
});
```

### Database Trigger

```sql
-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_wallester_sms_monitor()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if phone just became assigned
    IF NEW.status = 'assigned' AND OLD.status = 'available' THEN
        PERFORM net.http_post(
            url := 'https://your-project.supabase.co/functions/v1/wallester_sms_monitor',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
            ),
            body := jsonb_build_object('record', row_to_json(NEW))
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
CREATE TRIGGER on_phone_assigned
AFTER UPDATE ON sms_numbers_pool
FOR EACH ROW
EXECUTE FUNCTION trigger_wallester_sms_monitor();
```

---

## 📝 Testing Checklist

- [ ] **Add test phone to Supabase**
  ```sql
  INSERT INTO sms_numbers_pool (phone_number, sms_url, status)
  VALUES ('+447482733784', 'https://smstome.com/uk/phone/447482733784/sms/12345', 'available');
  ```

- [ ] **Mark phone as assigned**
  ```sql
  UPDATE sms_numbers_pool 
  SET status = 'assigned', assigned_to = 'test' 
  WHERE phone_number = '+447482733784';
  ```

- [ ] **Trigger SMS to phone** (send test message to +447482733784)

- [ ] **Run monitor via AI assistant**
  ```
  "Check smstome.com for codes on phone +447482733784"
  ```

- [ ] **Verify code extracted**
  ```sql
  SELECT last_verification_code FROM sms_numbers_pool 
  WHERE phone_number = '+447482733784';
  ```

---

## 🎯 Next Steps

1. **Test with your UK phones** from the list you provided
2. **Set up automated monitoring** with Supabase triggers
3. **Integrate with Wallester registration** workflow
4. **Add monitoring dashboard** to track success rates

---

## 💡 Tips & Best Practices

1. **Rate Limiting**: Don't check same phone more than once per 30 seconds
2. **Timeout Handling**: Code usually arrives within 1-2 minutes
3. **Phone Rotation**: Release phones back to pool after use
4. **Error Logging**: Always log failed extractions for debugging
5. **Screenshot on Failure**: Take screenshot if extraction fails

---

## 🆘 Support

If issues occur:

1. Check Browserbase MCP server is running
2. Verify Supabase credentials
3. Test SMS URL manually in browser
4. Check phone is active on smstome.com
5. Review extraction logs

**Created**: December 2, 2025  
**For**: Wallester Registration Automation  
**Integration**: Browserbase MCP + Supabase
