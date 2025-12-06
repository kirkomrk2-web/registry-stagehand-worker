import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ansiaiiuayggfztabtkni.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';
const supabase = createClient(supabaseUrl, serviceRoleKey);

const testEmail = 'bozhidar.ivanov@example.com';
const testName = 'Божидар Иванов Великов';
const testBirthDate = '1990-05-15';

console.log('\n🧹 Step 1: Complete cleanup...');

// Delete from all related tables
await supabase.from('verified_owners').delete().eq('full_name', testName);
await supabase.from('user_registry_checks').delete().eq('email', testEmail);
await supabase.from('users_pending').delete().eq('email', testEmail);

console.log('✓ Cleanup complete\n');

console.log('📝 Step 2: Insert fresh test user...');

const { error: insertError } = await supabase
  .from('users_pending')
  .insert({
    full_name: testName,
    email: testEmail,
    birth_date: testBirthDate,
    status: 'pending'
  });

if (insertError) {
  console.error('❌ Failed to insert user:', insertError);
  process.exit(1);
}

console.log('✓ User inserted\n');

console.log('🔍 Step 3: Call registry_check...');

const registryCheckUrl = `${supabaseUrl}/functions/v1/registry_check`;
const registryResponse = await fetch(registryCheckUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`
  },
  body: JSON.stringify({
    full_name: testName,
    email: testEmail
  })
});

if (!registryResponse.ok) {
  console.error('❌ registry_check failed:', registryResponse.status);
  const error = await registryResponse.text();
  console.error(error);
  process.exit(1);
}

const registryResult = await registryResponse.json();
console.log('✓ registry_check completed');
console.log(`  Found ${registryResult.match_count} companies\n`);

// Wait a bit for users_pending_worker to complete (it's triggered automatically)
console.log('⏳ Waiting for users_pending_worker to complete...');
await new Promise(resolve => setTimeout(resolve, 5000));

console.log('📊 Step 4: Check waiting_list data...\n');

const { data: owner } = await supabase
  .from('verified_owners')
  .select('waiting_list, owner_first_name_en, owner_last_name_en, owner_birthdate')
  .eq('full_name', testName)
  .single();

if (!owner || !owner.waiting_list || owner.waiting_list.length === 0) {
  console.error('❌ No verified_owner or waiting_list found!');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('✅ VERIFIED OWNER DATA');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Owner First Name (EN): ${owner.owner_first_name_en}`);
console.log(`Owner Last Name (EN):  ${owner.owner_last_name_en}`);
console.log(`Owner Birthdate:       ${owner.owner_birthdate}`);
console.log('');
console.log('WAITING LIST:');
console.log('─────────────────────────────────────────────────────────────');

owner.waiting_list.forEach((company, index) => {
  console.log(`\nCompany ${index + 1}:`);
  console.log(`  Business Name:  ${company.business_name_en}`);
  console.log(`  EIK:            ${company.EIK}`);
  console.log(`  VAT:            ${company.VAT}`);
  console.log(`  Street:         ${company.street}`);
  console.log(`  Address:        ${company.address.split('\n').join(' / ')}`);
  console.log(`  Owner Birth:    ${company.owner_birthdate}`);
  console.log(`  Last Updated:   ${company.lastUpdated}`);
  
  // Check for quotes
  const hasQuotes = /["'«»„""'']/.test(company.street);
  console.log(`  Quote Check:    ${hasQuotes ? '❌ HAS QUOTES' : '✅ NO QUOTES'}`);
});

console.log('\n═══════════════════════════════════════════════════════════════\n');
