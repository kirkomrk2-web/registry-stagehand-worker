// registryLocalWorker.mjs
// Local (no Browserbase, no proxies) Puppeteer worker that queries the Bulgarian Registry portal
// and writes results to Supabase. It mirrors the Stagehand worker logic but runs a local Chrome/Chromium.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import puppeteer from "puppeteer";
import {
  findSoleOwnerCompaniesByName,
  extractVerifiedBusinesses,
  calculateDataQualityScore,
  isET,
  mapBusinessStructureEn,
} from "./companybook.mjs";

// ---------- CONFIG / CONSTANTS ----------
const POLL_INTERVAL_MS = 10_000;
const TOO_MANY_MATCHES_THRESHOLD = 100; // >100 → too_many_matches
const MAX_COMPANIES_TO_COLLECT = 10;
const MAX_PAGES_TO_SCAN = 5;
const GUESSED_PAGE_SIZE = 25; // as observed on the portal

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  REGISTRY_BASE_URL,
  LOCAL_CHROME_PATH,
  USE_COMPANYBOOK,
  COMPANYBOOK_ONLY,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[ERROR] Missing Supabase env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}
if (!REGISTRY_BASE_URL) {
  console.error("[ERROR] Missing REGISTRY_BASE_URL env var (should end with '?name=').\nExample: https://portal.registryagency.bg/CR/Reports/VerificationPersonOrg?name=");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- Puppeteer Launch Helpers ----------
function findLocalChromePath() {
  const candidates = [
    LOCAL_CHROME_PATH && LOCAL_CHROME_PATH.trim(),
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

async function launchBrowser() {
  const launchOpts = {
    headless: true,
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--window-size=1280,800",
    ],
  };

  // If user provided LOCAL_CHROME_PATH, honor it; otherwise use Puppeteer's bundled Chromium
  if (LOCAL_CHROME_PATH && LOCAL_CHROME_PATH.trim()) {
    launchOpts.executablePath = LOCAL_CHROME_PATH.trim();
    console.log(`[INFO] Using LOCAL_CHROME_PATH: ${launchOpts.executablePath}`);
  } else {
    try {
      // Puppeteer provides an executablePath() helper in recent versions
      const bundledPath = puppeteer.executablePath?.();
      if (bundledPath) {
        launchOpts.executablePath = bundledPath;
        console.log(`[INFO] Using Puppeteer's bundled Chromium: ${bundledPath}`);
      } else {
        console.log("[INFO] Launching with Puppeteer's default browser (bundled)");
      }
    } catch (_) {
      console.log("[INFO] Launching with Puppeteer's default browser (bundled)");
    }
  }

  const browser = await puppeteer.launch(launchOpts);
  const page = (await browser.pages())[0] || (await browser.newPage());
  return { browser, page };
}

// ------ Utility: sleep ------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ------ Address parsing helper ------
/**
 * Parse Bulgarian address from CompanyBook format
 * Example: "БЪЛГАРИЯ, Плевен, Плевен, гр. Плевен, 5800"
 * Returns: { street_en, city_en, region_en, country_en, postal_code }
 */
function parseAddress(fullAddress) {
  if (!fullAddress || typeof fullAddress !== 'string') {
    return { street_en: null, city_en: null, region_en: null, country_en: 'Bulgaria', postal_code: null };
  }

  const parts = fullAddress.split(',').map(p => p.trim());
  
  // Extract postal code (typically 4-5 digits at the end)
  let postal_code = null;
  const lastPart = parts[parts.length - 1];
  if (lastPart && /^\d{4,5}$/.test(lastPart)) {
    postal_code = lastPart;
    parts.pop(); // Remove postal code from parts
  }

  // Country is typically first (БЪЛГАРИЯ, България, etc.)
  let country_en = 'Bulgaria';
  if (parts[0] && (parts[0].toLowerCase().includes('бълг') || parts[0].toLowerCase() === 'bulgaria')) {
    parts.shift(); // Remove country from parts
  }

  // Remaining structure is typically: Region, District, Municipality, Settlement/Street
  let region_en = null;
  let city_en = null;
  let street_en = null;

  if (parts.length >= 1) {
    region_en = parts[0]; // First part is usually region
  }
  
  if (parts.length >= 2) {
    // Second part is usually district, skip it or use as fallback
  }
  
  if (parts.length >= 3) {
    // Look for city indicators: гр. (grad/city), с. (selo/village), ж.к. (residential area)
    const cityPart = parts[parts.length - 1]; // Last part often contains city
    if (cityPart) {
      // Remove prefixes like "гр.", "с.", "ж.к."
      city_en = cityPart
        .replace(/^(гр\.|с\.|ж\.к\.|кв\.|bl\.|str\.)\s*/i, '')
        .trim();
    }
  }

  // If we have remaining parts, they might be street info
  if (parts.length > 3) {
    const middleParts = parts.slice(2, -1);
    if (middleParts.length > 0) {
      street_en = middleParts.join(', ');
    }
  }

  return {
    street_en,
    city_en,
    region_en,
    country_en,
    postal_code
  };
}

/**
 * Generate VAT number from EIK
 * Format: "BG" + EIK
 */
function generateVATNumber(eik) {
  if (!eik) return null;
  return `BG${eik}`;
}

/**
 * Generate email alias from English business name
 * Pattern: {businessname}@33mailbox.com (NO hyphens, NO spaces)
 */
function generateEmailAlias(businessNameEn) {
  if (!businessNameEn) return null;
  
  // Convert to lowercase, remove ALL special chars (including spaces and hyphens)
  const cleanName = businessNameEn
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')     // Remove everything except letters and numbers
    .trim();
  
  if (!cleanName) return null;
  
  return `${cleanName}@33mailbox.com`;
}

/**
 * Parse owner name into first and last name (English)
 * Bulgarian names: "Асен Митков Асенов" → first: "Asen", last: "Asenov"
 * Assumes: FirstName MiddleName LastName format
 */
function parseOwnerName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { first_name: null, last_name: null };
  }
  
  // For now, we'll use transliteration mapping (simplified)
  // In production, you might use a proper transliteration library
  const transliterationMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh', 'з': 'z', 
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
    'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
    'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': 'y', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ж': 'Zh', 'З': 'Z',
    'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P',
    'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch',
    'Ш': 'Sh', 'Щ': 'Sht', 'Ъ': 'A', 'Ь': 'Y', 'Ю': 'Yu', 'Я': 'Ya'
  };
  
  function transliterate(text) {
    return text.split('').map(char => transliterationMap[char] || char).join('');
  }
  
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) {
    return { first_name: null, last_name: null };
  } else if (parts.length === 1) {
    return { first_name: transliterate(parts[0]), last_name: null };
  } else if (parts.length === 2) {
    return { first_name: transliterate(parts[0]), last_name: transliterate(parts[1]) };
  } else {
    // Three or more parts: FirstName MiddleName(s) LastName
    return { 
      first_name: transliterate(parts[0]), 
      last_name: transliterate(parts[parts.length - 1]) 
    };
  }
}

/**
 * Assign an available phone number from the SMS pool
 * Returns: { phone_number, sms_number_url, sms_country_code } or null if none available
 */
async function assignPhoneNumber(profileId) {
  try {
    // Find first available phone number
    const { data: availablePhone, error: fetchError } = await supabase
      .from('sms_numbers_pool')
      .select('*')
      .eq('status', 'available')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (fetchError || !availablePhone) {
      console.warn('[WARN] No available phone numbers in pool');
      return null;
    }

    // Mark as assigned
    const { error: updateError } = await supabase
      .from('sms_numbers_pool')
      .update({
        status: 'assigned',
        assigned_to: profileId,
        assigned_at: new Date().toISOString()
      })
      .eq('id', availablePhone.id);

    if (updateError) {
      console.warn('[WARN] Failed to mark phone as assigned:', updateError.message);
      return null;
    }

    console.log(`[INFO] Assigned phone ${availablePhone.phone_number} to profile ${profileId}`);
    
    return {
      phone_number: availablePhone.phone_number,
      sms_number_url: availablePhone.sms_url,
      sms_country_code: availablePhone.country_code
    };
  } catch (e) {
    console.warn('[WARN] Exception in assignPhoneNumber:', e.message);
    return null;
  }
}

// ------ Name normalization and matching (strict, order preserved) ------
function normalizeNameStrict(str) {
  return (str || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\"''„""]/g, "")
    .replace(/\./g, "")
    .replace(/[^a-zа-я0-9\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function namesAreExactMatch(a, b) {
  const n1 = normalizeNameStrict(a);
  const n2 = normalizeNameStrict(b);
  return n1.length > 0 && n1 === n2;
}

function checkForRateLimitMessage(bodyText) {
  if (!bodyText) return false;
  return (
    bodyText.includes("Reached maximum number of requests to the system") ||
    bodyText.includes("Достигнут е максимален брой заявки към системата")
  );
}

// ------ Page parsers ------
async function getMatchCountFromPage(page) {
  await sleep(1500);
  try {
    const { resultTexts, bodyText } = await page.evaluate(() => {
      try {
        const resultTexts = Array.from(
          document.querySelectorAll("div.result-count")
        )
          .map((el) => (el.textContent || "").trim())
          .filter(Boolean);
        const bodyText = document.body?.innerText || "";
        return { resultTexts, bodyText };
      } catch (e) {
        return { resultTexts: [], bodyText: "" };
      }
    });

    let count = 0;
    if (resultTexts && resultTexts.length) {
      const joined = resultTexts.join(" ");
      const mBg = joined.match(/Общо:\s*(\d+)/);
      const mEn = joined.match(/Total:\s*(\d+)/);
      const n = (mBg && mBg[1]) || (mEn && mEn[1]);
      if (n) count = parseInt(n, 10);
    }

    if (!count && bodyText) {
      const mBg = bodyText.match(/Общо:\s*(\d+)/);
      const mEn = bodyText.match(/Total:\s*(\d+)/);
      const n = (mBg && mBg[1]) || (mEn && mEn[1]);
      if (n) count = parseInt(n, 10);
    }

    return Number.isFinite(count) ? count : 0;
  } catch (e) {
    console.log("[ERROR] getMatchCountFromPage:", e.message || e);
    return 0;
  }
}

async function extractCompaniesFromCurrentPage(page, fullName) {
  // expand all details toggles, if present
  try {
    // encourage lazy content to render
    await page.evaluate(() => {
      try { window.scrollTo(0, 0); } catch(_) {}
      try { window.scrollTo(0, document.body.scrollHeight); } catch(_) {}
    });
    await page.evaluate(() => {
      try {
        const tableBlock = document.querySelector("div.table-responsive-block");
        if (!tableBlock) return;
        const selectors = [
          "td.toggle-collapse button",
          "button.system-button",
          "button[data-bs-target]",
          "button[data-target]",
          "button[aria-controls]",
          'a[role="button"][data-bs-target]',
          'a[role="button"][data-target]',
          'a[data-bs-toggle="collapse"]',
        ];
        const buttons = Array.from(tableBlock.querySelectorAll(selectors.join(", ")));
        for (const el of buttons) {
          if (el instanceof HTMLElement) {
            try { el.scrollIntoView({ block: "center" }); } catch (_) {}
            el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
            el.click();
          }
        }
        // Fallback: click header rows to toggle
        const headers = Array.from(tableBlock.querySelectorAll("tbody tr:not(.collapsible-row)"));
        for (const h of headers) {
          try {
            if (h instanceof HTMLElement) {
              h.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            }
          } catch (_) {}
        }
        // Force expand any Bootstrap collapses and hidden rows
        const collapses = Array.from(tableBlock.querySelectorAll(".collapse"));
        for (const c of collapses) {
          c.classList.add("show");
          if (c instanceof HTMLElement) c.style.removeProperty("display");
        }
        const collRows = Array.from(tableBlock.querySelectorAll("tr.collapsible-row"));
        for (const r of collRows) {
          if (r instanceof HTMLElement) {
            r.style.display = "table-row";
            r.classList.add("show");
          }
        }
      } catch (_) {}
    });
  } catch (e) {
    console.error("[ERROR] expand buttons:", e.message);
  }

  await sleep(2000);

  const { companies, debugInfo } = await page.evaluate(({ fullName }) => {
    function normalizeStrict(str) {
      return (str || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[\"''„""]/g, "")
        .replace(/\./g, "")
        .replace(/[^a-zа-я0-9\s]/gi, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    const results = [];
    const debugInfo = {
      headerBlocksFound: 0,
      headerBlocksMatched: 0,
      collapsibleRowsProcessed: 0,
      companiesExtracted: 0,
    };

    const tableBlock = document.querySelector("div.table-responsive-block");
    if (!tableBlock) return { companies: [], debugInfo };
    const tbody = tableBlock.querySelector("tbody");
    if (!tbody) return { companies: [], debugInfo };

    const rows = Array.from(tbody.querySelectorAll("tr"));
    const normalizedFullName = normalizeStrict(fullName);

    for (let i = 0; i < rows.length - 1; i++) {
      const headerRow = rows[i];
      const collapsibleRow = rows[i + 1];
      if (!collapsibleRow.classList.contains("collapsible-row")) continue;
      debugInfo.headerBlocksFound++;

      const nameCell = headerRow.querySelector("td:last-child");
      const nameText = nameCell
        ? (nameCell.innerText || nameCell.textContent || "")
        : (headerRow.innerText || headerRow.textContent || "");
      const normalizedRowName = normalizeStrict(nameText);
      if (normalizedRowName !== normalizedFullName) continue;
      debugInfo.headerBlocksMatched++;

      const innerTable = collapsibleRow.querySelector("table.inner-table, table.table, table");
      if (!innerTable) continue;
      debugInfo.collapsibleRowsProcessed++;

      const innerRows = Array.from(innerTable.querySelectorAll("tbody tr"));
      for (const innerRow of innerRows) {
        const labelTd = innerRow.querySelector("td:first-child");
        const valueTd = innerRow.querySelector("td:nth-child(2)");
        if (!labelTd || !valueTd) continue;

        const labelText = (labelTd.innerText || labelTd.textContent || "")
          .replace(/\u00a0/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

        const isOwner23 =
          labelText.startsWith("23.") ||
          labelText.includes("sole owner of the capital") ||
          labelText.includes("собственик на капитала");
        if (!isOwner23) continue;

        // Find the company link and UIC in a more tolerant way
        const link =
          valueTd.querySelector('a[href*="ActiveConditionTabResult"]') ||
          valueTd.querySelector('a[href*="uic="]') ||
          valueTd.querySelector('a[href*="UIC="]') ||
          valueTd.querySelector('a');
        const href = (link && link.getAttribute("href")) || "";
        const companyName = link ? (link.textContent || "").trim() : (valueTd.innerText || valueTd.textContent || "").trim();

        let eik = null;
        let m = href.match(/uic=(\d{8,13})/i);
        if (m) eik = m[1];
        if (!eik) {
          const text = (valueTd.innerText || valueTd.textContent || "").replace(/\s+/g, " ");
          const m2 =
            text.match(/UIC\/?PIC\s*(\d{8,13})/i) ||
            text.match(/ЕИК\/?ПИК\s*(\d{8,13})/i) ||
            text.match(/\b(\d{9})\b/);
          if (m2) eik = m2[1];
        }

        const rowText = (innerRow.innerText || innerRow.textContent || "")
          .replace(/\s+/g, " ")
          .trim();

        results.push({ eik, href, rawText: rowText, companyName });
        debugInfo.companiesExtracted++;
      }
    }

    const seen = new Set();
    const deduped = results.filter((c) => {
      const key = (c.eik || "") + "|" + (c.href || "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { companies: deduped, debugInfo };
  }, { fullName });

  if (debugInfo) console.log("[DEBUG] Extraction info:", debugInfo);
  console.log(`[INFO] Extracted ${companies.length} companies for "${fullName}" on current page.`);
  return companies;
}

// Provide detailed explanations for why matched headers did or did not yield companies
async function explainMatchesOnPage(page, fullName) {
  const debugBlocks = await page.evaluate(({ fullName }) => {
    function normalizeStrict(str) {
      return (str || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[\"''„""]/g, "")
        .replace(/\./g, "")
        .replace(/[^a-zа-я0-9\s]/gi, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }
    function sortedTokens(str) {
      return normalizeStrict(str).split(" ").filter(Boolean).sort().join(" ");
    }

    const tableBlock = document.querySelector("div.table-responsive-block");
    if (!tableBlock) return [];
    const tbody = tableBlock.querySelector("tbody");
    if (!tbody) return [];

    const rows = Array.from(tbody.querySelectorAll("tr"));
    const normalizedFullName = normalizeStrict(fullName);
    const tokenBagFullName = sortedTokens(fullName);

    const blocks = [];
    for (let i = 0; i < rows.length - 1; i++) {
      const headerRow = rows[i];
      const collapsibleRow = rows[i + 1];
      if (!collapsibleRow.classList.contains("collapsible-row")) continue;

      const nameCell = headerRow.querySelector("td:last-child");
      const nameText = nameCell
        ? (nameCell.innerText || nameCell.textContent || "")
        : (headerRow.innerText || headerRow.textContent || "");
      const normalizedRowName = normalizeStrict(nameText);
      const tokenBagRow = sortedTokens(nameText);
      const matched = normalizedRowName === normalizedFullName;
      const tokenPermutation = !matched && tokenBagRow === tokenBagFullName;

      const innerTable = collapsibleRow.querySelector("table.inner-table, table.table, table");
      const alertEl = collapsibleRow.querySelector(".alert, .alert-info, .alert-warning");
      const alertText = (alertEl?.innerText || alertEl?.textContent || "").trim();
      const noData = /No data found/i.test(alertText) || /Няма данни/i.test(alertText);

      let owner23Count = 0;
      let eikWithLinkCount = 0;
      if (innerTable) {
        const innerRows = Array.from(innerTable.querySelectorAll("tbody tr"));
        for (const innerRow of innerRows) {
          const labelTd = innerRow.querySelector("td:first-child");
          const valueTd = innerRow.querySelector("td:nth-child(2)");
          if (!labelTd || !valueTd) continue;
          const labelText = (labelTd.innerText || labelTd.textContent || "")
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
          const isOwner23 =
            labelText.startsWith("23.") ||
            labelText.includes("sole owner of the capital") ||
            labelText.includes("собственик на капитала");
          if (isOwner23) {
            owner23Count++;
            const link = valueTd.querySelector('a[href*="ActiveConditionTabResult"]');
            if (link) {
              const href = link.getAttribute("href") || "";
              if (/uic=(\d+)/.test(href)) eikWithLinkCount++;
            }
          }
        }
      }

      let reason = matched ? "OK" : "Name mismatch (strict order)";
      if (!matched && tokenPermutation) reason = "Name tokens match but order differs (strict policy)";
      if (matched) {
        if (!innerTable && noData) reason = "No data found in this entry";
        else if (!innerTable) reason = "Collapsible content missing (possibly not expanded yet)";
        else if (owner23Count === 0) reason = "No '23. Sole owner of the capital' entries under this name";
        else if (eikWithLinkCount === 0) reason = "Owner 23 row(s) missing company link with UIC";
      }

      blocks.push({
        headerIndex: i,
        nameText: nameText.trim(),
        matched,
        tokenPermutation,
        innerTablePresent: !!innerTable,
        noDataFound: !!noData,
        owner23Count,
        eikWithLinkCount,
        reason,
      });
    }

    return blocks;
  }, { fullName });

  // Pretty-print explanations
  if (debugBlocks && debugBlocks.length) {
    console.log("[DETAIL] Header explanations for:", fullName);
    for (const b of debugBlocks) {
      console.log(
        `  - #${b.headerIndex + 1} name=\"${b.nameText}\" | matched=${b.matched} | tokensPerm=${b.tokenPermutation} | innerTable=${b.innerTablePresent} | noData=${b.noDataFound} | 23.count=${b.owner23Count} | 23.withUIC=${b.eikWithLinkCount} | reason=${b.reason}`
      );
    }
  } else {
    console.log("[DETAIL] No headers to explain for:", fullName);
  }

  return debugBlocks;
}

async function collectCompaniesAcrossPages(page, baseSearchUrl, fullName, matchCount) {
  const collected = [];
  const seen = new Set();
  const maxPagesByCount = Math.ceil(matchCount / GUESSED_PAGE_SIZE);
  const maxPages = Math.min(MAX_PAGES_TO_SCAN, maxPagesByCount || 1);

  console.log(`[INFO] Will scan up to ${maxPages} pages (matchCount=${matchCount}).`);

  for (let pageIndex = 1; pageIndex <= maxPages; pageIndex++) {
    let pageUrl = baseSearchUrl;
    if (pageUrl.includes("page=")) {
      pageUrl = pageUrl.replace(/([?&]page=)\d+/i, `$1${pageIndex}`);
    } else {
      pageUrl += (pageUrl.includes("?") ? "&" : "?") + `page=${pageIndex}`;
    }

    if (pageIndex > 1) {
      await page.goto(pageUrl, { waitUntil: "networkidle0" });
    }

    const companiesOnPage = await extractCompaniesFromCurrentPage(page, fullName);
    await explainMatchesOnPage(page, fullName);
    for (const c of companiesOnPage) {
      const key = (c.eik || "") + "|" + (c.href || "");
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(c);
      if (collected.length >= MAX_COMPANIES_TO_COLLECT) break;
    }

    console.log(`[INFO] Collected so far: ${collected.length}/${MAX_COMPANIES_TO_COLLECT}`);
    if (collected.length >= MAX_COMPANIES_TO_COLLECT) break;
  }

  console.log(`[INFO] Total collected for "${fullName}": ${collected.length}`);
  return collected;
}

// ------ Core user processing ------
async function processUser(page, user) {
  const fullName = (user.full_name || "").trim();
  if (!fullName) {
    console.error("[ERROR] User has no full_name, skipping:", user.id);
    await supabase.from("users_pending").update({ status: "error" }).eq("id", user.id);
    return;
  }

  console.log(`\n[INFO] ========== Processing: "${fullName}" ==========`);

  // COMPANYBOOK_ONLY mode skips Trade Register completely
  const cbOnly = String(COMPANYBOOK_ONLY || "").toLowerCase() === "true";
  let matchCount = 0;
  let companies = [];
  let isRateLimited = false;
  let lastError = null;

  if (cbOnly) {
    try {
      console.log("[INFO] COMPANYBOOK_ONLY mode enabled – querying CompanyBook only...");
      const cb = await findSoleOwnerCompaniesByName(fullName, { limit: 20 });
      companies = (cb || []).map((r) => ({
        eik: r.eik || null,
        companyName: r.companyName || null,
        legalForm: r.legalForm || null,
        englishName: r.englishName || "none",
        businessStructureEn: r.businessStructureEn || null,
        address: r.address || null,
        incorporationDate: r.incorporationDate || null,
        source: r.source || "companybook",
      }));
      matchCount = companies.length;
    } catch (e) {
      console.error("[ERROR] CompanyBook-only query failed:", e?.message || e);
      lastError = e;
    }
  } else {
    const searchUrl = `${REGISTRY_BASE_URL}${encodeURIComponent(fullName)}`;
    console.log(`[INFO] Search URL: ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: "networkidle0" });

      const bodyText = await page.evaluate(() => document.body?.innerText || "");
      if (checkForRateLimitMessage(bodyText)) {
        console.warn("[WARN] Rate limit message detected");
        isRateLimited = true;
      } else {
        matchCount = await getMatchCountFromPage(page);
        console.log(`[INFO] Match count: ${matchCount}`);

        if (matchCount > 0 && matchCount <= TOO_MANY_MATCHES_THRESHOLD) {
          companies = await collectCompaniesAcrossPages(page, searchUrl, fullName, matchCount);
        } else {
          companies = [];
        }

        // Optional: augment via CompanyBook API
        if (String(USE_COMPANYBOOK || "").toLowerCase() === "true") {
          try {
            const cb = await findSoleOwnerCompaniesByName(fullName, { limit: 10 });
            if (Array.isArray(cb) && cb.length) {
              const seen = new Set(companies.map((c) => `${c.eik || ""}|${c.companyName || ""}`));
              for (const r of cb) {
                const key = `${r.eik || ""}|${r.companyName || ""}`;
                if (seen.has(key)) continue;
                seen.add(key);
                companies.push({
                  eik: r.eik || null,
                  companyName: r.companyName || null,
                  legalForm: r.legalForm || null,
                  englishName: r.englishName || "none",
                  source: r.source || "companybook",
                });
              }
            }
          } catch (e) {
            console.warn("[WARN] CompanyBook fallback failed:", e?.message || e);
          }
        }

        // collect detailed explanations for why items may or may not be counted
        var explanations = await explainMatchesOnPage(page, fullName);
      }
    } catch (e) {
      console.error("[ERROR] Navigation/processing error:", e.message || e);
      lastError = e;
    }
  }

  if (isRateLimited) {
    await supabase.from("users_pending").update({ status: "rate_limited" }).eq("id", user.id);
    console.log(`[INFO] ========== Done (rate_limited) ==========`);
    return;
  }

  if (lastError) {
    await supabase.from("users_pending").update({ status: "error" }).eq("id", user.id);
    console.log(`[INFO] ========== Done (error) ==========`);
    return;
  }

  let status;
  if (matchCount === 0) {
    status = "no_match";
  } else if (matchCount > TOO_MANY_MATCHES_THRESHOLD) {
    status = "too_many_matches";
    companies = [];
  } else {
    status = "checked";
  }

  const registryPayload = {
    email: user.email,
    full_name: fullName,
    match_count: matchCount,
    any_match: matchCount > 0,
    companies,
  };

  // Insert and return id so we can optionally populate new columns if they exist
  const { data: inserted, error: insertError } = await supabase
    .from("user_registry_checks")
    .insert(registryPayload)
    .select("id")
    .single();

  if (insertError) {
    console.error("[ERROR] Error inserting into user_registry_checks:", insertError);
  } else {
    console.log(
      `[INFO] Inserted registry check: matches=${matchCount}, companies=${companies.length}`
    );

    // Optionally populate top-level JSONB arrays if columns exist (best-effort)
    try {
      const english_names = companies.map((c) => c.englishName || "none");
      const legal_forms_bg = companies.map((c) => c.legalForm || null);
      const business_structures_en = companies.map((c) => c.businessStructureEn || null);
      const addresses = companies.map((c) => c.address || null);
      const incorporation_dates = companies.map((c) => c.incorporationDate || null);

      if (inserted?.id) {
        const { error: updateErr } = await supabase
          .from("user_registry_checks")
          .update({
            english_names,
            legal_forms_bg,
            business_structures_en,
            addresses,
            incorporation_dates,
            source: "companybook",
          })
          .eq("id", inserted.id);
        if (updateErr) {
          // Column may not exist yet; log and continue
          console.warn("[WARN] Could not update enriched top-level columns:", updateErr?.message || updateErr);
        } else {
          console.log("[INFO] Enriched top-level columns updated for check id:", inserted.id);
        }
      }
    } catch (e) {
      console.warn("[WARN] Enrichment update skipped:", e?.message || e);
    }
  }

  await supabase.from("users_pending").update({ status }).eq("id", user.id);
  
  // Post-processing: Populate verified_business_profiles for successful checks
  if (status === "checked" && companies.length > 0) {
    try {
      console.log(`[INFO] Extracting verified businesses for "${fullName}"...`);
      const verified = extractVerifiedBusinesses(companies);
      console.log(`[INFO] Found ${verified.length} verified businesses (EOOD/ET with English names)`);
      
      // Insert verified profiles with address parsing and phone assignment
      let verifiedCount = 0;
      for (const biz of verified) {
        try {
          // Parse address into components
          const addressParts = parseAddress(biz.address);
          
          // Generate VAT number
          const vatNumber = generateVATNumber(biz.eik);
          
          // Generate email alias
          const emailAlias = generateEmailAlias(biz.englishName);
          
          // Parse owner name
          const ownerNames = parseOwnerName(fullName);
          
          // First, upsert the profile and get its ID
          const { data: profile, error: upsertError } = await supabase
            .from("verified_business_profiles")
            .upsert(
              {
                eik: biz.eik,
                vat_number: vatNumber,
                business_name_bg: biz.companyName,
                business_name_en: biz.englishName,
                legal_form_bg: biz.legalForm,
                business_structure_en: biz.businessStructureEn || mapBusinessStructureEn(biz.legalForm),
                entity_type: isET(biz.legalForm) ? "ET" : "EOOD",
                full_address: biz.address,
                street_en: addressParts.street_en,
                city_en: addressParts.city_en,
                region_en: addressParts.region_en,
                country_en: addressParts.country_en,
                postal_code: addressParts.postal_code,
                email_alias_33mail: emailAlias,
                email_alias_hostinger: 'admin@wallesters.com', // Central receiving mailbox
                email_forwarding_active: false, // User needs to configure 33mail forwarding
                incorporation_date: biz.incorporationDate,
                is_active: true,
                current_owner_name: fullName,
                owner_first_name_en: ownerNames.first_name,
                owner_last_name_en: ownerNames.last_name,
                current_owner_ident: null,
                source: biz.source || "companybook",
                data_quality_score: calculateDataQualityScore(biz),
                companies_jsonb: biz,
                last_checked_at: new Date().toISOString(),
              },
              { onConflict: "eik" }
            )
            .select('id, phone_number')
            .single();
          
          if (upsertError) {
            console.warn(`[WARN] Failed to upsert verified profile ${biz.eik}:`, upsertError.message);
            continue;
          }
          
          verifiedCount++;
          console.log(`[INFO] Upserted profile ${biz.eik}: ${biz.englishName} | Address parsed: city=${addressParts.city_en}, region=${addressParts.region_en}, postal=${addressParts.postal_code}`);
          
          // Assign phone number if profile doesn't have one yet
          if (profile?.id && !profile.phone_number) {
            const phoneData = await assignPhoneNumber(profile.id);
            if (phoneData) {
              const { error: phoneUpdateError } = await supabase
                .from("verified_business_profiles")
                .update({
                  phone_number: phoneData.phone_number,
                  sms_number_url: phoneData.sms_number_url,
                  sms_country_code: phoneData.sms_country_code
                })
                .eq('id', profile.id);
              
              if (phoneUpdateError) {
                console.warn(`[WARN] Failed to update phone for profile ${biz.eik}:`, phoneUpdateError.message);
              }
            }
          }
        } catch (e) {
          console.warn(`[WARN] Exception upserting verified profile ${biz.eik}:`, e.message);
        }
      }
      
      console.log(`[INFO] Successfully upserted ${verifiedCount}/${verified.length} verified profiles`);
    } catch (e) {
      console.warn("[WARN] Failed to populate verified profiles:", e.message);
      // Don't fail the whole operation, just log it
    }
  }
  
  console.log(`[INFO] ========== Done (status=${status}) ==========`);
}

// ------ Poll loop ------
let isRunning = false;

async function checkPendingUsers(page) {
  if (isRunning) {
    console.log("[INFO] Previous run still in progress, skipping.");
    return;
  }
  isRunning = true;
  try {
    console.log("[INFO] Checking for pending users...");
    const { data: users, error } = await supabase
      .from("users_pending")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      console.error("[ERROR] Supabase fetch error:", error);
      return;
    }

    if (!users || users.length === 0) {
      console.log("[INFO] No pending users at this moment.");
      return;
    }

    const user = users[0];
    await processUser(page, user);
  } catch (e) {
    console.error("[ERROR] checkPendingUsers unexpected:", e);
  } finally {
    isRunning = false;
  }
}

// ------ Main ------
const cbOnlyMain = String(COMPANYBOOK_ONLY || "").toLowerCase() === "true";
let browser = null;
let page = null;
if (!cbOnlyMain) {
  const launched = await launchBrowser();
  browser = launched.browser;
  page = launched.page;
}

// Single-run mode: allow `--name "<FULL_NAME>"`
function getArgValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return null;
}
const singleName = getArgValue("--name");

if (singleName) {
  console.log(`[INFO] Single-run mode for name: ${singleName}`);
  const fakeUser = { id: "manual", email: "manual@local", full_name: singleName };
  await processUser(page, fakeUser);
  try { if (browser) await browser.close(); } catch(_) {}
  process.exit(0);
}

console.log("[INFO] Local worker started. Running poll loop...");
await checkPendingUsers(page);
const intervalId = setInterval(() => {
  checkPendingUsers(page);
}, POLL_INTERVAL_MS);

process.on("SIGINT", async () => {
  console.log("\n[INFO] Shutting down gracefully...");
  try {
    clearInterval(intervalId);
    if (browser) await browser.close();
  } catch (e) {
    console.error("[ERROR] Error while closing browser:", e);
  }
  process.exit(0);
});
