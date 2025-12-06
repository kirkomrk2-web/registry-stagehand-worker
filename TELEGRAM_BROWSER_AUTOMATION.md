# 🌐 Telegram Browser Automation System
**Дата:** 3 Декември 2025  
**Метод:** Browserbase MCP + Browser-Use/Stagehand  
**Статус:** Design & Implementation

---

## 🎯 Цел

Автоматизация на Telegram Web профили за:
- ✅ Scrapta на потребители
- ✅ Отговори на чатове
- ✅ Изпращане на снимки
- ✅ Пускане на реклами в групи
- ✅ Умно лайкване на съобщения

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────┐
│         Browserbase MCP Session                  │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │      Telegram Web (web.telegram.org)     │   │
│  │                                          │   │
│  │  Profile: Kristina / New Profile        │   │
│  │  Stealth Mode: ON                        │   │
│  │  Static Proxy: Configured                │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  Extensions:                                     │
│  • Profile Manager                               │
│  • Stealth Mode                                  │
│  • Anti-Detection                                │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│         Automation Actions                       │
├─────────────────────────────────────────────────┤
│  1. Login & Session Management                  │
│  2. User Scraping                                │
│  3. Chat Responses                               │
│  4. Image Sending                                │
│  5. Group Posting                                │
│  6. Smart Liking (5-10 msg, no bots/admins)     │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│         Supabase Database                        │
│  • telegram_profiles                             │
│  • telegram_actions                              │
│  • telegram_liked_messages                       │
│  • telegram_scraped_users                        │
└─────────────────────────────────────────────────┘
```

---

## 📋 Действия и Логика

### 1. Влизане в Профил
```javascript
// Login to Telegram Web with profile
async function loginTelegram(profileName = 'Kristina') {
  // Start Browserbase session with stealth
  await sessionCreate();
  
  // Navigate to Telegram Web
  await navigate('https://web.telegram.org');
  
  // Load profile or create new
  const profile = await loadProfile(profileName);
  
  // Login if needed (QR code or phone)
  await handleLogin(profile);
  
  return session;
}
```

### 2. Scraping на Потребители
```javascript
// Scrape users from groups
async function scrapeUsers(groupName) {
  // Navigate to group
  await navigate(`https://web.telegram.org/#/im?p=g${groupName}`);
  
  // Extract user list
  const users = await extract({
    instruction: 'Extract all usernames from the member list'
  });
  
  // Save to database
  await saveScrapedUsers(users);
  
  return users;
}
```

### 3. Отговори на Чатове
```javascript
// Reply to chat messages
async function replyToChats() {
  // Get unread chats
  const chats = await extract({
    instruction: 'Find all unread chat conversations'
  });
  
  for (const chat of chats) {
    // Read message
    await act({ action: `Click on chat ${chat.name}` });
    
    const message = await extract({
      instruction: 'Get the last message text'
    });
    
    // Generate response (AI or template)
    const response = generateResponse(message);
    
    // Type and send
    await act({ action: 'Type in message input', variables: { text: response } });
    await act({ action: 'Click send button' });
  }
}
```

### 4. Изпращане на Снимки
```javascript
// Send images to chats
async function sendImage(chatName, imagePath) {
  // Open chat
  await act({ action: `Click on chat ${chatName}` });
  
  // Click attach button
  await act({ action: 'Click attach file button' });
  
  // Upload image
  await act({ action: 'Upload image file', variables: { path: imagePath } });
  
  // Send
  await act({ action: 'Click send button' });
}
```

### 5. Пускане на Реклама в Групи
```javascript
// Post ads in groups
async function postAdInGroups(groups, adText) {
  for (const group of groups) {
    // Navigate to group
    await act({ action: `Open group ${group.name}` });
    
    // Type ad
    await act({ action: 'Type in message box', variables: { text: adText } });
    
    // Send
    await act({ action: 'Click send' });
    
    console.log(`✅ Posted ad in ${group.name}`);
    
    // Wait between posts (anti-spam)
    await sleep(randomBetween(60000, 120000)); // 1-2 min
  }
}
```

### 6. Умно Лайкване (Smart Liking)
```javascript
// Smart liking with rules
async function smartLiking(groupName) {
  // Navigate to group
  await act({ action: `Open group ${groupName}` });
  
  // Get last 20 messages
  const messages = await extract({
    instruction: 'Extract last 20 messages with author, text, and timestamp'
  });
  
  // Filter messages
  const likeable = messages.filter(msg => {
    // Don't like bots
    if (msg.author.endsWith('bot')) return false;
    
    // Don't like admins
    if (msg.isAdmin) return false;
    
    // Check if we liked from this user recently (last 1-2 hours)
    if (wasLikedRecently(msg.author)) return false;
    
    return true;
  });
  
  // Like every 5-10 messages
  const toLike = [];
  let counter = 0;
  for (const msg of likeable) {
    counter++;
    if (counter >= randomBetween(5, 10)) {
      toLike.push(msg);
      counter = 0;
    }
  }
  
  // Perform likes
  for (const msg of toLike) {
    await act({ action: `React to message ${msg.id} with thumbs up` });
    await saveLikedMessage(msg);
    await sleep(randomBetween(2000, 5000)); // 2-5 sec between likes
  }
  
  console.log(`✅ Liked ${toLike.length} messages in ${groupName}`);
}
```

---

## 🗄️ Database Schema

```sql
-- Telegram profiles table
CREATE TABLE IF NOT EXISTS telegram_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  username TEXT,
  session_data JSONB,
  last_used TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telegram actions log
CREATE TABLE IF NOT EXISTS telegram_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES telegram_profiles(id),
  action_type TEXT NOT NULL, -- 'scrape', 'reply', 'post', 'like', 'send_image'
  target TEXT, -- group/chat name
  details JSONB,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Liked messages tracking (avoid double-liking)
CREATE TABLE IF NOT EXISTS telegram_liked_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES telegram_profiles(id),
  group_name TEXT NOT NULL,
  message_id TEXT NOT NULL,
  author_username TEXT,
  liked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, message_id)
);

-- Scraped users
CREATE TABLE IF NOT EXISTS telegram_scraped_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES telegram_profiles(id),
  username TEXT NOT NULL,
  full_name TEXT,
  group_source TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  contacted BOOLEAN DEFAULT FALSE,
  UNIQUE(profile_id, username, group_source)
);

-- Create indexes
CREATE INDEX idx_liked_messages_profile ON telegram_liked_messages(profile_id, liked_at);
CREATE INDEX idx_scraped_users_profile ON telegram_scraped_users(profile_id, scraped_at);
CREATE INDEX idx_actions_profile ON telegram_actions(profile_id, performed_at);
```

---

## 🔧 Implementation Files

### File Structure
```
browserbase-worker/src/
├── telegramBrowserWorker.mjs        # Main worker
├── telegramProfileManager.mjs       # Profile management
├── telegramActions.mjs              # Action handlers
├── telegramSmartLiking.mjs          # Smart liking logic
└── telegramScrapers.mjs             # User scraping
```

### Configuration
```javascript
// telegram-config.mjs
export const TELEGRAM_CONFIG = {
  webUrl: 'https://web.telegram.org',
  
  profiles: {
    kristina: {
      phone: '+358XXXXXXXXX',
      username: '@kristina_helper',
    }
  },
  
  liking: {
    minInterval: 5,  // Min messages between likes
    maxInterval: 10, // Max messages between likes
    recentWindow: 7200000, // 2 hours in ms
    excludeBots: true,
    excludeAdmins: true,
  },
  
  posting: {
    minDelay: 60000,  // 1 min between posts
    maxDelay: 120000, // 2 min between posts
  },
  
  scraping: {
    maxUsers: 100,
    includeInactive: false,
  }
};
```

---

## 🚀 Usage Examples

### Example 1: Start Session and Login
```javascript
import { loginTelegram } from './telegramBrowserWorker.mjs';

// Login with Kristina profile
const session = await loginTelegram('Kristina');
console.log('✅ Logged in as Kristina');
```

### Example 2: Scrape Users from Group
```javascript
import { scrapeUsersFromGroup } from './telegramScrapers.mjs';

const users = await scrapeUsersFromGroup('Crypto Bulgaria');
console.log(`✅ Scraped ${users.length} users`);
```

### Example 3: Post Ad in Multiple Groups
```javascript
import { postAdInGroups } from './telegramActions.mjs';

const groups = ['Crypto Bulgaria', 'Bitcoin BG', 'Blockchain Sofia'];
const ad = `🚀 WALLESTER КРИПТОКАРТИ!\n\n✅ Бързо одобрение\n💬 Свържи се: @wallester_helper_bot`;

await postAdInGroups(groups, ad);
```

### Example 4: Smart Liking in Group
```javascript
import { smartLikingInGroup } from './telegramSmartLiking.mjs';

// Like messages smartly (every 5-10 msgs, no bots/admins)
await smartLikingInGroup('Crypto Bulgaria');
```

### Example 5: Reply to Chats
```javascript
import { replyToUnreadChats } from './telegramActions.mjs';

await replyToUnreadChats({
  responseTemplate: 'Здравейте! Благодаря за съобщението. Как мога да помогна?'
});
```

---

## 🎮 Test Script

```javascript
#!/usr/bin/env node
// test_telegram_automation.mjs

import { 
  'cqhs-X0mcp0browserbase_session_create' as sessionCreate,
  'cqhs-X0mcp0browserbase_stagehand_navigate' as navigate,
  'cqhs-X0mcp0browserbase_stagehand_act' as act,
  'cqhs-X0mcp0browserbase_stagehand_extract' as extract,
  'cqhs-X0mcp0browserbase_screenshot' as screenshot,
} from '../mcp-tools'; // You'll use MCP tools

async function testTelegramAutomation() {
  console.log('🚀 Starting Telegram Browser Automation Test...\n');
  
  // Step 1: Create session
  console.log('1️⃣ Creating Browserbase session...');
  const session = await sessionCreate();
  console.log('✅ Session created\n');
  
  // Step 2: Navigate to Telegram Web
  console.log('2️⃣ Navigating to Telegram Web...');
  await navigate('https://web.telegram.org');
  await sleep(5000);
  console.log('✅ Loaded Telegram Web\n');
  
  // Step 3: Take screenshot
  console.log('3️⃣ Taking screenshot...');
  await screenshot('telegram_web_loaded');
  console.log('✅ Screenshot saved\n');
  
  // Step 4: Check if logged in
  console.log('4️⃣ Checking login status...');
  const loginStatus = await extract({
    instruction: 'Check if user is logged in or needs to login'
  });
  console.log(`Status: ${JSON.stringify(loginStatus)}\n`);
  
  // Step 5: If not logged in, show QR or phone login
  if (loginStatus.needsLogin) {
    console.log('⚠️ Login required. Please scan QR or enter phone.\n');
    await screenshot('telegram_login_screen');
  } else {
    console.log('✅ Already logged in!\n');
    
    // Step 6: Get chat list
    console.log('5️⃣ Getting chat list...');
    const chats = await extract({
      instruction: 'Extract list of all chats with names'
    });
    console.log(`Found ${chats.length} chats:`, chats);
  }
  
  console.log('\n🎉 Test completed!');
}

// Run test
testTelegramAutomation().catch(console.error);
```

---

## 🔒 Security & Stealth

### Stealth Режим
```javascript
// Use stealth settings
const stealthConfig = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  timezone: 'Europe/Sofia',
  locale: 'bg-BG',
  webrtc: 'disabled',
  canvas: 'noise',
  webgl: 'noise',
};
```

### Proxy Configuration
```javascript
// Use static proxy
const proxyConfig = {
  host: 'proxy.example.com',
  port: 8080,
  username: 'user',
  password: 'pass',
  country: 'BG',
};
```

### Anti-Detection
- Random delays between actions (2-5 sec)
- Human-like mouse movements
- Random typing speeds
- Realistic pauses
- Session persistence

---

## 📊 Monitoring

### Action Logging
```javascript
async function logAction(profileId, actionType, target, details) {
  await supabase.from('telegram_actions').insert({
    profile_id: profileId,
    action_type: actionType,
    target: target,
    details: details,
    performed_at: new Date().toISOString(),
  });
}
```

### Dashboard Queries
```sql
-- Actions today
SELECT action_type, COUNT(*) as count
FROM telegram_actions
WHERE performed_at >= CURRENT_DATE
GROUP BY action_type;

-- Users scraped this week
SELECT COUNT(*) 
FROM telegram_scraped_users
WHERE scraped_at >= CURRENT_DATE - INTERVAL '7 days';

-- Likes given per group
SELECT group_name, COUNT(*) as likes
FROM telegram_liked_messages
WHERE liked_at >= CURRENT_DATE
GROUP BY group_name;
```

---

## 🎯 Next Steps

1. **Create Database Tables** (run SQL above)
2. **Implement Worker Files**
3. **Setup Stealth Profile**
4. **Test with Kristina Profile**
5. **Deploy & Monitor**

---

**Last Updated:** 3 Декември 2025, 16:00 EET  
**Status:** ✅ Design complete, ready for implementation
