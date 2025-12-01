# Останали Задачи - TODO List

## 🚨 КРИТИЧНИ (Трябва да се направят веднага)

### 1. ❌ Deploy на registry_check fix в Supabase
**Статус**: Кодът е готов, но НЕ е deploy-нат в production
**Действие**: 
- Отвори Supabase Dashboard → Edge Functions → registry_check
- Deploy new version
- Copy-paste от `supabase/functions/registry_check/index.ts`
**Тестване**: Test с "Иван Христев Димитров" - трябва да върне match_count > 0

### 2. ✅ Поправка на "Вход" бутона в чата (DOCUMENTED)
**Проблем**: Когато user с съществуващ email опита да се регистрира:
- Чатът пише: "Такъв профил вече съществува. Може би искаш да влезеш в него?"
- Показва бутон "Вход"
- Кликнеш бутона → **НИЩО НЕ СЕ СЛУЧВА** ❌

**Root Cause**: НАМЕРЕНА!
- Файл: `horizons/src/hooks/useChatLogic.js`
- Липсва handler за "Вход" button в option handlers (line ~98)
- Липсва case за `profileExists` step в switch statement

**Solution**: Виж `FIX_VHOD_BUTTON.md` за пълна документация и код
**Status**: Документирано - нужна имплементация в Horizons проекта
**Priority**: HIGH - broken UX за returning users

---

## 🔧 ВАЖНИ (Трябва да се направят скоро)

### 3. ⏳ Email validation съобщения 
**Issue**: invalidEmail съобщение работи, но трябва да се провери дали работи правилно
**Статус**: Маркирано като "working" в checklist-а

### 4. ⏳ Registry check Edge Function deployment
**Issue**: Новият код е в GitHub, но не е deployed в Supabase
**Приоритет**: Висок - без това registry checks връщат 0 companies!

### 5. ⏳ Финализация на workflow
**Issue**: Има маркирани като fixed, но трябва end-to-end тестване
**Файлове**: 
- `DEPLOY_WORKFLOW_FIX.md`
- `DEPLOY_WORKFLOW_FIX_V2.md`

---

## 📋 СРЕДНИ (Може да почакат малко)

### 6. ⏳ Гладко преминаване между стъпки в чата
**Issue**: Маркирано като done, но трябва да се провери
**Тестване**: Пълен workflow от начало до край

### 7. ⏳ Без замразяване в чата
**Issue**: Marked as done but needs verification

### 8. ⏳ Code review и clean up
**Действие**: 
- Изтрий `test_relationships_api.mjs` (debug script)
- Clean up временни файлове
- Review на всички `.md` документи

---

## 🎯 PRODUCTION ГОТОВНОСТ

### 9. ⏳ Готово за production
**Checklist**:
- [ ] Registry check deployed в Supabase
- [ ] "Вход" бутон работи
- [ ] Email validation работи
- [ ] End-to-end тест на целия workflow
- [ ] Всички Zapier references работят
- [ ] Чист код без debug logs
- [ ] Verified owners migration deployed

### 10. ⏳ Тестване на production
**Plan**:
- Deploy всички edge functions
- Test с реални users
- Monitor logs за грешки
- Verify user flow from registration to card issuance

---

## 📊 СТАТУС ПРЕГЛЕД

### ✅ ЗАВЪРШЕНИ:
- ✅ Email validation логика
- ✅ Registry check fix (в код, НО не е deployed!)
- ✅ Legal form matching fix
- ✅ Git commit & push в GitHub
- ✅ Документация създадена
- ✅ invalidName съобщение работи
- ✅ Директно извикване в БД

### 🔄 В ПРОЦЕС:
- 🔄 Registry check Edge Function deployment
- 🔄 "Вход" бутон fix

### ❌ НЕ СА ЗАПОЧНАТИ:
- ❌ Production deployment на всички промени
- ❌ End-to-end тестване
- ❌ Final QA

---

## 🚀 СЛЕДВАЩИ СТЪПКИ (По приоритет)

1. **ВЕДНАГА**: Поправка на "Вход" бутона в чата
2. **ВЕДНАГА**: Deploy registry_check в Supabase
3. **СКОРО**: End-to-end test на целия workflow
4. **СКОРО**: Production deployment checklist
5. **СЛЕД ТОВА**: Code cleanup и final review

---

## 📝 БЕЛЕЖКИ

### Registry Check Issue (FIXED но не deployed):
- **Root cause**: Legal form matching търсеше само "еоод"/"ет"
- **Fix**: Добавен check за "еднолично дружество" и "едноличен търговец"
- **Test result**: ✅ Работи локално
- **Deploy status**: ❌ НЕ е deployed в Supabase production

### "Вход" Button Issue (NEEDS FIX):
- **Symptom**: Button visible but не прави нищо при click
- **Possible causes**:
  - Missing event listener
  - Wrong button ID/class
  - JavaScript error preventing action
  - Missing login handler function

---

**Последна актуализация**: 2025-12-01 18:33
**Следваща ревизия**: След fix на "Вход" бутона
