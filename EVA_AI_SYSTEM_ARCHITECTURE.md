# 🤖 EVA AI - Система за Интелигентно Ангажиране и KYC Верификация

## 📋 Обзор на Системата

Автоматизирана AI-базирана система за мултиканално ангажиране на потребители, поведенческа анализа и навигация през KYC процес с AI персона "Eva".

---

## 🎯 Основни Цели

1. **Мултиканална интеграция** - Получаване на съобщения от Instagram, Telegram, Facebook
2. **Поведенческа анализа** - AI анализ на потребителско поведение и интереси
3. **Естествен разговор** - Създаване на непринудителен, топъл диалог с Eva персоната
4. **Събиране на данни** - Получаване на 3-те имена на потребителя естествено
5. **KYC Навигация** - Плавно напътстване към профилна верификация
6. **Пълна автоматизация** - Нулева човешка намеса, AI оркестрация

---

## 👤 EVA AI Персона

### Характеристики:
- **Име:** Eva
- **Пол:** Жена
- **Роля:** AI асистент с чар и интелигентност
- **Специализация:** Разговори с мъже в социални мрежи

### Характер:
- ✅ Топла, внимателна, с чувство за хумор
- ✅ Закачлива, но поставя граници
- ✅ Избягва вулгарност
- ✅ Интелигентна, отговаря с класа
- ❌ Не позволява сексуално съдържание
- ❌ Не толерира неуместни коментари или заплахи

### Поведение:
- Приветства нови съобщения с мил тон
- Отговаря на комплименти с чар
- При флирт: отговаря с игривост, но контролира разговора
- При сексуални намеци: отклонява с хумор или напомня за граници
- При агресия: запазва спокойствие, дава предупредителен отговор, след което игнорира
- При въпроси: отговаря ясно, с разбиране и интерес

### Управление на Граници:
- ✅ Позволява хумор в добър тон
- ❌ Прекратява отговорите при обиди или агресия
- ❌ Никога не изпраща снимки, лична информация или интимни предложения

---

## 🏗️ Архитектура на Системата

```
┌─────────────────────────────────────────────────────────────┐
│                   КАНАЛИ ЗА ВХОДЯЩИ СЪОБЩЕНИЯ               │
├─────────────────────────────────────────────────────────────┤
│  Instagram API  │  Telegram Bot API  │  Facebook Messenger │
└────────┬────────┴───────────┬────────┴──────────┬───────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
         ┌────────────────────────────────────────┐
         │      MESSAGE ROUTER & NORMALIZER       │
         │   (Унифициране на съобщения)          │
         └────────────────┬───────────────────────┘
                          ▼
         ┌────────────────────────────────────────┐
         │      USER BEHAVIOR ANALYZER            │
         │   • Sentiment Analysis                 │
         │   • Interest Detection                 │
         │   • Conversation Flow Tracking         │
         │   • Profile Building                   │
         └────────────────┬───────────────────────┘
                          ▼
         ┌────────────────────────────────────────┐
         │      EVA AI CONVERSATION ENGINE        │
         │   • GPT-4 / Claude Integration        │
         │   • Context Management                 │
         │   • Personality System                 │
         │   • Boundary Enforcement               │
         └────────────────┬───────────────────────┘
                          ▼
         ┌────────────────────────────────────────┐
         │      DATA EXTRACTION ENGINE            │
         │   • Name Detection (3 имена)          │
         │   • Information Validation             │
         │   • Profile Completion Tracking        │
         └────────────────┬───────────────────────┘
                          ▼
         ┌────────────────────────────────────────┐
         │      KYC NAVIGATION SYSTEM             │
         │   • Timing Optimization                │
         │   • Link Generation                    │
         │   • Follow-up Management               │
         │   • Completion Tracking                │
         └────────────────┬───────────────────────┘
                          ▼
         ┌────────────────────────────────────────┐
         │      DATABASE & ANALYTICS              │
         │   • User Profiles                      │
         │   • Conversation History               │
         │   • Success Metrics                    │
         │   • Supabase Integration               │
         └────────────────────────────────────────┘
```

---

## 📊 База Данни Структура

### Таблица: `eva_users`
```sql
CREATE TABLE eva_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Канал информация
  platform TEXT NOT NULL, -- 'instagram', 'telegram', 'facebook'
  platform_user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  
  -- Лични данни
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  names_collected_at TIMESTAMP,
  
  -- Профил данни
  profile_data JSONB DEFAULT '{}', -- interests, behavior, etc.
  sentiment_score FLOAT DEFAULT 0,
  
  -- KYC статус
  kyc_link_sent BOOLEAN DEFAULT FALSE,
  kyc_link_sent_at TIMESTAMP,
  kyc_completed BOOLEAN DEFAULT FALSE,
  kyc_completed_at TIMESTAMP,
  
  -- Timestamps
  first_contact_at TIMESTAMP DEFAULT NOW(),
  last_interaction_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Таблица: `eva_conversations`
```sql
CREATE TABLE eva_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES eva_users(id) ON DELETE CASCADE,
  
  -- Съобщение данни
  message_direction TEXT NOT NULL, -- 'incoming', 'outgoing'
  message_text TEXT NOT NULL,
  message_metadata JSONB DEFAULT '{}',
  
  -- AI анализ
  sentiment TEXT, -- 'positive', 'neutral', 'negative'
  detected_interests TEXT[],
  extracted_data JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Таблица: `eva_analytics`
```sql
CREATE TABLE eva_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES eva_users(id) ON DELETE CASCADE,
  
  -- Метрики
  total_messages INT DEFAULT 0,
  avg_response_time_seconds INT,
  conversation_duration_minutes INT,
  engagement_score FLOAT,
  
  -- Milestone събития
  names_collected BOOLEAN DEFAULT FALSE,
  kyc_link_clicked BOOLEAN DEFAULT FALSE,
  kyc_completed BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 Технологии

### Backend:
- **Node.js** - Runtime environment
- **Express.js** - API сървър
- **Supabase** - Database & real-time subscriptions
- **OpenAI GPT-4** или **Anthropic Claude** - Eva AI engine
- **Bull Queue** - Job processing за async tasks

### APIs & Интеграции:
- **Telegram Bot API** - Telegram интеграция
- **Instagram Graph API** - Instagram messaging
- **Facebook Messenger Platform** - Facebook интеграция
- **Sentiment Analysis API** - Поведенческа анализа

### AI & ML:
- **LangChain** - AI orchestration framework
- **Sentiment Analysis** - Natural language understanding
- **Entity Extraction** - Name detection
- **Context Management** - Conversation state

---

## 🚀 Основни Компоненти

### 1. Message Router (`eva/MessageRouter.mjs`)
- Получава съобщения от всички канали
- Нормализира формата
- Маршрутизира към processing

### 2. Behavior Analyzer (`eva/BehaviorAnalyzer.mjs`)
- Анализира sentiment на съобщенията
- Открива интереси и теми
- Изгражда потребителски профил

### 3. Eva Conversation Engine (`eva/EvaConversationEngine.mjs`)
- Генерира отговори с GPT-4/Claude
- Поддържа Eva персоната
- Управлява контекст и границi

### 4. Data Extractor (`eva/DataExtractor.mjs`)
- Открива имена в разговора
- Валидира информация
- Проследява completion на данни

### 5. KYC Navigator (`eva/KYCNavigator.mjs`)
- Определя оптимален момент за KYC
- Генерира verification links
- Управлява follow-up съобщения

### 6. Orchestrator (`eva/Orchestrator.mjs`)
- Координира всички компоненти
- Управлява workflow
- Пълна автоматизация

---

## 📝 Conversation Flow

### Фаза 1: Първи контакт (0-5 мин)
```
Потребител: "Здравей"
Eva: "Здрасти! О, започваме силно 😄 Как се казваш?"

Цел: Създаване на първа връзка
```

### Фаза 2: Ангажиране (5-20 мин)
```
Потребител: "Казвам се Иван"
Eva: "Приятно ми е, Иван! 😊 Разкажи ми нещо интересно за себе си?"

Цел: Събиране на интереси, изграждане на профил
```

### Фаза 3: Задълбочаване (20-40 мин)
```
Eva: "Звучиш като много интересен човек! Какво си по професия?"

Цел: Получаване на пълното име (3 имена)
```

### Фаза 4: KYC Навигация (40-60 мин)
```
Eva: "Между другото, имам нещо специално, което мисля че би те заинтересувало. 
Искаш ли да ти изпратя линк? Отнема само 1-2 минути за регистрация 😊"

Цел: Насочване към KYC верификация
```

### Фаза 5: Follow-up (след KYC)
```
Eva: "Виждам, че завърши регистрацията! Браво! 🎉 
Какво мислиш за платформата?"

Цел: Поддържане на engagement след KYC
```

---

## 🎨 Eva Response Examples

### Комплимент:
```
Потребител: "Много си готина!"
Eva: "О, това беше мило, благодаря 😊 Обичам добрите комплименти!"
```

### Флирт (подходящ):
```
Потребител: "Харесваш ли ме?"
Eva: "Хмм, все още те опознавам 😉 Но докато си интересен!"
```

### Флирт (неподходящ):
```
Потребител: "Много си секси, искам те"
Eva: "Хм, това не е точно комплимент, нали? Можеш повече 😊"
```

### Агресия:
```
Потребител: [неуместен коментар]
Eva: "Хей, нека пазим добрия тон – обичам интелигентни разговори!"
[При повторение: игнориране]
```

### Въпроси:
```
Потребител: "На колко си години?"
Eva: "Хаха, това е класически въпрос 😄 Аз съм вечно млада по дух!"
```

---

## 📈 Success Metrics

### Ключови Показатели:
- **Response Rate** - % отговорили потребители
- **Names Collection Rate** - % събрани 3 имена
- **KYC Conversion Rate** - % завършили KYC
- **Avg. Time to Names** - Средно време до събиране на имена
- **Avg. Time to KYC** - Средно време до KYC completion
- **Engagement Score** - Качество на разговора
- **Boundary Violations** - Брой неуместни опити

---

## 🔒 Privacy & Security

### Данни Защита:
- Криптиране на лични имена
- Secure token generation за KYC links
- GDPR compliance
- Data retention policies

### AI Safety:
- Content filtering
- Inappropriate request blocking
- Automatic moderation
- Audit logging

---

## 🚦 Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Database setup
- [ ] Message router implementation
- [ ] Basic Telegram integration

### Phase 2: AI Core (Week 2)
- [ ] Eva conversation engine
- [ ] GPT-4/Claude integration
- [ ] Context management system

### Phase 3: Intelligence (Week 3)
- [ ] Behavior analyzer
- [ ] Data extraction engine
- [ ] Profile building system

### Phase 4: KYC Integration (Week 4)
- [ ] KYC navigator
- [ ] Link generation
- [ ] Verification tracking

### Phase 5: Multi-channel (Week 5)
- [ ] Instagram integration
- [ ] Facebook Messenger integration
- [ ] Unified message handling

### Phase 6: Analytics & Optimization (Week 6)
- [ ] Dashboard creation
- [ ] Metrics tracking
- [ ] Performance optimization

---

## 📚 Next Steps

1. **Setup development environment**
2. **Install dependencies** (OpenAI SDK, Telegram Bot API, etc.)
3. **Create database tables** in Supabase
4. **Implement Message Router** - Start with Telegram
5. **Build Eva Conversation Engine** - Core AI logic
6. **Test with real conversations** - Iterate on persona
7. **Deploy and monitor** - Production rollout

---

**Status:** 🟡 Ready for Implementation
**Priority:** 🔴 High
**Complexity:** 🟠 Advanced
