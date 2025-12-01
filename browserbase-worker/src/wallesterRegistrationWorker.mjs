// wallesterRegistrationWorker.mjs
// Automated Wallester Business account registration using Browserbase + Stagehand
// Handles complete signup flow with SMS and email verification

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { Stagehand } from "@browserbasehq/stagehand";

// ---------- CONFIG ----------
const WALLESTER_REFERRAL_URL = process.env.WALLESTER_REFERRAL_LINK || 
  'https://wallester.com';

const SMS_CODE_TIMEOUT_MS = 180000; // 3 minutes
const EMAIL_CODE_TIMEOUT_MS = 180000; // 3 minutes
const POLL_INTERVAL_MS = 5000; // Check for codes every 5 seconds

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  BROWSERBASE_API_KEY,
  BROWSERBASE_PROJECT_ID,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[ERROR] Missing Supabase credentials");
  process.exit(1);
}

if (!BROWSERBASE_API_KEY || !BROWSERBASE_PROJECT_ID) {
  console.error("[ERROR] Missing Browserbase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------- Utilities ----------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for SMS verification code
 */
async function waitForSMSCode(ownerId, eik, timeoutMs = SMS_CODE_TIMEOUT_MS) {
  console.log(`[INFO] Waiting for SMS code (timeout: ${timeoutMs/1000}s)...`);
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const { data, error } = await supabase
      .rpc('owners_company_get', { p_owner_id: ownerId, p_eik: String(eik) });
    
    if (error) {
      console.error('[ERROR] Failed to check SMS code:', error.message);
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    
    const smsCode = data?.sms_verification_code;
    if (smsCode) {
      console.log(`[INFO] SMS code received: ${smsCode}`);
      return smsCode;
    }
    
    await sleep(POLL_INTERVAL_MS);
  }
  
  throw new Error('SMS code timeout');
}

/**
 * Wait for email verification code
 */
async function waitForEmailCode(ownerId, eik, timeoutMs = EMAIL_CODE_TIMEOUT_MS) {
  console.log(`[INFO] Waiting for email code (timeout: ${timeoutMs/1000}s)...`);
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const { data, error } = await supabase
      .rpc('owners_company_get', { p_owner_id: ownerId, p_eik: String(eik) });
    
    if (error) {
      console.error('[ERROR] Failed to check email code:', error.message);
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    
    const emailCode = data?.email_confirmation_code;
    if (emailCode) {
      console.log(`[INFO] Email code received: ${emailCode}`);
      return emailCode;
    }
    
    await sleep(POLL_INTERVAL_MS);
  }
  
  throw new Error('Email code timeout');
}

/**
 * Update registration status
 */
async function updateCompanyStatus(ownerId, eik, status, error = null) {
  const { data: company, error: getErr } = await supabase
    .rpc('owners_company_get', { p_owner_id: ownerId, p_eik: String(eik) });

  if (getErr) {
    console.error('[ERROR] Failed to fetch company before update:', getErr.message);
    return;
  }

  const attempts = (company?.registration_attempts || 0) + 1;
  const updates = {
    wallester_status: status,
    last_registration_attempt_at: new Date().toISOString(),
    registration_attempts: attempts,
  };
  
  if (error) {
    updates.registration_error = error;
  }
  
  if (status === 'completed') {
    updates.wallester_registration_completed_at = new Date().toISOString();
    updates.profile_status = 'registered';
  }
  
  const { error: updateError } = await supabase
    .rpc('owners_company_update', {
      p_owner_id: ownerId,
      p_eik: String(eik),
      p_updates: updates,
    });
  
  if (updateError) {
    console.error('[ERROR] Failed to update status:', updateError.message);
  }
}

async function getAttemptCount(ownerId, eik) {
  const { data } = await supabase
    .rpc('owners_company_get', { p_owner_id: ownerId, p_eik: String(eik) });
  
  return data?.registration_attempts || 0;
}

// ---------- Wallester Registration Flow ----------

/**
 * Main registration function
 */
async function registerWallesterAccount(ownerId, ownerName, company) {
  console.log(`\n[INFO] ========== Starting Wallester Registration ==========`);
  console.log(`[INFO] Business: ${company.business_name_en} (${company.eik})`);
  console.log(`[INFO] Owner: ${ownerName}`);
  console.log(`[INFO] Phone: ${company.phone_number}`);
  console.log(`[INFO] Email: ${company.email_alias_33mail}`);
  
  let stagehand = null;
  
  try {
    // Update status to pending
    await updateCompanyStatus(ownerId, company.eik, 'pending');
    
    // Initialize Stagehand
    console.log('[INFO] Initializing Browserbase session...');
    stagehand = new Stagehand({
      apiKey: BROWSERBASE_API_KEY,
      projectId: BROWSERBASE_PROJECT_ID,
      env: "BROWSERBASE",
      verbose: 1,
      debugDom: true,
      browserbaseSessionCreateParams: {
        projectId: BROWSERBASE_PROJECT_ID,
        browserSettings: {
          blockAds: true,
          viewport: { width: 1280, height: 720 },
        },
      },
    });
    
    await stagehand.init();

    const page = stagehand.page
      || (typeof stagehand.newPage === 'function' ? await stagehand.newPage() : null)
      || (stagehand.context && typeof stagehand.context.newPage === 'function'
        ? await stagehand.context.newPage()
        : null);

    if (!page) {
      throw new Error('Unable to acquire Stagehand page handle');
    }
    
    // Step 1: Navigate to Wallester with referral link
    console.log('[INFO] Step 1: Navigating to Wallester...');
    await page.goto(WALLESTER_REFERRAL_URL, { waitUntil: 'networkidle' });
    await sleep(2000);
    
    // Step 2: Handle cookie banner
    console.log('[INFO] Step 2: Handling cookie banner...');
    try {
      await stagehand.act({ instruction: "Click the Reject all cookies button if it is visible" });
      await sleep(1000);
    } catch (e) {
      console.log('[INFO] No cookie banner found or already dismissed');
    }
    
    // Step 3: Click "Start free" button
    console.log('[INFO] Step 3: Clicking Start free...');
    await stagehand.act({ instruction: "Click the Start free button in the header" });
    await sleep(3000);
    
    // Step 4: Fill registration form
    console.log('[INFO] Step 4: Filling registration form...');
    
    // Select Bulgaria
    await stagehand.act({ 
      action: "select 'Bulgaria' in the country of company registration dropdown" 
    });
    await sleep(500);
    
    // Enter company name
    await stagehand.act({ 
      action: `type "${company.business_name_en}" in the company name field` 
    });
    await sleep(500);
    
    // Select phone country code (Finland +358)
    const countryCode = company.sms_country_code || '+358';
    await stagehand.act({ 
      action: `select '${countryCode}' in the phone country code dropdown` 
    });
    await sleep(500);
    
    // Enter phone number (without country code)
    const phoneWithoutCode = company.phone_number.replace(countryCode, '').replace(/[\s-]/g, '');
    await stagehand.act({ 
      action: `type "${phoneWithoutCode}" in the phone number field` 
    });
    await sleep(500);
    
    // Check agreement checkbox
    await stagehand.act({ 
      action: "check the agreement checkbox for Legal Notice and Privacy Policy" 
    });
    await sleep(500);
    
    // Submit form
    console.log('[INFO] Step 5: Submitting form...');
    await stagehand.act({ instruction: "Click the Continue button to submit the registration form" });
    await sleep(5000);
    
    // Step 6: Wait for SMS code input field
    console.log('[INFO] Step 6: Waiting for SMS verification...');
    await updateCompanyStatus(ownerId, company.eik, 'awaiting_sms');
    
    // Wait for SMS code from monitor
    const smsCode = await waitForSMSCode(ownerId, company.eik);
    
    // Enter SMS code
    console.log('[INFO] Step 7: Entering SMS code...');
    await stagehand.act({ 
      action: `type "${smsCode}" in the verification code input field` 
    });
    await sleep(500);
    
    try {
      const emailCodeSubmit = await page.$("button[type='submit'], button:has-text('Continue'), button:has-text('Verify')");
      if (emailCodeSubmit) await emailCodeSubmit.click();
    } catch (e) {
      console.warn('[WARN] Failed to submit email code:', e.message || e);
    }
    await sleep(3000);
    
    await updateCompanyStatus(ownerId, company.eik, 'phone_verified');
    
    // Step 8: Enter email
    console.log('[INFO] Step 8: Entering email...');
    await stagehand.act(`Type ${company.email_alias_33mail} in the email field`);

    await sleep(500);
    
    await stagehand.act("Click the Continue button after entering the email");
    await sleep(5000);
    
    // Step 9: Wait for email code
    console.log('[INFO] Step 9: Waiting for email verification...');
    await updateCompanyStatus(ownerId, company.eik, 'awaiting_email');
    
    const emailCode = await waitForEmailCode(ownerId, company.eik);
    
    // Enter email code
    console.log('[INFO] Step 10: Entering email code...');
    await stagehand.act({ instruction: `Type ${emailCode} into the email verification input` });
    await sleep(500);
    
    try {
      const emailCodeSubmit = await page.$("button[type='submit'], button:has-text('Continue'), button:has-text('Verify')");
      if (emailCodeSubmit) await emailCodeSubmit.click();
    } catch (e) {
      console.warn('[WARN] Failed to submit email code:', e.message || e);
    }
    await sleep(5000);
    
    await updateCompanyStatus(ownerId, company.eik, 'email_verified');
    
    // Step 11: Extract account ID if visible
    console.log('[INFO] Step 11: Registration complete, extracting account info...');
    let accountId = null;
    try {
      const accountInfo = await stagehand.extract({
        instruction: "extract any account ID, user ID, or confirmation number displayed on the page",
        schema: {
          accountId: "string",
          confirmationMessage: "string"
        }
      });
      accountId = accountInfo?.accountId || `wallester_${company.eik}_${Date.now()}`;
    } catch (e) {
      console.log('[INFO] Could not extract account ID, using generated ID');
      accountId = `wallester_${company.eik}_${Date.now()}`;
    }
    
    // Update to completed
    await updateCompanyStatus(ownerId, company.eik, 'completed');
    
    // Move to completed_businesses table
console.log('[INFO] Step 12: Saving Wallester account ID to company...');
const { error: accountIdErr } = await supabase.rpc('owners_company_update', {
  p_owner_id: ownerId,
  p_eik: String(company.eik),
  p_updates: { wallester_account_id: accountId }
});

if (accountIdErr) {
  console.error('[ERROR] Failed to persist account ID:', accountIdErr.message);
} else {
  console.log('[INFO] ✅ Registration completed successfully!');
  console.log(`[INFO] Wallester Account ID: ${accountId}`);
}
    
    console.log(`[INFO] ========== Registration Complete ==========\n`);
    
    return { success: true, accountId };
    
  } catch (error) {
    console.error('[ERROR] Registration failed:', error?.stack || error?.message || error);
    await updateCompanyStatus(ownerId, company.eik, 'failed', error.message);
    
    console.log(`[INFO] ========== Registration Failed ==========\n`);
    
    return { success: false, error: error.message };
    
  } finally {
    if (stagehand) {
      try {
        console.log('[INFO] Closing browser session...');
        await stagehand.close();
      } catch (e) {
        console.error('[ERROR] Failed to close browser:', e.message);
      }
    }
  }
}

// ---------- Business Selection ----------

/**
 * Select best business for registration
 */
async function selectBusinessForRegistration(ownerName) {
  console.log(`[INFO] Selecting best company for: ${ownerName}`);

  const { data, error } = await supabase
    .rpc('select_best_company', { p_owner_name: ownerName });

  if (error) {
    console.error('[ERROR] Failed to fetch best company:', error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    console.log('[INFO] No eligible companies found');
    return null;
  }

  const { owner_id, eik, company } = row;

  const { error: updateError } = await supabase.rpc('owners_company_update', {
    p_owner_id: owner_id,
    p_eik: String(eik),
    p_updates: {
      selected_for_registration: true,
      profile_status: 'signing-up',
      wallester_registration_started_at: new Date().toISOString(),
    },
  });

  if (updateError) {
    console.error('[ERROR] Failed to mark company as selected:', updateError.message);
    return null;
  }

  console.log(`[INFO] Selected: ${company.business_name_en} (score: ${company.data_quality_score || 0})`);
  return { ownerId: owner_id, ownerName, company };
}

// ---------- Main Worker Loop ----------

async function processSigningUpBusinesses() {
  console.log('[INFO] Checking for companies in signing-up status...');

  const { data, error } = await supabase
    .rpc('list_signing_up_companies', { p_limit: 1 });

  if (error) {
    console.error('[ERROR] Failed to fetch signing-up companies:', error.message);
    return;
  }

  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) {
    console.log('[INFO] No companies ready for registration');
    return;
  }

  for (const row of rows) {
    const { owner_id, eik, company } = row;

    // Fetch owner full name for logging
    let ownerName = 'Owner';
    try {
      const { data: owner } = await supabase
        .from('verified_owners')
        .select('full_name')
        .eq('id', owner_id)
        .single();
      ownerName = owner?.full_name || ownerName;
    } catch {}

    await registerWallesterAccount(owner_id, ownerName, company);
    // Add delay between registrations
    await sleep(10000);
  }
}

// ---------- Entry Point ----------

// Check if running in single-business mode
const args = process.argv.slice(2);
if (args.includes('--owner')) {
  const ownerIndex = args.indexOf('--owner');
  const ownerName = args[ownerIndex + 1];
  
  if (!ownerName) {
    console.error('[ERROR] --owner requires a name parameter');
    process.exit(1);
  }
  
  console.log(`[INFO] Single-owner mode: ${ownerName}`);
  const selection = await selectBusinessForRegistration(ownerName);
  
  if (selection) {
    const { ownerId, company } = selection;
    await registerWallesterAccount(ownerId, ownerName, company);
  }
  
  process.exit(0);
}

// Continuous mode
console.log('[INFO] Wallester Registration Worker started');
console.log('[INFO] Monitoring for businesses in signing-up status...');

// Run immediately
await processSigningUpBusinesses();

// Set up polling
const WORKER_POLL_INTERVAL = 30000; // 30 seconds
const intervalId = setInterval(processSigningUpBusinesses, WORKER_POLL_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[INFO] Shutting down Wallester Registration Worker...');
  clearInterval(intervalId);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[INFO] Shutting down Wallester Registration Worker...');
  clearInterval(intervalId);
  process.exit(0);
});
