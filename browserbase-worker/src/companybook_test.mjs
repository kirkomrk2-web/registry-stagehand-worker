// companybook_test.mjs - Simple CLI to test CompanyBook people search and sole owner extraction
import { findSoleOwnerCompaniesByName } from "./companybook.mjs";

function getArgValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return null;
}

const name = getArgValue("--name") || "Асен Митков Асенов";

(async () => {
  try {
    console.log(`[INFO] Querying CompanyBook for: ${name}`);
    const results = await findSoleOwnerCompaniesByName(name, { limit: 5 });
    console.log(`[INFO] Found ${results.length} sole-owner companies via CompanyBook`);
    for (const r of results) {
      console.log(`- EIK=${r.eik || "?"} | ${r.companyName || "(no name)"} | source=${r.source}`);
    }
  } catch (e) {
    console.error("[ERROR] CompanyBook test failed:", e?.message || e);
    process.exit(1);
  }
})();
