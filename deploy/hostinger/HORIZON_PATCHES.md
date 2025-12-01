# Horizon AI Builder – Copy/Paste Patches (Unobtrusive Contacts, Fallback, Validation, Anti‑duplicate)

Use these patches with your current codebase to preserve your startup flow (random agent, avatars from AGENT_CONFIG) while adding:
- Per‑agent contacts (Telegram + Email)
- Subtle contact drawer that appears after the "we will get back soon" type messages
- 15–20 minute fallback reminder
- Close confirmation with contacts so the user can save them
- Anti‑duplicate bot message guard
- Relaxed name validation (Latin or Cyrillic)
- Polite error path when registry/email steps fail

Follow the 3 edits below.

---
## 1) src/lib/agents.js – Add contacts to each agent (keep avatars as is)

Find the AGENT_CONFIG export and append a `contact` object to each entry. Example:

```diff
 export const AGENT_CONFIG = {
   "Моника": {
     avatarUrl: "https://horizons-cdn.hostinger.com/00fb9e89-7859-4de2-8701-7ef551e275a4/06696e280a22c07bcede83d1517792de.jpg",
+    contact: {
+      email: "support@yourdomain.com",
+      telegram: { handle: "@monika_support", url: "https://t.me/monika_support" }
+    },
     responses: baseResponses,
   },
   "Мария": {
     avatarUrl: "https://horizons-cdn.hostinger.com/00fb9e89-7859-4de2-8701-7ef551e275a4/1a68e650efa5747c35b6f70aea136c33.jpg",
+    contact: {
+      email: "support@yourdomain.com",
+      telegram: { handle: "@maria_support", url: "https://t.me/maria_support" }
+    },
     responses: baseResponses,
   },
   // Repeat similarly for Петя, Кристин, Рая, Виктория, Стефани, Йоана
 }
```

Notes:
- If желаеш уникален email per agent, смени contact.email съответно.
- Ако нямаш Telegram за всички, можеш да оставиш един общ handle (напр. @brand_support).

---
## 2) src/lib/utils.js – Accept Latin or Cyrillic names

In `validateName()`, replace the Cyrillic‑only regex с Unicode letter class:

```diff
-  const nameRegex = /^[А-Яа-я\s\-']+$/u;
+  const nameRegex = /^[\p{L}\s\-']+$/u; // allow letters from any script (Latin, Cyrillic, etc.)
```

Запази останалата логика (nameMap, две имена когато requireTwoParts=true и т.н.).

---
## 3) src/components/ChatWidget.jsx – Contacts drawer + fallback + close confirm + anti‑duplicate

Add new state/refs near existing hooks at the top:

```diff
 import React, { useState, useEffect, useRef, useCallback } from 'react';
@@
 const messagesEndRef = useRef(null);
 const inputRef = useRef(null);
+
+// Contacts + fallback state
+const [contactOpen, setContactOpen] = useState(false);
+const [showContactBell, setShowContactBell] = useState(false);
+const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
+const fallbackTimerRef = useRef(null);
+const lastBotMsgRef = useRef(null); // anti-duplicate
+
+const clearFallbackTimer = () => {
+  if (fallbackTimerRef.current) {
+    clearTimeout(fallbackTimerRef.current);
+    fallbackTimerRef.current = null;
+  }
+};
+
+const startFallbackTimer = (minutes = 15) => {
+  clearFallbackTimer();
+  fallbackTimerRef.current = setTimeout(() => {
+    addBotMessage('За Ваше удобство, ако все още не сме се свързали, можете да ни пишете директно в Telegram или по имейл. На разположение сме по всяко време.');
+    setContactOpen(true);
+    setShowContactBell(true);
+  }, Math.max(1, minutes) * 60 * 1000);
+};
```

Wrap `addBotMessage` to avoid duplicates. Replace its definition with:

```diff
-  const addBotMessage = useCallback((response) =>
-      addMessage('bot', response.text, { options: response.options, input: response.input })
-  , [addMessage]);
+  const addBotMessage = useCallback((response) => {
+    const text = typeof response === 'string' ? response : response.text;
+    if (!text) return;
+    if (lastBotMsgRef.current && lastBotMsgRef.current.text === text) return; // anti-duplicate
+    lastBotMsgRef.current = { text };
+    return addMessage('bot', text, { options: response?.options, input: response?.input });
+  }, [addMessage]);
```

Detect the “we will get back soon” moment to show contacts and start the timer. Add below your hooks/effects:

```jsx
const SOON_TRIGGERS = [
  'ще се свържем съвсем скоро',
  'скоро ще върнем отговор',
  'ще получите линк',
  'we will get back',
  'soon'
];

useEffect(() => {
  const latest = messages[messages.length - 1];
  if (!latest || latest.sender !== 'bot') return;
  const t = (latest.text || '').toLowerCase();
  if (SOON_TRIGGERS.some(s => t.includes(s))) {
    setShowContactBell(true);
    setContactOpen(true);
    setTimeout(() => setContactOpen(false), 6000); // brief, unobtrusive
    startFallbackTimer(15); // set to 20 if desired
  }
}, [messages]);

// Optional: cancel pending fallback on any other bot activity
useEffect(() => {
  const latest = messages[messages.length - 1];
  if (latest?.sender === 'bot' && latest?.text) {
    const low = latest.text.toLowerCase();
    if (!SOON_TRIGGERS.some(s => low.includes(s))) clearFallbackTimer();
  }
}, [messages]);
```

Show contact bell + drawer inside the footer container (absolute‑positioned in the same wrapper where the input is):

```jsx
{/* Contact bell */}
{showContactBell && (
  <button
    onClick={() => setContactOpen(v => !v)}
    className="absolute right-4 -top-4 w-7 h-7 rounded-full bg-black/40 border border-green-500/30 text-green-400 text-sm flex items-center justify-center"
    aria-label="Контакти"
  >
    🔔
  </button>
)}

{/* Contact drawer */}
{contactOpen && (
  <div className="absolute right-4 -top-40 w-64 rounded-xl border border-green-500/20 bg-[#0F0F0F] shadow-xl p-3 text-sm">
    <div className="font-medium text-white mb-1">Ако до 15–20 мин няма отговор</div>
    <div className="flex items-center gap-2 text-green-400">
      <span>💬</span>
      <a href={(AGENT_CONFIG[session.agentName]?.contact?.telegram?.url)||'#'} target="_blank" rel="noreferrer">
        {(AGENT_CONFIG[session.agentName]?.contact?.telegram?.handle)||'@support'}
      </a>
    </div>
    <div className="flex items-center gap-2 text-green-400 mt-1">
      <span>📨</span>
      <a href={`mailto:${(AGENT_CONFIG[session.agentName]?.contact?.email)||'support@yourdomain.com'}`}>
        {(AGENT_CONFIG[session.agentName]?.contact?.email)||'support@yourdomain.com'}
      </a>
    </div>
    <div className="text-xs text-slate-400 mt-2">Агентката е на разположение по всяко време. Тези данни ще останат видими.</div>
  </div>
)}
```

Intercept the Close (X) button and show a confirmation modal with the contacts:

```diff
-  <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:bg-slate-700/50 hover:text-white">
+  <Button variant="ghost" size="icon" onClick={() => setCloseConfirmOpen(true)} className="text-slate-400 hover:bg-slate-700/50 hover:text-white">
     <X className="w-5 h-5" />
   </Button>
```

Add the modal near the end of the component (e.g., inside footer parent or as sibling):

```jsx
{closeConfirmOpen && (
  <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
    <div className="bg-[#0F0F0F] border border-green-500/20 rounded-xl p-4 w-[90%] max-w-md">
      <h3 className="text-white font-semibold">Преди да затворите</h3>
      <p className="text-sm text-slate-300 mt-2">Запишете контактите на агентката:</p>
      <div className="mt-3 text-green-400 text-sm">
        <div className="flex gap-2 items-center"><span>📨</span><a href={`mailto:${AGENT_CONFIG[session.agentName]?.contact?.email||'support@yourdomain.com'}`}>{AGENT_CONFIG[session.agentName]?.contact?.email||'support@yourdomain.com'}</a></div>
        <div className="flex gap-2 items-center mt-1"><span>💬</span><a target="_blank" rel="noreferrer" href={AGENT_CONFIG[session.agentName]?.contact?.telegram?.url||'#'}>{AGENT_CONFIG[session.agentName]?.contact?.telegram?.handle||'@support'}</a></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button className="px-3 py-2 rounded-md bg-slate-800 text-white" onClick={() => setCloseConfirmOpen(false)}>Назад</button>
        <button className="px-3 py-2 rounded-md bg-green-600 text-black" onClick={() => { setCloseConfirmOpen(false); setShowContactBell(true); setIsChatOpen(false); }}>Затвори</button>
      </div>
    </div>
  </div>
)}
```

Finally, show contacts on failure of registry/email steps. Inside `handleConversationFlow` where you `await sendToSupabase(...)` and `await checkRegistry(...)`, wrap with try/catch:

```diff
-                // 1. Save to Supabase (replaces Zapier)
-                await sendToSupabase({
+                // 1. Save to Supabase (replaces Zapier)
+                try {
+                  await sendToSupabase({
                     first_name: finalUserData.firstName,
                     middle_name: finalUserData.patronymicName,
                     last_name: finalUserData.lastName,
                     full_name: fullName,
                     email: finalUserData.email,
                     birth_date: finalUserData.birthDate,
-                });
-
-                // 2. Check Registry & Send Email (Hostinger Email Action)
-                await checkRegistry({
-                    full_name: fullName,
-                    email: finalUserData.email
-                });
+                  });
+
+                  // 2. Check Registry & Send Email (Hostinger Email Action)
+                  const res = await checkRegistry({ full_name: fullName, email: finalUserData.email });
+                  if (!res?.success) {
+                    addBotMessage('В момента има временен проблем със системата. Ще ви пишем по имейл веднага щом завършим проверката.');
+                    setShowContactBell(true); setContactOpen(true); startFallbackTimer(15);
+                  }
+                } catch (e) {
+                  addBotMessage('В момента има временен проблем със системата. Ще ви пишем по имейл веднага щом завършим проверката.');
+                  setShowContactBell(true); setContactOpen(true); startFallbackTimer(15);
+                }
```

---
## Test checklist
- Стартиране: името и аватарът идват от AGENT_CONFIG; контактите от `agent.contact`.
- След „Благодаря… ще се свържем скоро“: контактният drawer се показва за кратко, появява се малка камбанка.
- След 15 мин (за тест: 1 мин): показва се деликатно напомняне и drawer отново.
- Затваряне (X): модален прозорец с контактите; при „Затвори“ – чатът се скрива, камбанката остава.
- Валидирация: имена на латиница вече минават (Ivan Petrov). Грешни случаи показват текущите ви съобщения.
- Грешка от API: виждаш учтиво съобщение и контактите.

Done. Copy these diffs in Horizon AI Builder tasks. If Horizon prefers explicit line numbers, provide the files and it can search by the shown snippets (add/replace).
