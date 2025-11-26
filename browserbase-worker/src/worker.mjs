// src/worker.mjs
import "dotenv/config";
import { COLORS } from "../config/constants.mjs";
import { getProxiesConfig } from "../config/proxies.mjs";
import { getBrowserConfigurations } from "../config/browsers.mjs";
import { ConfigLoader } from "../lib/ConfigLoader.mjs";
import { ProxyManager } from "../lib/ProxyManager.mjs";
import { BrowserbaseClient } from "../lib/BrowserbaseClient.mjs";
import {
  validateEnvironment,
  validateBrowserConfigs,
  validateProxyConfigs,
} from "./validators.mjs";
import {
  testBrowserbaseConnection,
  testProxyConfiguration,
  testContextCreation,
  testSessionCreation,
  testNextBrowserProxyLoading,
} from "./testers.mjs";

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  return {
    validateOnly: flags.has("--validate"),
    checkProxies: flags.has("--check-proxies"),
    runTests: flags.has("--test"),
    fullTest: flags.has("--full-test"),
  };
}

class Worker {
  constructor() {
    this.config = new ConfigLoader();
    this.workerSettings = this.config.getWorkerSettings();
    this.proxies = getProxiesConfig();
    this.browserConfigs = getBrowserConfigurations(this.proxies);
    this.proxyManager = new ProxyManager(this.browserConfigs);
    this.client = null;
  }

  displayHeader() {
    console.log(`${COLORS.bright}${COLORS.magenta}Browserbase Worker${COLORS.reset}`);
    this.config.displayEnvSummary();
    console.log(
      `${COLORS.cyan}[WORKER]${COLORS.reset} timeout=${this.workerSettings.timeoutMs}ms, retries=${this.workerSettings.retryAttempts}, delay=${this.workerSettings.retryDelayMs}ms`
    );
  }

  async initialize() {
    this.displayHeader();

    const envVal = validateEnvironment(this.config);
    const browsersVal = validateBrowserConfigs(this.browserConfigs);
    const proxiesVal = validateProxyConfigs(this.proxies);

    const allOk = envVal.ok && browsersVal.ok && proxiesVal.ok;

    if (!allOk) {
      console.log(
        `${COLORS.yellow}[WARN]${COLORS.reset} Validation revealed issues. You can still run proxy checks, but connection tests may fail.`
      );
    }

    if (envVal.ok) {
      this.client = new BrowserbaseClient({
        apiKey: this.config.get("BROWSERBASE_API_KEY"),
        projectId: this.config.get("BROWSERBASE_PROJECT_ID"),
        timeoutMs: this.workerSettings.timeoutMs,
      });
    }

    return { envVal, browsersVal, proxiesVal };
  }

  async runValidation() {
    const { envVal, browsersVal, proxiesVal } = await this.initialize();
    return { envVal, browsersVal, proxiesVal };
  }

  async runProxyTests() {
    await this.initialize();
    const proxySummary = testProxyConfiguration(this.proxyManager);
    const loadNext = testNextBrowserProxyLoading(this.proxyManager);
    return { proxySummary, loadNext };
  }

  async runConnectionTests() {
    const { envVal } = await this.initialize();
    if (!envVal.ok || !this.client) {
      console.log(`${COLORS.red}[ERROR]${COLORS.reset} Cannot run connection tests without valid env configuration.`);
      return { connection: { ok: false, error: "invalid_env" } };
    }

    const connection = await testBrowserbaseConnection(this.client);
    return { connection };
  }

  async runFunctionalTests() {
    const { envVal } = await this.initialize();
    if (!envVal.ok || !this.client) {
      console.log(`${COLORS.red}[ERROR]${COLORS.reset} Cannot run functional tests without valid env configuration.`);
      return { contexts: { okCount: 0, results: [] }, sessions: { okCount: 0, results: [] } };
    }

    const contexts = await testContextCreation(this.client, this.browserConfigs);
    const sessions = await testSessionCreation(this.client, this.browserConfigs);
    return { contexts, sessions };
  }

  async runFullTest() {
    const { envVal, browsersVal, proxiesVal } = await this.initialize();

    const results = { envVal, browsersVal, proxiesVal };

    const proxySummary = testProxyConfiguration(this.proxyManager);
    results.proxySummary = proxySummary;

    if (envVal.ok && this.client) {
      results.connection = await testBrowserbaseConnection(this.client);
      results.contexts = await testContextCreation(this.client, this.browserConfigs);
      results.sessions = await testSessionCreation(this.client, this.browserConfigs);
    } else {
      results.connection = { ok: false, error: "invalid_env" };
    }

    this.displaySummary(results);
    this.displayNextSteps();
    return results;
  }

  displaySummary(r) {
    console.log(`\n${COLORS.bright}${COLORS.blue}Summary${COLORS.reset}`);

    const envOk = r.envVal?.ok ? `${COLORS.green}OK${COLORS.reset}` : `${COLORS.red}FAIL${COLORS.reset}`;
    console.log(` - Env: ${envOk}`);

    const browsOk = r.browsersVal?.ok ? `${COLORS.green}OK${COLORS.reset}` : `${COLORS.yellow}WARN/ERRORS${COLORS.reset}`;
    console.log(` - Browsers config: ${browsOk}`);

    const proxyOk = r.proxiesVal?.ok ? `${COLORS.green}OK${COLORS.reset}` : `${COLORS.yellow}WARN/ERRORS${COLORS.reset}`;
    console.log(` - Proxies config: ${proxyOk}`);

    if (r.proxySummary) {
      console.log(` - Proxy summary: configured=${r.proxySummary.summary.configuredCount}, notConfigured=${r.proxySummary.summary.notConfiguredCount}`);
    }

    if (r.connection) {
      console.log(` - Connection: ${r.connection.ok ? `${COLORS.green}OK${COLORS.reset}` : `${COLORS.red}FAIL${COLORS.reset}`}`);
    }
    if (r.contexts) {
      console.log(` - Contexts: ok=${r.contexts.okCount ?? 0}`);
    }
    if (r.sessions) {
      console.log(` - Sessions: ok=${r.sessions.okCount ?? 0}`);
    }
  }

  displayNextSteps() {
    console.log(`\n${COLORS.bright}${COLORS.cyan}Next steps${COLORS.reset}`);
    console.log("1) Copy .env.example to .env and set your BROWSERBASE_PROJECT_ID and BROWSERBASE_API_KEY");
    console.log("2) Optional: configure up to 4 proxies (custom or builtin)");
    console.log("3) Run: npm run validate | npm run check-proxies | npm run full-test");
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const worker = new Worker();

  if (args.validateOnly) {
    await worker.runValidation();
    return;
  }
  if (args.checkProxies) {
    await worker.runProxyTests();
    return;
  }
  if (args.runTests) {
    await worker.runConnectionTests();
    return;
  }
  if (args.fullTest) {
    await worker.runFullTest();
    return;
  }

  // default: quick summary and guidance
  await worker.runValidation();
  worker.displayNextSteps();
}

main().catch((e) => {
  console.error(`${COLORS.red}[FATAL]${COLORS.reset}`, e?.stack || e?.message || e);
  process.exit(1);
});
