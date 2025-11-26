// companybook_debug.mjs - Inspect CompanyBook API payloads for a given name
const BASE = process.env.COMPANYBOOK_BASE_URL?.trim() || "https://api.companybook.bg/api";

function j(obj) { return JSON.stringify(obj, null, 2); }

async function peopleSearchByName(name, limit = 5) {
  const url = new URL("/api/people/search", BASE);
  url.searchParams.set("name", name);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`people/search ${res.status}`);
  return res.json();
}
async function getPerson(indent) {
  const url = new URL(`/api/people/${encodeURIComponent(indent)}` , BASE);
  url.searchParams.set("with_data", "true");
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`people/:indent ${res.status}`);
  return res.json();
}
async function getRelationships(identifier) {
  const url = new URL(`/api/relationships/${encodeURIComponent(identifier)}`, BASE);
  url.searchParams.set("type", "ownership");
  url.searchParams.set("depth", "2");
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`relationships ${res.status}`);
  return res.json();
}

function briefKeys(obj, depth = 2) {
  if (depth <= 0 || obj == null) return typeof obj;
  if (Array.isArray(obj)) return `[${obj.length}] -> ${obj.slice(0,3).map(o=>briefKeys(o, depth-1)).join(', ')}`;
  const out = {};
  for (const [k,v] of Object.entries(obj)) {
    out[k] = typeof v === 'object' ? (Array.isArray(v) ? `array(${v.length})` : 'object') : typeof v;
  }
  return out;
}

function printSamplePerson(person) {
  const pcs = person?.personCompanies || [];
  console.log(`[DEBUG] personCompanies length=${pcs.length}`);
  for (const pc of pcs.slice(0,5)) {
    console.log("[DEBUG] personCompany keys:", Object.keys(pc));
    console.log("[DEBUG] personCompany snippet:", j({
      uic: pc.uic,
      name: pc.company_name?.name || pc.company_name,
      legalForm: pc.legalForm || pc.company_name?.legalForm,
      transliteration: pc.transliteration || pc.company_name?.transliteration,
      roles: pc.roles?.map(r=>r.position)
    }));
  }
}

(async () => {
  const name = process.argv.slice(2).join(' ') || 'Асен Митков Асенов';
  try {
    console.log(`[INFO] Searching people: ${name}`);
    const s = await peopleSearchByName(name, 10);
    console.log('[DEBUG] people/search keys:', Object.keys(s));
    console.log('[DEBUG] first results sample:', j(s.results?.slice(0,3)));
    const target = (s.results || [])[0];
    if (!target) { console.log('[WARN] No people results'); process.exit(0); }
    console.log('[INFO] Inspecting person indent:', target.indent);
    const p = await getPerson(target.indent);
    console.log('[DEBUG] person keys:', Object.keys(p));
    printSamplePerson(p);
    const rel = await getRelationships(target.indent);
    console.log('[DEBUG] relationships keys:', Object.keys(rel));
    console.log('[DEBUG] relationships first 3:', j(rel.relationships?.slice(0,3)));
  } catch (e) {
    console.error('[ERROR] Debug failed:', e?.message || e);
    process.exit(1);
  }
})();
