// src/registryStagehandWorker.mjs
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { Stagehand } from "@browserbasehq/stagehand";

// ---------- CONSTANTS ----------
const TOO_MANY_MATCHES_THRESHOLD = 200; // >200 → too_many_matches (per latest spec)
const MAX_STAGEHAND_RETRIES = parseInt(process.env.WORKER_SESSION_RETRY_ATTEMPTS || "2", 10);
const POLL_INTERVAL_MS = 10_000;
const HIGH_RESULTS_MIN = 200;
const HIGH_RESULTS_MAX = 1000;
const EXTRA_WAIT_MS = 15_000;
const MAX_COMPANIES_TO_COLLECT = 10;
const MAX_PAGES_TO_SCAN = 5;
const GUESSED_PAGE_SIZE = 10; // we request count=10

// Fingerprint tuning
const DEFAULT_UA = process.env.WORKER_UA ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DEFAULT_ACCEPT_LANGUAGE = process.env.WORKER_ACCEPT_LANGUAGE ||
  "bg-BG,bg;q=0.9,en-US;q=0.8,en;q=0.7";
const DEFAULT_TIMEZONE = process.env.WORKER_TIMEZONE || "Europe/Sofia";

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function checkForRateLimitMessage(bodyText) {
  if (!bodyText) return false;
  const t = bodyText.toLowerCase();
  return (
    t.includes("reached maximum number of requests to the system") ||
    t.includes("максимален брой заявки") ||
    t.includes("достигнат е максимален брой заявки към системата")
  );
}

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

    if (!count) {
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

        let link = valueTd.querySelector('a[href*="ActiveConditionTabResult"]');
        if (!link) link = valueTd.querySelector('a');
        if (!link) continue;

        const href = link.getAttribute("href") || "";
        const companyName = (link.textContent || "").trim();
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
      await page.goto(pageUrl, { waitUntil: "networkidle" });
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

// ---------- MAIN FLOW ----------
async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REGISTRY_BASE_URL } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[ERROR] Missing Supabase env vars.");
    process.exit(1);
  }
  if (!REGISTRY_BASE_URL) {
    console.error("[ERROR] Missing REGISTRY_BASE_URL env var.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const stagehand = new Stagehand({ env: "BROWSERBASE" });
  console.log("[INFO] Initializing Stagehand (Browserbase stealth)...");
  await stagehand.init();
  console.log("[INFO] Stagehand initialized.");

  function getPage() {
    if (stagehand.page) return stagehand.page;
    const ctx = stagehand.context;
    try {
      if (ctx && typeof ctx.pages === "function") {
        const pages = ctx.pages();
        if (pages && pages.length > 0) return pages[0];
      }
    } catch {}
    return null;
  }

  let isRunning = false;

  async function processUser(user) {
    const fullName = (user.full_name || "").trim();
    if (!fullName) {
      console.error("[ERROR] User has no full_name, skipping:", user.id);
      await supabase.from("users_pending").update({ status: "error" }).eq("id", user.id);
      return;
    }

    console.log(`\n[INFO] ========== Processing: "${fullName}" ==========`);
    const searchUrl = `${REGISTRY_BASE_URL}${encodeURIComponent(fullName)}`;
    const basePageUrl = REGISTRY_BASE_URL.includes("?") ? REGISTRY_BASE_URL.split("?")[0] : REGISTRY_BASE_URL;
    console.log(`[INFO] Search URL: ${searchUrl}`);

    const page = getPage();
    if (!page) {
      console.error("[ERROR] No Stagehand page found.");
      await supabase.from("users_pending").update({ status: "error" }).eq("id", user.id);
      return;
    }

    // Apply a more realistic fingerprint once per user
    try {
      await page.setUserAgent(DEFAULT_UA);
      await page.setExtraHTTPHeaders({
        "Accept-Language": DEFAULT_ACCEPT_LANGUAGE,
        "Referer": basePageUrl,
        "Origin": "https://portal.registryagency.bg",
      });
      await page.emulateTimezone(DEFAULT_TIMEZONE);
    } catch {}

    let matchCount = 0;
    let companies = [];
    let isRateLimited = false;
    let sawServerError = false;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_STAGEHAND_RETRIES; attempt++) {
      try {
        console.log(`[INFO] Attempt ${attempt}/${MAX_STAGEHAND_RETRIES}`);
        // warm base page to set cookies and referer
        try { await page.goto(basePageUrl, { waitUntil: "domcontentloaded" }); await sleep(400); } catch {}

        // FIRST: try interactive search from the base form (avoid deep-link 502)
        const interRes1 = await page.evaluate((fullName) => {
          try {
            function pickInput() {
              const all = Array.from(document.querySelectorAll('input'))
                .filter(el => !el.disabled && el.type !== 'hidden' && el.offsetParent !== null);
              if (!all.length) return null;
              let best = null; let bestScore = -1;
              for (const el of all) {
                const id = (el.id || "").toLowerCase();
                const name = (el.getAttribute("name") || "").toLowerCase();
                const placeholder = (el.getAttribute("placeholder") || "").toLowerCase();
                const label = (el.closest("label")?.innerText || "").toLowerCase();
                let score = 0;
                if (el.type === 'text') score += 1;
                if (id.includes("name")) score += 3;
                if (name.includes("name")) score += 3;
                if (placeholder.includes("name") || placeholder.includes("име")) score += 2;
                if (label.includes("име") || label.includes("name")) score += 2;
                if (score > bestScore) { bestScore = score; best = el; }
              }
              return best || all[0] || null;
            }
            const input = pickInput();
            if (!input) return { filled: false, submitted: false };
            input.focus();
            input.value = fullName;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            function clickSubmit() {
              const btn = document.querySelector("button.system-button, button[type=submit], input[type=submit]");
              if (btn) { (btn).click(); return true; }
              const candidates = Array.from(document.querySelectorAll('button, a.btn, a.button'));
              for (const b of candidates) {
                const t = (b.innerText || b.textContent || "").toLowerCase();
                if (t.includes("търс") || t.includes("search") || t.includes("намира")) { (b).click(); return true; }
              }
              return false;
            }
            const clicked = clickSubmit();
            return { filled: true, submitted: clicked };
          } catch {
            return { filled: false, submitted: false };
          }
        }, fullName);

        if (!interRes1.submitted && interRes1.filled) {
          try { await page.keyboard.press('Enter'); await page.waitForTimeout(600); } catch {}
        }

        // Wait for results after interactive path
        try {
          await page.waitForFunction(
            () => /Total:\s*\d+/.test(document.body?.innerText || "") || !!document.querySelector("div.table-responsive-block tbody tr"),
            { timeout: 12000 }
          );
        } catch {}

        // Check if results appeared; only if not, fall back to deep-link (may 502)
        const hasResults = await page.evaluate(() => !!document.querySelector("div.table-responsive-block tbody tr") || /Total:\s*\d+/.test(document.body?.innerText || ""));
        
        // rate limit check
        const body2 = await page.evaluate(() => document.body?.innerText || "");
        if (checkForRateLimitMessage(body2)) {
          console.warn("[WARN] Rate limit detected on this page!");
          isRateLimited = true;
          break;
        }

        const initialMatchCount = await getMatchCountFromPage(page);
        console.log(`[INFO] Initial match count: ${initialMatchCount}`);
        let finalMatchCount = initialMatchCount;
        if (initialMatchCount >= HIGH_RESULTS_MIN && initialMatchCount < HIGH_RESULTS_MAX) {
          console.log(`[INFO] Match count between ${HIGH_RESULTS_MIN} and ${HIGH_RESULTS_MAX} → waiting extra ${EXTRA_WAIT_MS/1000}s...`);
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

        lastError = null;
        sawServerError = false;
        break;
      } catch (err) {
        console.error(`[ERROR] Error on attempt ${attempt}:`, err?.message || err);
        lastError = err;
        await sleep(1500);
      }
    }

    let status;
    if (isRateLimited) status = "rate_limited";
    else if (sawServerError) status = "server_error";
    else if (lastError) status = "error";
    else if (matchCount === 0) status = "no_match";
    else if (matchCount > TOO_MANY_MATCHES_THRESHOLD) status = "too_many_matches";
    else status = "checked";

    const registryPayload = {
      email: user.email,
      full_name: fullName,
      match_count: matchCount,
      any_match: matchCount > 0,
      companies,
    };
    const { error: insertError } = await supabase.from("user_registry_checks").insert(registryPayload);
    if (insertError) console.error("[ERROR] Error inserting into user_registry_checks:", insertError);

    await supabase.from("users_pending").update({ status }).eq("id", user.id);
    console.log(`[INFO] ========== Done (status=${status}) ==========`);
  }

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

      await processUser(users[0]);
    } catch (e) {
      console.error("[ERROR] Unexpected error in checkPendingUsers:", e);
    } finally {
      isRunning = false;
    }
  }

  await checkPendingUsers();
  setInterval(checkPendingUsers, POLL_INTERVAL_MS);

  process.on("SIGINT", async () => {
    console.log("\n[INFO] Shutting down gracefully...");
    try { await stagehand.close(); console.log("[INFO] Stagehand closed."); } catch (e) { console.error("[ERROR] Stagehand close error:", e); }
    process.exit(0);
  });
}

main().catch((e) => {
  console.error("[FATAL]", e?.stack || e?.message || e);
  process.exit(1);
});
