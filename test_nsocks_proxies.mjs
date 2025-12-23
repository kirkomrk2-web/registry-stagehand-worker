#!/usr/bin/env node
/**
 * Test NSocks Proxy Integration
 * Fetch Bulgarian proxies and test with CompanyBook API
 */

import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';

const NSOCKS_API_URL = 'https://api.nsocks.com/web_v1/ip/get-ip-v3?num=10&cc=BG&state=&city=&protocol=1&format=txt&lb=\\r\\n&life=30&pt=9&app_key=caf457626467d5c4ee3af3a583238a0d';

console.log('═══════════════════════════════════════════════════════════');
console.log('  NSOCKS PROXY TEST - Bulgarian Proxies');
console.log('═══════════════════════════════════════════════════════════\n');

async function fetchNSocksProxies() {
  console.log('📡 Fetching proxies from NSocks API...');
  console.log(`URL: ${NSOCKS_API_URL}\n`);
  
  try {
    const response = await fetch(NSOCKS_API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log('✅ Response received\n');
    console.log('Raw response:');
    console.log('─────────────────────────────────────────────────────');
    console.log(text);
    console.log('─────────────────────────────────────────────────────\n');
    
    // Parse proxies from text
    const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
    console.log(`📊 Found ${lines.length} proxy lines\n`);
    
    const proxies = [];
    for (const line of lines) {
      // Format: host:port:user:pass or host:port
      const parts = line.split(':');
      if (parts.length >= 2) {
        proxies.push({
          host: parts[0],
          port: parseInt(parts[1]),
          username: parts[2] || null,
          password: parts[3] || null,
          raw: line
        });
      }
    }
    
    return proxies;
  } catch (error) {
    console.error('❌ Error fetching proxies:', error.message);
    return [];
  }
}

async function testProxyWithCompanyBook(proxy, index) {
  console.log(`\n[${index + 1}] Testing proxy: ${proxy.host}:${proxy.port}`);
  console.log('─────────────────────────────────────────────────────');
  
  try {
    // Build SOCKS5 proxy URL (NSocks uses SOCKS5)
    let proxyUrl;
    if (proxy.username && proxy.password) {
      proxyUrl = `socks5://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    } else {
      proxyUrl = `socks5://${proxy.host}:${proxy.port}`;
    }
    
    const agent = new SocksProxyAgent(proxyUrl);
    
    // Test with CompanyBook API - simple search
    const testUrl = 'https://api.companybook.bg/api/people/search?name=Иван+Иванов';
    
    console.log(`  📞 Calling CompanyBook API...`);
    const startTime = Date.now();
    
    const response = await fetch(testUrl, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (response.ok) {
      const data = await response.json();
      const resultCount = data?.results?.length || 0;
      console.log(`  ✅ SUCCESS - ${response.status} (${duration}ms)`);
      console.log(`  📊 Results: ${resultCount} people found`);
      return { success: true, duration, proxy: proxy.raw };
    } else {
      console.log(`  ❌ FAILED - HTTP ${response.status} (${duration}ms)`);
      return { success: false, duration, error: `HTTP ${response.status}`, proxy: proxy.raw };
    }
  } catch (error) {
    console.log(`  ❌ ERROR - ${error.message}`);
    return { success: false, error: error.message, proxy: proxy.raw };
  }
}

async function main() {
  // Step 1: Fetch proxies
  const proxies = await fetchNSocksProxies();
  
  if (proxies.length === 0) {
    console.log('❌ No proxies available. Exiting.\n');
    return;
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PROXY LIST');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  proxies.forEach((proxy, i) => {
    const auth = proxy.username ? `${proxy.username}:${proxy.password}@` : '';
    console.log(`${i + 1}. ${auth}${proxy.host}:${proxy.port}`);
  });
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TESTING PROXIES WITH COMPANYBOOK API');
  console.log('═══════════════════════════════════════════════════════════');
  
  const results = [];
  
  // Test first 5 proxies (to save time)
  const testLimit = Math.min(5, proxies.length);
  for (let i = 0; i < testLimit; i++) {
    const result = await testProxyWithCompanyBook(proxies[i], i);
    results.push(result);
    
    // Small delay between tests
    if (i < testLimit - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  // Summary
  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Total tested: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    console.log(`⏱️  Average response time: ${avgDuration.toFixed(0)}ms`);
    
    console.log('\n✅ Working proxies:');
    successful.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.proxy} (${r.duration}ms)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed proxies:');
    failed.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.proxy} - ${r.error}`);
    });
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  
  // Recommendations
  if (successful.length > 0) {
    console.log('\n🎉 PROXIES WORKING! You can integrate them into the system.');
    console.log('\nNext steps:');
    console.log('1. Update config/proxies.mjs with working proxies');
    console.log('2. Set COMPANYBOOK_PROXY env variable');
    console.log('3. Deploy updated configuration');
  } else {
    console.log('\n⚠️  NO WORKING PROXIES FOUND');
    console.log('\nPossible issues:');
    console.log('- Proxies might need authentication');
    console.log('- NSocks package might not be active');
    console.log('- Proxies might be rate-limited');
    console.log('- Check NSocks dashboard for package status');
  }
  
  console.log('\n');
}

main().catch(console.error);
