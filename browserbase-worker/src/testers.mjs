// src/testers.mjs
import { COLORS } from "../config/constants.mjs";

export async function testBrowserbaseConnection(client) {
  console.log(`${COLORS.blue}[TEST]${COLORS.reset} Browserbase connection`);
  return await client.testConnection();
}

export function testProxyConfiguration(proxyManager) {
  console.log(`${COLORS.blue}[TEST]${COLORS.reset} Proxy configuration`);
  const res = proxyManager.checkAllBrowsers();
  for (const d of res.details) {
    const status = d.enabled ? (d.configured ? `${COLORS.green}configured${COLORS.reset}` : `${COLORS.yellow}not configured${COLORS.reset}`) : `${COLORS.dim}disabled${COLORS.reset}`;
    const miss = d.missing.length ? ` missing:[${d.missing.join(", ")}]` : "";
    console.log(` - ${d.name} (type=${d.type}) → ${status}${miss}`);
  }
  console.log(`Summary: configured=${res.summary.configuredCount}, notConfigured=${res.summary.notConfiguredCount}, total=${res.summary.total}`);
  return res;
}

export async function testContextCreation(client, browserConfigs = []) {
  console.log(`${COLORS.blue}[TEST]${COLORS.reset} Context creation (up to 2 browsers)`);
  const enabled = browserConfigs.filter((b) => b.enabled).slice(0, 2);
  const results = [];

  for (const b of enabled) {
    const ctx = await client.createTestContext(b.id, b.name);
    if (ctx.ok && ctx.id) {
      // cleanup
      await client.deleteContext(ctx.id);
    }
    results.push({ browserId: b.id, ok: ctx.ok, contextId: ctx.id || null });
  }

  const okCount = results.filter((r) => r.ok).length;
  console.log(`Context results: ok=${okCount}/${results.length}`);
  return { results, okCount };
}

export async function testSessionCreation(client, browserConfigs = []) {
  console.log(`${COLORS.blue}[TEST]${COLORS.reset} Session creation (up to 2 browsers)`);
  const enabled = browserConfigs.filter((b) => b.enabled).slice(0, 2);
  const results = [];

  for (const b of enabled) {
    const ses = await client.createTestSession(b, null);
    if (ses.ok && ses.id) {
      await client.releaseSession(ses.id);
    }
    results.push({ browserId: b.id, ok: ses.ok, sessionId: ses.id || null });
  }

  const okCount = results.filter((r) => r.ok).length;
  console.log(`Session results: ok=${okCount}/${results.length}`);
  return { results, okCount };
}

export function testNextBrowserProxyLoading(proxyManager) {
  console.log(`${COLORS.blue}[TEST]${COLORS.reset} Load builtin proxy for next missing browser`);
  const res = proxyManager.checkAndLoadNextBrowserProxy();
  const msg = res.updated ? `Loaded builtin proxy into browser ${res.browserId}` : "No browser needed proxy loading";
  console.log(msg);
  return res;
}
