#!/usr/bin/env node

/**
 * Test script to verify user_registry_checks table population
 * This will manually trigger the users_pending_worker Edge Function
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('🔍 Testing user_registry_checks population...\n');

async function testEdgeFunction() {
  const testName = 'Даниел Миленов Мартинов';
  const testEmail = `test-${Date.now()}@example.com`;

  console.log(`📝 Test Data:`);
  console.log(`   Name: ${testName}`);
  console.log(`   Email: ${testEmail}\n`);

  // Step 1: Insert into users_pending
  console.log('1️⃣ Inserting into users_pending...');
  const { data: insertData, error: insertError } = await supabase
    .from('users_pending')
    .insert({
      full_name: testName,
      email: testEmail,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select();

  if (insertError) {
    console.error('❌ Insert error:', insertError);
    return;
  }
  console.log('✅ Inserted into users_pending\n');

  // Step 2: Manually trigger Edge Function (since webhook might not be configured)
  console.log('2️⃣ Manually triggering users_pending_worker Edge Function...');
  
  const functionUrl = `${SUPABASE_URL}/functions/v1/users_pending_worker`;
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      full_name: testName,
      email: testEmail,
      status: 'pending'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Edge Function error: ${response.status}`);
    console.error(errorText);
    return;
  }

  const result = await response.json();
  console.log('✅ Edge Function executed successfully');
  console.log('📊 Result:', JSON.stringify(result, null, 2));
  console.log('');

  // Step 3: Wait a bit for processing
  console.log('⏳ Waiting 3 seconds for processing...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 4: Check user_registry_checks table
  console.log('3️⃣ Checking user_registry_checks table...');
  const { data: registryData, error: registryError } = await supabase
    .from('user_registry_checks')
    .select('*')
    .eq('email', testEmail);

  if (registryError) {
    console.error('❌ Query error:', registryError);
    return;
  }

  if (!registryData || registryData.length === 0) {
    console.log('❌ NO DATA in user_registry_checks for this email!');
    console.log('⚠️  This means the Edge Function did NOT write to user_registry_checks\n');
  } else {
    console.log('✅ DATA FOUND in user_registry_checks:');
    console.log(JSON.stringify(registryData[0], null, 2));
    console.log('');
  }

  // Step 5: Check verified_owners table
  console.log('4️⃣ Checking verified_owners table...');
  const { data: ownersData, error: ownersError } = await supabase
    .from('verified_owners')
    .select('*')
    .eq('full_name', testName)
    .order('created_at', { ascending: false })
    .limit(1);

  if (ownersError) {
    console.error('❌ Query error:', ownersError);
    return;
  }

  if (!ownersData || ownersData.length === 0) {
    console.log('❌ NO DATA in verified_owners for this name!');
  } else {
    console.log('✅ DATA FOUND in verified_owners:');
    const owner = ownersData[0];
    console.log(`   ID: ${owner.id}`);
    console.log(`   Name: ${owner.full_name}`);
    console.log(`   Companies: ${owner.companies_slim?.length || 0}`);
    console.log(`   Phone: ${owner.allocated_phone_number || 'N/A'}`);
    console.log(`   Email Alias: ${owner.email_alias_33mail || 'N/A'}`);
    console.log('');
  }

  // Step 6: Check users_pending status update
  console.log('5️⃣ Checking users_pending status update...');
  const { data: pendingData, error: pendingError } = await supabase
    .from('users_pending')
    .select('*')
    .eq('email', testEmail);

  if (pendingError) {
    console.error('❌ Query error:', pendingError);
    return;
  }

  if (pendingData && pendingData.length > 0) {
    const user = pendingData[0];
    console.log('✅ users_pending record found:');
    console.log(`   Status: ${user.status}`);
    console.log(`   Owner ID: ${user.owner_id || 'N/A'}`);
    console.log('');

    if (user.status === 'pending') {
      console.log('⚠️  WARNING: Status is still "pending" - Edge Function may not have processed it!');
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY:');
  console.log('='.repeat(60));
  
  const hasRegistryCheck = registryData && registryData.length > 0;
  const hasOwner = ownersData && ownersData.length > 0;
  const statusUpdated = pendingData && pendingData[0]?.status !== 'pending';

  console.log(`user_registry_checks populated: ${hasRegistryCheck ? '✅ YES' : '❌ NO'}`);
  console.log(`verified_owners populated: ${hasOwner ? '✅ YES' : '❌ NO'}`);
  console.log(`users_pending status updated: ${statusUpdated ? '✅ YES' : '❌ NO'}`);
  
  if (!hasRegistryCheck) {
    console.log('\n⚠️  PROBLEM IDENTIFIED:');
    console.log('The Edge Function is NOT writing to user_registry_checks table.');
    console.log('\nPossible causes:');
    console.log('1. Code bug in users_pending_worker Edge Function');
    console.log('2. Database permissions issue');
    console.log('3. Table structure mismatch');
    console.log('\nCheck Edge Function logs:');
    console.log('supabase functions logs users_pending_worker --tail');
  }
  
  console.log('='.repeat(60) + '\n');
}

// Run test
testEdgeFunction().catch(console.error);
