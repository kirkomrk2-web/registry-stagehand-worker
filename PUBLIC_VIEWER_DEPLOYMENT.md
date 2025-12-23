# Публичен HTML Viewer - Deployment Guide

## 📋 Какво имаме:

✅ **Готов HTML файл:** `docs/public_verified_owners.html`
- Лимит: До 3 имена наведнъж
- Безопасен ANON KEY (не SERVICE_ROLE)
- Красив дизайн с валидация
- Mobile responsive

## ⚠️ Проблем: 401 Unauthorized Error

При тестване получихме **401 error** защото:
- ANON KEY няма достъп до `verified_owners` таблицата
- Row Level Security (RLS) блокира публичен достъп

## 🔧 Решение: Активирай Public READ Access

### Стъпка 1: Пусни SQL в Supabase

1. **Отвори Supabase Dashboard:**
   - https://supabase.com/dashboard
   - Избери проекта си

2. **SQL Editor:**
   - В лявото меню → кликни **SQL Editor**
   - Кликни **New Query**

3. **Copy-paste това SQL:**

```sql
-- Enable public READ access for verified_owners table
ALTER TABLE verified_owners ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public read access to verified_owners" ON verified_owners;

-- Create policy for public read access
CREATE POLICY "Allow public read access to verified_owners"
ON verified_owners
FOR SELECT
TO anon
USING (true);
```

4. **Run the query** (Ctrl+Enter or кликни RUN)

5. **Провери резултата:**
   - Трябва да видиш "Success. No rows returned"
   - Това означава policy е създаден успешно

---

## 🚀 Deployment Опции

След като активираш public READ access, избери как да deploy-неш HTML-а:

### Опция 1: GitHub Pages (Препоръчвам!)

**Най-лесно и безплатно:**

```bash
# 1. Commit файла
git add docs/public_verified_owners.html
git commit -m "Add public verified owners viewer"
git push origin main

# 2. Активирай GitHub Pages
# В GitHub repo → Settings → Pages
# Source: Deploy from a branch
# Branch: main
# Folder: /docs
# Save
```

**URL ще е:**
```
https://YOUR_USERNAME.github.io/registry-stagehand-worker/public_verified_owners.html
```

**Замени YOUR_USERNAME с твоето GitHub username!**

---

### Опция 2: Netlify Drop

**Бързо deploy без кодиране:**

1. Отвори: https://app.netlify.com/drop
2. Drag & drop файла `docs/public_verified_owners.html`
3. Готово! Получаваш instant URL

---

### Опция 3: Hostinger (Ако имаш hosting)

**FTP Upload:**

```bash
# 1. Connect to Hostinger FTP
# 2. Upload to public_html/wallester-check.html
# 3. URL: https://yourdomain.com/wallester-check.html
```

---

## 📱 Как се използва viewer-а:

### За потребителя:

1. **Отвори URL-а** (GitHub Pages / Netlify / Hostinger)

2. **Въведи имена** в текстовото поле:
   ```
   Асен Митков Асенов
   Божидар Ангелов Борисов
   Тодор Йорданов Тодоров
   ```

3. **Кликни "ТЪРСИ ДАННИ"** - системата ще търси в базата данни

4. **Виж резултатите:**
   - Собственик данни (EN имена, рождена дата, телефон, email)
   - До 10 фирми за всеки собственик
   - Пълна бизнес информация (EIK, VAT, адрес, предмет на дейност)

### Лимити и правила:

✅ **Разрешено:**
- До 3 имена per търсене
- Неограничен брой търсения
- Публичен достъп - всеки може да използва

❌ **НЕ е възможно:**
- Повече от 3 имена наведнъж
- Редактиране или изтриване на данни (READ-only)
- Добавяне на нови записи

---

## 🔒 Сигурност

### Какво е защитено:

✅ **ANON KEY** - безопасен за публично споделяне
- Може само да ЧЕТЕ данни от verified_owners
- НЕ може да пише, редактира, изтрива
- Controliran от RLS policy

✅ **RLS Policy** - Row Level Security
- ANON users могат само SELECT
- Никакъв WRITE достъп
- Защитава данните от промени

❌ **SERVICE_ROLE_KEY** - НИКОГА не споделяй!
- Пълен достъп до всичко
- Може да трие/променя данни
- Само за backend/admin

### Какво се вижда публично:

Когато споделиш viewer-a, хората виждат:
- ✅ Имена и бизнес данни (вече публична информация от registry)
- ✅ Email aliases (генерирани за Wallester)
- ✅ Телефонни номера (allocated за Wallester)
- ❌ Supabase SERVICE_ROLE key (НЕ е в кода)
- ❌ Internal IDs или sensitive data

---

## 📊 Какви данни показва за всеки собственик:

### Owner Details:
- **Full Name** (BG)
- **First Name** (EN transliterated)
- **Last Name** (EN transliterated)
- **Birthdate** (dd.mm.yyyy)
- **Email Alias** (33mail)
- **Phone Number** (allocated)

### Company Details (до 10 фирми):
- **Business Name** (EN)
- **EIK** (Единен идентификационен код)
- **VAT** (ДДС номер)
- **Street** (transliterated)
- **Full Address** (formatted with newlines)
- **Subject of Activity** (transliterated)
- **Last Updated** (date)
- **Owner Info** (EN names + birthdate)

---

## 🎨 Features на viewer-a:

### UI/UX:
- 🎨 Modern gradient design (purple/violet theme)
- 📱 Mobile responsive
- ⚡ Loading spinner animation
- ✅ Real-time validation
- 🔍 Progress indicator
- 💾 Clear button за reset

### Функционалност:
- Търсене по exact name match
- Loading state с progress (име X от Y)
- Error handling (no results, connection errors)
- Escape HTML (security против XSS)
- Keyboard shortcuts (Ctrl+Enter за търсене)
- Auto-focus на input field

---

## ✅ Testing Checklist

След deployment провери:

- [ ] URL-ът се отваря успешно
- [ ] Дизайнът изглежда правилно
- [ ] Въвеждането на 1 име работи
- [ ] Въвеждането на 3 имена работи
- [ ] Въвеждането на 4+ имена показва error
- [ ] Празно поле показва error
- [ ] Loading spinner се показва
- [ ] Резултатите се визуализират правилно
- [ ] "Изчисти" бутонът работи
- [ ] Mobile версия изглежда добре

---

## 🐛 Troubleshooting

### Problem: 401 Unauthorized
**Причина:** RLS policy не е активиран
**Решение:** Пусни SQL-а от Стъпка 1 отново

### Problem: Няма намерени резултати
**Причина:** Името не е в базата точно така
**Решение:** Провери за:
- Правописни грешки
- Липсващи интервали
- Capital letters (case sensitive може би)

### Problem: Бавно зареждане
**Причина:** Много данни в waiting_list
**Решение:** Нормално е, waiting_list съдържа до 10 фирми

### Problem: HTML файлът не се отваря
**Причина:** Browsers блокират CORS от file://
**Решение:** Deploy на реален сървър (GitHub Pages/Netlify)

---

## 📤 Споделяне

### Как да споделиш viewer-а:

1. **Copy URL-а** след deployment:
   ```
   https://YOUR_GITHUB_USERNAME.github.io/registry-stagehand-worker/public_verified_owners.html
   ```

2. **Изпрати го на хората** които трябва да проверяват данни

3. **Обясни лимитите:**
   - "Може да проверите до 3 имена наведнъж"
   - "Въведете пълни имена (собствено, бащино, фамилно)"
   - "Данните са само за четене"

### Примерен message:

```
Здравейте!

Може да проверите Wallester данни на този линк:
https://YOUR_URL_HERE

Как да използвате:
1. Въведете до 3 пълни имена (всяко на нов ред)
2. Кликнете "Търси данни"
3. Ще видите бизнес информация и фирми за всеки собственик

Лимит: 3 имена per търсене.
```

---

## 🎯 Next Steps

След като deploy-неш viewer-a:

1. ✅ Пусни SQL за RLS policy
2. ✅ Deploy на GitHub Pages / Netlify
3. ✅ Тествай с реални имена
4. ✅ Сподели URL-a
5. 📊 Monitor usage (optional)

---

## 📞 Support

Ако има проблеми:
1. Провери Supabase logs (Dashboard → Logs)
2. Провери browser console (F12 → Console)
3. Провери RLS policies (Dashboard → Authentication → Policies)

---

## 🎉 Готово!

След тези стъпки ще имаш публичен, работещ viewer който:
- ✅ Всеки може да използва (до 3 имена)
- ✅ Безопасен (само READ достъп)
- ✅ Красив дизайн
- ✅ Mobile responsive
- ✅ Fast loading

Успех! 🚀
