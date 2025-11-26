// config/constants.mjs
// Shared constants and simple utilities

export const PROXY_TYPES = Object.freeze({
  CUSTOM: "custom",
  BUILTIN: "builtin",
});

export const REGIONS = Object.freeze({
  US: "US",
  EU: "EU",
  ASIA: "ASIA",
  BR: "BR",
  BG: "BG",
});

// Extend as needed
export const GEOLOCATION_COORDINATES = Object.freeze({
  "us-east": { latitude: 40.7128, longitude: -74.006, accuracy: 100 }, // NYC
  "eu-central": { latitude: 50.1109, longitude: 8.6821, accuracy: 100 }, // Frankfurt
  sg: { latitude: 1.3521, longitude: 103.8198, accuracy: 100 }, // Singapore
  "br-sp": { latitude: -23.5505, longitude: -46.6333, accuracy: 150 }, // São Paulo
  // Bulgaria
  "bg-sofia": { latitude: 42.6977, longitude: 23.3219, accuracy: 100 },
  "bg-plovdiv": { latitude: 42.1354, longitude: 24.7453, accuracy: 150 },
  "bg-varna": { latitude: 43.2141, longitude: 27.9147, accuracy: 150 },
  default: { latitude: 0, longitude: 0, accuracy: 5000 },
});

export const LOG_LEVELS = Object.freeze({
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
});

export const COLORS = Object.freeze({
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
});

export const BROWSER_DEFAULTS = Object.freeze({
  HEADLESS: false, // ensure full capability for registry portal
  VIEWPORT: { width: 1366, height: 900 },
});
