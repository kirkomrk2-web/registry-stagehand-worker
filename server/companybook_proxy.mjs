// server/companybook_proxy.mjs
// Local proxy to CompanyBook API for browser usage (handles CORS) with retries and richer errors
// Usage: node server/companybook_proxy.mjs

import http from 'node:http';
import { URL } from 'node:url';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4321;
const API_BASE = 'https://api.companybook.bg';

function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...headers,
  });
  res.end(body);
}

function notFound(res) {
  send(res, 404, { error: 'Not found' });
}

function logError(e) {
  console.error('[proxy] error:', e?.message || e);
}

async function fetchWithRetry(url, opts = {}, retries = 3, backoffMs = 400) {
  let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' }, ...opts });
      const text = await resp.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { raw: text }; }
      return { ok: resp.ok, status: resp.status, json };
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise(r => setTimeout(r, backoffMs * (i + 1)));
    }
  }
  return { ok: false, status: 0, json: { error: lastErr?.message || 'fetch failed' } };
}

async function proxy(path, searchParams = '') {
  const url = `${API_BASE}${path}${searchParams ? `?${searchParams}` : ''}`;
  const r = await fetchWithRetry(url);
  return r;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      return send(res, 200, { ok: true });
    }

    const u = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = u.pathname || '/';

    if (pathname === '/health') {
      return send(res, 200, { ok: true });
    }

    // GET /person-search?name=...
    if (pathname === '/person-search' && req.method === 'GET') {
      const name = u.searchParams.get('name') || '';
      const limit = u.searchParams.get('limit') || '10';
      if (name.trim().length < 3) {
        return send(res, 400, { error: 'name must be at least 3 chars' });
      }
      const qs = new URLSearchParams({ name, limit }).toString();
      const r = await proxy('/api/people/search', qs);
      return send(res, r.ok ? r.status : (r.status || 502), { ...r.json, status: r.status });
    }

    // GET /person/:indent (with_data=true)
    if (pathname.startsWith('/person/') && req.method === 'GET') {
      const indent = pathname.split('/').pop();
      const with_data = u.searchParams.get('with_data') || 'true';
      const qs = new URLSearchParams({ with_data }).toString();
      const r = await proxy(`/api/people/${indent}`, qs);
      return send(res, r.ok ? r.status : (r.status || 502), { ...r.json, status: r.status });
    }

    // GET /relationships/:identifier
    if (pathname.startsWith('/relationships/') && req.method === 'GET') {
      const identifier = pathname.split('/').pop();
      const depth = u.searchParams.get('depth') || '2';
      const type = u.searchParams.get('type') || 'ownership';
      const include_historical = u.searchParams.get('include_historical') || 'false';
      const qs = new URLSearchParams({ depth, type, include_historical }).toString();
      const r = await proxy(`/api/relationships/${identifier}`, qs);
      return send(res, r.ok ? r.status : (r.status || 502), { ...r.json, status: r.status });
    }

    // GET /company/:uic
    if (pathname.startsWith('/company/') && req.method === 'GET') {
      const uic = pathname.split('/').pop();
      const with_data = u.searchParams.get('with_data') || 'true';
      const qs = new URLSearchParams({ with_data }).toString();
      const r = await proxy(`/api/companies/${uic}`, qs);
      return send(res, r.ok ? r.status : (r.status || 502), { ...r.json, status: r.status });
    }

    return notFound(res);
  } catch (e) {
    logError(e);
    return send(res, 500, { error: e?.message || 'proxy_error' });
  }
});

server.listen(PORT, () => {
  console.log(`[proxy] CompanyBook proxy listening on http://localhost:${PORT}`);
});
