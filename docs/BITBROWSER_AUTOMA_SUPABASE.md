# BitBrowser Automa → Supabase: Импорт на данни от verified_owners

Тук е най-краткият и безопасен начин да вкараш данни от Supabase таблицата `verified_owners` в новия ти Automa workflow (в BitBrowser):

Идея
- Използваме Supabase REST API (`/rest/v1`) с анонимния ключ (Anon Key) и RLS политика за read-only достъп до публични полета.
- В Automa добавяме 3 блока: HTTP Request → Run Javascript (flatten) → Loop data.
- Вътре в Loop използваш вече записаните ти стъпки (form fill/клик и т.н.), като реферираш текущите полета през `{{data.item.<име_на_поле>}}`.

1) Подготви безопасен read достъп
Препоръчително е да направиш view с публични полета и да отвориш RLS само за него.

SQL (Supabase SQL Editor):
```sql
-- View с минимално нужните колони
create or replace view public.verified_owners_public as
select
  id,
  full_name,
  companies_slim,   -- [{id,business_name_en,eik,vat,entity_type,city_en,region_en,country_en}]
  updated_at
from public.verified_owners;

-- Разреши селект за anon (read-only)
alter table public.verified_owners_public enable row level security;
create policy anon_can_read_verified_owners_public
on public.verified_owners_public
for select
to anon
using (true);
```

2) REST заявка (примерна)
- URL (замени <project>):
```
https://<project>.supabase.co/rest/v1/verified_owners_public?
  select=full_name,companies_slim,updated_at
  &companies_slim=not.is.null
  &order=updated_at.desc
  &limit=100
```
Съвети:
- Можеш да добавиш филтър по име: `&full_name=eq.Асен%20Митков%20Асенов`
- Пагинация: използвай `Range` header, напр. `Range: 0-199` (или `limit` + `offset`).

Headers:
- `apikey: <SUPABASE_ANON_KEY>`
- `Authorization: Bearer <SUPABASE_ANON_KEY>`
- `Prefer: count=exact` (по избор)
- `Content-Type: application/json` (по избор)

3) Automa блокове
A) HTTP Request block
- Method: GET
- URL: горния URL (с параметрите)
- Headers: както по-горе
- Response type: JSON
- Save response to: `ownersRaw`

B) Run Javascript block (flatten)
Код:
```javascript
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
return companies; // за бърз преглед в логовете
```

C) Loop data block
- Input list: `{{variables.companies}}`
- Вътре в Loop имаш текущ елемент като `data.item`.
- Примери за използване в следващи блокове (form fill / JS):
  - `{{data.item.business_name_en}}`
  - `{{data.item.eik}}`
  - `{{data.item.entity_type}}`
  - `{{data.item.owner_full_name}}`

4) Алтернативи и филтри
- Само EOOD/ET? Данните в `companies_slim` вече са филтрирани до EOOD/ET активни със английско име. Ако искаш допълнителен филтър (примерно само ET):
```javascript
const companies = (variables.get("companies") || []).filter(x => x.entity_type === 'ET');
variables.set("companies", companies);
```
- По дати: добави `&updated_at=gte.2025-11-01` към URL.

5) Пример с curl (за debug извън Automa)
```bash
BASE_URL="https://<project>.supabase.co/rest/v1"
ANON="<SUPABASE_ANON_KEY>"
curl -sS "$BASE_URL/verified_owners_public?select=full_name,companies_slim&companies_slim=not.is.null&limit=3" \
  -H "apikey: $ANON" \
  -H "Authorization: Bearer $ANON" \
  -H "Accept: application/json"
```

6) Бележки за сигурност
- НЕ използвай Service Role ключ в Automa/браузър. Само ANON KEY.
- Ако полетата са чувствителни, направи допълнителен view с още по-малко колони.

7) Как да вкараш в съществуващия ти workflow
- В началото добави HTTP Request + JS (flatten) + Loop data, както е горе.
- Свържи изхода на Loop към вече готовите ти блокове (form fill, навигации и т.н.).
- Реферирай данните чрез `{{data.item.<поле>}}`.

8) Чести проблеми
- 401 Unauthorized → Проверѝ ANON KEY и домейна. 
- Празен масив → Няма записи с `companies_slim`. Увери се, че `users_pending_worker` е пуснат или използвай push функцията от UI.
- Rate limit от други източници (CompanyBook) не влияе на това четене — тук четеш директно от Supabase REST.

9) Допълнение: извличане само по конкретно име
URL пример:
```
https://<project>.supabase.co/rest/v1/verified_owners_public?
  select=full_name,companies_slim
  &full_name=eq.%D0%90%D1%81%D0%B5%D0%BD%20%D0%9C%D0%B8%D1%82%D0%BA%D0%BE%D0%B2%20%D0%90%D1%81%D0%B5%D0%BD%D0%BE%D0%B2
  &limit=1
```
В Automa можеш да направиш променлива `FULL_NAME` и да я вмъкнеш в URL: `full_name=eq.{{variables.FULL_NAME}}` (encode-ната стойност е препоръчителна).

10) Примерна структура на елемент в Loop
```json
{
  "owner_full_name": "Асен Митков Асенов",
  "id": "...",
  "business_name_en": "EMEL-MITKOVA LTD",
  "eik": "208248188",
  "vat": "BG208248188",
  "entity_type": "EOOD",
  "city_en": "Svilengrad",
  "region_en": "Haskovo",
  "country_en": "Bulgaria"
}
```

Това е напълно достатъчно, за да закачиш готовия ти workflow и да храниш формите/стъпките с реални данни от `verified_owners`.
