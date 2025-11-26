import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findSoleOwnerCompaniesByName, getCompany } from "./companybook.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.resolve(__dirname, "../logs/companybook_raw");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const names = process.argv.slice(2);
if (!names.length) {
  console.error("Usage: node src/companybook_raw_dump.mjs 'Full Name' [More names...]");
  process.exit(1);
}

function slugify(str) {
  return str
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "unknown";
}

for (const fullName of names) {
  console.log("\n" + "=".repeat(80));
  console.log(`RAW DUMP FOR: ${fullName}`);
  console.log("=".repeat(80));

  const safeName = slugify(fullName);
  const nameDir = path.join(LOG_DIR, safeName);
  if (!fs.existsSync(nameDir)) {
    fs.mkdirSync(nameDir, { recursive: true });
  }

  try {
    const companies = await findSoleOwnerCompaniesByName(fullName, { limit: 20 });
    console.log(`Found ${companies.length} companies in aggregated helper.`);

    const metaPath = path.join(nameDir, "summary.json");
    fs.writeFileSync(metaPath, JSON.stringify(companies, null, 2), "utf8");
    console.log(`Saved summary info to ${metaPath}`);

    for (const company of companies) {
      if (!company?.eik) {
        console.log(`- Skipping ${company?.companyName || "<no name>"} (missing EIK)`);
        continue;
      }

      try {
        const detailed = await getCompany(company.eik, { withData: true });
        const outPath = path.join(nameDir, `${company.eik}.json`);
        fs.writeFileSync(outPath, JSON.stringify(detailed, null, 2), "utf8");
        console.log(`- Saved full company payload for ${company.companyName} (${company.eik}) → ${outPath}`);
      } catch (err) {
        console.warn(`- Failed to fetch company ${company.eik}:`, err?.message || err);
      }
    }
  } catch (err) {
    console.error(`Error fetching companies for ${fullName}:`, err?.message || err);
  }
}
