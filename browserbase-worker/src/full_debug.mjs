// full_debug.mjs - Comprehensive debug output for CompanyBook data extraction
// Shows all fields including missing ones with detailed explanations

import { findSoleOwnerCompaniesByName, extractVerifiedBusinesses } from "./companybook.mjs";

const testName = process.argv[2];

if (!testName) {
  console.error("Usage: node src/full_debug.mjs 'Full Name'");
  console.error("Example: node src/full_debug.mjs 'Асен Митков Асенов'");
  process.exit(1);
}

console.log("\n" + "=".repeat(80));
console.log("🔍 FULL DEBUG MODE - Complete Data Extraction Analysis");
console.log("=".repeat(80));
console.log(`\nSearching for: "${testName}"\n`);

try {
  // Fetch all companies
  const companies = await findSoleOwnerCompaniesByName(testName, { limit: 20 });
  
  console.log(`📊 SUMMARY: Found ${companies.length} total companies\n`);
  
  if (companies.length === 0) {
    console.log("❌ No companies found. Possible reasons:");
    console.log("   - Name not found in CompanyBook");
    console.log("   - No sole ownership positions");
    console.log("   - API connection issues");
    process.exit(0);
  }

  // Show each company with full details
  companies.forEach((c, idx) => {
    console.log("─".repeat(80));
    console.log(`\n📋 COMPANY ${idx + 1}/${companies.length}`);
    console.log("─".repeat(80));
    
    // Basic identifiers
    console.log("\n🆔 IDENTIFIERS:");
    console.log(`   EIK: ${c.eik || "❌ MISSING"}`);
    console.log(`   Source: ${c.source || "❌ MISSING"}`);
    
    // Names
    console.log("\n📝 NAMES:");
    console.log(`   Bulgarian Name: ${c.companyName || "❌ MISSING"}`);
    console.log(`   English Name: ${c.englishName || "❌ MISSING (REQUIRED FOR VERIFICATION)"}`);
    
    if (c.englishName) {
      const normalized = String(c.englishName).trim().toLowerCase();
      const isValid = normalized !== "" && 
                     normalized !== "none" && 
                     normalized !== "null" && 
                     normalized !== "n/a" && 
                     normalized !== "undefined";
      
      if (isValid) {
        console.log(`   ✅ English name is VALID for verification`);
      } else {
        console.log(`   ❌ English name is INVALID: "${c.englishName}"`);
        console.log(`      Rejected values: "none", "null", "n/a", "undefined", empty string`);
      }
    } else {
      console.log(`   ❌ NO English name provided by CompanyBook API`);
      console.log(`      This company will NOT be added to verified_business_profiles`);
    }
    
    // Legal structure
    console.log("\n🏢 LEGAL STRUCTURE:");
    console.log(`   Legal Form (BG): ${c.legalForm || "❌ MISSING"}`);
    console.log(`   Business Structure (EN): ${c.businessStructureEn || "❌ MISSING"}`);
    
    if (c.legalForm) {
      const lf = String(c.legalForm).toLowerCase();
      const isEOOD = lf.includes("еоод") || lf.includes("eood");
      const isET = lf.includes("ет ") || lf === "ет" || lf.includes("едноличен търговец");
      
      if (isEOOD) {
        console.log(`   ✅ Type: EOOD (Single-Member LLC) - ACCEPTED`);
      } else if (isET) {
        console.log(`   ✅ Type: ET (Sole Trader) - ACCEPTED`);
      } else {
        console.log(`   ❌ Type: Other (${c.legalForm}) - REJECTED`);
        console.log(`      Only EOOD and ET are accepted for verified profiles`);
      }
    }
    
    // Location information
    console.log("\n📍 LOCATION:");
    if (c.address) {
      console.log(`   Address: ${c.address}`);
      console.log(`   ✅ Address available`);
    } else {
      console.log(`   Address: ❌ MISSING`);
      console.log(`   Reason: CompanyBook API did not return seat/address data`);
      console.log(`   Impact: Lower data quality score, but still accepted if other criteria met`);
    }
    
    // Dates
    console.log("\n📅 DATES:");
    if (c.incorporationDate) {
      console.log(`   Incorporation Date: ${c.incorporationDate}`);
      console.log(`   ✅ Incorporation date available`);
    } else {
      console.log(`   Incorporation Date: ❌ MISSING`);
      console.log(`   Reason: CompanyBook API did not return registerDate`);
      console.log(`   Impact: Lower data quality score, but still accepted`);
    }
    
    // Verification status
    console.log("\n✅ VERIFICATION STATUS:");
    const checks = {
      "Has English name": c.englishName && 
                         String(c.englishName).trim().toLowerCase() !== "" && 
                         !["none", "null", "n/a", "undefined"].includes(String(c.englishName).trim().toLowerCase()),
      "Is EOOD or ET": c.legalForm && 
                       (String(c.legalForm).toLowerCase().includes("еоод") || 
                        String(c.legalForm).toLowerCase().includes("eood") ||
                        String(c.legalForm).toLowerCase().includes("ет ") ||
                        String(c.legalForm).toLowerCase() === "ет"),
      "Has numeric EIK": c.eik && /^\d{8,13}$/.test(c.eik),
      "Has company name": c.companyName && c.companyName.trim() !== ""
    };
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? "✅" : "❌"} ${check}`);
    });
    
    const allPass = Object.values(checks).every(v => v);
    
    if (allPass) {
      console.log(`\n   🎉 RESULT: This company WILL BE added to verified_business_profiles`);
    } else {
      console.log(`\n   ❌ RESULT: This company will NOT be added (failed verification)`);
    }
    
    // Data quality score simulation
    console.log("\n📊 DATA QUALITY SCORE:");
    let score = 0;
    const fields = {
      eik: 20,
      companyName: 20,
      englishName: 20,
      legalForm: 10,
      address: 10,
      incorporationDate: 10,
      businessStructureEn: 10
    };
    
    Object.entries(fields).forEach(([field, weight]) => {
      const value = c[field];
      const hasValue = value && String(value).trim() !== "" && value !== "none" && value !== null;
      if (hasValue) {
        score += weight;
        console.log(`   ✅ ${field.padEnd(20)} +${weight} points (value: ${String(value).substring(0, 40)})`);
      } else {
        console.log(`   ❌ ${field.padEnd(20)} +0 points (MISSING)`);
      }
    });
    
    console.log(`\n   Total Score: ${score}/100`);
    if (score >= 80) {
      console.log(`   Quality: HIGH ⭐⭐⭐`);
    } else if (score >= 50) {
      console.log(`   Quality: MEDIUM ⭐⭐`);
    } else {
      console.log(`   Quality: LOW ⭐`);
    }
    
    console.log("\n");
  });

  // Overall verification summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(80) + "\n");
  
  const verified = extractVerifiedBusinesses(companies);
  
  console.log(`Total companies found: ${companies.length}`);
  console.log(`Verified (with English names): ${verified.length}`);
  console.log(`Rejected: ${companies.length - verified.length}\n`);
  
  if (verified.length > 0) {
    console.log("✅ Companies that WILL BE saved to verified_business_profiles:");
    verified.forEach((v, idx) => {
      console.log(`   ${idx + 1}. ${v.englishName} (${v.eik})`);
    });
  } else {
    console.log("❌ NO companies will be saved to verified_business_profiles");
    console.log("\nCommon reasons:");
    console.log("   • No English name registered (most common)");
    console.log("   • Not EOOD or ET legal form");
    console.log("   • Invalid EIK format");
    console.log("   • Missing company name");
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("🔍 END OF DEBUG REPORT");
  console.log("=".repeat(80) + "\n");

} catch (error) {
  console.error("\n❌ ERROR:", error.message);
  console.error("\nStack trace:");
  console.error(error.stack);
  process.exit(1);
}
