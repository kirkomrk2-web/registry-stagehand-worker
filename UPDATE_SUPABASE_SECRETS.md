# 🔑 UPDATE SUPABASE SECRETS (СПЕШНО!)

## Проблемът:
Edge Functions използват СТАРИ API keys от environment variables.
Грешката е: `"Unregistered API key"`

## РЕШЕНИЕТО (3 СТЪПКИ):

### Стъпка 1: Копирай НОВИЯ service_role key
```
1. Отвори: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/settings/api
2. Намери секция "Project API keys"
3. Копирай "service_role" key (SECRET бутон → Copy)
```

### Стъпка 2: Update Secrets за Edge Functions
```
1. Отвори: https://supabase.com/dashboard/project/ansiaiuaygcfztabtknl/functions
2. Кликни на "Manage secrets" (или Settings → Edge Functions)
3. Намери "SUPABASE_SERVICE_ROLE_KEY"
4. Edit и замести със НОВИЯ key от Стъпка 1
5. Save
```

**ВАЖНО:** Може да има 2 места където трябва да update-неш:
- Project-level secrets (за всички functions)
- Function-specific secrets (само за registry_check)

Update-ни на двете места за сигурност!

### Стъпка 3: Redeploy registry_check
```bash
npx supabase functions deploy registry_check --project-ref ansiaiuaygcfztabtknl
```

### Стъпка 4: Тествай отново
```bash
SUPABASE_SERVICE_ROLE_KEY="NEW_KEY" node test_complete_workflow.mjs
```

---

## Алтернативно решение (по-бързо):

Ако не можеш да намериш Secrets панела, можеш да hardcode-неш key-а временно:

### TEMPORARY FIX (hardcode в код):
Отвори `supabase/functions/registry_check/index.ts` и промени реда:

```typescript
// ПРЕДИ:
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// СЛЕД:
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuc2lhaXVheWdjZnp0YWJ0a25sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzA2ODY2OSwiZXhwIjoyMDc4NjQ0NjY5fQ.uAy4O9560idXOE6kAudCGYwC3K5ypPngZsbe7e3tWBA";
```

След това:
```bash
npx supabase functions deploy registry_check --project-ref ansiaiuaygcfztabtknl
node test_complete_workflow.mjs
```

⚠️ **ВНИМАНИЕ:** Hardcode-ването НЕ е best practice, но ще проработи временно!

---

**СЕГА направи това и тествай отново!** 🚀
