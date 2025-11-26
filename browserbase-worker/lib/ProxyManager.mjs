// lib/ProxyManager.mjs
import { PROXY_TYPES } from "../config/constants.mjs";

export class ProxyManager {
  constructor(browserConfigs = []) {
    this.browserConfigs = browserConfigs;
    this.updated = new Map();
  }

  isProxyConfigured(browser) {
    const pb = browser?.proxyBlock || {};
    if (pb.proxies === true) return true; // builtin toggled
    const proxy = pb.proxy || {};
    // For custom we consider configured only if URL is provided
    return typeof proxy.url === "string" && proxy.url.length > 0;
  }

  checkBrowserProxy(browser) {
    const configured = this.isProxyConfigured(browser);
    const type = (browser?.proxy?.type || "").toLowerCase();
    const isCustom = type === PROXY_TYPES.CUSTOM;
    const custom = browser?.proxy?.custom || {};

    const missing = [];
    if (isCustom && !custom.url) missing.push("url");
    if (isCustom && !custom.username) missing.push("username");
    if (isCustom && !custom.password) missing.push("password");

    return {
      id: browser.id,
      name: browser.name,
      enabled: !!browser.enabled,
      type: type || "unknown",
      configured,
      missing,
    };
  }

  checkAllBrowsers() {
    const details = this.browserConfigs.map((b) => this.checkBrowserProxy(b));
    const configuredCount = details.filter((d) => d.configured && d.enabled).length;
    const notConfiguredCount = details.filter((d) => !d.configured && d.enabled).length;
    return {
      details,
      summary: { configuredCount, notConfiguredCount, total: details.length },
    };
  }

  loadBuiltinProxy(browser) {
    if (!browser) return null;
    browser.proxyBlock = { proxies: true };
    this.updated.set(browser.id, { ...browser });
    return browser;
  }

  getNextBrowserWithoutProxy() {
    return this.browserConfigs.find((b) => b.enabled && !this.isProxyConfigured(b)) || null;
  }

  checkAndLoadNextBrowserProxy() {
    const next = this.getNextBrowserWithoutProxy();
    if (!next) return { updated: false, browserId: null };
    this.loadBuiltinProxy(next);
    return { updated: true, browserId: next.id };
  }
}
