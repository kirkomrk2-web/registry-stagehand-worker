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

// CompanyBook API base URL
const COMPANYBOOK_API_BASE = "https://api.companybook.bg/api";

// ---------- CompanyBook helpers ----------
async function searchPersonInCompanyBook(fullName: string) {
  const url = `${COMPANYBOOK_API_BASE}/people/search?name=${encodeURIComponent(fullName)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function getPersonDetails(identifier: string) {
  const url = `${COMPANYBOOK_API_BASE}/people/${identifier}?with_data=true`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function getOwnershipData(identifier: string) {
  const url = `${COMPANYBOOK_API_BASE}/relationships/${identifier}?type=ownership&depth=2&include_historical=false`;
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
  return parts.length ? parts.join(", ") : null;
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
function parseName(fullName: string) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: null, last: null };
  if (parts.length === 1) return { first: parts[0], last: null };
  return { first: parts[0], last: parts.slice(1).join(" ") };
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE");
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

    if (!full_name || !email || status !== "pending") {
      return new Response(JSON.stringify({ message: "Nothing to process" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Search & fetch data
    const search = await searchPersonInCompanyBook(full_name);
    if (!search || !search.results?.length) {
      await supabase.from("users_pending").update({ status: "no_match", updated_at: new Date().toISOString() }).eq("email", email);
      return new Response(JSON.stringify({ status: "no_match" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Iterate through candidates until we find eligible companies
    let person = null as any;
    let personIdentifier = null as any;
    let personDetails = null as any;
    let ownership = null as any;
    let companies: any[] = [];

    for (const candidate of search.results.slice(0, 5)) {
      const pid = candidate.indent || candidate.identifier || candidate.id;
      const own = await getOwnershipData(pid);
      const compsAll = extractVerifiedBusinesses(own, pid);
      const comps = sanitizeCompanies(compsAll).slice(0, 5);
      if (comps.length > 0) {
        person = candidate;
        personIdentifier = pid;
        ownership = own;
        companies = comps;
        personDetails = await getPersonDetails(pid);
        break;
      }
    }

    // If still none, fallback to first candidate's details (for logging/debug)
    if (!person && search.results[0]) {
      const pid = search.results[0].indent || search.results[0].identifier || search.results[0].id;
      person = search.results[0];
      personIdentifier = pid;
      personDetails = await getPersonDetails(pid);
      ownership = await getOwnershipData(pid);
      companies = sanitizeCompanies(extractVerifiedBusinesses(ownership, pid)).slice(0, 5);
    }

    const topCompany = pickTopCompany(companies);

    // Build slim companies list per rules (EOOD/ET + english name + active)
    const companies_slim = await buildCompaniesSlim(companies);


    // 3) Owner name split and birthdate
    const { first: owner_first_name_en, last: owner_last_name_en } = parseName(full_name);
    const owner_birthdate = personDetails?.birthDate || personDetails?.birthdate || null;

    // 4) Upsert owner (without allocations first)
    const fullNameKey = full_name.trim();
    const { data: existingOwner } = await supabase
      .from("verified_owners")
      .select("id")
      .eq("full_name", fullNameKey)
      .single();

    let ownerId = existingOwner?.id;
    if (!ownerId) {
      const { data: ins, error: insErr } = await supabase
        .from("verified_owners")
        .insert({
          full_name: fullNameKey,
          owner_first_name_en,
          owner_last_name_en,
          owner_birthdate,
          companies,
          top_company: topCompany || null,
          companies_slim,
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
          owner_birthdate,
          companies,
          top_company: topCompany || null,
          companies_slim,
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
    await supabase.from("users_pending").update({ status: "ready_for_stagehand", updated_at: new Date().toISOString() }).eq("email", email);

    return new Response(JSON.stringify({
      status: "ok",
      owner_id: ownerId,
      full_name: fullNameKey,
      owner_first_name_en,
      owner_last_name_en,
      owner_birthdate,
      top_company: topCompany,
      companies,
      allocated_phone_number: phoneAlloc?.number || null,
      email_alias_33mail: uniqueAlias,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("users_pending_worker error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
