# 🤖 Wallester Helper Telegram Bot

Automated Telegram bot for user acquisition and lead generation.

## 🚀 Quick Start

```bash
# 1. Install dependencies
cd /home/administrator/Documents/registry_stagehand_worker
npm install telegraf node-cron dotenv @supabase/supabase-js

# 2. Configure environment (see ../TELEGRAM_BOT_SETUP.md)
cp .env.example .env
# Edit .env with your credentials

# 3. Run bot
node telegram-bot/bot.mjs

# Or with PM2
pm2 start telegram-bot/bot.mjs --name telegram-bot
```

## 📁 File Structure

```
telegram-bot/
├── bot.mjs          # Main bot logic
├── config.mjs       # Configuration
├── templates.mjs    # Message templates
├── supabase.mjs     # Database integration
└── README.md        # This file
```

## ⚙️ Configuration

Required environment variables in `.env`:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_ID=your_telegram_user_id
SUPABASE_URL=https://ansiaiuaygcfztabtknl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CHAT_AGENT_URL=https://walle.bg
TELEGRAM_TARGET_GROUPS=-1001234567890,-1009876543210
```

## 💬 Bot Commands

### User Commands
- `/start` - Start registration
- `/help` - Show help
- `/info` - More information
- `/chat` - Direct chat link
- `/status` - Check status

### Admin Commands
- `/stats` - Bot statistics
- `/post` - Manual group post

## 🎯 Features

✅ Smart conversation flow  
✅ Email validation  
✅ Supabase integration  
✅ Scheduled group posting (10am, 3pm, 8pm)  
✅ Rate limiting  
✅ Error handling  
✅ Admin notifications

## 📊 How It Works

1. User sends `/start`
2. Bot asks if they have EOOD/ET
3. Collects: name, email, full name
4. Saves to Supabase `users_pending` table
5. Sends chat agent link
6. Scheduled posts to groups 3x daily

## 🔒 Security

- Rate limiting (10 messages/minute)
- Environment variables for secrets
- Admin-only commands
- Input validation

## 📝 Documentation

See `../TELEGRAM_BOT_SETUP.md` for full setup instructions.

## 🐛 Troubleshooting

```bash
# Check if bot is running
pm2 status telegram-bot

# View logs
pm2 logs telegram-bot

# Restart bot
pm2 restart telegram-bot
```

## 📞 Support

For issues, contact the system administrator or check the logs.
