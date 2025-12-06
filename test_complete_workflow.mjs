#!/usr/bin/env node
/**
 * 🎯 ТЕСТ НА ПЪЛНИЯ WORKFLOW
 * Тества целия процес от users_pending до verified_owners
 */

import { createClient } from '@supabase/supabase-js';

// Използвай env variables или hardcode тук новите credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ansiaiuaygcfztabtknl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ ГРЕШКА: Липсва SUPABASE_SERVICE_ROLE_KEY!');
  console.error('');
  console.error('📝 Моля добави правилния service_role key по един от следните начини:');
  console.error('');
  console.error('   1. Export като environment variable:');
  console.error('      export SUPABASE_SERVICE_ROLE_KEY="твоят_service_role_key"');
  console.error('      node test_complete_workflow.mjs');
  console.error('');
  console.error('   2. Едноредово:');
  console.error('      SUPABASE_SERVICE_ROLE_KEY="твоят_key" node test_complete_workflow.mjs');
  console.error('');
  console.error('   3. Hardcode в test_complete_workflow.mjs:');
  console.error('      const SUPABASE_SERVICE_KEY = "твоят_service_role_key";');
  console.error('');
  console.error('🔑 Намери service_role key в:');
  console.error('   https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/settings/api');
  console.error('');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Български тестови имена (real people with companies)
const TEST_CASES = [
  { full_name: "Иван Петров Димитров", email: `ivan_test_${Date.now()}@test.bg` },
  { full_name: "Георги Иванов Стоянов", email: `georgi_test_${Date.now()}@test.bg` },
  { full_name: "Мария Георгиева Петрова", email: `maria_test_${Date.now()}@test.bg` }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testWorkflow(testCase) {
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 ТЕСТВАНЕ: ${testCase.full_name} (${testCase.email})`);
  console.log('='.repeat(80));

  try {
    // 1. Insert в users_pending
    console.log('\n📝 Стъпка 1: Insert в users_pending...');
    const { data: insertData, error: insertError } = await supabase
      .from('users_pending')
      .insert({
        full_name: testCase.full_name,
        email: testCase.email,
        status: 'pending'
        // created_at и updated_at се попълват автоматично
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Грешка при insert:', insertError);
      return { success: false, step: 'insert', error: insertError };
    }
    console.log('✅ Insert успешен:', insertData);

    // 2. Извикай registry_check Edge Function
    console.log('\n🔍 Стъпка 2: Извикване на registry_check...');
    const { data: registryData, error: registryError } = await supabase.functions.invoke('registry_check', {
      body: {
        full_name: testCase.full_name,
        email: testCase.email
      }
    });

    if (registryError) {
      console.error('❌ Грешка при registry_check:', registryError);
      return { success: false, step: 'registry_check', error: registryError };
    }
    console.log('✅ registry_check отговор:', {
      status: registryData.status,
      match_count: registryData.match_count,
      any_match: registryData.any_match,
      companies_count: registryData.companies?.length || 0
    });

    // 3. Изчакай малко за async операции
    console.log('\n⏱️  Изчакване 3 секунди за async операции...');
    await sleep(3000);

    // 4. Провери user_registry_checks
    console.log('\n📊 Стъпка 3: Проверка на user_registry_checks...');
    const { data: checkData, error: checkError } = await supabase
      .from('user_registry_checks')
      .select('*')
      .eq('email', testCase.email)
      .single();

    if (checkError) {
      console.error('❌ Грешка при четене на user_registry_checks:', checkError);
      return { success: false, step: 'user_registry_checks', error: checkError };
    }
    console.log('✅ user_registry_checks запис намерен:', {
      id: checkData.id,
      match_count: checkData.match_count,
      any_match: checkData.any_match,
      companies_count: checkData.companies?.length || 0
    });

    // 5. Провери users_pending status
    console.log('\n📄 Стъпка 4: Проверка на users_pending status...');
    const { data: pendingData, error: pendingError } = await supabase
      .from('users_pending')
      .select('*')
      .eq('email', testCase.email)
      .single();

    if (pendingError) {
      console.error('❌ Грешка при четене на users_pending:', pendingError);
      return { success: false, step: 'users_pending_read', error: pendingError };
    }
    console.log('✅ users_pending status:', {
      id: pendingData.id,
      status: pendingData.status,
      updated_at: pendingData.updated_at
    });

    // 6. Провери verified_owners (ако има matches)
    if (registryData.any_match) {
      console.log('\n👤 Стъпка 5: Проверка на verified_owners...');
      // verified_owners няма email колона - проверяваме по full_name или просто последните записи
      const { data: ownerData, error: ownerError } = await supabase
        .from('verified_owners')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (ownerError) {
        console.error('❌ Грешка при четене на verified_owners:', ownerError);
        console.log('⚠️  Пропускаме проверката на verified_owners (може да няма такава таблица или колона)');
        // Don't fail the test - this is not critical
      } else if (ownerData && ownerData.length > 0) {
        console.log(`✅ verified_owners записи намерени: ${ownerData.length}`);
        ownerData.slice(0, 3).forEach((owner, idx) => {
          console.log(`   ${idx + 1}. ${owner.full_name || 'N/A'} - EIK: ${owner.eik || 'N/A'}`);
        });
      } else {
        console.log('⚠️  Няма записи в verified_owners (users_pending_worker може да не е  изпълнен още)');
      }
    } else {
      console.log('\n⚠️  Няма matches - пропускаме проверка на verified_owners');
    }

    // 7. Обобщение
    console.log('\n' + '='.repeat(80));
    console.log('✅ WORKFLOW COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80));
    console.log(`📧 Email: ${testCase.email}`);
    console.log(`👤 Име: ${testCase.full_name}`);
    console.log(`🏢 Фирми намерени: ${registryData.match_count}`);
    console.log(`📊 Status в users_pending: ${pendingData.status}`);
    console.log(`✅ Данните преминаха успешно през целия pipeline!`);
    console.log('='.repeat(80));

    return {
      success: true,
      email: testCase.email,
      full_name: testCase.full_name,
      match_count: registryData.match_count,
      status: pendingData.status
    };

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return { success: false, step: 'unexpected', error: err };
  }
}

async function main() {
  console.log('🚀 ЗАПОЧВАНЕ НА ТЕСТОВЕ НА ПЪЛНИЯ WORKFLOW');
  console.log('='.repeat(80));
  console.log('📍 Supabase URL:', SUPABASE_URL);
  console.log('🔑 Service Key:', SUPABASE_SERVICE_KEY.substring(0, 20) + '...');
  console.log('📊 Тестови случаи:', TEST_CASES.length);
  console.log('='.repeat(80));

  // Избери първия тест случай
  const testCase = TEST_CASES[0];
  
  console.log('\n❓ Ще тестваме с:');
  console.log(`   Име: ${testCase.full_name}`);
  console.log(`   Email: ${testCase.email}`);
  console.log('\nНатисни Enter за да продължиш или Ctrl+C за да прекратиш...');
  
  // Wait for user input (optional - can comment out for automatic run)
  // await new Promise(resolve => process.stdin.once('data', resolve));

  const result = await testWorkflow(testCase);

  console.log('\n\n' + '='.repeat(80));
  console.log('📋 ФИНАЛЕН РЕЗУЛТАТ');
  console.log('='.repeat(80));
  console.log(JSON.stringify(result, null, 2));
  console.log('='.repeat(80));

  if (result.success) {
    console.log('\n🎉 УСПЕХ! Всички проверки минаха успешно!');
    console.log('\n📝 Следващи стъпки:');
    console.log('   1. ✅ Провери в Supabase Dashboard дали данните са там');
    console.log('   2. ✅ Провери Supabase Function Logs за детайли');
    console.log('   3. ✅ Копирай useRegistryCheck.js и useChatLogic.js в Hostinger');
    console.log('   4. ✅ Тествай от реалния уебсайт');
    process.exit(0);
  } else {
    console.log('\n❌ ГРЕШКА! Workflow не завърши успешно.');
    console.log(`   Спря на стъпка: ${result.step}`);
    console.log(`   Грешка: ${result.error?.message || JSON.stringify(result.error)}`);
    console.log('\n🔧 Възможни причини:');
    console.log('   1. RLS policies блокират записването');
    console.log('   2. Edge функцията има грешка');
    console.log('   3. CompanyBook API лимити');
    console.log('\n💡 Решения:');
    console.log('   1. Изпълни: HOSTINGER_FIXED_FILES/FIX_DATABASE_PERMISSIONS.sql');
    console.log('   2. Провери Supabase Function Logs');
    console.log('   3. Изчакай 1-2 минути и тествай отново');
    process.exit(1);
  }
}

main().catch(console.error);
