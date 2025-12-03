# Prompt за Horizon AI Builder

## 🤖 Копирай и изпрати този prompt в Horizon AI Chat

---

**ВАЖНО: Преди да започнеш, прегледай текущото състояние на всички файлове в проекта, защото има ръчни промени които НЕ трябва да се загубят!**

---

## Задача: Създай 3 Landing Pages за Wallester Bulgaria Chat Agent

Трябва да създадеш 3 нови страници в Horizons проекта за Wallester Bulgaria chat bot:

### 1. `/referral` - Реферал Програма
### 2. `/limits` - Условия и Лимити  
### 3. `/plans` - Планове и Цени

---

## Изисквания за Дизайн

### Стил и Визия:
- ✅ Използвай **същия стил** като текущите страници в проекта
- ✅ Responsive design (mobile-first)
- ✅ Използвай **същите цветове** (зелен primary, dark фон като в чата)
- ✅ Използвай **същите шрифтове** и typography
- ✅ Добави **плавни анимации** (fade-in, hover effects)
- ✅ Съответствай на **текущата CSS структура**

### Layout:
- Header със заглавие на страницата
- Hero section с key message
- Content sections с ясна йерархия
- CTA buttons (Call-to-action) - "Започни", "Назад към чата", etc.
- Footer с контакти

### Консистентност:
- ⚠️ **ВАЖНО**: Прегледай `src/styles/` папката за текущите стилове
- ⚠️ **ВАЖНО**: Виж структурата на други страници (ако има)
- ⚠️ Използвай същите компоненти (buttons, cards, sections)

---

## Съдържание за Страниците

### Page 1: `/referral` - Реферал Програма

**Структура:**
```
# Покани и Спечели 35€

## Как работи?
1. Сподели линка си
2. Приятел се регистрира
3. Получаваш 35€

## Условия
- Нов клиент
- Активира картата
- Бонус след 7-14 дни
- Неограничен брой покани

## Твоят Реферален Линк
[Input field с copy button]

## Статистика
- Изпратени покани: 0
- Регистрации: 0  
- Спечелени: 0€

## ЧЗВ
- Колко време отнема?
- Има ли лимит?
- Къде се начислява?

[CTA: Копирай Линк] [Назад към Чата]
```

**Детайлно съдържание:** Виж файла `LANDING_PAGES/referral.md` в този folder

---

### Page 2: `/limits` - Условия и Лимити

**Структура:**
```
# Условия и Лимити

## Транзакционни Лимити
[Comparison table: Free vs Premium vs Business]

## Такси и Комисионни
[Table със всички такси]

## Изисквания за Регистрация
- Български гражданин 18+
- Валиден документ
- Бизнес (ЕООД/ЕТ)
- ЕИК номер

## Срокове за Обработка
[Timeline: Проверка → Одобрение → Издаване]

## Сигурност (KYC/AML)

## Забранени Дейности

[CTA: Създай Профил] [Сравни Планове]
```

**Детайлно съдържание:** Виж файла `LANDING_PAGES/limits.md`

---

### Page 3: `/plans` - Планове и Цени

**Структура:**
```
# Планове и Цени

## Специална Оферта
🎉 3 Месеца Безплатен Trial!

## Comparison Table
[Detailed comparison: Free | Premium | Business]
- Цена
- Лимити
- Карти
- Поддръжка
- Features

## Кой План За Кого?
[3 sections с use cases]

## Калкулатор на Разходи
[Examples with numbers]

## ЧЗВ

## Специални Оферти
- Студентска отстъпка
- Годишно плащане
- Реферална програма

[CTA: Започни Free Trial]
```

**Детайлно съдържание:** Виж файла `LANDING_PAGES/plans.md`

---

## Технически Изисквания

### Routing:
```javascript
// Ако използваш React Router
<Route path="/referral" element={<ReferralPage />} />
<Route path="/limits" element={<LimitsPage />} />
<Route path="/plans" element={<PlansPage />} />

// Ако използваш Next.js
// Създай: pages/referral.jsx, pages/limits.jsx, pages/plans.jsx
```

### Components:
```jsx
// Използвай/създай тези компоненти:
<PageHeader title="..." subtitle="..." />
<HeroSection />
<ComparisonTable data={...} />
<CTAButton text="..." onClick={...} />
<FAQSection questions={...} />
<ContactFooter />
```

### Styling:
- Използвай **Tailwind CSS** (ако проектът го използва)
- Или съответния CSS framework на проекта
- Добави smooth scroll behavior
- Hover effects на buttons/cards
- Mobile breakpoints: 640px, 768px, 1024px

### Icons:
- Използвай **Lucide Icons** (съответства на проекта)
- Emoji за визуален акцент (✅, 🎉, 💳, etc.)

---

## Интеграция с Чата

### Update `agents.js`:
```javascript
dataSent: {
    text: "Ако искаш през това време ще ти кажа как да спечелиш 35€?",
    options: [
        { 
            text: "Покани и спечели 35€", 
            icon: "Gift",
            type: "link",  // ⬅️ Добави това
            url: "/referral" // ⬅️ Добави това
        },
        { 
            text: "Условия и лимити", 
            icon: "Shield",
            type: "link",
            url: "/limits"
        },
        {
            text: "Планове и цени",
            icon: "CreditCard",
            type: "link",
            url: "/plans"
        }
    ]
}
```

### Update Option Handler:
```jsx
// В component където рендериш options
{message.options?.map((opt, i) => (
    opt.type === 'link' ? (
        <a 
            key={i}
            href={opt.url}
            target="_blank"  // или без target за same page
            rel="noopener noreferrer"
            className="option-button link"
        >
            <Icon name={opt.icon} />
            {opt.text}
        </a>
    ) : (
        <button onClick={() => handleOptionClick(opt.text)}>
            <Icon name={opt.icon} />
            {opt.text}
        </button>
    )
))}
```

---

## ⚠️ КРИТИЧНО ВАЖНО

### НЕ Променяй Тези Файлове (има ръчни fix-ове):
- ❌ `src/hooks/useChatLogic.js` - Има критични fixes!
- ❌ `src/lib/agents.js` - Обнови само `dataSent` response
- ❌ Каквито и да е файлове с коментари "⭐ FIX"

### САМО Създай Нови:
- ✅ `src/pages/referral.jsx` (или .tsx)
- ✅ `src/pages/limits.jsx`
- ✅ `src/pages/plans.jsx`
- ✅ Евентуално нови CSS файлове ако е нужно

### ОПЦИОНАЛНО Промени:
- ✅ `src/lib/agents.js` - САМО dataSent options (добави type и url)
- ✅ Option rendering component - handle link type
- ✅ Router config - add new routes

---

## Testing Checklist

След като създадеш страниците, провери:

### Functionality:
- [ ] Всички 3 страници се зареждат без errors
- [ ] Links от Chat-а водят към правилните страници
- [ ] "Назад към чата" buttons работят
- [ ] Copy buttons за referral link работят (ако са добавени)
- [ ] Responsive на mobile/tablet/desktop

### Design:
- [ ] Използван е същия стил като останалия сайт
- [ ] Colors match (зелен primary, dark backgrounds)
- [ ] Fonts са консистентни
- [ ] Spacing и padding са правилни
- [ ] Animations са smooth

### Content:
- [ ] Всички текстове са на **български**
- [ ] Emoji-та са добавени за визуален акцент
- [ ] Tables са четими и форматирани правилно
- [ ] CTA buttons са ясни и видими
- [ ] Contact информация е включена

---

## Допълнителни Подобрения (Optional)

Ако имаш време, добави:

### 1. Pricing Calculator (за /plans):
```jsx
<Calculator>
  <input type="number" placeholder="Месечен оборот" />
  <input type="number" placeholder="Брой транзакции" />
  <Result>
    Препоръчан план: Premium
    Месечни разходи: 9.90€ + такси
  </Result>
</Calculator>
```

### 2. Live Stats (за /referral):
```jsx
// Fetch from Supabase
const { data } = await supabase
  .from('referrals')
  .select('count, earnings')
  .eq('user_id', userId)
```

### 3. Testimonials Section:
```jsx
<Testimonials>
  <Quote author="Иван П., EOOD">
    "Wallester опрости финансите на моята фирма!"
  </Quote>
</Testimonials>
```

---

## Файлове За Reference

Всички детайли за съдържанието са в:
- `LANDING_PAGES/referral.md`
- `LANDING_PAGES/limits.md`
- `LANDING_PAGES/plans.md`

Прегледай ги за пълния текст и структура!

---

## Примерен Code Skeleton

```jsx
// src/pages/referral.jsx
import { useState } from 'react';
import { Copy, Gift, ArrowLeft } from 'lucide-react';

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);
  const referralLink = "https://wallester-bg.com/ref/USER123";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="referral-page">
      {/* Header */}
      <header className="page-header">
        <h1>🎁 Покани и Спечели 35€</h1>
        <p>За всеки регистриран приятел</p>
      </header>

      {/* How it Works */}
      <section className="how-it-works">
        <h2>Как работи?</h2>
        <div className="steps">
          <div className="step">
            <span className="number">1</span>
            <h3>Сподели</h3>
            <p>Изпрати твоя реферален линк</p>
          </div>
          {/* ... steps 2, 3 */}
        </div>
      </section>

      {/* Referral Link */}
      <section className="referral-link-section">
        <h2>Твоят Реферален Линк</h2>
        <div className="link-container">
          <input 
            type="text" 
            value={referralLink} 
            readOnly 
          />
          <button onClick={copyToClipboard}>
            <Copy size={20} />
            {copied ? 'Копирано!' : 'Копирай'}
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="stats">
        {/* ... stats content */}
      </section>

      {/* FAQ */}
      <section className="faq">
        {/* ... FAQ content */}
      </section>

      {/* CTA */}
      <section className="cta">
        <button className="btn-primary">
          Копирай Реферален Линк
        </button>
        <a href="/" className="btn-secondary">
          <ArrowLeft size={16} />
          Назад към Чата
        </a>
      </section>
    </div>
  );
}
```

---

## Финален Checklist

Преди да приключиш:

- [ ] Всички 3 страници са създадени
- [ ] Routing е конфигуриран правилно
- [ ] Links от Chat работят
- [ ] Design е консистентен с проекта
- [ ] Responsive на всички устройства
- [ ] Няма console errors
- [ ] Content е пълен и правилен (на български)
- [ ] CTA buttons са функционални
- [ ] Git commit с ясно съобщение

---

**Status**: Готов за използване  
**Priority**: HIGH  
**Estimated Time**: 2-3 часа за всички 3 страници

Успех! 🚀
