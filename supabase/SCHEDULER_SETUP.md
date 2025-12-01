# Автоматично обработване на pending записи

Този документ описва три начина да „пуснеш системите“ да чакат и обработват нови записи със статус `pending` в `users_pending` без ръчно извикване.

## Вариант A (препоръчан): Supabase Scheduled Trigger
Използваме вграден Scheduler на Supabase, който ще вика Edge функцията `users_pending_worker` периодично. Функцията поддържа „autopick“ – при празно `body` взима първия `pending` запис.

Стъпки в Dashboard:
1. Отвори: Edge Functions → users_pending_worker.
2. Увери се, че е Deploy-ната (бутон „Deploy“ ако не е).
3. Отиди на таб Triggers → New scheduled trigger.
4. Попълни:
   - Name: `process-pending`
   - Cron: `*/1 * * * *` (всяка минута) или `*/5 * * * *`
   - Method: `POST`
   - Headers:
     - `Authorization: Bearer <ANON_KEY>` (ползвай „Show anon key“ от страницата на функцията)
     - `Content-Type: application/json`
   - Body: `{}`
5. Save / Enable.

Поведение: на всяка минута Scheduler ще POST-не празно тяло към функцията. Тя ще вземе първия `pending` запис и ще го обработи → `users_pending.status` става `ready_for_stagehand` (или `no_match`), ще се попълни/обнови `verified_owners`, ще се алокира телефон (ако има `available` в `sms_numbers_pool`) и ще се генерира 33mail alias.

## Вариант B: Локален watcher (вече създаден)
В хранилището е добавен скрипт за локално „наблюдение“:

- Файл: `supabase/scripts/pending_watcher.sh`
- Какво прави: на всеки N секунди POST-ва към `users_pending_worker` с празно тяло и логва отговора.

Стартиране:
```bash
export SUPABASE_ANON_KEY='<ТВОЯ_АНОН_КЛЮЧ>'
export BASE_URL='https://<project-ref>.supabase.co/functions/v1'
# за твоя проект:
# export BASE_URL='https://ansiaiuaygcfztabtknl.supabase.co/functions/v1'

bash supabase/scripts/pending_watcher.sh 60   # на всеки 60 секунди
```
Спиране: Ctrl+C в терминала където върви. Ако е пуснат в background (`&`), намери процеса с `ps | grep pending_watcher.sh` и го спри с `kill <PID>`.

## Вариант C: Cron (локално, без отворен терминал)
Ако искаш периодично извикване без отворен терминал и без Supabase Scheduler, можеш да добавиш Cron задача, която вика функцията през `curl`.

Създай файл `~/curl_users_pending_worker.sh` със съдържание:
```bash
#!/usr/bin/env bash
ANON='<ТВОЯ_АНОН_КЛЮЧ>'
BASE='https://ansiaiuaygcfztabtknl.supabase.co/functions/v1'
curl -sS -X POST "$BASE/users_pending_worker" \
 -H "Authorization: Bearer $ANON" \
 -H "Content-Type: application/json" \
 --data '{}' > /tmp/users_pending_worker_$(date +%s).log 2>&1
```
Дай права:
```bash
chmod +x ~/curl_users_pending_worker.sh
```
Добави cron (редакция на crontab):
```bash
crontab -e
# добави ред (напр. всяка минута):
* * * * * /bin/bash -lc '~/curl_users_pending_worker.sh'
```

## Как да валидираш, че работи
1. Вкарай запис в `users_pending` (full_name, email, status='pending').
2. Изчакай 1–2 минути (според интервала на Scheduler/watcher/cron).
3. Провери:
   - `users_pending.status` → `ready_for_stagehand` или `no_match`.
   - `verified_owners` → нов/ъпдейтнат owner, `companies`, `top_company`, алокации.
   - `sms_numbers_pool` → номер преминал в `assigned` (ако има `available`).

## Бележки
- Ако искаш повече „положителни“ мачове, можем да включим RELAXED режим (>=51% собственост, допускане на ООД). Кажи и ще добавя Feature Flag.
- За таргетиран тест можеш да подадеш `eik_hint` към `registry_check` (напр. `208341137`) – в кода вече има поддръжка да включи фирмата с този ЕИК в резултата.
