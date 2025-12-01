# Automa мапинг към твоята userData таблица (според скрийншотовете)

Колони в таблицата (видими на снимките):
- company_name_english
- phone_number
- sms-code
- email
- email-code
- date-of-incorporation
- BULSTAT/EIK
- VAT_Number
- Street_adress
- City
- Region
- Post-code
- Country
- first-name-en
- last-name-en
- birthdate
- (по скрийншота има и column_VX1Iq, column_ZMolT – запълвам ги с празно, ако ги оставиш)

1) HTTP GET (Supabase REST, разширен select)
- Method: GET
- URL (замени <project>):
```
https://<project>.supabase.co/rest/v1/verified_owners_public?
  select=full_name,owner_first_name_en,owner_last_name_en,owner_birthdate,allocated_phone_number,email_alias_33mail,companies_slim,updated_at
  &companies_slim=not.is.null
  &order=updated_at.desc
  &limit=100
```
- Headers:
  - apikey: <SUPABASE_ANON_KEY>
  - Authorization: Bearer <SUPABASE_ANON_KEY>
  - Accept: application/json
- Response → ownersRaw

2) Run Javascript (flatten + мапинг към твоите имена на колони)
Код (копирай 1:1):
```javascript
const rows = variables.get("ownersRaw") || [];
const out = [];
for (const row of rows) {
  const list = Array.isArray(row.companies_slim) ? row.companies_slim : [];
  for (const c of list) {
    out.push({
      "company_name_english": c.business_name_en ?? c.name_en ?? "",
      "phone_number": row.allocated_phone_number ?? "",
      "sms-code": "", // попълва се по-късно от SMS монитор
      "email": row.email_alias_33mail ?? "",
      "email-code": "", // попълва се по-късно от email монитор
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
      // Ако тези колони присъстват в таблицата ти, оставям ги празни
      "column_VX1Iq": "",
      "column_ZMolT": ""
    });
  }
}
variables.set("rowsToInsert", out);
return out;
```
Забележка: companies_slim не съдържа адрес, пощенски код и дата на регистрация в текущата си форма. Ако ти потрябват – можем да добавим разширено обогатяване по EIK и да дописваме тези полета автоматично (дай сигнал да включа).

3) Loop data → Insert data (или Google Sheets)
- Loop Input: `{{variables.rowsToInsert}}`
- В „Insert data“ мапни полетата 1:1 към горните ключове, напр. `company_name_english → {{data.item.company_name_english}}`, `BULSTAT/EIK → {{data.item["BULSTAT/EIK"]}}` (внимавай при имена с наклонена черта/тире – ползвай скоби и кавички при нужда).

4) Филтър по име (по избор)
- Ако искаш конкретен човек: добави в URL `&full_name=eq.{{variables.FULL_NAME_ENC}}` и преди GET сложи малък JS:
```javascript
const raw = variables.get("FULL_NAME");
if (raw) variables.set("FULL_NAME_ENC", encodeURIComponent(raw));
```

5) Тест
- Пусни GET → виж в Logs статус 200 и масив.
- JS (flatten) трябва да върне масив от обекти с горните ключове.
- Loop → Insert data: потвърди, че редовете се добавят в userData таблицата с правилните колони.
