Horizon AI Builder – Task Brief: Chat Agent UX improvements (contacts + fallback + validation)

Goal
Implement unobtrusive contact sharing (Telegram + Email) and a 15–20 minute fallback reminder inside the existing React chat system, preserve current startup (random agent, avatars from AGENT_CONFIG), and relax name validation to accept Latin or Cyrillic. Add graceful error handling on registry/email steps and avoid duplicate bot messages.

Scope
Files referenced below come from the site you shared:
- src/lib/agents.js
- src/lib/utils.js
- src/components/ChatWidget.jsx
- src/components/ChatbotLoader.jsx (no code change needed; keep as-is)
- src/hooks/useRegistryCheck.js (only text changes handled inside ChatWidget)

Deliverables (what to implement)
1) Extend AGENT_CONFIG with contacts
2) Relax name validation in utils.js to support both Cyrillic and Latin
3) Add unobtrusive contact drawer + 15–20 min fallback timer in ChatWidget
4) Add close-confirmation panel that displays contacts before exit
5) Add anti-duplicate bot-message guard
6) On API errors (registry/email), show polite message and surface contacts

Implementation Details

1) src/lib/agents.js – add contact data and keep avatars intact
- Keep baseResponses as-is. Augment AGENT_CONFIG entries with contact object.

PATCH (append contact to each agent entry):
"""
export const AGENT_CONFIG = {
  "Моника": {
    avatarUrl: "https://horizons-cdn.hostinger.com/.../06696e280a22c07bcede83d1517792de.jpg",
    contact: {
      email: "support@yourdomain.com",
      telegram: { handle: "@monika_support", url: "https://t.me/monika_support" }
    },
    responses: baseResponses,
  },
  "Мария": {
    avatarUrl: "https://horizons-cdn.hostinger.com/.../1a68e650efa5747c35b6f70aea136c33.jpg",
    contact: {
      email: "support@yourdomain.com",
      telegram: { handle: "@maria_support", url: "https://t.me/maria_support" }
    },
    responses: baseResponses,
  },
  // ... repeat for the other agents (Петя, Кристин, Рая, Виктория, Стефани, Йоана)
};
"""

Notes:
- If you prefer agent-specific emails, set contact.email per agent; else reuse a single shared address.

2) src/lib/utils.js – relax name validation to allow Latin or Cyrillic
- Replace the current Cyrillic-only regex with a Unicode letter class.

REPLACE validateName() regex line:
"""
// Before: const nameRegex = /^[А-Яа-я\s\-']+$/u;
const nameRegex = /^[\p{L}\s\-']+$/u; // allow letters in any script (Latin, Cyrillic, etc.)
"""

Keep the rest of the function intact. This accepts both кирилица and латиница, preserves your nameMap normalization, and keeps the two-part rule when requireTwoParts=true.

3) src/components/ChatWidget.jsx – unobtrusive contacts + fallback timer + close confirm
Add state and helpers:
"""
// Add near other useState/useRef hooks
const [contactOpen, setContactOpen] = useState(false);
const [showContactBell, setShowContactBell] = useState(false);
const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
const fallbackTimerRef = useRef(null);
const lastBotMsgRef = useRef(null); // anti-duplicate

const clearFallbackTimer = () => {
  if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
};

const startFallbackTimer = (minutes = 15) => {
  clearFallbackTimer();
  fallbackTimerRef.current = setTimeout(() => {
    addBotMessage({ text: 'За Ваше удобство, ако все още не сме се свързали, можете да ни пишете директно в Telegram или по имейл. На разположение сме по всяко време.' });
    setContactOpen(true);
    setShowContactBell(true);
  }, Math.max(1, minutes) * 60 * 1000);
};
"""

Detect the "we will get back soon" moment and open the contact drawer briefly:
"""
const SOON_TRIGGERS = [
  'ще се свържем съвсем скоро', 'скоро ще върнем отговор', 'ще получите линк',
  'we will get back', 'soon'
];

// Wrap addBotMessage to avoid duplicates and trigger contacts
const addBotMessage = useCallback((response) => {
  const text = typeof response === 'string' ? response : response.text;
  if (lastBotMsgRef.current && lastBotMsgRef.current.text === text) return; // anti-duplicate
  lastBotMsgRef.current = { text };
  return addMessage('bot', text, { options: response.options, input: response.input });
}, [addMessage]);

useEffect(() => {
  const latest = messages[messages.length - 1];
  if (!latest || latest.sender !== 'bot') return;
  const t = (latest.text || '').toLowerCase();
  if (SOON_TRIGGERS.some(s => t.includes(s))) {
    setShowContactBell(true);
    setContactOpen(true);
    setTimeout(() => setContactOpen(false), 6000); // brief, unobtrusive
    startFallbackTimer(15); // configurable
  }
}, [messages]);
"""

Add UI elements inside the widget footer container (or bottom-right corner in the same component), using your Tailwind design:
"""
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
"""

Intercept the close (X) button to show a confirmation with contacts:
"""
// Replace onClick={() => setIsChatOpen(false)} with:
onClick={() => setCloseConfirmOpen(true)}

{/* Close confirmation modal */}
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
"""

Handle API errors (registry/email) – in handleConversationFlow(), after awaiting sendToSupabase and checkRegistry add:
"""
try {
  await sendToSupabase(...);
  const res = await checkRegistry(...);
  if (!res?.success) {
    addBotMessage('В момента има временен проблем със системата. Ще ви пишем по имейл веднага щом завършим проверката.');
    setShowContactBell(true); setContactOpen(true); startFallbackTimer(15);
  }
} catch (e) {
  addBotMessage('В момента има временен проблем със системата. Ще ви пишем по имейл веднага щом завършим проверката.');
  setShowContactBell(true); setContactOpen(true); startFallbackTimer(15);
}
"""

Optional: cancel the timer when new bot messages arrive indicating response
"""
useEffect(() => {
  const latest = messages[messages.length - 1];
  if (latest?.sender === 'bot' && !SOON_TRIGGERS.some(s => (latest.text||'').toLowerCase().includes(s))) {
    // Activity happened -> may stop pending fallback
    clearFallbackTimer();
  }
}, [messages]);
"""

4) No change needed in ChatbotLoader (it already rotates agent avatars which match AGENT_CONFIG).

Testing Checklist
- Open chat, ensure avatar & name come from AGENT_CONFIG and contacts match the selected agent.
- After greeting flow, when bot sends emailValidated/soon-type message, the contact drawer appears briefly and a small bell remains.
- Wait fallbackMinutes (use 1 minute for testing): reminder message appears; drawer re-opens.
- Click X: confirmation modal shows contacts; on close, widget hides and bell remains available next time.
- Try invalid date/email/name to see errors; try Latin names (Ivan Petrov) — validation should pass.
- Simulate registry/email error (make checkRegistry return {success:false}) — polite error + contacts displayed.

Notes
- Styles use your existing Tailwind palette.
- Contacts are driven per-agent through AGENT_CONFIG.contact; if contact missing, default to @support + generic email.
- Anti-duplicate avoids repeated identical bot messages when the same text is added twice in a row by logic.

Hand-off summary
- Edit 3 files as above (agents.js, utils.js, ChatWidget.jsx) following the provided patches/snippets.
- Use fallbackMinutes=15 (or 20) as per business preference.
- Ensure production build includes these changes.
