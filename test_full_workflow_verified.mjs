#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testFullWorkflow() {
  console.log('🧪 Testing FULL workflow with verified_owners structure...\n');

  const testName = 'Асен Митков Асенов';
  const testEmail = 'asen.test@example.com';
  const testBirthDate = '1990-05-15';

  console.log(`📌 Test user: ${testName} (${testEmail})`);

  // 1. Clean up existing data
  console.log('\n1️⃣ Cleaning up existing test data...');
  await supabase.from('verified_owners').delete().eq('full_name', testName);
  await supabase.from('user_registry_checks').delete().eq('email', testEmail);
  await supabase.from('users_pending').delete().eq('email', testEmail);
  console.log('✅ Cleanup complete');

  // 2. Create test user in users_pending with birthdate
  console.log('\n2️⃣ Creating test user in users_pending...');
  const { error: insertError } = await supabase
    .from('users_pending')
    .insert({
      full_name: testName,
      email: testEmail,
      birth_date: testBirthDate,
      status: 'pending',
      created_at: new Date().toISOString()
    });

  if (insertError) {
    console.error('❌ Failed to create test user:', insertError.message);
    return;
  }
  console.log(`✅ Test user created with birth_date: ${testBirthDate}`);

  // 3. Run registry_check
  console.log('\n3️⃣ Running registry_check...');
  const registryResponse = await fetch(
    'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/registry_check',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        full_name: testName,
        email: testEmail
      })
    }
  );

  const registryResult = await registryResponse.json();
  console.log('Registry check response:', registryResult.status || registryResult.error);
  
  if (registryResult.eligible_companies_count) {
    console.log(`✅ Found ${registryResult.eligible_companies_count} eligible companies`);
  }

  // Wait a bit for data to settle
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 4. Run users_pending_worker
  console.log('\n4️⃣ Running users_pending_worker...');
  const workerResponse = await fetch(
    'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        full_name: testName,
        email: testEmail,
        status: 'pending'
      })
    }
  );

  const workerResult = await workerResponse.json();
  console.log('Worker status:', workerResult.status);
  
  if (workerResult.owner_first_name_en || workerResult.owner_last_name_en) {
    console.log(`   - owner_first_name_en: ${workerResult.owner_first_name_en}`);
    console.log(`   - owner_last_name_en: ${workerResult.owner_last_name_en}`);
  }

  // 5. Check verified_owners structure
  console.log('\n5️⃣ Checking verified_owners structure...');
  const { data: owner, error: ownerError } = await supabase
    .from('verified_owners')
    .select('*')
    .eq('full_name', testName)
    .single();

  if (ownerError) {
    console.error('❌ Failed to fetch verified_owner:', ownerError.message);
    return;
  }

  console.log('\n📊 VERIFIED_OWNERS DATA STRUCTURE:');
  console.log('══════════════════════════════════════════════════════════');
  
  // Check owner names with transliteration verification
  console.log('\n🔤 Owner Names:');
  console.log(`   - full_name: ${owner.full_name}`);
  console.log(`   - owner_first_name_en: "${owner.owner_first_name_en || 'NULL'}"`);
  
  const isFirstNameLatin = owner.owner_first_name_en && /^[a-zA-Z\s]+$/.test(owner.owner_first_name_en);
  console.log(`     ${isFirstNameLatin ? '✅' : '❌'} Is Latin alphabet: ${isFirstNameLatin}`);
  
  console.log(`   - owner_last_name_en: "${owner.owner_last_name_en || 'NULL'}"`);
  
  const isLastNameLatin = owner.owner_last_name_en && /^[a-zA-Z\s]+$/.test(owner.owner_last_name_en);
  console.log(`     ${isLastNameLatin ? '✅' : '❌'} Is Latin alphabet: ${isLastNameLatin}`);
  
  // Check birthdate
  console.log('\n📅 Birth Date:');
  console.log(`   - owner_birthdate: ${owner.owner_birthdate || 'NULL'} ${owner.owner_birthdate ? '✅' : '❌'}`);
  
  // Check waiting_list
  console.log('\n📋 Waiting List:');
  if (!owner.waiting_list) {
    console.log('❌ waiting_list field is NULL or missing');
  } else if (!Array.isArray(owner.waiting_list)) {
    console.log('❌ waiting_list is not an array');
  } else if (owner.waiting_list.length === 0) {
    console.log('⚠️  waiting_list is empty array');
  } else {
    console.log(`✅ waiting_list contains ${owner.waiting_list.length} companies\n`);
    
    // Show first company in detail
    const company = owner.waiting_list[0];
    console.log(`   Company 1 (Sample):`);
    console.log(`   ├─ business_name_en: ${company.business_name_en || 'MISSING'} ${company.business_name_en ? '✅' : '❌'}`);
    console.log(`   ├─ lastUpdated: ${company.lastUpdated || 'MISSING'} ${company.lastUpdated ? '✅' : '❌'}`);
    console.log(`   ├─ EIK: ${company.EIK || 'MISSING'} ${company.EIK ? '✅' : '❌'}`);
    console.log(`   ├─ VAT: ${company.VAT || 'MISSING'} ${company.VAT ? '✅' : '❌'}`);
    console.log(`   ├─ subjectOfActivity: ${(company.subjectOfActivity || 'MISSING').substring(0, 50)}... ${company.subjectOfActivity ? '✅' : '❌'}`);
    console.log(`   ├─ address: ${company.address || 'MISSING'} ${company.address ? '✅' : '❌'}`);
    console.log(`   ├─ street: ${company.street || 'MISSING'} ${company.street ? '✅' : '❌'}`);
    console.log(`   ├─ owner_first_name_en: "${company.owner_first_name_en || 'MISSING'}" ${company.owner_first_name_en && /^[a-zA-Z\s]+$/.test(company.owner_first_name_en) ? '✅' : '❌'}`);
    console.log(`   ├─ owner_last_name_en: "${company.owner_last_name_en || 'MISSING'}" ${company.owner_last_name_en && /^[a-zA-Z\s]+$/.test(company.owner_last_name_en) ? '✅' : '❌'}`);
    console.log(`   └─ owner_birthdate: ${company.owner_birthdate || 'MISSING'} ${company.owner_birthdate ? '✅' : '❌'}`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY:');
  
  const checks = [
    { name: 'owner_first_name_en is Latin', pass: isFirstNameLatin },
    { name: 'owner_last_name_en is Latin', pass: isLastNameLatin },
    { name: 'owner_birthdate populated', pass: !!owner.owner_birthdate },
    { name: 'waiting_list exists', pass: Array.isArray(owner.waiting_list) },
    { name: 'waiting_list has companies', pass: Array.isArray(owner.waiting_list) && owner.waiting_list.length > 0 }
  ];

  checks.forEach(check => {
    console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);
  console.log(`\n${allPassed ? '🎉 ALL CHECKS PASSED!' : '⚠️  SOME CHECKS FAILED'}`);
  
  if (allPassed) {
    console.log('\n✨ SUCCESS: verified_owners structure is correct!');
    console.log('   - Names are transliterated to Latin alphabet');
    console.log('   - Birthdate is populated from users_pending');
    console.log('   - waiting_list contains structured business data');
  }
}

testFullWorkflow().catch(console.error);
