// wallesterSmsMonitorMCP.mjs
// Wallester SMS Code Monitor using Browserbase MCP Server
// Extracts authentication codes from smstome.com for Wallester registrations

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ---------- CONFIG ----------
const POLL_INTERVAL_MS = parseInt(process.env.SMS_POLL_INTERVAL_MS || '30000', 10); // 30 seconds
const MAX_WAIT_TIME_MS = 5 * 60 * 1000; // 5 minutes timeout

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[ERROR] Missing Supabase env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- MCP TOOLS WRAPPER ----------
// These functions will be replaced by actual MCP tool calls when running in MCP environment
// For standalone testing, they can be mocked

let mcpSession = null;

async function createBrowserSession() {
  console.log('[MCP] Creating Browserbase session...');
  // When running via MCP, this will call: cHJY3_0mcp0browserbase_session_create
  // For now, we simulate or throw error if not in MCP environment
  if (typeof window !== 'undefined' && window.mcpTools) {
    await window.mcpTools.browserbase_session_create({ sessionId: `wallester-sms-${Date.now()}` });
    mcpSession = true;
  } else {
    console.warn('[WARN] Not in MCP environment - MCP tools not available');
    throw new Error('MCP tools not available. Run this script via Browserbase MCP server.');
  }
}

async function navigateToUrl(url) {
  console.log(`[MCP] Navigating to: ${url}`);
  if (typeof window !== 'undefined' && window.mcpTools) {
    await window.mcpTools.browserbase_stagehand_navigate({ url });
  } else {
    throw new Error('MCP tools not available');
  }
}

async function extractData(instruction) {
  console.log(`[MCP] Extracting data: ${instruction}`);
  if (typeof window !== 'undefined' && window.mcpTools) {
    const result = await window.mcpTools.browserbase_stagehand_extract({ instruction });
    return result;
  } else {
    throw new Error('MCP tools not available');
  }
}

async function closeBrowserSession() {
  console.log('[MCP] Closing Browserbase session...');
  if (typeof window !== 'undefined' && window.mcpTools) {
    await window.mcpTools.browserbase_session_close();
    mcpSession = null;
  }
}

// ---------- WALLESTER CODE EXTRACTION ----------

/**
 * Extract Wallester verification codes from SMS messages
 * Wallester codes are typically 6-digit numbers
 */
function extractWallesterCode(text) {
  if (!text) return null;
  
  // Wallester specific patterns
  const patterns = [
    /wallester[:\s]*(\d{6})/i,
    /verification[:\s]*(\d{6})/i,
    /code[:\s]*(\d{6})/i,
    /(\d{6})/,  // Any 6-digit code as fallback
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Check phone number using Browserbase MCP for SMS codes
 */
async function checkPhoneNumberMCP(phoneRecord) {
  const { id, phone_number, sms_url } = phoneRecord;
  
  console.log(`[INFO] Checking phone ${phone_number} via MCP...`);
  console.log(`[INFO] SMS URL: ${sms_url}`);
  
  try {
    // Create browser session
    await createBrowserSession();
    
    // Navigate to SMS page
    await navigateToUrl(sms_url);
    
    // Wait a bit for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Extract SMS messages from the page
    const extractionResult = await extractData(
      'Extract all SMS messages from this page. ' +
      'For each message, get the sender name and the full message text. ' +
      'Look for messages from "Wallester" or containing verification codes. ' +
      'Return as array of objects with "from" and "text" fields.'
    );
    
    console.log('[INFO] Extraction result:', JSON.stringify(extractionResult, null, 2));
    
    // Parse extraction result
    let messages = [];
    if (extractionResult && typeof extractionResult === 'object') {
      // Handle different possible response formats
      if (Array.isArray(extractionResult)) {
        messages = extractionResult;
      } else if (extractionResult.messages && Array.isArray(extractionResult.messages)) {
        messages = extractionResult.messages;
      } else if (extractionResult.data && Array.isArray(extractionResult.data)) {
        messages = extractionResult.data;
      }
    }
    
    console.log(`[INFO] Found ${messages.length} messages`);
    
    // Look for Wallester code
    let wallesterCode = null;
    let wallesterMessage = null;
    
    for (const msg of messages) {
      const text = msg.text || msg.message || '';
      const from = msg.from || msg.sender || 'Unknown';
      
      // Check if message is from Wallester or contains Wallester
      if (text.toLowerCase().includes('wallester') || from.toLowerCase().includes('wallester')) {
        console.log(`[INFO] Found Wallester message from ${from}: ${text}`);
        wallesterCode = extractWallesterCode(text);
        if (wallesterCode) {
          wallesterMessage = { from, text };
          break;
        }
      }
    }
    
    // If no Wallester-specific message, try any 6-digit code
    if (!wallesterCode && messages.length > 0) {
      for (const msg of messages) {
        const text = msg.text || msg.message || '';
        const code = extractWallesterCode(text);
        if (code) {
          wallesterCode = code;
          wallesterMessage = { from: msg.from || 'Unknown', text };
          console.log(`[INFO] Found potential code: ${wallesterCode}`);
          break;
        }
      }
    }
    
    // Close browser session
    await closeBrowserSession();
    
    if (wallesterCode) {
      console.log(`[SUCCESS] Found Wallester code: ${wallesterCode} for ${phone_number}`);
      
      // Update sms_numbers_pool with the code
      const { error: poolError } = await supabase
        .from('sms_numbers_pool')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_from: wallesterMessage.from,
          last_verification_code: wallesterCode,
        })
        .eq('id', id);
      
      if (poolError) {
        console.error(`[ERROR] Failed to update sms_numbers_pool: ${poolError.message}`);
      }
      
      return {
        phone_number,
        code: wallesterCode,
        from: wallesterMessage.from,
        text: wallesterMessage.text,
      };
    } else {
      console.log(`[INFO] No Wallester code found for ${phone_number}`);
      return null;
    }
    
  } catch (error) {
    console.error(`[ERROR] MCP check failed for ${phone_number}:`, error);
    
    // Try to close session on error
    try {
      if (mcpSession) {
        await closeBrowserSession();
      }
    } catch (closeError) {
      console.error('[ERROR] Failed to close session:', closeError);
    }
    
    throw error;
  }
}

/**
 * Get first available phone number from Supabase
 */
async function getAvailablePhone() {
  console.log('[INFO] Fetching available phone number from Supabase...');
  
  const { data, error } = await supabase
    .from('sms_numbers_pool')
    .select('*')
    .eq('status', 'available')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      console.log('[INFO] No available phone numbers in pool');
      return null;
    }
    console.error('[ERROR] Failed to fetch phone number:', error.message);
    return null;
  }
  
  return data;
}

/**
 * Mark phone as assigned
 */
async function assignPhone(phoneId, assignedTo) {
  const { error } = await supabase
    .from('sms_numbers_pool')
    .update({
      status: 'assigned',
      assigned_to: assignedTo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', phoneId);
  
  if (error) {
    console.error('[ERROR] Failed to assign phone:', error.message);
    return false;
  }
  
  return true;
}

/**
 * Poll single phone number until code is received or timeout
 */
async function pollPhoneForCode(phoneRecord, maxWaitMs = MAX_WAIT_TIME_MS) {
  const startTime = Date.now();
  const checkInterval = POLL_INTERVAL_MS;
  
  console.log(`[INFO] Polling phone ${phoneRecord.phone_number} for Wallester code...`);
  console.log(`[INFO] Max wait time: ${maxWaitMs / 1000} seconds`);
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const result = await checkPhoneNumberMCP(phoneRecord);
      
      if (result && result.code) {
        console.log(`[SUCCESS] Code received: ${result.code}`);
        return result;
      }
      
      // Wait before next check
      const elapsed = Date.now() - startTime;
      const remaining = maxWaitMs - elapsed;
      
      if (remaining > 0) {
        const waitTime = Math.min(checkInterval, remaining);
        console.log(`[INFO] No code yet. Waiting ${waitTime / 1000}s before next check...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
    } catch (error) {
      console.error(`[ERROR] Check failed: ${error.message}`);
      // Wait a bit before retrying even on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('[TIMEOUT] No code received within timeout period');
  return null;
}

// ---------- CLI INTERFACE ----------

/**
 * Main CLI function for manual testing
 * Usage: node wallesterSmsMonitorMCP.mjs [watch|once]
 */
async function main() {
  const mode = process.argv[2] || 'once';
  
  console.log('='.repeat(60));
  console.log('  WALLESTER SMS MONITOR (Browserbase MCP)');
  console.log('='.repeat(60));
  console.log(`Mode: ${mode}`);
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log('='.repeat(60));
  
  if (mode === 'watch') {
    // Continuous monitoring mode
    console.log('[INFO] Starting continuous monitoring...');
    
    while (true) {
      try {
        // Get all assigned phones
        const { data: assignedPhones, error } = await supabase
          .from('sms_numbers_pool')
          .select('*')
          .eq('status', 'assigned')
          .is('last_verification_code', null); // Only check phones without a code yet
        
        if (error) {
          console.error('[ERROR] Failed to fetch assigned phones:', error.message);
        } else if (assignedPhones && assignedPhones.length > 0) {
          console.log(`[INFO] Checking ${assignedPhones.length} assigned phone(s)...`);
          
          for (const phone of assignedPhones) {
            try {
              await checkPhoneNumberMCP(phone);
            } catch (e) {
              console.error(`[ERROR] Failed to check ${phone.phone_number}:`, e.message);
            }
            // Small delay between phones
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else {
          console.log('[INFO] No assigned phones to check');
        }
        
        // Wait before next poll cycle
        console.log(`[INFO] Waiting ${POLL_INTERVAL_MS / 1000}s before next cycle...`);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        
      } catch (error) {
        console.error('[ERROR] Monitoring cycle failed:', error);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
  } else {
    // Single check mode
    console.log('[INFO] Single check mode - looking for first available phone...');
    
    const phone = await getAvailablePhone();
    
    if (!phone) {
      console.log('[ERROR] No available phone numbers in pool');
      console.log('[HINT] Add phone numbers to sms_numbers_pool table with status="available"');
      process.exit(1);
    }
    
    console.log(`[INFO] Found phone: ${phone.phone_number}`);
    console.log(`[INFO] SMS URL: ${phone.sms_url}`);
    
    // Mark as assigned for testing
    await assignPhone(phone.id, 'test_assignment');
    
    // Poll for code
    const result = await pollPhoneForCode(phone);
    
    if (result) {
      console.log('\n' + '='.repeat(60));
      console.log('[SUCCESS] Wallester Code Received!');
      console.log('='.repeat(60));
      console.log(`Phone: ${result.phone_number}`);
      console.log(`Code: ${result.code}`);
      console.log(`From: ${result.from}`);
      console.log(`Message: ${result.text}`);
      console.log('='.repeat(60));
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('[TIMEOUT] No code received');
      console.log('='.repeat(60));
    }
  }
}

// ---------- EXPORTS ----------

export {
  checkPhoneNumberMCP,
  getAvailablePhone,
  assignPhone,
  pollPhoneForCode,
  extractWallesterCode,
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('[FATAL]', error);
    process.exit(1);
  });
}
