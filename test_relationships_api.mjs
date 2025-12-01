// Test script to debug relationships API and name_en extraction
const COMPANYBOOK_API_BASE = "https://api.companybook.bg/api";

async function searchPerson(fullName) {
  const searchUrl = `${COMPANYBOOK_API_BASE}/people/search?name=${encodeURIComponent(fullName)}`;
  console.log(`\n🔍 Searching for: ${fullName}`);
  console.log(`URL: ${searchUrl}`);
  
  const response = await fetch(searchUrl, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
  });
  
  if (!response.ok) {
    console.error(`❌ Search failed: ${response.status}`);
    return null;
  }
  
  const data = await response.json();
  console.log(`✅ Found ${data.results?.length || 0} results`);
  return data;
}

async function getRelationships(identifier) {
  const ownershipUrl = `${COMPANYBOOK_API_BASE}/relationships/${identifier}?type=ownership&depth=2&include_historical=false`;
  console.log(`\n🔗 Getting relationships for: ${identifier}`);
  console.log(`URL: ${ownershipUrl}`);
  
  const response = await fetch(ownershipUrl, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
  });
  
  if (!response.ok) {
    console.error(`❌ Relationships failed: ${response.status}`);
    return null;
  }
  
  const data = await response.json();
  console.log(`✅ Found ${data.relationships?.length || 0} relationships`);
  return data;
}

async function getCompanyDetails(uic) {
  const companyUrl = `${COMPANYBOOK_API_BASE}/companies/${uic}?with_data=true`;
  console.log(`\n🏢 Getting company details for: ${uic}`);
  
  const response = await fetch(companyUrl, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
  });
  
  if (!response.ok) {
    console.error(`❌ Company details failed: ${response.status}`);
    return null;
  }
  
  const data = await response.json();
  return data;
}

async function main() {
  const testName = "Иван Христев Димитров";
  
  // Step 1: Search for person
  const searchResults = await searchPerson(testName);
  if (!searchResults?.results?.length) {
    console.log("❌ No search results found");
    return;
  }
  
  // Step 2: Get first candidate
  const candidate = searchResults.results[0];
  const pid = candidate.indent || candidate.identifier || candidate.id;
  console.log(`\n📋 First candidate indent: ${pid}`);
  console.log(`   Name: ${candidate.name}`);
  
  // Step 3: Get relationships
  const ownershipData = await getRelationships(pid);
  if (!ownershipData?.relationships?.length) {
    console.log("❌ No relationships found");
    return;
  }
  
  console.log(`\n📊 Analyzing ${ownershipData.relationships.length} relationships:`);
  console.log("=" .repeat(80));
  
  // Step 4: Analyze each relationship
  for (const [index, rel] of ownershipData.relationships.entries()) {
    const entity = rel.entity || {};
    const rtype = rel.relationshipType || rel.type || '';
    const isActive = rel.isActive !== false;
    
    console.log(`\n[${index + 1}] Relationship:`);
    console.log(`  - Type: ${rtype}`);
    console.log(`  - Active: ${isActive}`);
    console.log(`  - Entity Type: ${entity.type}`);
    console.log(`  - Entity ID: ${entity.id}`);
    console.log(`  - Entity Name (BG): ${entity.name}`);
    console.log(`  - Entity Name (EN): ${entity.name_en || 'NULL ❌'}`);
    console.log(`  - Legal Form: ${entity.legalForm || 'N/A'}`);
    
    if (entity.type === 'company' && isActive) {
      const shareStr = rel?.metadata?.share || rel?.metadata?.percentage || null;
      const shareNum = typeof shareStr === 'string' ? parseFloat(String(shareStr).replace('%','')) : (typeof shareStr === 'number' ? shareStr : NaN);
      const isSole = rtype === 'SoleCapitalOwner' || (!isNaN(shareNum) && Math.round(shareNum) === 100);
      const isET = rtype === 'PhysicalPersonTrader';
      
      console.log(`  - Share: ${shareStr || 'N/A'} (${shareNum})`);
      console.log(`  - Is Sole Owner: ${isSole}`);
      console.log(`  - Is ET: ${isET}`);
      console.log(`  - Qualifies: ${isSole || isET ? '✅ YES' : '❌ NO'}`);
      
      if (isSole || isET) {
        // Get full company details
        const uic = entity.id;
        const details = await getCompanyDetails(uic);
        const comp = details?.company || details;
        
        if (comp) {
          const status = String(comp.status || '').toUpperCase();
          const legalForm = String(comp.legalForm || '').toLowerCase();
          // EOOD can be: "ЕООД", "еоод", "EOOD", or full "Еднолично дружество с ограничена отговорност"
          const isEOOD = legalForm.includes('еоод') || 
                         legalForm.includes('eood') || 
                         legalForm.includes('еднолично дружество');
          // ET can be: "ЕТ", "ET", or full "Едноличен търговец"
          const isETForm = legalForm.includes('едноличен търговец') || 
                           (legalForm.includes('ет') && !legalForm.includes('дружество')) ||
                           (legalForm.includes('et') && !legalForm.includes('limited'));
          const englishFromDetails = comp.companyNameTransliteration?.name || null;
          
          console.log(`\n  📄 Company Details:`);
          console.log(`     - Status: ${status} (Active: ${status === 'N' || status === 'E' ? '✅' : '❌'})`);
          console.log(`     - Legal Form: ${comp.legalForm}`);
          console.log(`     - Is EOOD: ${isEOOD}`);
          console.log(`     - Is ET: ${isETForm}`);
          console.log(`     - English from relationships: ${entity.name_en || 'NULL ❌'}`);
          console.log(`     - English from transliteration: ${englishFromDetails || 'NULL ❌'}`);
          console.log(`     - Final English: ${entity.name_en || englishFromDetails || 'NULL ❌'}`);
          
          const passesFilters = (status === 'N' || status === 'E') && 
                               (entity.name_en || englishFromDetails) && 
                               (isEOOD || isETForm);
          console.log(`\n     🎯 PASSES ALL FILTERS: ${passesFilters ? '✅ YES' : '❌ NO'}`);
        }
      }
    }
  }
}

main().catch(console.error);
