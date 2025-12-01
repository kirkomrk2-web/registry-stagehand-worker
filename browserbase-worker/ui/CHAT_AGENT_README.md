# Chat Agent Widget (Unobtrusive Contact + Fallback)

This widget adds a compact chat panel with agent identity (name + avatar), an unobtrusive contact drawer (Telegram + Email), a 15–20 minute fallback reminder, and a pre-close confirmation that re-surfaces contact details so users can note them before exiting the chat.

## Files
- `chat-agent.css` – styles for the widget
- `chat-agent.js` – widget implementation
- `index.html` – demo wiring example

## Quick Preview

Open the demo:

```bash
# Serve the UI locally (if not already running)
cd /home/administrator/Documents/registry_stagehand_worker/browserbase-worker/ui
python3 -m http.server 8080
# Then open
xdg-open http://localhost:8080/index.html
```

The demo seeds a short conversation and will briefly show the contact drawer after the agent says "Ще се свържем съвсем скоро". A fallback reminder appears after 15 minutes.

## Usage (Integrate in your page)

1. Include files:

```html
<link rel="stylesheet" href="/path/to/chat-agent.css" />
<script src="/path/to/chat-agent.js"></script>
```

2. Initialize with your agents (names, avatars, Telegram and Email):

```html
<script>
  const agents = [
    {
      name: 'Мария',
      role: 'Клиентски агент',
      avatarUrl: '/assets/agents/maria.jpg', // optional; if omitted, initials are shown
      telegram: { handle: '@maria_support', url: 'https://t.me/maria_support' },
      email: 'maria@yourdomain.com'
    },
    {
      name: 'Моника',
      role: 'Поддръжка',
      avatarUrl: '/assets/agents/monika.jpg',
      telegram: { handle: '@monika_support', url: 'https://t.me/monika_support' },
      email: 'monika@yourdomain.com'
    }
  ];

  const widget = ChatAgentWidget.initWithAgents(agents, {
    fallbackMinutes: 15,      // 15–20 minutes recommended
    autoOpenOnSoonMessage: true,
    locale: 'bg'
  });

  // Optional demo helper
  // widget.seedDemo();
</script>
```

3. Programmatic API (basics):
- `widget.addAgentMessage(text)` – append a message from the agent
- `widget.addUserMessage(text)` – append a message from the user
- If a message contains phrasing like "ще се свържем скоро" (or "we will get back"), the widget automatically shows the unobtrusive contact drawer and starts the fallback timer.

## UX Behavior
- After a "we will get back soon" message: a small bell appears and the contact drawer opens briefly without drawing too much attention.
- If no response within `fallbackMinutes`: a gentle reminder message appears and the contact drawer re-opens.
- On close (×): a confirmation panel appears, showing Telegram and Email so users can note/save them before exiting. After closing, a small bell remains so contacts are still reachable.

## Notes
- Agent identity (name, role, email, Telegram, avatar URL) is cached in `localStorage` under key `ca-widget` to persist across reloads.
- Avatar is optional; if not provided, the widget shows initials.
- All text is currently Bulgarian by default; adjust strings as needed.

## Production Tips
- Keep contact drawer subtle: it should assist, not distract.
- Use business aliases or generic support addresses for email if you don’t want to expose personal inboxes.
- For Telegram, prefer public handles (e.g., `@brand_support`) rather than private accounts.
