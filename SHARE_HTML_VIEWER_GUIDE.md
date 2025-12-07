# Как да споделите HTML Viewer за публичен достъп

## 🌐 Опция 1: GitHub Pages (ПРЕПОРЪЧВАНО - Безплатно, лесно)

### Стъпка 1: Активиране на GitHub Pages

1. Отидете на вашето GitHub repo:
   ```
   https://github.com/kirkomrk2-web/registry-stagehand-worker
   ```

2. Кликнете на **Settings** (горе дясно)

3. В лявото меню намерете **Pages**

4. Под "Source" изберете:
   - **Branch:** `main`
   - **Folder:** `/docs`
   - Кликнете **Save**

5. След 1-2 минути вашата страница ще бъде достъпна на:
   ```
   https://kirkomrk2-web.github.io/registry-stagehand-worker/verified_owners_viewer.html
   ```

### Стъпка 2: Тестване

Отворете линка в браузър и тествайте с 3 имена от test-а:
```
Асен Митков Асенов
Божидар Ангелов Борисов
Тодор Йорданов Тодоров
```

### ✅ Готово! 

Сега можете да споделите линка с други хора.

---

## 🚀 Опция 2: Netlify (По-професионално)

### Стъпка 1: Създаване на Netlify сайт

1. Отидете на https://www.netlify.com/
2. Регистрирайте се (безплатно)
3. Кликнете "Add new site" → "Import an existing project"
4. Изберете GitHub и authorize Netlify
5. Изберете вашето repo: `registry-stagehand-worker`

### Стъпка 2: Конфигурация

```yaml
Build settings:
  Base directory: docs
  Publish directory: .
  Build command: (оставете празно)
```

### Стъпка 3: Deploy

- Кликнете "Deploy site"
- След ~1 минута ще получите URL като:
  ```
  https://wallester-viewer-abc123.netlify.app/verified_owners_viewer.html
  ```

### Стъпка 4: Custom Domain (Опционално)

Можете да добавите custom domain:
```
wallester-check.yourdomain.com
```

---

## 📱 Опция 3: Hostinger (Ако имате hosting)

### Метод А: FTP Upload

1. Свържете се към FTP:
   ```
   Host: ftp.yourdomain.com
   User: your-username
   Pass: your-password
   ```

2. Upload файла:
   ```
   docs/verified_owners_viewer.html
   → public_html/wallester/check.html
   ```

3. Достъп на:
   ```
   https://yourdomain.com/wallester/check.html
   ```

### Метод Б: Hostinger File Manager

1. Login в Hostinger Dashboard
2. Отидете на "File Manager"
3. Navigate до `public_html`
4. Създайте папка `wallester`
5. Upload `verified_owners_viewer.html`
6. Rename на `index.html` (за по-чист URL)

---

## 🔒 ВАЖНО: Security Considerations

### ⚠️ SERVICE_ROLE_KEY е ХАРДКОДИРАН в HTML!

В `verified_owners_viewer.html` има:

```javascript
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**Това е ОПАСНО за публичен достъп!**

### ✅ Решение: Ограничаване на достъпа

#### Опция А: Password Protection (Лесно)

Добавете преди `<script>` тага:

```html
<script>
// Simple password protection
const correctPassword = "wallester2024";
const enteredPassword = prompt("Въведете парола за достъп:");
if (enteredPassword !== correctPassword) {
    document.body.innerHTML = "<h1>Отказан достъп</h1>";
    throw new Error("Invalid password");
}
</script>
```

#### Опция Б: IP Whitelist (Hostinger)

В `.htaccess`:
```apache
<Files "verified_owners_viewer.html">
    Order Deny,Allow
    Deny from all
    Allow from 123.456.789.0  # Вашето IP
    Allow from 98.765.432.1   # Офис IP
</Files>
```

#### Опция В: Supabase RLS Policies (Най-сигурно)

Вместо SERVICE_ROLE_KEY, използвайте ANON_KEY + RLS:

1. Създайте RLS policy в Supabase:
```sql
CREATE POLICY "Allow read verified_owners for authenticated users"
ON verified_owners FOR SELECT
USING (auth.role() = 'authenticated');
```

2. Обновете HTML да изисква authentication

---

## 📋 Готов за използване HTML код (с password)

Ще създам protected version:

```html
<!DOCTYPE html>
<html lang="bg">
<head>
    <meta charset="UTF-8">
    <title>Wallester - Protected Access</title>
</head>
<body>
<script>
// Password protection
const pwd = prompt("Въведете парола:");
if (pwd !== "wallester2024") {
    document.body.innerHTML = "<h1>❌ Грешна парола</h1>";
} else {
    // Load the real viewer
    window.location.href = "verified_owners_viewer.html";
}
</script>
</body>
</html>
```

---

## 🎯 Препоръчан подход за споделяне

### За вътрешна употреба (вашия екип):

1. **GitHub Pages** + Password в HTML
2. Споделете парола само с доверени лица
3. URL: `https://kirkomrk2-web.github.io/registry-stagehand-worker/verified_owners_viewer.html`

### За клиенти/външни хора:

1. **Netlify** с custom domain
2. **Supabase Authentication** за истински login
3. **Rate limiting** на backend

---

## 📞 Примерен работен поток

1. Вие споделяте линка:
   ```
   https://kirkomrk2-web.github.io/registry-stagehand-worker/protected.html
   ```

2. Потребителят въвежда парола: `wallester2024`

3. Отваря се viewer-ът

4. Потребителят въвежда 3 имена:
   ```
   Иван Иванов Иванов
   Петър Петров Петров
   Георги Георгиев Георгиев
   ```

5. След 2-3 секунди вижда резултатите с фирмите

---

## ⚡ Бърз старт (5 минути)

```bash
# 1. Push към GitHub (вече направено!)
git push origin main

# 2. Enable GitHub Pages
# - Отидете на Settings → Pages
# - Source: main branch, /docs folder
# - Save

# 3. Чакайте 2 минути

# 4. Тествайте:
https://kirkomrk2-web.github.io/registry-stagehand-worker/verified_owners_viewer.html

# 5. Споделете линка! 🎉
```

---

## 🔗 Полезни линкове

- **GitHub Repo:** https://github.com/kirkomrk2-web/registry-stagehand-worker
- **HTML Viewer файл:** `docs/verified_owners_viewer.html`
- **Supabase Dashboard:** https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl

---

## ❓ FAQ

**Q: Може ли да огранича броя проверки?**  
A: Да, добавете counter в localStorage или backend rate limiting.

**Q: Работи ли offline?**  
A: Не, изисква се интернет за Supabase API.

**Q: Как да променя дизайна?**  
A: Редактирайте CSS секцията в HTML файла.

**Q: Може ли да добавя още полета?**  
A: Да, редактирайте `renderCompany()` функцията.

---

**Статус:** ✅ Готови за споделяне!
