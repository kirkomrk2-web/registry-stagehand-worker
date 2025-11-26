// emailMonitorWorker.mjs
// Worker that monitors Hostinger IMAP inbox for verification emails
// Polls for new messages and extracts verification codes from 33mail aliases

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import Imap from 'imap';
import { simpleParser } from 'mailparser';

// ---------- CONFIG ----------
const POLL_INTERVAL_MS = parseInt(process.env.EMAIL_POLL_INTERVAL_MS || '60000', 10); // 60 seconds default
const MAX_EMAILS_PER_POLL = 10;

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  // Hostinger IMAP Configuration
  HOSTINGER_IMAP_HOST,
  HOSTINGER_IMAP_PORT,
  HOSTINGER_IMAP_USER,
  HOSTINGER_IMAP_PASSWORD,
} = process.env;

// Defaults for Hostinger
const IMAP_HOST = HOSTINGER_IMAP_HOST || 'imap.hostinger.com';
const IMAP_PORT = parseInt(HOSTINGER_IMAP_PORT || '993', 10);
const IMAP_USER = HOSTINGER_IMAP_USER;
const IMAP_PASSWORD = HOSTINGER_IMAP_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[ERROR] Missing Supabase env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}

if (!IMAP_USER || !IMAP_PASSWORD) {
  console.error("[ERROR] Missing Hostinger IMAP credentials (HOSTINGER_IMAP_USER, HOSTINGER_IMAP_PASSWORD).");
  console.error("[INFO] Please set these environment variables:");
  console.error("  HOSTINGER_IMAP_HOST=imap.hostinger.com");
  console.error("  HOSTINGER_IMAP_PORT=993");
  console.error("  HOSTINGER_IMAP_USER=your-email@wallesters.com");
  console.error("  HOSTINGER_IMAP_PASSWORD=your-password");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- Email Parsing Utilities ----------

/**
 * Extract verification codes from email body
 * Looks for 4-6 digit codes that are likely verification codes
 */
function extractVerificationCode(emailText) {
  if (!emailText) return null;
  
  // Common patterns for verification codes
  const patterns = [
    /(?:verification|verify|code|confirmation|confirm)[:\s]*(\d{4,6})/gi,
    /(?:your code is|ваш код е|код за потвърждение)[:\s]*(\d{4,6})/gi,
    /(?:enter|use|type)[:\s]*(\d{4,6})/gi,
    /\b(\d{6})\b/,  // 6-digit codes
    /\b(\d{5})\b/,  // 5-digit codes
    /\b(\d{4})\b/,  // 4-digit codes
  ];
  
  for (const pattern of patterns) {
    const match = emailText.match(pattern);
    if (match) {
      // Extract just the digits
      const digits = match[1] || match[0].match(/\d{4,6}/)?.[0];
      if (digits) return digits;
    }
  }
  
  return null;
}

/**
 * Extract 33mail alias from email headers
 * Looks at the original "To" address
 */
function extract33MailAlias(headers) {
  // Check various headers for the 33mail alias
  const toHeader = headers['x-original-to'] || 
                   headers['delivered-to'] || 
                   headers['to'];
  
  if (!toHeader) return null;
  
  // Match pattern: xxx@madoff.33mail.com
  const match = toHeader.match(/([a-z0-9-]+)@madoff\.33mail\.com/i);
  if (match) {
    return `${match[1]}@madoff.33mail.com`;
  }
  
  return null;
}

/**
 * Find profile by email alias
 */
async function findProfileByEmailAlias(emailAlias) {
  if (!emailAlias) return null;
  
  const { data: profile, error } = await supabase
    .from('verified_business_profiles')
    .select('id, eik, business_name_en, email_alias_33mail')
    .eq('email_alias_33mail', emailAlias.toLowerCase())
    .single();
  
  if (error) {
    console.log(`[INFO] No profile found for alias: ${emailAlias}`);
    return null;
  }
  
  return profile;
}

/**
 * Create IMAP connection
 */
function createImapConnection() {
  return new Imap({
    user: IMAP_USER,
    password: IMAP_PASSWORD,
    host: IMAP_HOST,
    port: IMAP_PORT,
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false, // For self-signed certs
    },
    authTimeout: 30000,
  });
}

/**
 * Parse email message
 */
async function parseEmail(msg) {
  return new Promise((resolve, reject) => {
    simpleParser(msg, (err, parsed) => {
      if (err) reject(err);
      else resolve(parsed);
    });
  });
}

/**
 * Fetch and process new emails
 */
async function fetchNewEmails() {
  return new Promise((resolve, reject) => {
    const imap = createImapConnection();
    const results = [];
    
    imap.once('ready', () => {
      console.log('[INFO] IMAP connection established.');
      
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('[ERROR] Failed to open INBOX:', err.message);
          imap.end();
          return reject(err);
        }
        
        console.log(`[INFO] INBOX opened. Total messages: ${box.messages.total}`);
        
        // Search for unseen emails
        imap.search(['UNSEEN'], (err, uids) => {
          if (err) {
            console.error('[ERROR] Search failed:', err.message);
            imap.end();
            return reject(err);
          }
          
          if (!uids || uids.length === 0) {
            console.log('[INFO] No new unread emails.');
            imap.end();
            return resolve([]);
          }
          
          console.log(`[INFO] Found ${uids.length} unread emails.`);
          
          // Limit to recent emails
          const uidsToFetch = uids.slice(-MAX_EMAILS_PER_POLL);
          
          const fetch = imap.fetch(uidsToFetch, {
            bodies: '',
            markSeen: true,
          });
          
          let pending = uidsToFetch.length;
          
          fetch.on('message', (msg, seqno) => {
            let emailData = '';
            
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                emailData += chunk.toString('utf8');
              });
            });
            
            msg.once('end', async () => {
              try {
                const parsed = await parseEmail(emailData);
                
                const emailAlias = extract33MailAlias(parsed.headers);
                const from = parsed.from?.text || 'Unknown';
                const subject = parsed.subject || 'No Subject';
                const textBody = parsed.text || '';
                const htmlBody = parsed.html || '';
                
                // Try to extract code from both text and HTML
                let verificationCode = extractVerificationCode(textBody);
                if (!verificationCode) {
                  verificationCode = extractVerificationCode(htmlBody.replace(/<[^>]*>/g, ' '));
                }
                
                console.log(`[INFO] Email from: ${from}, Subject: ${subject.substring(0, 50)}`);
                console.log(`[INFO] 33mail alias: ${emailAlias || 'Not detected'}`);
                console.log(`[INFO] Verification code: ${verificationCode || 'Not found'}`);
                
                if (verificationCode) {
                  results.push({
                    from,
                    subject,
                    emailAlias,
                    verificationCode,
                    receivedAt: new Date().toISOString(),
                  });
                  
                  // Try to update profile if alias found
                  if (emailAlias) {
                    const profile = await findProfileByEmailAlias(emailAlias);
                    if (profile) {
                      const { error: updateError } = await supabase
                        .from('verified_business_profiles')
                        .update({
                          email_confirmation_code: verificationCode,
                          email_confirmation_received_at: new Date().toISOString(),
                          email_forwarding_active: true,
                          updated_at: new Date().toISOString(),
                        })
                        .eq('id', profile.id);
                      
                      if (updateError) {
                        console.error(`[ERROR] Failed to update profile: ${updateError.message}`);
                      } else {
                        console.log(`[INFO] Updated profile ${profile.business_name_en} (${profile.eik}) with email code: ${verificationCode}`);
                      }
                    }
                  }
                }
                
                pending--;
                if (pending === 0) {
                  imap.end();
                }
              } catch (e) {
                console.error('[ERROR] Failed to parse email:', e.message);
                pending--;
                if (pending === 0) {
                  imap.end();
                }
              }
            });
          });
          
          fetch.once('error', (err) => {
            console.error('[ERROR] Fetch error:', err.message);
            imap.end();
            reject(err);
          });
          
          fetch.once('end', () => {
            console.log('[INFO] Finished fetching emails.');
          });
        });
      });
    });
    
    imap.once('error', (err) => {
      console.error('[ERROR] IMAP error:', err.message);
      reject(err);
    });
    
    imap.once('end', () => {
      console.log('[INFO] IMAP connection ended.');
      resolve(results);
    });
    
    imap.connect();
  });
}

/**
 * Main polling function
 */
async function pollEmails() {
  console.log('[INFO] Polling for new emails...');
  
  try {
    const results = await fetchNewEmails();
    
    if (results.length > 0) {
      console.log(`[INFO] Processed ${results.length} emails with verification codes.`);
      
      // Log summary
      for (const result of results) {
        console.log(`  - ${result.emailAlias || 'Unknown alias'}: ${result.verificationCode}`);
      }
    }
  } catch (error) {
    console.error('[ERROR] Email polling failed:', error.message);
    
    // If it's an auth error, don't keep retrying
    if (error.message.includes('auth') || error.message.includes('login')) {
      console.error('[ERROR] Authentication failed. Please check IMAP credentials.');
    }
  }
}

// ---------- Alternative: Simple Email Check via POP3 or HTTP ----------

/**
 * Fallback: Check for emails via a simpler method
 * This can be used if IMAP dependencies are not available
 */
async function checkEmailsSimple() {
  // For now, just log that we need proper IMAP setup
  console.log('[INFO] Checking for email verification codes...');
  console.log('[INFO] Make sure IMAP dependencies are installed:');
  console.log('  npm install imap mailparser');
  
  // Get profiles awaiting email verification
  const { data: profiles, error } = await supabase
    .from('verified_business_profiles')
    .select('id, eik, business_name_en, email_alias_33mail')
    .not('email_alias_33mail', 'is', null)
    .is('email_confirmation_code', null)
    .limit(10);
  
  if (error) {
    console.error('[ERROR] Failed to fetch profiles:', error.message);
    return;
  }
  
  if (!profiles || profiles.length === 0) {
    console.log('[INFO] No profiles awaiting email verification.');
    return;
  }
  
  console.log(`[INFO] ${profiles.length} profiles awaiting email verification:`);
  for (const p of profiles) {
    console.log(`  - ${p.business_name_en} (${p.eik}): ${p.email_alias_33mail}`);
  }
}

// ---------- Main ----------
console.log('[INFO] Email Monitor Worker started.');
console.log(`[INFO] IMAP Host: ${IMAP_HOST}:${IMAP_PORT}`);
console.log(`[INFO] IMAP User: ${IMAP_USER}`);
console.log(`[INFO] Polling interval: ${POLL_INTERVAL_MS}ms`);

// Check if imap module is available
let imapAvailable = false;
try {
  await import('imap');
  imapAvailable = true;
  console.log('[INFO] IMAP module available.');
} catch (e) {
  console.warn('[WARN] IMAP module not available. Install with: npm install imap mailparser');
  console.warn('[INFO] Running in simple mode without IMAP.');
}

// Run initial check
if (imapAvailable) {
  await pollEmails();
} else {
  await checkEmailsSimple();
}

// Set up polling interval
const intervalId = setInterval(async () => {
  if (imapAvailable) {
    await pollEmails();
  } else {
    await checkEmailsSimple();
  }
}, POLL_INTERVAL_MS);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[INFO] Shutting down Email Monitor Worker...');
  clearInterval(intervalId);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[INFO] Shutting down Email Monitor Worker...');
  clearInterval(intervalId);
  process.exit(0);
});
