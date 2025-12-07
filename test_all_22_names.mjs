#!/usr/bin/env node
/**
 * Тест на 22 имена - автоматизирано създаване и проверка
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const TEST_NAMES = [
  'Добри Василев Георгиев',
  'Божидар Ангелов Борисов',
  'Тодор Йорданов Тодоров',
  'Илия Иванов Димитров',
  'Асен Митков Асенов',
  'Диан Иванов Димитров',
  'Мартин Владимиров Петров',
  'Даниел Миленов Мартинов',
  'Илия Петков Илиев',
  'Диян Иванов Иванов',
  'Николай Стоянов Стоянов',
  'Константин Валериев Кирчев',
  'Антон Господинов',
  'Иван Христев Димитров',
  'Борис Георгиев Стефанов',
  'Христо Георгиев Георгиев',
  'Иван Николаев Николаев',
  'Виктор Николаев Николаев',
  'Румен Николаев Николаев',
  'Пламен Георгиев Георгиев',
  'Петър Иванов Петров',
  'Георги Господинов Георгиев'
];

console.log('═══════════════════════════════════════════════════════════');
console.log('  ТЕСТ НА 22 ИМЕНА - WALLESTER VERIFICATION PIPELINE');
console.log('═══════════════════════════════════════════════════════════\n');

const stats = {
  total: TEST_NAMES.length,
  processed: 0,
  success: 0,
  noMatch: 0,
  errors: 0,
  results: []
};

async function processName(name, index) {
  const email = `${name.toLowerCase().replace(/\s+/g, '.')}@test.com`;
  const birthDate = '1990-05-15';
  
  console.log(`\n[${ index + 1}/${TEST_NAMES.length}] Обработка на: ${name}`);
  console.log('─────────────────────────────────────────────────────');
  
  try {
    // 1. Изчистване на стари данни
    console.log('  🧹 Изчистване на стари данни...');
    await supabase.from('verified_owners').delete().eq('full_name', name);
    await supabase.from('user_registry_checks').delete().eq('email', email);
    await supabase.from('users_pending').delete().eq('email', email);
    
    // 2. Създаване на потребител
    console.log('  📝 Създаване на потребител...');
    const { error: insertError } = await supabase
      .from('users_pending')
      .insert({
        full_name: name,
        email: email,
        birth_date: birthDate,
        status: 'pending'
      });
    
    if (insertError) {
      throw new Error(`Insert failed: ${insertError.message}`);
    }
    
    await new Promise(r => setTimeout(r, 500));
    
    // 3. Registry check
    console.log('  🔍 Registry check...');
    const regResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/registry_check`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ full_name: name, email: email })
      }
    );
    
    if (!regResponse.ok) {
      throw new Error(`Registry check failed: ${regResponse.status}`);
    }
    
    const regResult = await regResponse.json();
    console.log(`  ✓ Намерени фирми: ${regResult.match_count || 0}`);
    
    await new Promise(r => setTimeout(r, 2000));
    
    // 4. Проверка на резултата
    const { data: owner, error: ownerError } = await supabase
      .from('verified_owners')
      .select('*')
      .eq('full_name', name)
      .single();
    
    if (ownerError || !owner) {
      stats.noMatch++;
      stats.results.push({
        name,
        status: 'NO_MATCH',
        companies: 0
      });
      console.log('  ⚠️  Без намерени компании');
    } else {
      const waitingList = owner.waiting_list || [];
      stats.success++;
      stats.results.push({
        name,
        status: 'SUCCESS',
        companies: waitingList.length,
        firstName: owner.owner_first_name_en,
        lastName: owner.owner_last_name_en,
        birthDate: owner.owner_birthdate
      });
      console.log(`  ✅ Успешно! ${waitingList.length} компании в waiting_list`);
      console.log(`     Име (EN): ${owner.owner_first_name_en} ${owner.owner_last_name_en}`);
      console.log(`     Рожд. дата: ${owner.owner_birthdate}`);
    }
    
    stats.processed++;
    
  } catch (error) {
    stats.errors++;
    stats.processed++;
    stats.results.push({
      name,
      status: 'ERROR',
      error: error.message
    });
    console.log(`  ❌ Грешка: ${error.message}`);
  }
}

async function runTests() {
  const startTime = Date.now();
  
  // Процедиране на всички имена последователно
  for (let i = 0; i < TEST_NAMES.length; i++) {
    await processName(TEST_NAMES[i], i);
    
    // Показване на прогрес
    const progress = Math.round((stats.processed / stats.total) * 100);
    console.log(`\n  📊 Прогрес: ${stats.processed}/${stats.total} (${progress}%)`);
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
  // Финален отчет
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  ФИНАЛЕН ОТЧЕТ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n  Време за изпълнение: ${duration}s`);
  console.log(`  Обработени: ${stats.processed}/${stats.total}`);
  console.log(`  ✅ Успешни: ${stats.success}`);
  console.log(`  ⚠️  Без съвпадение: ${stats.noMatch}`);
  console.log(`  ❌ Грешки: ${stats.errors}`);
  
  console.log('\n  ДЕТАЙЛНИ РЕЗУЛТАТИ:');
  console.log('  ─────────────────────────────────────────────────────────');
  
  stats.results.forEach((result, index) => {
    console.log(`\n  ${index + 1}. ${result.name}`);
    if (result.status === 'SUCCESS') {
      console.log(`     ✅ ${result.companies} компании | ${result.firstName} ${result.lastName} | ${result.birthDate}`);
    } else if (result.status === 'NO_MATCH') {
      console.log(`     ⚠️  Без съвпадение`);
    } else {
      console.log(`     ❌ Грешка: ${result.error}`);
    }
  });
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

runTests().catch(console.error);
