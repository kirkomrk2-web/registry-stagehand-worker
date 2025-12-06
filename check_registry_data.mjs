#!/usr/bin/env node
/**
 * Провери какви данни има в user_registry_checks
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  const email = process.argv[2] || 'ivan_test_1765050583169@test.bg';
  
  console.log(`\n🔍 Проверка на user_registry_checks за: ${email}\n`);
  
  const { data, error } = await supabase
    .from('user_registry_checks')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error) {
    console.error('❌ Грешка:', error);
    return;
  }
  
  console.log('📊 Основни данни:');
  console.log(`   Email: ${data.email}`);
  console.log(`   Match count: ${data.match_count}`);
  console.log(`   Any match: ${data.any_match}`);
  console.log(`   Companies count: ${data.companies?.length || 0}`);
  
  console.log('\n🏢 КОМПАНИИ:\n');
  
  if (data.companies && data.companies.length > 0) {
    data.companies.forEach((c, idx) => {
      console.log(`[${idx + 1}] ${c.business_name_bg || 'N/A'}`);
      console.log(`    EIK: ${c.eik || 'N/A'}`);
      console.log(`    English Name: ${c.business_name_en || '❌ ЛИПСВА'}`);
      console.log(`    Entity Type: ${c.entity_type || 'N/A'}`);
      console.log(`    Is Active: ${c.is_active !== undefined ? c.is_active : '❌ ЛИПСВА'}`);
      console.log(`    Is Eligible: ${c.is_eligible_for_wallester !== undefined ? c.is_eligible_for_wallester : '❌ ЛИПСВА'}`);
      console.log(`    Legal Form: ${c.legal_form || 'N/A'}`);
      console.log('');
    });
    
    // Анализ
    console.log('📊 АНАЛИЗ НА ФИЛТРИТЕ:\n');
    const eligible = data.companies.filter(c => 
      c.is_eligible_for_wallester === true && 
      c.business_name_en && 
      c.is_active === true
    );
    
    console.log(`✅ Eligible компании: ${eligible.length} от ${data.companies.length}`);
    
    if (eligible.length === 0) {
      console.log('\n❌ ПРИЧИНИ ЗАЩО НЯМА ELIGIBLE КОМПАНИИ:\n');
      
      const noEligibleFlag = data.companies.filter(c => c.is_eligible_for_wallester !== true);
      const noEnglishName = data.companies.filter(c => !c.business_name_en);
      const notActive = data.companies.filter(c => c.is_active !== true);
      
      console.log(`   - ${noEligibleFlag.length} компании НЯМАТ is_eligible_for_wallester = true`);
      console.log(`   - ${noEnglishName.length} компании НЯМАТ business_name_en`);
      console.log(`   - ${notActive.length} компании НЯМАТ is_active = true`);
    } else {
      console.log('\n✅ Eligible компании:');
      eligible.forEach(c => {
        console.log(`   - ${c.business_name_en} (${c.eik})`);
      });
    }
  } else {
    console.log('❌ Няма компании в записа!');
  }
}

main().catch(console.error);
