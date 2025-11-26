// debug_extraction.mjs - Debug why verified businesses aren't being extracted
import "dotenv/config";
import { findSoleOwnerCompaniesByName, extractVerifiedBusinesses } from "./companybook.mjs";

const testNames = [
  "Асен Митков Асенов",
  "Даниел Миленов Мартинов"
];

console.log("=".repeat(80));
console.log("DEBUGGING VERIFIED BUSINESS EXTRACTION");
console.log("=".repeat(80));

for (const name of testNames) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Testing: ${name}`);
  console.log("=".repeat(80));
  
  try {
    const companies = await findSoleOwnerCompaniesByName(name, { limit: 20 });
    console.log(`\nTotal companies found: ${companies.length}`);
    
    if (companies.length > 0) {
      console.log("\n--- ALL COMPANIES ---");
      companies.forEach((c, i) => {
        console.log(`\n[${i + 1}] EIK: ${c.eik}`);
        console.log(`    Name (BG): ${c.companyName}`);
        console.log(`    Name (EN): ${c.englishName}`);
        console.log(`    Legal Form: ${c.legalForm}`);
        console.log(`    Business Structure: ${c.businessStructureEn}`);
        console.log(`    Address: ${c.address || "N/A"}`);
        console.log(`    Inc. Date: ${c.incorporationDate || "N/A"}`);
        console.log(`    Source: ${c.source}`);
      });
      
      console.log("\n--- EXTRACTION FILTER RESULTS ---");
      const verified = extractVerifiedBusinesses(companies);
      console.log(`Verified businesses (passed filter): ${verified.length}`);
      
      if (verified.length > 0) {
        verified.forEach((v, i) => {
          console.log(`\n✓ [${i + 1}] ${v.companyName} (${v.eik})`);
        });
      } else {
        console.log("\n❌ NO VERIFIED BUSINESSES PASSED THE FILTER");
        console.log("\nLet's analyze why each company failed:");
        companies.forEach((c, i) => {
          console.log(`\n[${i + 1}] ${c.companyName}`);
          
          const hasValidEN = c.englishName && 
                            c.englishName !== "none" && 
                            c.englishName !== "null" && 
                            c.englishName !== "undefined" &&
                            c.englishName.trim() !== "";
          console.log(`    - Has valid English name: ${hasValidEN ? "✓" : "✗"} (value: "${c.englishName}")`);
          
          const isEOOD = (c.legalForm || "").toLowerCase().includes("еоод") || 
                         (c.legalForm || "").toLowerCase().includes("eood");
          const isET = (c.legalForm || "").toLowerCase().includes("ет ") || 
                       (c.legalForm || "").toLowerCase() === "ет";
          console.log(`    - Is EOOD or ET: ${isEOOD || isET ? "✓" : "✗"} (EOOD: ${isEOOD}, ET: ${isET})`);
          
          const hasNumericEIK = c.eik && /^\d{8,13}$/.test(c.eik);
          console.log(`    - Has numeric EIK: ${hasNumericEIK ? "✓" : "✗"} (value: "${c.eik}")`);
          
          const hasName = c.companyName && c.companyName.trim() !== "";
          console.log(`    - Has company name: ${hasName ? "✓" : "✗"}`);
          
          if (hasValidEN && (isEOOD || isET) && hasNumericEIK && hasName) {
            console.log(`    => SHOULD PASS BUT DIDN'T! Check filter logic.`);
          } else {
            console.log(`    => Failed verification filter`);
          }
        });
      }
    }
  } catch (error) {
    console.error(`\n❌ Error processing ${name}:`, error.message);
  }
}

console.log("\n" + "=".repeat(80));
console.log("DEBUG COMPLETE");
console.log("=".repeat(80));
