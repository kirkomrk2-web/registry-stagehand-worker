# Automa – готови снипети за импорт и обогатяване по ЕИК

Използвай тези блокове 1:1 в текущия ти workflow.

1) HTTP GET към Supabase (импорт на редове)
- Method: GET
- URL (замени <project>):
```
https://<project>.supabase.co/rest/v1/verified_owners_public?select=full_name,owner_first_name_en,owner_last_name_en,owner_birthdate,allocated_phone_number,email_alias_33mail,companies_slim,updated_at&companies_slim=not.is.null&order=updated_at.desc&limit=100
```
- Headers:
  - apikey: <SUPABASE_ANON_KEY>
  - Authorization: Bearer <SUPABASE_ANON_KEY>
  - Accept: application/json
- Response → Save to: Variable → ownersRaw

2) Run Javascript (flatten → генерира ключовете за твоята userData таблица)
Постави този код в блок „Run Javascript“ след HTTP (success → JS):
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
return out;
```

3) Loop data – обогатяване по ЕИК (адрес, пощенски код, дата на регистрация)
Вътре в Loop използвай следните два блока, преди Insert:

A) HTTP Request „company-details“
- Method: GET
- URL (избери един):
  - Директно: `https://api.companybook.bg/api/companies/{{data.item['BULSTAT/EIK']}}?with_data=true`
  - През локален proxy: `http://localhost:4321/company/{{data.item['BULSTAT/EIK']}}?with_data=true`
- Headers: Add header → Name: Accept, Value: application/json
- Response → Save to: Variable → compRaw

(По желание) Сложи „Delay“ 300–600 ms преди този HTTP блок, за да избегнеш rate limit.

B) Run Javascript „merge seat“ (success от HTTP → JS)
```javascript
const resp = variables.get('compRaw') || {};
const comp = resp.company || resp || {};
const seat = comp.seat || {};
function fmtSeat(s){
  const p=[];
  if(s.settlement) p.push(s.settlement);
  if(s.street) p.push(s.street);
  if(s.number) p.push(s.number);
  if(s.municipality) p.push(s.municipality);
  if(s.district) p.push(s.district);
  if(s.region) p.push(s.region);
  if(s.country) p.push(s.country);
  if(s.postCode) p.push(s.postCode);
  return p.filter(Boolean).join(', ');
}
const street = fmtSeat(seat) || seat.address || seat.street || seat.settlement || '';
const postCode = seat.postCode || '';
const incorp = comp.registrationDate || '';
variables.set('enrich_street', street);
variables.set('enrich_postcode', postCode);
variables.set('enrich_incorp', incorp);
variables.set('enrich_city', seat.settlement || '');
variables.set('enrich_region', seat.region || '');
variables.set('enrich_country', seat.country || '');
return { street, postCode, incorp, seat, comp };
```

4) Insert data – мапинг с fallback към обогатените стойности
В инпутите на Insert (или Google Sheets) ползвай:
- Street_adress → `{{variables.enrich_street || data.item.Street_adress}}`
- Post-code → `{{variables.enrich_postcode || data.item['Post-code']}}`
- date-of-incorporation → `{{variables.enrich_incorp || data.item['date-of-incorporation']}}`
- City → `{{variables.enrich_city || data.item.City}}`
- Region → `{{variables.enrich_region || data.item.Region}}`
- Country → `{{variables.enrich_country || data.item.Country}}`
Останалите полета – директно от `data.item.<име>`.

5) Свързване на пътищата
- HTTP (Supabase) success → JS (flatten) → Loop
- В Loop: (Delay по избор) → HTTP company-details → JS merge → Insert data
- Fallback от HTTP/merge към лог блок, за да не спира Loop при 404/429.

6) Troubleshooting
- Празни адрес/пощенски код → провери в Logs какъв е `compRaw` и дали `seat` има полета.
- 429 → увеличи Delay и/или намали `limit` в основния GET.
- Ключове с тире/наклонена черта в Insert → ползвай `{{data.item['BULSTAT/EIK']}}` и т.н.
