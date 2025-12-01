# Automa (BitBrowser) – HTTP Request примери към Supabase

Тази страница дава „копи-пейст“ стойности за блока HTTP Request в Automa, за да импортираш данни от Supabase таблицата verified_owners (през публичен view verified_owners_public) и да ги подадеш към готовите ти стъпки (form fill, click и т.н.).

Важно: ако в Supabase виждаш грешка „column companies_slim does not exist“, първо изпълни SQL-а в supabase/sql/verified_owners_public_view.sql (в Supabase SQL Editor). Той:
- добавя колоната companies_slim при нужда (idempotent)
- създава/ъпдейтва view public.verified_owners_public
- включва RLS и политика за anon (read-only)

1) HTTP GET → чети verified_owners_public
- Request method: GET
- URL (замени <project>):
```
https://<project>.supabase.co/rest/v1/verified_owners_public?
  select=full_name,companies_slim,updated_at
  &companies_slim=not.is.null
  &order=updated_at.desc
  &limit=100
```
- Headers (3 броя):
  - apikey: <SUPABASE_ANON_KEY>
  - Authorization: Bearer <SUPABASE_ANON_KEY>
  - Accept: application/json
- Response type: JSON
- Save response to: ownersRaw (или друго име)

Филтър по име (по желание):
```
&full_name=eq.{{variables.FULL_NAME}}
```
Заб.: ако името съдържа интервали/кирилица – по-добре го подай предварително URL-encode-нато (виж JS стъпката по-долу).

2) Run Javascript → flatten на companies_slim
- Код:
```javascript
// Взимаме масива от GET стъпката
const rows = variables.get("ownersRaw") || [];
// Flatten: всеки company в companies_slim става отделен ред
const companies = [];
for (const row of rows) {
  const list = Array.isArray(row.companies_slim) ? row.companies_slim : [];
  for (const c of list) {
    companies.push({
      owner_full_name: row.full_name,
      id: c.id,
      business_name_en: c.business_name_en,
      eik: c.eik,
      vat: c.vat,
      entity_type: c.entity_type,
      city_en: c.city_en,
      region_en: c.region_en,
      country_en: c.country_en,
    });
  }
}
variables.set("companies", companies);
return companies; // за преглед в Logs
```
(По желание) URL-encode на FULL_NAME променлива:
```javascript
const raw = variables.get("FULL_NAME");
if (raw) variables.set("FULL_NAME_ENC", encodeURIComponent(raw));
```
И тогава в URL ползвай `&full_name=eq.{{variables.FULL_NAME_ENC}}`.

3) Loop data → подай към готовите ти стъпки
- Input list: `{{variables.companies}}`
- Вътре в Loop ползвай стойности от текущия елемент `data.item`: 
  - `{{data.item.business_name_en}}`
  - `{{data.item.eik}}`
  - `{{data.item.entity_type}}`
  - `{{data.item.owner_full_name}}`

4) Свързване на изходите
- От HTTP Request стъпката вържи Success изхода към JS (flatten) или директно към Loop (ако flatten не е нужен).
- Вържи Fallback към лог/нотификация (например Get log data block), за да виждаш грешките.

5) Бърз тест извън Automa (curl)
```bash
BASE_URL="https://<project>.supabase.co/rest/v1"
ANON="<SUPABASE_ANON_KEY>"
curl -sS "$BASE_URL/verified_owners_public?select=full_name,companies_slim&companies_slim=not.is.null&limit=3" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Accept: application/json"
```
Очакваш JSON масив с редове, всеки с companies_slim: [...].

Допълнително: POST пример (ако искаш да пушнеш към owners_push_slim)
- Request method: POST
- URL: `https://<project>.supabase.co/functions/v1/owners_push_slim`
- Headers:
  - Content-Type: application/json
  - x-admin-key: <ADMIN_PUSH_KEY>
  - Authorization: Bearer <SUPABASE_ANON_KEY> (по избор)
- Body → Raw JSON (пример):
```json
{
  "full_name": "{{variables.FULL_NAME}}",
  "companies": [
    {
      "id": "{{data.item.id}}",
      "business_name_en": "{{data.item.business_name_en}}",
      "eik": "{{data.item.eik}}",
      "vat": "{{data.item.vat}}",
      "entity_type": "{{data.item.entity_type}}",
      "city_en": "{{data.item.city_en}}",
      "region_en": "{{data.item.region_en}}",
      "country_en": "{{data.item.country_en}}"
    }
  ]
}
```
Тази POST конфигурация е само ако ти трябва да записваш данни обратно чрез Edge функция. За четене (импорт) ползвай GET.

Чести грешки
- Червен триъгълник в HTTP Request блока → празен/невалиден URL или липсващ header.
- 401/403 → грешен/липсващ ANON KEY.
- 404 → грешен път (rest/v1/verified_owners_public или functions/v1/owners_push_slim).
- Празен масив → няма редове с companies_slim; първо напълни през users_pending_worker или owners_push_slim.
