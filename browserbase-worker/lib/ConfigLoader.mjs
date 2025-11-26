// lib/ConfigLoader.mjs
import "dotenv/config";
import { COLORS, LOG_LEVELS } from "../config/constants.mjs";

export class ConfigLoader {
  constructor() {
    this.env = process.env;
  }

  get(key, def = undefined) {
    const v = this.env[key];
    return v == null || v === "" ? def : v;
  }

  getLogLevel() {
    const lvl = (this.get("WORKER_LOG_LEVEL", LOG_LEVELS.INFO) || "").toLowerCase();
    return Object.values(LOG_LEVELS).includes(lvl) ? lvl : LOG_LEVELS.INFO;
  }

  getWorkerSettings() {
    return {
      logLevel: this.getLogLevel(),
      timeoutMs: Number(this.get("WORKER_TIMEOUT", 30000)),
      retryAttempts: Number(this.get("WORKER_RETRY_ATTEMPTS", 2)),
      retryDelayMs: Number(this.get("WORKER_RETRY_DELAY", 1500)),
    };
  }

  validate() {
    const errors = [];
    const warnings = [];

    if (!this.get("BROWSERBASE_PROJECT_ID")) {
      errors.push("Missing BROWSERBASE_PROJECT_ID in environment");
    }
    if (!this.get("BROWSERBASE_API_KEY")) {
      errors.push("Missing BROWSERBASE_API_KEY in environment");
    }
    if (!this.get("OPENAI_API_KEY")) {
      warnings.push("OPENAI_API_KEY not set (optional)");
    }

    return { ok: errors.length === 0, errors, warnings };
  }

  displayEnvSummary() {
    const info = [
      `BROWSERBASE_PROJECT_ID: ${this.get("BROWSERBASE_PROJECT_ID") ? "set" : "missing"}`,
      `BROWSERBASE_API_KEY: ${this.get("BROWSERBASE_API_KEY") ? "set" : "missing"}`,
      `OPENAI_API_KEY: ${this.get("OPENAI_API_KEY") ? "set" : "not set"}`,
    ];

    console.log(`${COLORS.cyan}[ENV]${COLORS.reset} ${info.join(" | ")}`);
  }
}
