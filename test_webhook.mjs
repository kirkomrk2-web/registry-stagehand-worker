#!/usr/bin/env node

/**
 * TEST WEBHOOK - Insert test user and check if webhook triggers
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testWebhook() {
  console.log('🧪 TESTING WEBHOOK - users_pending_worker\n');

  const testEmail = `test_${Date.now()}@example.com`;
  const testUser = {
    full_name: 'Даниел Миленов Мартинов',
    email: testEmail,
    birth_date: '1985-03-15',
    status: 'pending'
  };

  console.log('1️⃣ Inserting test user...');
  console.log('   Full Name:', testUser.full_name);
  console.log('   Email:', testUser.email);
  console.log('   Status:', testUser.status);
  console.log('');

  const { data: inserted, error: insertErr } = await supabase
    .from('users_pending')
    .insert(testUser)
    .select()
    .single();

  if (insertErr) {
    console.error('❌ Failed to insert:', insertErr);
    process.exit(1);
  }

  console.log('✅ User inserted successfully!');
  console.log('   ID:', inserted.id);
  console.log('');

  console.log('2️⃣ Waiting 15 seconds for webhook to process...');
  console.log('   (Webhook should automatically call users_pending_worker)');
  
  // Wait 15 seconds
  for (let i = 15; i > 0; i--) {
    process.stdout.write(`\r   ⏳ ${i} seconds remaining...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\r   ✅ Wait complete!                    ');
  console.log('');

  console.log('3️⃣ Checking results...\n');

  // Check users_pending status
  const { data: pending, error: pendingErr } = await supabase
    .from('users_pending')
    .select('*')
    .eq('email', testEmail)
    .single();

  if (pendingErr) {
    console.error('❌ Failed to fetch users_pending:', pendingErr);
  } else {
    console.log('📋 users_pending status:');
    console.log('   Status:', pending.status);
    console.log('   Updated:', pending.updated_at);
    
    if (pending.status === 'pending') {
      console.log('   ⚠️  WARNING: Status is still "pending" - webhook might not have triggered!');
    } else if (pending.status === 'ready_for_stagehand') {
      console.log('   ✅ SUCCESS: User processed and ready!');
    } else if (pending.status === 'no_match') {
      console.log('   ℹ️  No companies found (this is expected for test data)');
    } else if (pending.status === 'error') {
      console.log('   ❌ ERROR: Processing failed - check Edge Function logs');
    }
  }
  console.log('');

  // Check user_registry_checks
const { data: registryCheck, error: registryErr } = await supabase
    .from('user_registry_checks')
    .select('*')
    .eq('email', testEmail)
    .single();

  if (registryErr || !registryCheck) {
    console.log('📋 user_registry_checks:');
    console.log('   ❌ No record found - webhook probably didn\'t run');
  } else {
    console.log('📋 user_registry_checks:');
    console.log('   Full Name:', registryCheck.full_name);
    console.log('   Match Count:', registryCheck.match_count);
    console.log('   Any Match:', registryCheck.any_match);
    console.log('   Status:', registryCheck.status);
    console.log('   Checked At:', registryCheck.checked_at);
    
    if (registryCheck.match_count > 0) {
      console.log('   ✅ SUCCESS:', registryCheck.match_count, 'companies found!');
      console.log('   Companies:', JSON.stringify(registryCheck.companies, null, 2));
    } else {
      console.log('   ℹ️  No matching companies (expected for test)');
    }
  }
  console.log('');

  // Check verified_owners
  const { data: owner, error: ownerErr } = await supabase
    .from('verified_owners')
    .select('full_name, companies_slim, allocated_phone_number, email_alias_33mail')
    .eq('full_name', testUser.full_name)
    .single();

  if (ownerErr || !owner) {
    console.log('📋 verified_owners:');
    console.log('   ⚠️  No record found');
  } else {
    console.log('📋 verified_owners:');
    console.log('   Full Name:', owner.full_name);
    console.log('   Companies Slim Count:', owner.companies_slim?.length || 0);
    console.log('   Phone:', owner.allocated_phone_number || 'not allocated');
    console.log('   Email Alias:', owner.email_alias_33mail || 'not set');
    
    if (owner.companies_slim && owner.companies_slim.length > 0) {
      console.log('   ✅ SUCCESS: Companies found and filtered!');
      owner.companies_slim.forEach((c, i) => {
        console.log(`   Company ${i+1}:`, c.business_name_en, `(${c.eik})`);
      });
    }
  }
  console.log('');

  // Summary
  console.log('=' .repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));
  
  if (pending?.status !== 'pending' && registryCheck) {
    console.log('✅ WEBHOOK WORKS! All systems operational.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check Supabase Dashboard > Edge Functions > users_pending_worker > Logs');
    console.log('2. Monitor webhook in Database > Webhooks > Recent Deliveries');
  } else if (pending?.status === 'pending' && !registryCheck) {
    console.log('❌ WEBHOOK NOT WORKING!');
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Check webhook is enabled in Dashboard > Database > Webhooks');
    console.log('2. Check "Recent Deliveries" in webhook settings');
    console.log('3. Try manually calling the function:');
    console.log('   curl -X POST https://ansiaiuaygcfztabtknl.supabase.co/functions/v1/users_pending_worker \\');
    console.log('     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \\');
    console.log('     -d \'{"row":{"email":"' + testEmail + '","full_name":"Даниел Миленов Мартинов","status":"pending"}}\'');
  } else {
    console.log('⚠️  PARTIAL SUCCESS - Check logs for details');
  }
  console.log('=' .repeat(60));
  console.log('');
}

// Run test
testWebhook().catch(console.error);
