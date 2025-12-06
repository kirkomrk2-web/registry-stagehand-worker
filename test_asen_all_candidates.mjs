#!/usr/bin/env node
/**
 * Провери всички кандидати за Асен Митков Асенов
 */

const TEST_NAME = 'Асен Митков Асенов';
const EXPECTED_COMPANIES = [
  { name: 'ВЕРСАЙ 81', eik: '205521112' },
  { name: 'NESA COMPUTARS', eik: '200536459' },
  { name: 'ALEKS SHANS LTD', eik: '202634539' }
];

console.log(`\n🔍 CHECKING ALL CANDIDATES FOR: ${TEST_NAME}\n`);
console.log('Expected companies:');
EXPECTED_COMPANIES.forEach(c => console.log(`  - ${c.name} (${c.eik})`));
console.log('\n' + '='.repeat(80) + '\n');

async function searchPerson(name) {
  const url = `https://api.companybook.bg/api/people/search?name=${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
  return await res.json();
}

async function getRelationships(identifier) {
  const url = `https://api.companybook.bg/api/relationships/${identifier}?type=ownership&depth=2&include_historical=false`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
  return await res.json();
}

async function main() {
  const searchResults = await searchPerson(TEST_NAME);
  console.log(`📊 Total candidates found: ${searchResults.results?.length || 0}\n`);
  
  if (!searchResults.results || searchResults.results.length === 0) {
    console.error('❌ No results!');
    return;
  }
  
  // Check first 15 candidates
  const candidatesToCheck = Math.min(15, searchResults.results.length);
  console.log(`Checking first ${candidatesToCheck} candidates...\n`);
  console.log('='.repeat(80) + '\n');
  
  const allFoundCompanies = new Map(); // EIK -> { candidate info, company data }
  
  for (let i = 0; i < candidatesToCheck; i++) {
    const candidate = searchResults.results[i];
    const identifier = candidate.indent || candidate.identifier;
    
    console.log(`[${i + 1}] Candidate: ${candidate.name}`);
    console.log(`    Identifier: ${identifier.substring(0, 20)}...`);
    
    const relationships = await getRelationships(identifier);
    const companies = [];
    
    if (relationships.relationships) {
      for (const rel of relationships.relationships) {
        const entity = rel.entity || {};
        if (entity.type === 'company') {
          const eik = String(entity.id || entity.uic || '');
          const name = entity.name;
          const type = rel.relationshipType || rel.type;
          const share = rel.metadata?.share || rel.metadata?.percentage;
          
          // Check ownership criteria
          const shareNum = typeof share === 'string' ? parseFloat(share.replace('%','')) : (typeof share === 'number' ? share : NaN);
          const isSole = type === 'SoleCapitalOwner' || (!isNaN(shareNum) && Math.round(shareNum) === 100);
          const isET = type === 'PhysicalPersonTrader';
          
          if (isSole || isET) {
            companies.push({ eik, name, type, share });
            
            // Check if this is one of expected companies
            const isExpected = EXPECTED_COMPANIES.find(c => c.eik === eik);
            if (isExpected) {
              allFoundCompanies.set(eik, {
                candidateIndex: i + 1,
                candidateName: candidate.name,
                candidateId: identifier,
                companyName: name,
                type,
                share
              });
            }
          }
        }
      }
    }
    
    if (companies.length > 0) {
      console.log(`    ✅ ${companies.length} companies (100% owned):`);
      companies.forEach(c => {
        const isExpected = EXPECTED_COMPANIES.find(exp => exp.eik === c.eik);
        const marker = isExpected ? '🎯' : '  ';
        console.log(`    ${marker} - ${c.name} (${c.eik}) [${c.type}]`);
      });
    } else {
      console.log(`    ⚠️  No companies with 100% ownership`);
    }
    console.log('');
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Summary
  console.log('='.repeat(80));
  console.log('📊 SUMMARY:\n');
  
  console.log(`Found ${allFoundCompanies.size} of ${EXPECTED_COMPANIES.length} expected companies:\n`);
  
  for (const expected of EXPECTED_COMPANIES) {
    const found = allFoundCompanies.get(expected.eik);
    if (found) {
      console.log(`✅ ${expected.name} (${expected.eik})`);
      console.log(`   Belongs to candidate #${found.candidateIndex}: ${found.candidateName}`);
      console.log(`   Type: ${found.type}, Share: ${found.share || 'N/A'}`);
    } else {
      console.log(`❌ ${expected.name} (${expected.eik}) - NOT FOUND in first ${candidatesToCheck} candidates`);
    }
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('\n💡 CONCLUSION:');
  if (allFoundCompanies.size === EXPECTED_COMPANIES.length) {
    console.log('All companies found, but they belong to DIFFERENT people with same name!');
    console.log(`Current registry_check only checks first 5 candidates.`);
    console.log(`Need to either: (1) increase candidate limit, or (2) aggregate from all matches`);
  } else if (allFoundCompanies.size > 0) {
    console.log('Some companies found in different candidates.');
    console.log('These are likely different people with the same name.');
  } else {
    console.log('Companies not found in first 15 candidates.');
    console.log('They might be in later results or belong to inactive/partial ownership.');
  }
}

main();
