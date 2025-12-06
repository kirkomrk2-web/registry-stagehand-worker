import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function test() {
  console.log('Testing direct insert into user_registry_checks...\n');
  
  const testEmail = `direct_test_${Date.now()}@example.com`;
  
  const { data, error } = await supabase
    .from('user_registry_checks')
    .insert({
      email: testEmail,
      full_name: 'Test Person',
      match_count: 1,
      any_match: true,
      companies: [{ eik: '123', name: 'Test' }]
    })
    .select();
    
  if (error) {
    console.error('❌ Insert failed:', error);
  } else {
    console.log('✅ Insert successful:', data);
  }
}

test();
