// companybook.mjs - CompanyBook.bg public API client with EOOD-only filtering
// Base URL: https://api.companybook.bg/api

const DEFAULT_BASE = process.env.COMPANYBOOK_BASE_URL?.trim() || "https://api.companybook.bg/api";

function normalizeStrict(str = "") {
  return String(str)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\"''„".]/g, "")
    .replace(/[^a-zа-я0-9\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isNumericEik(eik) {
  return typeof eik === "string" && /^\d{8,13}$/.test(eik);
}

function isEOOD(legalForm = "") {
  const s = String(legalForm).toLowerCase();
  return (
    s.includes("еоод") ||
    s.includes("eood") ||
    s.includes("еднолично дружество с ограничена отговорност") ||
    s.includes("single-member") ||
    s.includes("single member") ||
    s.includes("single-member llc") ||
    s.includes("single member llc")
  );
}

function isET(legalForm = "") {
  const s = String(legalForm).toLowerCase();
  return (
    s.includes("ет ") ||
    s === "ет" ||
    s.includes("едноличен търговец") ||
    s.includes("sole trader") ||
    s.includes("et ")
  );
}

function isEOODorET(legalForm = "") {
  return isEOOD(legalForm) || isET(legalForm);
}

function hasValidEnglishName(englishName) {
  if (!englishName) return false;
  const s = String(englishName).trim().toLowerCase();
  return s !== "" && s !== "none" && s !== "null" && s !== "n/a" && s !== "undefined";
}

function englishNameFromCompanyPayload(payload) {
  // Two possible shapes based on docs
  // 1) { transliteration: "Example OOD" }
  // 2) { company: { transliteration?: string, companyName?: { transliteration?: string, name?: string } } }
  if (!payload) return "none";
  const direct = payload.transliteration;
  const nested =
    payload.company?.transliteration ||
    payload.company?.companyName?.transliteration ||
    payload.company?.companyNameTransliteration?.name;
  const out = direct || nested || null;
  return out && out.trim() ? out.trim() : "none";
}

export async function peopleSearchByName(name, { limit = 10, baseUrl = DEFAULT_BASE } = {}) {
  const url = new URL("/api/people/search", baseUrl);
  url.searchParams.set("name", name);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CompanyBook people search failed: ${res.status}`);
  return res.json();
}

export async function getPerson(indent, { withData = true, baseUrl = DEFAULT_BASE } = {}) {
  const url = new URL(`/api/people/${encodeURIComponent(indent)}`, baseUrl);
  if (withData) url.searchParams.set("with_data", "true");
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CompanyBook get person failed: ${res.status}`);
  return res.json();
}

export async function getRelationships(identifier, { type = "ownership", depth = 3, includeHistorical = false, baseUrl = DEFAULT_BASE } = {}) {
  const url = new URL(`/api/relationships/${encodeURIComponent(identifier)}`, baseUrl);
  url.searchParams.set("type", type);
  url.searchParams.set("depth", String(depth));
  // Only current relationships by default
  url.searchParams.set("include_historical", includeHistorical ? "true" : "false");
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CompanyBook relationships failed: ${res.status}`);
  return res.json();
}

export async function getCompany(uic, { withData = true, baseUrl = DEFAULT_BASE } = {}) {
  const url = new URL(`/api/companies/${encodeURIComponent(uic)}`, baseUrl);
  if (withData) url.searchParams.set("with_data", "true");
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CompanyBook get company failed: ${res.status}`);
  return res.json();
}

function mapBusinessStructureEn(legalForm = "") {
  const s = String(legalForm).toLowerCase();
  if (s.includes("еоод") || s.includes("eood") || s.includes("single")) return "Single-Member LLC (EOOD)";
  if (s.includes("оод") || s.includes("ood")) return "Limited Liability Company (OOD)";
  if (s.includes("еад") || s.includes("ead")) return "Single-Member Joint-Stock Company (EAD)";
  if (s.includes("ад") || s.includes("ad")) return "Joint-Stock Company (AD)";
  if (s.includes("ет ") || s === "ет") return "Sole Trader (ET)";
  return "Other";
}

function buildAddressFromSeat(seat) {
  if (!seat) return null;
  const parts = [seat.country, seat.region, seat.district, seat.municipality, seat.settlement, seat.address, seat.postCode]
    .filter(Boolean)
    .map(String);
  return parts.length ? parts.join(", ") : null;
}

// Extract EOOD sole owner companies from a person payload
export function extractEOODSoleOwnersFromPerson(person) {
  const out = [];
  const personCompanies = person?.personCompanies || [];
  for (const pc of personCompanies) {
    const roles = pc.roles || [];
    const roleTexts = roles.map((r) => (r?.position || "").toLowerCase());
    const isEOODOwner = roleTexts.some((t) =>
      t.includes("sole owner") || t.includes("едноличен собственик") || t.includes("solecapitalowner")
    );
    const legalForm = pc.legalForm || pc.company_name?.legalForm || "";
    const eik = pc.uic?.toString?.() || null;

    if (isEOODOwner && isEOOD(legalForm) && isNumericEik(eik)) {
      out.push({
        eik,
        companyName: pc.company_name?.name || pc.company_name || pc.name || null,
        legalForm,
        englishName: pc.transliteration || pc.company_name?.transliteration || "none",
        source: "companybook/person",
      });
    }
  }
  return out;
}

// Extract candidate companies (company type only) from relationships; caller should enrich/filter by legal form
export function extractSoleOwnerCompanyEIKsFromRelationships(graph) {
  const out = [];
  const rels = graph?.relationships || [];
  for (const rel of rels) {
    const type = (rel?.relationshipType || rel?.type || "").toLowerCase();
    const entity = rel.entity || {};
    const isCompany = (entity?.type || "company").toLowerCase() === "company";
    const eik = entity.id || null;
    const isActive = rel?.isActive === true; // only current
    const shareTxt = (rel?.metadata?.share || "").toString();
    const isHundred = !shareTxt || /100\s*%/.test(shareTxt); // require 100% if provided

    if (!isCompany) continue;
    if (!isActive) continue;
    if (!type.includes("solecapitalowner") && !type.includes("sole owner")) continue;
    if (!isNumericEik(eik)) continue; // skip hashed/person IDs
    if (!isHundred) continue;

    out.push({ eik, name: entity.name || null });
  }
  return out;
}

export async function findSoleOwnerCompaniesByName(fullName, { baseUrl = DEFAULT_BASE, limit = 10 } = {}) {
  const search = await peopleSearchByName(fullName, { limit, baseUrl });
  const normTarget = normalizeStrict(fullName);
  const matches = (search?.results || []).filter((p) => normalizeStrict(p?.name) === normTarget);
  const results = [];

  for (const p of matches) {
    try {
      if (!p?.indent) continue;

      // 1) Detailed person → filter for EOOD sole owners directly
      const person = await getPerson(p.indent, { withData: true, baseUrl });
      const viaPerson = extractEOODSoleOwnersFromPerson(person);
      for (const c of viaPerson) results.push(c);

      // 2) Relationships → candidates → fetch company details to confirm EOOD and enrich details
      const rel = await getRelationships(p.indent, { type: "ownership", depth: 2, baseUrl });
      const candidates = extractSoleOwnerCompanyEIKsFromRelationships(rel);
      for (const cand of candidates) {
        try {
          const cp = await getCompany(cand.eik, { withData: true, baseUrl });
          const legalForm = cp?.company?.legalForm || cp?.legalForm || "";
          if (!isEOOD(legalForm)) continue; // only EOOD
          const englishName = englishNameFromCompanyPayload(cp);
          const name = cp?.company?.companyName?.name || cp?.name || cand.name || null;
          const seat = cp?.company?.seat || cp?.seat || null;
          const address = buildAddressFromSeat(seat);
          const incorporationDate = cp?.company?.registerDate || cp?.registerDate || null; // if available
          const businessStructureEn = mapBusinessStructureEn(legalForm);

          results.push({
            eik: cand.eik,
            companyName: name,
            legalForm, // BG
            businessStructureEn,
            englishName,
            address,
            incorporationDate,
            source: "companybook/relationships",
          });
        } catch (_) {
          // ignore individual failures
        }
      }
    } catch (_) {
      // continue on person-level errors
    }
  }

  // Enrich direct person matches with company details as well (address, incorporationDate, businessStructureEn)
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r || r.address || !r.eik) continue;
    try {
      const cp = await getCompany(r.eik, { withData: true, baseUrl });
      const seat = cp?.company?.seat || cp?.seat || null;
      const address = buildAddressFromSeat(seat);
      const incorporationDate = cp?.company?.registerDate || cp?.registerDate || null;
      const legalForm = cp?.company?.legalForm || r.legalForm || "";
      const enrichedEnglishName = hasValidEnglishName(r.englishName)
        ? r.englishName
        : englishNameFromCompanyPayload(cp);
      results[i] = {
        ...r,
        englishName: enrichedEnglishName || "none",
        address: r.address || address || null,
        incorporationDate: r.incorporationDate || incorporationDate || null,
        businessStructureEn: r.businessStructureEn || mapBusinessStructureEn(legalForm),
        legalForm,
      };
    } catch (_) {}
  }

  // dedupe by eik
  const seen = new Set();
  const deduped = results.filter((c) => {
    const key = (c.eik || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped;
}

/**
 * Calculate data quality score (0-100) based on field completeness
 */
export function calculateDataQualityScore(business) {
  let score = 0;
  const weights = {
    eik: 20,
    companyName: 20,
    englishName: 20,
    legalForm: 10,
    address: 10,
    incorporationDate: 10,
    businessStructureEn: 10
  };
  
  Object.entries(weights).forEach(([field, weight]) => {
    const value = business[field];
    if (value && String(value).trim() !== "" && value !== "none" && value !== null) {
      score += weight;
    }
  });
  
  return score;
}

/**
 * Extract only verified businesses (EOOD or ET with English name, currently active)
 * @param {Array} companies - Raw company results from findSoleOwnerCompaniesByName
 * @returns {Array} Filtered verified businesses
 */
export function extractVerifiedBusinesses(companies) {
  return companies.filter(company => {
    // Rule 1: Must have valid English name
    if (!hasValidEnglishName(company.englishName)) {
      return false;
    }
    
    // Rule 2: Must be EOOD or ET (with English name)
    if (!isEOODorET(company.legalForm)) {
      return false;
    }
    
    // Rule 3: Must be numeric EIK (no hashed IDs)
    if (!isNumericEik(company.eik)) {
      return false;
    }
    
    // Rule 4: Must have company name
    if (!company.companyName || company.companyName.trim() === "") {
      return false;
    }
    
    // Rule 5: If source is from relationships, it should already be filtered
    // for isActive=true in extractSoleOwnerCompanyEIKsFromRelationships
    
    return true;
  });
}

// Export helper functions for use in workers
export { isET, isEOOD, isEOODorET, hasValidEnglishName, mapBusinessStructureEn };
