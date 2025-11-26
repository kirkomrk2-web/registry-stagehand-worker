// lib/BrowserbaseClient.mjs
import Browserbase from "@browserbasehq/sdk";
import { COLORS } from "../config/constants.mjs";

export class BrowserbaseClient {
  constructor({ apiKey, projectId, timeoutMs = 30000 } = {}) {
    if (!apiKey || !projectId) throw new Error("BrowserbaseClient requires apiKey and projectId");
    this.client = new Browserbase({ apiKey, projectId });
    this.projectId = projectId;
    this.timeoutMs = timeoutMs;
  }

  async testConnection() {
    try {
      const list = await this.client.contexts.list();
      const count = Array.isArray(list?.data) ? list.data.length : (Array.isArray(list) ? list.length : 0);
      console.log(`${COLORS.green}[OK]${COLORS.reset} Browserbase connection succeeded. Contexts: ${count}`);
      return { ok: true, count };
    } catch (e) {
      console.error(`${COLORS.red}[ERROR]${COLORS.reset} Browserbase connection failed:`, e?.message || e);
      return { ok: false, error: e };
    }
  }

  async createTestContext(browserId, browserName) {
    try {
      const payload = {
        projectId: this.projectId,
        metadata: {
          purpose: "test-context",
          browserId,
          browserName,
          createdAt: new Date().toISOString(),
        },
      };
      const ctx = await this.client.contexts.create(payload);
      const id = ctx?.id || ctx?.data?.id || null;
      console.log(`${COLORS.cyan}[CTX]${COLORS.reset} Created context ${id || "<unknown>"}`);
      return { ok: true, id, raw: ctx };
    } catch (e) {
      console.error(`${COLORS.red}[ERROR]${COLORS.reset} Failed to create context:`, e?.message || e);
      return { ok: false, error: e };
    }
  }

  async deleteContext(contextId) {
    if (!contextId) return { ok: false, error: new Error("contextId required") };
    try {
      await this.client.contexts.delete(contextId);
      console.log(`${COLORS.dim}[CTX] Deleted context ${contextId}${COLORS.reset}`);
      return { ok: true };
    } catch (e) {
      console.error(`${COLORS.red}[ERROR]${COLORS.reset} Failed to delete context ${contextId}:`, e?.message || e);
      return { ok: false, error: e };
    }
  }

  /**
   * Create a test session. If contextId provided, session will attach to it.
   * browserConfig: {
   *   browserSettings, geolocation, proxyBlock, metadata, ...
   * }
   */
  async createTestSession(browserConfig, contextId = null) {
    try {
      const payload = {
        projectId: this.projectId,
        ...(contextId ? { contextId } : {}),
        ...(browserConfig.proxyBlock || {}), // either { proxy:{...} } or { proxies:true }
      };

      const session = await this.client.sessions.create(payload);
      const id = session?.id || session?.data?.id || null;
      // Browserbase SDK returns connection endpoint as connectUrl (WS), with fallbacks.
      const connectUrl =
        session?.connectUrl ||
        session?.data?.connectUrl ||
        session?.wsUrl ||
        session?.data?.wsUrl ||
        session?.debuggerUrl ||
        session?.data?.debuggerUrl ||
        null;
      console.log(`${COLORS.cyan}[SES]${COLORS.reset} Created session ${id || "<unknown>"}`);
      return { ok: true, id, connectUrl, raw: session };
    } catch (e) {
      console.error(`${COLORS.red}[ERROR]${COLORS.reset} Failed to create session:`, e?.message || e);
      return { ok: false, error: e };
    }
  }

  async releaseSession(sessionId) {
    if (!sessionId) return { ok: false, error: new Error("sessionId required") };
    try {
      // Browserbase SDK uses update with status REQUEST_RELEASE to end a session
      await this.client.sessions.update(sessionId, {
        projectId: this.projectId,
        status: 'REQUEST_RELEASE',
      });
      console.log(`${COLORS.dim}[SES] Released session ${sessionId}${COLORS.reset}`);
      return { ok: true };
    } catch (e) {
      console.error(`${COLORS.red}[ERROR]${COLORS.reset} Failed to release session ${sessionId}:`, e?.message || e);
      return { ok: false, error: e };
    }
  }
}
