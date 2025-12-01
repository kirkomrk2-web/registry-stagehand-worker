# Automa обогатяване по ЕИК (адрес, пощенски код, дата на регистрация)

Цел: след flatten да попълним автоматично Street_adress, Post-code и date-of-incorporation за всеки ред чрез заявка по ЕИК към CompanyBook.

Вариант A (директно към CompanyBook API)
- HTTP GET: https://api.companybook.bg/api/companies/{{data.item['BULSTAT/EIK']}}?with_data=true
- Headers: Accept: application/json

Вариант B (ако ползваш локалния proxy):
- HTTP GET: http://localhost:4321/company/{{data.item['BULSTAT/EIK']}}?with_data=true

Стъпки в Automa (вътре в Loop data)
1) Добави HTTP Request блок „company-details“
   - Method: GET
   - URL: (A или B отгоре)
   - Headers: Add header → Name: Accept, Value: application/json
   - Response → Save response: Variable → compRaw

2) Добави Run Javascript „merge seat“ след HTTP (success → JS)
Код (копирай 1:1):
```javascript
// Вътре в Loop: имаш достъп до data.item (текущия ред)
const item = data.item || {};
const resp = variables.get('compRaw') || {};
const comp = resp.company || resp || {};
const seat = comp.seat || {};
// Попълваме липсващите полета (ако вече имаш стойности, не ги препокриваме)
const street = seat.address || seat.street || seat.settlement || '';
const postCode = seat.postCode || '';
const incorp = comp.registrationDate || '';
// Записваме като променливи за лесно мапване в Insert блока
variables.set('enrich_street', street);
variables.set('enrich_postcode', postCode);
variables.set('enrich_incorp', incorp);
return { street, postCode, incorp, seat, comp };
```

3) Insert data / Google Sheets – мапинг с fallback
- Street_adress → `{{variables.enrich_street || data.item.Street_adress}}`
- Post-code → `{{variables.enrich_postcode || data.item['Post-code']}}`
- date-of-incorporation → `{{variables.enrich_incorp || data.item['date-of-incorporation']}}`

Забележки
- Ако искаш и City/Region/Country да се вземат винаги от company-details, добави във JS:
```javascript
variables.set('enrich_city', seat.settlement || '');
variables.set('enrich_region', seat.region || '');
variables.set('enrich_country', seat.country || '');
```
И в мапинга ползвай `{{variables.enrich_city || data.item.City}}` и т.н.
- Ако удряш rate limit, намали `limit` в първия GET (към Supabase) и/или сложи `Delay` блок (300–600ms) вътре в Loop преди `company-details`.
- Ако CompanyBook API върне 404/429, Fallback изхода на HTTP блока насочи към `Delay` и после обратно към Insert, за да не спира целият Loop.

Бонус: единична помощна функция за адрес
Ако искаш адресът да е по-четим, можеш да замениш `street` с:
```javascript
function formatSeat(s){
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
const street = formatSeat(seat);
```
