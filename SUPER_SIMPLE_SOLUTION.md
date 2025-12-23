# СУПЕР ПРОСТ НАЧИН - 2 СТЪПКИ! 🎯

## Забрави GitHub, Netlify и всичко друго!

### Стъпка 1: Пусни SQL в Supabase (1 минута)

1. Отвори: https://supabase.com/dashboard
2. SQL Editor → New Query
3. Copy-paste:

```sql
ALTER TABLE verified_owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to verified_owners" ON verified_owners;

CREATE POLICY "Allow public read access to verified_owners"
ON verified_owners
FOR SELECT
TO anon
USING (true);
```

4. Кликни RUN

---

### Стъпка 2: Отвори HTML файла ЛОКАЛНО (30 секунди)

**В терминала:**

```bash
cd ~/Documents/registry_stagehand_worker/docs
python3 -m http.server 8000
```

**След това отвори в браузър:**
```
http://localhost:8000/public_verified_owners.html
```

**ГОТОВО!** ✅

---

## Как да споделиш с други хора?

### Вариант А: ngrok (за временно споделяне)

```bash
# В друг терминал (докато Python server-ът работи):
ngrok http 8000
```

Ще получиш публичен URL тип:
```
https://abc123.ngrok.io/public_verified_owners.html
```

Сподели този URL и хората ще могат да го отворят!

### Вариант Б: Screen share

Просто сподели екрана си в Zoom/Teams/etc.

---

## Това е всичко! Никакви deploy-и, никакви настройки!

1. ✅ SQL в Supabase (веднъж)
2. ✅ `python3 -m http.server 8000`
3. ✅ Отвори http://localhost:8000/public_verified_owners.html
4. ✅ Работи!

За споделяне → използвай ngrok или screen share.

**БЕЗ GitHub, БЕЗ Netlify, БЕЗ главоболия!** 🎉
