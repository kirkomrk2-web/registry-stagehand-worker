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

// CompanyBook API base URL
const COMPANYBOOK_API_BASE = "https://api.companybook.bg/api";

async function searchPersonInCompanyBook(fullName: string) {
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

    // Accept if:
    //  - SoleCapitalOwner (100% owner)
    //  - PhysicalPersonTrader (sole trader)
    //  - Partners with 100% share in metadata.share
    const shareStr = rel?.metadata?.share || rel?.metadata?.percentage || null;
    const shareNum = typeof shareStr === 'string' ? parseFloat(String(shareStr).replace('%','')) : (typeof shareStr === 'number' ? shareStr : NaN);

    const isSole = rtype === 'SoleCapitalOwner' || (!isNaN(shareNum) && Math.round(shareNum) === 100);
    const isET = rtype === 'PhysicalPersonTrader';

    if (isSole || isET) {
      const uic = entity.id || entity.uic || null; // API uses id=uic for companies
      const name = entity.name || null;
      const nameEn = entity.name_en || null; // CRITICAL: Capture English name from relationships entity
      companies.push({
        eik: uic,
        business_name_bg: name,
        business_name_en: nameEn, // Store the English name from relationships
        legal_form: null,
        entity_type: isET ? 'ET' : 'EOOD', // will confirm via details
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, serviceRoleKey!);

    // Search
    const searchResults = await searchPersonInCompanyBook(full_name);
    if (!searchResults?.results?.length) {
      await supabase.from("user_registry_checks").insert({ email, full_name, match_count: 0, any_match: false, companies: [] });
      await supabase.from("users_pending").update({ status: "no_match", updated_at: new Date().toISOString() }).eq("email", email);
      return new Response(JSON.stringify({ status: "ok", full_name, email, match_count: 0, any_match: false, companies: [], user_status: "no_match" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Accumulate companies from up to 5 candidates
    const verifiedCompanies: any[] = [];
    let chosenPerson: any = null;
    let personIdentifier: string | null = null;

    for (const candidate of searchResults.results.slice(0, 5)) {
      const pid = candidate.indent || candidate.identifier || candidate.id;
      const ownershipData = await getOwnershipData(pid);
      const comps = extractVerifiedBusinesses(ownershipData, pid);
      if (comps.length > 0 && !chosenPerson) {
        chosenPerson = candidate;
        personIdentifier = pid;
      }
      for (const c of comps) verifiedCompanies.push(c);
    }

    // Enrich + dedupe by EIK with STRICT FILTERS
    const seen = new Set<string>();
    const enrichedCompanies: any[] = [];
    
    console.log(`[FILTER] Starting enrichment for ${verifiedCompanies.length} companies`);
    
    for (const company of verifiedCompanies) {
      const e = company.eik;
      if (e && seen.has(e)) continue;
      seen.add(e);
      
      const details = await getCompanyDetails(e);
      const comp = details?.company || details || null;
      
      // CRITICAL FILTERS (matching registry_pipeline_visual.html requirements):
      if (!comp) {
        console.log(`[FILTER] Skipping ${e} - no company details found`);
        continue;
      }
      
      // 1. Filter for ACTIVE status (N or E)
      const status = String(comp.status || '').toUpperCase();
      const isActive = status === 'N' || status === 'E';
      if (!isActive) {
        console.log(`[FILTER] Skipping ${e} - not active (status: ${status})`);
        continue;
      }
      
      // 2. Filter for ENGLISH NAME (REQUIRED - must exist in relationships)
      // English name comes from relationships entity.name_en, NOT from companyNameTransliteration
      const englishName = company.business_name_en || comp.companyNameTransliteration?.name || null;
      if (!englishName) {
        console.log(`[FILTER] Skipping ${e} - no English name (checked relationships and transliteration)`);
        continue;
      }
      
      // 3. Filter for TYPE (EOOD or ET only)
      const legalForm = String(comp.legalForm || '').toLowerCase();
      // EOOD can be: "ЕООД", "еоод", "EOOD", or full "Еднолично дружество с ограничена отговорност"
      const isEOOD = legalForm.includes('еоод') || 
                     legalForm.includes('eood') || 
                     legalForm.includes('еднолично дружество');
      // ET can be: "ЕТ", "ET", or full "Едноличен търговец"
      const isET = legalForm.includes('едноличен търговец') || 
                   (legalForm.includes('ет') && !legalForm.includes('дружество')) ||
                   (legalForm.includes('et') && !legalForm.includes('limited'));
      
      if (!isEOOD && !isET) {
        console.log(`[FILTER] Skipping ${e} - not EOOD/ET (legalForm: ${comp.legalForm})`);
        continue;
      }
      
      // Passed all filters!
      console.log(`[FILTER] ✓ ${e} passed all filters (${englishName}, ${legalForm}, ${status})`);
      
      const merged = {
        ...company,
        business_name_bg: comp.name || company.business_name_bg,
        business_name_en: englishName,
        legal_form: comp.legalForm || company.legal_form || null,
        entity_type: isEOOD ? 'EOOD' : 'ET',
        incorporation_date: comp.registrationDate || company.incorporation_date || null,
        address: comp.seat ? formatAddress(comp.seat) : (company.address || null),
        details: details
      };
      enrichedCompanies.push(merged);
    }
    
    console.log(`[FILTER] Final result: ${enrichedCompanies.length} companies after filtering`);

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

    await supabase.from("user_registry_checks").insert({
      email,
      full_name,
      match_count: matchCount,
      any_match: anyMatch,
      companies: enrichedCompanies
    });

    const newStatus = anyMatch ? "ready_for_stagehand" : "no_match";
    await supabase.from("users_pending").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("email", email);

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
