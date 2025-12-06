#!/usr/bin/env node
/**
 * Debug test за Асен Митков Асенов - провери защо липсват компании
 */

const TEST_NAME = 'Асен Митков Асенов';
const MISSING_COMPANIES = [
  { name: 'NESA COMPUTARS', eik: '200536459' },
  { name: 'ALEKS SHANS LTD', eik: '202634539' }
];

console.log(`\n🔍 DEBUG TEST: ${TEST_NAME}\n`);
console.log('Очаквани липсващи компании:');
MISSING_COMPANIES.forEach(c => console.log(`  - ${c.name} (${c.eik})`));
console.log('\n' + '='.repeat(80) + '\n');

// 1. Search person
async function searchPerson(name) {
  const url = `https://api.companybook.bg/api/people/search?name=${encodeURIComponent(name)}`;
  console.log('📡 1. Search Person API:');
  console.log(`   ${url}\n`);
  
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
  const data = await res.json();
  
  console.log(`   ✅ Found ${data.results?.length || 0} person matches\n`);
  
  if (data.results && data.results.length > 0) {
    data.results.slice(0, 5).forEach((person, idx) => {
      console.log(`   [${idx + 1}] ${person.name}`);
      console.log(`       Indent: ${person.indent || person.identifier || 'N/A'}`);
    });
  }
  
  return data;
}

// 2. Get ownership/relationships
async function getRelationships(identifier) {
  const url = `https://api.companybook.bg/api/relationships/${identifier}?type=ownership&depth=2&include_historical=false`;
  console.log(`\n📡 2. Relationships API for ${identifier}:`);
  console.log(`   ${url}\n`);
  
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
  const data = await res.json();
  
  console.log(`   ✅ Found ${data.relationships?.length || 0} relationships\n`);
  
  if (data.relationships && data.relationships.length > 0) {
    console.log('   Companies found:');
    data.relationships.forEach((rel, idx) => {
      const entity = rel.entity || {};
      if (entity.type === 'company') {
        const eik = entity.id || entity.uic;
        const name = entity.name;
        const type = rel.relationshipType || rel.type;
        const isActive = rel.isActive !== false;
        
        // Check if this is one of the missing companies
        const isMissing = MISSING_COMPANIES.some(c => c.eik === String(eik));
        const marker = isMissing ? '🔴 MISSING' : '✓';
        
        console.log(`   ${marker} [${idx + 1}] ${name} (${eik})`);
        console.log(`       Type: ${type}`);
        console.log(`       Active: ${isActive}`);
        console.log(`       Share: ${rel.metadata?.share || rel.metadata?.percentage || 'N/A'}`);
      }
    });
  }
  
  return data;
}

// 3. Get company details
async function getCompanyDetails(eik) {
  const url = `https://api.companybook.bg/api/companies/${eik}?with_data=true`;
  console.log(`\n📡 3. Company Details API for ${eik}:`);
  console.log(`   ${url}\n`);
  
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
  const data = await res.json();
  const comp = data.company || data;
  
  console.log(`   Company: ${comp.companyName?.name || comp.name || 'N/A'}`);
  console.log(`   EIK: ${comp.uic || eik}`);
  console.log(`   Legal Form: ${comp.legalForm || 'N/A'}`);
  console.log(`   Status: ${comp.status || 'N/A'}`);
  console.log(`   English Name (companyNameTransliteration): ${comp.companyNameTransliteration?.name || 'EMPTY'}`);
  console.log(`   English Name (name_en): ${comp.name_en || 'N/A'}`);
  
  return data;
}

// Main test
async function main() {
  try {
    // Step 1: Search person
    const searchResults = await searchPerson(TEST_NAME);
    
    if (!searchResults.results || searchResults.results.length === 0) {
      console.error('\n❌ No person found!');
      return;
    }
    
    // Step 2: Get relationships for first match
    const firstPerson = searchResults.results[0];
    const identifier = firstPerson.indent || firstPerson.identifier;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Using person: ${firstPerson.name} (${identifier})`);
    console.log('='.repeat(80));
    
    const relationships = await getRelationships(identifier);
    
    // Step 3: Check the missing companies
    console.log(`\n${'='.repeat(80)}`);
    console.log('CHECKING MISSING COMPANIES:');
    console.log('='.repeat(80));
    
    for (const missing of MISSING_COMPANIES) {
      console.log(`\n🔍 Checking: ${missing.name} (${missing.eik})`);
      
      // Check if it's in relationships
      const foundInRel = relationships.relationships?.find(rel => {
        const entity = rel.entity || {};
        const eik = String(entity.id || entity.uic || '');
        return eik === missing.eik;
      });
      
      if (foundInRel) {
        console.log('   ✅ Found in relationships API');
        const entity = foundInRel.entity;
        const type = foundInRel.relationshipType || foundInRel.type;
        const share = foundInRel.metadata?.share || foundInRel.metadata?.percentage;
        const isActive = foundInRel.isActive !== false;
        
        console.log(`   - Type: ${type}`);
        console.log(`   - Share: ${share || 'N/A'}`);
        console.log(`   - Active: ${isActive}`);
        console.log(`   - Entity name: ${entity.name}`);
        
        // Check if it matches our filters
        const shareNum = typeof share === 'string' ? parseFloat(share.replace('%','')) : (typeof share === 'number' ? share : NaN);
        const isSole = type === 'SoleCapitalOwner' || (!isNaN(shareNum) && Math.round(shareNum) === 100);
        const isET = type === 'PhysicalPersonTrader';
        
        if (isSole || isET) {
          console.log('   ✅ PASSES filter (100% owner or ET)');
          
          // Get company details
          await getCompanyDetails(missing.eik);
        } else {
          console.log(`   ❌ FAILS filter: Not 100% owner, Share=${share}, Type=${type}`);
        }
      } else {
        console.log('   ❌ NOT found in relationships API!');
        console.log('   This company is not returned by the ownership API for this person.');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main();
