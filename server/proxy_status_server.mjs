// server/proxy_status_server.mjs
/**
 * Proxy Status API Server
 * Provides real-time proxy rotation status for visual dashboards
 */

import http from 'http';
import { DynamicProxyRotator } from '../browserbase-worker/lib/DynamicProxyRotator.mjs';
import { getProxiesConfig } from '../browserbase-worker/config/proxies.mjs';

const PORT = process.env.PROXY_STATUS_PORT || 4322;

// Initialize rotator with configured proxies
const proxies = getProxiesConfig();
const rotator = new DynamicProxyRotator(proxies);

// Start auto-rotation every 5 minutes
rotator.startAutoRotation(5 * 60 * 1000);

console.log('🔄 Proxy Rotator initialized with', proxies.length, 'proxies');

// Simulate some activity for testing (optional)
if (process.env.SIMULATE_ACTIVITY === 'true') {
  setInterval(() => {
    const current = rotator.getCurrent();
    if (current && Math.random() > 0.3) {
      rotator.markSuccess(current.id);
    } else if (current) {
      rotator.markFailure(current.id, 'Simulated failure');
    }
  }, 10000);
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    if (path === '/status' || path === '/') {
      // Get full status
      const summary = rotator.getSummary();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(summary, null, 2));
    } else if (path === '/stats') {
      // Get just stats
      const stats = rotator.getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats, null, 2));
    } else if (path === '/proxies') {
      // Get proxy list with status
      const proxies = rotator.getProxyStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(proxies, null, 2));
    } else if (path === '/rotate' && req.method === 'POST') {
      // Force rotation
      const next = rotator.rotateNow();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, next: next?.id, message: 'Rotated successfully' }));
    } else if (path === '/recover' && req.method === 'POST') {
      // Recover low-health proxies
      const recovered = rotator.recoverProxies();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, recovered, message: `Recovered ${recovered} proxies` }));
    } else if (path === '/reset' && req.method === 'POST') {
      // Reset all statistics
      rotator.resetStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Statistics reset' }));
    } else if (path.startsWith('/success/')) {
      // Mark proxy as successful
      const proxyId = path.split('/')[2];
      rotator.markSuccess(proxyId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, proxyId, message: 'Marked as success' }));
    } else if (path.startsWith('/failure/')) {
      // Mark proxy as failed
      const proxyId = path.split('/')[2];
      const error = url.searchParams.get('error') || 'Unknown error';
      rotator.markFailure(proxyId, error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, proxyId, message: 'Marked as failure' }));
    } else if (path.startsWith('/verified/')) {
      // Mark proxy as verified
      const proxyId = path.split('/')[2];
      const country = url.searchParams.get('country') || 'Unknown';
      rotator.markVerified(proxyId, country);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, proxyId, country, message: 'Marked as verified' }));
    } else if (path === '/current') {
      // Get current proxy
      const current = rotator.getCurrent();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(current || { message: 'No active proxy' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n✅ Proxy Status Server running on http://localhost:${PORT}`);
  console.log(`\n📊 Available endpoints:`);
  console.log(`   GET  /status     - Full proxy status and stats`);
  console.log(`   GET  /stats      - Statistics only`);
  console.log(`   GET  /proxies    - Proxy list with status`);
  console.log(`   GET  /current    - Current active proxy`);
  console.log(`   POST /rotate     - Force rotation to next proxy`);
  console.log(`   POST /recover    - Recover low-health proxies`);
  console.log(`   POST /reset      - Reset all statistics`);
  console.log(`   GET  /success/:id - Mark proxy as successful`);
  console.log(`   GET  /failure/:id?error=msg - Mark proxy as failed`);
  console.log(`   GET  /verified/:id?country=XX - Mark proxy as verified\n`);
});

// Export rotator for use in other modules
export { rotator };
