import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ansiaiuaygcfztabtknl.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function analyzeStreet() {
  const { data } = await supabase
    .from('verified_owners')
    .select('waiting_list')
    .eq('full_name', 'Асен Митков Асенов')
    .single();
  
  if (!data || !data.waiting_list || data.waiting_list.length === 0) {
    console.log('No data');
    return;
  }
  
  const street = data.waiting_list[0].street;
  console.log('\n═══ STREET VALUE ═══');
  console.log('String:', street);
  console.log('\n═══ CHARACTER CODES ═══');
  
  for (let i = 0; i < street.length; i++) {
    const char = street[i];
    const code = char.charCodeAt(0);
    const hex = '0x' + code.toString(16).toUpperCase().padStart(4, '0');
    let type = '';
    
    if (code === 34) type = ' <- ASCII QUOTE "';
    else if (code === 39) type = " <- ASCII SINGLE QUOTE '";
    else if (code === 8220) type = ' <- LEFT DOUBLE QUOTE';
    else if (code === 8221) type = ' <- RIGHT DOUBLE QUOTE';
    else if (code === 8222) type = ' <- DOUBLE LOW-9 QUOTE';
    else if (code === 8216) type = ' <- LEFT SINGLE QUOTE';
    else if (code === 8217) type = ' <- RIGHT SINGLE QUOTE';
    
    console.log(`[${i.toString().padStart(2)}] '${char}' → ${code} (${hex})${type}`);
  }
  
  console.log('\n═══ CURRENT REGEX TEST ═══');
  const currentRegex = /["'«»„""'']/g;
  const hasQuotes = currentRegex.test(street);
  console.log('Current regex catches it?', hasQuotes ? 'YES ✓' : 'NO ✗');
  
  console.log('\n═══ EXTENDED REGEX TEST ═══');
  const extendedRegex = /["'«»„""''\u201C\u201D\u2018\u2019\u201E\u201F]/g;
  const hasQuotesExt = extendedRegex.test(street);
  console.log('Extended regex catches it?', hasQuotesExt ? 'YES ✓' : 'NO ✗');
}

analyzeStreet();
