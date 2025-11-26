// src/validators.mjs
import { PROXY_TYPES, COLORS } from "../config/constants.mjs";

export function validateEnvironment(config) {
  const { ok, errors, warnings } = config.validate();
  if (errors.length) {
    console.log(`${COLORS.red}[ENV][ERROR]${COLORS.reset} ${errors.join("; ")}`);
  }
  if (warnings.length) {
    console.log(`${COLORS.yellow}[ENV][WARN]${COLORS.reset} ${warnings.join("; ")}`);
  }
  return { ok, errors, warnings };
}

export function validateBrowserConfigs(browserConfigs = []) {
  const errors = [];
  const warnings = [];

  browserConfigs.forEach((b, idx) => {
    if (!b.id) errors.push(`Browser[${idx}] missing id`);
    if (!b.name) warnings.push(`Browser[${idx}] missing name`);
    if (!b.geolocation) warnings.push(`Browser[${idx}] missing geolocation`);
    if (!b.proxy) warnings.push(`Browser[${idx}] missing proxy block`);
  });

  const ok = errors.length === 0;
  if (!ok) {
    console.log(`${COLORS.red}[BROWSERS][ERROR]${COLORS.reset} ${errors.join("; ")}`);
  }
  if (warnings.length) {
    console.log(`${COLORS.yellow}[BROWSERS][WARN]${COLORS.reset} ${warnings.join("; ")}`);
  }

  return { ok, errors, warnings };
}

export function validateProxyConfigs(proxies = []) {
  const errors = [];
  const warnings = [];

  proxies.forEach((p, idx) => {
    const type = (p.type || "").toLowerCase();
    if (!p.enabled) return; // ignore disabled

    if (type === PROXY_TYPES.CUSTOM) {
      if (!p.custom?.url) warnings.push(`Proxy[${idx + 1}] custom has no URL`);
      if (!p.custom?.username) warnings.push(`Proxy[${idx + 1}] custom has no username`);
      if (!p.custom?.password) warnings.push(`Proxy[${idx + 1}] custom has no password`);
    } else if (type === PROXY_TYPES.BUILTIN) {
      // builtin is fine; SDK interprets proxies: true
    } else {
      warnings.push(`Proxy[${idx + 1}] unknown type: ${p.type}`);
    }
  });

  const ok = errors.length === 0;
  return { ok, errors, warnings };
}
