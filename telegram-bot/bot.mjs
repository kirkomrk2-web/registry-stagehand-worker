#!/usr/bin/env node
// telegram-bot/bot.mjs
/**
 * Wallester Helper Telegram Bot
 * Automated user acquisition and lead generation
 */

import { Telegraf, session } from 'telegraf';
import cron from 'node-cron';
import { config, validateConfig } from './config.mjs';
import { TEMPLATES, KEYBOARDS } from './templates.mjs';
import { saveUser, getUserStatus, trackChatLinkClick, getBotStats } from './supabase.mjs';

// Validate configuration
validateConfig();

// Create bot instance
const bot = new Telegraf(config.botToken);

// Session middleware
bot.use(session());

// Rate limiting
const userRateLimits = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimit = userRateLimits.get(userId) || { count: 0, resetAt: now };
  
  if (now > userLimit.resetAt) {
    userRateLimits.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  
  if (userLimit.count >= config.maxMessagesPerMinute) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

// Email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Name validation (3 parts)
function isValidFullName(name) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 3;
}

// Initialize session
function initSession(ctx) {
  if (!ctx.session) ctx.session = {};
  if (!ctx.session.state) ctx.session.state = 'idle';
  if (!ctx.session.data) ctx.session.data = {};
}

// ===== COMMAND HANDLERS =====

bot.command('start', async (ctx) => {
  initSession(ctx);
  ctx.session.state = 'idle';
  ctx.session.data = {};
  
  await ctx.reply(TEMPLATES.welcome, { 
    reply_markup: KEYBOARDS.start,
    parse_mode: 'Markdown'
  });
  
  console.log(`👤 /start from ${ctx.from.username || ctx.from.id}`);
});

bot.command('help', async (ctx) => {
  await ctx.reply(TEMPLATES.help, { parse_mode: 'Markdown' });
});

bot.command('info', async (ctx) => {
  await ctx.reply(TEMPLATES.moreInfo, { 
    reply_markup: KEYBOARDS.moreInfo,
    parse_mode: 'Markdown'
  });
});

bot.command('chat', async (ctx) => {
  const chatLink = `${config.chatAgentWidgetUrl}?ref=telegram_${ctx.from.id}`;
  
  await ctx.reply(
    `💬 Директна връзка към AI асистента:\n\n${chatLink}`,
    { reply_markup: KEYBOARDS.chatLink(chatLink) }
  );
});

bot.command('status', async (ctx) => {
  initSession(ctx);
  const email = ctx.session.data.email;
  
  if (!email) {
    await ctx.reply('❌ Нямате активна регистрация. Натиснете /start за да започнете.');
    return;
  }
  
  const result = await getUserStatus(email);
  
  if (result.success && result.data) {
    await ctx.reply(TEMPLATES.status({
      name: ctx.session.data.name,
      email: ctx.session.data.email,
      fullName: ctx.session.data.fullName,
      status: result.data.status,
      chatLink: ctx.session.data.chatLink,
    }));
  } else {
    await ctx.reply('❌ Не можем да намерим вашата регистрация.');
  }
});

// Admin commands
bot.command('stats', async (ctx) => {
  if (ctx.from.id.toString() !== config.adminId) {
    await ctx.reply('❌ Unauthorized');
    return;
  }
  
  const result = await getBotStats();
  
  if (result.success) {
    await ctx.reply(TEMPLATES.adminStats(result.stats));
  } else {
    await ctx.reply(`❌ Error: ${result.error}`);
  }
});

bot.command('post', async (ctx) => {
  if (ctx.from.id.toString() !== config.adminId) {
    await ctx.reply('❌ Unauthorized');
    return;
  }
  
  await postToGroups();
  await ctx.reply('✅ Posted to all groups');
});

// ===== CALLBACK QUERY HANDLERS =====

bot.action('has_company', async (ctx) => {
  await ctx.answerCbQuery();
  initSession(ctx);
  
  ctx.session.state = 'awaiting_name';
  ctx.session.data.hasCompany = true;
  
  await ctx.reply(TEMPLATES.askName);
  console.log(`✅ User has company: ${ctx.from.username || ctx.from.id}`);
});

bot.action('no_company', async (ctx) => {
  await ctx.answerCbQuery();
  
  await ctx.reply(TEMPLATES.noCompany, { 
    reply_markup: KEYBOARDS.noCompany 
  });
  console.log(`❌ User has no company: ${ctx.from.username || ctx.from.id}`);
});

bot.action('more_info', async (ctx) => {
  await ctx.answerCbQuery();
  
  await ctx.reply(TEMPLATES.moreInfo, { 
    reply_markup: KEYBOARDS.moreInfo,
    parse_mode: 'Markdown'
  });
});

bot.action('start_chat', async (ctx) => {
  await ctx.answerCbQuery();
  
  const chatLink = `${config.chatAgentWidgetUrl}?ref=telegram_${ctx.from.id}_nocmp`;
  
  await ctx.reply(
    `💬 Свържете се с нашия AI асистент:\n\n${chatLink}`,
    { reply_markup: KEYBOARDS.chatLink(chatLink) }
  );
});

bot.action('back_to_start', async (ctx) => {
  await ctx.answerCbQuery();
  
  await ctx.reply(TEMPLATES.welcome, { 
    reply_markup: KEYBOARDS.start,
    parse_mode: 'Markdown'
  });
});

// ===== TEXT MESSAGE HANDLER =====

bot.on('text', async (ctx) => {
  // Rate limiting
  if (!checkRateLimit(ctx.from.id)) {
    await ctx.reply(TEMPLATES.rateLimit);
    return;
  }
  
  initSession(ctx);
  const state = ctx.session.state;
  const text = ctx.message.text.trim();
  
  // Ignore commands
  if (text.startsWith('/')) return;
  
  try {
    switch (state) {
      case 'awaiting_name':
        ctx.session.data.name = text;
        ctx.session.state = 'awaiting_email';
        await ctx.reply(TEMPLATES.askEmail(text));
        console.log(`📝 Name collected: ${text}`);
        break;
        
      case 'awaiting_email':
        if (!isValidEmail(text)) {
          await ctx.reply(TEMPLATES.invalidEmail);
          return;
        }
        
        ctx.session.data.email = text;
        ctx.session.state = 'awaiting_full_name';
        await ctx.reply(TEMPLATES.askFullName);
        console.log(`📧 Email collected: ${text}`);
        break;
        
      case 'awaiting_full_name':
        if (!isValidFullName(text)) {
          await ctx.reply(TEMPLATES.invalidName);
          return;
        }
        
        ctx.session.data.fullName = text;
        ctx.session.state = 'completed';
        
        // Save to Supabase
        const userData = {
          fullName: text,
          email: ctx.session.data.email,
          telegramUserId: ctx.from.id,
          telegramUsername: ctx.from.username || null,
        };
        
        const result = await saveUser(userData);
        
        if (result.success) {
          // Generate chat link
          const chatLink = `${config.chatAgentWidgetUrl}?ref=telegram_${ctx.session.data.name.toLowerCase().replace(/\s+/g, '_')}`;
          ctx.session.data.chatLink = chatLink;
          
          // Track link click potential
          await trackChatLinkClick(ctx.session.data.email);
          
          // Send success message
          await ctx.reply(
            TEMPLATES.success(ctx.session.data.name, chatLink),
            { 
              reply_markup: KEYBOARDS.chatLink(chatLink),
              parse_mode: 'Markdown'
            }
          );
          
          console.log(`✅ Registration complete: ${ctx.session.data.email}`);
        } else {
          await ctx.reply(TEMPLATES.error);
          console.error(`❌ Failed to save user: ${result.error}`);
        }
        break;
        
      default:
        // Default response - guide to /start
        await ctx.reply('👋 Здравейте! Натиснете /start за да започнете или /help за помощ.');
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await ctx.reply(TEMPLATES.error);
  }
});

// ===== GROUP POSTING SCHEDULER =====

async function postToGroups() {
  if (config.targetGroups.length === 0) {
    console.log('⚠️  No target groups configured');
    return;
  }
  
  for (const groupId of config.targetGroups) {
    try {
      await bot.telegram.sendMessage(groupId, TEMPLATES.groupAd, {
        parse_mode: 'Markdown'
      });
      console.log(`✅ Posted to group: ${groupId}`);
      
      // Wait 5 seconds between posts to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`❌ Failed to post to ${groupId}:`, error.message);
    }
  }
}

// Schedule posts (10am, 3pm, 8pm daily)
if (config.targetGroups.length > 0) {
  cron.schedule(config.postSchedule, async () => {
    console.log('📅 Scheduled post triggered');
    await postToGroups();
  });
  console.log(`📅 Group posting scheduled: ${config.postSchedule}`);
}

// ===== ERROR HANDLING =====

bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  
  // Notify admin
  if (config.adminId) {
    bot.telegram.sendMessage(
      config.adminId,
      `🚨 Bot Error:\n\n${err.message}\n\nUser: ${ctx.from?.username || ctx.from?.id}`
    ).catch(() => {});
  }
});

// ===== START BOT =====

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

bot.launch().then(() => {
  console.log('✅ Bot started successfully!');
  console.log(`👤 Bot username: @${bot.botInfo.username}`);
  console.log(`🔗 Chat agent URL: ${config.chatAgentUrl}`);
  console.log(`📊 Target groups: ${config.targetGroups.length}`);
  console.log('🚀 Ready to receive messages...\n');
}).catch((error) => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
});
