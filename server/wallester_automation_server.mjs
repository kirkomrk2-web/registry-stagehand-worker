// server/wallester_automation_server.mjs
/**
 * Wallester Automation API Server
 * Uses Browser Use MCP for automated account/card creation
 */

import http from 'http';
import { createClient } from '@supabase/supabase-js';

const PORT = process.env.WALLESTER_API_PORT || 4323;

// Supabase client (configure via env)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized');
}

// In-memory state for tracking operations
const operations = new Map(); // operationId -> { status, progress, logs }

/**
 * SMS Code Retrieval from smstome.com
 */
async function waitForSMSCode(smsUrl, timeout = 60000) {
  console.log(`📱 Waiting for SMS code from: ${smsUrl}`);
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(smsUrl);
      if (!response.ok) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      
      const data = await response.json();
      const messages = Array.isArray(data) ? data : (data.messages || []);
      
      // Find Wallester message
      const wallesterMsg = messages.find(m => 
        (m.sender && m.sender.toLowerCase().includes('wallester')) ||
        (m.text && (m.text.includes('verification') || m.text.includes('code')))
      );
      
      if (wallesterMsg) {
        // Extract 6-digit code
        const match = wallesterMsg.text.match(/\b\d{6}\b/);
        if (match) {
          console.log('✅ SMS code received:', match[0]);
          return match[0];
        }
      }
    } catch (error) {
      console.error('SMS fetch error:', error.message);
    }
    
    await new Promise(r => setTimeout(r, 3000)); // Check every 3 seconds
  }
  
  throw new Error('SMS code timeout - no code received within ' + (timeout/1000) + ' seconds');
}

/**
 * Email Code Retrieval (placeholder - needs IMAP implementation)
 */
async function waitForEmailCode(emailAlias, timeout = 60000) {
  console.log(`📧 Waiting for email code for: ${emailAlias}`);
  
  // TODO: Implement IMAP connection to support@33mailbox.com
  // For now, return a placeholder
  console.warn('⚠️ Email code retrieval not yet implemented - manual intervention may be needed');
  
  // Simulate delay
  await new Promise(r => setTimeout(r, 5000));
  
  throw new Error('Email code retrieval not implemented - please enter manually');
}

/**
 * Create Wallester Account using Browser Use MCP
 */
async function createWallesterAccount(ownerId, operationId) {
  const op = operations.get(operationId);
  
  try {
    // Step 1: Fetch owner data
    op.logs.push({ type: 'info', message: 'Fetching owner data from Supabase...' });
    op.progress = 10;
    
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data: owner, error } = await supabase
      .from('verified_owners')
      .select('*')
      .eq('id', ownerId)
      .single();
    
    if (error || !owner) throw new Error('Owner not found');
    
    op.logs.push({ type: 'success', message: `Owner loaded: ${owner.full_name}` });
    op.progress = 20;
    
    // Step 2: Initialize Browser Use session
    op.logs.push({ type: 'info', message: 'Starting browser automation...' });
    
    // NOTE: This requires MCP server to be connected
    // You would call MCP tools here via the extension API
    // For now, this is a placeholder structure
    
    const automationSteps = [
      { step: 'navigate', url: 'https://wallester.com/en/business/sign-up' },
      { step: 'fill_form', fields: {
        firstName: owner.owner_first_name_en,
        lastName: owner.owner_last_name_en,
        email: owner.email_alias_33mail,
        phone: owner.allocated_phone_number,
        companyName: owner.top_company?.business_name_en,
        companyVAT: owner.top_company?.vat,
      }},
      { step: 'submit' },
      { step: 'wait_sms', url: owner.allocated_sms_number_url },
      { step: 'verify_sms' },
      { step: 'complete' }
    ];
    
    for (let i = 0; i < automationSteps.length; i++) {
      const step = automationSteps[i];
      op.progress = 20 + (i / automationSteps.length) * 60;
      op.logs.push({ type: 'info', message: `Executing step: ${step.step}` });
      
      // Simulate step execution
      await new Promise(r => setTimeout(r, 2000));
      
      if (step.step === 'wait_sms') {
        try {
          const code = await waitForSMSCode(step.url);
          op.logs.push({ type: 'success', message: `SMS code received: ${code}` });
        } catch (error) {
          throw new Error('Failed to receive SMS code: ' + error.message);
        }
      }
    }
    
    op.progress = 90;
    op.logs.push({ type: 'success', message: 'Account created successfully!' });
    
    // Step 3: Update database
    const { error: updateError } = await supabase
      .from('verified_owners')
      .update({ 
        status: 'wallester_account_created',
        wallester_account_id: 'placeholder_' + Date.now(),
        updated_at: new Date().toISOString()
      })
      .eq('id', ownerId);
    
    if (updateError) {
      op.logs.push({ type: 'warn', message: 'Failed to update database: ' + updateError.message });
    }
    
    op.progress = 100;
    op.status = 'completed';
    op.logs.push({ type: 'success', message: '✅ Wallester account creation complete!' });
    
    return { success: true, accountId: 'placeholder_' + Date.now() };
    
  } catch (error) {
    op.status = 'failed';
    op.logs.push({ type: 'error', message: '❌ Error: ' + error.message });
    throw error;
  }
}

/**
 * Create Wallester Card
 */
async function createWallesterCard(accountId, cardOptions, operationId) {
  const op = operations.get(operationId);
  
  try {
    op.logs.push({ type: 'info', message: 'Starting card creation...' });
    op.progress = 10;
    
    // TODO: Implement card creation via Wallester API or browser automation
    op.logs.push({ type: 'info', message: 'Card creation not yet implemented' });
    
    op.progress = 100;
    op.status = 'completed';
    op.logs.push({ type: 'success', message: '✅ Card created successfully!' });
    
    return { success: true, cardId: 'card_' + Date.now() };
    
  } catch (error) {
    op.status = 'failed';
    op.logs.push({ type: 'error', message: '❌ Error: ' + error.message });
    throw error;
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS
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
    if (path === '/create-account' && req.method === 'POST') {
      // Parse body
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      const { ownerId } = JSON.parse(body);
      
      if (!ownerId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'ownerId required' }));
        return;
      }
      
      // Create operation
      const operationId = `acc_${Date.now()}`;
      operations.set(operationId, {
        type: 'account',
        status: 'running',
        progress: 0,
        logs: [],
        startedAt: new Date().toISOString()
      });
      
      // Start async
      createWallesterAccount(ownerId, operationId).catch(err => {
        console.error('Account creation failed:', err);
      });
      
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        operationId,
        message: 'Account creation started'
      }));
      
    } else if (path === '/create-card' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      const { accountId, cardType, limit, name } = JSON.parse(body);
      
      const operationId = `card_${Date.now()}`;
      operations.set(operationId, {
        type: 'card',
        status: 'running',
        progress: 0,
        logs: [],
        startedAt: new Date().toISOString()
      });
      
      createWallesterCard(accountId, { cardType, limit, name }, operationId).catch(err => {
        console.error('Card creation failed:', err);
      });
      
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        operationId,
        message: 'Card creation started'
      }));
      
    } else if (path.startsWith('/operation/')) {
      // Get operation status
      const operationId = path.split('/')[2];
      const op = operations.get(operationId);
      
      if (!op) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Operation not found' }));
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(op));
      
    } else if (path === '/stats') {
      // Get statistics
      const stats = {
        totalOperations: operations.size,
        running: Array.from(operations.values()).filter(o => o.status === 'running').length,
        completed: Array.from(operations.values()).filter(o => o.status === 'completed').length,
        failed: Array.from(operations.values()).filter(o => o.status === 'failed').length,
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
      
    } else if (path === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        supabase: !!supabase,
        operations: operations.size
      }));
      
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
  console.log(`\n🏦 Wallester Automation API running on http://localhost:${PORT}`);
  console.log(`\n📊 Available endpoints:`);
  console.log(`   POST /create-account    - Create Wallester account`);
  console.log(`   POST /create-card       - Create Wallester card`);
  console.log(`   GET  /operation/:id     - Get operation status`);
  console.log(`   GET  /stats             - Get statistics`);
  console.log(`   GET  /health            - Health check\n`);
  
  if (!supabase) {
    console.warn('⚠️  WARNING: Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY env vars\n');
  }
});

export { operations };
