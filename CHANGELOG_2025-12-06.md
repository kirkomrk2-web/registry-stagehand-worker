# CHANGELOG - 6 Декември 2025

## 🎯 Основни Промени

### 1. Fixed users_pending_worker Edge Function
**Файл:** `supabase/functions/users_pending_worker/index.ts`

**Проблем:** 
- users_pending_worker правеше собствен CompanyBook search вместо да чете от user_registry_checks
- Дублираха се API calls и данните не съвпадаха

**Решение:**
- Променена логиката да чете директно от `user_registry_checks` таблица
- Филтрира само eligible companies: `is_eligible_for_wallester === true && business_name_en && is_active === true`
- Запазва до 5 eligible компании в verified_owners.companies като JSONB array

**Код (lines ~287-298):**
```typescript
const { data: registryCheck, error: registryError } = await supabase
  .from("user_registry_checks")
  .select("*")
  .eq("email", email)
  .single();

const allCompanies = registryCheck.companies || [];
const eligibleCompanies = allCompanies.filter((c: any) => 
  c.is_eligible_for_wallester === true && 
  c.business_name_en && 
  c.is_active === true
);
```

---

### 2. Премахната Автоматична Транслитерация
**Файл:** `supabase/functions/registry_check/index.ts`

**Проблем:**
- Първоначално бе добавена Cyrillic-to-Latin транслитерация за генериране на английски имена
- Това обърка бизнес логиката - компании без официално регистрирани английски имена биваха неправилно валидирани

**Решение:**
- Премахната транслитерация функция
- Само фирми с официално регистрирано английско име в CompanyBook API се приемат
- Строго спазване на изискванията

---

### 3. Увеличен Candidate Limit от 5 на 10
**Файл:** `supabase/functions/registry_check/index.ts`
**Line:** ~176

**Проблем:**
- При често срещани имена (напр. "Асен Митков Асенов" - 117 matches) компании от кандидат #7 и #8 липсваха
- registry_check проверяваше само първите 5 кандидата

**Решение:**
```typescript
// ПРЕДИ:
for (const candidate of searchResults.results.slice(0, 5)) {

// СЕГА:
for (const candidate of searchResults.results.slice(0, 10)) {
```

---

### 4. ✅ Exact Name Matching (КРИТИЧНО!)
**Файл:** `supabase/functions/registry_check/index.ts`
**Lines:** ~165-195

**Проблем:**
- CompanyBook API връща и близки имена при търсене
- Пример: Търсене за "Асен Митков Асенов" връщаше и "АСЕН МИТКОВ **КАРА**АСЕНОВ"
- Включваха се компании от погрешни хора

**Решение:**
Добавена `normalizeName()` функция и exact match filter:

```typescript
function normalizeName(name: string): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

const searchNameNormalized = normalizeName(full_name);

for (const candidate of searchResults.results.slice(0, 10)) {
  const candidateName = candidate.name || '';
  const candidateNameNormalized = normalizeName(candidateName);
  
  // Skip if names don't match exactly
  if (candidateNameNormalized !== searchNameNormalized) {
    console.log(`[registry_check] Skipping candidate "${candidateName}" - name mismatch`);
    continue;
  }
  
  console.log(`[registry_check] Processing candidate "${candidateName}" - exact match ✓`);
  // ... process only exact matches
}
```

---

## 📊 Тестови Резултати

### Тест 1: Божидар Ангелов Борисов
- ✅ 7 компании намерени
- ✅ 4 eligible (с английски имена)
- ✅ 3 отхвърлени (без английски имена)
- ✅ verified_owners създаден правилно

### Тест 2: Асен Митков Асенов (преди exact matching)
- ❌ 8 компании (включваше "АСЕН МИТКОВ КАРААСЕНОВ")
- ❌ Компании от погрешен човек

### Тест 3: Асен Митков Асенов (след exact matching)
- ✅ 6 компании (само от точни matches)
- ✅ Всички 3 очаквани компании намерени:
  - VERSAY 81 Ltd. (205521112)
  - NESA COMPUTARS (200536459)
  - ALEKS SHANS LTD (202634539)
- ✅ verified_owners с 5 eligible companies
- ✅ Филтрирани погрешни matches

---

## 🔄 Workflow

```
users_pending (pending)
    ↓
registry_check Edge Function
    ↓ (извлича от CompanyBook API, приложава filters)
user_registry_checks (всички компании с metadata)
    ↓
users_pending (status: ready_for_stagehand)
    ↓
users_pending_worker Edge Function
    ↓ (филтрира само eligible companies)
verified_owners (само eligible компании с английски имена)
```

---

## 🎯 Критерии за Eligible Компании

Компанията трябва да отговаря на **ВСИЧКИ** условия:

1. ✅ `is_active === true` (status 'N' или 'E')
2. ✅ `entity_type === 'EOOD' || entity_type === 'ET'`
3. ✅ `business_name_en !== null` (има официално английско име в регистъра)
4. ✅ Собственик е с 100% дял или Едноличен търговец (ET)
5. ✅ Името на собственика съвпада **ТОЧНО** с търсеното име

---

## 📝 Deployed Edge Functions

Всички функции deployed към Supabase project `ansiaiuaygcfztabtknl`:

1. ✅ `registry_check` - с exact name matching и increased candidate limit
2. ✅ `users_pending_worker` - чете от user_registry_checks и филтрира eligible
3. ✅ `companybook_proxy` - proxy за CompanyBook API (без промени)

---

## 🚀 Следващи Стъпки

1. Deploy frontend files на Hostinger:
   - `HOSTINGER_FIXED_FILES/useRegistryCheck.js` → `/src/hooks/`
   - `HOSTINGER_FIXED_FILES/useChatLogic.js` → `/src/hooks/`

2. Тестване от реален сайт: https://wallesters.com

3. Мониторинг на Supabase Function Logs за errors

---

## 🔧 Технически Детайли

**Service Role Key:** Hardcoded в двете Edge Functions (временно решение)
- registry_check: line ~163
- users_pending_worker: line ~261

**RLS Permissions:** Disabled за:
- `user_registry_checks`
- `users_pending`
- `verified_owners`

**CompanyBook API:** Използва `/functions/v1/companybook_proxy` вместо директен достъп
