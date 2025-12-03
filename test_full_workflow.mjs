#!/usr/bin/env node
/**
 * Full Workflow Test - End to End Simulation
 * Tests: CompanyBook API → Registry Check → Users Pending Worker → Wallester Dashboard
 * 
 * Test Case: Даниел Миленов Мартинов
 */

import { createClient } from '@supabase/supabase-js';

// Colors for console output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  step: (msg) => console.log(`\n${COLORS.bright}${COLORS.cyan}► ${msg}${COLORS.reset}`),
  success: (msg) => console.log(`${COLORS.green}✓ ${msg}${COLORS.reset}`),
  error: (msg) => console.log(`${COLORS.red}✗ ${msg}${COLORS.reset}`),
  warn: (msg) => console.log(`${COLORS.yellow}⚠ ${msg}${COLORS.reset}`),
  info: (msg) => console.log(`${COLORS.magenta}  ${msg}${COLORS.reset}`),
};

// Configuration
const TEST_NAME = 'Даниел Миленов Мартинов';
const TEST_EMAIL = 'test@example.com';
const COMPANYBOOK_PROXY = 'http://localhost:4321';
const WALLESTER_API = 'http://localhost:4323';
const PROXY_STATUS_API = 'http://localhost:4322';

// Supabase config from env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Test Results
const results = {
  companyBookSearch: null,
  registryCheck: null,
  usersPendingWorker: null,
  wallesterDashboard: null,
  proxyStatus: null,
};

/**
 * Step 1: Test CompanyBook API Proxy
 */
async function testCompanyBookAPI() {
  log.step('Step 1: Test CompanyBook API - Person Search');
  
  try {
    const url = `${COMPANYBOOK_PROXY}/person-search?name=${encodeURIComponent(TEST_NAME)}&limit=5`;
    log.info(`URL: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    log.success(`Found ${data.results?.length || 0} candidates`);
    
    if (data.results && data.results.length > 0) {
      const person = data.results[0];
      log.info(`  Name: ${person.name}`);
      log.info(`  ID: ${person.indent || person.identifier || person.id}`);
      results.companyBookSearch = { success: true, candidates: data.results.length, person };
      
      // Test relationships
      const pid = person.indent || person.identifier || person.id;
      log.info(`\n  Checking relationships for ${pid}...`);
      const relUrl = `${COMPANYBOOK_PROXY}/relationships/${pid}?type=ownership&depth=2`;
      const relResponse = await fetch(relUrl);
      const relData = await relResponse.json();
      
      const companies = extractCompaniesFromRelationships(relData);
      log.success(`  Found ${companies.length} companies (100% owned/ET)`);
      companies.forEach((c, i) => {
        log.info(`    ${i+1}. ${c.name_bg || c.eik} [${c.category}]`);
      });
      
      results.companyBookSearch.companies = companies;
    } else {
      log.warn('No candidates found');
      results.companyBookSearch = { success: false, reason: 'no_candidates' };
    }
    
    return true;
  } catch (error) {
    log.error(`CompanyBook API failed: ${error.message}`);
    results.companyBookSearch = { success: false, error: error.message };
    return false;
  }
}

/**
 * Step 2: Test Registry Check (simulated)
 */
async function testRegistryCheck() {
  log.step('Step 2: Test Registry Check Flow');
  
  if (!supabase) {
    log.warn('Supabase not configured - skipping');
    results.registryCheck = { success: false, reason: 'supabase_not_configured' };
    return false;
  }
  
  try {
    // Simulate user_registry_checks insert
    log.info('Simulating registry_check Edge Function...');
    
    const mockData = {
      email: TEST_EMAIL,
      full_name: TEST_NAME,
      match_count: results.companyBookSearch?.companies?.length || 0,
      any_match: (results.companyBookSearch?.companies?.length || 0) > 0,
      companies: results.companyBookSearch?.companies || [],
    };
    
    log.success('Registry check data prepared:');
    log.info(`  Email: ${mockData.email}`);
    log.info(`  Full Name: ${mockData.full_name}`);
    log.info(`  Companies: ${mockData.companies.length}`);
    log.info(`  Any Match: ${mockData.any_match}`);
    
    results.registryCheck = { success: true, data: mockData };
    return true;
  } catch (error) {
    log.error(`Registry check failed: ${error.message}`);
    results.registryCheck = { success: false, error: error.message };
    return false;
  }
}

/**
 * Step 3: Test Users Pending Worker - REAL INSERTION
 */
async function testUsersPendingWorker() {
  log.step('Step 3: Test Users Pending Worker Flow');
  
  if (!supabase) {
    log.warn('Supabase not configured - skipping');
    results.usersPendingWorker = { success: false, reason: 'supabase_not_configured' };
    return false;
  }
  
  try {
    log.info('Checking for verified_owners...');
    
    // Try to find existing owner
    const { data: owners, error } = await supabase
      .from('verified_owners')
      .select('*')
      .ilike('full_name', `%${TEST_NAME}%`)
      .limit(1);
    
    if (error) throw error;
    
    if (owners && owners.length > 0) {
      const owner = owners[0];
      log.success(`Found existing verified owner:`);
      log.info(`  ID: ${owner.id}`);
      log.info(`  Full Name: ${owner.full_name}`);
      log.info(`  Phone: ${owner.allocated_phone_number || 'Not allocated'}`);
      log.info(`  Email Alias: ${owner.email_alias_33mail || 'Not generated'}`);
      log.info(`  Companies: ${owner.companies?.length || 0}`);
      
      if (owner.top_company) {
        log.info(`\n  Top Company:`);
        log.info(`    Business Name (EN): ${owner.top_company.business_name_en}`);
        log.info(`    EIK: ${owner.top_company.eik}`);
        log.info(`    Entity Type: ${owner.top_company.entity_type}`);
      }
      
      results.usersPendingWorker = { success: true, owner };
    } else {
      log.warn(`No verified_owner found for "${TEST_NAME}"`);
      log.info('\n  Creating new verified_owner via users_pending_worker...');
      
      // First, ensure user exists in users_pending
      const { error: insertErr } = await supabase
        .from('users_pending')
        .upsert({
          full_name: TEST_NAME,
          email: TEST_EMAIL,
          status: 'pending',
        }, { onConflict: 'email' });
      
      if (insertErr) {
        log.warn(`  Could not insert to users_pending: ${insertErr.message}`);
      } else {
        log.success('  User added to users_pending');
      }
      
      // Call users_pending_worker Edge Function
      log.info('  Calling users_pending_worker Edge Function...');
      const workerUrl = `${SUPABASE_URL}/functions/v1/users_pending_worker`;
      
      const workerResponse = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: TEST_NAME,
          email: TEST_EMAIL,
          status: 'pending',
        }),
      });
      
      if (!workerResponse.ok) {
        const errorText = await workerResponse.text();
        log.error(`  Edge Function failed: ${workerResponse.status} - ${errorText}`);
        results.usersPendingWorker = { success: false, error: `HTTP ${workerResponse.status}` };
        return false;
      }
      
      const workerData = await workerResponse.json();
      log.success('  Edge Function completed successfully!');
      log.info(`  Owner ID: ${workerData.owner_id}`);
      log.info(`  Full Name: ${workerData.full_name}`);
      log.info(`  First Name: ${workerData.owner_first_name_en || 'N/A'}`);
      log.info(`  Last Name: ${workerData.owner_last_name_en || 'N/A'}`);
      log.info(`  Phone: ${workerData.allocated_phone_number || 'Not allocated'}`);
      log.info(`  Email Alias: ${workerData.email_alias_33mail || 'Not generated'}`);
      log.info(`  Companies: ${workerData.companies?.length || 0}`);
      
      if (workerData.top_company) {
        log.info(`\n  Top Company:`);
        log.info(`    Business Name (EN): ${workerData.top_company.business_name_en}`);
        log.info(`    EIK: ${workerData.top_company.eik}`);
        log.info(`    Entity Type: ${workerData.top_company.entity_type}`);
      }
      
      results.usersPendingWorker = { success: true, owner: workerData };
    }
    
    return true;
  } catch (error) {
    log.error(`Users pending worker failed: ${error.message}`);
    results.usersPendingWorker = { success: false, error: error.message };
    return false;
  }
}

/**
 * Step 4: Test Proxy Status API
 */
async function testProxyStatus() {
  log.step('Step 4: Test Proxy Rotation Status');
  
  try {
    const response = await fetch(`${PROXY_STATUS_API}/status`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    log.success('Proxy Status API responding');
    log.info(`  Active Proxies: ${data.stats?.activeProxies || 0}`);
    log.info(`  Healthy Proxies: ${data.stats?.healthyProxies || 0}`);
    log.info(`  Total Requests: ${data.stats?.totalRequests || 0}`);
    log.info(`  Success Rate: ${data.stats?.successRate || 0}%`);
    
    if (data.current) {
      log.info(`\n  Current Proxy:`);
      log.info(`    ID: ${data.current.id}`);
      log.info(`    Health: ${data.current.health}%`);
      log.info(`    Country: ${data.current.country || 'Unknown'}`);
    }
    
    results.proxyStatus = { success: true, data };
    return true;
  } catch (error) {
    log.error(`Proxy status API failed: ${error.message}`);
    log.warn('Make sure proxy_status_server.mjs is running on port 4322');
    results.proxyStatus = { success: false, error: error.message };
    return false;
  }
}

/**
 * Step 5: Test Wallester Automation API
 */
async function testWallesterAPI() {
  log.step('Step 5: Test Wallester Automation API');
  
  try {
    const response = await fetch(`${WALLESTER_API}/health`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    log.success('Wallester API responding');
    log.info(`  Status: ${data.status}`);
    log.info(`  Supabase Connected: ${data.supabase ? 'Yes' : 'No'}`);
    log.info(`  Active Operations: ${data.operations || 0}`);
    
    results.wallesterDashboard = { success: true, data };
    return true;
  } catch (error) {
    log.error(`Wallester API failed: ${error.message}`);
    log.warn('Make sure wallester_automation_server.mjs is running on port 4323');
    results.wallesterDashboard = { success: false, error: error.message };
    return false;
  }
}

/**
 * Helper: Extract companies from relationships
 */
function extractCompaniesFromRelationships(relData) {
  const companies = [];
  const relationships = relData?.relationships || [];
  
  for (const rel of relationships) {
    const entity = rel.entity || {};
    const rtype = rel.relationshipType || rel.type || '';
    const isActive = rel.isActive !== false;
    
    if (!isActive || entity.type !== 'company') continue;
    
    const shareStr = rel?.metadata?.share || rel?.metadata?.percentage || null;
    const shareNum = typeof shareStr === 'string' ? parseFloat(String(shareStr).replace('%', '')) : (typeof shareStr === 'number' ? shareStr : NaN);
    const isSole = rtype === 'SoleCapitalOwner' || (!isNaN(shareNum) && Math.round(shareNum) === 100);
    const isET = rtype === 'PhysicalPersonTrader';
    
    if (isSole || isET) {
      const category = isET ? 'ET' : (rtype === 'SoleCapitalOwner' ? 'SoleCapitalOwner' : 'Partners100');
      companies.push({
        eik: entity.id || entity.uic || null,
        name_bg: entity.name || null,
        category
      });
    }
  }
  
  return companies;
}

/**
 * Print Summary
 */
function printSummary() {
  console.log(`\n${COLORS.bright}═══════════════════════════════════════════════${COLORS.reset}`);
  console.log(`${COLORS.bright}            TEST SUMMARY${COLORS.reset}`);
  console.log(`${COLORS.bright}═══════════════════════════════════════════════${COLORS.reset}\n`);
  
  const tests = [
    { name: 'CompanyBook API', result: results.companyBookSearch },
    { name: 'Registry Check', result: results.registryCheck },
    { name: 'Users Pending Worker', result: results.usersPendingWorker },
    { name: 'Proxy Status API', result: results.proxyStatus },
    { name: 'Wallester API', result: results.wallesterDashboard },
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach(test => {
    const success = test.result?.success === true;
    const icon = success ? '✓' : '✗';
    const color = success ? COLORS.green : COLORS.red;
    console.log(`${color}${icon}${COLORS.reset} ${test.name}`);
    
    if (success) passed++;
    else failed++;
  });
  
  console.log(`\n${COLORS.bright}Results: ${COLORS.green}${passed} passed${COLORS.reset}${COLORS.bright}, ${COLORS.red}${failed} failed${COLORS.reset}\n`);
  
  if (failed === 0) {
    console.log(`${COLORS.green}${COLORS.bright}🎉 All tests passed!${COLORS.reset}\n`);
  } else {
    console.log(`${COLORS.red}${COLORS.bright}⚠️  Some tests failed. Check the output above for details.${COLORS.reset}\n`);
  }
}

/**
 * Main Test Runner
 */
async function runTests() {
  console.log(`${COLORS.bright}${COLORS.cyan}`);
  console.log(`╔═══════════════════════════════════════════════╗`);
  console.log(`║    FULL WORKFLOW TEST - END TO END            ║`);
  console.log(`║    Test Case: ${TEST_NAME}    ║`);
  console.log(`╚═══════════════════════════════════════════════╝`);
  console.log(COLORS.reset);
  
  // Check configuration
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    log.warn('Supabase not configured - some tests will be skipped');
    log.info('Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables\n');
  }
  
  // Run tests
  await testCompanyBookAPI();
  await testRegistryCheck();
  await testUsersPendingWorker();
  await testProxyStatus();
  await testWallesterAPI();
  
  // Print summary
  printSummary();
}

// Run
runTests().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
