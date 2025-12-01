Hostinger Deployment Guide – Chat Agent Widget

Overview
- You have two deployment options:
  1) WordPress site: install a minimal plugin that injects the widget on every page (recommended if you use WP)
  2) Static/Non‑WordPress site: upload CSS/JS and paste a snippet before </body>

Prerequisites
- Telegram handles and email addresses for the agents (placeholders provided)
- Optional avatar image URLs hosted on your domain (or leave blank to show initials)

Option A) WordPress (Plugin)
1) Upload plugin via File Manager (fastest)
   - Path: public_html/wp-content/plugins/wallester-chat-agent/
   - Upload file: wp-wallester-chat-agent.php (from deploy/hostinger/wp-wallester-chat-agent.php)
   - Resulting path: public_html/wp-content/plugins/wallester-chat-agent/wp-wallester-chat-agent.php
2) Activate in WP Admin
   - WP Admin → Plugins → find "Wallester Chat Agent Widget" → Activate
3) Configure agents
   - Edit the PHP file in File Manager and set:
     - fallbackMinutes: 15 or 20
     - agents[]: name, role, email, telegram.handle, telegram.url, avatarUrl (optional)
4) Test
   - Open the site (homepage). The chat panel appears bottom‑right.
   - Type a greeting; you should see the polite reply and the discrete contact drawer.
   - For quick fallback test: temporarily set fallbackMinutes to 1, refresh, wait 1 minute.

Option B) Static or Non‑WordPress Site
1) Create asset directory
   - public_html/assets/chat-agent/
2) Upload files
   - From browserbase-worker/ui: chat-agent.css and chat-agent.js → to public_html/assets/chat-agent/
3) Insert snippet before </body> on pages where you want the widget
   - Edit the HTML file in File Manager and add:
     <link rel="stylesheet" href="/assets/chat-agent/chat-agent.css">
     <script src="/assets/chat-agent/chat-agent.js"></script>
     <script>
       const agents = [
         { name: 'Мария', role: 'Клиентски агент', avatarUrl: '', telegram: { handle: '@maria_support', url: 'https://t.me/maria_support' }, email: 'support@yourdomain.com' },
         { name: 'Моника', role: 'Поддръжка', avatarUrl: '', telegram: { handle: '@monika_support', url: 'https://t.me/monika_support' }, email: 'helpdesk@yourdomain.com' }
       ];
       const widget = ChatAgentWidget.initWithAgents(agents, { fallbackMinutes: 15 });
     </script>
4) Test as in WP option.

Customization Notes
- Keep contact drawer subtle. The widget already shows a tiny bell and a small drawer briefly after the “we will get back soon” message; after 15–20 minutes it reminds again.
- If you want to show on specific pages only, place the snippet only in those templates (e.g., header of landing page) or add a guard:
  <script>
    if (location.pathname.startsWith('/your-landing')) {
      // init widget
    }
  </script>
- Avatars: upload to public_html/wp-content/uploads/agents/ or public_html/assets/agents/ and set avatarUrl accordingly.

Troubleshooting
- Widget not visible: ensure CSS/JS paths are correct and snippet is before </body> (not blocked by CSP).
- Contact drawer never appears: it opens automatically after a message containing “ще се свържем съвсем скоро”. You can also trigger manually with widget.addAgentMessage('Ще се свържем съвсем скоро.').
- Fallback not firing: reduce fallbackMinutes to 1 for testing. Make sure tab stays open.

Rollback
- WordPress: Deactivate plugin in WP Admin → Plugins
- Static: Remove the snippet and/or CSS/JS files
