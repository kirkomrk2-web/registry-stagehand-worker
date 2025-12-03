#!/usr/bin/env node
/**
 * Manually insert Daniel Milenov Martinov into verified_owners
 * Using data from CompanyBook proxy
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const COMPANYBOOK_PROXY = 'http://localhost:4321';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function insertDaniel() {
  console.log('🔄 Manually inserting Даниел Миленов Мартинов...\n');
  
  try {
    // 1. Fetch data from CompanyBook via proxy
    console.log('1️⃣ Fetching data from CompanyBook proxy...');
    const searchUrl = `${COMPANYBOOK_PROXY}/person-search?name=${encodeURIComponent('Даниел Миленов Мартинов')}&limit=5`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      console.error('❌ No person found in CompanyBook');
      return;
    }
    
    const person = searchData.results[0];
    const personId = person.indent || person.identifier || person.id;
    console.log(`✅ Found person: ${person.name} (ID: ${personId})\n`);
    
    // 2. Fetch relationships
    console.log('2️⃣ Fetching relationships...');
    const relUrl = `${COMPANYBOOK_PROXY}/relationships/${personId}?type=ownership&depth=2`;
    const relRes = await fetch(relUrl);
    const relData = await relRes.json();
    
    // Extract companies (100% owned / ET)
    const companies = [];
    const relationships = relData?.relationships || [];
    
    for (const rel of relationships) {
      const entity = rel.entity || {};
      const rtype = rel.relationshipType || rel.type || '';
      const isActive = rel.isActive !== false;
      
      if (!isActive || entity.type !== 'company') continue;
      
      const shareStr = rel?.metadata?.share || rel?.metadata?.percentage || null;
      const shareNum = typeof shareStr === 'string' ? parseFloat(String(shareStr).replace('%', '')) : (typeof shareStr === 'number' ? shareStr : NaN);
      const isSole = rtype === 'SoleCapitalOwner' || (!isNaN(shareNum) && Math.round(shareNum) === 100);
      const isET = rtype === 'PhysicalPersonTrader';
      
      if (isSole || isET) {
        companies.push({
          eik: entity.id || entity.uic || null,
          business_name_bg: entity.name || null,
          business_name_en: null,  // Will be enriched later
          entity_type: isET ? 'ET' : 'EOOD',
        });
      }
    }
    
    console.log(`✅ Found ${companies.length} companies\n`);
    
    // 3. Pick top company (prefer EOOD)
    const topCompany = companies.sort((a, b) => {
      if (a.entity_type === 'EOOD' && b.entity_type !== 'EOOD') return -1;
      if (b.entity_type === 'EOOD' && a.entity_type !== 'EOOD') return 1;
      return 0;
    })[0] || null;
    
    if (topCompany) {
      console.log(`3️⃣ Top Company: ${topCompany.business_name_bg} [${topCompany.entity_type}]\n`);
    }
    
    // 4. Parse name
    const fullName = 'Даниел Миленов Мартинов';
    const parts = fullName.split(/\s+/);
    const firstName = parts[0] || null;
    const lastName = parts.slice(1).join(' ') || null;
    
    // 5. Generate email alias
    const emailAlias = `${(topCompany?.business_name_bg || 'daniel').toLowerCase().replace(/[^a-z0-9]/g, '')}@33mailbox.com`;
    
    // 6. Check if phone is available
    console.log('4️⃣ Checking for available SMS number...');
    const { data: phone, error: phoneErr } = await supabase
      .from('sms_numbers_pool')
      .select('id, phone_number, sms_url, country_code')
      .eq('status', 'available')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    
    let phoneNumber = null;
    let phoneUrl = null;
    let phoneCountry = null;
    
    if (phone && !phoneErr) {
      console.log(`✅ Found available phone: ${phone.phone_number}\n`);
      phoneNumber = phone.phone_number;
      phoneUrl = phone.sms_url;
      phoneCountry = phone.country_code;
    } else {
      console.log('⚠️  No available phone numbers in pool\n');
    }
    
    // 7. Insert into verified_owners
    console.log('5️⃣ Inserting into verified_owners...');
    const { data: owner, error: insertErr } = await supabase
      .from('verified_owners')
      .insert({
        full_name: fullName,
        owner_first_name_en: firstName,
        owner_last_name_en: lastName,
        companies: companies,
        top_company: topCompany,
        allocated_phone_number: phoneNumber,
        allocated_sms_number_url: phoneUrl,
        allocated_sms_country_code: phoneCountry,
        email_alias_33mail: emailAlias,
        email_alias_hostinger: 'support@33mailbox.com',
      })
      .select()
      .single();
    
    if (insertErr) {
      console.error('❌ Insert error:', insertErr.message);
      return;
    }
    
    console.log('✅ Successfully inserted!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ID: ${owner.id}`);
    console.log(`  Full Name: ${owner.full_name}`);
    console.log(`  First Name: ${owner.owner_first_name_en}`);
    console.log(`  Last Name: ${owner.owner_last_name_en}`);
    console.log(`  Phone: ${owner.allocated_phone_number || 'Not allocated'}`);
    console.log(`  Email Alias: ${owner.email_alias_33mail}`);
    console.log(`  Companies: ${owner.companies?.length || 0}`);
    console.log(`  Status: ${owner.status}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 8. Update phone status if allocated
    if (phone && !phoneErr) {
      console.log('6️⃣ Updating SMS number status to assigned...');
      const { error: updateErr } = await supabase
        .from('sms_numbers_pool')
        .update({ 
          status: 'assigned', 
          assigned_to: owner.id, 
          assigned_at: new Date().toISOString() 
        })
        .eq('id', phone.id);
      
      if (updateErr) {
        console.error('⚠️  Could not update phone status:', updateErr.message);
      } else {
        console.log('✅ SMS number assigned\n');
      }
    }
    
    // 9. Update users_pending status
    console.log('7️⃣ Updating users_pending status...');
    const { error: pendingErr } = await supabase
      .from('users_pending')
      .update({ status: 'ready_for_stagehand', updated_at: new Date().toISOString() })
      .eq('email', 'test@example.com');
    
    if (pendingErr) {
      console.error('⚠️  Could not update users_pending:', pendingErr.message);
    } else {
      console.log('✅ users_pending updated\n');
    }
    
    console.log('🎉 All done!');
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err);
  }
}

insertDaniel();
