// config/browsers.mjs
import { PROXY_TYPES, GEOLOCATION_COORDINATES, BROWSER_DEFAULTS } from "./constants.mjs";

/**
 * Build Browser configuration objects from proxy entries.
 * @param {Array} proxies Array from getProxiesConfig()
 * @returns {Array} browserConfigs
 */
export function getBrowserConfigurations(proxies = []) {
  return proxies.map((p) => {
    const geo = GEOLOCATION_COORDINATES[p.geo] || GEOLOCATION_COORDINATES.default;

    // Build proxy block for Browserbase session payloads (SDK expects `proxies` boolean or array)
    let proxyBlock = {};
    const type = (p.type || "").toLowerCase();
    if (type === PROXY_TYPES.CUSTOM) {
      const { url, username, password } = p.custom || {};
      if (url) {
        proxyBlock = {
          proxies: [
            {
              type: "external",
              server: url,
              ...(username ? { username } : {}),
              ...(password ? { password } : {}),
            },
          ],
        };
      }
    } else if (type === PROXY_TYPES.BUILTIN) {
      // If region is BG, request BB managed proxy with BG geolocation
      if ((p.region || "").toUpperCase() === "BG") {
        proxyBlock = {
          proxies: [
            {
              type: "browserbase",
              geolocation: { country: "BG" },
            },
          ],
        };
      } else {
        proxyBlock = { proxies: true };
      }
    }

    return {
      id: p.id,
      name: p.name,
      enabled: !!p.enabled,
      region: p.region,
      geolocation: { ...geo },
      browserSettings: {
        headless: BROWSER_DEFAULTS.HEADLESS,
        viewport: { ...BROWSER_DEFAULTS.VIEWPORT },
      },
      proxy: { ...p }, // keep original proxy entry
      proxyBlock, // ready-to-merge block for session create
      metadata: {
        ...p.metadata,
      },
    };
  });
}
