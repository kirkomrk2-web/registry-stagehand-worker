#!/usr/bin/env node
/**
 * Тест - директен INSERT в user_registry_checks
 * За да видим дали проблемът е в permissions или в registry_check логиката
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Липсва SUPABASE_SERVICE_ROLE_KEY!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testDirectInsert() {
  console.log('🧪 ТЕСТ: Директен INSERT в user_registry_checks');
  console.log('='.repeat(80));

  const testData = {
    email: `direct_test_${Date.now()}@example.com`,
    full_name: 'Test Person',
    match_count: 1,
    any_match: true,
    companies: [{
      eik: '123456789',
      business_name_bg: 'Тест ЕООД',
      business_name_en: 'Test Ltd'
    }]
  };

  console.log('\n📝 Опит за INSERT с данни:');
  console.log(JSON.stringify(testData, null, 2));

  const { data, error } = await supabase
    .from('user_registry_checks')
    .insert(testData)
    .select()
    .single();

  if (error) {
    console.error('\n❌ ГРЕШКА при INSERT:');
    console.error(JSON.stringify(error, null, 2));
    console.error('\n🔧 Възможни причини:');
    console.error('   1. RLS все още блокира (но го disable-нахме?)');
    console.error('   2. Липсват колони в таблицата');
    console.error('   3. Невалиден service_role key');
    return false;
  }

  console.log('\n✅ INSERT УСПЕШЕН!');
  console.log('Записан ID:', data.id);
  console.log('Email:', data.email);
  console.log('Match count:', data.match_count);

  console.log('\n🎉 Директният INSERT работи! Проблемът е в registry_check функцията.');

  // Провери дали записът е там
  console.log('\n🔍 Проверка дали записът е в базата:');
  const { data: checkData, error: checkError } = await supabase
    .from('user_registry_checks')
    .select('*')
    .eq('email', testData.email)
    .single();

  if (checkError) {
    console.error('❌ Грешка при четене:', checkError);
  } else {
    console.log('✅ Записът е потвърден в базата!');
  }

  return true;
}

testDirectInsert().catch(console.error);
