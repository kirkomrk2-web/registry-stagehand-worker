# Automa: бърза настройка за импорт от Supabase в 8 минути

Това е най-краткият и безопасен път: ще добавиш 4 блока и ще видиш данните в Logs, после в Insert data.

0) Важна бележка за интерфейса
- В блока JavaScript Code винаги поставяй кода в таб “JavaScript code”, а не в “Preload script”.
- В блока HTTP Request в таб “Response” включи Assign to variable и въведи ownersRaw; Data path остави празно.

1) Блок: HTTP Request (GET → Supabase REST)
- Име: supa-get
- Request method: GET
- URL (на един ред; замени <project>):
```
https://<project>.supabase.co/rest/v1/verified_owners_public?select=full_name,owner_first_name_en,owner_last_name_en,owner_birthdate,allocated_phone_number,email_alias_33mail,companies_slim,updated_at&companies_slim=not.is.null&order=updated_at.desc&limit=3
```
- Headers (tab “Headers”):
  - apikey: <SUPABASE_ANON_KEY>
  - Authorization: Bearer <SUPABASE_ANON_KEY>
  - Accept: application/json
- Response (tab “Response”):
  - Response type: JSON
  - Assign to variable: ownersRaw (включено)
  - Data path: празно
  - Insert to table: изключено

Тест: стартирай workflow → отвори Logs → кликни HTTP блока → виж Status 200/201 и Body като масив [...].

2) Блок: JavaScript Code (flatten → rowsToInsert)
- Свържи Success от HTTP към този JS блок
- Execution context: Background
- JavaScript code (копирай 1:1):
```javascript
const rows = variables.get("ownersRaw") || [];
const out = [];
for (const row of rows) {
  const list = Array.isArray(row.companies_slim) ? row.companies_slim : [];
  for (const c of list) {
    out.push({
      "company_name_english": c.business_name_en ?? c.name_en ?? "",
      "phone_number": row.allocated_phone_number ?? "",
      "sms-code": "",
      "email": row.email_alias_33mail ?? "",
      "email-code": "",
      "date-of-incorporation": c.incorporation_date ?? "",
      "BULSTAT/EIK": c.eik ?? "",
      "VAT_Number": c.vat ?? (c.eik ? `BG${c.eik}` : ""),
      "Street_adress": "",
      "City": c.city_en ?? "",
      "Region": c.region_en ?? "",
      "Post-code": "",
      "Country": c.country_en ?? "",
      "first-name-en": row.owner_first_name_en ?? "",
      "last-name-en": row.owner_last_name_en ?? "",
      "birthdate": row.owner_birthdate ?? "",
      "column_VX1Iq": "",
      "column_ZMolT": ""
    });
  }
}
variables.set("rowsToInsert", out);
return out; // виж резултата в таб Data на блока
```
Бърз debug (по избор):
```javascript
const raw = variables.get('ownersRaw');
return { isArray: Array.isArray(raw), length: Array.isArray(raw) ? raw.length : null, sample: Array.isArray(raw) ? raw[0] : raw };
```

3) Блок: Loop data
- Свържи Success от JS към Loop data
- Input list: `{{variables.rowsToInsert}}`

4) Блок: Insert data (към userData storage таблицата ти)
- Свържи от Loop към Insert data
- За всяка колона добави ред с Value (НЕ Import file) и постави шаблона:
  - company_name_english → `{{data.item.company_name_english}}`
  - phone_number → `{{data.item.phone_number}}`
  - sms-code → `{{data.item['sms-code']}}`
  - email → `{{data.item.email}}`
  - email-code → `{{data.item['email-code']}}`
  - date-of-incorporation → `{{data.item['date-of-incorporation']}}`
  - BULSTAT/EIK → `{{data.item['BULSTAT/EIK']}}`
  - VAT_Number → `{{data.item.VAT_Number}}`
  - Street_adress → `{{data.item.Street_adress}}`
  - City → `{{data.item.City}}`
  - Region → `{{data.item.Region}}`
  - Post-code → `{{data.item['Post-code']}}`
  - Country → `{{data.item.Country}}`
  - first-name-en → `{{data.item['first-name-en']}}`
  - last-name-en → `{{data.item['last-name-en']}}`
  - birthdate → `{{data.item.birthdate}}`

5) Preview какво къде да гледаш
- HTTP блок → Logs → Response/Body = масив [...]
- JS блок → таб Data = виж return out (масивът с редове)
- Loop/Insert → в Logs ще видиш итерации и добавени редове

6) По желание: Обогатяване по ЕИК (адрес/пощенски код/дата)
Вътре в Loop добави преди Insert:
- HTTP Request „company-details": GET към
  - директно: `https://api.companybook.bg/api/companies/{{data.item['BULSTAT/EIK']}}?with_data=true`
  - или през прокси: `http://localhost:4321/company/{{data.item['BULSTAT/EIK']}}?with_data=true`
  - Headers: Accept: application/json; Response → Variable: compRaw
- JavaScript Code „merge seat“:
```javascript
const resp = variables.get('compRaw') || {};
const comp = resp.company || resp || {};
const seat = comp.seat || {};
function fmtSeat(s){
  const p=[]; if(s.settlement) p.push(s.settlement); if(s.street) p.push(s.street); if(s.number) p.push(s.number); if(s.municipality) p.push(s.municipality); if(s.district) p.push(s.district); if(s.region) p.push(s.region); if(s.country) p.push(s.country); if(s.postCode) p.push(s.postCode); return p.filter(Boolean).join(', ');
}
variables.set('enrich_street', fmtSeat(seat) || seat.address || seat.street || seat.settlement || '');
variables.set('enrich_postcode', seat.postCode || '');
variables.set('enrich_incorp', comp.registrationDate || '');
variables.set('enrich_city', seat.settlement || '');
variables.set('enrich_region', seat.region || '');
variables.set('enrich_country', seat.country || '');
return { seat, comp };
```
- В Insert мапни с fallback: напр. `Street_adress → {{variables.enrich_street || data.item.Street_adress}}`
- При нужда от защита от rate-limit: сложи Delay 300–600ms преди company-details.

7) Чести грешки и решения
- Празно в JS Data: HTTP Response не е Assign to variable=ownersRaw или URL не е пълен.
- 401/403: грешен/липсващ ANON ключ.
- 404: грешен URL/route.
- Използван „Preload script“ вместо „JavaScript code“.
- Insert data → използван Import file вместо Value.

Референции в този репо:
- docs/AUTOMA_MAPPING_USER_TABLE.md – пълна конфигурация и мапингите
- docs/AUTOMA_ENRICH_BY_EIK.md – детайлно за обогатяването по ЕИК
- docs/AUTOMA_SNIPPETS.md – готови снипети за копиране
