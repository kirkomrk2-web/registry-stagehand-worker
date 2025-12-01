#Fix: "Вход" Button Not Working

## Problem

Когато user с съществуващ email опита да се регистрира:
- Чатът показва: "Такъв профил вече съществува. Може би искаш да влезеш в него?"
- Показва бутон "Вход"
- При клик на бутона → **НИЩО НЕ СЕ СЛУЧВА** ❌

## Root Cause

**Файл**: `horizons/src/hooks/useChatLogic.js`

### Проблем 1: Липсва Handler за "Вход" Button

В код на ред ~98-111 има handlers за различни buttons:
```javascript
if (["Създай профил", "Покани и спечели 35€", "Условия и лимити", "More About Limits"].includes(userInput)) {
    // ... handlers for these buttons
}
```

**НО ЛИПСВА "Вход"!** ❌

### Проблем 2: Няма Case за profileExists Step

В `switch(step)` statement (ред ~130+):
- Има cases за: `startRegistration`, `patronymicName`, `lastName`, `birthDate`, `email`, `finalizing`
- **ЛИПСВА case за `profileExists`** ❌

Когато user кликне "Вход":
1. `userInput` = "Вход"
2. `step` = "profileExists"
3. Няма handler → default case → fallback message или нищо

## Solution

### Fix 1: Add "Вход" Button Handler

**Location**: В началото на `handleConversationFlow`, заедно с другите option handlers

**Code to Add** (преди line ~98):
```javascript
// Handle "Вход" button for existing users
if (userInput === "Вход" && step === 'profileExists') {
    // Get the user's email from session
    const email = userData.email;
    
    if (email) {
        // Generate magic link or redirect to login
        addMessage("user", "Вход");
        simulateTyping(() => {
            addBotMessage({
                text: `За да влезете с ${email}, моля проверете вашия имейл за линк за вход. Ако нямате имейл, свържете се с екипа ни.`,
                options: [
                    { text: "Контакти", icon: "Mail" }
                ]
            });
        });
        
        // TODO: Implement actual login logic
        // Option 1: Send magic link via Supabase Auth
        // Option 2: Redirect to login page
        // Option 3: Show contact information
    } else {
        // Fallback if email is missing
        addBotMessage({
            text: "Моля, въведете вашия имейл за да продължите с влизането.",
            input: { type: "email", placeholder: "your@email.com" }
        });
        updateSession({ step: 'loginEmail' });
    }
    return;
}
```

### Fix 2: Add Case for Login Email (Optional)

Ако ще имплементираш пълен login flow:

```javascript
case 'loginEmail': {
    const validation = validateEmail(userInput);
    if (!validation.isValid) {
        addBotMessage(getAgentResponse('invalidEmail'));
        return;
    }
    
    // Check if user exists
    const { data: user } = await supabase
        .from('users_pending')
        .select('*')
        .eq('email', validation.email)
        .maybeSingle();
    
    if (user) {
        // Send magic link
        addBotMessage({
            text: `Изпратихме линк за вход на ${validation.email}. Моля, проверете имейла си.`,
            options: null
        });
        updateSession({ step: 'loginSent', userData: { ...userData, email: validation.email } });
    } else {
        addBotMessage({
            text: "Не намерихме профил с този имейл. Искате ли да създадете нов профил?",
            options: [
                { text: "Създай профил", icon: "UserPlus" },
                { text: "Опитай друг имейл", icon: "Mail" }
            ]
        });
    }
    break;
}
```

## Implementation Steps

### Minimal Fix (Quick):
1. Add "Вход" button handler в `handleConversationFlow`
2. Show message with contact info или instructions
3. **Не изисква Supabase Auth** - just informational

### Full Fix (Complete):
1. Add "Вход" button handler
2. Implement Supabase Auth magic link
3. Add loginEmail case
4. Test full login flow

## Testing

### Test Case 1: Existing Email
1. Start chat
2. Enter име, презиме, фамилия
3. Enter дата на раждане
4. Enter **existing** email (one that's already in users_pending)
5. Should see: "Такъв профил вече съществува..."
6. Click "Вход" button
7. **Expected**: Should see login instructions, НЕ fallback message

### Test Case 2: New Email
1. Same as above but with new email
2. Should continue with normal flow

## Files to Modify

1. **`horizons/src/hooks/useChatLogic.js`**
   - Add "Вход" handler (line ~98)
   - Optionally add loginEmail case

2. **`horizons/src/lib/agents.js`** (Optional)
   - Add loginSent response
   - Add loginEmail response

## Priority

**HIGH** - User experience is broken for returning users

## Related Issues

- Users cannot log in if they already registered
- "Вход" button appears but does nothing
- Frustrating UX - looks like a bug

---

**Created**: 2025-12-01  
**Status**: DOCUMENTED - NEEDS IMPLEMENTATION  
**Owner**: Horizons Frontend Team
