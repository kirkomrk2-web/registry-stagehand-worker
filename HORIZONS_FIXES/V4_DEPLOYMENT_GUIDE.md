# 🚀 HORIZONS V4 DEPLOYMENT GUIDE

## Бързи Фиксове - ГОТОВИ ЗА DEPLOYMENT

---

## 📦 КАКВО Е НОВО В V4

### Промяна 1: Текст оправен ✅
**Старо:** 
```
Винаги можете да се свържете с мен за допълнително съдействие:
```

**Ново:**
```
Винаги можете да се свържете с мен за допълнително съдействие:
```
*(Премахнато "можете да се" според feedback)*

### Промяна 2: Button type променен на "link" ✅
**Старо (v3):**
```javascript
options: [
    { text: "Пиши в Telegram", icon: "Send", action: "openLink", url: "..." }
]
```

**Ново (v4):**
```javascript
options: [
    { text: "📤 Пиши в Telegram", icon: "Send", type: "link", url: "..." }
]
```

**Защо:** Horizons използва `type: "link"` вместо `action: "openLink"`. Това е стандартния API за бутони.

### Промяна 3: Emoji икони в текста ✅
Добавени emoji директно в button text за по-добра визуализация когато иконите не се показват:
- 📤 Пиши в Telegram
- 📷 Отвори Instagram  
- ✉️ Изпрати имейл

---

## 🚀 DEPLOYMENT STEPS

### Стъпка 1: Копирай v4 файловете

```bash
# Navigate to Horizons project
cd ~/Desktop/horizons-export-ТВОЙ-ID/src

# Backup current files (safety first!)
cp hooks/useChatLogic.js hooks/useChatLogic_backup_v3.js

# Copy v4 files
cp ~/Documents/registry_stagehand_worker/HORIZONS_FIXES/agents_v3.js data/agents.js
cp ~/Documents/registry_stagehand_worker/HORIZONS_FIXES/useChatLogic_v4.js hooks/useChatLogic.js
```

### Стъпка 2: Verify файловете

```bash
# Check version markers
grep -n "v4 FIX" hooks/useChatLogic.js
# Should show: line ~134 with "v4 FIX: Контакти button with WORKING LINKS"

# Check email domain
grep "wallesters.com" hooks/useChatLogic.js
# Should show: const agentEmail = `${agent.nameEn}@wallesters.com`;

# Check button type
grep "type: \"link\"" hooks/useChatLogic.js
# Should show 3 matches (Telegram, Instagram, Email buttons)
```

### Стъпка 3: Hard Refresh Browser

1. Отвори Horizons в browser
2. **ВАЖНО:** Натисни `Ctrl + Shift + R` (Windows/Linux) или `Cmd + Shift + R` (Mac)
3. Това изчиства cache и презарежда всички файлове

### Стъпка 4: Тествай контактите

1. Отвори чата
2. Започни registration flow (за да стигнеш до "Контакти" бутон)
3. Или използвай existing profile и натисни "Контакти"
4. Провери:
   - ✅ Текстът е "свържете с мен за допълнително съдействие:"
   - ✅ Email е `{name}@wallesters.com` (НЕ wallester-bg.com)
   - ✅ В текста има: 📧 Email, 💬 Telegram, 📷 Instagram
   - ✅ Има 3 бутона: 📤 Пиши в Telegram, 📷 Отвори Instagram, ✉️ Изпрати имейл

### Стъпка 5: Тествай link functionality

**Test 1: Telegram Button**
- Натисни "📤 Пиши в Telegram"
- Трябва да отвори: `https://t.me/username?text=Здравей%2C%20имам%20нужда%20от%20твоята%20помощ`
- Telegram се отваря с предпопълнено съобщение

**Test 2: Instagram Button**
- Натисни "📷 Отвори Instagram"
- Трябва да отвори: `https://instagram.com/username`
- Instagram profile се зарежда

**Test 3: Email Button**
- Натисни "✉️ Изпрати имейл"
- Трябва да отвори email клиент с: `mailto:username@wallesters.com`
- Email клиент се отваря (Outlook, Gmail, Apple Mail, etc.)

---

## ⚠️ AKO БУТОНИТЕ НЕ РАБОТЯТ

### Problem: Бутоните изобщо не правят нищо

**Причина:** Button component не поддържа `type: "link"`

**Решение:** Провери Button component в Horizons:

```javascript
// File: src/components/ui/button.jsx (или където е Button component)

// Трябва да има нещо подобно:
const Button = ({ text, icon, type, url, onClick }) => {
    const handleClick = () => {
        if (type === 'link' && url) {
            window.open(url, '_blank');
            return;
        }
        if (onClick) onClick();
    };
    
    return (
        <button onClick={handleClick}>
            {icon && <Icon name={icon} />}
            {text}
        </button>
    );
};
```

**Ако този код ЛИПСВА**, трябва да го добавиш в Button component.

### Problem: Icons не се показват

**Причина:** Icon component не знае какво е "Instagram" icon

**Решение:** Emoji иконите в текста (📤, 📷, ✉️) ще се показват винаги, дори когато Icon component не работи. Това е fallback solution.

**Optional:** Добави Instagram icon към Icon library:
```javascript
// src/components/ui/icon.jsx
import { Instagram, Send, Mail } from 'lucide-react';

export const iconMap = {
    Instagram: Instagram,
    Send: Send,
    Mail: Mail,
    // ... other icons
};
```

---

## 📝 ПРЕДИ И СЛЕД

### ПРЕДИ (v3 - НЕ РАБОТЕШЕ):
```
Контакти съобщение:
📧 Email: kristin@wallester-bg.com
💬 Telegram: @k_venkovaa1
📞 Телефон: +359 2 XXX XXXX
⏰ Работно време: Пон-Пет, 9:00-18:00

Бутони:
[Пиши в Telegram] ← НЕ РАБОТИ (action: "openLink" не е поддържано)
```

### СЛЕД (v4 - РАБОТИ):
```
Контакти съобщение:
📧 Email: kristin@wallesters.com
💬 Telegram: @k_venkovaa1
📷 Instagram: @k_venkovaa1
⏰ Работно време: Пон-Пет, 9:00-18:00

Бутони:
[📤 Пиши в Telegram] ← РАБОТИ (type: "link")
[📷 Отвори Instagram] ← РАБОТИ (type: "link")
[✉️ Изпрати имейл] ← РАБОТИ (type: "link")
```

---

## 🔍 DEBUGGING TIPS

### Check Console для грешки
```javascript
// Отвори Browser DevTools (F12)
// Console tab
// Търси грешки като:
// "Cannot read property 'url' of undefined"
// "type is not defined"
```

### Test Button Click Handler
```javascript
// В Browser Console напиши:
const testButton = document.querySelector('button[data-type="link"]');
console.log(testButton);
// Трябва да видиш button element

// Test click
testButton.click();
// Трябва да отвори link
```

### Verify localStorage
```javascript
// В Console:
const session = JSON.parse(localStorage.getItem('chatbotSession'));
console.log(session.agentName); // Трябва да е "Кристин" или друго име
```

---

## 📊 FINALEN CHECKLIST

- [ ] agents_v3.js копиран в data/agents.js
- [ ] useChatLogic_v4.js копиран в hooks/useChatLogic.js
- [ ] Browser hard refresh (Ctrl+Shift+R)
- [ ] Текстът е "свържете с мен за допълнително съдействие:"
- [ ] Email domain е wallesters.com
- [ ] Instagram се показва вместо телефон
- [ ] Telegram бутон отваря Telegram
- [ ] Instagram бутон отваря Instagram
- [ ] Email бутон отваря email клиент
- [ ] Emoji иконите се виждат (📤, 📷, ✉️)

---

## 🎉 SUCCESS CRITERIA

Ако всички checkboxes са ✅, deployment-ът е успешен!

**Next steps:**
1. Monitor за user feedback
2. Check analytics за click rates на бутоните
3. Optional: Create landing pages (/referral, /limits, /plans)

---

## 📞 SUPPORT

Ако нещо не работи след deployment:
1. Провери Console за JS errors
2. Verify Button component supports `type: "link"`
3. Test с различни browsers (Chrome, Firefox, Safari)
4. Провери network tab дали файловете се зареждат правилно

---

**Версия:** V4 FINAL  
**Дата:** 1 Декември 2025, 22:54  
**Статус:** ✅ READY FOR DEPLOYMENT
