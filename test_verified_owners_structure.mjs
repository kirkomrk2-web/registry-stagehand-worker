#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testVerifiedOwnersStructure() {
  console.log('🧪 Testing verified_owners data structure...\n');

  // Test with Asen Mitkov Asenov
  const testName = 'Асен Митков Асенов';
  const testEmail = 'asen.asenov@example.com';

  console.log(`📌 Test user: ${testName} (${testEmail})`);

  // 1. Check if user exists in users_pending with birthdate
  console.log('\n1️⃣ Checking users_pending...');
  const { data: pendingUser, error: pendingError } = await supabase
    .from('users_pending')
    .select('full_name, email, birth_date, status')
    .eq('email', testEmail)
    .single();

  if (pendingError) {
    console.log('⚠️  User not found in users_pending, will create test record');
    
    // Create test user
    const { error: insertError } = await supabase
      .from('users_pending')
      .insert({
        full_name: testName,
        email: testEmail,
        birth_date: '1990-05-15',
        status: 'pending',
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('❌ Failed to create test user:', insertError.message);
      return;
    }
    console.log('✅ Test user created');
  } else {
    console.log('✅ User found in users_pending:');
    console.log(`   - birth_date: ${pendingUser.birth_date || 'NULL'}`);
    console.log(`   - status: ${pendingUser.status}`);
  }

  // 2. Trigger users_pending_worker
  console.log('\n2️⃣ Triggering users_pending_worker...');
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
  console.log('✅ Worker response:', JSON.stringify(workerResult, null, 2));

  // 3. Check verified_owners structure
  console.log('\n3️⃣ Checking verified_owners structure...');
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
  
  // Check owner names
  console.log('\n🔤 Owner Names:');
  console.log(`   - full_name: ${owner.full_name}`);
  console.log(`   - owner_first_name_en: ${owner.owner_first_name_en || 'NULL'} ${owner.owner_first_name_en ? '✅' : '❌'}`);
  console.log(`   - owner_last_name_en: ${owner.owner_last_name_en || 'NULL'} ${owner.owner_last_name_en ? '✅' : '❌'}`);
  
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
    
    owner.waiting_list.forEach((company, index) => {
      console.log(`   Company ${index + 1}:`);
      console.log(`   ├─ business_name_en: ${company.business_name_en || 'MISSING'}`);
      console.log(`   ├─ lastUpdated: ${company.lastUpdated || 'MISSING'}`);
      console.log(`   ├─ EIK: ${company.EIK || 'MISSING'}`);
      console.log(`   ├─ VAT: ${company.VAT || 'MISSING'}`);
      console.log(`   ├─ subjectOfActivity: ${company.subjectOfActivity || 'MISSING'}`);
      console.log(`   ├─ address: ${company.address || 'MISSING'}`);
      console.log(`   ├─ street: ${company.street || 'MISSING'}`);
      console.log(`   ├─ owner_first_name_en: ${company.owner_first_name_en || 'MISSING'}`);
      console.log(`   ├─ owner_last_name_en: ${company.owner_last_name_en || 'MISSING'}`);
      console.log(`   └─ owner_birthdate: ${company.owner_birthdate || 'MISSING'}`);
      console.log('');
    });
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY:');
  const checks = [
    { name: 'owner_first_name_en transliterated', pass: !!owner.owner_first_name_en },
    { name: 'owner_last_name_en transliterated', pass: !!owner.owner_last_name_en },
    { name: 'owner_birthdate populated', pass: !!owner.owner_birthdate },
    { name: 'waiting_list exists', pass: !!owner.waiting_list },
    { name: 'waiting_list has companies', pass: Array.isArray(owner.waiting_list) && owner.waiting_list.length > 0 }
  ];

  checks.forEach(check => {
    console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
  });

  const allPassed = checks.every(c => c.pass);
  console.log(`\n${allPassed ? '🎉 ALL CHECKS PASSED!' : '⚠️  SOME CHECKS FAILED'}`);
}

testVerifiedOwnersStructure().catch(console.error);
