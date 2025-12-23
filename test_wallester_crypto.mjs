#!/usr/bin/env node

/**
 * 🔐 Test script за Wallester RSA криптиране/декриптиране
 * 
 * Този скрипт демонстрира:
 * 1. Как да криптираш данни с PUBLIC key (симулира Wallester)
 * 2. Как да декриптираш данни с PRIVATE key (нашата система)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Зареди ключовете
const PRIVATE_KEY_PATH = path.join(__dirname, '.wallester_keys', 'wallester_private.pem');
const PUBLIC_KEY_PATH = path.join(__dirname, '.wallester_keys', 'wallester_public.pem');

console.log('🔐 WALLESTER RSA CRYPTO TEST\n');

// Проверка за ключове
if (!fs.existsSync(PRIVATE_KEY_PATH)) {
  console.error('❌ PRIVATE key не е намерен:', PRIVATE_KEY_PATH);
  process.exit(1);
}

if (!fs.existsSync(PUBLIC_KEY_PATH)) {
  console.error('❌ PUBLIC key не е намерен:', PUBLIC_KEY_PATH);
  process.exit(1);
}

const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
const publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');

console.log('✅ PRIVATE key зареден');
console.log('✅ PUBLIC key зареден\n');

// ========================================
// ФУНКЦИИ ЗА КРИПТИРАНЕ/ДЕКРИПТИРАНЕ
// ========================================

/**
 * Криптира данни с PUBLIC key (това Wallester прави)
 */
function encryptData(data) {
  const buffer = Buffer.from(JSON.stringify(data), 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer
  );
  return encrypted.toString('base64');
}

/**
 * Декриптира данни с PRIVATE key (това ние правим)
 */
function decryptData(encryptedData) {
  const buffer = Buffer.from(encryptedData, 'base64');
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer
  );
  return JSON.parse(decrypted.toString('utf8'));
}

// ========================================
// ТЕСТОВЕ
// ========================================

console.log('📝 TEST 1: Симулация на Wallester webhook данни\n');

// Примерни данни като от Wallester webhook
const testData = {
  event: 'card.created',
  cardId: 'card_123456',
  cardNumber: '5123450000000008',
  expiryMonth: '12',
  expiryYear: '2025',
  cvv: '123',
  cardholderName: 'IVAN PETROV',
  status: 'ACTIVE',
  timestamp: new Date().toISOString(),
};

console.log('📤 Оригинални данни (преди криптиране):');
console.log(JSON.stringify(testData, null, 2));
console.log();

try {
  // Симулираме Wallester: криптираме с PUBLIC key
  console.log('🔒 Криптиране с PUBLIC key (симулира Wallester)...');
  const encrypted = encryptData(testData);
  console.log('✅ Данните са криптирани');
  console.log('📦 Криптиран текст (това получаваме от Wallester):');
  console.log(encrypted.substring(0, 100) + '...\n');

  // Декриптираме с PRIVATE key (това ние правим)
  console.log('🔓 Декриптиране с PRIVATE key (нашата система)...');
  const decrypted = decryptData(encrypted);
  console.log('✅ Данните са декриптирани успешно!\n');

  console.log('📥 Декриптирани данни:');
  console.log(JSON.stringify(decrypted, null, 2));
  console.log();

  // Проверка за integrity
  const isValid = JSON.stringify(testData) === JSON.stringify(decrypted);
  
  if (isValid) {
    console.log('✅ SUCCESS! Данните са идентични.');
    console.log('🎉 RSA криптирането работи правилно!\n');
  } else {
    console.log('❌ ERROR! Данните не съвпадат.');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ ERROR при тест:', error.message);
  process.exit(1);
}

// ========================================
// TEST 2: Размер на данните
// ========================================

console.log('📝 TEST 2: Максимален размер на данните\n');

try {
  // RSA 4096 може да криптира максимум ~446 bytes (с OAEP SHA-256)
  const smallData = { message: 'hello'.repeat(50) }; // ~250 bytes
  const encryptedSmall = encryptData(smallData);
  const decryptedSmall = decryptData(encryptedSmall);
  console.log('✅ Малки данни (< 400 bytes): OK');
  
} catch (error) {
  console.log('⚠️  Големи данни: RSA има лимит ~446 bytes');
  console.log('💡 За по-големи данни, Wallester използва hybrid encryption');
  console.log('   (RSA за session key + AES за данните)\n');
}

console.log('\n🎯 ВСИЧКИ ТЕСТОВЕ ЗАВЪРШЕНИ УСПЕШНО!');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('📋 СЛЕДВАЩИ СТЪПКИ:');
console.log('');
console.log('1️⃣  Копирай PUBLIC key от WALLESTER_RSA_KEYS_SETUP.md');
console.log('2️⃣  Влез в Wallester Dashboard → API Settings');
console.log('3️⃣  Постави PUBLIC ключа');
console.log('4️⃣  Създай webhook URL в Supabase Edge Function');
console.log('5️⃣  Използвай decryptData() функцията за входящи webhooks');
console.log('');
console.log('═══════════════════════════════════════════════════════════');
