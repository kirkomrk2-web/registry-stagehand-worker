#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function cleanupAndRun() {
  const testName = 'Асен Митков Асенов';
  const testEmail = 'asen.test@example.com';
  
  console.log('🧹 Изчистване на всички стари данни за', testName);
  
  // Delete all records
  await supabase.from('verified_owners').delete().eq('full_name', testName);
  await supabase.from('user_registry_checks').delete().eq('email', testEmail);
  await supabase.from('users_pending').delete().eq('email', testEmail);
  
  console.log('✅ Изчистване завършено\n');
  
  // Create fresh test user
  console.log('📝 Създаване на нов тестов потребител...');
  const { error: insertError } = await supabase
    .from('users_pending')
    .insert({
      full_name: testName,
      email: testEmail,
      birth_date: '1990-05-15',
      status: 'pending'
    });
  
  if (insertError) {
    console.error('❌ Грешка:', insertError.message);
    return;
  }
  
  console.log('✅ Потребител създаден\n');
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 1000));
  
  // Run registry_check
  console.log('🔍 Стартиране на registry_check...');
  const regResponse = await fetch(
    'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/registry_check',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ full_name: testName, email: testEmail })
    }
  );
  
  const regResult = await regResponse.json();
  console.log('Registry check:', regResult.status, `(${regResult.eligible_companies_count || 0} eligible companies)`);
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Run users_pending_worker
  console.log('\n⚙️ Стартиране на users_pending_worker...');
  const workerResponse = await fetch(
    'https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ full_name: testName, email: testEmail, status: 'pending' })
    }
  );
  
  const workerResult = await workerResponse.json();
  console.log('Worker result:', workerResult);
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Check final result
  console.log('\n📊 Проверка на крайния резултат...\n');
  const { data, error } = await supabase
    .from('verified_owners')
    .select('*')
    .eq('full_name', testName);
  
  if (error) {
    console.error('❌ Грешка:', error.message);
    return;
  }
  
  console.log(`✅ Намерени записи: ${data.length}\n`);
  
  if (data.length > 0) {
    const owner = data[0];
    console.log('═══════════════════════════════════════');
    console.log('OWNER NAMES:');
    console.log('═══════════════════════════════════════');
    console.log(`owner_first_name_en: ${owner.owner_first_name_en}`);
    console.log(`owner_last_name_en: ${owner.owner_last_name_en}`);
    console.log(`owner_birthdate: ${owner.owner_birthdate}`);
    
    if (owner.waiting_list && owner.waiting_list.length > 0) {
      const company = owner.waiting_list[0];
      console.log('\n═══════════════════════════════════════');
      console.log('FIRST COMPANY IN WAITING LIST:');
      console.log('═══════════════════════════════════════');
      console.log(`Business Name: ${company.business_name_en}`);
      console.log(`Street: ${company.street}`);
      console.log(`Address: ${company.address}`);
      console.log(`Owner Birthdate: ${company.owner_birthdate}`);
    }
  }
}

cleanupAndRun().catch(console.error);
