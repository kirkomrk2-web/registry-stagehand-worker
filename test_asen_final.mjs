#!/usr/bin/env node
/**
 * Финален тест с Асен Митков Асенов
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const EXPECTED_COMPANIES = [
  { name: 'ВЕРСАЙ 81', eik: '205521112' },
  { name: 'NESA COMPUTARS', eik: '200536459' },
  { name: 'ALEKS SHANS LTD', eik: '202634539' }
];

async function testAsen() {
  const full_name = 'Асен Митков Асенов';
  const email = `asen_final_test_${Date.now()}@test.bg`;
  
  console.log('\n🧪 ФИНАЛЕН ТЕСТ С АСЕН МИТКОВ АСЕНОВ');
  console.log('='.repeat(80));
  console.log(`📧 Email: ${email}`);
  console.log(`👤 Име: ${full_name}`);
  console.log('\nОчаквани компании:');
  EXPECTED_COMPANIES.forEach(c => console.log(`  - ${c.name} (${c.eik})`));
  console.log('='.repeat(80));
  
  // 1. Insert в users_pending
  console.log('\n📝 1. Insert в users_pending...');
  const { data: insertData, error: insertError } = await supabase
    .from('users_pending')
    .insert({ full_name, email, status: 'pending' })
    .select()
    .single();
  
  if (insertError) {
    console.error('❌ Грешка:', insertError);
    return;
  }
  console.log('✅ Success');
  
  // 2. Извикай registry_check
  console.log('\n🔍 2. Извикване на registry_check (сега с 10 кандидата)...');
  const { data: registryData, error: registryError } = await supabase.functions.invoke('registry_check', {
    body: { full_name, email }
  });
  
  if (registryError) {
    console.error('❌ Грешка:', registryError);
    return;
  }
  
  console.log('✅ registry_check завърши:');
  console.log(`   - Match count: ${registryData.match_count}`);
  console.log(`   - Any match: ${registryData.any_match}`);
  
  // 3. Изчакай
  console.log('\n⏱️  Изчакване 5 секунди...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 4. Провери user_registry_checks
  console.log('\n📊 3. Проверка на user_registry_checks...');
  const { data: checkData, error: checkError } = await supabase
    .from('user_registry_checks')
    .select('*')
    .eq('email', email)
    .single();
  
  if (checkError) {
    console.error('❌ Грешка:', checkError);
    return;
  }
  
  const companies = checkData.companies || [];
  console.log(`✅ Намерени ${companies.length} компании в user_registry_checks\n`);
  
  // Провери очакваните компании
  const foundExpected = [];
  const missingExpected = [];
  
  for (const expected of EXPECTED_COMPANIES) {
    const found = companies.find(c => c.eik === expected.eik);
    if (found) {
      foundExpected.push({ ...expected, company: found });
    } else {
      missingExpected.push(expected);
    }
  }
  
  console.log('🎯 ОЧАКВАНИ КОМПАНИИ:\n');
  foundExpected.forEach(item => {
    const c = item.company;
    console.log(`✅ ${item.name} (${item.eik})`);
    console.log(`   English Name: ${c.business_name_en || '❌ ЛИПСВА'}`);
    console.log(`   Entity Type: ${c.entity_type}`);
    console.log(`   Is Active: ${c.is_active ? '✓' : '✗'}`);
    console.log(`   Is Eligible: ${c.is_eligible_for_wallester ? '✅ YES' : '❌ NO'}`);
    if (!c.is_eligible_for_wallester) {
      console.log(`   Filter Reason: ${c.filter_reason || 'unknown'}`);
    }
    console.log('');
  });
  
  if (missingExpected.length > 0) {
    console.log('❌ ЛИПСВАЩИ КОМПАНИИ:\n');
    missingExpected.forEach(item => {
      console.log(`   - ${item.name} (${item.eik})`);
    });
    console.log('');
  }
  
  // Покажи всички компании
  console.log(`📋 ВСИЧКИ КОМПАНИИ (${companies.length}):\n`);
  companies.forEach((c, idx) => {
    const isExpected = EXPECTED_COMPANIES.find(exp => exp.eik === c.eik);
    const marker = isExpected ? '🎯' : '  ';
    console.log(`${marker} [${idx + 1}] ${c.business_name_bg} (${c.eik})`);
    console.log(`    EN: ${c.business_name_en || 'N/A'}`);
    console.log(`    Eligible: ${c.is_eligible_for_wallester ? 'YES' : 'NO'}`);
  });
  
  // Eligible count
  const eligible = companies.filter(c => c.is_eligible_for_wallester);
  console.log(`\n📊 РЕЗУЛТАТ: ${eligible.length} eligible от ${companies.length} общо`);
  
  // 5. Провери users_pending status
  console.log('\n📄 4. Проверка на users_pending status...');
  const { data: pendingData } = await supabase
    .from('users_pending')
    .select('status')
    .eq('email', email)
    .single();
  
  console.log(`   Status: ${pendingData?.status || 'N/A'}`);
  
  // 6. Провери verified_owners
  console.log('\n👤 5. Проверка на verified_owners...');
  const { data: ownerData } = await supabase
    .from('verified_owners')
    .select('*')
    .eq('full_name', full_name)
    .maybeSingle();
  
  if (ownerData) {
    console.log('✅ Verified owner създаден!');
    console.log(`   - Companies: ${ownerData.companies?.length || 0}`);
    console.log(`   - Phone: ${ownerData.allocated_phone_number || 'N/A'}`);
    if (ownerData.companies && ownerData.companies.length > 0) {
      console.log('\n   Companies в verified_owners:');
      ownerData.companies.forEach((c, idx) => {
        console.log(`   [${idx + 1}] ${c.business_name_en} (${c.eik})`);
      });
    }
  } else {
    console.log('⚠️  Няма verified_owner запис');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ ТЕСТ ЗАВЪРШЕН');
  console.log('='.repeat(80));
  console.log(`\n📊 КРАЕН РЕЗУЛТАТ:`);
  console.log(`   - Намерени: ${foundExpected.length}/${EXPECTED_COMPANIES.length} очаквани компании`);
  console.log(`   - Липсващи: ${missingExpected.length}`);
  console.log(`   - Общо eligible: ${eligible.length}`);
  console.log(`   - Status: ${pendingData?.status || 'N/A'}`);
  
  if (foundExpected.length === EXPECTED_COMPANIES.length) {
    console.log('\n🎉 SUCCESS! Всички очаквани компании са намерени!');
  } else {
    console.log('\n⚠️  ВНИМАНИЕ! Някои компании липсват.');
  }
}

testAsen().catch(console.error);
