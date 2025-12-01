<?php
/*
Plugin Name: Wallester Chat Agent Widget
Description: Adds a compact chat panel with agent identity and an unobtrusive contact drawer (Telegram + Email) with 15–20 min fallback and pre-close confirmation.
Version: 1.0.0
Author: Your Team
*/

if (!defined('ABSPATH')) { exit; }

// ============== CONFIGURATION ==============
// Edit these values to match your agents and preferences.
$WALL_CHAT_AGENT_CONFIG = [
  'fallbackMinutes' => 15, // you can set 20 as preferred
  'agents' => [
    [
      'name' => 'Мария',
      'role' => 'Клиентски агент',
      'avatarUrl' => '', // e.g. https://yourdomain.com/wp-content/uploads/agents/maria.jpg
      'telegram' => [ 'handle' => '@maria_support', 'url' => 'https://t.me/maria_support' ],
      'email' => 'support@yourdomain.com'
    ],
    [
      'name' => 'Моника',
      'role' => 'Поддръжка',
      'avatarUrl' => '',
      'telegram' => [ 'handle' => '@monika_support', 'url' => 'https://t.me/monika_support' ],
      'email' => 'helpdesk@yourdomain.com'
    ]
  ]
];

add_action('wp_footer', function() use ($WALL_CHAT_AGENT_CONFIG) {
  // Inline CSS
  ?>
  <style>
  :root { --ca-bg:#fff; --ca-border:#e6e6e6; --ca-shadow:0 10px 30px rgba(0,0,0,0.12); --ca-primary:#356be8; --ca-muted:#667085; }
  .ca-widget{position:fixed;right:18px;bottom:18px;width:320px;max-width:calc(100vw - 24px);background:var(--ca-bg);border:1px solid var(--ca-border);border-radius:12px;box-shadow:var(--ca-shadow);overflow:hidden;font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1f2937;z-index:9999}
  .ca-header{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--ca-border);background:#fafafa}
  .ca-avatar{width:36px;height:36px;border-radius:50%;background:#e3e8ff;color:#2d3a8c;display:inline-flex;align-items:center;justify-content:center;font-weight:700;flex:0 0 36px;overflow:hidden}
  .ca-avatar img{width:100%;height:100%;object-fit:cover;display:none}
  .ca-title{display:flex;flex-direction:column}
  .ca-name{font-weight:600;font-size:14px;color:#111827}
  .ca-role{font-size:12px;color:var(--ca-muted)}
  .ca-close{margin-left:auto;border:none;background:transparent;color:var(--ca-muted);cursor:pointer;font-size:18px;line-height:1}
  .ca-close:hover{color:#0f172a}
  .ca-body{max-height:320px;overflow:auto;padding:12px;background:#fff}
  .ca-msg{display:flex;gap:8px;margin:8px 0}
  .ca-msg-agent .ca-bubble{background:#f3f4f6;color:#111827;border:1px solid #e5e7eb}
  .ca-msg-user .ca-bubble{background:#e8f0fe;color:#0f172a;border:1px solid #dbe4ff;margin-left:auto}
  .ca-bubble{padding:8px 10px;border-radius:10px;max-width:85%;box-shadow:0 1px 2px rgba(0,0,0,0.04)}
  .ca-footer{border-top:1px solid var(--ca-border);background:#fafafa;padding:8px;display:flex;gap:6px}
  .ca-input{flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;font-size:14px}
  .ca-send{background:var(--ca-primary);color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer}
  .ca-contact{position:absolute;right:10px;bottom:64px;width:260px;background:#fff;border:1px solid var(--ca-border);border-radius:10px;box-shadow:var(--ca-shadow);padding:10px;display:none}
  .ca-contact.show{display:block}
  .ca-contact h4{margin:0 0 6px;font-size:13px;color:#111827}
  .ca-contact .ca-row{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:13px;color:#111827}
  .ca-contact .ca-ico{width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:var(--ca-primary)}
  .ca-contact .ca-note{font-size:12px;color:var(--ca-muted);margin-top:6px}
  .ca-bell{position:absolute;right:14px;bottom:64px;width:26px;height:26px;border-radius:50%;background:#fff;border:1px solid var(--ca-border);box-shadow:var(--ca-shadow);display:none;align-items:center;justify-content:center;color:var(--ca-primary);cursor:pointer}
  .ca-bell.show{display:inline-flex}
  .ca-confirm{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);z-index:10000}
  .ca-confirm .panel{width:360px;max-width:90vw;background:#fff;border-radius:12px;border:1px solid var(--ca-border);box-shadow:var(--ca-shadow);padding:14px}
  .ca-confirm h3{margin:0 0 8px;font-size:16px}
  .ca-confirm p{margin:6px 0;font-size:14px;color:#111827}
  .ca-confirm .hint{font-size:12px;color:var(--ca-muted)}
  .ca-confirm .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}
  .ca-btn{border:1px solid var(--ca-border);background:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
  .ca-btn.primary{background:var(--ca-primary);color:#fff;border-color:var(--ca-primary)}
  </style>
  <?php
  // Inline JS + initialization with PHP-config
  ?>
  <script>
  (function(){
    // ChatAgentWidget class (trimmed to essentials, identical behavior to /ui/chat-agent.js)
    class ChatAgentWidget{
      constructor(agent,options={}){this.agent=agent;this.options=Object.assign({fallbackMinutes:15,autoOpenOnSoonMessage:true,locale:'bg',storageKey:'ca-widget'},options);this._timer=null;this._build();this._applyAgent(agent);this._wireEvents();}
      static initWithAgents(agents=[],options={}){const chosen=ChatAgentWidget.chooseAgent(agents);const w=new ChatAgentWidget(chosen,options);w._agents=agents.slice();return w;}
      static chooseAgent(agents){if(!agents||!agents.length){return{name:'Агент',role:'Поддръжка',avatarUrl:null,telegram:{handle:'@support',url:'https://t.me/support'},email:'support@example.com'};}const i=Math.floor(Math.random()*agents.length);return agents[i];}
      _build(){this.root=document.createElement('div');this.root.className='ca-widget';this.root.innerHTML='\n      <div class="ca-header">\n        <div class="ca-avatar" aria-label="Agent avatar"><span class="ca-initials"></span><img alt=""/></div>\n        <div class="ca-title">\n          <div class="ca-name"></div>\n          <div class="ca-role"></div>\n        </div>\n        <button class="ca-close" title="Затвори">×</button>\n      </div>\n      <div class="ca-body" role="log" aria-live="polite"></div>\n      <div class="ca-footer">\n        <input class="ca-input" type="text" placeholder="Напишете съобщение…"/>\n        <button class="ca-send">Изпрати</button>\n      </div>\n      <div class="ca-contact" aria-hidden="true">\n        <h4>Ако до 15–20 мин не получите отговор</h4>\n        <div class="ca-row"><span class="ca-ico">📨</span><a class="ca-email" href="#" target="_blank" rel="noopener"></a></div>\n        <div class="ca-row"><span class="ca-ico">💬</span><a class="ca-telegram" href="#" target="_blank" rel="noopener"></a></div>\n        <div class="ca-note">Агентката е на разположение по всяко време. Тези данни ще останат видими и след затваряне на чата.</div>\n      </div>\n      <div class="ca-bell" title="Контакти">🔔</div>\n      <div class="ca-confirm" aria-hidden="true">\n        <div class="panel">\n          <h3>Преди да затворите</h3>\n          <p>Запишете контактите на агентката, за да се свържете при нужда:</p>\n          <p>Имейл: <a class="cf-email" href="#" target="_blank" rel="noopener"></a></p>\n          <p>Telegram: <a class="cf-telegram" href="#" target="_blank" rel="noopener"></a></p>\n          <p class="hint">Можете да продължите разговора и извън платформата. На разположение сме по всяко време.</p>\n          <div class="actions">\n            <button class="ca-btn js-keep">Назад</button>\n            <button class="ca-btn primary js-close">Затвори чата</button>\n          </div>\n        </div>\n      </div>';document.body.appendChild(this.root);this.$avatar=this.root.querySelector('.ca-avatar');this.$initials=this.root.querySelector('.ca-initials');this.$img=this.root.querySelector('.ca-avatar img');this.$name=this.root.querySelector('.ca-name');this.$role=this.root.querySelector('.ca-role');this.$body=this.root.querySelector('.ca-body');this.$input=this.root.querySelector('.ca-input');this.$send=this.root.querySelector('.ca-send');this.$close=this.root.querySelector('.ca-close');this.$contact=this.root.querySelector('.ca-contact');this.$email=this.root.querySelector('.ca-email');this.$telegram=this.root.querySelector('.ca-telegram');this.$bell=this.root.querySelector('.ca-bell');this.$confirm=this.root.querySelector('.ca-confirm');this.$cfEmail=this.root.querySelector('.cf-email');this.$cfTg=this.root.querySelector('.cf-telegram');this.$confirmKeep=this.root.querySelector('.js-keep');this.$confirmClose=this.root.querySelector('.js-close');}
      _applyAgent(agent){const initials=this._initials(agent.name||'Агент');this.$initials.textContent=initials;if(agent.avatarUrl){this.$img.src=agent.avatarUrl;this.$img.style.display='block';this.$initials.style.display='none';}else{this.$img.removeAttribute('src');this.$img.style.display='none';this.$initials.style.display='inline';}this.$name.textContent=agent.name||'Агент';this.$role.textContent=agent.role||'Поддръжка';this.$email.textContent=agent.email||'support@example.com';this.$email.href=agent.email?`mailto:${agent.email}`:'#';const t=agent.telegram||{handle:'@support',url:'https://t.me/support'};this.$telegram.textContent=`${t.handle||'@support'}`;this.$telegram.href=t.url||'https://t.me/support';this.$cfEmail.textContent=this.$email.textContent;this.$cfEmail.href=this.$email.href;this.$cfTg.textContent=this.$telegram.textContent;this.$cfTg.href=this.$telegram.href;try{localStorage.setItem(this.options.storageKey,JSON.stringify({name:agent.name,role:agent.role,email:agent.email,telegram:agent.telegram,avatarUrl:agent.avatarUrl}));}catch(_){} }
      _wireEvents(){this.$send.addEventListener('click',()=>this._onSend());this.$input.addEventListener('keydown',e=>{if(e.key==='Enter')this._onSend();});this.$close.addEventListener('click',()=>this._onAttemptClose());this.$bell.addEventListener('click',()=>{this.$contact.classList.toggle('show');});}
      _onSend(){const text=(this.$input.value||'').trim();if(!text)return;this.$input.value='';this.addUserMessage(text);if(/^здр|^здравей|hello|hi/i.test(text)){this.addAgentMessage('Благодаря! Ще разгледаме запитването Ви и ще се свържем съвсем скоро.');this._afterSoonMessage();}}
      addAgentMessage(text){const node=this._messageNode('agent',text);this.$body.appendChild(node);this._scrollToBottom();if(this.options.autoOpenOnSoonMessage&&this._isSoonMessage(text)){this._afterSoonMessage();}}
      addUserMessage(text){const node=this._messageNode('user',text);this.$body.appendChild(node);this._scrollToBottom();}
      _messageNode(sender,text){const wrap=document.createElement('div');wrap.className=`ca-msg ca-msg-${sender}`;const bubble=document.createElement('div');bubble.className='ca-bubble';bubble.textContent=text;wrap.appendChild(bubble);return wrap;}
      _isSoonMessage(text){const t=text.toLowerCase();return(t.includes('ще се свържем скоро')||t.includes('скоро ще върнем отговор')||t.includes('we will get back')||t.includes('soon'));}
      _afterSoonMessage(){this.$bell.classList.add('show');this.$contact.classList.add('show');setTimeout(()=>this.$contact.classList.remove('show'),6000);this._startFallbackTimer(this.options.fallbackMinutes);}
      _startFallbackTimer(minutes){if(this._timer){clearTimeout(this._timer);this._timer=null;}const ms=Math.max(1,(minutes||15))*60*1000;this._timer=setTimeout(()=>{this.addAgentMessage('За Ваше удобство, ако все още не сме се свързали, можете да ни пишете директно в Telegram или по имейл. На разположение сме по всяко време.');this.$contact.classList.add('show');this.$bell.classList.add('show');},ms);}
      _onAttemptClose(){this.$confirm.style.display='flex';this.$confirm.setAttribute('aria-hidden','false');const dismiss=()=>{this.$confirm.style.display='none';this.$confirm.setAttribute('aria-hidden','true');};const closeChat=()=>{dismiss();this.$bell.classList.add('show');this.root.style.display='none';try{localStorage.setItem(this.options.storageKey+':closed','1');}catch(_){}};const keepHandler=()=>{dismiss();cleanup();};const closeHandler=()=>{closeChat();cleanup();};const cleanup=()=>{this.$confirmKeep.removeEventListener('click',keepHandler);this.$confirmClose.removeEventListener('click',closeHandler);};this.$confirmKeep.addEventListener('click',keepHandler,{once:true});this.$confirmClose.addEventListener('click',closeHandler,{once:true});}
      _initials(name){const parts=String(name).trim().split(/\s+/).filter(Boolean);const take=(parts[0]?.[0]||'')+(parts[1]?.[0]||'');return take.toUpperCase();}
      _scrollToBottom(){this.$body.scrollTop=this.$body.scrollHeight;}
    }

    // Initialize using PHP-provided config
    const CFG = <?php echo json_encode($WALL_CHAT_AGENT_CONFIG, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); ?>;
    try {
      ChatAgentWidget.initWithAgents(CFG.agents||[], { fallbackMinutes: CFG.fallbackMinutes||15 });
    } catch (e) { console.error('ChatAgent init error', e); }
  })();
  </script>
  <?php
});
