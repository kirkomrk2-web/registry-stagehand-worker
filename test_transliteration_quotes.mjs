// Test transliteration with various quote types

const CYRILLIC_TO_LATIN = {
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ж': 'Zh', 'З': 'Z',
  'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P',
  'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch',
  'Ш': 'Sh', 'Щ': 'Sht', 'Ъ': 'A', 'Ь': 'Y', 'Ю': 'Yu', 'Я': 'Ya',
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh', 'з': 'z',
  'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
  'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch',
  'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': 'y', 'ю': 'yu', 'я': 'ya'
};

function transliterateCyrillicToLatin(text) {
  if (!text) return '';
  let result = text.split('').map(char => CYRILLIC_TO_LATIN[char] || char).join('');
  // Remove all types of quotes from result (including unicode quotes)
  result = result.replace(/["'«»„""'']/g, '');
  // Replace БЪЛГАРИЯ/BALGARIYa with Bulgaria
  result = result.replace(/BALGARIYA|BALGARIYa|Bulgariya/gi, 'Bulgaria');
  return result;
}

// Test cases with the actual street value we're seeing
const testCases = [
  'ул."Двадесет и втора" 16',  // Cyrillic with quotes
  'ul."Dvadeset i vtora" 16',  // Already transliterated
  'ул.\"Двадесет и втора\" 16', // Escaped quotes
  'ул."Двадесет и втора" 16',  // Different quote types
  'ул.„Двадесет и втора" 16',  // Bulgarian quotes „"
  'ул."Двадесет и втора" 16',  // Smart quotes ""
];

console.log('\n=== TESTING TRANSLITERATION ===\n');

testCases.forEach((test, idx) => {
  console.log(`Test ${idx + 1}:`);
  console.log('  Input:  ', test);
  
  // Show character codes for quotes
  const quotes = [];
  for (let i = 0; i < test.length; i++) {
    const char = test[i];
    const code = char.charCodeAt(0);
    if (code === 34 || code === 39 || (code >= 8216 && code <= 8223)) {
      quotes.push(`'${char}' (U+${code.toString(16).toUpperCase().padStart(4, '0')})`);
    }
  }
  if (quotes.length > 0) {
    console.log('  Quotes: ', quotes.join(', '));
  }
  
  const result = transliterateCyrillicToLatin(test);
  console.log('  Output: ', result);
  console.log('  Has quotes?', /["'«»„""'']/.test(result) ? 'YES ❌' : 'NO ✅');
  console.log('');
});
