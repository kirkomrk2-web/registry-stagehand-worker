#!/usr/bin/env node
/**
 * Тест с Божидар Ангелов Борисов
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testBozhidar() {
  const full_name = 'Божидар Ангелов Борисов';
  const email = `bozhidar_test_${Date.now()}@test.bg`;
  
  console.log('\n🧪 ТЕСТ С БОЖИДАР АНГЕЛОВ БОРИСОВ');
  console.log('='.repeat(80));
  console.log(`📧 Email: ${email}`);
  console.log(`👤 Име: ${full_name}`);
  console.log('='.repeat(80));
  
  // 1. Insert в users_pending
  console.log('\n📝 1. Insert в users_pending...');
  const { data: insertData, error: insertError } = await supabase
    .from('users_pending')
    .insert({
      full_name,
      email,
      status: 'pending'
    })
    .select()
    .single();
  
  if (insertError) {
    console.error('❌ Грешка:', insertError);
    return;
  }
  console.log('✅ Success:', insertData.id);
  
  // 2. Извикай registry_check
  console.log('\n🔍 2. Извикване на registry_check...');
  const { data: registryData, error: registryError } = await supabase.functions.invoke('registry_check', {
    body: { full_name, email }
  });
  
  if (registryError) {
    console.error('❌ Грешка:', registryError);
    return;
  }
  
  console.log('✅ registry_check завърши:');
  console.log(`   - Status: ${registryData.status}`);
  console.log(`   - Match count: ${registryData.match_count}`);
  console.log(`   - Any match: ${registryData.any_match}`);
  
  // 3. Изчакай малко
  console.log('\n⏱️  Изчакване 5 секунди за async операции...');
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
  
  console.log('✅ Намерен запис:');
  console.log(`   - Companies: ${checkData.companies?.length || 0}`);
  
  // Покажи компаниите и eligible статуса
  if (checkData.companies && checkData.companies.length > 0) {
    console.log('\n🏢 КОМПАНИИ:\n');
    checkData.companies.forEach((c, idx) => {
      console.log(`[${idx + 1}] ${c.business_name_bg || 'N/A'} (EIK: ${c.eik})`);
      console.log(`    English Name: ${c.business_name_en || '❌ ЛИПСВА'}`);
      console.log(`    Entity Type: ${c.entity_type || 'N/A'}`);
      console.log(`    Is Active: ${c.is_active ? '✓' : '✗'}`);
      console.log(`    Is Eligible: ${c.is_eligible_for_wallester ? '✅ YES' : '❌ NO'}`);
      if (!c.is_eligible_for_wallester) {
        console.log(`    Filter Reason: ${c.filter_reason || 'unknown'}`);
      }
      console.log('');
    });
    
    const eligible = checkData.companies.filter(c => c.is_eligible_for_wallester);
    console.log(`\n📊 РЕЗУЛТАТ: ${eligible.length} eligible companies от общо ${checkData.companies.length}`);
    
    if (eligible.length > 0) {
      console.log('\n✅ ELIGIBLE COMPANIES:');
      eligible.forEach(c => {
        console.log(`   - ${c.business_name_en} (${c.eik})`);
      });
    }
  }
  
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
    console.log(`   - ID: ${ownerData.id}`);
    console.log(`   - Companies: ${ownerData.companies?.length || 0}`);
    console.log(`   - Phone: ${ownerData.allocated_phone_number || 'N/A'}`);
    console.log(`   - Email alias: ${ownerData.email_alias_33mail || 'N/A'}`);
  } else {
    console.log('⚠️  Няма verified_owner запис (очаквано ако няма eligible companies)');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ ТЕСТ ЗАВЪРШЕН');
  console.log('='.repeat(80));
}

testBozhidar().catch(console.error);
