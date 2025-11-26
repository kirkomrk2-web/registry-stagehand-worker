// config/proxies.mjs
import { PROXY_TYPES, REGIONS } from "./constants.mjs";

function envBool(val, def = false) {
  if (val == null) return def;
  const s = String(val).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(s);
}

function loadProxySlot(slot) {
  const prefix = `PROXY_${slot}_`;
  const enabled = envBool(process.env[`${prefix}ENABLED`], false);
  const type = (process.env[`${prefix}TYPE`] || PROXY_TYPES.CUSTOM).toLowerCase();

  const region = process.env[`${prefix}REGION`] || REGIONS.US;
  const geo = process.env[`${prefix}GEO`] || "default";

  const custom = {
    url: process.env[`${prefix}URL`] || "",
    username: process.env[`${prefix}USERNAME`] || "",
    password: process.env[`${prefix}PASSWORD`] || "",
  };

  return {
    id: String(slot),
    name: `Browser ${slot}`,
    enabled,
    type,
    region,
    geo,
    custom,
    metadata: {
      slot,
      createdAt: new Date().toISOString(),
    },
  };
}

export function getProxiesConfig() {
  return [1, 2, 3, 4].map(loadProxySlot);
}
