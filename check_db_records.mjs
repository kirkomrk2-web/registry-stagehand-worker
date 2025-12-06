#!/usr/bin/env node
/**
 * Бърза проверка на записите в базата данни
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ansiaiuaygcfztabtknl.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ ГРЕШКА: Липсва SUPABASE_SERVICE_ROLE_KEY!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkRecords() {
  console.log('🔍 ПРОВЕРКА НА БАЗАТА ДАННИ');
  console.log('='.repeat(80));

  // 1. Провери user_registry_checks за ivan_test
  console.log('\n📊 user_registry_checks (последни 10 записа):');
  const { data: checks, error: checksError } = await supabase
    .from('user_registry_checks')
    .select('id, email, full_name, match_count, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (checksError) {
    console.error('❌ Грешка:', checksError);
  } else if (checks && checks.length > 0) {
    console.log(`✅ Намерени ${checks.length} записа:`);
    checks.forEach((c, idx) => {
      console.log(`   ${idx + 1}. ${c.email} (${c.full_name}) - ${c.match_count} matches - ${c.created_at}`);
    });
  } else {
    console.log('⚠️  НЯМА записи в user_registry_checks!');
  }

  // 2. Провери users_pending за ivan_test
  console.log('\n📄 users_pending (последни 10 записа):');
  const { data: pending, error: pendingError } = await supabase
    .from('users_pending')
    .select('id, email, full_name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (pendingError) {
    console.error('❌ Грешка:', pendingError);
  } else if (pending && pending.length > 0) {
    console.log(`✅ Намерени ${pending.length} записа:`);
    pending.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.email} (${p.full_name}) - ${p.status} - ${p.created_at}`);
    });
  } else {
    console.log('⚠️  НЯМА записи в users_pending!');
  }

  // 3. Провери verified_owners
  console.log('\n👤 verified_owners (последни 10 записа):');
  const { data: owners, error: ownersError } = await supabase
    .from('verified_owners')
    .select('id, email, full_name, eik, owner_status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (ownersError) {
    console.error('❌ Грешка:', ownersError);
  } else if (owners && owners.length > 0) {
    console.log(`✅ Намерени ${owners.length} записа:`);
    owners.forEach((o, idx) => {
      console.log(`   ${idx + 1}. ${o.email} (${o.full_name}) - EIK: ${o.eik} - ${o.owner_status} - ${o.created_at}`);
    });
  } else {
    console.log('⚠️  НЯМА записи в verified_owners!');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Проверката завърши');
  console.log('='.repeat(80));
}

checkRecords().catch(console.error);
