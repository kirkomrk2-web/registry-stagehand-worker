#!/usr/bin/env node
/**
 * Simple Proxy Status Server for Dashboard
 * Port: 4322
 * Provides mock proxy data for testing
 */

import http from 'http';

const PORT = 4322;

// Mock proxy data
const proxies = [
  { id: 1, name: 'US Proxy 1', country: 'FI', health: 95, status: 'active' },
  { id: 2, name: 'EU Proxy 2', country: 'EE', health: 87, status: 'idle' },
  { id: 3, name: 'Asia Proxy 3', country: 'BG', health: 62, status: 'current' },
  { id: 4, name: 'US Proxy 4', country: 'EE', health: 34, status: 'idle' },
];

// Server
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
  
  if (req.url === '/status' || req.url === '/') {
    // Return proxy status
    const response = {
      current: proxies.find(p => p.status === 'current'),
      proxies: proxies,
      nextRotation: Date.now() + 180000, // 3 minutes from now
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'Proxy Status Server' }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`[Proxy Status Server] Running on http://localhost:${PORT}`);
  console.log(`[Proxy Status Server] Health: http://localhost:${PORT}/health`);
  console.log(`[Proxy Status Server] Status: http://localhost:${PORT}/status`);
});
