// lib/ProxyVerifier.mjs
import puppeteer from "puppeteer-core";
import { COLORS } from "../config/constants.mjs";

export class ProxyVerifier {
  constructor(client) {
    this.client = client;
  }

  async verifyBG(browserConfig) {
    // Create a short-lived session and check IP geolocation
    const session = await this.client.createTestSession(browserConfig, null);
    if (!session.ok || !session.connectUrl) {
      console.error(`${COLORS.red}[VERIFY][ERROR]${COLORS.reset} Failed to create session for proxy test.`);
      return { ok: false, reason: "session_create_failed" };
    }

    let browser = null;
    try {
      const ws = session.connectUrl;
      if (!ws) throw new Error("No connectUrl returned by Browserbase session");
      browser = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null });
      const pages = await browser.pages();
      const page = pages?.[0] || (await browser.newPage());

      await page.goto("https://ipapi.co/json", { waitUntil: "networkidle2", timeout: 30000 });
      const data = await page.evaluate(() => {
        try {
          return JSON.parse(document.body.innerText || "{}");
        } catch {
          return {};
        }
      });

      const country = (data && (data.country || data.country_code || data.country_name)) || "";
      const countryStr = String(country).toUpperCase();
      const isBG = countryStr === "BG" || countryStr.includes("BULGARIA");

      console.log(`${COLORS.cyan}[VERIFY]${COLORS.reset} Proxy country=${countryStr} → ${isBG ? `${COLORS.green}OK (BG)` : `${COLORS.red}NOT BG`}${COLORS.reset}`);

      await this.client.releaseSession(session.id);
      await browser.close();

      return { ok: isBG, country: countryStr };
    } catch (e) {
      console.error(`${COLORS.red}[VERIFY][ERROR]${COLORS.reset}`, e?.message || e);
      try { if (session?.id) await this.client.releaseSession(session.id); } catch {}
      try { if (browser) await browser.close(); } catch {}
      return { ok: false, reason: "verification_error", error: e };
    }
  }

  async verifyAny(browserConfig) {
    const session = await this.client.createTestSession(browserConfig, null);
    if (!session.ok || !session.connectUrl) {
      console.error(`${COLORS.red}[VERIFY][ERROR]${COLORS.reset} Failed to create session for proxy test.`);
      return { ok: false, reason: "session_create_failed" };
    }
    let browser = null;
    try {
      const ws = session.connectUrl;
      const browserInstance = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null });
      browser = browserInstance;
      const pages = await browser.pages();
      const page = pages?.[0] || (await browser.newPage());
      await page.goto("https://ipapi.co/json", { waitUntil: "networkidle2", timeout: 30000 });
      const data = await page.evaluate(() => {
        try { return JSON.parse(document.body.innerText || "{}"); } catch { return {}; }
      });
      const country = (data && (data.country || data.country_code || data.country_name)) || "";
      const countryStr = String(country).toUpperCase();
      console.log(`${COLORS.cyan}[VERIFY]${COLORS.reset} Proxy country=${countryStr}`);
      await this.client.releaseSession(session.id);
      await browser.close();
      return { ok: true, country: countryStr };
    } catch (e) {
      console.error(`${COLORS.red}[VERIFY][ERROR]${COLORS.reset}`, e?.message || e);
      try { if (session?.id) await this.client.releaseSession(session.id); } catch {}
      try { if (browser) await browser.close(); } catch {}
      return { ok: false, reason: "verification_error", error: e };
    }
  }
}
