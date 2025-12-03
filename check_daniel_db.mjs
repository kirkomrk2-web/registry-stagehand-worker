#!/usr/bin/env node
/**
 * Check if Daniel Milenov Martinov exists in verified_owners
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDaniel() {
  console.log('🔍 Checking for Даниел Миленов Мартинov in verified_owners...\n');
  
  try {
    const { data, error } = await supabase
      .from('verified_owners')
      .select('*')
      .ilike('full_name', '%Даниел%Мартинов%')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('❌ No records found for Даниел Миленов Мартинов');
      console.log('\nLet\'s check all verified_owners:');
      
      const { data: all, error: allErr } = await supabase
        .from('verified_owners')
        .select('id, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (allErr) {
        console.error('❌ Error fetching all:', allErr.message);
        return;
      }
      
      console.log(`\nFound ${all?.length || 0} total records:`);
      all?.forEach((owner, i) => {
        console.log(`  ${i+1}. ${owner.full_name} (${owner.id}) - ${owner.created_at}`);
      });
      
      return;
    }
    
    console.log(`✅ Found ${data.length} record(s):\n`);
    
    data.forEach((owner, i) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Record ${i+1}:`);
      console.log(`  ID: ${owner.id}`);
      console.log(`  Full Name: ${owner.full_name}`);
      console.log(`  First Name (EN): ${owner.owner_first_name_en || 'N/A'}`);
      console.log(`  Last Name (EN): ${owner.owner_last_name_en || 'N/A'}`);
      console.log(`  Birthdate: ${owner.owner_birthdate || 'N/A'}`);
      console.log(`  Phone: ${owner.allocated_phone_number || 'Not allocated'}`);
      console.log(`  Email Alias: ${owner.email_alias_33mail || 'Not generated'}`);
      console.log(`  Companies: ${owner.companies?.length || 0}`);
      console.log(`  Companies Slim: ${owner.companies_slim?.length || 0}`);
      console.log(`  Status: ${owner.status || 'N/A'}`);
      console.log(`  Created: ${owner.created_at}`);
      
      if (owner.top_company) {
        console.log(`\n  Top Company:`);
        console.log(`    Business Name (EN): ${owner.top_company.business_name_en || 'N/A'}`);
        console.log(`    EIK: ${owner.top_company.eik || 'N/A'}`);
        console.log(`    VAT: ${owner.top_company.vat || 'N/A'}`);
        console.log(`    Entity Type: ${owner.top_company.entity_type || 'N/A'}`);
        console.log(`    City: ${owner.top_company.city_en || 'N/A'}`);
      }
      
      if (owner.companies && owner.companies.length > 0) {
        console.log(`\n  All Companies (${owner.companies.length}):`);
        owner.companies.forEach((c, ci) => {
          console.log(`    ${ci+1}. ${c.business_name_bg || c.eik} [${c.entity_type || 'N/A'}]`);
        });
      }
      
      if (owner.companies_slim && owner.companies_slim.length > 0) {
        console.log(`\n  Companies Slim (${owner.companies_slim.length}):`);
        owner.companies_slim.forEach((c, ci) => {
          console.log(`    ${ci+1}. ${c.business_name_en} - EIK: ${c.eik} [${c.entity_type}]`);
        });
      }
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    });
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err);
  }
}

checkDaniel();
