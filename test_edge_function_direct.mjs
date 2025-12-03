#!/usr/bin/env node
/**
 * Test users_pending_worker Edge Function directly with debug
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEdgeFunction() {
  console.log('🔍 Testing users_pending_worker Edge Function...\n');
  
  try {
    // First update status back to pending
    console.log('1️⃣ Updating test@example.com status to pending...');
    const { error: updateErr } = await supabase
      .from('users_pending')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('email', 'test@example.com');
    
    if (updateErr) {
      console.error('❌ Update error:', updateErr.message);
      return;
    }
    console.log('✅ Status updated to pending\n');
    
    // Call Edge Function
    console.log('2️⃣ Calling users_pending_worker Edge Function...');
    const workerUrl = `${SUPABASE_URL}/functions/v1/users_pending_worker`;
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        full_name: 'Даниел Миленов Мартинов',
        email: 'test@example.com',
        status: 'pending',
      }),
    });
    
    console.log(`   Response Status: ${response.status} ${response.statusText}\n`);
    
    const responseText = await response.text();
    console.log('3️⃣ Response Body:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(responseText);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('4️⃣ Parsed Response:');
        console.log(JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('⚠️  Could not parse as JSON');
      }
    }
    
    // Check updated status
    console.log('\n5️⃣ Checking updated status in users_pending...');
    const { data: updated, error: checkErr } = await supabase
      .from('users_pending')
      .select('status, updated_at')
      .eq('email', 'test@example.com')
      .single();
    
    if (checkErr) {
      console.error('❌ Check error:', checkErr.message);
    } else {
      console.log(`   Status: ${updated.status}`);
      console.log(`   Updated: ${updated.updated_at}`);
    }
    
    // Check if verified_owner was created
    console.log('\n6️⃣ Checking if verified_owner was created...');
    const { data: owner, error: ownerErr } = await supabase
      .from('verified_owners')
      .select('id, full_name, companies')
      .ilike('full_name', '%Даниел%Мартинов%')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (ownerErr) {
      console.error('❌ Owner check error:', ownerErr.message);
    } else if (owner && owner.length > 0) {
      console.log(`✅ Verified owner created!`);
      console.log(`   ID: ${owner[0].id}`);
      console.log(`   Full Name: ${owner[0].full_name}`);
      console.log(`   Companies: ${owner[0].companies?.length || 0}`);
    } else {
      console.log('❌ No verified_owner created');
    }
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err);
  }
}

testEdgeFunction();
