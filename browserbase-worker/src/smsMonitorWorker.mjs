// smsMonitorWorker.mjs
// Worker that monitors smstome.com phone number pages for new SMS verification codes
// Polls assigned phone numbers and extracts verification codes

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// ---------- CONFIG ----------
const POLL_INTERVAL_MS = parseInt(process.env.SMS_POLL_INTERVAL_MS || '30000', 10); // 30 seconds default
const MAX_CONCURRENT_CHECKS = 5;

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[ERROR] Missing Supabase env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- SMS Parsing Utilities ----------

/**
 * Extract verification codes from SMS text
 * Looks for 4-6 digit codes that are likely verification codes
 */
function extractVerificationCode(smsText) {
  if (!smsText) return null;
  
  // Common patterns for verification codes
  const patterns = [
    /(?:verification|verify|code|код|код за|потвърждение)[:\s]*(\d{4,6})/i,
    /(?:your code is|ваш код е)[:\s]*(\d{4,6})/i,
    /(\d{6})(?:\s|$)/,  // 6-digit codes at word boundary
    /(\d{5})(?:\s|$)/,  // 5-digit codes at word boundary
    /(\d{4})(?:\s|$)/,  // 4-digit codes at word boundary
    /^(\d{4,6})$/,       // Standalone codes
  ];
  
  for (const pattern of patterns) {
    const match = smsText.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Last resort: find any 4-6 digit sequence
  const digitMatch = smsText.match(/\b(\d{4,6})\b/);
  if (digitMatch) {
    return digitMatch[1];
  }
  
  return null;
}

/**
 * Fetch SMS messages from smstome.com phone number page
 * URL format: https://smstome.com/country/finland/{phone_suffix}.html
 */
async function fetchSMSFromSmstome(smsUrl) {
  if (!smsUrl) return { success: false, error: 'No SMS URL provided' };
  
  try {
    console.log(`[INFO] Fetching SMS from: ${smsUrl}`);
    
    const response = await fetch(smsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    
    const html = await response.text();
    
    // Parse SMS messages from the page
    const messages = parseSmstomePage(html);
    
    return { success: true, messages };
  } catch (error) {
    console.error(`[ERROR] Failed to fetch SMS: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Parse smstome.com page HTML to extract SMS messages
 */
function parseSmstomePage(html) {
  const messages = [];
  
  // Pattern 1: Table-based layout (common on smstome.com)
  // <tr><td>FROM</td><td>MESSAGE</td><td>TIME</td></tr>
  const tableRowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  let match;
  
  while ((match = tableRowRegex.exec(html)) !== null) {
    const from = stripHtml(match[1]);
    const text = stripHtml(match[2]);
    const time = stripHtml(match[3]);
    
    // Skip header rows
    if (from.toLowerCase() === 'from' || from.toLowerCase() === 'sender') {
      continue;
    }
    
    // Skip empty messages
    if (!text || text.trim().length === 0) {
      continue;
    }
    
    messages.push({
      from: from.trim(),
      text: text.trim(),
      time: time.trim(),
      raw: match[0],
    });
  }
  
  // Pattern 2: Div-based layout
  const divRegex = /<div[^>]*class="[^"]*message[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  while ((match = divRegex.exec(html)) !== null) {
    const content = stripHtml(match[1]);
    if (content && content.trim().length > 0) {
      messages.push({
        from: 'Unknown',
        text: content.trim(),
        time: new Date().toISOString(),
        raw: match[0],
      });
    }
  }
  
  return messages;
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check a single phone number for new messages
 */
async function checkPhoneNumber(phoneRecord) {
  const { id, phone_number, sms_url, assigned_to, last_message_at } = phoneRecord;
  
  console.log(`[INFO] Checking phone: ${phone_number}`);
  
  const result = await fetchSMSFromSmstome(sms_url);
  
  if (!result.success) {
    console.warn(`[WARN] Failed to fetch SMS for ${phone_number}: ${result.error}`);
    return null;
  }
  
  if (!result.messages || result.messages.length === 0) {
    console.log(`[INFO] No messages found for ${phone_number}`);
    return null;
  }
  
  // Get the most recent message
  const latestMessage = result.messages[0];
  
  // Check if this is a new message (compare with last_message_at)
  // If we can't determine, process it anyway
  const verificationCode = extractVerificationCode(latestMessage.text);
  
  if (verificationCode) {
    console.log(`[INFO] Found verification code: ${verificationCode} for ${phone_number}`);
    
    // Update sms_numbers_pool with the code
    const { error: poolError } = await supabase
      .from('sms_numbers_pool')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_from: latestMessage.from,
        last_verification_code: verificationCode,
      })
      .eq('id', id);
    
    if (poolError) {
      console.error(`[ERROR] Failed to update sms_numbers_pool: ${poolError.message}`);
    }
    
    // If assigned to a legacy company_id, update the corresponding owner/company JSON
    if (assigned_to) {
      const { data: found, error: findErr } = await supabase
        .rpc('owners_find_by_company_id', { p_company_id: assigned_to });

      if (findErr) {
        console.error(`[ERROR] Failed to locate owner by company_id ${assigned_to}: ${findErr.message}`);
      } else {
        const row = Array.isArray(found) ? found[0] : found;
        if (row) {
          const { owner_id, eik } = row;
          const now = new Date().toISOString();
          const { error: updateErr } = await supabase.rpc('owners_company_update', {
            p_owner_id: owner_id,
            p_eik: String(eik),
            p_updates: {
              sms_verification_code: verificationCode,
              sms_verification_received_at: now,
              updated_at: now,
            },
          });

          if (updateErr) {
            console.error(`[ERROR] Failed to update owner company: ${updateErr.message}`);
          } else {
            console.log(`[INFO] Updated owner ${owner_id} company ${eik} with SMS code: ${verificationCode}`);
          }
        } else {
          console.warn(`[WARN] No owner/company found for company_id ${assigned_to}`);
        }
      }
    }
    
    return {
      phone_number,
      code: verificationCode,
      from: latestMessage.from,
      text: latestMessage.text,
    };
  } else {
    console.log(`[INFO] No verification code found in message for ${phone_number}: "${latestMessage.text.substring(0, 50)}..."`);
  }
  
  return null;
}

/**
 * Main polling function - check all assigned phone numbers
 */
async function pollAssignedNumbers() {
  console.log('[INFO] Polling assigned phone numbers for SMS...');
  
  try {
    // Get all assigned phone numbers
    const { data: assignedPhones, error } = await supabase
      .from('sms_numbers_pool')
      .select('*')
      .eq('status', 'assigned')
      .order('last_message_at', { ascending: true, nullsFirst: true })
      .limit(MAX_CONCURRENT_CHECKS);
    
    if (error) {
      console.error('[ERROR] Failed to fetch assigned phones:', error.message);
      return;
    }
    
    if (!assignedPhones || assignedPhones.length === 0) {
      console.log('[INFO] No assigned phone numbers to check.');
      return;
    }
    
    console.log(`[INFO] Checking ${assignedPhones.length} assigned phone numbers...`);
    
    // Check each phone number
    const results = [];
    for (const phone of assignedPhones) {
      try {
        const result = await checkPhoneNumber(phone);
        if (result) {
          results.push(result);
        }
        // Small delay between checks to be nice to the server
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.error(`[ERROR] Exception checking ${phone.phone_number}:`, e.message);
      }
    }
    
    if (results.length > 0) {
      console.log(`[INFO] Found ${results.length} verification codes this poll.`);
    }
  } catch (e) {
    console.error('[ERROR] Unexpected error in pollAssignedNumbers:', e.message);
  }
}

// ---------- Main ----------
console.log('[INFO] SMS Monitor Worker started.');
console.log(`[INFO] Polling interval: ${POLL_INTERVAL_MS}ms`);

// Run immediately
await pollAssignedNumbers();

// Set up polling interval
const intervalId = setInterval(pollAssignedNumbers, POLL_INTERVAL_MS);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[INFO] Shutting down SMS Monitor Worker...');
  clearInterval(intervalId);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[INFO] Shutting down SMS Monitor Worker...');
  clearInterval(intervalId);
  process.exit(0);
});
