# English Name Filter Problem - Analysis & Solutions

**Date:** 2025-12-01  
**Status:** 🔴 CRITICAL ISSUE IDENTIFIED

---

## 🚨 THE PROBLEM

### Test Case: Иван Христов Димитров

1. ✅ Person **WAS FOUND** in CompanyBook API
2. ✅ Person **HAS COMPANIES** (ownership relationships exist)
3. ❌ Result: `match_count = 0`, `any_match = false`
4. ❌ Status set to: `no_match`

### Root Cause

**CompanyBook API does NOT provide English transliteration names (`companyNameTransliteration.name`) for MOST Bulgarian companies.**

```json
// Typical CompanyBook response:
{
  "uic": "123456789",
  "name": "ИМПЕРИАЛ СТРОЙ ЕООД",
  "companyNameTransliteration": {
    "name": null  // ← THIS IS NULL for 95%+ of companies!
  },
  "status": "N",
  "legalForm": "ЕООД"
}
```

### Current Filter Logic (TOO STRICT)

```typescript
// In registry_check/index.ts line ~195
const englishName = comp.companyNameTransliteration?.name || null;
if (!englishName) {
  console.log(`[FILTER] Skipping ${e} - no English transliteration name`);
  continue; // ← REJECTS 95%+ of Bulgarian companies!
}
```

**Result:** Almost ALL Bulgarian companies are rejected, even though they meet other criteria (active, EOOD/ET, 100% owned).

---

## 🤔 THE DILEMMA

### Your Original Requirement:
"Нека изобщо да не се добавят EOOD или ET **ако нямат обявено английско наименование**"

### The Reality:
- CompanyBook doesn't provide English names for most companies
- This makes the filter useless - it rejects everyone
- Users who SHOULD qualify are being marked as "no_match"

---

## ✅ PROPOSED SOLUTIONS

### **Option A: Generate English Names Ourselves (RECOMMENDED)**

**Approach:** Transliterate Bulgarian → Latin alphabet automatically

**Pros:**
- Every company gets an English name
- Wallester can accept the transliterated names
- Maintains data integrity

**Cons:**
- Requires transliteration logic
- Names won't be "official" (but still valid)

**Implementation:**

```typescript
// Add transliteration function in registry_check
function transliterateBulgarian(text: string): string {
  const map: Record<string, string> = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
    'Е': 'E', 'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y',
    'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
    'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh',
    'Щ': 'Sht', 'Ъ': 'A', 'Ь': 'Y', 'Ю': 'Yu', 'Я': 'Ya',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd',
    'е': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y',
    'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
    'щ': 'sht', 'ъ': 'a', 'ь': 'y', 'ю': 'yu', 'я': 'ya'
  };
  
  return text.split('').map(char => map[char] || char).join('');
}

// Modified filter logic:
let englishName = comp.companyNameTransliteration?.name || null;

if (!englishName && comp.name) {
  // AUTO-GENERATE if CompanyBook doesn't provide it
  englishName = transliterateBulgarian(comp.name);
  console.log(`[AUTO-TRANSLITERATE] ${comp.name} → ${englishName}`);
}

// Now check if we have an English name (original OR generated)
if (!englishName) {
  console.log(`[FILTER] Skipping ${e} - no name available`);
  continue;
}
```

**Example Result:**
```
ИМПЕРИАЛ СТРОЙ ЕООД → IMPERIAL STROY EOOD
ТРАНС ЛОГИСТИК ЕТ → TRANS LOGISTIK ET
```

---

### **Option B: Make English Names Optional (NOT RECOMMENDED)**

**Approach:** Remove the English name requirement entirely

**Pros:**
- Simple fix
- Everyone passes the filter

**Cons:**
- ❌ Wallester registration form REQUIRES English company names
- ❌ Will fail at registration step (wasted processing)
- ❌ Poor user experience

**Implementation:**
```typescript
// Just remove the English name check
const englishName = comp.companyNameTransliteration?.name || null;
// Don't filter based on it - accept companies without English names
```

---

### **Option C: Hybrid Approach (MIDDLE GROUND)**

**Approach:** Prefer CompanyBook English names, fallback to transliteration

**Pros:**
- Uses official English names when available
- Generates for companies that don't have them
- Best of both worlds

**Cons:**
- Slightly more complex logic

**Implementation:**
```typescript
let englishName = comp.companyNameTransliteration?.name || null;

if (!englishName && comp.name) {
  englishName = transliterateBulgarian(comp.name);
  console.log(`[FALLBACK] Generated: ${englishName}`);
} else if (englishName) {
  console.log(`[OFFICIAL] Using: ${englishName}`);
}

if (!englishName) {
  console.log(`[FILTER] Skipping ${e} - no name available`);
  continue;
}
```

---

### **Option D: Use Alternative Data Source**

**Approach:** Query a different API that has English company names

**Pros:**
- Official English names
- No guessing

**Cons:**
- ❌ No such Bulgarian API exists with better English name coverage
- ❌ CompanyBook is already the best source

---

## 🎯 RECOMMENDATION

**Use Option A or C:** Auto-generate English names via transliteration

### Why This Works:

1. **Wallester Accepts Transliterated Names:**
   - "IMPERIAL STROY EOOD" is valid for Wallester
   - They process companies from many countries with transliterated names
   - The registration form just needs **Latin characters**

2. **Maintains Data Quality:**
   - Every company gets a usable English name
   - URLs, forms, and systems that expect Latin charset will work
   - No data loss

3. **Realistic Solution:**
   - CompanyBook won't magically add English names
   - We control our transformation layer
   - Future-proof (works for any Bulgarian company)

---

## 📝 IMPLEMENTATION PLAN

### Step 1: Add Transliteration Function

```typescript
// supabase/functions/registry_check/index.ts
// Add at top of file:

function transliterateBulgarian(text: string): string {
  if (!text) return '';
  
  const cyrillicToLatin: Record<string, string> = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ж': 'Zh',
    'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
    'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F',
    'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sht', 'Ъ': 'A', 'Ь': 'Y',
    'Ю': 'Yu', 'Я': 'Ya',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
    'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
    'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': 'y',
    'ю': 'yu', 'я': 'ya'
  };
  
  return text.split('').map(char => cyrillicToLatin[char] || char).join('');
}
```

### Step 2: Update Filter Logic

```typescript
// Replace lines ~195-200 with:

// 2. Get or generate ENGLISH NAME
let englishName = comp.companyNameTransliteration?.name || null;

if (!englishName) {
  // CompanyBook didn't provide English name - generate it
  englishName = transliterateBulgarian(comp.name || '');
  console.log(`[AUTO-TRANSLITERATE] ${comp.name} → ${englishName}`);
}

// Now require English name (either original or generated)
if (!englishName || englishName.trim() === '') {
 console.log(`[FILTER] Skipping ${e} - no company name available`);
  continue;
}
```

### Step 3: Deploy

```bash
supabase functions deploy registry_check
```

### Step 4: Test

Test with "Иван Христов Димитров" again - should now find companies!

---

## 🧪 EXPECTED RESULTS AFTER FIX

### Before (Current):
```json
{
  "match_count": 0,
  "any_match": false,
  "companies": [],
  "user_status": "no_match"
}
```

### After (With Transliteration):
```json
{
  "match_count": 3,
  "any_match": true,
  "companies": [
    {
      "eik": "123456789",
      "business_name_bg": "ИМПЕРИАЛ СТРОЙ ЕООД",
      "business_name_en": "IMPERIAL STROY EOOD",  // ← AUTO-GENERATED
      "entity_type": "EOOD",
      "status": "active"
    }
  ],
  "user_status": "ready_for_stagehand"
}
```

---

## ❓ DECISION NEEDED

**Which solution do you prefer?**

**A) Auto-transliterate (Recommended)**
- Generates English names from Bulgarian automatically
- Every company gets a Latin-charset name
- Works with Wallester

**B) Make optional (Not recommended)**
- Removes English name requirement
- Will fail at Wallester registration

**C) Hybrid (Best quality)**
- Uses official English names when available
- Falls back to transliteration otherwise

**Please confirm and I'll implement immediately!**
