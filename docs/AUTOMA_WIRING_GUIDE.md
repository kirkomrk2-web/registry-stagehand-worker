# Automa (BitBrowser) – свързване на данните към твоята таблица

Тук е готов wiring за да вземеш записи от Supabase (verified_owners_public → companies_slim) и да ги мапнеш към таблица с колони:
- id, business_name_en, eik, vat, entity_type, city_en, region_en, country_en, owner_full_name

Ако твоята таблица е с други имена на колони/ред, кажи и ще ти дам точния мапинг. В момента userData.json, който прати, е празен ([]), затова давам стандартната ни схема.

1) HTTP GET (импорт от Supabase REST)
- Method: GET
- URL (замени <project>):
```
https://<project>.supabase.co/rest/v1/verified_owners_public?select=full_name,companies_slim,updated_at&companies_slim=not.is.null&order=updated_at.desc&limit=100
```
- Headers:
  - apikey: <SUPABASE_ANON_KEY>
  - Authorization: Bearer <SUPABASE_ANON_KEY>
  - Accept: application/json
- Response type: JSON
- Save response to: ownersRaw

По желание – филтър по име:
- Добави в URL: `&full_name=eq.{{variables.FULL_NAME_ENC}}`
- Преди това в Run Javascript направи:
```javascript
const raw = variables.get("FULL_NAME");
if (raw) variables.set("FULL_NAME_ENC", encodeURIComponent(raw));
```

2) Run Javascript (flatten → rowsToInsert)
- Нов блок „Run Javascript“ веднага след GET и вържи success към него.
- Код (копирай 1:1):
```javascript
// 1) Вземаме редовете от GET стъпката
const rows = variables.get("ownersRaw") || [];

// 2) Flatten: всеки елемент от companies_slim става отделен ред
const out = [];
for (const row of rows) {
  const list = Array.isArray(row.companies_slim) ? row.companies_slim : [];
  for (const c of list) {
    out.push({
      id: c.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      business_name_en: c.business_name_en ?? c.name_en ?? "",
      eik: c.eik ?? "",
      vat: c.vat ?? (c.eik ? `BG${c.eik}` : ""),
      entity_type: c.entity_type ?? "",
      city_en: c.city_en ?? "",
      region_en: c.region_en ?? "",
      country_en: c.country_en ?? "",
      owner_full_name: row.full_name ?? "",
    });
  }
}

// 3) Съхраняваме в променлива за следващи блокове
variables.set("rowsToInsert", out);
return out; // за преглед в Logs
```

3) Loop data (вкарване в твоята таблица)
- Input list: `{{variables.rowsToInsert}}`
- Вътре в Loop имаш текущ елемент: `data.item`
- В зависимост от дестинацията:

A) Google Sheets (блок „Google Sheets“ → Insert row)
- Свържи Loop → Google Sheets (Insert row)
- Добавяй колони чрез „Add field“ и попълвай стойности:
  - id → `{{data.item.id}}`
  - business_name_en → `{{data.item.business_name_en}}`
  - eik → `{{data.item.eik}}`
  - vat → `{{data.item.vat}}`
  - entity_type → `{{data.item.entity_type}}`
  - city_en → `{{data.item.city_en}}`
  - region_en → `{{data.item.region_en}}`
  - country_en → `{{data.item.country_en}}`
  - owner_full_name → `{{data.item.owner_full_name}}`

B) Automa Data Table / Insert data
- Ако ползваш „Insert data“ блок:
  - Свържи Loop → Insert data
  - В JSON body на „Insert data“ сложи:
```json
{
  "id": "{{data.item.id}}",
  "business_name_en": "{{data.item.business_name_en}}",
  "eik": "{{data.item.eik}}",
  "vat": "{{data.item.vat}}",
  "entity_type": "{{data.item.entity_type}}",
  "city_en": "{{data.item.city_en}}",
  "region_en": "{{data.item.region_en}}",
  "country_en": "{{data.item.country_en}}",
  "owner_full_name": "{{data.item.owner_full_name}}"
}
```
- Ако таблицата ти очаква масиви вместо обекти, промени в JS блока да връща масив от масиви и мапни по индекс.

C) Custom API (HTTP Request → POST)
- Request method: POST
- URL: (твоя endpoint)
- Headers: Content-Type: application/json + нужните auth headers
- Body → Raw/JSON (пример):
```json
{
  "id": "{{data.item.id}}",
  "business_name_en": "{{data.item.business_name_en}}",
  "eik": "{{data.item.eik}}",
  "vat": "{{data.item.vat}}",
  "entity_type": "{{data.item.entity_type}}",
  "city_en": "{{data.item.city_en}}",
  "region_en": "{{data.item.region_en}}",
  "country_en": "{{data.item.country_en}}",
  "owner_full_name": "{{data.item.owner_full_name}}"
}
```
- Свържи Success → следващата ти стъпка; Fallback → лог блок.

4) Бърз debug
- След Run, отвори таб „Logs“, избери последния run и разгъни:
  - GET блока (Status 200/201 трябва да е OK)
  - JS блока – виж `return out` дали има елементи.
  - В Loop – гледай всяка итерация дали подава коректните стойности към Insert/Sheets/HTTP.

5) Ако колоните са различни
- Редактирай JS мапинга (ключовете в `out.push({...})`) да съвпадат 1:1 с имената на колоните ти.
- Или ми прати непразен JSON с описанието на колоните (name + order), за да ти върна готов JS блок и, ако искаш, готов Automa JSON за директен импорт.

Бележки
- Не ползвай Service Role ключ в Automa – само ANON KEY.
- Ако GET връща празно, увери се, че `companies_slim` е попълнено (чрез users_pending_worker или owners_push_slim). В този репо има примерни инструменти за push/тест.
