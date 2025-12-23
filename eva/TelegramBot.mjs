/**
 * 📱 EVA TELEGRAM BOT
 * 
 * Telegram интеграция за Eva AI системата
 * Приема съобщения, обработва ги през Eva engine и отговаря
 */

import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import EvaConversationEngine from './EvaConversationEngine.mjs';
import DataExtractor from './DataExtractor.mjs';
import BehaviorAnalyzer from './BehaviorAnalyzer.mjs';

export class EvaTelegramBot {
  constructor(config = {}) {
    // Telegram Bot
    this.bot = new TelegramBot(
      config.telegramToken || process.env.EVA_TELEGRAM_TOKEN,
      { polling: true }
    );

    // Supabase
    this.supabase = createClient(
      config.supabaseUrl || process.env.SUPABASE_URL,
      config.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Eva Engine
    this.eva = new EvaConversationEngine({
      openaiApiKey: config.openaiApiKey || process.env.OPENAI_API_KEY
    });

    // Data Extractor
    this.dataExtractor = new DataExtractor();

    // Behavior Analyzer
    this.behaviorAnalyzer = new BehaviorAnalyzer();

    // Setup message handlers
    this.setupHandlers();

    console.log('✅ Eva Telegram Bot инициализиран!');
  }

  /**
   * 🎯 Setup event handlers
   */
  setupHandlers() {
    // Text messages
    this.bot.on('message', async (msg) => {
      if (msg.text) {
        await this.handleMessage(msg);
      }
    });

    // Error handling
    this.bot.on('polling_error', (error) => {
      console.error('❌ Telegram polling error:', error.message);
      this.logError('telegram_polling', error);
    });

    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      await this.handleStart(msg);
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      await this.bot.sendMessage(
        msg.chat.id,
        "Здрасти! Аз съм Eva 😊 Просто ми пиши каквото искаш и ще разговаряме!"
      );
    });

    console.log('📡 Telegram handlers setup complete');
  }

  /**
   * 👋 Handle /start command
   */
  async handleStart(msg) {
    const userId = msg.from.id.toString();
    const username = msg.from.username || msg.from.first_name || 'там';

    // Check if user exists
    const { data: existingUser } = await this.supabase
      .from('eva_users')
      .select('*')
      .eq('platform', 'telegram')
      .eq('platform_user_id', userId)
      .single();

    if (existingUser) {
      // Returning user
      await this.bot.sendMessage(
        msg.chat.id,
        `Хей, ${existingUser.first_name || username}! Как си? 😊`
      );
    } else {
      // New user - create profile
      await this.createUser(userId, username);
      
      await this.bot.sendMessage(
        msg.chat.id,
        "Здрасти! Аз съм Eva 😊 Приятно ми е да се запознаем! Как се казваш?"
      );
    }
  }

  /**
   * 💬 Handle incoming message
   */
  async handleMessage(msg) {
    const userId = msg.from.id.toString();
    const username = msg.from.username || msg.from.first_name;
    const messageText = msg.text;
    const chatId = msg.chat.id;

    try {
      console.log(`📨 Получено от @${username}: "${messageText}"`);

      // Get or create user
      let user = await this.getOrCreateUser(userId, username);

      // Check for boundary violations
      const violation = this.eva.detectBoundaryViolation(messageText);
      
      if (violation.detected) {
        await this.handleBoundaryViolation(user, violation, messageText, chatId);
        return;
      }

      // Save incoming message
      await this.saveMessage(user.id, 'incoming', messageText);

      // Update user interaction time
      await this.updateLastInteraction(user.id);

      // Get conversation context
      const context = await this.getConversationContext(user.id);

      // Generate Eva response
      const evaResponse = await this.eva.generateResponse(messageText, context);

      if (!evaResponse.success) {
        console.error('❌ Eva generation failed:', evaResponse.error);
        await this.bot.sendMessage(chatId, evaResponse.response);
        return;
      }

      // Extract data from message (names, interests, etc.)
      const extractedData = await this.dataExtractor.extract(messageText);
      
      // Update user profile with extracted data
      if (extractedData.names.length > 0 || extractedData.interests.length > 0) {
        await this.updateUserProfile(user.id, extractedData);
      }

      // Analyze sentiment
      const sentiment = await this.behaviorAnalyzer.analyzeSentiment(messageText);
      await this.updateSentiment(user.id, sentiment);

      // Save Eva's outgoing message
      await this.saveMessage(
        user.id,
        'outgoing',
        evaResponse.response,
        {
          strategy: evaResponse.analysis.strategy,
          model: evaResponse.model,
          generation_time_ms: evaResponse.generationTimeMs
        }
      );

      // Update analytics
      await this.updateAnalytics(user.id, { sentiment });

      // Check if ready for KYC
      const updatedUser = await this.getUser(user.id);
      if (this.eva.isReadyForKYC(updatedUser) && !updatedUser.kyc_link_sent) {
        await this.updateConversationStage(user.id, 'kyc_ready');
      }

      // Send response
      await this.bot.sendMessage(chatId, evaResponse.response);

      console.log(`✅ Eva отговори: "${evaResponse.response}"`);

    } catch (error) {
      console.error('❌ Error handling message:', error);
      await this.logError('message_handling', error, { userId, messageText });
      
      // Send fallback
      await this.bot.sendMessage(
        chatId,
        "Извинявай, имам малък технически проблем 🙈 Можеш ли да опиташ пак?"
      );
    }
  }

  /**
   * 🚫 Handle boundary violation
   */
  async handleBoundaryViolation(user, violation, messageText, chatId) {
    console.warn(`⚠️  Boundary violation: ${violation.type} by user ${user.id}`);

    // Log violation
    await this.supabase.from('eva_boundary_events').insert({
      user_id: user.id,
      event_type: violation.type,
      message_text: messageText,
      severity: violation.severity,
      action_taken: violation.severity === 'critical' ? 'blocked' : 'warning'
    });

    // Update analytics
    await this.supabase
      .from('eva_analytics')
      .update({
        boundary_violations: this.supabase.raw('boundary_violations + 1')
      })
      .eq('user_id', user.id);

    // Generate boundary response
    const response = await this.eva.generateBoundaryResponse(violation);

    // Save messages
    await this.saveMessage(user.id, 'incoming', messageText, { 
      violation: true,
      violation_type: violation.type 
    });
    await this.saveMessage(user.id, 'outgoing', response, { 
      strategy: 'boundary_setting' 
    });

    // Send response
    await this.bot.sendMessage(chatId, response);

    // If critical, block further messages temporarily
    if (violation.severity === 'critical') {
      await this.bot.sendMessage(
        chatId,
        "Разговорът приключва тук. Довиждане."
      );
      // Could implement actual blocking here
    }
  }

  /**
   * 👤 Get or create user
   */
  async getOrCreateUser(platformUserId, username) {
    // Try to get existing user
    const { data: existingUser } = await this.supabase
      .from('eva_users')
      .select('*')
      .eq('platform', 'telegram')
      .eq('platform_user_id', platformUserId)
      .single();

    if (existingUser) {
      return existingUser;
    }

    // Create new user
    return await this.createUser(platformUserId, username);
  }

  /**
   * ➕ Create new user
   */
  async createUser(platformUserId, username) {
    const { data, error } = await this.supabase
      .from('eva_users')
      .insert({
        platform: 'telegram',
        platform_user_id: platformUserId,
        username: username,
        conversation_stage: 'initial'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }

    console.log(`✅ Created new user: ${username} (${platformUserId})`);
    return data;
  }

  /**
   * 📖 Get user by ID
   */
  async getUser(userId) {
    const { data, error } = await this.supabase
      .from('eva_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error getting user:', error);
      throw error;
    }

    return data;
  }

  /**
   * 💾 Save message to database
   */
  async saveMessage(userId, direction, text, metadata = {}) {
    const { error } = await this.supabase
      .from('eva_conversations')
      .insert({
        user_id: userId,
        message_direction: direction,
        message_text: text,
        message_metadata: metadata
      });

    if (error) {
      console.error('❌ Error saving message:', error);
    }

    // Update user message count
    await this.supabase
      .from('eva_users')
      .update({
        total_messages: this.supabase.raw('total_messages + 1'),
        last_message_text: text
      })
      .eq('id', userId);
  }

  /**
   * 📚 Get conversation context
   */
  async getConversationContext(userId) {
    // Get user info
    const user = await this.getUser(userId);

    // Get recent messages
    const { data: messages } = await this.supabase
      .from('eva_conversations')
      .select('message_direction, message_text, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get analytics
    const { data: analytics } = await this.supabase
      .from('eva_analytics')
      .select('*')
      .eq('user_id', userId)
      .single();

    return {
      userName: user.first_name,
      userInterests: user.profile_data?.interests || [],
      conversationStage: user.conversation_stage,
      sentimentScore: user.sentiment_score,
      recentMessages: (messages || []).reverse().map(m => ({
        direction: m.message_direction,
        text: m.message_text
      }))
    };
  }

  /**
   * 🔄 Update user profile with extracted data
   */
  async updateUserProfile(userId, extractedData) {
    const updates = {};

    // Names
    if (extractedData.names.length > 0) {
      if (!updates.first_name && extractedData.names[0]) {
        updates.first_name = extractedData.names[0];
      }
      if (!updates.middle_name && extractedData.names[1]) {
        updates.middle_name = extractedData.names[1];
      }
      if (!updates.last_name && extractedData.names[2]) {
        updates.last_name = extractedData.names[2];
      }

      // If all 3 names collected
      if (extractedData.names.length >= 3) {
        updates.names_collected_at = new Date().toISOString();
      }
    }

    // Interests
    if (extractedData.interests.length > 0) {
      const { data: user } = await this.supabase
        .from('eva_users')
        .select('profile_data')
        .eq('id', userId)
        .single();

      const currentInterests = user?.profile_data?.interests || [];
      const newInterests = [...new Set([...currentInterests, ...extractedData.interests])];

      updates.profile_data = {
        ...(user?.profile_data || {}),
        interests: newInterests
      };
    }

    if (Object.keys(updates).length > 0) {
      await this.supabase
        .from('eva_users')
        .update(updates)
        .eq('id', userId);
    }
  }

  /**
   * 📊 Update sentiment
   */
  async updateSentiment(userId, sentiment) {
    await this.supabase.rpc('track_eva_sentiment', {
      user_uuid: userId,
      new_sentiment_score: sentiment.score
    });
  }

  /**
   * ⏰ Update last interaction
   */
  async updateLastInteraction(userId) {
    await this.supabase
      .from('eva_users')
      .update({ last_interaction_at: new Date().toISOString() })
      .eq('id', userId);
  }

  /**
   * 📈 Update analytics
   */
  async updateAnalytics(userId, data) {
    const updates = {
      total_messages: this.supabase.raw('total_messages + 1')
    };

    if (data.sentiment) {
      if (data.sentiment.label === 'positive') {
        updates.positive_interactions = this.supabase.raw('positive_interactions + 1');
      } else if (data.sentiment.label === 'negative') {
        updates.negative_interactions = this.supabase.raw('negative_interactions + 1');
      }
    }

    await this.supabase
      .from('eva_analytics')
      .update(updates)
      .eq('user_id', userId);
  }

  /**
   * 🎯 Update conversation stage
   */
  async updateConversationStage(userId, stage) {
    await this.supabase.rpc('update_eva_conversation_stage', {
      user_uuid: userId,
      new_stage: stage
    });
  }

  /**
   * 📝 Log error
   */
  async logError(component, error, metadata = {}) {
    await this.supabase.from('eva_system_logs').insert({
      log_level: 'error',
      component: component,
      message: error.message,
      error_stack: error.stack,
      metadata: metadata
    });
  }

  /**
   * 🛑 Stop bot
   */
  stop() {
    this.bot.stopPolling();
    console.log('🛑 Eva Telegram Bot stopped');
  }
}

export default EvaTelegramBot;
