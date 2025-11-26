// verifiedProfilesWorker.mjs
// Worker to populate and maintain verified_business_profiles table
// Only includes EOOD and ET with English names, currently active

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
  findSoleOwnerCompaniesByName,
  extractVerifiedBusinesses,
  calculateDataQualityScore,
  isET,
  mapBusinessStructureEn
} from "./companybook.mjs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[ERROR] Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Process a single user and extract verified profiles
 */
async function processUserForVerifiedProfiles(user) {
  const fullName = user.full_name.trim();
  console.log(`\n[INFO] Processing "${fullName}" for verified profiles...`);
  
  try {
    // Get all companies (EOOD + ET with English names)
    const allCompanies = await findSoleOwnerCompaniesByName(fullName, { limit: 20 });
    console.log(`[INFO] Found ${allCompanies.length} total companies`);
    
    // Filter to verified only (has English name, EOOD or ET, active)
    const verified = extractVerifiedBusinesses(allCompanies);
    console.log(`[INFO] ${verified.length} passed verification (have English names, EOOD/ET, active)`);
    
    if (verified.length === 0) {
      console.log(`[SKIP] No verified businesses for ${fullName}`);
      return 0;
    }
    
    // Insert/update each verified business
    let successCount = 0;
    for (const biz of verified) {
      const inserted = await upsertVerifiedProfile({
        eik: biz.eik,
        business_name_bg: biz.companyName,
        business_name_en: biz.englishName,
        legal_form_bg: biz.legalForm,
        business_structure_en: biz.businessStructureEn || mapBusinessStructureEn(biz.legalForm),
        entity_type: isET(biz.legalForm) ? 'ET' : 'EOOD',
        address: biz.address,
        incorporation_date: biz.incorporationDate,
        is_active: true, // we already filtered for active
        current_owner_name: fullName,
        current_owner_ident: user.ident || null,
        source: biz.source || 'companybook',
        data_quality_score: calculateDataQualityScore(biz),
        companies_jsonb: biz
      });
      if (inserted) successCount++;
    }
    
    console.log(`[DONE] Successfully added/updated ${successCount}/${verified.length} verified profiles for ${fullName}`);
    return successCount;
  } catch (e) {
    console.error(`[ERROR] Failed to process ${fullName}:`, e.message);
    return 0;
  }
}

/**
 * Upsert a verified profile (insert or update if EIK exists)
 */
async function upsertVerifiedProfile(profile) {
  try {
    const { error } = await supabase
      .from("verified_business_profiles")
      .upsert(
        {
          ...profile,
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: "eik" }
      );
    
    if (error) {
      console.error(`[ERROR] Failed to upsert profile EIK=${profile.eik}:`, error.message);
      return false;
    } else {
      console.log(`  ✓ ${profile.business_name_en} (${profile.eik}) [${profile.entity_type}] [Q:${profile.data_quality_score}]`);
      return true;
    }
  } catch (e) {
    console.error(`[ERROR] Exception upserting EIK=${profile.eik}:`, e.message);
    return false;
  }
}

/**
 * Batch process all checked users from user_registry_checks
 */
async function processAllCheckedUsers() {
  console.log("[INFO] ========================================");
  console.log("[INFO] Fetching all checked users from user_registry_checks...");
  console.log("[INFO] ========================================\n");
  
  const { data: checks, error } = await supabase
    .from("user_registry_checks")
    .select("full_name, email, match_count, created_at")
    .gt("match_count", 0)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("[ERROR] Failed to fetch user_registry_checks:", error);
    return;
  }
  
  if (!checks || checks.length === 0) {
    console.log("[INFO] No checked users found");
    return;
  }
  
  console.log(`[INFO] Processing ${checks.length} user check(s)...\n`);
  let totalVerified = 0;
  let processedUsers = 0;
  
  for (const check of checks) {
    processedUsers++;
    const count = await processUserForVerifiedProfiles({
      full_name: check.full_name,
      email: check.email
    });
    totalVerified += count;
    
    // Small delay to avoid rate limiting
    if (processedUsers < checks.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log("\n[INFO] ========================================");
  console.log(`[DONE] Processed ${processedUsers} users`);
  console.log(`[DONE] Total verified profiles added/updated: ${totalVerified}`);
  console.log("[INFO] ========================================");
}

/**
 * Query and display current verified profiles
 */
async function showVerifiedProfiles({ limit = 10, entityType = null } = {}) {
  console.log("[INFO] Querying verified_business_profiles...\n");
  
  let query = supabase
    .from("verified_business_profiles")
    .select("*")
    .order("verified_at", { ascending: false });
  
  if (entityType) {
    query = query.eq("entity_type", entityType.toUpperCase());
  }
  
  query = query.limit(limit);
  
  const { data, error } = await query;
  
  if (error) {
    console.error("[ERROR]", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("[INFO] No verified profiles found");
    return;
  }
  
  console.log(`Found ${data.length} verified profile(s):\n`);
  data.forEach((p, i) => {
    console.log(`${i + 1}. ${p.business_name_en}`);
    console.log(`   BG: ${p.business_name_bg}`);
    console.log(`   EIK: ${p.eik} | Type: ${p.entity_type} | Quality: ${p.data_quality_score}/100`);
    console.log(`   Owner: ${p.current_owner_name || 'N/A'}`);
    console.log(`   Verified: ${new Date(p.verified_at).toLocaleString()}`);
    console.log("");
  });
}

/**
 * Get statistics
 */
async function showStats() {
  console.log("[INFO] Verified Business Profiles Statistics\n");
  
  // Total count
  const { count: total } = await supabase
    .from("verified_business_profiles")
    .select("*", { count: "exact", head: true });
  
  // By entity type
  const { data: byType } = await supabase
    .from("verified_business_profiles")
    .select("entity_type")
    .order("entity_type");
  
  const eoodCount = byType?.filter(r => r.entity_type === 'EOOD').length || 0;
  const etCount = byType?.filter(r => r.entity_type === 'ET').length || 0;
  
  // Quality distribution
  const { data: byQuality } = await supabase
    .from("verified_business_profiles")
    .select("data_quality_score");
  
  const highQuality = byQuality?.filter(r => r.data_quality_score >= 80).length || 0;
  const mediumQuality = byQuality?.filter(r => r.data_quality_score >= 50 && r.data_quality_score < 80).length || 0;
  const lowQuality = byQuality?.filter(r => r.data_quality_score < 50).length || 0;
  
  console.log(`Total Verified Profiles: ${total || 0}`);
  console.log(`\nBy Entity Type:`);
  console.log(`  - EOOD: ${eoodCount}`);
  console.log(`  - ET:   ${etCount}`);
  console.log(`\nBy Data Quality:`);
  console.log(`  - High (80-100):   ${highQuality}`);
  console.log(`  - Medium (50-79):  ${mediumQuality}`);
  console.log(`  - Low (0-49):      ${lowQuality}`);
}

// ========== CLI Interface ==========

const args = process.argv.slice(2);
const command = args[0];

function printUsage() {
  console.log("\nVerified Profiles Worker - CLI Usage:");
  console.log("");
  console.log("Commands:");
  console.log("  --all                          Process all users from user_registry_checks");
  console.log("  --name 'Full Name'             Process a specific user by name");
  console.log("  --list [limit]                 List verified profiles (default: 10)");
  console.log("  --list-eood [limit]            List only EOOD profiles");
  console.log("  --list-et [limit]              List only ET profiles");
  console.log("  --stats                        Show statistics");
  console.log("  --help                         Show this help message");
  console.log("");
  console.log("Examples:");
  console.log("  node src/verifiedProfilesWorker.mjs --all");
  console.log("  node src/verifiedProfilesWorker.mjs --name 'Асен Митков Асенов'");
  console.log("  node src/verifiedProfilesWorker.mjs --list 20");
  console.log("  node src/verifiedProfilesWorker.mjs --list-et");
  console.log("  node src/verifiedProfilesWorker.mjs --stats");
  console.log("");
}

if (!command || command === "--help" || command === "-h") {
  printUsage();
  process.exit(0);
}

// Execute command
(async () => {
  try {
    if (command === "--all") {
      await processAllCheckedUsers();
    } else if (command === "--name") {
      const name = args[1];
      if (!name) {
        console.error("[ERROR] Missing name argument");
        printUsage();
        process.exit(1);
      }
      await processUserForVerifiedProfiles({ full_name: name });
    } else if (command === "--list") {
      const limit = parseInt(args[1]) || 10;
      await showVerifiedProfiles({ limit });
    } else if (command === "--list-eood") {
      const limit = parseInt(args[1]) || 10;
      await showVerifiedProfiles({ limit, entityType: 'EOOD' });
    } else if (command === "--list-et") {
      const limit = parseInt(args[1]) || 10;
      await showVerifiedProfiles({ limit, entityType: 'ET' });
    } else if (command === "--stats") {
      await showStats();
    } else {
      console.error(`[ERROR] Unknown command: ${command}`);
      printUsage();
      process.exit(1);
    }
    
    process.exit(0);
  } catch (e) {
    console.error("[FATAL]", e);
    process.exit(1);
  }
})();
