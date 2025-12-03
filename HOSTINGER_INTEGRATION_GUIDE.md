# 🌐 HOSTINGER AI BUILDER - Chat Agent Integration Guide
**Версия:** 1.0  
**Дата:** 3 Декември 2025

---

## 📋 СЪДЪРЖАНИЕ

1. [Преглед на Системата](#преглед-на-системата)
2. [Подготовка](#подготовка)
3. [Метод 1: Standalone Widget (Препоръчително)](#метод-1-standalone-widget)
4. [Метод 2: Iframe Embedding](#метод-2-iframe-embedding)
5. [Метод 3: WordPress Plugin](#метод-3-wordpress-plugin)
6. [Конфигурация](#конфигурация)
7. [Testing & Debugging](#testing--debugging)
8. [Production Deployment](#production-deployment)

---

## 🎯 ПРЕГЛЕД НА СИСТЕМАТА

### Какво е Chat Agent?

**Horizons Chat Agent** е интелигентен чат бот с 8 AI агента (Моника, Мирослава, Полина, и тр.), който:
- Водаче разговор с потребителя на български език
- Събира данни (име, презиме, фамилия, дата на раждане, имейл)
- Извършва проверка в Търговски регистър (via Supabase Edge Function)
- Create Wallester crypto card profiles
- Валидира данни в реално време

### Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    HOSTINGER WEBSITE                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              CHAT WIDGET (React)                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │   │
│  │  │   8 AI       │  │   Registry   │  │ User Data │ │   │
│  │  │   Agents     │  │   Check      │  │Collection │ │   │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                  ┌─────────────────────┐
                  │   SUPABASE BACKEND  │
                  │                     │
                  │  • registry_check   │
                  │  • users_pending    │
                  │  • verified_owners  │
                  └─────────────────────┘
```

---

## 🛠️ ПОДГОТОВКА

### 1. Файлове на Horizons Website

**Location:** `/home/administrator/Downloads/horizons-walle-bg.`

**Key Files:**
```
horizons-walle-bg./
├── src/
│   ├── components/
│   │   ├── ChatWidget.jsx           ← Main chat UI
│   │   ├── PreChatWelcomeScreen.jsx ← Initial screen with agent selection
│   │   └── ProfileFinalization.jsx  ← Data collection form
│   ├── hooks/
│   │   ├── useChatLogic.js          ← ⭐ Chat state machine & logic
│   │   └── useRegistryCheck.js      ← ⭐ Registry verification API calls
│   └── lib/
│       ├── agents.js                 ← ⭐ AI agents config (8 agents)
│       ├── services.js               ← API service layer
│       └── customSupabaseClient.js   ← Supabase client setup
├── vite.config.js                    ← Build configuration
└── package.json                      ← Dependencies
```

### 2. Необходими Credentials

```bash
# Supabase
VITE_SUPABASE_URL="https://ansiaiuaygcfztabtknl.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Optional: Wallester API (за production)
VITE_WALLESTER_API_URL="https://your-domain.com/api/wallester"

# Optional: CompanyBook Proxy (за production)
VITE_COMPANYBOOK_PROXY="https://your-domain.com/api/companybook"
```

---

## 📦 МЕТОД 1: STANDALONE WIDGET (Препоръчително)

Този метод build-ва chat widget като standalone JavaScript bundle, който може да се вложи в **всеки** website.

### Стъпка 1: Prepare Build Configuration

**Файл:** `vite.config.js`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/main-widget.jsx', // ← Нов entry point
      name: 'WallesterChat',
      fileName: (format) => `wallester-chat.${format}.js`,
      formats: ['umd'] // Universal Module Definition
    },
    rollupOptions: {
      external: [], // Bundle всичко вътре

      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        },
        assetFileNames: 'wallester-chat.[ext]' // CSS файл
      }
    }
  }
});
```

### Стъпка 2: Create Widget Entry Point

**Нов файл:** `src/main-widget.jsx`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './components/ChatWidget';
import './index.css';

// Global initialization function
window.WallesterChat = {
  init: function(config = {}) {
    const {
      supabaseUrl = process.env.VITE_SUPABASE_URL,
      supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY,
      position = 'bottom-right',
      theme = 'light',
      containerSelector = '#wallester-chat-root'
    } = config;

    // Store config globally
    window.__WALLESTER_CONFIG__ = {
      supabaseUrl,
      supabaseAnonKey,
      position,
      theme
    };

    // Create or get container
    let container = document.querySelector(containerSelector);
    if (!container) {
      container = document.createElement('div');
      container.id = 'wallester-chat-root';
      container.style.position = 'fixed';
      container.style.zIndex = '9999';
      
      // Position styling
      if (position === 'bottom-right') {
        container.style.bottom = '20px';
        container.style.right = '20px';
      } else if (position === 'bottom-left') {
        container.style.bottom = '20px';
        container.style.left = '20px';
      }
      
      document.body.appendChild(container);
    }

    // Render React app
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <ChatWidget config={window.__WALLESTER_CONFIG__} />
      </React.StrictMode>
    );

    console.log('✅ Wallester Chat Widget initialized');
  },

  destroy: function() {
    const container = document.querySelector('#wallester-chat-root');
    if (container) {
      container.remove();
    }
  }
};

// Auto-init if data attributes present
document.addEventListener('DOMContentLoaded', () => {
  const script = document.querySelector('script[data-wallester-chat]');
  if (script) {
    const config = {
      supabaseUrl: script.dataset.supabaseUrl,
      supabaseAnonKey: script.dataset.supabaseAnonKey,
      position: script.dataset.position || 'bottom-right',
      theme: script.dataset.theme || 'light'
    };
    window.WallesterChat.init(config);
  }
});
```

### Стъпка 3: Build Widget

```bash
cd /home/administrator/Downloads/horizons-walle-bg.

# Install dependencies
npm install

# Build for production
npm run build

# Output files:
# dist/wallester-chat.umd.js  (JavaScript bundle)
# dist/wallester-chat.css      (Styles)
```

### Стъпка 4: Upload to CDN

**Option A: Cloudflare R2 / Bunny CDN**
```bash
# Upload dist files to CDN
# Example with Cloudflare
wrangler r2 object put wallester-chat/wallester-chat.umd.js --file=dist/wallester-chat.umd.js
wrangler r2 object put wallester-chat/wallester-chat.css --file=dist/wallester-chat.css
```

**Option B: Hostinger File Manager**
1. Login to Hostinger control panel
2. Go to File Manager
3. Navigate to `public_html/assets/chat/`
4. Upload `wallester-chat.umd.js` and `wallester-chat.css`

### Стъпка 5: Integrate in Hostinger Website

**Метод 5A: Manual Script Injection**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Horizons - Wallester</title>
  
  <!-- Chat Widget CSS -->
  <link rel="stylesheet" href="https://your-cdn.com/wallester-chat.css">
  <!-- OR local -->
  <link rel="stylesheet" href="/assets/chat/wallester-chat.css">
</head>
<body>
  
  <!-- Your website content -->
  
  <!-- Chat Widget Script -->
  <script src="https://your-cdn.com/wallester-chat.umd.js"></script>
  <!-- OR local -->
  <script src="/assets/chat/wallester-chat.umd.js"></script>
  
  <!-- Initialize Chat -->
  <script>
    WallesterChat.init({
      supabaseUrl: 'https://ansiaiuaygcfztabtknl.supabase.co',
      supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      position: 'bottom-right', // or 'bottom-left'
      theme: 'light' // or 'dark'
    });
  </script>
</body>
</html>
```

**Метод 5B: Auto-Init with Data Attributes**

```html
<script 
  src="/assets/chat/wallester-chat.umd.js"
  data-wallester-chat
  data-supabase-url="https://ansiaiuaygcfztabtknl.supabase.co"
  data-supabase-anon-key="eyJhbGci..."
  data-position="bottom-right"
  data-theme="light"
></script>
<link rel="stylesheet" href="/assets/chat/wallester-chat.css">
```

**Метод 5C: Hostinger AI Builder Custom Code**

1. Login to Hostinger
2. Go to Website Builder → Settings → Custom Code
3. Add to "Before </body> tag":

```html
<link rel="stylesheet" href="/assets/chat/wallester-chat.css">
<script src="/assets/chat/wallester-chat.umd.js"></script>
<script>
  WallesterChat.init({
    supabaseUrl: 'https://ansiaiuaygcfztabtknl.supabase.co',
    supabaseAnonKey: 'YOUR_ANON_KEY_HERE',
    position: 'bottom-right',
    theme: 'light'
  });
</script>
```

---

## 🖼️ МЕТОД 2: IFRAME EMBEDDING

Най-простият метод - embed-ни Horizons website като iframe.

### Стъпка 1: Deploy Horizons Website

```bash
cd /home/administrator/Downloads/horizons-walle-bg.

# Build
npm run build

# Deploy to Hostinger (example with FTP)
# Upload dist/ contents to public_html/chat/
```

**URL:** `https://horizons.walle.bg/` (или subdirectory: `/chat/`)

### Стъпка 2: Add Iframe to Target Website

```html
<!-- Fixed position chat iframe -->
<iframe 
  id="wallester-chat-iframe"
  src="https://horizons.walle.bg/"
  style="
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    height: 600px;
    border: none;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 9999;
  "
  allow="clipboard-write"
></iframe>

<!-- Toggle button (optional) -->
<button 
  id="chat-toggle"
  onclick="toggleChat()"
  style="
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    cursor: pointer;
    z-index: 10000;
  "
>
  💬
</button>

<script>
  function toggleChat() {
    const iframe = document.getElementById('wallester-chat-iframe');
    const button = document.getElementById('chat-toggle');
    
    if (iframe.style.display === 'none') {
      iframe.style.display = 'block';
      button.style.display = 'none';
    } else {
      iframe.style.display = 'none';
      button.style.display = 'block';
    }
  }
  
  // Start hidden
  document.getElementById('wallester-chat-iframe').style.display = 'none';
</script>
```

### Mobile Responsive

```html
<style>
  @media (max-width: 768px) {
    #wallester-chat-iframe {
      width: 100vw !important;
      height: 100vh !important;
      bottom: 0 !important;
      right: 0 !important;
      border-radius: 0 !important;
    }
  }
</style>
```

---

## 🔌 МЕТОД 3: WORDPRESS PLUGIN

За WordPress/WooCommerce сайтове на Hostinger.

### Plugin Files

**Location:** `deploy/hostinger/wp-wallester-chat-agent.php`

```php
<?php
/**
 * Plugin Name: Wallester Chat Agent
 * Description: Интегрира Horizons Wallester чат агент
 * Version: 1.0.0
 * Author: Horizons Team
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Wallester_Chat_Agent {
    
    private $supabase_url;
    private $supabase_anon_key;
    
    public function __construct() {
        $this->supabase_url = get_option('wallester_supabase_url', '');
        $this->supabase_anon_key = get_option('wallester_supabase_anon_key', '');
        
        add_action('wp_footer', array($this, 'render_chat_widget'));
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    public function render_chat_widget() {
        if (empty($this->supabase_url) || empty($this->supabase_anon_key)) {
            return;
        }
        ?>
        <link rel="stylesheet" href="<?php echo plugin_dir_url(__FILE__); ?>assets/wallester-chat.css">
        <script src="<?php echo plugin_dir_url(__FILE__); ?>assets/wallester-chat.umd.js"></script>
        <script>
          WallesterChat.init({
            supabaseUrl: '<?php echo esc_js($this->supabase_url); ?>',
            supabaseAnonKey: '<?php echo esc_js($this->supabase_anon_key); ?>',
            position: 'bottom-right',
            theme: 'light'
          });
        </script>
        <?php
    }
    
    public function add_settings_page() {
        add_options_page(
            'Wallester Chat Settings',
            'Wallester Chat',
            'manage_options',
            'wallester-chat',
            array($this, 'render_settings_page')
        );
    }
    
    public function register_settings() {
        register_setting('wallester_chat_settings', 'wallester_supabase_url');
        register_setting('wallester_chat_settings', 'wallester_supabase_anon_key');
    }
    
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>Wallester Chat Agent Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('wallester_chat_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">Supabase URL</th>
                        <td>
                            <input type="text" name="wallester_supabase_url" 
                                   value="<?php echo esc_attr($this->supabase_url); ?>" 
                                   class="regular-text">
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Supabase Anon Key</th>
                        <td>
                            <input type="text" name="wallester_supabase_anon_key" 
                                   value="<?php echo esc_attr($this->supabase_anon_key); ?>" 
                                   class="large-text">
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}

// Initialize plugin
new Wallester_Chat_Agent();
```

### Installation

```bash
# 1. Create plugin directory
mkdir -p wp-content/plugins/wallester-chat-agent

# 2. Upload files
wp-content/plugins/wallester-chat-agent/
├── wp-wallester-chat-agent.php
└── assets/
    ├── wallester-chat.umd.js
    └── wallester-chat.css

# 3. Activate via WordPress Admin
wp plugin activate wallester-chat-agent
```

---

## ⚙️ КОНФИГУРАЦИЯ

### Environment Variables

**Development (.env.local):**
```bash
VITE_SUPABASE_URL=https://ansiaiuaygcfztabtknl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_WALLESTER_API_URL=http://localhost:4323
VITE_COMPANYBOOK_PROXY=http://localhost:4321
```

**Production (.env.production):**
```bash
VITE_SUPABASE_URL=https://ansiaiuaygcfztabtknl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_WALLESTER_API_URL=https://api.walle.bg/wallester
VITE_COMPANYBOOK_PROXY=https://api.walle.bg/companybook
```

### Agent Configuration

**Файл:** `src/lib/agents.js`

8 AI Agents:
1. **Моника** - hristova_moni9
2. **Мирослава** - miragrozeva
3. **Полина** - popimolii
4. **Кристин** - k_venkovaa1
5. **Рая** - dmtrva99
6. **Мирела** - bbymonichka
7. **Стефани** - danailovaaa77
8. **Йоана** - yoni_5kova

**Customize Responses:**
```javascript
const baseResponses = {
  greeting: { 
    text: ["Хейй 😊", "Здравей 🙂", "Здрасти 🙃"] 
  },
  greeting_followup: {
    text: ["Как да ти помогна?"],
    options: [{ text: "Създай профил", icon: "User" }],
  },
  // ... more responses
};
```

### Registry Check Integration

**Файл:** `src/hooks/useRegistryCheck.js`

```javascript
const performRegistryCheck = async (fullName, email) => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/registry_check`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ full_name: fullName, email })
    }
  );
  
  const data = await response.json();
  return data; // { any_match, match_count, companies, ... }
};
```

---

## 🧪 TESTING & DEBUGGING

### Local Development

```bash
cd /home/administrator/Downloads/horizons-walle-bg.

# Start dev server
npm run dev

# Open: http://localhost:5173
```

### Debug Mode

Add to `src/main-widget.jsx`:

```javascript
window.WallesterChat = {
  init: function(config = {}) {
    // Enable debug mode
    window.__WALLESTER_DEBUG__ = config.debug || false;
    
    if (window.__WALLESTER_DEBUG__) {
      console.log('🔍 Wallester Chat Debug Mode');
      console.log('Config:', config);
    }
    
    // ... rest of init
  }
};
```

### Testing Checklist

- [ ] Agent selection screen appears
- [ ] Can select an agent (e.g., Моника)
- [ ] Registration flow starts
- [ ] Can input First Name (Cyrillic validation)
- [ ] Can input Patronymic (Cyrillic validation)
- [ ] Can input Last Name (Cyrillic validation)
- [ ] Can input Birth Date (DD.MM.YYYY format)
- [ ] Age validation (18+ required)
- [ ] Can input Email (Email format validation)
- [ ] Registry check triggers on submit
- [ ] Shows appropriate response (match/no match)
- [ ] Data saved to `users_pending` table

### Common Issues

**Issue 1: "Supabase client not initialized"**
```javascript
// Check if config passed correctly
console.log(window.__WALLESTER_CONFIG__);
```

**Issue 2: "CORS error"**
- Add domain to Supabase allowed origins
- Settings → API → CORS Allowed Origins

**Issue 3: "Registry check fails"**
- Check Edge Function is deployed
- Verify ANON_KEY has correct permissions
- Test Edge Function directly

---

## 🚀 PRODUCTION DEPLOYMENT

### Pre-Deployment Checklist

- [ ] Test all flows локално
- [ ] Update environment variables за production
- [ ] Build optimized bundle (`npm run build`)
- [ ] Upload to CDN or Hostinger
- [ ] Configure CORS в Supabase
- [ ] Test на live website
- [ ] Setup error monitoring (Sentry)
- [ ] Configure analytics (Google Analytics)

### Build for Production

```bash
# Clean previous builds
rm -rf dist/

# Build with production env
NODE_ENV=production npm run build

# Output size check
ls -lh dist/
# Should be:
# wallester-chat.umd.js (~300-500 KB gzipped)
# wallester-chat.css (~50-100 KB)
```

### Performance Optimization

**1. Code Splitting:**
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js']
        }
      }
    }
  }
});
```

**2. Lazy Loading:**
```jsx
// src/components/ChatWidget.jsx
import { lazy, Suspense } from 'react';

const ProfileFinalization = lazy(() => import('./ProfileFinalization'));

function ChatWidget() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProfileFinalization />
    </Suspense>
  );
}
```

**3. CDN Caching:**
```
# CloudFlare Rules
Cache-Control: public, max-age=31536000, immutable
```

### Monitoring & Analytics

**Add to widget init:**
```javascript
WallesterChat.init({
  // ... other config
  analytics: {
    enabled: true,
    googleAnalyticsId: 'G-XXXXXXXXXX',
    events: {
      chat_opened: true,
      agent_selected: true,
      form_submitted: true,
      registry_checked: true
    }
  }
});
```

---

## 📞 SUPPORT

### Resources
- **Project Status:** `PROJECT_STATUS_COMPLETE.md`
- **API Docs:** `server/*/README.md`
- **Troubleshooting:** See "Common Issues" above

### Debug Commands

```bash
# Check if servers running
curl http://localhost:4321/health  # CompanyBook Proxy
curl http://localhost:4322/status  # Proxy Status
curl http://localhost:4323/health  # Wallester API

# Test Supabase Edge Function
curl -X POST https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/registry_check \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test Name","email":"test@example.com"}'
```

---

**Дата:** 3 Декември 2025  
**Версия:** 1.0.0  
**Автор:** Registry Stagehand Worker Team
