#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testFinalFormat() {
  console.log('🧪 Проверка на окончателния формат на данните\n');
  
  const testName = 'Асен Митков Асенов';
  
  console.log(`📌 Проверка: ${testName}\n`);
  
  const { data, error } = await supabase
    .from('verified_owners')
    .select('*')
    .eq('full_name', testName)
    .maybeSingle();
  
  if (error) {
    console.error('❌ Грешка:', error.message);
    return;
  }
  
  if (!data) {
    console.log('⚠️  Няма данни за този собственик');
    return;
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 OWNER DATA:');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log(`Full Name: ${data.full_name}`);
  console.log(`First Name (EN): ${data.owner_first_name_en}`);
  console.log(`Last Name (EN): ${data.owner_last_name_en}`);
  console.log(`Birth Date: ${data.owner_birthdate}`);
  console.log(`Email: ${data.email_alias_33mail}`);
  console.log(`Phone: ${data.allocated_phone_number || 'N/A'}\n`);
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📋 WAITING LIST (${data.waiting_list?.length || 0} companies):`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (data.waiting_list && data.waiting_list.length > 0) {
    data.waiting_list.forEach((company, idx) => {
      console.log(`\n🏢 Company ${idx + 1}:`);
      console.log(`   Business Name: ${company.business_name_en}`);
      console.log(`   EIK: ${company.EIK}`);
      console.log(`   VAT: ${company.VAT}`);
      console.log(`   Last Updated: ${company.lastUpdated}`);
      console.log(`   Street: ${company.street}`);
      console.log(`   Address: ${company.address}`);
      console.log(`   Subject: ${company.subjectOfActivity.substring(0, 60)}...`);
      console.log(`   Owner: ${company.owner_first_name_en} ${company.owner_last_name_en}`);
      console.log(`   Birth Date: ${company.owner_birthdate}`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ FORMAT CHECKS:');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Check 1: Names in Latin
  const firstNameLatin = /^[a-zA-Z\s]+$/.test(data.owner_first_name_en || '');
  const lastNameLatin = /^[a-zA-Z\s]+$/.test(data.owner_last_name_en || '');
  console.log(`${firstNameLatin ? '✅' : '❌'} First name is Latin: ${data.owner_first_name_en}`);
  console.log(`${lastNameLatin ? '✅' : '❌'} Last name is Latin: ${data.owner_last_name_en}`);
  
  // Check 2: Birth date format
  const birthDateFormat = /^\d{2}\.\d{2}\.\d{4}$/.test(data.owner_birthdate || '');
  console.log(`${birthDateFormat ? '✅' : '❌'} Birth date format dd.mm.yyyy: ${data.owner_birthdate}`);
  
  // Check 3: Waiting list has data
  const hasWaitingList = data.waiting_list && data.waiting_list.length > 0;
  console.log(`${hasWaitingList ? '✅' : '❌'} Waiting list populated: ${data.waiting_list?.length || 0} companies`);
  
  if (hasWaitingList) {
    const firstCompany = data.waiting_list[0];
    
    // Check street/address in Latin
    const streetLatin = /^[a-zA-Z0-9\s\.,\-"]+$/.test(firstCompany.street || '');
    const addressLatin = /^[a-zA-Z0-9\s\.,\-]+$/.test(firstCompany.address || '');
    
    console.log(`${streetLatin ? '✅' : '❌'} Street in Latin: ${firstCompany.street}`);
    console.log(`${addressLatin ? '✅' : '❌'} Address in Latin: ${firstCompany.address}`);
    
    // Check company owner birth date format  
    const companyBirthFormat = /^\d{2}\.\d{2}\.\d{4}$/.test(firstCompany.owner_birthdate || '');
    console.log(`${companyBirthFormat ? '✅' : '❌'} Company birth date format: ${firstCompany.owner_birthdate}`);
  }
  
  console.log('\n');
}

testFinalFormat().catch(console.error);
