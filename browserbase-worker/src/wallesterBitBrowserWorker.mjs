// wallesterBitBrowserWorker.mjs
// Automate Wallester signup using BitBrowser (Puppeteer wsEndpoint) + Supabase for SMS/Email codes
// Requirements:
//  - BitBrowser local service running (default http://127.0.0.1:54345)
//  - A BitBrowser profileId with proper fingerprint/proxy configured
//  - env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BITBROWSER_API_URL (optional), BITBROWSER_API_TOKEN (optional), BITBROWSER_PROFILE_ID
//  - Node >= 18

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer-core';
import { BitBrowserClient } from '../lib/BitBrowserClient.mjs';

const JOIN_URL = 'https://wallester.com/join';
const SMS_CODE_TIMEOUT_MS = 180000; // 3 minutes
const EMAIL_CODE_TIMEOUT_MS = 180000; // 3 minutes
const POLL_INTERVAL_MS = 5000;

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  BITBROWSER_API_URL,
  BITBROWSER_PROFILE_ID,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[ERROR] Missing Supabase env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const bit = new BitBrowserClient(BITBROWSER_API_URL);

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function waitForSMSCode(profileId, timeoutMs = SMS_CODE_TIMEOUT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data, error } = await supabase
      .from('verified_business_profiles')
      .select('sms_verification_code')
      .eq('id', profileId)
      .single();
    if (error) { await sleep(POLL_INTERVAL_MS); continue; }
    if (data?.sms_verification_code) return data.sms_verification_code;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('SMS code timeout');
}

async function waitForEmailCode(profileId, timeoutMs = EMAIL_CODE_TIMEOUT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data, error } = await supabase
      .from('verified_business_profiles')
      .select('email_confirmation_code')
      .eq('id', profileId)
      .single();
    if (error) { await sleep(POLL_INTERVAL_MS); continue; }
    if (data?.email_confirmation_code) return data.email_confirmation_code;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('Email code timeout');
}

async function updateRegistrationStatus(profileId, status, error = null) {
  const updates = {
    wallester_status: status,
    last_registration_attempt_at: new Date().toISOString(),
  };
  if (status === 'completed') {
    updates.wallester_registration_completed_at = new Date().toISOString();
    updates.profile_status = 'registered';
  }
  if (error) updates.registration_error = error;

  await supabase.from('verified_business_profiles').update(updates).eq('id', profileId);
}

async function queryBusinessForOwner(ownerName){
  const { data, error } = await supabase
    .from('verified_business_profiles')
    .select('*')
    .eq('current_owner_name', ownerName)
    .eq('profile_status', 'verified')
    .not('phone_number', 'is', null)
    .not('email_alias_33mail', 'is', null)
    .order('data_quality_score', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

async function robustType(page, selectorOrArray, value){
  const candidates = Array.isArray(selectorOrArray) ? selectorOrArray : [selectorOrArray];
  for (const sel of candidates){
    const h = await page.$(sel).catch(()=>null);
    if (h){ await h.click({ clickCount: 3 }).catch(()=>{}); await h.type(String(value)); return true; }
  }
  return false;
}

async function robustClick(page, selectorOrArray){
  const candidates = Array.isArray(selectorOrArray) ? selectorOrArray : [selectorOrArray];
  for (const sel of candidates){
    const h = await page.$(sel).catch(()=>null);
    if (h){ await h.click(); return true; }
  }
  return false;
}

async function fillJoinForm(page, profile){
  // Country selection (best effort)
  await robustClick(page, [
    'select[name*="country"]',
    'div[role="combobox"][data-country]'
  ]).catch(()=>{});
  await page.keyboard.type('Bulgaria').catch(()=>{});
  await page.keyboard.press('Enter').catch(()=>{});

  // Company name
  await robustType(page, [
    'input[name*="company"]',
    'input[placeholder*="Company"]',
    'input[aria-label*="Company"]'
  ], profile.business_name_en);

  // Phone code (try to click code dropdown then type country code)
  await robustClick(page, [
    '[data-test="phone-code"]',
    'button[aria-label*="Country code"]',
  ]).catch(()=>{});
  if (profile.sms_country_code){
    await page.keyboard.type(profile.sms_country_code.replace('+','')).catch(()=>{});
    await page.keyboard.press('Enter').catch(()=>{});
  }

  // Phone number (strip spaces and plus)
  const phone = String(profile.phone_number||'').replace(/[^0-9]/g,'');
  await robustType(page, [
    'input[type="tel"]',
    'input[name*="phone"]',
  ], phone);

  // Agreement checkbox
  await robustClick(page, [
    'input[type="checkbox"]',
    'label:has(input[type="checkbox"])'
  ]);

  // Continue/Submit
  await robustClick(page, [
    'button[type="submit"]',
    'button:has-text("Continue")',
    'button:has-text("Start")',
  ]);
}

async function runSignupWithBitBrowser(business, profileId){
  let browser = null;
  let started = false;
  try {
    console.log('[BitBrowser] Starting profile', profileId);
    const { wsEndpoint } = await bit.startProfile(profileId);
    started = true;

    browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint, defaultViewport: null });
    const pages = await browser.pages();
    const page = pages?.[0] || await browser.newPage();

    await page.goto(JOIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Dismiss cookies if present
    await robustClick(page, ['button:has-text("Reject")','button:has-text("Accept")']).catch(()=>{});

    await fillJoinForm(page, business);

    // Wait SMS step
    await updateRegistrationStatus(business.id, 'awaiting_sms');
    const smsCode = await waitForSMSCode(business.id);
    await robustType(page, [
      'input[name*="code"]',
      'input[autocomplete="one-time-code"]',
      'input[aria-label*="code"]'
    ], smsCode);
    await robustClick(page, ['button[type="submit"]','button:has-text("Verify")']).catch(()=>{});

    await updateRegistrationStatus(business.id, 'phone_verified');

    // Email step
    await robustType(page, [
      'input[type="email"]',
      'input[name*="email"]'
    ], business.email_alias_33mail);
    await robustClick(page, ['button[type="submit"]','button:has-text("Continue")']).catch(()=>{});

    await updateRegistrationStatus(business.id, 'awaiting_email');
    const emailCode = await waitForEmailCode(business.id);
    await robustType(page, [
      'input[name*="code"]',
      'input[autocomplete="one-time-code"]',
    ], emailCode);
    await robustClick(page, ['button[type="submit"]','button:has-text("Verify")']).catch(()=>{});

    await updateRegistrationStatus(business.id, 'completed');
    console.log('[INFO] ✅ Wallester signup finished for', business.business_name_en);
  } catch (e) {
    console.error('[ERROR] BitBrowser flow failed:', e?.message || e);
    await updateRegistrationStatus(business.id, 'failed', e?.message || String(e));
  } finally {
    if (browser) { try { await browser.disconnect(); } catch(_){} }
    if (started) { try { await bit.stopProfile(profileId); } catch(_){} }
  }
}

async function main(){
  const args = process.argv.slice(2);
  const ownerArg = args.includes('--owner') ? args[args.indexOf('--owner')+1] : null;
  const profileId = args.includes('--profile') ? args[args.indexOf('--profile')+1] : (BITBROWSER_PROFILE_ID||null);
  if (!profileId){
    console.error('[ERROR] Provide --profile <bitbrowser_profile_id> or set BITBROWSER_PROFILE_ID');
    process.exit(1);
  }

  let business = null;
  if (ownerArg){
    business = await queryBusinessForOwner(ownerArg);
  } else {
    // fallback: pick any signing-up profile
    const { data } = await supabase
      .from('verified_business_profiles')
      .select('*')
      .eq('profile_status','signing-up')
      .limit(1);
    business = data?.[0] || null;
  }

  if (!business){
    console.log('[INFO] No eligible business found. Provide --owner "Full Name" to select one.');
    process.exit(0);
  }

  await runSignupWithBitBrowser(business, profileId);
}

main().catch(e=>{ console.error(e); process.exit(1); });
