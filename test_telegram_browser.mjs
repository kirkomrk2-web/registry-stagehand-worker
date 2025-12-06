#!/usr/bin/env node
/**
 * Telegram Browser Automation Test
 * Uses Browserbase MCP to automate Telegram Web
 * Profile: Kristina or new profile with stealth mode
 */

import { createClient } from '@supabase/supabase-js';

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ansiaiuaygcfztabtknl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Colors
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const log = {
  step: (msg) => console.log(`\n${COLORS.bright}${COLORS.cyan}► ${msg}${COLORS.reset}`),
  success: (msg) => console.log(`${COLORS.green}✓ ${msg}${COLORS.reset}`),
  error: (msg) => console.log(`${COLORS.red}✗ ${msg}${COLORS.reset}`),
  warn: (msg) => console.log(`${COLORS.yellow}⚠ ${msg}${COLORS.reset}`),
  info: (msg) => console.log(`  ${msg}`),
};

// Helper to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Random between min and max
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * TEST TELEGRAM BROWSER AUTOMATION
 * 
 * IMPORTANT: You need to use Browserbase MCP tools manually in this test.
 * This script will guide you through the steps.
 * 
 * Use the following MCP tools:
 * - cqhs-X0mcp0browserbase_session_create
 * - cqhs-X0mcp0browserbase_stagehand_navigate
 * - cqhs-X0mcp0browserbase_stagehand_act
 * - cqhs-X0mcp0browserbase_stagehand_extract
 * - cqhs-X0mcp0browserbase_screenshot
 * - cqhs-X0mcp0browserbase_stagehand_get_url
 * - cqhs-X0mcp0browserbase_session_close
 */

async function testTelegramBrowserAutomation() {
  console.log(`${COLORS.bright}${COLORS.cyan}`);
  console.log(`╔═══════════════════════════════════════════════════════════╗`);
  console.log(`║   TELEGRAM BROWSER AUTOMATION TEST                        ║`);
  console.log(`║   Using Browserbase MCP + Stagehand                       ║`);
  console.log(`╚═══════════════════════════════════════════════════════════╝`);
  console.log(COLORS.reset);

  log.warn('⚠️  MANUAL TEST REQUIRED');
  log.info('This test requires you to use Browserbase MCP tools manually.');
  log.info('Follow the steps below:\n');

  // ====================
  // STEP 1: Create Session
  // ====================
  log.step('Step 1: Create Browserbase Session');
  log.info('Run this MCP tool:');
  log.info('  Tool: cqhs-X0mcp0browserbase_session_create');
  log.info('  Parameters: {} (empty, will create new session)');
  log.info('');
  log.info('Expected Result: Session ID returned');
  log.info('Press ENTER when session is created...');
  
  // Wait for user
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });
  
  // ====================
  // STEP 2: Navigate to Telegram Web
  // ====================
  log.step('Step 2: Navigate to Telegram Web');
  log.info('Run this MCP tool:');
  log.info('  Tool: cqhs-X0mcp0browserbase_stagehand_navigate');
  log.info('  Parameters: { url: "https://web.telegram.org" }');
  log.info('');
  log.info('Expected Result: Page loads with Telegram Web interface');
  log.info('Press ENTER when page loaded...');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  // ====================
  // STEP 3: Take Screenshot
  // ====================
  log.step('Step 3: Take Screenshot of Telegram Web');
  log.info('Run this MCP tool:');
  log.info('  Tool: cqhs-X0mcp0browserbase_screenshot');
  log.info('  Parameters: { name: "telegram_web_loaded" }');
  log.info('');
  log.info('Expected Result: Screenshot saved');
  log.info('Press ENTER when screenshot taken...');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  // ====================
  // STEP 4: Check Login Status
  // ====================
  log.step('Step 4: Check if Logged In');
  log.info('Run this MCP tool:');
  log.info('  Tool: cqhs-X0mcp0browserbase_stagehand_extract');
  log.info('  Parameters:');
  log.info('  {');
  log.info('    instruction: "Extract the current page status. Check if user is logged in to Telegram or if login is required. Look for QR code, phone input, or chat interface."');
  log.info('  }');
  log.info('');
  log.info('Expected Result: JSON with login status');
  log.info('Press ENTER to continue...');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  log.warn('\n📝 Based on the extract result, did you see:');
  log.info('  A) QR Code for login?');
  log.info('  B) Phone number input?');
  log.info('  C) Chat interface (already logged in)?');
  log.info('');
  log.info('If NOT logged in (A or B), you need to login first.');
  log.info('Press ENTER to continue to next steps...');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  // ====================
  // STEP 5: Get Chat List (if logged in)
  // ====================
  log.step('Step 5: Extract Chat List (if logged in)');
  log.info('Run this MCP tool:');
  log.info('  Tool: cqhs-X0mcp0browserbase_stagehand_extract');
  log.info('  Parameters:');
  log.info('  {');
  log.info('    instruction: "Extract all visible chat names from the left sidebar. Include both personal chats and groups."');
  log.info('  }');
  log.info('');
  log.info('Expected Result: Array of chat names');
  log.info('Press ENTER when done...');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  // ====================
  // STEP 6: Test Opening a Chat
  // ====================
  log.step('Step 6: Open a Specific Chat');
  log.info('Run this MCP tool:');
  log.info('  Tool: cqhs-X0mcp0browserbase_stagehand_act');
  log.info('  Parameters:');
  log.info('  {');
  log.info('    action: "Click on the first chat in the chat list"');
  log.info('  }');
  log.info('');
  log.info('Expected Result: Chat opens, messages visible');
  log.info('Press ENTER when chat opened...');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  // ====================
  // STEP 7: Take Screenshot of Chat
  // ====================
  log.step('Step 7: Screenshot of Opened Chat');
  log.info('Run this MCP tool:');
  log.info('  Tool: cqhs-X0mcp0browserbase_screenshot');
  log.info('  Parameters: { name: "telegram_chat_opened" }');
  log.info('');
  log.info('Expected Result: Screenshot of chat saved');
  log.info('Press ENTER when done...');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  // ====================
  // STEP 8: Extract Messages
  // ====================
  log.step('Step 8: Extract Last 10 Messages');
  log.info('Run this MCP tool:');
  log.info('  Tool: cqhs-X0mcp0browserbase_stagehand_extract');
  log.info('  Parameters:');
  log.info('  {');
  log.info('    instruction: "Extract the last 10 messages in this chat. For each message, get: author name, message text, timestamp, and if author is a bot or admin."');
  log.info('  }');
  log.info('');
  log.info('Expected Result: Array of 10 messages with details');
  log.info('Press ENTER when done...');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  // ====================
  // STEP 9: Test Smart Liking Logic
  // ====================
  log.step('Step 9: Test Smart Liking (Simulation)');
  log.info('Based on the messages extracted:');
  log.info('  1. Filter out bots (username ends with "bot")');
  log.info('  2. Filter out admins');
  log.info('  3. Filter out users you liked in last 1-2 hours');
  log.info('  4. Like every 5-10 messages');
  log.info('');
  log.info('To like a message, run:');
  log.info('  Tool: cqhs-X0mcp0browserbase_stagehand_act');
  log.info('  Parameters:');
  log.info('  {');
  log.info('    action: "React to the 3rd message with a thumbs up emoji"');
  log.info('  }');
  log.info('');
  log.info('Press ENTER when ready to continue...');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  // ====================
  // STEP 10: Test Sending a Message
  // ====================
  log.step('Step 10: Test Sending a Message');
  log.info('Run this MCP tool:');
  log.info('  Tool: cqhs-X0mcp0browserbase_stagehand_act');
  log.info('  Parameters:');
  log.info('  {');
  log.info('    action: "Type a test message in the message box"');
  log.info('  }');
  log.info('');
  log.info('Then send it:');
  log.info('  Tool: cqhs-X0mcp0browserbase_stagehand_act');
  log.info('  Parameters: { action: "Click the send button" }');
  log.info('');
  log.warn('⚠️  Warning: This will actually send a message!');
  log.info('Press ENTER if you want to test this (or Ctrl+C to skip)...');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  // ====================
  // STEP 11: Get Current URL
  // ====================
  log.step('Step 11: Get Current URL');
  log.info('Run this MCP tool:');
  log.info('  Tool: cqhs-X0mcp0browserbase_stagehand_get_url');
  log.info('  Parameters: {}');
  log.info('');
  log.info('Expected Result: Current Telegram Web URL');
  log.info('Press ENTER when done...');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  // ====================
  // STEP 12: Close Session
  // ====================
  log.step('Step 12: Close Browserbase Session');
  log.info('Run this MCP tool:');
  log.info('  Tool: cqhs-X0mcp0browserbase_session_close');
  log.info('  Parameters: {}');
  log.info('');
  log.info('Expected Result: Session closed');
  log.info('Press ENTER when done...');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  // ====================
  // Summary
  // ====================
  log.success('\n🎉 Test Procedure Complete!');
  log.info('');
  log.info('Summary of what you tested:');
  log.info('  ✓ Create Browserbase session');
  log.info('  ✓ Navigate to Telegram Web');
  log.info('  ✓ Take screenshots');
  log.info('  ✓ Check login status');
  log.info('  ✓ Extract chat list');
  log.info('  ✓ Open specific chat');
  log.info('  ✓ Extract messages');
  log.info('  ✓ Simulate smart liking');
  log.info('  ✓ Send message (optional)');
  log.info('  ✓ Get current URL');
  log.info('  ✓ Close session');
  log.info('');
  log.success('📊 Next Steps:');
  log.info('  1. Save results to telegram_actions table');
  log.info('  2. Implement smart liking logic');
  log.info('  3. Add profile management');
  log.info('  4. Create automated worker');
  log.info('  5. Test with multiple groups');
  log.info('');
  log.info('See TELEGRAM_BROWSER_AUTOMATION.md for full implementation details.');
}

// ====================
// Database Helper Functions
// ====================

async function saveTestResults(results) {
  log.step('Saving Test Results to Database');
  
  try {
    const { data, error } = await supabase
      .from('telegram_actions')
      .insert({
        profile_id: null, // Will be filled when profile created
        action_type: 'test',
        target: 'telegram_web',
        details: results,
        performed_at: new Date().toISOString(),
      });

    if (error) throw error;
    
    log.success('✓ Test results saved to database');
  } catch (error) {
    log.error(`✗ Failed to save results: ${error.message}`);
  }
}

// ====================
// Run Test
// ====================

console.log('\n📋 Telegram Browser Automation Test\n');
console.log('This is a manual test guide. You will need to run MCP tools manually.');
console.log('Press ENTER to start...\n');

process.stdin.once('data', async () => {
  try {
    await testTelegramBrowserAutomation();
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
  
  process.exit(0);
});
