// Test what exact characters come from CompanyBook API

async function testCompanyBook() {
  const eik = '206625277'; // The test EIK
  
  try {
    const url = `https://api.companybook.bg/api/companies/${eik}?with_data=true`;
    const res = await fetch(url, { 
      headers: { 
        "User-Agent": "Mozilla/5.0", 
        "Accept": "application/json" 
      } 
    });
    
    if (!res.ok) {
      console.log('API error:', res.status);
      return;
    }
    
    const data = await res.json();
    const comp = data?.company || data || {};
    const seat = comp.seat || {};
    
    const street = seat.street || '';
    const streetNumber = seat.streetNumber || '';
    const fullStreet = `${street} ${streetNumber}`.trim();
    
    console.log('\n=== RAW STREET FROM API ===');
    console.log('street:', street);
    console.log('streetNumber:', streetNumber);
    console.log('full:', fullStreet);
    
    console.log('\n=== CHARACTER ANALYSIS ===');
    for (let i = 0; i < fullStreet.length; i++) {
      const char = fullStreet[i];
      const code = char.charCodeAt(0);
      const hex = code.toString(16).toUpperCase().padStart(4, '0');
      const isQuote = code === 34 || code === 39 || code === 8220 || code === 8221 || code === 8222 || code === 8223;
      console.log(`[${i}] '${char}' -> ${code} (U+${hex})${isQuote ? ' <- QUOTE!' : ''}`);
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

testCompanyBook();
