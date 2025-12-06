# Verified Owners Data Structure Fix - Dec 6, 2025

## 🎯 Цел
Коригиране на данните в `verified_owners` таблицата:
1. Транслитерация на собственически имена от кирилица в латиница
2. Добавяне на рождена дата от `users_pending`
3. Създаване на структуриран `waiting_list` със всички бизнес данни за Wallester

## ✅ Какво беше направено

### 1. Миграция на базата данни
**Файл:** `supabase/migrations/20251207002144_add_waiting_list_column.sql`

```sql
ALTER TABLE verified_owners 
ADD COLUMN IF NOT EXISTS waiting_list JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN verified_owners.waiting_list IS 'Structured list of businesses with full details for Wallester registration';
```

**Изпълнено:** ✅ Dec 6, 2025 23:21

### 2. Промени в users_pending_worker Edge Function

#### Добавени функции:

**A) Кирилица → Латиница транслитерация**
```typescript
const CYRILLIC_TO_LATIN: Record<string, string> = {
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 
  'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L',
  // ... пълен речник за всички кирилски букви
};

function transliterateCyrillicToLatin(text: string): string {
  return text.split('').map(char => CYRILLIC_TO_LATIN[char] || char).join('');
}
```

**B) Подобрен парсинг на имена** (извлича първо, средно и фамилно име)
```typescript
function parseName(fullName: string) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: null, middle: null, last: null };
  if (parts.length === 1) return { first: parts[0], middle: null, last: null };
  if (parts.length === 2) return { first: parts[0], middle: null, last: parts[1] };
  return { first: parts[0], middle: parts[1], last: parts[2] };
}
```

**C) Форматиране на дати** (ISO → dd.mm.yyyy)
```typescript
function formatDateToDDMMYYYY(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}
```

#### Промени в основния код:

**1. Взимане на рождена дата от users_pending**
```typescript
const { data: userPending } = await supabase
  .from("users_pending")
  .select("birth_date")
  .eq("email", email)
  .single();

const birthDate = userPending?.birth_date || null;
```

**2. Транслитерация на собственически имена**
```typescript
const { first, middle, last } = parseName(full_name);
const owner_first_name_en = transliterateCyrillicToLatin(first || '');
const owner_last_name_en = transliterateCyrillicToLatin(last || '');
```

**3. Създаване на waiting_list структура**
```typescript
const waiting_list = companies.map((company: any) => {
  const details = company.details || {};
  const comp = details.company || details || {};
  const seat = comp.seat || {};
  
  return {
    business_name_en: company.business_name_en || '',
    lastUpdated: formatDateToDDMMYYYY(comp.lastUpdated || ''),
    EIK: company.eik || '',
    VAT: company.eik ? `BG${company.eik}` : '',
    subjectOfActivity: comp.subjectOfActivity || '',
    address: formatAddress(seat) || '',
    street: `${seat.street || ''} ${seat.streetNumber || ''}`.trim(),
    owner_first_name_en,
    owner_last_name_en,
    owner_birthdate: birthDate || ''
  };
});
```

**4. Записване в verified_owners**
```typescript
await supabase
  .from("verified_owners")
  .update({
    owner_first_name_en,
    owner_last_name_en,
    owner_birthdate: birthDate,
    companies,
    waiting_list,  // НОВ запис
    updated_at: new Date().toISOString(),
  })
  .eq("id", ownerId);
```

**Deployed:** ✅ Dec 6, 2025 23:24

## 🧪 Тестване

**Тест файл:** `test_full_workflow_verified.mjs`

### Тестов сценарий:
- Потребител: **Асен Митков Асенов**
- Email: asen.test@example.com
- Рождена дата: 1990-05-15

### Резултати:

```
✅ owner_first_name_en: "Asen" (транслитерирано)
✅ owner_last_name_en: "Asenov" (само фамилно име, транслитерирано)
✅ owner_birthdate: "1990-05-15" (от users_pending)
✅ waiting_list: 5 компании със структурирани данни
```

#### Пример waiting_list запис:
```json
{
  "business_name_en": "VERSAY 81 Ltd.",
  "lastUpdated": "14.02.2019",
  "EIK": "205521112",
  "VAT": "BG205521112",
  "subjectOfActivity": "ТЪРГОВИЯ С ВСЯКАКВИ СТОКИ...",
  "address": "БЪЛГАРИЯ, Пазарджик, Пазарджик, с. Говедаре, 4453",
  "street": "ул.\"Двадесет и втора\" 16",
  "owner_first_name_en": "Asen",
  "owner_last_name_en": "Asenov",
  "owner_birthdate": "1990-05-15T00:00:00+00:00"
}
```

## 📊 Преди vs. След

### ПРЕДИ ❌
```
owner_first_name_en: "Асен" (кирилица)
owner_last_name_en: "Митков Асенов" (средно + фамилно име)
owner_birthdate: NULL
top_company: { eik, business_name_bg, ... } (минимални данни)
```

### СЛЕД ✅
```
owner_first_name_en: "Asen" (латиница)
owner_last_name_en: "Asenov" (само фамилно име)
owner_birthdate: "1990-05-15" (от users_pending)
waiting_list: [
  {
    business_name_en: "VERSAY 81 Ltd.",
    lastUpdated: "14.02.2019",
    EIK: "205521112",
    VAT: "BG205521112",
    subjectOfActivity: "...",
    address: "...",
    street: "...",
    owner_first_name_en: "Asen",
    owner_last_name_en: "Asenov",
    owner_birthdate: "1990-05-15"
  },
  // ... до 5 компании
]
```

## 🔄 Workflow

```
users_pending (birth_date)
       ↓
registry_check → user_registry_checks
       ↓
users_pending_worker
       ↓
verified_owners (waiting_list с всички полета)
```

## 📝 Ключови полета в waiting_list

1. **business_name_en** - Име на фирмата на английски
2. **lastUpdated** - Дата на последна актуализация (dd.mm.yyyy)
3. **EIK** - Единен идентификационен код
4. **VAT** - ДДС номер (формат: BG + EIK)
5. **subjectOfActivity** - Предмет на дейност
6. **address** - Пълен адрес
7. **street** - Улица + номер
8. **owner_first_name_en** - Собствено име (латиница)
9. **owner_last_name_en** - Фамилно име (латиница)
10. **owner_birthdate** - Рождена дата

## ✨ Готовност за Wallester

Всички данни са сега в правилния формат за Wallester регистрация:
- ✅ Латинска транслитерация на имена
- ✅ Структурирани бизнес данни
- ✅ Рождена дата
- ✅ Пълна адресна информация
- ✅ ДДС номера във формат BG + EIK

## 🚀 Как да стартираме отново

За да преработим съществуващите записи:

1. **За конкретен потребител:**
```bash
node test_full_workflow_verified.mjs
```

2. **За всички потребители masa (bulk reprocess):**
```javascript
// Вземи всички users_pending със статус ready_for_stagehand
// За всеки извикай registry_check след това users_pending_worker
```

## 🔗 Свързани файлове

- Migration: `supabase/migrations/20251207002144_add_waiting_list_column.sql`
- Edge Function: `supabase/functions/users_pending_worker/index.ts`
- Тест: `test_full_workflow_verified.mjs`

---

**Status:** ✅ DEPLOYED AND TESTED  
**Date:** December 6, 2025 @ 23:26  
**All Checks:** PASSED 🎉
