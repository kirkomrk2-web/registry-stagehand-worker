# 🏗️ HOSTINGER AI BUILDER - PROMPTS ЗА LANDING PAGES

## Детайлни инструкции за генериране на страници

---

## 📄 СТРАНИЦА 1: /referral - Референтна програма

### Prompt за Hostinger AI Builder:

```
Създай професионална HTML/CSS/JavaScript landing page за Wallester-bg.com референтна програма.

СТРУКТУРА:
1. Hero Section (горе):
   - Заглавие: "Покани и спечели 35€ за всеки доведен приятел"
   - Subtitle: "Твоята персонална референтна програма работи 24/7"
   - Gradient background (син към виолетов)
   - CTA бутон: "Започни да споделяш" (отваря chat bot)

2. Как работи (3 стъпки):
   - Стъпка 1: Споделяш уникален линк
   - Стъпка 2: Приятел създава профил и верифицира бизнес
   - Стъпка 3: И двамата получавате 35€ бонус
   [Използвай иконки: Link, UserPlus, Gift]

3. Калкулатор за печалби:
   - Интерактивен slider (1-100 referrals)
   - Real-time изчисление: X referrals × 35€ = Y€
   - Показва monthly/yearly earnings
   - JavaScript за интерактивност

4. FAQ секция:
   - "Кога се изплащат бонусите?"
   - "Има ли лимит на broй referrals?"
   - "Какво се случва ако приятелят не се верифицира?"
   - "Може ли да споделя в социални мрежи?"
   [Accordion style - collapse/expand]

5. Referral статистики (примерни данни):
   - Top referrers leaderboard
   - Средна conversion rate
   - Total изплатени бонуси

6. CTA секция (долу):
   - Бутон: "Вземи моя референтен линк"
   - Бутон: "Разговаряй с нас" (отваря chat)

ДИЗАЙН:
- Modern, clean aesthetic
- Gradient accents (#4F46E5 → #7C3AED)
- White backgrounds за карти
- Smooth animations при scroll
- Mobile responsive (приоритет!)
- Fast loading (<2s)

ТЕХНИЧЕСКИ:
- Semantic HTML5
- Tailwind CSS или Bootstrap
- Vanilla JavaScript (no framework needed)
- SEO optimized (meta tags, headings)
- Open Graph tags за social sharing

ИНТЕГРАЦИЯ:
- CTA бутоните отварят chat bot: onclick="window.openChatBot()"
- Referral link генериране: /api/generate-referral-link
```

### Съдържание (копирай от):
`HORIZONS_FIXES/LANDING_PAGES/referral.md`

---

## 📄 СТРАНИЦА 2: /limits - Лимити и такси

### Prompt за Hostinger AI Builder:

```
Създай detailed информационна страница за Wallester-bg.com транзакционни лимити и такси.

СТРУКТУРА:
1. Hero Section:
   - Заглавие: "Прозрачни лимити и такси"
   - Subtitle: "Без скрити разходи. Всичко на едно място."
   - Icons: Shield, CheckCircle, DollarSign

2. Лимити по план (Comparison Table):
   - 3 колони: Free | Premium | Business
   - Редове:
     * Дневен лимит (€500 | €5,000 | €50,000)
     * Месечен лимит (€1,500 | €15,000 | €150,000)
     * Транзакция лимит (€200 | €2,000 | €20,000)
     * ATM теглене (€200 | €1,000 | €5,000)
     * Online плащания (€200 | €5,000 | €50,000)
   - Highlight препоръчания план (Premium)
   - Responsive: на mobile стават tabs вместо table

3. Такси и комисионни (Grid Layout):
   - Карта 1: Издаване на карта (Безплатно)
   - Карта 2: Месечна такса (€0 | €5 | €15)
   - Карта 3: ATM теглене (1%min €1.50)
   - Карта 4: Валутна конверсия (0.5%)
   - Карта 5: Международни плащания (0.3%)
   - Всяка карта с икона и tooltip за детайли

4. Upgrade process:
   - "Как да upgrade-на плана си?"
   - Step-by-step визуален guide
   - Timeline: 1. Chat → 2. KYC → 3. Approval → 4. Active

5. FAQs:
   - "Какво се случва ако надвиша лимита?"
   - "Може ли временно да увелича лимита?"
   - "Как се начисляват таксите?"
   - "Има ли промоционални периоди?"

6. CTA:
   - "Изчисли моите лимити" (calculator tool)
   - "Разговаряй с експерт" (opens chat)

ДИЗАЙН:
- Professional, financial aesthetic
- Color coding: Green (Free), Blue (Premium), Purple (Business)
- Icons от Lucide или Heroicons
- Tooltips за допълнителна информация
- Comparison highlights (check marks, badges)
- Print-friendly version

ТЕХНИЧЕСКИ:
- Comparison table с sticky header при scroll
- Interactive calculator за custom scenarios
- Export to PDF functionality (optional)
- Accessibility (ARIA labels, keyboard navigation)

ИНТЕГРАЦИЯ:
- Calculator използва pricing API: /api/calculate-fees
- Upgrade button → chat bot with context
```

### Съдържание (копирай от):
`HORIZONS_FIXES/LANDING_PAGES/limits.md`

---

## 📄 СТРАНИЦА 3: /plans - Планове идження ценообразуване

### Prompt за Hostinger AI Builder:

```
Създай conversion-focused pricing page за Wallester-bg.com subscription plans.

СТРУКТУРА:
1. Hero Section:
   - Заглавие: "Избери плана, който ти подхожда"
   - Subtitle: "Гъвкави решения за всеки бизнес"
   - Toggle: Monthly / Yearly (save 20%)

2. Pricing Cards (3 колони):
   
   FREE PLAN (бял):
   - Price: 0€/месец
   - "Идеален за стартиращи"
   - Features (checkmarks):
     * 1 виртуална карта
     * €500 дневен лимит
     * Basic поддръжка
     * Dashboard достъп
     * Wallester брандиране
   - CTA: "Започни безплатно" (primary button)
   
   PREMIUM PLAN (син - POPULAR badge):
   - Price: 5€/месец (4€ yearly)
   - "Най-популярен избор"
   - All from Free +
     * 5 виртуални карти
     * €5,000 дневен лимит
     * Priority поддръжка
     * Advanced analytics
     * No branding
     * Cashback 0.5%
   - CTA: "Upgrade сега" (accent button)
   
   BUSINESS PLAN (виолетов):
   - Price: 15€/месец (12€ yearly)
   - "За професионалисти"
   - All from Premium +
     * Unlimited карти
     * €50,000 дневен лимит
     * Dedicated account manager
     * API достъп
     * Custom интеграции
     * Cashback 1%
   - CTA: "Свържи се с нас" (outline button)

3. Feature Comparison (детайлна таблица):
   - Sticky header със планове
   - Категории: Cards, Limits, Support, Features, Integrations
   - Visual checks/crosses за всяка feature
   - Collapsible sections на mobile

4. ROI Calculator:
   - Input: Брой транзакции/месец
   - Input: Средна стойност на транзакция
   - Output: Savings with Premium vs Free
   - Output: ROI breakdown (fees saved, cashback earned)
   - Chart visualization

5. Testimonials:
   - 3 карти със customer quotes
   - Photos (generic avatars)
   - Company names + role
   - Star ratings

6. FAQ:
   - "Може ли да downgrade?"
   - "Какво се случва ако отменя?"
   - "Има ли setup fees?"
   - "Приемате ли корпоративни карти?"

7. Final CTA:
   - "Не си сигурен кой план да избереш?"
   - Button: "Попитай нашия AI асистент"
   - Button: "Сравни плановете детайлно"

ДИЗАЙН:
- Modern SaaS aesthetic
- Cards с subtle shadows и hover effects
- "POPULAR" badge animация
- Color scheme: #f9fafb (base), #3b82f6 (primary), #8b5cf6 (accent)
- Monthly/Yearly toggle animation
- Mobile: vertical stacking на cards
- Loading states за calculator

ТЕХНИЧЕСКИ:
- Smooth scroll animations (AOS.js or Framer Motion)
- Price toggle с transition animation
- Calculator real-time updates
- LocalStorage за saving calculator inputs
- Analytics tracking (plan clicks, calculator usage)

ПСИХОЛОГИЯ:
- Premium план е визуално най-prominent
- Social proof (testimonials, usage stats)
- Scarcity: "20% off - yearly plans" limited time badge
- Clear value proposition за всеки план

ИНТЕГРАЦИЯ:
- Checkout flow: /api/create-subscription
- Chat bot context: передава избран план
- Email capture преди checkout
```

### Съдържание (копирай от):
`HORIZONS_FIXES/LANDING_PAGES/plans.md`

---

## 🎨 ОБЩИ ДИЗАЙН GUIDELINES

### Typography:
```css
Font Family: Inter или System-UI
Headings: 
  - H1: 48px / 3rem (bold, tight leading)
  - H2: 36px / 2.25rem (semibold)
  - H3: 24px / 1.5rem (medium)
Body: 16px / 1rem (regular, relaxed leading)
Small: 14px / 0.875rem
```

### Color Palette:
```css
Primary: #4F46E5 (Indigo-600)
Primary Hover: #4338CA (Indigo-700)
Secondary: #7C3AED (Violet-600)
Success: #10B981 (Emerald-500)
Warning: #F59E0B (Amber-500)
Error: #EF4444 (Red-500)

Neutrals:
  - Gray-50: #F9FAFB (backgrounds)
  - Gray-100: #F3F4F6 (cards)
  - Gray-600: #4B5563 (text secondary)
  - Gray-900: #111827 (text primary)
```

### Spacing System:
```
4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
(Tailwind: space-1, space-2, space-3, etc.)
```

### Animations:
```css
Transition: all 0.3s ease
Hover Scale: scale(1.02)
Button Hover: translateY(-2px) + shadow-lg
Scroll Fade: opacity 0 → 1, translateY(20px → 0)
```

---

## 📱 MOBILE RESPONSIVENESS

### Breakpoints:
```
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px
```

### Mobile Optimizations:
- Single column layout
- Larger touch targets (min 44px)
- Simplified navigation (hamburger menu)
- Sticky CTA buttons
- Optimized images (WebP format)
- Lazy loading за below-fold content

---

## ⚡ PERFORMANCE TARGETS

```yaml
Lighthouse Scores:
  Performance: 90+
  Accessibility: 95+
  Best Practices: 95+
  SEO: 100

Core Web Vitals:
  LCP: < 2.5s (Largest Contentful Paint)
  FID: < 100ms (First Input Delay)
  CLS: < 0.1 (Cumulative Layout Shift)

Load Times:
  First Paint: < 1s
  Time to Interactive: < 3s
  Total Page Size: < 500KB
```

---

## 🔗 INTEGRATIONSИИ

### Chat Bot Integration:
```html
<!-- На всяка страница -->
<button onclick="openWallesterChat()" class="cta-button">
  Разговаряй с нас
</button>

<script>
function openWallesterChat() {
  // Отваря Horizons chat bot
  window.parent.postMessage({ type: 'OPEN_CHAT' }, '*');
  
  // Analytics tracking
  gtag('event', 'chat_opened', {
    'page': window.location.pathname
  });
}
</script>
```

### Analytics Tracking:
```javascript
// Google Analytics 4
gtag('event', 'page_view', {
  'page_path': window.location.pathname,
  'page_title': document.title
});

// Button clicks
document.querySelectorAll('.cta-button').forEach(btn => {
  btn.addEventListener('click', () => {
    gtag('event', 'cta_click', {
      'button_text': btn.innerText,
      'page': window.location.pathname
    });
  });
});
```

---

## 📊 A/B TESTING SUGGESTIONS

### Варианти за тестване:
1. **Hero CTA Text:**
   - A: "Започни сега"
   - B: "Вземи безплатна карта"
   - C: "Разговаряй с AI асистент"

2. **Pricing Display:**
   - A: Monthly first
   - B: Yearly first (with savings badge)

3. **Testimonials:**
   - A: Text only
   - B: Text + photos
   - C: Video testimonials

4. **Calculator Placement:**
   - A: Above pricing cards
   - B: Below pricing cards
   - C: Separate page

---

## ✅ CHECKLIST ПРЕДИ PUBLISH

- [ ] Всички CTA бутони работят
- [ ] Chat bot integration функционира
- [ ] Forms имат validation
- [ ] Mobile view изглежда perfect
- [ ] Images са оптимизирани (WebP)
- [ ] Meta tags са попълнени (SEO)
- [ ] Open Graph tags за social sharing
- [ ] Analytics tracking е setup
- [ ] HTTPS е активиран
- [ ] 404 page е създадена
- [ ] Privacy policy & Terms of Service links
- [ ] Cookie consent banner (GDPR)
- [ ] Page load time < 3s
- [ ] No console errors
- [ ] Cross-browser tested (Chrome, Firefox, Safari)

---

**Готово за Hostinger AI Builder!** Копирай prompt-а за всяка страница и paste в AI Builder. Adjust според нужда.
