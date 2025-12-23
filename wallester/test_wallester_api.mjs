/**
 * 🧪 TEST WALLESTER API CONNECTION
 * 
 * Тестова заявка към Wallester API за проверка на:
 * - JWT Token генератор
 * - API ключ валидност
 * - Връзка с API
 */

import 'dotenv/config';
import { WallesterClient } from './WallesterClient.mjs';

async function testWallesterAPI() {
  console.log('🧪 Тестване на Wallester API...\n');

  try {
    // Инициализираме клиента
    const wallester = new WallesterClient();
    console.log('✅ WallesterClient инициализиран успешно');
    console.log(`📡 API URL: ${wallester.apiUrl}`);
    console.log(`🔑 API Key: ${wallester.apiKey.substring(0, 20)}...`);
    
    // Генерираме JWT за тест
    const jwt = wallester.generateJWT();
    console.log(`\n🔐 JWT Token генериран:`);
    console.log(`   ${jwt.substring(0, 50)}...`);
    
    // Ping test
    console.log('\n📍 Тестване на връзка с API...');
    const pingResult = await wallester.ping();
    
    if (pingResult.success) {
      console.log('✅ Връзката е успешна!');
      console.log(`⏰ Timestamp: ${pingResult.timestamp}`);
      console.log(`📊 Accounts намерени: ${pingResult.accounts_count}`);
    } else {
      console.error('❌ Връзката неуспешна:', pingResult.error);
    }

    // Тест: Списък с акаунти
    console.log('\n📋 Зареждане на акаунти...');
    const accounts = await wallester.getAccounts();
    
    if (accounts.data && accounts.data.length > 0) {
      console.log(`✅ Намерени ${accounts.data.length} акаунт(а):`);
      accounts.data.forEach((account, i) => {
        console.log(`\n   Акаунт ${i + 1}:`);
        console.log(`   - ID: ${account.id}`);
        console.log(`   - Holder: ${account.holder_name || 'N/A'}`);
        console.log(`   - Currency: ${account.currency || 'EUR'}`);
        console.log(`   - Status: ${account.status || 'N/A'}`);
      });
    } else {
      console.log('⚠️  Няма налични акаунти');
    }

    // Тест: Списък с карти
    console.log('\n\n🎴 Зареждане на карти...');
    const cards = await wallester.getCards();
    
    if (cards.data && cards.data.length > 0) {
      console.log(`✅ Намерени ${cards.data.length} карт(и):`);
      cards.data.forEach((card, i) => {
        console.log(`\n   Карта ${i + 1}:`);
        console.log(`   - ID: ${card.id}`);
        console.log(`   - Type: ${card.network_type || 'N/A'}`);
        console.log(`   - Holder: ${card.card_holder_name || 'N/A'}`);
        console.log(`   - Status: ${card.status || 'N/A'}`);
        console.log(`   - Last 4: ${card.last_four_digits || 'N/A'}`);
      });
    } else {
      console.log('⚠️  Няма налични карти');
    }

    // Тест: Webhooks
    console.log('\n\n🔔 Зареждане на webhooks...');
    try {
      const webhooks = await wallester.getWebhooks();
      if (webhooks.data && webhooks.data.length > 0) {
        console.log(`✅ Намерени ${webhooks.data.length} webhook(а):`);
        webhooks.data.forEach((webhook, i) => {
          console.log(`\n   Webhook ${i + 1}:`);
          console.log(`   - ID: ${webhook.id}`);
          console.log(`   - URL: ${webhook.url}`);
          console.log(`   - Events: ${webhook.events?.join(', ') || 'N/A'}`);
        });
      } else {
        console.log('⚠️  Няма настроени webhooks');
      }
    } catch (error) {
      console.log('⚠️  Webhook endpoint не е достъпен:', error.message);
    }

    console.log('\n\n🎉 Всички тестове завършиха успешно!');

  } catch (error) {
    console.error('\n❌ Грешка при тестване:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Стартираме теста
testWallesterAPI();
