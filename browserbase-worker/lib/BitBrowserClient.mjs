// BitBrowserClient.mjs
// Adapter for BitBrowser Local API to start/stop a profile and obtain a Puppeteer wsEndpoint.
// Notes (covers common vendor variants):
//  - Default local API: http://127.0.0.1:54345 (some builds use https with self‑signed cert)
//  - Start endpoints seen in the wild:
//      /api/v1/browser/start?user_id=<id>
//      /api/v1/profile/start?user_id=<id>
//      /browser/open?user_id=<id>
//      /open?user_id=<id>
//  - Stop endpoints:
//      /api/v1/browser/stop?user_id=<id>
//      /api/v1/profile/stop?user_id=<id>
//      /browser/close?user_id=<id>
//      /close?user_id=<id>
//  - Auth header often is `x-api-key: <token>`. We also support Authorization: Bearer <token>.

import fetch from 'node-fetch';
import https from 'node:https';

const DEFAULT_API_URL = (process.env.BITBROWSER_API_URL || 'http://127.0.0.1:54345').replace(/\/$/, '');
const API_TOKEN = process.env.BITBROWSER_API_TOKEN || process.env.BITBROWSER_LOCAL_TOKEN || null;
const API_HEADER = (process.env.BITBROWSER_API_HEADER || 'x-api-key').trim();

function buildHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (API_TOKEN) {
    if (API_HEADER.toLowerCase() === 'authorization') {
      h['Authorization'] = `Bearer ${API_TOKEN}`;
    } else {
      h[API_HEADER] = API_TOKEN;
    }
  }
  return h;
}

function fetchOpts(method = 'GET') {
  const isHttps = DEFAULT_API_URL.startsWith('https://');
  const agent = isHttps ? new https.Agent({ rejectUnauthorized: false }) : undefined; // allow self-signed local certs
  return { method, headers: buildHeaders(), agent };
}

function normalizeWs(data) {
  // Try common locations for ws endpoint
  return (
    data?.ws ||
    data?.webSocketDebuggerUrl ||
    data?.devtools ||
    data?.webdriver?.ws ||
    data?.http?.ws ||
    data?.data?.ws ||
    null
  );
}

async function tryStart(baseUrl, profileId) {
  const starts = [
    `/api/v1/browser/start?user_id=${encodeURIComponent(profileId)}`,
    `/api/v1/profile/start?user_id=${encodeURIComponent(profileId)}`,
    `/browser/open?user_id=${encodeURIComponent(profileId)}`,
    `/open?user_id=${encodeURIComponent(profileId)}`,
  ];
  let lastErr = null;
  for (const path of starts) {
    const url = `${baseUrl}${path}`;
    try {
      const res = await fetch(url, fetchOpts('POST'));
      if (!res.ok) { lastErr = new Error(`${res.status} ${res.statusText}`); continue; }
      const json = await res.json().catch(() => ({}));
      const wsEndpoint = normalizeWs(json?.data || json);
      if (!wsEndpoint) throw new Error(`Missing ws endpoint in response: ${JSON.stringify(json)}`);
      return { wsEndpoint, raw: json };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`[BitBrowser] start failed for profile ${profileId}: ${lastErr?.message || lastErr}`);
}

async function tryStop(baseUrl, profileId) {
  const stops = [
    `/api/v1/browser/stop?user_id=${encodeURIComponent(profileId)}`,
    `/api/v1/profile/stop?user_id=${encodeURIComponent(profileId)}`,
    `/browser/close?user_id=${encodeURIComponent(profileId)}`,
    `/close?user_id=${encodeURIComponent(profileId)}`,
  ];
  let lastErr = null;
  for (const path of stops) {
    const url = `${baseUrl}${path}`;
    try {
      const res = await fetch(url, fetchOpts('POST'));
      if (!res.ok) { lastErr = new Error(`${res.status} ${res.statusText}`); continue; }
      return true;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`[BitBrowser] stop failed for profile ${profileId}: ${lastErr?.message || lastErr}`);
}

export class BitBrowserClient {
  constructor(baseUrl = DEFAULT_API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async startProfile(profileId) {
    return await tryStart(this.baseUrl, profileId);
  }

  async stopProfile(profileId) {
    return await tryStop(this.baseUrl, profileId);
  }
}

export default BitBrowserClient;
