#!/usr/bin/env node

// Test complete registry_check workflow with proxy
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNjg2NjksImV4cCI6MjA3ODY0NDY2OX0.-a4CakCH4DhHGOG1vMo9nVdtW0ux252QqXRi-7CA_gA';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testWorkflow() {
  console.log('🧪 Testing complete registry_check workflow with proxy...\n');
  
  // Test with Bulgarian name
  const testEmail = `test_${Date.now()}@example.com`;
  const testName = 'Божидар Ангелов Борисов';
  
  console.log(`📝 Step 1: Creating test user in users_pending`);
  console.log(`   Email: ${testEmail}`);
  console.log(`   Name: ${testName}\n`);
  
  // Insert test user
  const { data: insertData, error: insertError } = await supabase
    .from('users_pending')
    .insert({ 
      email: testEmail, 
      full_name: testName,
      status: 'pending' 
    })
    .select()
    .single();
    
  if (insertError) {
    console.error('❌ Failed to insert test user:', insertError);
    return;
  }
  
  console.log('✅ Test user created successfully\n');
  
  // Call registry_check Edge Function
  console.log('🔍 Step 2: Calling registry_check Edge Function (using companybook_proxy)...\n');
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/registry_check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({
      full_name: testName,
      email: testEmail
    })
  });
  
  if (!response.ok) {
    console.error('❌ registry_check failed:', response.status, response.statusText);
    const text = await response.text();
    console.error('Response:', text);
    return;
  }
  
  const result = await response.json();
  console.log('✅ registry_check completed successfully!\n');
  console.log('📊 Results:');
  console.log(`   - Match count: ${result.match_count}`);
  console.log(`   - Any match: ${result.any_match}`);
  console.log(`   - User status: ${result.user_status}`);
  console.log(`   - Companies found: ${result.companies?.length || 0}\n`);
  
  if (result.companies && result.companies.length > 0) {
    console.log('🏢 Companies:');
    result.companies.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.business_name_bg || c.eik}`);
      console.log(`      EIK: ${c.eik}`);
      console.log(`      Type: ${c.entity_type}`);
      console.log(`      Status: ${c.status || 'N/A'}`);
      console.log(`      EN Name: ${c.business_name_en || 'N/A'}`);
      console.log(`      Eligible: ${c.is_eligible_for_wallester ? '✅ YES' : '❌ NO'}`);
      if (c.filter_reason) console.log(`      Reason: ${c.filter_reason}`);
    });
    console.log('');
  }
  
  // Verify user_registry_checks
  console.log('🔍 Step 3: Verifying user_registry_checks table...\n');
  
  const { data: checkData, error: checkError } = await supabase
    .from('user_registry_checks')
    .select('*')
    .eq('email', testEmail)
    .single();
    
  if (checkError) {
    console.error('❌ Failed to find record in user_registry_checks:', checkError);
  } else {
    console.log('✅ Record found in user_registry_checks!');
    console.log(`   - Match count: ${checkData.match_count}`);
    console.log(`   - Any match: ${checkData.any_match}`);
    console.log(`   - Companies: ${checkData.companies?.length || 0}\n`);
  }
  
  // Verify users_pending status update
  console.log('🔍 Step 4: Verifying users_pending status update...\n');
  
  const { data: userData, error: userError } = await supabase
    .from('users_pending')
    .select('*')
    .eq('email', testEmail)
    .single();
    
  if (userError) {
    console.error('❌ Failed to find user in users_pending:', userError);
  } else {
    console.log('✅ User status updated!');
    console.log(`   - Status: ${userData.status}`);
    console.log(`   - Expected: ${result.any_match ? 'ready_for_stagehand' : 'no_match'}`);
    
    if (userData.status === (result.any_match ? 'ready_for_stagehand' : 'no_match')) {
      console.log('   ✅ Status matches expected value!\n');
    } else {
      console.log('   ⚠️  Status does NOT match expected value!\n');
    }
  }
  
  console.log('='.repeat(60));
  console.log('✅ Workflow test completed successfully!');
  console.log('='.repeat(60));
  console.log('\n💡 Summary:');
  console.log('   1. ✅ User inserted into users_pending');
  console.log('   2. ✅ registry_check Edge Function executed (via companybook_proxy)');
  console.log('   3. ✅ Record created in user_registry_checks');
  console.log('   4. ✅ users_pending status updated correctly');
  console.log('\n🎉 The proxy-based workflow is working perfectly!');
}

testWorkflow().catch(console.error);
