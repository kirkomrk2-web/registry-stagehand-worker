// worker.mjs
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { Stagehand } from "@browserbasehq/stagehand";

// ---------- КОНСТАНТИ ----------
const TOO_MANY_MATCHES_THRESHOLD = 100;  // >100 → too_many_matches
const MAX_STAGEHAND_RETRIES = 2;
const POLL_INTERVAL_MS = 10_000;

// доп. изчакване при много резултати (за да се стабилизира броят)
const HIGH_RESULTS_MIN = 200;
const HIGH_RESULTS_MAX = 1000;
const EXTRA_WAIT_MS = 15_000;

// лимити за компании/страници (за ЕДИН потребител)
const MAX_COMPANIES_TO_COLLECT = 10;
const MAX_PAGES_TO_SCAN = 5;
const GUESSED_PAGE_SIZE = 25; // толкова е в портала

// ---------- HELPER: нормализиране на име (СТРОГО, БЕЗ СОРТИРАНЕ) ----------
/**
 * Нормализира име, запазвайки точния ред на думите.
 * Премахва NBSP, двойни интервали, кавички, точки и други паразитни символи.
 * Преобразува в lowercase.
 */
function normalizeNameStrict(str) {
  return (str || "")
    .replace(/\u00a0/g, " ")        // NBSP → space
    .replace(/\s+/g, " ")           // двойни/множествени интервали → един
    .trim()
    .replace(/[\"''„""]/g, "")      // кавички
    .replace(/\./g, "")             // точки
    .replace(/[^a-zа-я0-9\s]/gi, "") // всичко друго (но запазваме интервалите)
    .replace(/\s+/g, " ")           // отново почистване на интервали
    .trim()
    .toLowerCase();
}

/**
 * Точно сравнение на два имена.
 * Връща true само ако нормализираните имена са идентични.
 */
function namesAreExactMatch(name1, name2) {
  const norm1 = normalizeNameStrict(name1);
  const norm2 = normalizeNameStrict(name2);
  return norm1 === norm2 && norm1.length > 0;
}

/**
 * Проверява дали страницата съдържа съобщение за rate limit.
 */
function checkForRateLimitMessage(bodyText) {
  if (!bodyText) return false;
  return (
    bodyText.includes("Reached maximum number of requests to the system") ||
    bodyText.includes("Достигнут е максимален брой заявки към системата")
  );
}

// ---------- Supabase ----------
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REGISTRY_BASE_URL } =
  process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[ERROR] Missing Supabase env vars.");
  process.exit(1);
}

if (!REGISTRY_BASE_URL) {
  console.error("[ERROR] Missing REGISTRY_BASE_URL env var.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- Stagehand ----------
const stagehand = new Stagehand({
  env: "BROWSERBASE",
});

console.log("[INFO] Initializing Stagehand...");
await stagehand.init();
console.log("[INFO] Stagehand initialized.");

function getPage() {
  if (stagehand.page) return stagehand.page;

  const ctx = stagehand.context;
  if (ctx && typeof ctx.pages === "function") {
    const pages = ctx.pages();
    if (pages && pages.length > 0) return pages[0];
  }
  return null;
}

let isRunning = false;

console.log("[INFO] Worker started. Listening for pending users...");

// ------ HELPER: sleep ------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ------ HELPER: вади броя резултати от страницата ------
async function getMatchCountFromPage(page) {
  await sleep(2000); // малка пауза

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
        console.error("[ERROR] Error in page.evaluate (getMatchCount):", e.message);
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
      const numStrBody =
        (matchBgBody && matchBgBody[1]) || (matchEnBody && matchEnBody[1]);
      if (numStrBody) {
        count = parseInt(numStrBody, 10);
        console.log("[INFO] Match count from body fallback:", count);
      }
    }

    count = Number.isFinite(count) ? count : 0;
    if (!count) console.log("[WARN] No match count detected, returning 0.");
    return count;
  } catch (e) {
    console.log(
      "[ERROR] Could not read match count from page, treating as 0. Error:",
      e.message || e
    );
    return 0;
  }
}

// ------ ИЗВЛИЧАНЕ НА КОМПАНИИ ОТ ТЕКУЩАТА СТРАНИЦА ------
/**
 * Работи по двойки редове: header (even/odd) + collapsible-row под него.
 * Използва ТОЧНО сравнение на имена (без сортиране).
 */
async function extractCompaniesFromCurrentPage(page, fullName) {
  // кликаме всички стрелки (за всеки случай)
  try {
    await page.evaluate(() => {
      try {
        const tableBlock = document.querySelector("div.table-responsive-block");
        if (!tableBlock) return;

        const buttons = Array.from(
          tableBlock.querySelectorAll("td.toggle-collapse button.system-button")
        );
        for (const btn of buttons) {
          if (btn instanceof HTMLElement) btn.click();
        }
      } catch (e) {
        console.error("[ERROR] Error clicking expand buttons:", e.message);
      }
    });
  } catch (e) {
    console.error("[ERROR] Error in expand buttons evaluation:", e.message);
  }

  // чакаме да се разгънат
  await sleep(1500);

  const { companies, debugInfo } = await page.evaluate(
    ({ fullName }) => {
      try {
        /**
         * Нормализира име строго (без сортиране на думи).
         */
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
        if (!tableBlock) {
          return { companies: [], debugInfo };
        }

        const tbody = tableBlock.querySelector("tbody");
        if (!tbody) {
          return { companies: [], debugInfo };
        }

        const rows = Array.from(tbody.querySelectorAll("tr"));
        const normalizedFullName = normalizeStrict(fullName);

        for (let i = 0; i < rows.length - 1; i++) {
          const headerRow = rows[i];
          const collapsibleRow = rows[i + 1];

          // търсим само двойки: header + collapsible-row
          if (!collapsibleRow.classList.contains("collapsible-row")) continue;

          debugInfo.headerBlocksFound++;

          // вадим текста на името от последната колона на header row
          const nameCell = headerRow.querySelector("td:last-child");
          const nameText = nameCell
            ? (nameCell.innerText || nameCell.textContent || "")
            : (headerRow.innerText || headerRow.textContent || "");

          const normalizedRowName = normalizeStrict(nameText);

          // ТОЧНО сравнение (без сортиране)
          if (normalizedRowName !== normalizedFullName) {
            continue;
          }

          debugInfo.headerBlocksMatched++;

          // вътрешната таблица с ролите/компаниите
          const innerTable = collapsibleRow.querySelector("table.inner-table");
          if (!innerTable) {
            // Може да има alert съобщение (No data found / rate limit)
            continue;
          }

          debugInfo.collapsibleRowsProcessed++;

          try {
            const innerRows = Array.from(
              innerTable.querySelectorAll("tbody tr")
            );

            for (const innerRow of innerRows) {
              try {
                const labelTd = innerRow.querySelector("td:first-child");
                const valueTd = innerRow.querySelector("td:nth-child(2)");
                if (!labelTd || !valueTd) continue;

                const labelText = (
                  labelTd.innerText || labelTd.textContent || ""
                )
                  .replace(/\u00a0/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
                  .toLowerCase();

                const isOwner23 =
                  labelText.startsWith("23.") ||
                  labelText.includes("sole owner of the capital") ||
                  labelText.includes("собственик на капитала");

                if (!isOwner23) continue;

                const link = valueTd.querySelector(
                  'a[href*="ActiveConditionTabResult"]'
                );
                if (!link) continue;

                const href = link.getAttribute("href") || "";
                const companyName = (link.textContent || "").trim();

                const m = href.match(/uic=(\d+)/);
                const eik = m ? m[1] : null;

                const rowText = (innerRow.innerText || innerRow.textContent || "")
                  .replace(/\s+/g, " ")
                  .trim();

                results.push({
                  eik,
                  href,
                  rawText: rowText,
                  companyName,
                });

                debugInfo.companiesExtracted++;
              } catch (e) {
                console.error("[ERROR] Error processing inner row:", e.message);
              }
            }
          } catch (e) {
            console.error("[ERROR] Error processing inner table:", e.message);
          }
        }

        // дедуп по eik|href
        const seen = new Set();
        const deduped = results.filter((c) => {
          const key = (c.eik || "") + "|" + (c.href || "");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        return { companies: deduped, debugInfo };
      } catch (e) {
        console.error("[ERROR] Error in extractCompaniesFromCurrentPage evaluate:", e.message);
        return { companies: [], debugInfo: {} };
      }
    },
    { fullName }
  );

  console.log(
    `[INFO] Extracted ${companies.length} companies from current page for "${fullName}".`
  );

  if (debugInfo && Object.keys(debugInfo).length > 0) {
    console.log("[DEBUG] Extraction info:", debugInfo);
  }

  return companies;
}

// ------ навигация по страници и събиране до MAX_COMPANIES_TO_COLLECT компании ------
async function collectCompaniesAcrossPages(
  page,
  baseSearchUrl,
  fullName,
  matchCount
) {
  const collected = [];
  const seen = new Set();

  const maxPagesByCount = Math.ceil(matchCount / GUESSED_PAGE_SIZE);
  const maxPages = Math.min(MAX_PAGES_TO_SCAN, maxPagesByCount || 1);

  console.log(
    `[INFO] Will scan up to ${maxPages} pages (matchCount=${matchCount}, pageSize=${GUESSED_PAGE_SIZE})`
  );

  for (let pageIndex = 1; pageIndex <= maxPages; pageIndex++) {
    let pageUrl = baseSearchUrl;

    if (pageUrl.includes("page=")) {
      pageUrl = pageUrl.replace(/([?&]page=)\d+/i, `$1${pageIndex}`);
    } else {
      pageUrl += (pageUrl.includes("?") ? "&" : "?") + `page=${pageIndex}`;
    }

    if (pageIndex > 1) {
      console.log(
        `[INFO] Loading page ${pageIndex}/${maxPages} for "${fullName}"`
      );
      await page.goto(pageUrl, { waitUntil: "networkidle" });
    }

    const companiesOnPage = await extractCompaniesFromCurrentPage(
      page,
      fullName
    );

    for (const c of companiesOnPage) {
      const key = (c.eik || "") + "|" + (c.href || "");
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(c);
      if (collected.length >= MAX_COMPANIES_TO_COLLECT) break;
    }

    console.log(
      `[INFO] Collected so far: ${collected.length}/${MAX_COMPANIES_TO_COLLECT} companies for "${fullName}".`
    );

    if (collected.length >= MAX_COMPANIES_TO_COLLECT) break;
  }

  console.log(
    `[INFO] Total collected companies for "${fullName}": ${collected.length}`
  );
  return collected;
}

// ------ Обработка на един user_pending ------
async function processUser(user) {
  const fullName = (user.full_name || "").trim();

  if (!fullName) {
    console.error("[ERROR] User has no full_name, skipping:", user.id);
    await supabase
      .from("users_pending")
      .update({ status: "error" })
      .eq("id", user.id);
    return;
  }

  console.log(`\n[INFO] ========== Processing: "${fullName}" ==========`);

  const searchUrl = `${REGISTRY_BASE_URL}${encodeURIComponent(fullName)}`;
  console.log(`[INFO] Search URL: ${searchUrl}`);

  const page = getPage();
  if (!page) {
    console.error("[ERROR] No Stagehand page found.");
    await supabase
      .from("users_pending")
      .update({ status: "error" })
      .eq("id", user.id);
    return;
  }

  let matchCount = 0;
  let companies = [];
  let lastError = null;
  let isRateLimited = false;

  for (let attempt = 1; attempt <= MAX_STAGEHAND_RETRIES; attempt++) {
    try {
      console.log(`[INFO] Attempt ${attempt}/${MAX_STAGEHAND_RETRIES}`);
      await page.goto(searchUrl, { waitUntil: "networkidle" });

      // Проверяваме за rate limit съобщение
      const bodyText = await page.evaluate(() => document.body?.innerText || "");
      if (checkForRateLimitMessage(bodyText)) {
        console.warn("[WARN] Rate limit detected on this page!");
        isRateLimited = true;
        break;
      }

      const initialMatchCount = await getMatchCountFromPage(page);
      console.log(`[INFO] Initial match count: ${initialMatchCount}`);

      let finalMatchCount = initialMatchCount;

      if (
        initialMatchCount >= HIGH_RESULTS_MIN &&
        initialMatchCount < HIGH_RESULTS_MAX
      ) {
        console.log(
          `[INFO] Match count between ${HIGH_RESULTS_MIN} and ${HIGH_RESULTS_MAX} → waiting extra ${
            EXTRA_WAIT_MS / 1000
          }s for stabilization...`
        );
        await sleep(EXTRA_WAIT_MS);
        const afterWaitCount = await getMatchCountFromPage(page);
        console.log(`[INFO] Match count after extra wait: ${afterWaitCount}`);
        finalMatchCount = afterWaitCount;
      }

      console.log(`[INFO] Final match count: ${finalMatchCount}`);
      matchCount = finalMatchCount;

      if (finalMatchCount > 0 && finalMatchCount <= TOO_MANY_MATCHES_THRESHOLD) {
        companies = await collectCompaniesAcrossPages(
          page,
          searchUrl,
          fullName,
          finalMatchCount
        );
      } else {
        companies = [];
      }

      lastError = null;
      break;
    } catch (err) {
      console.error(`[ERROR] Error on attempt ${attempt}:`, err.message || err);
      lastError = err;

      if (attempt < MAX_STAGEHAND_RETRIES) {
        console.log("[INFO] Transient error, retrying after 2s...");
        await sleep(2000);
      }
    }
  }

  if (isRateLimited) {
    console.warn(`[WARN] Rate limited for "${fullName}" - marking as rate_limited`);
    await supabase
      .from("users_pending")
      .update({ status: "rate_limited" })
      .eq("id", user.id);
    console.log(`[INFO] ========== Done (rate_limited) ==========\n`);
    return;
  }

  if (lastError) {
    console.error(
      `[ERROR] Final error after ${MAX_STAGEHAND_RETRIES} attempts:`,
      lastError.message || lastError
    );
    await supabase
      .from("users_pending")
      .update({ status: "error" })
      .eq("id", user.id);
    console.log(`[INFO] ========== Done (error) ==========\n`);
    return;
  }

  // --- Определяме status според matchCount ---
  let status;
  if (matchCount === 0) {
    status = "no_match";
    console.log(`[INFO] No matches found.`);
  } else if (matchCount > TOO_MANY_MATCHES_THRESHOLD) {
    console.log(
      `[WARN] Too many matches (${matchCount} > ${TOO_MANY_MATCHES_THRESHOLD}) - skipping company scrape.`
    );
    status = "too_many_matches";
    companies = [];
  } else {
    status = "checked";
    console.log(`[INFO] Successfully checked - found ${companies.length} companies.`);
  }

  // --- Пишем в user_registry_checks ---
  const registryPayload = {
    email: user.email,
    full_name: fullName,
    match_count: matchCount,
    any_match: matchCount > 0,
    companies,
  };

  const { error: insertError } = await supabase
    .from("user_registry_checks")
    .insert(registryPayload);

  if (insertError) {
    console.error("[ERROR] Error inserting into user_registry_checks:", insertError);
  } else {
    console.log(
      `[INFO] Inserted registry check: matches=${matchCount}, companies=${companies.length}`
    );
  }

  // --- Обновяваме users_pending.status ---
  await supabase
    .from("users_pending")
    .update({ status })
    .eq("id", user.id);

  console.log(
    `[INFO] ========== Done (status=${status}) ==========\n`
  );
}

// ------ Периодична проверка за pending users ------
async function checkPendingUsers() {
  if (isRunning) {
    console.log("[INFO] Previous run still in progress, skipping this tick.");
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
      console.error("[ERROR] Supabase error while fetching users_pending:", error);
      return;
    }

    if (!users || users.length === 0) {
      console.log("[INFO] No pending users at this moment.");
      return;
    }

    const user = users[0];
    await processUser(user);
  } catch (err) {
    console.error("[ERROR] Unexpected error in checkPendingUsers:", err);
  } finally {
    isRunning = false;
  }
}

// стартов run + интервал
await checkPendingUsers();
setInterval(checkPendingUsers, POLL_INTERVAL_MS);

// коректно спиране
process.on("SIGINT", async () => {
  console.log("\n[INFO] Shutting down gracefully...");
  try {
    await stagehand.close();
    console.log("[INFO] Stagehand closed.");
  } catch (e) {
    console.error("[ERROR] Error while closing Stagehand:", e);
  }
  process.exit(0);
});