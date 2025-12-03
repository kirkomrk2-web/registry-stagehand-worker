#!/usr/bin/env node
/**
 * Check users_pending table
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUsersPending() {
  console.log('🔍 Checking users_pending table...\n');
  
  try {
    // Check for Daniel
    const { data: daniel, error: danielErr } = await supabase
      .from('users_pending')
      .select('*')
      .eq('email', 'test@example.com')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (danielErr) {
      console.error('❌ Error fetching Daniel:', danielErr.message);
    } else if (daniel && daniel.length > 0) {
      console.log('✅ Found Daniel in users_pending:');
      console.log(`  Email: ${daniel[0].email}`);
      console.log(`  Full Name: ${daniel[0].full_name}`);
      console.log(`  Status: ${daniel[0].status}`);
      console.log(`  Created: ${daniel[0].created_at}`);
      console.log(`  Updated: ${daniel[0].updated_at || 'N/A'}\n`);
    } else {
      console.log('❌ Daniel not found in users_pending\n');
    }
    
    // Check all users_pending
    const { data: all, error: allErr } = await supabase
      .from('users_pending')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allErr) {
      console.error('❌ Error fetching all users_pending:', allErr.message);
      return;
    }
    
    console.log(`📊 Total records in users_pending: ${all?.length || 0}\n`);
    
    if (all && all.length > 0) {
      all.forEach((user, i) => {
        console.log(`${i+1}. ${user.full_name} (${user.email}) - Status: ${user.status} - Created: ${user.created_at}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err);
  }
}

checkUsersPending();
