// telegram-bot/supabase.mjs
/**
 * Supabase Integration for Telegram Bot
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config.mjs';

// Create Supabase client with service role key (for backend operations)
const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey
);

/**
 * Save user to users_pending table
 */
export async function saveUser(userData) {
  try {
    const { data, error } = await supabase
      .from('users_pending')
      .upsert({
        full_name: userData.fullName,
        email: userData.email,
        telegram_user_id: userData.telegramUserId,
        telegram_username: userData.telegramUsername,
        referral_source: 'telegram_bot',
        status: 'pending',
        created_at: new Date().toISOString(),
      }, { onConflict: 'email' })
      .select()
      .single();

    if (error) throw error;
    
    console.log(`✅ User saved to Supabase: ${userData.email}`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Supabase save error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get user status from users_pending
 */
export async function getUserStatus(email) {
  try {
    const { data, error } = await supabase
      .from('users_pending')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Supabase get error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update chat link click tracking
 */
export async function trackChatLinkClick(email) {
  try {
    const { error } = await supabase
      .from('users_pending')
      .update({
        clicked_chat_link: true,
        chat_link_clicked_at: new Date().toISOString(),
      })
      .eq('email', email);

    if (error) throw error;
    
    console.log(`✅ Chat link click tracked: ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Supabase update error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get bot statistics
 */
export async function getBotStats() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Total users
    const { count: totalUsers } = await supabase
      .from('users_pending')
      .select('*', { count: 'exact', head: true })
      .eq('referral_source', 'telegram_bot');

    // Active today (created today)
    const { count: activeToday } = await supabase
      .from('users_pending')
      .select('*', { count: 'exact', head: true })
      .eq('referral_source', 'telegram_bot')
      .gte('created_at', today);

    // Pending
    const { count: pending } = await supabase
      .from('users_pending')
      .select('*', { count: 'exact', head: true })
      .eq('referral_source', 'telegram_bot')
      .eq('status', 'pending');

    // Completed
    const { count: completed } = await supabase
      .from('users_pending')
      .select('*', { count: 'exact', head: true })
      .eq('referral_source', 'telegram_bot')
      .eq('status', 'ready_for_stagehand');

    return {
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        activeToday: activeToday || 0,
        pending: pending || 0,
        completed: completed || 0,
        messagesToday: 0, // TODO: Track in separate table
        postsToday: 0, // TODO: Track in separate table
      }
    };
  } catch (error) {
    console.error('❌ Stats error:', error.message);
    return { success: false, error: error.message };
  }
}

export default supabase;
