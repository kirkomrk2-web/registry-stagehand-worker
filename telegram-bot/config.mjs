// telegram-bot/config.mjs
/**
 * Telegram Bot Configuration
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Telegram
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  adminId: process.env.TELEGRAM_ADMIN_ID || '',
  targetGroups: (process.env.TELEGRAM_TARGET_GROUPS || '').split(',').filter(Boolean),
  
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // Chat Agent
  chatAgentUrl: process.env.CHAT_AGENT_URL || 'https://walle.bg',
  chatAgentWidgetUrl: process.env.CHAT_AGENT_WIDGET_URL || 'https://walle.bg/chat',
  
  // Scheduling
  postSchedule: process.env.POST_SCHEDULE || '0 10,15,20 * * *', // 10am, 3pm, 8pm
  
  // Rate Limiting
  maxMessagesPerMinute: parseInt(process.env.MAX_MESSAGES_PER_MINUTE || '10'),
  
  // Session
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1800000'), // 30 minutes
};

// Validate config
export function validateConfig() {
  const required = ['botToken', 'supabaseUrl', 'supabaseServiceRoleKey'];
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing required config: ${missing.join(', ')}`);
    console.error('Please check your .env file');
    process.exit(1);
  }
  
  console.log('✅ Configuration validated');
}
