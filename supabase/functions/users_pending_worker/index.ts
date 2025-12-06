// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Deno exists in runtime; declare for local TS tooling
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// CompanyBook API - Use proxy if available (required for cloud deployment)
// Set COMPANYBOOK_PROXY env var to point to deployed proxy server
// Example: https://your-proxy.railway.app or http://your-vps-ip:4321
const COMPANYBOOK_PROXY = Deno.env.get("COMPANYBOOK_PROXY");
const COMPANYBOOK_API_BASE = COMPANYBOOK_PROXY || "https://api.companybook.bg/api";

console.log(`[users_pending_worker] Using CompanyBook API: ${COMPANYBOOK_PROXY ? 'PROXY' : 'DIRECT'} - ${COMPANYBOOK_API_BASE}`);

// ---------- CompanyBook helpers ----------
async function searchPersonInCompanyBook(fullName: string) {
  const url = `https://api.companybook.bg/api/people/search?name=${encodeURIComponent(fullName)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function getPersonDetails(identifier: string) {
  const url = `https://api.companybook.bg/api/people/${identifier}?with_data=true`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function getOwnershipData(identifier: string) {
  const url = `https://api.companybook.bg/api/relationships/${identifier}?type=ownership&depth=2`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function getCompanyDetails(uic: string) {
  const url = `https://api.companybook.bg/api/companies/${uic}?with_data=true`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

function formatAddress(seat: any): string | null {
  if (!seat) return null;
  const parts: string[] = [];
  if (seat.country) parts.push(seat.country);
  if (seat.region) parts.push(seat.region);
  if (seat.district) parts.push(seat.district);
  if (seat.municipality) parts.push(seat.municipality);
  if (seat.settlement) parts.push(seat.settlement);
  if (seat.postCode) parts.push(seat.postCode);
  // Use newlines for easier copying
  return parts.length ? parts.join("\n") : null;
}

// Build slim companies list (EOOD/ET 100% only, with english name, active)
async function buildCompaniesSlim(companies: any[]): Promise<any[]> {
  const out: any[] = [];
  if (!Array.isArray(companies) || companies.length === 0) return out;

  for (const c of companies) {
    const eik = String(c?.eik || '').trim();
    if (!eik) continue;
    // fetch full details to evaluate rules and extract english name
    const details = await getCompanyDetails(eik);
    const comp = details?.company || details || null;
    if (!comp) continue;

    const lf = String(comp.legalForm || '').toLowerCase();
    const isEOOD = lf.includes('еоод') || lf.includes('eood');
    const isET = lf.includes('ет') || lf.includes('et');
    if (!(isEOOD || isET)) continue;

    const englishName = comp.companyNameTransliteration?.name || null;
    if (!englishName) continue; // must have english name

    const status = String(comp.status || '').toUpperCase();
    const isActive = status === 'N' || status === 'E'; // active codes per docs
    if (!isActive) continue;

    const seat = comp.seat || {};
    const city_en = seat?.settlement || null;
    const region_en = seat?.region || null;
    const country_en = seat?.country || null;

    const vat = comp.registerInfo?.vat || (eik ? `BG${eik}` : null);
    const entity_type = isEOOD ? 'EOOD' : 'ET';

    const id = (globalThis as any)?.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    out.push({
      id,
      business_name_en: englishName,
      eik: comp.uic || comp.eik || eik,
      vat,
      entity_type,
      city_en,
      region_en,
      country_en,
    });
  }
  return out;
}

function extractVerifiedBusinesses(ownershipData: any, personId: string) {
  const companies: any[] = [];
  if (!ownershipData || !ownershipData.relationships) return companies;

  for (const rel of ownershipData.relationships) {
    const entity = rel.entity || {};
    const rtype = rel.relationshipType || rel.type || '';
    const isActive = rel.isActive !== false; // default true
    if (!isActive) continue;

    if (entity.type !== 'company') continue; // only companies

    // Accept ownership if sole owner (100%) or physical person trader
    const shareStr = rel?.metadata?.share || rel?.metadata?.percentage || null;
    const shareNum = typeof shareStr === 'string' ? parseFloat(String(shareStr).replace('%','')) : (typeof shareStr === 'number' ? shareStr : NaN);

    const isSole = rtype === 'SoleCapitalOwner' || (!isNaN(shareNum) && Math.round(shareNum) === 100);
    const isET = rtype === 'PhysicalPersonTrader';

    if (isSole || isET) {
      companies.push({
        eik: entity.id || entity.uic || null,
        business_name_bg: entity.name || null,
        business_name_en: null,
        legal_form: null,
        entity_type: isET ? 'ET' : 'EOOD',
        incorporation_date: null,
        address: null,
      });
    }
  }
  return companies;
}

// ---------- Utilities ----------
// Cyrillic to Latin transliteration
const CYRILLIC_TO_LATIN: Record<string, string> = {
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ж': 'Zh', 'З': 'Z',
  'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P',
  'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch',
  'Ш': 'Sh', 'Щ': 'Sht', 'Ъ': 'A', 'Ь': 'Y', 'Ю': 'Yu', 'Я': 'Ya',
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh', 'з': 'z',
  'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
  'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
  'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': 'y', 'ю': 'yu', 'я': 'ya'
};

function transliterateCyrillicToLatin(text: string): string {
  if (!text) return '';
  let result = text.split('').map(char => CYRILLIC_TO_LATIN[char] || char).join('');
  // Remove all types of quotes (ASCII and Unicode)
  // U+0022 ("), U+0027 ('), U+00AB («), U+00BB (»), 
  // U+201C ("), U+201D ("), U+201E („), U+201F (‟),
  // U+2018 ('), U+2019 ('), U+2039 (‹), U+203A (›)
  result = result.replace(/[\u0022\u0027\u00AB\u00BB\u201C\u201D\u201E\u201F\u2018\u2019\u2039\u203A]/g, '');
  // Replace БЪЛГАРИЯ/BALGARIYa with Bulgaria
  result = result.replace(/BALGARIYA|BALGARIYa|Bulgariya/gi, 'Bulgaria');
  return result;
}

function parseName(fullName: string) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: null, middle: null, last: null };
  if (parts.length === 1) return { first: parts[0], middle: null, last: null };
  if (parts.length === 2) return { first: parts[0], middle: null, last: parts[1] };
  // For 3+ parts: first, middle, last
  return { first: parts[0], middle: parts[1], last: parts[2] };
}

function formatDateToDDMMYYYY(isoDate: string): string {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch (_) {
    return '';
  }
}

function genAliasFromName(name: string) {
  const base = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return base ? `${base}@33mailbox.com` : null;
}

async function ensureUniqueAlias(supabase: any, preferred: string | null) {
  let alias = preferred || `user${Date.now()}@33mailbox.com`;
  let n = 0;
  while (true) {
    const check = await supabase
      .from("verified_owners")
      .select("email_alias_33mail", { count: "exact", head: true })
      .eq("email_alias_33mail", alias);
    if (!check.error && (check.count ?? 0) === 0) return alias;
    n += 1;
    const stem = (preferred || "alias").split("@")[0];
    alias = `${stem}${n}@33mailbox.com`;
  }
}

async function allocatePhone(supabase: any, ownerId: string) {
  // Pick first available phone
  const { data: phone, error } = await supabase
    .from("sms_numbers_pool")
    .select("id, phone_number, sms_url, country_code")
    .eq("status", "available")
    .order("created_at", { ascending: true, nullsFirst: true })
    .limit(1)
    .single();
  if (error || !phone) return null;

  const { error: updErr } = await supabase
    .from("sms_numbers_pool")
    .update({ status: "assigned", assigned_to: ownerId, assigned_at: new Date().toISOString() })
    .eq("id", phone.id);
  if (updErr) return null;

  return { number: phone.phone_number, url: phone.sms_url, country: phone.country_code };
}

function pickTopCompany(companies: any[]) {
  // Simple heuristic: prefer EOOD, then longest english name, fallback first
  if (!companies || companies.length === 0) return null;
  const sorted = [...companies].sort((a, b) => {
    const aEOOD = a.entity_type === "EOOD" ? 1 : 0;
    const bEOOD = b.entity_type === "EOOD" ? 1 : 0;
    if (bEOOD !== aEOOD) return bEOOD - aEOOD;
    const al = (a.business_name_en || "").length;
    const bl = (b.business_name_en || "").length;
    return bl - al;
  });
  return sorted[0];
}

// Remove any phone/email fields from company objects defensively
function sanitizeCompanies(companies: any[]) {
  return (companies || []).map((c) => {
    const { phone_number, email_alias_33mail, email, phone, ...rest } = c || {};
    return rest;
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL") || Deno.env.get("URL");
    // TEMPORARY FIX: Hardcoded NEW service_role key (until Supabase Secrets are updated)
    const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA";
    const supabase = createClient(supabaseUrl!, serviceRoleKey!);

    const body = await req.json().catch(() => ({}));
    // Accept payload in two forms: {row:{full_name,email,status}} or flat {full_name,email,status}
    const row = body?.row || body || {};

    // Fallback: if no row provided, pick first pending user
    let { full_name, email, status } = row;
    if (!full_name || !email) {
      const { data: pending } = await supabase
        .from("users_pending")
        .select("full_name,email,status")
        .eq("status", "pending")
        .order("created_at", { ascending: true, nullsFirst: true })
        .limit(1)
        .single();
      full_name = pending?.full_name;
      email = pending?.email;
      status = pending?.status;
    }

    if (!full_name || !email) {
      return new Response(JSON.stringify({ message: "Nothing to process - missing full_name or email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[users_pending_worker] Processing ${full_name} (${email})`);

    // 0) Get birthdate from users_pending table
    const { data: userPending, error: userPendingError } = await supabase
      .from("users_pending")
      .select("birth_date")
      .eq("email", email)
      .single();
    
    const birthDate = userPending?.birth_date || null;
    console.log(`[users_pending_worker] Birth date from users_pending: ${birthDate}`);

    // 1) Read from user_registry_checks (already populated by registry_check)
    const { data: registryCheck, error: registryError } = await supabase
      .from("user_registry_checks")
      .select("*")
      .eq("email", email)
      .single();

    if (registryError || !registryCheck) {
      console.error(`[users_pending_worker] No registry check found for ${email}:`, registryError);
      await supabase.from("users_pending").update({ status: "no_match", updated_at: new Date().toISOString() }).eq("email", email);
      return new Response(JSON.stringify({ status: "no_match", message: "No registry check data found" }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 2) Filter only ELIGIBLE companies (is_eligible_for_wallester: true, has english name, is_active)
    const allCompanies = registryCheck.companies || [];
    const eligibleCompanies = allCompanies.filter((c: any) => 
      c.is_eligible_for_wallester === true && 
      c.business_name_en && 
      c.is_active === true
    );

    console.log(`[users_pending_worker] Found ${allCompanies.length} total companies, ${eligibleCompanies.length} eligible`);

    if (eligibleCompanies.length === 0) {
      console.log(`[users_pending_worker] No eligible companies for ${email}`);
      await supabase.from("users_pending").update({ status: "no_valid_match", updated_at: new Date().toISOString() }).eq("email", email);
      return new Response(JSON.stringify({ status: "no_valid_match", message: "No eligible companies found" }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 3) Prepare companies for verified_owners (max 5, only eligible)
    const companies = eligibleCompanies.slice(0, 5);
    const topCompany = pickTopCompany(companies);

    // 4) Parse and transliterate owner name
    const { first, middle, last } = parseName(full_name);
    const owner_first_name_en = transliterateCyrillicToLatin(first || '');
    const owner_last_name_en = transliterateCyrillicToLatin(last || '');
    
    console.log(`[users_pending_worker] Owner names: ${first} -> ${owner_first_name_en}, ${last} -> ${owner_last_name_en}`);

    // 5) Build waiting_list structure for each company
    const waiting_list = companies.map((company: any) => {
      const details = company.details || {};
      const comp = details.company || details || {};
      const seat = comp.seat || {};
      
      // Format birthdate as dd.mm.yyyy only
      const formattedBirthDate = birthDate ? formatDateToDDMMYYYY(birthDate) : '';
      
      // Transliterate address and street to Latin
      const rawAddress = formatAddress(seat) || '';
      const addressLatin = transliterateCyrillicToLatin(rawAddress);
      
      const rawStreet = `${seat.street || ''} ${seat.streetNumber || ''}`.trim();
      const streetLatin = transliterateCyrillicToLatin(rawStreet);
      
      return {
        business_name_en: company.business_name_en || '',
        lastUpdated: formatDateToDDMMYYYY(comp.lastUpdated || ''),
        EIK: company.eik || '',
        VAT: company.eik ? `BG${company.eik}` : '',
        subjectOfActivity: comp.subjectOfActivity || '',
        address: addressLatin,
        street: streetLatin,
        owner_first_name_en,
        owner_last_name_en,
        owner_birthdate: formattedBirthDate
      };
    });

    console.log(`[users_pending_worker] Built waiting_list with ${waiting_list.length} items`);

    // 6) Upsert owner
    const fullNameKey = full_name.trim();
    const { data: existingOwner } = await supabase
      .from("verified_owners")
      .select("id")
      .eq("full_name", fullNameKey)
      .single();

    // Keep birthdate in ISO format for database (Postgres requires this)
    // Only format to dd.mm.yyyy in waiting_list
    
    let ownerId = existingOwner?.id;
    if (!ownerId) {
      const { data: ins, error: insErr } = await supabase
        .from("verified_owners")
        .insert({
          full_name: fullNameKey,
          owner_first_name_en,
          owner_last_name_en,
          owner_birthdate: birthDate, // Keep ISO format
          companies, // Keep original companies array for compatibility
          waiting_list, // New structured waiting list
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      ownerId = ins.id;
    } else {
      const { error: updErr } = await supabase
        .from("verified_owners")
        .update({
          owner_first_name_en,
          owner_last_name_en,
          owner_birthdate: birthDate, // Keep ISO format
          companies,
          waiting_list,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ownerId);
      if (updErr) throw updErr;
    }

    // 5) Allocate phone number
    let phoneAlloc = await allocatePhone(supabase, ownerId);

    // 6) Allocate email alias
    const preferredAlias = genAliasFromName(topCompany?.business_name_en || `${owner_first_name_en || ""}${owner_last_name_en || ""}`);
    const uniqueAlias = await ensureUniqueAlias(supabase, preferredAlias);

    const { error: ownerAllocErr } = await supabase
      .from("verified_owners")
      .update({
        allocated_phone_number: phoneAlloc?.number || null,
        allocated_sms_number_url: phoneAlloc?.url || null,
        allocated_sms_country_code: phoneAlloc?.country || null,
        email_alias_33mail: uniqueAlias,
        email_alias_hostinger: "support@33mailbox.com",
      })
      .eq("id", ownerId);
    if (ownerAllocErr) throw ownerAllocErr;

    // 7) Update users_pending status
    const finalStatus = "ready_for_stagehand"; // We only reach here if we have eligible companies
    await supabase.from("users_pending").update({ status: finalStatus, updated_at: new Date().toISOString() }).eq("email", email);

    console.log(`[users_pending_worker] ✅ Successfully created verified_owner for ${fullNameKey} with ${companies.length} companies`);

    return new Response(JSON.stringify({
      status: "ok",
      owner_id: ownerId,
      full_name: fullNameKey,
      owner_first_name_en,
      owner_last_name_en,
      owner_birthdate: null,
      top_company: topCompany,
      companies_count: companies.length,
      allocated_phone_number: phoneAlloc?.number || null,
      email_alias_33mail: uniqueAlias,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("users_pending_worker error:", err);
    
    // Try to update users_pending status to error if we have the email
    try {
      const body = await req.clone().json().catch(() => ({}));
      const row = body?.row || body || {};
      const email = row?.email;
      
      if (email) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL") || Deno.env.get("URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE");
        const supabase = createClient(supabaseUrl!, serviceRoleKey!);
        
        await supabase.from("users_pending").update({ 
          status: "error",
          updated_at: new Date().toISOString() 
        }).eq("email", email);
      }
    } catch (updateErr) {
      console.error("Failed to update error status:", updateErr);
    }
    
    return new Response(JSON.stringify({ error: err?.message || "Unknown error", stack: err?.stack }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
