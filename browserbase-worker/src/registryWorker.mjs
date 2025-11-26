// src/registryWorker.mjs
import "dotenv/config";
import puppeteer from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";
import { COLORS, BROWSER_DEFAULTS } from "../config/constants.mjs";
import { getProxiesConfig } from "../config/proxies.mjs";
import { getBrowserConfigurations } from "../config/browsers.mjs";
import { BrowserbaseClient } from "../lib/BrowserbaseClient.mjs";
import { ProxyVerifier } from "../lib/ProxyVerifier.mjs";
import { RotationQueue } from "../lib/RotationQueue.mjs";

// ---------- CONFIG ----------
const POLL_INTERVAL_MS = 10_000;
const TOO_MANY_MATCHES_THRESHOLD = 200;
const HIGH_RESULTS_MIN = 200;
const HIGH_RESULTS_MAX = 1000;
const EXTRA_WAIT_MS = 15_000;
const MAX_COMPANIES_TO_COLLECT = 10;
const MAX_PAGES_TO_SCAN = 5;
const GUESSED_PAGE_SIZE = 10;

// Navigation/retry tuning (can be overridden via .env WORKER_RETRY_* keys)
const NAV_RETRY_ATTEMPTS = parseInt(process.env.WORKER_RETRY_ATTEMPTS || "3", 10);
const NAV_RETRY_DELAY_MS = parseInt(process.env.WORKER_RETRY_DELAY || "1500", 10);
const SESSION_RETRY_ATTEMPTS = parseInt(process.env.WORKER_SESSION_RETRY_ATTEMPTS || "2", 10);

// Fingerprint tuning
const DEFAULT_UA = process.env.WORKER_UA ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_ACCEPT_LANGUAGE = process.env.WORKER_ACCEPT_LANGUAGE ||
  "bg-BG,bg;q=0.9,en-US;q=0.8,en;q=0.7";
const DEFAULT_TIMEZONE = process.env.WORKER_TIMEZONE || "Europe/Sofia";

// ---------- HELPERS ----------
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function performInteractiveSearch(page, basePageUrl, fullName) {
  try {
    await page.goto(basePageUrl, { waitUntil: "domcontentloaded" });
    // Try to find a reasonable text input for name
    const found = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
      const scored = candidates.map((el) => {
        const id = (el.id || "").toLowerCase();
        const name = (el.getAttribute("name") || "").toLowerCase();
        const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
        let score = 0;
        if (id.includes("name")) score += 3;
        if (name.includes("name")) score += 3;
        if (placeholder.includes("name") || placeholder.includes("име")) score += 2;
        const label = (el.closest("label")?.innerText || "").toLowerCase();
        if (label.includes("име") || label.includes("name")) score += 2;
        return { score, hasId: !!el.id };
      });
      let maxScore = -1; let idx = -1;
      for (let i = 0; i < scored.length; i++) {
        if (scored[i].score > maxScore) { maxScore = scored[i].score; idx = i; }
      }
      if (idx >= 0 && maxScore >= 2) {
        const el = candidates[idx];
        el.focus();
        return { ok: true, elId: el.id || null };
      }
      return { ok: false };
    });

    if (!found?.ok) return false;

    // Type full name
    await page.keyboard.down("Control");
    await page.keyboard.press("A");
    await page.keyboard.up("Control");
    await page.keyboard.type(fullName, { delay: 50 });

    // Click search-like button
    const clicked = await page.evaluate(() => {
      function hasSearchText(el) {
        const t = (el.innerText || el.textContent || "").toLowerCase();
        return t.includes("search") || t.includes("търс") || t.includes("намир");
      }
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"], a.button, a.btn'));
      for (const b of btns) {
        const type = (b.getAttribute("type") || "").toLowerCase();
        if (type === "submit" || hasSearchText(b) || b.className.toLowerCase().includes("search")) {
          (b).click();
          return true;
        }
      }
      // Try first system button as fallback
      const sysBtn = document.querySelector("button.system-button, button[type=submit]");
      if (sysBtn) { sysBtn.click(); return true; }
      return false;
    });

    if (!clicked) return false;

    try {
      await page.waitForFunction(
        () => /Total:\s*\d+/.test(document.body?.innerText || "") || !!document.querySelector("div.table-responsive-block tbody tr"),
        { timeout: 10000 }
      );
      return true;
    } catch {
      return false;
    }
  } catch (e) {
    return false;
  }
}

function isServerErrorBody(bodyText) {
  if (!bodyText) return false;
  const t = bodyText.toLowerCase();
  return t.includes("server error") || /\b50[0-9]\b/.test(t);
}

function checkForRateLimitMessage(bodyText) {
  if (!bodyText) return false;
  return (
    bodyText.includes("Reached maximum number of requests to the system") ||
    bodyText.includes("Достигнут е максимален брой заявки към системата")
  );
}

// Extract match count from portal page
async function getMatchCountFromPage(page) {
  await sleep(2000);
  try {
    const { resultTexts, bodyText } = await page.evaluate(() => {
      try {
        const resultTexts = Array.from(document.querySelectorAll("div.result-count"))
          .map((el) => (el.textContent || "").trim())
          .filter(Boolean);
        const bodyText = document.body?.innerText || "";
        return { resultTexts, bodyText };
      } catch {
        return { resultTexts: [], bodyText: "" };
      }
    });

    let count = 0;
    if (resultTexts && resultTexts.length) {
      const joined = resultTexts.join(" ");
      const matchBg = joined.match(/Общо:\s*(\d+)/);
      const matchEn = joined.match(/Total:\s*(\d+)/);
      const numStr = (matchBg && matchBg[1]) || (matchEn && matchEn[1]);
      if (numStr) count = parseInt(numStr, 10);
    }

    if (!count && bodyText) {
      const matchBgBody = bodyText.match(/Общо:\s*(\d+)/);
      const matchEnBody = bodyText.match(/Total:\s*(\d+)/);
      const numStrBody = (matchBgBody && matchBgBody[1]) || (matchEnBody && matchEnBody[1]);
      if (numStrBody) count = parseInt(numStrBody, 10);
    }

    return Number.isFinite(count) ? count : 0;
  } catch {
    return 0;
  }
}

async function extractCompaniesFromCurrentPage(page, fullName) {
  // expand all rows just in case
  try {
    await page.evaluate(() => {
      try {
        const tableBlock = document.querySelector("div.table-responsive-block");
        if (!tableBlock) return;
        const buttons = Array.from(tableBlock.querySelectorAll("td.toggle-collapse button.system-button"));
        for (const btn of buttons) btn.click();
      } catch {}
    });
  } catch {}

  await sleep(1500);

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
    const debugInfo = { headerBlocksFound: 0, headerBlocksMatched: 0, collapsibleRowsProcessed: 0, companiesExtracted: 0 };

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
      const nameText = nameCell ? (nameCell.innerText || nameCell.textContent || "") : (headerRow.innerText || headerRow.textContent || "");
      const normalizedRowName = normalizeStrict(nameText);
      if (normalizedRowName !== normalizedFullName) continue;

      debugInfo.headerBlocksMatched++;
      const innerTable = collapsibleRow.querySelector("table.inner-table");
      if (!innerTable) continue;

      debugInfo.collapsibleRowsProcessed++;
      const innerRows = Array.from(innerTable.querySelectorAll("tbody tr"));
      for (const innerRow of innerRows) {
        const labelTd = innerRow.querySelector("td:first-child");
        const valueTd = innerRow.querySelector("td:nth-child(2)");
        if (!labelTd || !valueTd) continue;

        const labelText = (labelTd.innerText || labelTd.textContent || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
        const isOwner23 = labelText.startsWith("23.") || labelText.includes("sole owner of the capital") || labelText.includes("собственик на капитала");
        if (!isOwner23) continue;

        // Try primary link for company
        let link = valueTd.querySelector('a[href*="ActiveConditionTabResult"]');
        if (!link) link = valueTd.querySelector('a');
        if (!link) continue;

        const href = link.getAttribute("href") || "";
        const companyName = (link.textContent || "").trim();
        // Prefer UIC from href, else fallback to text like "UIC/PIC 208248188" or BG equivalent
        let eik = null;
        const m = href.match(/uic=(\d+)/i);
        if (m) eik = m[1];
        if (!eik) {
          const rowText = (innerRow.innerText || innerRow.textContent || "").replace(/\s+/g, " ").trim();
          const m2 = rowText.match(/UIC\/?PIC\s*(\d{7,12})/i) || rowText.match(/ЕИК\/?ПИК\s*(\d{7,12})/i) || rowText.match(/UIC\s*(\d{7,12})/i) || rowText.match(/ЕИК\s*(\d{7,12})/i);
          if (m2) eik = m2[1];
          results.push({ eik, href, rawText: rowText, companyName });
        } else {
          const rowText = (innerRow.innerText || innerRow.textContent || "").replace(/\s+/g, " ").trim();
          results.push({ eik, href, rawText: rowText, companyName });
        }
        debugInfo.companiesExtracted++;
      }
    }

    const seen = new Set();
    const deduped = results.filter((c) => {
      const key = (c.eik || "") + "|" + (c.href || "");
      if (seen.has(key)) return false; seen.add(key); return true;
    });
    return { companies: deduped, debugInfo };
  }, { fullName });

  console.log(`[INFO] Extracted ${companies.length} companies from current page for "${fullName}".`);
  if (debugInfo && Object.keys(debugInfo).length > 0) console.log("[DEBUG] Extraction info:", debugInfo);
  return companies;
}

async function collectCompaniesAcrossPages(page, baseSearchUrl, fullName, matchCount) {
  const collected = [];
  const seen = new Set();
  const maxPagesByCount = Math.ceil(matchCount / GUESSED_PAGE_SIZE);
  const maxPages = Math.min(MAX_PAGES_TO_SCAN, maxPagesByCount || 1);
  console.log(`[INFO] Will scan up to ${maxPages} pages (matchCount=${matchCount}, pageSize=${GUESSED_PAGE_SIZE})`);

  for (let pageIndex = 1; pageIndex <= maxPages; pageIndex++) {
    let pageUrl = baseSearchUrl;
    if (pageUrl.includes("page=")) {
      pageUrl = pageUrl.replace(/([?&]page=)\d+/i, `$1${pageIndex}`);
    } else {
      pageUrl += (pageUrl.includes("?") ? "&" : "?") + `page=${pageIndex}`;
    }
    if (pageIndex > 1) {
      console.log(`[INFO] Loading page ${pageIndex}/${maxPages} for "${fullName}"`);
      await page.goto(pageUrl, { waitUntil: "networkidle2" });
    }

    const companiesOnPage = await extractCompaniesFromCurrentPage(page, fullName);
    for (const c of companiesOnPage) {
      const key = (c.eik || "") + "|" + (c.href || "");
      if (seen.has(key)) continue; seen.add(key);
      collected.push(c);
      if (collected.length >= MAX_COMPANIES_TO_COLLECT) break;
    }

    console.log(`[INFO] Collected so far: ${collected.length}/${MAX_COMPANIES_TO_COLLECT} companies for "${fullName}".`);
    if (collected.length >= MAX_COMPANIES_TO_COLLECT) break;
  }

  console.log(`[INFO] Total collected companies for "${fullName}": ${collected.length}`);
  return collected;
}

// ---------- MAIN WORKER ----------
async function runWithBrowser(client, browserConfig, fn) {
  const ses = await client.createTestSession(browserConfig, null);
  if (!ses.ok || !ses.connectUrl) {
    console.error(`${COLORS.red}[ERROR]${COLORS.reset} Could not create session`);
    return { ok: false, error: "session_create_failed" };
  }
  let browser = null;
  try {
    browser = await puppeteer.connect({ browserWSEndpoint: ses.connectUrl, defaultViewport: null });
    const pages = await browser.pages();
    const page = pages?.[0] || (await browser.newPage());
    await page.setViewport({ ...BROWSER_DEFAULTS.VIEWPORT });

    // Harden fingerprint + appear local
    try {
      await page.setUserAgent(DEFAULT_UA);
      await page.setExtraHTTPHeaders({
        "Accept-Language": DEFAULT_ACCEPT_LANGUAGE,
        "Referer": "https://portal.registryagency.bg/CR/Reports/VerificationPersonOrg",
        "Origin": "https://portal.registryagency.bg",
      });
      await page.emulateTimezone(DEFAULT_TIMEZONE);
    } catch {}

    const result = await fn(page);
    await client.releaseSession(ses.id);
    await browser.close();
    return { ok: true, result };
  } catch (e) {
    console.error(`${COLORS.red}[ERROR]${COLORS.reset} runWithBrowser:`, e?.message || e);
    try { if (ses?.id) await client.releaseSession(ses.id); } catch {}
    try { if (browser) await browser.close(); } catch {}
    return { ok: false, error: e };
  }
}

async function processUser(user, client, pageRunner, registryBaseUrl) {
  const fullName = (user.full_name || "").trim();
  if (!fullName) {
    console.error("[ERROR] User has no full_name, skipping:", user.id);
    return { status: "error", matchCount: 0, companies: [] };
  }

  console.log(`\n[INFO] ========== Processing: "${fullName}" ==========`);
  const searchUrl = `${registryBaseUrl}${encodeURIComponent(fullName)}&count=10&includeHistory=false`;
  console.log(`[INFO] Search URL: ${searchUrl}`);
  const basePageUrl = registryBaseUrl.includes("?") ? registryBaseUrl.split("?")[0] : registryBaseUrl;

  let matchCount = 0;
  let companies = [];
  let isRateLimited = false;
  let hadServerError = false;

  let runnerRes = { ok: false };
  for (let sessionAttempt = 1; sessionAttempt <= SESSION_RETRY_ATTEMPTS; sessionAttempt++) {
    hadServerError = false;
    runnerRes = await pageRunner(async (page) => {
    // Robust navigation with 5xx detection and retries
    let navOk = false;
    let lastStatus = null;
    for (let attempt = 1; attempt <= NAV_RETRY_ATTEMPTS; attempt++) {
      // Pre-warm base page to obtain cookies and proper referer/origin
      try {
        await page.goto(basePageUrl, { waitUntil: "domcontentloaded" });
        await sleep(500);
      } catch {}

      const resp = await page.goto(searchUrl, { waitUntil: "networkidle2" });
      try { lastStatus = resp && typeof resp.status === "function" ? resp.status() : null; } catch {}

      let bodyText = "";
      try { bodyText = await page.evaluate(() => document.body?.innerText || ""); } catch {}
      const serverErr = (lastStatus && lastStatus >= 500) || isServerErrorBody(bodyText);

      if (serverErr) {
        console.warn(`[WARN] Server error detected (status=${lastStatus || "n/a"}). Attempt ${attempt}/${NAV_RETRY_ATTEMPTS}`);
        if (attempt < NAV_RETRY_ATTEMPTS) {
          await sleep(NAV_RETRY_DELAY_MS);
          continue; // try a fresh navigation
        } else {
          // Fallback: try interactive form search within the same session
          const okInteractive = await performInteractiveSearch(page, basePageUrl, fullName);
          if (okInteractive) {
            navOk = true;
            break;
          }
          hadServerError = true;
          return { matchCount: 0, companies: [] };
        }
      }

      // If not a server error, proceed
      navOk = true;
      // wait briefly for the "Total:" counter or result list to appear
      try {
        await page.waitForFunction(
          () => /Total:\s*\d+/.test(document.body?.innerText || "") || !!document.querySelector("div.table-responsive-block tbody tr"),
          { timeout: 5000 }
        );
      } catch {}

      // Check for rate limit after content appears
      const rateText = await page.evaluate(() => document.body?.innerText || "");
      if (checkForRateLimitMessage(rateText)) {
        console.warn("[WARN] Rate limit detected on this page!");
        isRateLimited = true; return { matchCount: 0, companies: [] };
      }

      break; // exit attempts loop
    }

    if (!navOk) return { matchCount: 0, companies: [] };

    const initialMatchCount = await getMatchCountFromPage(page);
    console.log(`[INFO] Initial match count: ${initialMatchCount}`);
    let finalMatchCount = initialMatchCount;
    if (initialMatchCount >= HIGH_RESULTS_MIN && initialMatchCount < HIGH_RESULTS_MAX) {
      console.log(`[INFO] Match count between ${HIGH_RESULTS_MIN} and ${HIGH_RESULTS_MAX} → waiting extra ${EXTRA_WAIT_MS / 1000}s...`);
      await sleep(EXTRA_WAIT_MS);
      const afterWaitCount = await getMatchCountFromPage(page);
      console.log(`[INFO] Match count after extra wait: ${afterWaitCount}`);
      finalMatchCount = afterWaitCount;
    }

    console.log(`[INFO] Final match count: ${finalMatchCount}`);
    matchCount = finalMatchCount;

    if (finalMatchCount > 0 && finalMatchCount <= TOO_MANY_MATCHES_THRESHOLD) {
      companies = await collectCompaniesAcrossPages(page, searchUrl, fullName, finalMatchCount);
    } else {
      companies = [];
    }
    return { matchCount, companies };
    });

    if (hadServerError) {
      if (sessionAttempt < SESSION_RETRY_ATTEMPTS) {
        console.warn(`[WARN] Server error persisted after navigation retries. Refreshing session and retrying (${sessionAttempt + 1}/${SESSION_RETRY_ATTEMPTS})...`);
        continue; // try with a fresh session
      } else {
        break; // give up after session retries
      }
    } else {
      break; // success path (no server error)
    }
  }

  if (isRateLimited) return { status: "rate_limited", matchCount: 0, companies: [] };
  if (hadServerError) return { status: "server_error", matchCount: 0, companies: [] };
  if (!runnerRes.ok) return { status: "error", matchCount: 0, companies: [] };
  return { status: matchCount === 0 ? "no_match" : (matchCount > TOO_MANY_MATCHES_THRESHOLD ? "too_many_matches" : "checked"), matchCount, companies };
}

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, REGISTRY_BASE_URL } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[ERROR] Missing Supabase env vars.");
    process.exit(1);
  }
  if (!REGISTRY_BASE_URL) {
    console.error("[ERROR] Missing REGISTRY_BASE_URL.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const client = new BrowserbaseClient({ apiKey: BROWSERBASE_API_KEY, projectId: BROWSERBASE_PROJECT_ID });
  const verifier = new ProxyVerifier(client);

  // Toggle proxies usage with USE_PROXIES env (set to "false" to disable proxies)
  const USE_PROXIES = String(process.env.USE_PROXIES || "true").toLowerCase() !== "false";
  let rotation;

  if (USE_PROXIES) {
    // Build and verify proxies/browsers
    const proxies = getProxiesConfig();
    const browsers = getBrowserConfigurations(proxies).filter((b) => b.enabled);

    const verified = [];
    for (const b of browsers) {
      console.log(`[INFO] Verifying proxy for ${b.name} (region=${b.proxy?.region}, geo=${b.proxy?.geo})`);
      const res = await verifier.verifyAny(b);
      if (res.ok) verified.push(b);
      else console.warn(`[WARN] Skipping ${b.name} (proxy not verified: ${res.country || res.reason})`);
    }

    if (verified.length === 0) {
      console.error(`[ERROR] No proxies verified. Set USE_PROXIES=false to run without proxies or adjust .env proxy settings.`);
      process.exit(1);
    }

    rotation = new RotationQueue(verified);
    console.log(`[INFO] Verified browsers in rotation: ${rotation.length()}`);
  } else {
    // No-proxy mode: one direct Browserbase slot with no proxies
    const noProxyBrowser = {
      id: "no-proxy",
      name: "no-proxy",
      enabled: true,
      geolocation: { ...BROWSER_DEFAULTS.VIEWPORT },
      browserSettings: {
        headless: BROWSER_DEFAULTS.HEADLESS,
        viewport: { ...BROWSER_DEFAULTS.VIEWPORT },
      },
      proxy: {},
      proxyBlock: {}, // omit proxies in session payload
      metadata: { mode: "no-proxy" },
    };
    rotation = new RotationQueue([noProxyBrowser]);
    console.log(`[INFO] USE_PROXIES=false → No-proxy mode enabled. Using direct Browserbase network.`);
  }

  let isRunning = false;

  async function checkPendingUsers() {
    if (isRunning) { console.log("[INFO] Previous run still in progress, skipping this tick."); return; }
    isRunning = true;
    try {
      console.log("[INFO] Checking for pending users...");
      const { data: users, error } = await supabase
        .from("users_pending")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) { console.error("[ERROR] Supabase error while fetching users_pending:", error); return; }
      if (!users || users.length === 0) { console.log("[INFO] No pending users at this moment."); return; }

      const user = users[0];
      const currentBrowser = rotation.next(); // FIFO: take next and rotate
      console.log(`[INFO] Using browser slot ${currentBrowser.name} for this job`);

      const res = await processUser(
        user,
        client,
        (fn) => runWithBrowser(client, currentBrowser, fn),
        REGISTRY_BASE_URL
      );

      const registryPayload = {
        email: user.email,
        full_name: (user.full_name || "").trim(),
        match_count: res.matchCount,
        any_match: res.matchCount > 0,
        companies: res.companies,
      };
      const { error: insertError } = await supabase.from("user_registry_checks").insert(registryPayload);
      if (insertError) console.error("[ERROR] Error inserting into user_registry_checks:", insertError);

      await supabase.from("users_pending").update({ status: res.status }).eq("id", user.id);
      console.log(`[INFO] ========== Done (status=${res.status}) ==========`);
    } catch (e) {
      console.error("[ERROR] Unexpected error in checkPendingUsers:", e);
    } finally {
      isRunning = false;
    }
  }

  await checkPendingUsers();
  setInterval(checkPendingUsers, POLL_INTERVAL_MS);
}

main().catch((e) => {
  console.error(`${COLORS.red}[FATAL]${COLORS.reset}`, e?.stack || e?.message || e);
  process.exit(1);
});
