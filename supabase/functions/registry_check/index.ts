// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Deno exists at runtime; declare for local TS tooling
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// CompanyBook API base URL - use deployed Edge Function proxy
const getCompanyBookBase = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  return `${supabaseUrl}/functions/v1/companybook_proxy`;
};

async function searchPersonInCompanyBook(fullName: string) {
  const COMPANYBOOK_API_BASE = getCompanyBookBase();
  const searchUrl = `${COMPANYBOOK_API_BASE}/people/search?name=${encodeURIComponent(fullName)}`;
  try {
    const response = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  }
}

async function getPersonDetails(identifier: string) {
  const COMPANYBOOK_API_BASE = getCompanyBookBase();
  const detailsUrl = `${COMPANYBOOK_API_BASE}/people/${identifier}?with_data=true`;
  try {
    const response = await fetch(detailsUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  }
}

async function getOwnershipData(identifier: string) {
  const COMPANYBOOK_API_BASE = getCompanyBookBase();
  const ownershipUrl = `${COMPANYBOOK_API_BASE}/relationships/${identifier}?type=ownership&depth=2&include_historical=false`;
  try {
    const response = await fetch(ownershipUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  }
}

async function getCompanyDetails(uic: string) {
  const COMPANYBOOK_API_BASE = getCompanyBookBase();
  const companyUrl = `${COMPANYBOOK_API_BASE}/companies/${uic}?with_data=true`;
  try {
    const response = await fetch(companyUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  }
}

function extractVerifiedBusinesses(ownershipData: any, personId: string) {
  const companies: any[] = [];
  if (!ownershipData || !ownershipData.relationships) return companies;

  for (const rel of ownershipData.relationships) {
    const entity = rel.entity || {};
    const rtype = rel.relationshipType || rel.type || '';
    const isActive = rel.isActive !== false; // default true
    if (!isActive) continue;

    // We only care about company entities connected to this person
    if (entity.type !== 'company') continue;

    // Extract ownership percentage
    const shareStr = rel?.metadata?.share || rel?.metadata?.percentage || null;
    const shareNum = typeof shareStr === 'string' ? parseFloat(String(shareStr).replace('%','')) : (typeof shareStr === 'number' ? shareStr : NaN);
    const ownershipPercent = !isNaN(shareNum) ? Math.round(shareNum) : null;

    const isSole = rtype === 'SoleCapitalOwner' || (ownershipPercent === 100);
    const isET = rtype === 'PhysicalPersonTrader';
    const isOOD = rtype === 'Partners' && ownershipPercent !== null && ownershipPercent >= 50;

    // Accept EOOD (100%), ET, or OOD with >=50%
    if (isSole || isET || isOOD) {
      const uic = entity.id || entity.uic || null;
      const name = entity.name || null;
      const nameEn = entity.name_en || null;
      
      let category = '';
      if (isET) category = 'ET';
      else if (isSole) category = 'SoleCapitalOwner';
      else if (isOOD) category = 'Partners50Plus';
      
      companies.push({
        eik: uic,
        business_name_bg: name,
        business_name_en: nameEn,
        legal_form: null,
        entity_type: isET ? 'ET' : (isOOD ? 'OOD' : 'EOOD'),
        category: category,
        ownership_percent: ownershipPercent, // NEW: store ownership %
        incorporation_date: null,
        address: null
      });
    }
  }
  return companies;
}

function formatAddress(seat: any): string {
  const parts: string[] = [];
  if (seat?.country) parts.push(seat.country);
  if (seat?.region) parts.push(seat.region);
  if (seat?.district) parts.push(seat.district);
  if (seat?.municipality) parts.push(seat.municipality);
  if (seat?.settlement) parts.push(seat.settlement);
  if (seat?.postCode) parts.push(seat.postCode);
  return parts.join(", ");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { full_name, email, eik, eik_hint } = await req.json();
    const eikHint = eik || eik_hint || null;

    if (!full_name || !email) {
      return new Response("Missing full_name or email", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // TEMPORARY FIX: Hardcoded NEW service_role key (until Supabase Secrets are updated)
    const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA";
    const supabase = createClient(supabaseUrl!, serviceRoleKey!);

    // Search
    const searchResults = await searchPersonInCompanyBook(full_name);
    if (!searchResults?.results?.length) {
      await supabase.from("user_registry_checks").insert({ email, full_name, match_count: 0, any_match: false, companies: [] });
      await supabase.from("users_pending").update({ status: "no_match", updated_at: new Date().toISOString() }).eq("email", email);
      return new Response(JSON.stringify({ status: "ok", full_name, email, match_count: 0, any_match: false, companies: [], user_status: "no_match" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Helper function to normalize names for comparison (remove extra spaces, convert to lowercase)
    function normalizeName(name: string): string {
      if (!name) return '';
      return name.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    // Accumulate companies from up to 10 candidates (to handle common names like "Асен Митков Асенов")
    // BUT only include candidates with EXACT name match
    const verifiedCompanies: any[] = [];
    let chosenPerson: any = null;
    let personIdentifier: string | null = null;
    const searchNameNormalized = normalizeName(full_name);

    console.log(`[registry_check] Searching for exact match: "${full_name}"`);

    for (const candidate of searchResults.results.slice(0, 10)) {
      const candidateName = candidate.name || '';
      const candidateNameNormalized = normalizeName(candidateName);
      
      // Skip if names don't match exactly
      if (candidateNameNormalized !== searchNameNormalized) {
        console.log(`[registry_check] Skipping candidate "${candidateName}" - name mismatch`);
        continue;
      }
      
      console.log(`[registry_check] Processing candidate "${candidateName}" - exact match ✓`);
      
      const pid = candidate.indent || candidate.identifier || candidate.id;
      const ownershipData = await getOwnershipData(pid);
      const comps = extractVerifiedBusinesses(ownershipData, pid);
      if (comps.length > 0 && !chosenPerson) {
        chosenPerson = candidate;
        personIdentifier = pid;
      }
      for (const c of comps) verifiedCompanies.push(c);
    }

    // Enrich + dedupe by EIK with RELAXED FILTERS
    const seen = new Set<string>();
    const enrichedCompanies: any[] = [];
    
    console.log(`[FILTER] Starting enrichment for ${verifiedCompanies.length} companies`);
    
    for (const company of verifiedCompanies) {
      const e = company.eik;
      if (e && seen.has(e)) continue;
      seen.add(e);
      
      const details = await getCompanyDetails(e);
      const comp = details?.company || details || null;
      
      if (!comp) {
        console.log(`[FILTER] Skipping ${e} - no company details found`);
        // Still add basic info from relationships
        enrichedCompanies.push({
          ...company,
          business_name_en: company.business_name_en || null,
          status: 'UNKNOWN',
          filter_reason: 'no_details'
        });
        continue;
      }
      
      // Relaxed filters - collect ALL companies with metadata
      const status = String(comp.status || '').toUpperCase();
      const isActive = status === 'N' || status === 'E';
      
      // Try multiple sources for English name
      const englishName = company.business_name_en || 
                         comp.companyNameTransliteration?.name || 
                         comp.name_en ||
                         null;
      
      // Detect entity type with improved matching using category
      const legalForm = String(comp.legalForm || '').toLowerCase();
      const category = company.category || '';
      
      // Check category first (most reliable)
      let isEOOD = category === 'SoleCapitalOwner';
      let isET = category === 'ET';
      
      // Then check legal form
      if (!isEOOD && !isET) {
        isEOOD = legalForm.includes('еоод') || 
                 legalForm.includes('eood') || 
                 legalForm.includes('еднолично дружество') ||
                 legalForm.includes('limited liability');
        isET = legalForm.includes('едноличен търговец') || 
               legalForm.includes('sole trader') ||
               /\bет\b/.test(legalForm) ||
               /\bet\b/.test(legalForm);
      }
      
      // Extract NKID (primary business activity code and description)
      const nkids = comp.nkids || [];
      const primaryNkid = Array.isArray(nkids) && nkids.length > 0 ? nkids[0] : null;
      const nkidCode = primaryNkid?.code || null;
      const nkidDescription = primaryNkid?.description || null;
      
      // Check if entity_type matches category for better accuracy
      let finalEntityType = company.entity_type;
      if (category === 'Partners50Plus') {
        finalEntityType = 'OOD';
      } else if (isEOOD) {
        finalEntityType = 'EOOD';
      } else if (isET) {
        finalEntityType = 'ET';
      }
      
      // Determine if "eligible" for Wallester with updated rules
      // - Must be EOOD, ET, or OOD with >=50% ownership
      // - Must be active
      // - Must have official English name (not just transliteration)
      const hasOfficialEnglish = englishName && englishName !== (comp.companyNameTransliteration?.name || '');
      const isEligible = isActive && 
                        (finalEntityType === 'EOOD' || finalEntityType === 'ET' || (finalEntityType === 'OOD' && (company.ownership_percent || 0) >= 50)) && 
                        !!englishName;
      
      console.log(`[FILTER] ${e}: ${isEligible ? '✓ ELIGIBLE' : '⚠ NOT ELIGIBLE'} (${englishName || 'NO_EN_NAME'}, ${finalEntityType}, ownership:${company.ownership_percent}%, ${status})`);
      
      const merged = {
        ...company,
        business_name_bg: comp.name || company.business_name_bg,
        business_name_en: englishName,
        legal_form: comp.legalForm || company.legal_form || null,
        entity_type: finalEntityType,
        incorporation_date: comp.registrationDate || company.incorporation_date || null,
        address: comp.seat ? formatAddress(comp.seat) : (company.address || null),
        status: status,
        is_active: isActive,
        is_eligible_for_wallester: isEligible,
        nkid_code: nkidCode,                    // NEW: NKID code
        nkid_description: nkidDescription,      // NEW: NKID description
        filter_reason: !isEligible ? (
          !isActive ? 'inactive' : 
          (!isEOOD && !isET && !(finalEntityType === 'OOD' && (company.ownership_percent || 0) >= 50)) ? 'wrong_type_or_low_ownership' : 
          !englishName ? 'no_english_name' : 
          'unknown'
        ) : null,
        details: details
      };
      enrichedCompanies.push(merged);
    }
    
    console.log(`[FILTER] Total companies collected: ${enrichedCompanies.length} (eligible: ${enrichedCompanies.filter(c => c.is_eligible_for_wallester).length})`);

    // Ensure hinted EIK (if provided)
    if (eikHint && !seen.has(String(eikHint))) {
      const hinted = await getCompanyDetails(String(eikHint));
      if (hinted) {
        const comp = hinted.company || hinted;
        const status = String(comp.status || '').toUpperCase();
        const isActive = status === 'N' || status === 'E';
        if (isActive) {
          const lf = String(comp.legalForm || '').toLowerCase();
          const isEOOD = lf.includes('еоод') || lf.includes('eood');
          const isET = lf.includes('ет') || lf.includes('et');
          enrichedCompanies.push({
            eik: comp.uic || comp.eik || String(eikHint),
            business_name_bg: comp.name,
            business_name_en: comp.companyNameTransliteration?.name ?? null,
            legal_form: comp.legalForm,
            entity_type: isEOOD ? 'EOOD' : (isET ? 'ET' : null),
            incorporation_date: comp.registrationDate || null,
            address: comp.seat ? formatAddress(comp.seat) : null,
            details: hinted
          });
        }
      }
    }

    const matchCount = enrichedCompanies.length;
    const anyMatch = matchCount > 0;

    // Insert into user_registry_checks
    console.log(`[registry_check] Inserting into user_registry_checks for ${email}`);
    const { error: insertCheckError } = await supabase.from("user_registry_checks").insert({
      email,
      full_name,
      match_count: matchCount,
      any_match: anyMatch,
      companies: enrichedCompanies
    });

    if (insertCheckError) {
      console.error(`[registry_check] Failed to insert user_registry_checks:`, insertCheckError);
    } else {
      console.log(`[registry_check] Successfully inserted user_registry_checks`);
    }

    // Update users_pending status
    const newStatus = anyMatch ? "ready_for_stagehand" : "no_match";
    console.log(`[registry_check] Updating users_pending status to ${newStatus} for ${email}`);
    const { error: updateError } = await supabase.from("users_pending").update({ 
      status: newStatus, 
      updated_at: new Date().toISOString() 
    }).eq("email", email);

    if (updateError) {
      console.error(`[registry_check] Failed to update users_pending:`, updateError);
    } else {
      console.log(`[registry_check] Successfully updated users_pending status`);
    }

    // Trigger users_pending_worker if there are matches
    if (anyMatch) {
      console.log(`[registry_check] Triggering users_pending_worker for ${email}`);
      try {
        const workerPayload = {
          row: {
            full_name,
            email,
            status: newStatus
          }
        };
        
        // Call users_pending_worker Edge Function
        const workerUrl = `${supabaseUrl}/functions/v1/users_pending_worker`;
        const workerResponse = await fetch(workerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`
          },
          body: JSON.stringify(workerPayload)
        });
        
        if (!workerResponse.ok) {
          const errorText = await workerResponse.text();
          console.error(`[registry_check] users_pending_worker failed: ${workerResponse.status} - ${errorText}`);
        } else {
          const workerResult = await workerResponse.json();
          console.log(`[registry_check] users_pending_worker completed successfully:`, workerResult);
        }
      } catch (workerError) {
        console.error(`[registry_check] Error calling users_pending_worker:`, workerError);
      }
    }

    // Send email notification
    try {
      console.log(`[registry_check] Sending email notification for ${email}`);
      const emailPayload = {
        userEmail: email,
        fullName: full_name,
        matchCount: matchCount,
        anyMatch: anyMatch,
        companies: enrichedCompanies
      };
      
      const emailUrl = `${supabaseUrl}/functions/v1/send-registry-email`;
      const emailResponse = await fetch(emailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify(emailPayload)
      });
      
      if (!emailResponse.ok) {
        console.error(`[registry_check] send-registry-email failed: ${emailResponse.status}`);
      } else {
        console.log(`[registry_check] Email notification sent successfully`);
      }
    } catch (emailError) {
      console.error(`[registry_check] Error sending email:`, emailError);
    }

    console.log(`[registry_check] Process completed for ${email}`);

    return new Response(JSON.stringify({
      status: "ok",
      full_name,
      email,
      match_count: matchCount,
      any_match: anyMatch,
      companies: enrichedCompanies,
      user_status: newStatus,
      person_details: { identifier: personIdentifier, name: chosenPerson?.name || null }
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("registry_check error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
