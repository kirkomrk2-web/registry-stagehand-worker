# Текущ статус и план (Supabase + Hostinger Agent)

Този документ описва end‑to‑end логиката, кои таблици се използват реално, кои са legacy/за премахване, какво е тествано (с име „Daniel Milenov Martinov“), и точните следващи стъпки.

## 1) End‑to‑end логика (от Hostinger агента до Supabase)

1) Hostinger Chat/Agent (WordPress плъгин) приема вход (име/имейл) от потребителя.
   - Код/артефакти: `deploy/hostinger/wp-wallester-chat-agent.php` и UI в `browserbase-worker/ui/`.
   - Агентът изпраща заявка към Supabase Edge Function.

2) Първа проверка в Търговски регистър (CompanyBook) – Edge Function: `registry_check`
   - Път: `supabase/functions/registry_check/index.ts`
   - Вход: `{ full_name, email }`
   - Действия:
     - Търси лице в CompanyBook по име.
     - Извлича собствености и филтрира компании (EOOD/ET, 100% собственост, с английско име).
     - Пише резултат в `user_registry_checks` (match_count, any_match, companies JSON).
     - Обновява `users_pending.status` -> `ready_for_stagehand` ако any_match=true, иначе `no_match`.

3) Обработка на pending потребители – Edge Function: `users_pending_worker`
   - Път: `supabase/functions/users_pending_worker/index.ts`
   - Вход: `{ row: {full_name, email, status:"pending"} }` или празно тяло (взима първия `pending`).
   - Действия:
     - Търси по име в CompanyBook (дублира логиката, но също деривации: birthdate, companies до 5).
     - Създава/обновява запис в `verified_owners` с:
       - `full_name`, `owner_first_name_en`, `owner_last_name_en`, `owner_birthdate`
       - `companies` (до 5, без телефон/имейл вътре), `top_company`
     - Алокира телефон от `sms_numbers_pool` (взема първия със `status='available'`) и задава:
       - `allocated_phone_number`, `allocated_sms_number_url`, `allocated_sms_country_code`
     - Генерира уникален 33mail alias и записва `email_alias_33mail` (и `email_alias_hostinger`).
     - Обновява `users_pending.status` -> `ready_for_stagehand` (ако има мач), иначе `no_match`.

Бележка: В кода са добавени fallbacks за secrets: чете `SERVICE_ROLE_KEY` / `PROJECT_URL`, а ако липсват – пада към `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL`.

## 2) Таблици и реална употреба

Основни, реално използвани от Edge Functions:
- `users_pending` – входящи заявки (full_name, email, status: pending/ready_for_stagehand/no_match).
- `user_registry_checks` – лог от `registry_check` (match_count, any_match, companies JSON).
- `verified_owners` – новият основен модел на „собственик“ + до 5 фирми (companies JSON), `top_company`, owner‑ниво алокации (телефон, имейл alias). RLS е активен.
- `sms_numbers_pool` – пул с номера за SMS (phone_number, sms_url, country_code, status, assigned_to, assigned_at).
- VIEW/Helpers: `owners_by_company` (view), + функции `owners_*`, `select_best_company`, `list_signing_up_companies`.

Legacy/в процес на миграция (ползват се исторически или от стари worker-и):
- `verified_business_profiles` – стара структура (заменена от `verified_owners`).
- `owners_by_company` – използва се, но само за lookup-и; за висока производителност може да се замени с материализиран view (не е задължително).
- Разни `business_*` таблици (email_pool/aliases/ready_for_registration/completed_businesses) – ако текущите нови worker-и не ги използват, можем да ги маркираме като legacy и да ги премахнем поетапно след архив/бекъп.
- `wrappers_flow_stats`, `verification_monitoring`, `user_verifications` – изискват одит дали се използват от външни скриптове/плъгини; в Edge Functions, които видяхме, не се реферират директно.

Препоръка „Да останат“:
- `users_pending`, `user_registry_checks`, `verified_owners`, `sms_numbers_pool` (+ индекси)
- view `owners_by_company` и свързаните функции (освен ако не мигрираме към материализиран view)

Препоръка „Legacy/за премахване след бекъп“ (ако не се използват вече от други процеси):
- `verified_business_profiles` (и всякакви функции, които разчитат на полета вътре в company JSON като phone/email)
- `business_*` таблици, ако новият поток вече не ги актуализира
- `wrappers_flow_stats`, `verification_monitoring`, `user_verifications` – след одит

## 3) Дублирани индекси (Performance Advisor)

- `verified_owners`: имаме уникална констрейнт за `full_name` (която създава индекс) и допълнителен наш индекс по `full_name`. Махаме ръчния.
- `sms_numbers_pool`: две еднакви индекса по `assigned_to`. Оставяме описателния, махаме дублиращия.

Подготвен е файл: `supabase/sql/2025-11-29_remove_duplicate_indexes.sql` – изпълни го в Supabase SQL Editor и после „Rerun linter“.

## 4) Тестове (резултати)

- С име „Daniel Milenov Martinov“:
  - `registry_check` → 200 OK, `match_count=0`, `any_match=false`, `user_status='no_match'`.
  - `users_pending_worker` → 200 OK, `status='no_match'` (очаквано при липса на мач).

Команди, които изпълнихме (automation скрипт):
- Скрипт: `supabase/tests/test_edge_functions.sh`
- Пример:
  ```bash
  export SUPABASE_ANON_KEY='<ANON_KEY>'
  bash supabase/tests/test_edge_functions.sh registry_check
  bash supabase/tests/test_edge_functions.sh users_pending_worker
  ```

## 5) Следващи стъпки (по приоритет)

1) Почисти индексите (SQL файл е готов).
2) Увери се, че `sms_numbers_pool` има записи със `status='available'` (валидни `sms_url`, `country_code`).
3) Добави/вкарайте реални `users_pending` със статут `pending` (истински имена – с успешни мачове в CompanyBook).
4) Пусни `registry_check`, прегледай `user_registry_checks` (дали `any_match=true`).
5) Пусни `users_pending_worker` без body – да обработи първия `pending`.
6) Потвърди резултати:
   - `verified_owners` – нов/обновен owner, `top_company`, алокации (телефон, имейл alias).
   - `users_pending.status` → `ready_for_stagehand`.
7) (По желание) Scheduler – периодично извикване на `users_pending_worker`.
8) (Опция) Материализиран изглед за `owners_by_company` + индекси, ако натоварването стане високо.

## 6) Защо тестът връща no_match с „Daniel Milenov Martinov“
- В `registry_check` филтрите са строги: търсим 100% собствености, EOOD/ET и задължително английска транслитерация на името на фирмата. Ако CompanyBook не връща такива записи за въведеното име – ще получим `no_match`.
- Можем да добавим „разхлабени“ fallback-и (напр. допускаме ООД/ЕТ, частични собственици, без англ. име, после дообработваме) – по задание.

---

Ако искаш, мога да добавя fallback стратегия в `registry_check` и `users_pending_worker` (feature flag), както и да мигрираме към материализиран изглед за бързи lookup-и.
