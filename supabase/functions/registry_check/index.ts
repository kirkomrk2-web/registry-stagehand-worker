import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// CompanyBook API base URL
const COMPANYBOOK_API_BASE = "https://api.companybook.bg/api";

/**
 * Search for person in CompanyBook API
 */
async function searchPersonInCompanyBook(fullName: string) {
  const searchUrl = `${COMPANYBOOK_API_BASE}/people/search?name=${encodeURIComponent(fullName)}`;
  
  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      console.error(`CompanyBook search failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("CompanyBook search error:", error);
    return null;
  }
}

/**
 * Get person details with ownership data
 */
async function getPersonDetails(identifier: string) {
  const detailsUrl = `${COMPANYBOOK_API_BASE}/people/${identifier}?with_data=true`;
  
  try {
    const response = await fetch(detailsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      console.error(`CompanyBook details failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("CompanyBook details error:", error);
    return null;
  }
}

/**
 * Get ownership relationships for person
 */
async function getOwnershipData(identifier: string) {
  const ownershipUrl = `${COMPANYBOOK_API_BASE}/relationships/${identifier}?type=ownership&depth=2`;
  
  try {
    const response = await fetch(ownershipUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      console.error(`CompanyBook ownership failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("CompanyBook ownership error:", error);
    return null;
  }
}

/**
 * Get company details with English transliteration
 */
async function getCompanyDetails(uic: string) {
  const companyUrl = `${COMPANYBOOK_API_BASE}/companies/${uic}?with_data=true`;
  
  try {
    const response = await fetch(companyUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      console.error(`CompanyBook company details failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("CompanyBook company details error:", error);
    return null;
  }
}

/**
 * Extract verified businesses (EOOD/ET with English names)
 */
function extractVerifiedBusinesses(ownershipData: any, personId: string) {
  const companies: any[] = [];
  
  if (!ownershipData || !ownershipData.relationships) {
    return companies;
  }

  for (const rel of ownershipData.relationships) {
    // Check if person is sole owner (100% ownership)
    if (rel.from === personId && rel.percentage === 100) {
      const company = rel.company;
      
      if (!company) continue;

      // Filter for EOOD or ET entities
      const legalForm = company.legalForm?.toLowerCase() || '';
      if (!legalForm.includes('еоод') && !legalForm.includes('ет')) {
        continue;
      }

      // Extract English name
      let englishName = null;
      if (company.companyNameTransliteration?.name) {
        englishName = company.companyNameTransliteration.name;
      }

      // Only include if English name exists
      if (!englishName) continue;

      companies.push({
        eik: company.uic || company.eik,
        business_name_bg: company.name,
        business_name_en: englishName,
        legal_form: company.legalForm,
        entity_type: legalForm.includes('еоод') ? 'EOOD' : 'ET',
        incorporation_date: company.registrationDate || null,
        address: company.seat ? formatAddress(company.seat) : null
      });
    }
  }

  return companies;
}

/**
 * Format address from CompanyBook seat object
 */
function formatAddress(seat: any): string {
  const parts = [];
  
  if (seat.country) parts.push(seat.country);
  if (seat.region) parts.push(seat.region);
  if (seat.district) parts.push(seat.district);
  if (seat.municipality) parts.push(seat.municipality);
  if (seat.settlement) parts.push(seat.settlement);
  if (seat.postCode) parts.push(seat.postCode);
  
  return parts.join(', ');
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const { full_name, email } = await req.json();
    
    if (!full_name || !email) {
      return new Response("Missing full_name or email", {
        status: 400,
        headers: corsHeaders
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, serviceRoleKey!);

    // 1) Search for person in CompanyBook
    console.log(`Searching for person: ${full_name}`);
    const searchResults = await searchPersonInCompanyBook(full_name);
    
    if (!searchResults || !searchResults.people || searchResults.people.length === 0) {
      console.log("No person found in CompanyBook");
      
      // Record no match
      await supabase.from("user_registry_checks").insert({
        email,
        full_name,
        match_count: 0,
        any_match: false,
        companies: []
      });

      await supabase.from("users_pending").update({
        status: "no_match",
        updated_at: new Date().toISOString()
      }).eq("email", email);

      return new Response(JSON.stringify({
        status: "ok",
        full_name,
        email,
        match_count: 0,
        any_match: false,
        companies: [],
        user_status: "no_match"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get the first person match
    const person = searchResults.people[0];
    const personIdentifier = person.identifier || person.id;

    console.log(`Found person: ${person.name} (${personIdentifier})`);

    // 2) Get ownership data
    const ownershipData = await getOwnershipData(personIdentifier);
    
    // 3) Extract verified businesses (EOOD/ET with English names)
    const verifiedCompanies = extractVerifiedBusinesses(ownershipData, personIdentifier);
    
    console.log(`Found ${verifiedCompanies.length} verified companies`);

    // 4) Get detailed company information for each
    const enrichedCompanies = [];
    for (const company of verifiedCompanies) {
      const companyDetails = await getCompanyDetails(company.eik);
      if (companyDetails) {
        enrichedCompanies.push({
          ...company,
          details: companyDetails
        });
      } else {
        enrichedCompanies.push(company);
      }
    }

    // 5) Record results in database
    const matchCount = verifiedCompanies.length;
    const anyMatch = matchCount > 0;

    await supabase.from("user_registry_checks").insert({
      email,
      full_name,
      match_count: matchCount,
      any_match: anyMatch,
      companies: enrichedCompanies
    });

    // 6) Update user status
    const newStatus = anyMatch ? "ready_for_stagehand" : "no_match";
    await supabase.from("users_pending").update({
      status: newStatus,
      updated_at: new Date().toISOString()
    }).eq("email", email);

    // 7) Return response
    return new Response(JSON.stringify({
      status: "ok",
      full_name,
      email,
      match_count: matchCount,
      any_match: anyMatch,
      companies: enrichedCompanies,
      user_status: newStatus,
      person_details: {
        identifier: personIdentifier,
        name: person.name
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("registry_check error:", err);
    return new Response(JSON.stringify({
      error: err?.message ?? "Unknown error"
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
