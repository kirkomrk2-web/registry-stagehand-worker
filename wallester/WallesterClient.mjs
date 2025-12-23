/**
 * 🎴 WALLESTER API CLIENT
 * 
 * Пълен клиент за Wallester API с:
 * - JWT Token генератор (RS256, 5-секунден срок)
 * - Картови операции
 * - Account управление
 * - Транзакции
 * - RSA декриптиране на карти данни
 */

import crypto from 'crypto';
import fs from 'fs';
import jwt from 'jsonwebtoken';

export class WallesterClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.WALLESTER_API_KEY;
    this.apiUrl = config.apiUrl || process.env.WALLESTER_API_URL || 'https://api-frontend.wallester.com/v1';
    this.privateKeyPath = config.privateKeyPath || process.env.WALLESTER_PRIVATE_KEY_PATH || './.wallester_keys/wallester_private.pem';
    
    // Зареждаме private key
    this.privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
    
    if (!this.apiKey) {
      throw new Error('❌ Wallester API Key липсва! Задайте WALLESTER_API_KEY в .env');
    }
  }

  /**
   * 🔐 Генерира JWT Token с RS256 подпис
   * Срок на валидност: 5 секунди (изискване на Wallester)
   */
  generateJWT() {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const payload = {
      api_key: this.apiKey,
      ts: timestamp
    };

    // Генерираме JWT с RS256 алгоритъм
    const token = jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      expiresIn: 5 // 5 секунди
    });

    return token;
  }

  /**
   * 🌐 Прави HTTP заявка към Wallester API
   */
  async request(method, endpoint, data = null) {
    const token = this.generateJWT();
    const url = `${this.apiUrl}${endpoint}`;

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(result)}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Request failed: ${method} ${endpoint}`, error.message);
      throw error;
    }
  }

  /**
   * 🔓 Декриптира криптирани данни с RSA Private Key
   */
  decrypt(encryptedData) {
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        buffer
      );
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('❌ Decryption failed:', error.message);
      throw error;
    }
  }

  // ========================================
  // 🎴 CARD OPERATIONS (Карти)
  // ========================================

  /**
   * 📋 Списък с всички карти
   */
  async getCards(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/cards${queryString ? '?' + queryString : ''}`);
  }

  /**
   * ✨ Създава нова карта
   * @param {Object} cardData - Данни за картата
   * @param {string} cardData.account_id - ID на акаунта
   * @param {string} cardData.network_type - Virtual или ChipAndPin
   * @param {string} cardData.card_holder_name - Име на картодържател
   * @param {Object} cardData.card_limit - Лимити на картата
   */
  async createCard(cardData) {
    return this.request('POST', '/cards', cardData);
  }

  /**
   * 📄 Детайли за конкретна карта
   */
  async getCard(cardId) {
    return this.request('GET', `/cards/${cardId}`);
  }

  /**
   * 🔐 Декриптирани карти данни (номер, CVV, PIN)
   */
  async getCardDetails(cardId) {
    const result = await this.request('GET', `/cards/${cardId}/details`);
    
    // Декриптираме чувствителните данни
    if (result.card_number_encrypted) {
      result.card_number = this.decrypt(result.card_number_encrypted);
    }
    if (result.cvv_encrypted) {
      result.cvv = this.decrypt(result.cvv_encrypted);
    }
    if (result.pin_encrypted) {
      result.pin = this.decrypt(result.pin_encrypted);
    }
    
    return result;
  }

  /**
   * 🚫 Блокира карта
   */
  async blockCard(cardId) {
    return this.request('POST', `/cards/${cardId}/block`);
  }

  /**
   * ✅ Отблокира карта
   */
  async unblockCard(cardId) {
    return this.request('POST', `/cards/${cardId}/unblock`);
  }

  /**
   * 🔄 Активира карта
   */
  async activateCard(cardId) {
    return this.request('POST', `/cards/${cardId}/activate`);
  }

  /**
   * ❌ Затваря карта (необратимо)
   */
  async closeCard(cardId) {
    return this.request('POST', `/cards/${cardId}/close`);
  }

  /**
   * 💰 Задава лимити на карта
   */
  async setCardLimits(cardId, limits) {
    return this.request('PUT', `/cards/${cardId}/limits`, limits);
  }

  // ========================================
  // 💼 ACCOUNT OPERATIONS (Акаунти)
  // ========================================

  /**
   * 📋 Списък с всички акаунти
   */
  async getAccounts(params = {}) {
    // Wallester изисква from_record и records_count
    const defaultParams = {
      from_record: 0,
      records_count: 100,
      ...params
    };
    const queryString = new URLSearchParams(defaultParams).toString();
    return this.request('GET', `/accounts?${queryString}`);
  }

  /**
   * ✨ Създава нов акаунт
   */
  async createAccount(accountData) {
    return this.request('POST', '/accounts', accountData);
  }

  /**
   * 📄 Детайли за акаунт
   */
  async getAccount(accountId) {
    return this.request('GET', `/accounts/${accountId}`);
  }

  /**
   * 💰 Баланс на акаунт
   */
  async getAccountBalance(accountId) {
    return this.request('GET', `/accounts/${accountId}/balance`);
  }

  /**
   * 📊 Statement (извлечение) за акаунт
   */
  async getAccountStatement(accountId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/accounts/${accountId}/statement${queryString ? '?' + queryString : ''}`);
  }

  /**
   * 🏦 Данни за top-up (зареждане) на акаунт
   */
  async getAccountTopUpDetails(accountId) {
    return this.request('GET', `/accounts/${accountId}/topup`);
  }

  // ========================================
  // 💸 TRANSACTIONS (Транзакции)
  // ========================================

  /**
   * 📋 Транзакции на карта
   */
  async getCardTransactions(cardId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/cards/${cardId}/transactions${queryString ? '?' + queryString : ''}`);
  }

  /**
   * 📋 Authorizations на карта
   */
  async getCardAuthorizations(cardId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/cards/${cardId}/authorizations${queryString ? '?' + queryString : ''}`);
  }

  /**
   * 📋 Транзакции на акаунт
   */
  async getAccountTransactions(accountId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request('GET', `/accounts/${accountId}/transactions${queryString ? '?' + queryString : ''}`);
  }

  // ========================================
  // 💳 PAYMENTS (Плащания)
  // ========================================

  /**
   * 🔄 Account Transfer (между акаунти)
   */
  async accountTransfer(transferData) {
    return this.request('POST', '/payments/account-transfer', transferData);
  }

  /**
   * 👤 Employee Transfer
   */
  async employeeTransfer(transferData) {
    return this.request('POST', '/payments/employee-transfer', transferData);
  }

  /**
   * 📱 Mobile Transfer
   */
  async mobileTransfer(transferData) {
    return this.request('POST', '/payments/mobile-transfer', transferData);
  }

  /**
   * 🏦 Wire Transfer (банков превод)
   */
  async wireTransfer(transferData) {
    return this.request('POST', '/payments/wire-transfer', transferData);
  }

  // ========================================
  // 🔔 WEBHOOKS (Уебхукове)
  // ========================================

  /**
   * 📋 Списък с webhooks
   */
  async getWebhooks() {
    return this.request('GET', '/webhooks');
  }

  /**
   * ✨ Създава webhook
   */
  async createWebhook(webhookData) {
    return this.request('POST', '/webhooks', webhookData);
  }

  /**
   * ❌ Изтрива webhook
   */
  async deleteWebhook(webhookId) {
    return this.request('DELETE', `/webhooks/${webhookId}`);
  }

  // ========================================
  // 🔍 UTILITY METHODS
  // ========================================

  /**
   * 🧪 Тест на връзката с API
   */
  async ping() {
    try {
      const accounts = await this.getAccounts({ limit: 1 });
      return {
        success: true,
        message: '✅ Wallester API connection successful!',
        timestamp: new Date().toISOString(),
        accounts_count: accounts.data?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        message: '❌ Wallester API connection failed',
        error: error.message
      };
    }
  }
}

export default WallesterClient;
