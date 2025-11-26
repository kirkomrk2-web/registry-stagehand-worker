// formatVerifiedProfiles.mjs
// Format verified business profiles in the requested structure

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Parse address into components (best effort)
 */
function parseAddress(address) {
  if (!address) return { street: null, city: null, region: null, postal_code: null };
  
  // Address format from CompanyBook: "България, Region, District, Municipality, Settlement, Address, PostCode"
  const parts = address.split(',').map(p => p.trim());
  
  return {
    street: parts[parts.length - 2] || null,  // Usually the address is second to last
    city: parts[parts.length - 3] || null,    // Settlement/City
    region: parts[1] || null,                  // Region
    postal_code: parts[parts.length - 1] || null // Postal code (if numeric)
  };
}

/**
 * Parse owner name into first/last
 */
function parseOwnerName(fullName) {
  if (!fullName) return { first_name: null, last_name: null };
  
  const parts = fullName.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return { first_name: null, last_name: null };
  
  // Bulgarian names typically: FirstName MiddleName LastName
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  
  return { first_name: firstName, last_name: lastName };
}

/**
 * Format a single verified profile in the requested structure
 */
function formatProfile(profile) {
  const addr = parseAddress(profile.address);
  const owner = parseOwnerName(profile.current_owner_name);
  
  return {
    // Business Info
    Name: profile.business_name_en || profile.business_name_bg,
    Phone: "N/A", // Not available from CompanyBook
    Email: "N/A", // Not available from CompanyBook
    Date_of_incorporation: profile.incorporation_date || "N/A",
    UIC: profile.eik,
    VAT: profile.eik ? `BG${profile.eik}` : "N/A",
    Business_activity: "N/A", // Not available from CompanyBook
    
    // Address
    Street: addr.street || "N/A",
    City: addr.city || "N/A",
    Region: addr.region || "N/A",
    Postal_code: addr.postal_code || "N/A",
    Full_address: profile.address || "N/A",
    
    // Owner Info
    Owner_first_name: owner.first_name || "N/A",
    Owner_last_name: owner.last_name || "N/A",
    Owner_full_name: profile.current_owner_name || "N/A",
    Owner_birthdate: "N/A", // Not available from CompanyBook
    
    // Contact (duplicates for compatibility)
    Contact_email: "N/A", // Not available from CompanyBook
    Contact_phone: "N/A", // Not available from CompanyBook
    Phone_provider: "N/A", // Not available from CompanyBook
    Phone_expiry: "N/A", // Not available from CompanyBook
    
    // Additional Data Available
    Entity_type: profile.entity_type,
    Legal_form_bg: profile.legal_form_bg,
    Business_structure_en: profile.business_structure_en,
    Is_active: profile.is_active,
    Data_quality_score: profile.data_quality_score,
    
    // Links
    Registry_link: `https://portal.registryagency.bg/CR/Reports/ActiveConditionTabResult?uic=${profile.eik}`,
    
    // Metadata
    Verified_at: profile.verified_at,
    Last_checked_at: profile.last_checked_at,
    Source: profile.source
  };
}

/**
 * Get all verified profiles and format them
 */
async function getAllFormattedProfiles({ entityType = null, limit = null, orderBy = 'verified_at' } = {}) {
  console.log("[INFO] Fetching verified business profiles...\n");
  
  let query = supabase
    .from("verified_business_profiles")
    .select("*");
  
  if (entityType) {
    query = query.eq("entity_type", entityType.toUpperCase());
  }
  
  // Order by specified field (default: most recently verified)
  if (orderBy === 'date_of_incorporation') {
    query = query.order("incorporation_date", { ascending: false, nullsFirst: false });
  } else if (orderBy === 'name') {
    query = query.order("business_name_en", { ascending: true });
  } else if (orderBy === 'quality') {
    query = query.order("data_quality_score", { ascending: false });
  } else {
    query = query.order("verified_at", { ascending: false });
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("[ERROR]", error);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log("[INFO] No verified profiles found");
    return [];
  }
  
  return data.map(formatProfile);
}

/**
 * Print formatted profiles
 */
function printFormattedProfiles(profiles) {
  if (profiles.length === 0) {
    console.log("No profiles to display");
    return;
  }
  
  console.log(`\n========== Found ${profiles.length} Verified Profile(s) ==========\n`);
  
  profiles.forEach((profile, index) => {
    console.log(`[${index + 1}/${profiles.length}] ========================================`);
    console.log(`Name: ${profile.Name}`);
    console.log(`Phone: ${profile.Phone}`);
    console.log(`Email: ${profile.Email}`);
    console.log(``);
    console.log(`Date_of_incorporation: ${profile.Date_of_incorporation}`);
    console.log(`UIC: ${profile.UIC}`);
    console.log(`VAT: ${profile.VAT}`);
    console.log(`Business_activity: ${profile.Business_activity}`);
    console.log(``);
    console.log(`Street: ${profile.Street}`);
    console.log(`City: ${profile.City}`);
    console.log(`Region: ${profile.Region}`);
    console.log(`Postal_code: ${profile.Postal_code}`);
    console.log(``);
    console.log(`Owner_first_name: ${profile.Owner_first_name}`);
    console.log(`Owner_last_name: ${profile.Owner_last_name}`);
    console.log(`Owner_birthdate: ${profile.Owner_birthdate}`);
    console.log(``);
    console.log(`Contact_email: ${profile.Contact_email}`);
    console.log(`Contact_phone: ${profile.Contact_phone}`);
    console.log(`Phone_provider: ${profile.Phone_provider}`);
    console.log(`Phone_expiry: ${profile.Phone_expiry}`);
    console.log(``);
    console.log(`Registry_link: ${profile.Registry_link}`);
    console.log(``);
    console.log(`--- Additional Info (from CompanyBook) ---`);
    console.log(`Entity_type: ${profile.Entity_type}`);
    console.log(`Legal_form_bg: ${profile.Legal_form_bg}`);
    console.log(`Business_structure_en: ${profile.Business_structure_en}`);
    console.log(`Data_quality_score: ${profile.Data_quality_score}/100`);
    console.log(`Is_active: ${profile.Is_active}`);
    console.log(`Source: ${profile.Source}`);
    console.log(``);
  });
  
  console.log(`\n========== Total: ${profiles.length} profiles ==========\n`);
}

/**
 * Export as JSON
 */
function exportAsJSON(profiles) {
  return JSON.stringify(profiles, null, 2);
}

/**
 * Export as CSV (simplified)
 */
function exportAsCSV(profiles) {
  if (profiles.length === 0) return "";
  
  // CSV headers
  const headers = [
    "Name", "Phone", "Email", "Date_of_incorporation", "UIC", "VAT", "Business_activity",
    "Street", "City", "Region", "Postal_code", "Owner_first_name", "Owner_last_name",
    "Owner_birthdate", "Contact_email", "Contact_phone", "Phone_provider", "Phone_expiry",
    "Registry_link", "Entity_type", "Data_quality_score"
  ];
  
  const csvRows = [headers.join(",")];
  
  profiles.forEach(profile => {
    const row = headers.map(header => {
      const value = profile[header] || "";
      // Escape commas and quotes
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(row.join(","));
  });
  
  return csvRows.join("\n");
}

// ========== CLI Interface ==========

const args = process.argv.slice(2);
const command = args[0];

function printUsage() {
  console.log("\nFormat Verified Profiles - CLI Usage:");
  console.log("");
  console.log("Commands:");
  console.log("  --all [--json|--csv]           Show all profiles");
  console.log("  --eood [--json|--csv]          Show only EOOD profiles");
  console.log("  --et [--json|--csv]            Show only ET profiles");
  console.log("  --limit N [--json|--csv]       Show N profiles");
  console.log("  --order-by [field]             Order by: verified_at|date_of_incorporation|name|quality");
  console.log("");
  console.log("Examples:");
  console.log("  node src/formatVerifiedProfiles.mjs --all");
  console.log("  node src/formatVerifiedProfiles.mjs --eood --json");
  console.log("  node src/formatVerifiedProfiles.mjs --limit 5");
  console.log("  node src/formatVerifiedProfiles.mjs --all --order-by date_of_incorporation");
  console.log("  node src/formatVerifiedProfiles.mjs --all --csv > profiles.csv");
  console.log("");
  console.log("Note: Fields marked as 'N/A' are not available from CompanyBook API");
  console.log("");
}

if (!command || command === "--help" || command === "-h") {
  printUsage();
  process.exit(0);
}

// Execute command
(async () => {
  try {
    const options = {
      entityType: null,
      limit: null,
      orderBy: 'verified_at',
      format: 'text'
    };
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--eood") options.entityType = 'EOOD';
      if (args[i] === "--et") options.entityType = 'ET';
      if (args[i] === "--limit" && args[i + 1]) options.limit = parseInt(args[i + 1]);
      if (args[i] === "--order-by" && args[i + 1]) options.orderBy = args[i + 1];
      if (args[i] === "--json") options.format = 'json';
      if (args[i] === "--csv") options.format = 'csv';
    }
    
    const profiles = await getAllFormattedProfiles(options);
    
    if (options.format === 'json') {
      console.log(exportAsJSON(profiles));
    } else if (options.format === 'csv') {
      console.log(exportAsCSV(profiles));
    } else {
      printFormattedProfiles(profiles);
    }
    
    process.exit(0);
  } catch (e) {
    console.error("[FATAL]", e);
    process.exit(1);
  }
})();
