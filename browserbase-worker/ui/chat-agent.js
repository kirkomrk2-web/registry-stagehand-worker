/* Chat Agent Widget: profile-aware chat + unobtrusive contact drawer + fallback timer
   Usage:
     const widget = ChatAgentWidget.initWithAgents([
       {
         name: 'Мария',
         role: 'Клиентски агент',
         avatarUrl: null, // or '/assets/maria.jpg'
         telegram: { handle: '@maria_support', url: 'https://t.me/maria_support' },
         email: 'support@example.com'
       },
       {
         name: 'Моника',
         role: 'Поддръжка',
         avatarUrl: null,
         telegram: { handle: '@monika_support', url: 'https://t.me/monika_support' },
         email: 'helpdesk@example.com'
       }
     ], { fallbackMinutes: 15 });
     widget.seedDemo();
*/

class ChatAgentWidget {
  constructor(agent, options = {}) {
    this.agent = agent;
    this.options = Object.assign({
      fallbackMinutes: 15,
      autoOpenOnSoonMessage: true,
      locale: 'bg',
      storageKey: 'ca-widget'
    }, options);

    this._timer = null;
    this._build();
    this._applyAgent(agent);
    this._wireEvents();
  }

  static initWithAgents(agents = [], options = {}) {
    const chosen = ChatAgentWidget.chooseAgent(agents);
    const w = new ChatAgentWidget(chosen, options);
    w._agents = agents.slice();
    return w;
  }

  static chooseAgent(agents) {
    if (!agents || !agents.length) {
      return {
        name: 'Агент',
        role: 'Поддръжка',
        avatarUrl: null,
        telegram: { handle: '@support', url: 'https://t.me/support' },
        email: 'support@example.com'
      };
    }
    const i = Math.floor(Math.random() * agents.length);
    return agents[i];
  }

  _build() {
    // Root container
    this.root = document.createElement('div');
    this.root.className = 'ca-widget';
    this.root.innerHTML = `
      <div class="ca-header">
        <div class="ca-avatar" aria-label="Agent avatar"><span class="ca-initials"></span><img alt=""/></div>
        <div class="ca-title">
          <div class="ca-name"></div>
          <div class="ca-role"></div>
        </div>
        <button class="ca-close" title="Затвори">×</button>
      </div>
      <div class="ca-body" role="log" aria-live="polite"></div>
      <div class="ca-footer">
        <input class="ca-input" type="text" placeholder="Напишете съобщение…"/>
        <button class="ca-send">Изпрати</button>
      </div>
      <div class="ca-contact" aria-hidden="true">
        <h4>Ако до 15–20 мин не получите отговор</h4>
        <div class="ca-row"><span class="ca-ico">📨</span><a class="ca-email" href="#" target="_blank" rel="noopener"></a></div>
        <div class="ca-row"><span class="ca-ico">💬</span><a class="ca-telegram" href="#" target="_blank" rel="noopener"></a></div>
        <div class="ca-note">Агентката е на разположение по всяко време. Тези данни ще останат видими и след затваряне на чата.</div>
      </div>
      <div class="ca-bell" title="Контакти">🔔</div>
      <div class="ca-confirm" aria-hidden="true">
        <div class="panel">
          <h3>Преди да затворите</h3>
          <p>Запишете контактите на агентката, за да се свържете при нужда:</p>
          <p>Имейл: <a class="cf-email" href="#" target="_blank" rel="noopener"></a></p>
          <p>Telegram: <a class="cf-telegram" href="#" target="_blank" rel="noopener"></a></p>
          <p class="hint">Можете да продължите разговора и извън платформата. На разположение сме по всяко време.</p>
          <div class="actions">
            <button class="ca-btn js-keep">Назад</button>
            <button class="ca-btn primary js-close">Затвори чата</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.root);

    // Element refs
    this.$avatar = this.root.querySelector('.ca-avatar');
    this.$initials = this.root.querySelector('.ca-initials');
    this.$img = this.root.querySelector('.ca-avatar img');
    this.$name = this.root.querySelector('.ca-name');
    this.$role = this.root.querySelector('.ca-role');
    this.$body = this.root.querySelector('.ca-body');
    this.$input = this.root.querySelector('.ca-input');
    this.$send = this.root.querySelector('.ca-send');
    this.$close = this.root.querySelector('.ca-close');

    this.$contact = this.root.querySelector('.ca-contact');
    this.$email = this.root.querySelector('.ca-email');
    this.$telegram = this.root.querySelector('.ca-telegram');

    this.$bell = this.root.querySelector('.ca-bell');

    this.$confirm = this.root.querySelector('.ca-confirm');
    this.$cfEmail = this.root.querySelector('.cf-email');
    this.$cfTg = this.root.querySelector('.cf-telegram');
    this.$confirmKeep = this.root.querySelector('.js-keep');
    this.$confirmClose = this.root.querySelector('.js-close');
  }

  _applyAgent(agent) {
    const initials = this._initials(agent.name || 'Агент');
    this.$initials.textContent = initials;
    if (agent.avatarUrl) {
      this.$img.src = agent.avatarUrl;
      this.$img.style.display = 'block';
      this.$initials.style.display = 'none';
    } else {
      this.$img.removeAttribute('src');
      this.$img.style.display = 'none';
      this.$initials.style.display = 'inline';
    }
    this.$name.textContent = agent.name || 'Агент';
    this.$role.textContent = agent.role || 'Поддръжка';

    // Contacts
    this.$email.textContent = agent.email || 'support@example.com';
    this.$email.href = agent.email ? `mailto:${agent.email}` : '#';
    const t = agent.telegram || { handle: '@support', url: 'https://t.me/support' };
    this.$telegram.textContent = `${t.handle || '@support'}`;
    this.$telegram.href = t.url || 'https://t.me/support';

    // Confirm panel contacts
    this.$cfEmail.textContent = this.$email.textContent;
    this.$cfEmail.href = this.$email.href;
    this.$cfTg.textContent = this.$telegram.textContent;
    this.$cfTg.href = this.$telegram.href;

    // Persist light agent profile (for future sessions)
    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify({
        name: agent.name, role: agent.role, email: agent.email, telegram: agent.telegram, avatarUrl: agent.avatarUrl
      }));
    } catch (_) {}
  }

  _wireEvents() {
    this.$send.addEventListener('click', () => this._onSend());
    this.$input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._onSend();
    });

    this.$close.addEventListener('click', () => this._onAttemptClose());

    // Contact toggles
    this.$bell.addEventListener('click', () => {
      this.$contact.classList.toggle('show');
    });
  }

  _onSend() {
    const text = (this.$input.value || '').trim();
    if (!text) return;
    this.$input.value = '';
    this.addUserMessage(text);
    // For demo: echo a courteous response if it contains 'здравей' etc.
    if (/^здр|^здравей|hello|hi/i.test(text)) {
      this.addAgentMessage('Благодаря! Ще разгледаме запитването Ви и ще се свържем съвсем скоро.');
      this._afterSoonMessage();
    }
  }

  addAgentMessage(text) {
    const node = this._messageNode('agent', text);
    this.$body.appendChild(node);
    this._scrollToBottom();
    if (this.options.autoOpenOnSoonMessage && this._isSoonMessage(text)) {
      this._afterSoonMessage();
    }
  }

  addUserMessage(text) {
    const node = this._messageNode('user', text);
    this.$body.appendChild(node);
    this._scrollToBottom();
  }

  _messageNode(sender, text) {
    const wrap = document.createElement('div');
    wrap.className = `ca-msg ca-msg-${sender}`;
    const bubble = document.createElement('div');
    bubble.className = 'ca-bubble';
    bubble.textContent = text;
    wrap.appendChild(bubble);
    return wrap;
  }

  _isSoonMessage(text) {
    const t = text.toLowerCase();
    return (
      t.includes('ще се свържем скоро') ||
      t.includes('скоро ще върнем отговор') ||
      t.includes('we will get back') ||
      t.includes('soon')
    );
  }

  _afterSoonMessage() {
    // Show tiny bell now (unobtrusive) and contact drawer briefly
    this.$bell.classList.add('show');
    this.$contact.classList.add('show');
    // Auto-hide contact after a few seconds to be unobtrusive
    setTimeout(() => this.$contact.classList.remove('show'), 6000);
    // Start fallback timer 15–20 min
    this._startFallbackTimer(this.options.fallbackMinutes);
  }

  _startFallbackTimer(minutes) {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    // Convert minutes to ms; default 15
    const ms = Math.max(1, (minutes || 15)) * 60 * 1000;
    this._timer = setTimeout(() => {
      // Gentle nudge and show contacts again
      this.addAgentMessage('За Ваше удобство, ако все още не сме се свързали, можете да ни пишете директно в Telegram или по имейл. На разположение сме по всяко време.');
      this.$contact.classList.add('show');
      this.$bell.classList.add('show');
    }, ms);
  }

  _onAttemptClose() {
    // Show confirmation panel with contacts
    this.$confirm.style.display = 'flex';
    this.$confirm.setAttribute('aria-hidden', 'false');

    const dismiss = () => {
      this.$confirm.style.display = 'none';
      this.$confirm.setAttribute('aria-hidden', 'true');
    };

    const closeChat = () => {
      dismiss();
      // Keep a tiny contact bell so data is still reachable
      this.$bell.classList.add('show');
      this.root.style.display = 'none';
      // Persist that contacts were shown
      try { localStorage.setItem(this.options.storageKey + ':closed', '1'); } catch (_) {}
    };

    // Wire temporary handlers (one-shot)
    const keepHandler = () => { dismiss(); cleanup(); };
    const closeHandler = () => { closeChat(); cleanup(); };
    const cleanup = () => {
      this.$confirmKeep.removeEventListener('click', keepHandler);
      this.$confirmClose.removeEventListener('click', closeHandler);
    };

    this.$confirmKeep.addEventListener('click', keepHandler, { once: true });
    this.$confirmClose.addEventListener('click', closeHandler, { once: true });
  }

  _initials(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    const take = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    return take.toUpperCase();
  }

  _scrollToBottom() {
    this.$body.scrollTop = this.$body.scrollHeight;
  }

  // Demo-only helper
  seedDemo() {
    this.addAgentMessage(`Здравейте! Аз съм ${this.agent.name}. С какво мога да помогна?`);
    setTimeout(() => {
      this.addUserMessage('Здравейте, изпратих данните.');
    }, 800);
    setTimeout(() => {
      this.addAgentMessage('Благодаря! Ще разгледаме запитването Ви и ще се свържем съвсем скоро.');
    }, 1800);
  }
}

window.ChatAgentWidget = ChatAgentWidget;
