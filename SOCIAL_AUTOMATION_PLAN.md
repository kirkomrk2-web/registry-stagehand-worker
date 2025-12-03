# 🤖 SOCIAL MEDIA AUTOMATION MASTER PLAN
## Instagram, Telegram, Facebook - AI-Powered Agent Automation

---

## 📋 EXECUTIVE SUMMARY

**Цел:** Автоматизиране на 8 социални медия профила (по един за всеки агент) в Instagram, Telegram и евентуално Facebook, с AI-powered отговори базирани на "Eva" personality.

**Агенти:**
1. Моnika (@hristova_moni9)
2. Мирослава (@miragrozeva)
3. Полина (@popimolii)
4. Кристин (@k_venkovaa1)
5. Рая (@dmtrva99)
6. Мирела (@bbymonichka)
7. Стефани (@danailovaaa77)
8. Йоана (@yoni_5kova)

**Платформи:**
- Instagram (готови 10 акаунта от bundle)
- Telegram (вече конфигурирани handles)
- Facebook (за по-късно)

**Функционалности:**
- Like на постове/съобщения
- Comment/Reply с AI отговори
- Forward съобщения (Telegram)
- Bulk send съобщения (Telegram)
- Изпращане на images/videos/audio
- Humanlike behavior с random intervals

---

## 🎭 AI PERSONALITY: EVA

### Базов Profil
```yaml
Име: [Agent Name] (напр. Кристин)
Пол: Жена
Роля: AI асистент с чар и интелигентност
Специализация: Разговори с мъже в социални медии
Тон: Топъл, внимателен, закачлив с мярка

Характер:
  - Топла и внимателна
  - Чувство за хумор
  - Закачлива но с граници
  - Избягва вулгарност
  - Интелигентна с клас

Граници:
  - НЕ позволява сексуално съдържание
  - НЕ толерира неуместни коментари
  - НЕ отговаря на заплахи
  - НЕ споделя лични данни
  - НЕ играе NSFW роли
```

### Примерни Отговори
```
Комплимент: "Много си секси, искам те"
→ "Хм, това не е точно комплимент, нали? Можеш повече 😊"

Поздрав: "Хей, красавице!"
→ "Здрасти! О, започваме силно 😄 Как се казваш?"

Флирт с мярка: "Готина си"
→ "О, това беше мило, благодаря 😊 Имаш добър вкус 😉"

Сексуален намек:
→ "Хей, нека пазим добрия тон – обичам интелигентни разговори!"

Агресия:
→ [Предупреждение] → [Ignore]
```

---

## 🛠️ ТЕХНОЛОГИЧЕН СТЕК

### Option 1: Stagehand + BitBrowser (Recommended)
**Предимства:**
- Вече имаш опит със Stagehand
- BitBrowser поддържа multi-account management
- Stealth режим за evading detection
- Proxy rotation вграден

**Архитектура:**
```
BitBrowser Profile 1-8 (по един за всеки агент)
    ↓
Stagehand Worker (за всеки profile)
    ↓
OpenAI API (GPT-4 с Eva personality)
    ↓
Actions: Like, Comment, Forward, Send
```

### Option 2: Browser-Use + Browserbase
**Предимства:**
- Cloud-based (без локална машина)
- Scaling е по-лесно
- Вече използваш Browserbase

**Архитектура:**
```
Browserbase Session (persistent за всеки агент)
    ↓
browser-use automation
    ↓
OpenAI/Anthropic API
    ↓
Social Media Actions
```

### Option 3: Hybrid Approach (BEST)
**Комбинация от двете:**
```
Instagram: BitBrowser + Stagehand (нужен е stealth mode)
Telegram: Direct API + TG Bulk Send extension
Facebook: Browserbase + browser-use (за scaling)
```

---

## 📱 PLATFORM-SPECIFIC IMPLEMENTATION

### 1. INSTAGRAM AUTOMATION

#### Setup Requirements
**Accounts:** 10 готови от bundle provider
- Login: Email + Password + 2FA (2fa.live)
- Security keys в Excel файл
- Example: `ACHG W64D ZJC6 WIEP 7Q3Q KFHP QSAC YMFO`

**Best Practices:**
- ✅ 1-3 accounts per IP address
- ✅ Use clean home IP or quality proxies (NO spam databases)
- ✅ Random intervals between actions
- ✅ Humanlike behavior: likes, story views, follows, comments

#### Implementation с BitBrowser + Stagehand

**File: `src/instagramWorker.mjs`**
```javascript
import { ChromeLauncher } from '@browserbasehq/stagehand';
import { BitBrowserClient } from './lib/BitBrowserClient.mjs';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function instagramWorker(agentProfile) {
    // 1. Launch BitBrowser profile
    const bitBrowser = new BitBrowserClient();
    const profile = await bitBrowser.createProfile({
        name: agentProfile.name,
        proxy: agentProfile.proxy,
        userAgent: 'mobile' // Instagram prefers mobile
    });
    
    // 2. Launch Stagehand in BitBrowser
    const stagehand = new ChromeLauncher({
        browserPath: profile.executablePath,
        headless: false
    });
    
    await stagehand.init();
    const page = stagehand.page;
    
    // 3. Login to Instagram
    await page.goto('https://www.instagram.com/accounts/login/');
    await page.act('Fill in email field with ' + agentProfile.instagram.email);
    await page.act('Fill in password field with ' + agentProfile.instagram.password);
    await page.act('Click login button');
    
    // 4. Handle 2FA
    if (await page.observe('Is there a 2FA code input?')) {
        const code = await generate2FACode(agentProfile.instagram.tfaSecret);
        await page.act(`Type ${code} into the 2FA field`);
        await page.act('Submit 2FA');
    }
    
    // 5. Main automation loop
    while (true) {
        try {
            // Check DMs
            await page.goto('https://www.instagram.com/direct/inbox/');
            const hasNewMessages = await page.observe('Are there unread messages?');
            
            if (hasNewMessages) {
                const messages = await page.extract('Extract all unread messages with sender username and message text');
                
                for (const msg of messages) {
                    // Generate AI response
                    const aiResponse = await generateEvaResponse(msg.text, agentProfile.name);
                    
                    // Send reply
                    await page.act(`Click on conversation with ${msg.sender}`);
                    await page.act(`Type "${aiResponse}" into message input`);
                    await page.act('Send message');
                    
                    // Random delay (humanlike)
                    await randomDelay(2000, 5000);
                }
            }
            
            // Like posts from feed
            await page.goto('https://www.instagram.com/');
            await page.act('Scroll down the feed');
            const posts = await page.extract('Extract first 3 posts with username');
            
            for (const post of posts) {
                await page.act(`Like the post by ${post.username}`);
                await randomDelay(1000, 3000);
            }
            
            // Wait before next iteration
            await randomDelay(60000, 120000); // 1-2 minutes
            
        } catch (error) {
            console.error('Instagram worker error:', error);
            await randomDelay(300000, 600000); // Wait 5-10 min on error
        }
    }
}

async function generate2FACode(secret) {
    // Use 2fa.live API or implement TOTP locally
    const response = await fetch('https://2fa.live/tok/' + secret);
    const data = await response.json();
    return data.token.slice(-6); // Last 6 digits
}

async function generateEvaResponse(userMessage, agentName) {
    const systemPrompt = `Ти си ${agentName}, AI асистент с personality на Eva.
    
Характер:
- Топла, внимателна, с чувство за хумор
- Закачлива, но поставя граници
- Избягва вулгарност
- Интелигентна, отговаря с класа

Граници:
- НЕ позволява сексуално съдържание
- НЕ толерира неуместни коментари
- НЕ споделя лични данни

Отговори кратко, естествено и с чар.`;

    const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ],
        temperature: 0.8,
        max_tokens: 100
    });
    
    return completion.choices[0].message.content;
}

function randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}
```

**Run Instagram Worker:**
```bash
node src/instagramWorker.mjs --agent kristin
```

---

### 2. TELEGRAM AUTOMATION

#### Setup Requirements
**Tools:**
- TG Bulk Send (Chrome extension - вече имаш paid version)
- Telegram Bot API (за auto-forwarding)
- Auto Forwarder for TG (iPhone/Android app)

#### Implementation Option A: Telegram Bot API

**File: `src/telegramWorker.mjs`**
```javascript
import TelegramBot from 'node-telegram-bot-api';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function telegramWorker(agentProfile) {
    const bot = new TelegramBot(agentProfile.telegram.botToken, { polling: true });
    
    // Handle incoming messages
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const userMessage = msg.text;
        
        // Generate AI response
        const aiResponse = await generateEvaResponse(userMessage, agentProfile.name);
        
        // Send response
        await bot.sendMessage(chatId, aiResponse);
        
        // Log interaction
        console.log(`[${agentProfile.name}] Replied to ${msg.from.username}: ${aiResponse}`);
    });
    
    // Handle photos/videos
    bot.on('photo', async (msg) => {
        const chatId = msg.chat.id;
        await bot.sendMessage(chatId, "О, хубава снимка! 📸 Благодаря за споделянето 😊");
    });
    
    console.log(`[${agentProfile.name}] Telegram worker started`);
}
```

#### Implementation Option B: TG Bulk Send Integration

**File: `src/telegramBulkSender.mjs`**
```javascript
// Използва TG Bulk Send extension през Stagehand
import { ChromeLauncher } from '@browserbasehq/stagehand';

export async function telegramBulkSend(message, recipients) {
    const stagehand = new ChromeLauncher({
        extensionPaths: ['/path/to/tg-bulk-send-extension']
    });
    
    await stagehand.init();
    const page = stagehand.page;
    
    // 1. Open Telegram Web
    await page.goto('https://web.telegram.org/');
    
    // 2. Activate TG Bulk Send extension
    await page.act('Click on TG Bulk Send icon');
    
    // 3. Select recipients
    for (const recipient of recipients) {
        await page.act(`Select contact ${recipient}`);
    }
    
    // 4. Type message
    await page.act(`Type message: "${message}"`);
    
    // 5. Send to all
    await page.act('Click Send to All button');
    
    console.log(`Bulk message sent to ${recipients.length} recipients`);
}
```

#### Auto-Forwarding Setup
```javascript
// За iPhone/Android Auto Forwarder app
// Конфигурация през config file:

export const forwardingRules = {
    kristin: {
        sourceChannels: ['@wallester_news', '@fintech_bg'],
        targetChats: ['@kristin_personal_chat'],
        filters: {
            keywords: ['карта', 'лимит', 'такса', 'wallester'],
            excludeKeywords: ['спам', 'реклама']
        }
    },
    // ... други агенти
};
```

---

### 3. FACEBOOK AUTOMATION (Future)

**Recommendation:** Използвай Browserbase + browser-use за scaling

**File: `src/facebookWorker.mjs`**
```javascript
import { BrowserbaseClient } from './lib/BrowserbaseClient.mjs';
import { Agent } from 'browser-use';

export async function facebookWorker(agentProfile) {
// Similar implementation като Instagram
    // но през Browserbase за cloud execution
}
```

---

## 🔄 UNIFIED AUTOMATION ORCHESTRATOR

**File: `src/socialMediaOrchestrator.mjs`**
```javascript
import { instagramWorker } from './instagramWorker.mjs';
import { telegramWorker } from './telegramWorker.mjs';
import { facebookWorker } from './facebookWorker.mjs';

const AGENTS = [
    {
        name: 'Кристин',
        nameEn: 'kristin',
        instagram: {
            email: 'kristin.ig@wallesters.com',
            password: process.env.KRISTIN_IG_PASSWORD,
            tfaSecret: process.env.KRISTIN_IG_2FA
        },
        telegram: {
            botToken: process.env.KRISTIN_TG_BOT_TOKEN,
            username: 'k_venkovaa1'
        },
        proxy: {
            host: '123.456.789.0',
            port: 8080,
            username: 'user',
            password: 'pass'
        }
    },
    // ... други 7 агента
];

async function main() {
    console.log('🚀 Starting Social Media Automation Orchestrator');
    
    // Start worker за всеки агент
    for (const agent of AGENTS) {
        // Instagram worker
        instagramWorker(agent).catch(err => {
            console.error(`Instagram worker failed for ${agent.name}:`, err);
        });
        
        // Telegram worker
        telegramWorker(agent).catch(err => {
            console.error(`Telegram worker failed for ${agent.name}:`, err);
        });
        
        // Facebook worker (when ready)
        // facebookWorker(agent).catch(err => {
        //     console.error(`Facebook worker failed for ${agent.name}:`, err);
        // });
        
        console.log(`✅ Workers started for ${agent.name}`);
    }
    
    // Keep process alive
    process.on('SIGINT', () => {
        console.log('Shutting down gracefully...');
        process.exit(0);
    });
}

main();
```

**Run Orchestrator:**
```bash
node src/socialMediaOrchestrator.mjs
```

---

## 📦 MEDIA HANDLING (Images, Videos, Audio)

### Send Media via Telegram Bot API
```javascript
// В telegramWorker.mjs
async function sendMedia(chatId, mediaType, mediaUrl, caption) {
    switch (mediaType) {
        case 'photo':
            await bot.sendPhoto(chatId, mediaUrl, { caption });
            break;
        case 'video':
            await bot.sendVideo(chatId, mediaUrl, { caption });
            break;
        case 'audio':
            await bot.sendAudio(chatId, mediaUrl, { caption });
            break;
        case 'document':
            await bot.sendDocument(chatId, mediaUrl, { caption });
            break;
    }
}

// Example usage
await sendMedia(
    chatId, 
    'photo', 
    'https://wallester-cdn.com/promo.jpg',
    'Виж новата ни промоция! 🎉'
);
```

### Send Media via Instagram (Stagehand)
```javascript
// В instagramWorker.mjs
async function sendInstagramDM(page, username, message, imagePath = null) {
    await page.goto(`https://www.instagram.com/direct/new/`);
    await page.act(`Search for user ${username}`);
    await page.act(`Select ${username} from results`);
    
    if (imagePath) {
        await page.act('Click attach image button');
        await page.act(`Upload image from ${imagePath}`);
    }
    
    await page.act(`Type message: "${message}"`);
    await page.act('Send message');
}
```

---

## 🔐 SECURITY & COMPLIANCE

### Instagram Account Safety
```yaml
Action Limits (per account per day):
  Likes: 50-100
  Comments: 20-30
  Follows: 20-50
  DMs: 20-30
  
Intervals:
  Between likes: 30-60 seconds
  Between comments: 2-5 minutes
  Between DMs: 3-8 minutes
  
IP Management:
  Accounts per IP: 1-3 max
  Proxy rotation: Every 24 hours
  Use residential proxies (NOT datacenter)
```

### Data Storage (Supabase)
```sql
-- Table: social_interactions
CREATE TABLE social_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_name TEXT NOT NULL,
    platform TEXT NOT NULL, -- 'instagram', 'telegram', 'facebook'
    interaction_type TEXT NOT NULL, -- 'message', 'like', 'comment', 'forward'
    user_identifier TEXT, -- username or chat_id
    user_message TEXT,
    ai_response TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX idx_interactions_agent ON social_interactions(agent_name);
CREATE INDEX idx_interactions_platform ON social_interactions(platform);
```

---

## 📊 MONITORING & ANALYTICS

### Dashboard (Supabase + UI)
```javascript
// Analytics query
const getAgentStats = async (agentName) => {
    const { data } = await supabase
        .from('social_interactions')
        .select('platform, interaction_type, COUNT(*)')
        .eq('agent_name', agentName)
        .gte('timestamp', new Date(Date.now() - 24*60*60*1000)) // Last 24h
        .group('platform, interaction_type');
    
    return data;
};

// Example output:
// [
//   { platform: 'instagram', interaction_type: 'message', count: 45 },
//   { platform: 'instagram', interaction_type: 'like', count: 120 },
//   { platform: 'telegram', interaction_type: 'message', count: 78 }
// ]
```

### Error Handling & Alerts
```javascript
// В всеки worker добави error tracking
try {
    // automation code
} catch (error) {
    // Log to Supabase
    await supabase.from('automation_errors').insert({
        agent_name: agentProfile.name,
        platform: 'instagram',
        error_message: error.message,
        stack_trace: error.stack
    });
    
    // Send Telegram alert
    await sendTelegramAlert(`⚠️ Error for ${agentProfile.name}: ${error.message}`);
}
```

---

## 🚀 DEPLOYMENT PLAN

### Phase 1: Instagram Only (Week 1)
1. ✅ Setup 10 Instagram accounts с 2FA
2. ✅ Configure BitBrowser profiles (1-3 accounts per proxy)
3. ✅ Implement instagramWorker.mjs
4. ✅ Test с 1 account за humanlike behavior
5. ✅ Scale to allacci 8 agents
6. ✅ Monitor за 3-7 дни

### Phase 2: Telegram Integration (Week 2)
1. ✅ Create Telegram bots за всеки агент
2. ✅ Implement telegramWorker.mjs
3. ✅ Configure TG Bulk Send extension
4. ✅ Setup auto-forwarding rules
5. ✅ Test messaging flow

### Phase 3: Unified Orchestrator (Week 3)
1. ✅ Merge Instagram + Telegram workers
2. ✅ Implement socialMediaOrchestrator.mjs
3. ✅ Setup monitoring dashboard
4. ✅ Analytics & reporting

### Phase 4: Facebook (Future)
1. ⏳ Research Facebook automation limits
2. ⏳ Implement facebookWorker.mjs
3. ⏳ Integrate в orchestrator

---

## 💰 COST ESTIMATION

```yaml
Infrastructure:
  BitBrowser License: $50-100/month
  Residential Proxies (8 IPs): $80-150/month
  Browserbase (if used): $50-200/month
  
APIs:
  OpenAI GPT-4: ~$30-100/month (зависи от usage)
  Telegram Bot API: FREE
  
Tools:
  TG Bulk Send Extension: $XX (вече имаш)
  Auto Forwarder App: $5-10/month per device
  
Total Monthly: $215-560/month
```

---

## 📝 NEXT IMMEDIATE STEPS

### 1. Instagram Account Setup (TODAY)
```bash
# Create directory
mkdir -p accounts/instagram

# Download account credentials от bundle provider
# Format: accounts/instagram/accounts.xlsx

# Test login с първия account
node scripts/testInstagramLogin.mjs --account 1
```

### 2. BitBrowser Configuration (TODAY)
```bash
# Install BitBrowser
# Create 8 profiles (по един за всеки агент)

# Test proxy connectivity
node scripts/testProxies.mjs
```

### 3. Implement Base Worker (TOMORROW)
```bash
# Create instagramWorker.mjs
cd src
touch instagramWorker.mjs

# Implement basic functionality:
# - Login
# - 2FA handling
# - DM reading
# - AI response generation
```

### 4. Test & Iterate (DAYS 3-5)
- Run worker за 1 account
- Monitor за suspicious activity
- Adjust delays/intervals
- Scale to 2-3 accounts

### 5. Full Rollout (WEEK 2)
- Deploy за всички 8 agents
- Setup monitoring
- Run 24/7

---

## 🎯 SUCCESS METRICS

```yaml
Week 1:
  - 8 Instagram accounts active
  - Average 30-50 interactions per account per day
  - 0 account suspensions
  - AI response quality score: 8+/10

Week 2:
  - Telegram bot responding to 50+ messages/day per agent
  - Bulk send успешно за promotional campaigns
  - Auto-forwarding работи reliable

Month 1:
  - 10,000+ total interactions across all platforms
  - User engagement rate: 15%+
  - Lead conversion: 5%+
```

---

## ⚠️ RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Instagram account ban | HIGH | Use residential proxies, humanlike intervals, 1-3 acc per IP |
| AI responses too generic | MEDIUM | Fine-tune Eva personality, add context awareness |
| Scaling issues | MEDIUM | Use cloud infrastructure (Browserbase) |
| Cost overruns | LOW | Monitor API usage, optimize GPT-4 calls |
| Legal/compliance | MEDIUM | Ensure GDPR compliance, no spam behavior |

---

## 📚 RESOURCES & DOCUMENTATION

**Instagram:**
- 2FA setup: https://2fa.live
- Account limits: https://later.com/blog/instagram-limits/

**Telegram:**
- Bot API docs: https://core.telegram.org/bots/api
- TG Bulk Send: [Your extension link]

**Tools:**
- Stagehand: https://github.com/browserbase/stagehand
- BitBrowser: [Your license]
- browser-use: https://github.com/browser-use/browser-use

---

**Created:** 1 Декември 2025, 22:52  
**Status:** 📋 READY FOR IMPLEMENTATION  
**Next Review:** After Phase 1 completion
