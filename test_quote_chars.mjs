import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ansiaiiuayggfztabtkni.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testQuoteChars() {
  // Get first verified owner
  const { data: owner } = await supabase
    .from('verified_owners')
    .select('waiting_list')
    .not('waiting_list', 'is', null)
    .limit(1)
    .single();

  if (!owner || !owner.waiting_list || owner.waiting_list.length === 0) {
    console.log('No data found');
    return;
  }

  const firstCompany = owner.waiting_list[0];
  const street = firstCompany.street || '';
  
  console.log('\n=== STREET VALUE ===');
  console.log('String:', street);
  console.log('\n=== CHARACTER CODES ===');
  
  for (let i = 0; i < street.length; i++) {
    const char = street[i];
    const code = char.charCodeAt(0);
    const hex = code.toString(16).toUpperCase();
    console.log(`[${i}] '${char}' -> ${code} (0x${hex})`);
  }
}

testQuoteChars();
