/**
 * OfficeFlow chatbot widget — drop-in JS.
 * Voeg toe aan elke pagina met:  <script src="/chatbot.js" defer></script>
 *
 * Geen dependencies. Plaatst floating bubble rechtsonder + chat panel.
 */
(function () {
  'use strict';

  const API_BASE = 'https://api.officeflowcompany.com';
  const STORAGE_KEY = 'officeflow_chat_history_v1';
  const MAX_HISTORY = 20;

  // ---- Style ----
  const css = `
    .ofcb-bubble{position:fixed;bottom:20px;right:20px;z-index:9999;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#F97316 0%,#FB923C 100%);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;border:0;box-shadow:0 8px 20px rgba(249,115,22,.35),0 2px 6px rgba(15,23,42,.15);transition:transform .2s}
    .ofcb-bubble:hover{transform:scale(1.06)}
    .ofcb-bubble svg{width:26px;height:26px}
    .ofcb-bubble .ofcb-close-icon{display:none}
    .ofcb-open .ofcb-bubble .ofcb-chat-icon{display:none}
    .ofcb-open .ofcb-bubble .ofcb-close-icon{display:block}

    .ofcb-panel{position:fixed;bottom:88px;right:20px;z-index:9998;width:380px;max-width:calc(100vw - 40px);height:540px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 20px 50px -10px rgba(15,23,42,.25),0 8px 20px -4px rgba(15,23,42,.1);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;border:1px solid #e2e8f0}
    .ofcb-open .ofcb-panel{display:flex;animation:ofcb-in .2s ease-out}
    @keyframes ofcb-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

    .ofcb-head{padding:14px 18px;background:linear-gradient(135deg,#F97316 0%,#FB923C 100%);color:#fff;display:flex;align-items:center;gap:10px;flex-shrink:0}
    .ofcb-head-mark{width:30px;height:30px;background:rgba(255,255,255,.2);border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;font-size:13px}
    .ofcb-head-title{font-size:14px;font-weight:700;line-height:1.2}
    .ofcb-head-sub{font-size:11.5px;opacity:.9;line-height:1.3;margin-top:2px}

    .ofcb-msgs{flex:1;overflow-y:auto;padding:18px;background:#fafafa;display:flex;flex-direction:column;gap:10px}
    .ofcb-msg{max-width:85%;padding:10px 13px;border-radius:12px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
    .ofcb-msg.user{align-self:flex-end;background:#F97316;color:#fff;border-bottom-right-radius:4px}
    .ofcb-msg.assistant{align-self:flex-start;background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-bottom-left-radius:4px}
    .ofcb-msg.assistant a{color:#F97316;text-decoration:underline}
    .ofcb-msg.typing{align-self:flex-start;background:#fff;border:1px solid #e2e8f0;display:inline-flex;gap:4px;padding:13px 14px}
    .ofcb-msg.typing span{width:6px;height:6px;border-radius:50%;background:#cbd5e1;animation:ofcb-dot 1.2s ease-in-out infinite}
    .ofcb-msg.typing span:nth-child(2){animation-delay:.2s}
    .ofcb-msg.typing span:nth-child(3){animation-delay:.4s}
    @keyframes ofcb-dot{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}

    .ofcb-quick{display:flex;flex-wrap:wrap;gap:6px;padding:10px 18px 0;background:#fafafa}
    .ofcb-quick button{appearance:none;border:1px solid #e2e8f0;background:#fff;color:#475569;padding:6px 11px;border-radius:999px;font-size:12px;cursor:pointer;font-family:inherit;transition:all .15s}
    .ofcb-quick button:hover{border-color:#F97316;color:#C2410C;background:#fff7ed}

    .ofcb-input{padding:14px 18px;background:#fff;border-top:1px solid #e2e8f0;display:flex;gap:8px;flex-shrink:0}
    .ofcb-input input{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;font-size:13.5px;font-family:inherit;color:#0f172a;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s}
    .ofcb-input input:focus{border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,.15)}
    .ofcb-input button{appearance:none;border:0;background:#F97316;color:#fff;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0;transition:opacity .15s}
    .ofcb-input button:hover{opacity:.9}
    .ofcb-input button:disabled{opacity:.5;cursor:not-allowed}

    .ofcb-footer{font-size:10.5px;color:#94a3b8;text-align:center;padding:6px 18px 10px;background:#fff;flex-shrink:0}
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---- HTML ----
  const wrapper = document.createElement('div');
  wrapper.id = 'ofcb-wrapper';
  wrapper.innerHTML = `
    <button class="ofcb-bubble" id="ofcb-bubble" aria-label="Chat openen">
      <svg class="ofcb-chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg class="ofcb-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
    <div class="ofcb-panel" role="dialog" aria-label="OfficeFlow chatbot">
      <div class="ofcb-head">
        <div class="ofcb-head-mark">▶</div>
        <div>
          <div class="ofcb-head-title">OfficeFlow assistent</div>
          <div class="ofcb-head-sub">Stel een vraag over Mailbox Manager, Teams of Facturen</div>
        </div>
      </div>
      <div class="ofcb-msgs" id="ofcb-msgs"></div>
      <div class="ofcb-quick" id="ofcb-quick">
        <button data-quick="Wat kost Mailbox Manager?">💰 Wat kost het?</button>
        <button data-quick="Hoe werkt de Google koppeling?">🔗 Hoe koppel ik Gmail?</button>
        <button data-quick="Hoe zit het met Teams?">👥 Teams uitleg</button>
        <button data-quick="Is mijn data veilig?">🔒 Data &amp; privacy</button>
      </div>
      <div class="ofcb-input">
        <input type="text" id="ofcb-input" placeholder="Typ je vraag…" autocomplete="off" maxlength="500" />
        <button id="ofcb-send" aria-label="Verstuur">Stuur</button>
      </div>
      <div class="ofcb-footer">AI-assistent · antwoorden kunnen onnauwkeurig zijn</div>
    </div>
  `;
  document.body.appendChild(wrapper);

  // ---- State + helpers ----
  const els = {
    wrapper: wrapper,
    bubble: document.getElementById('ofcb-bubble'),
    msgs: document.getElementById('ofcb-msgs'),
    quick: document.getElementById('ofcb-quick'),
    input: document.getElementById('ofcb-input'),
    send: document.getElementById('ofcb-send'),
  };

  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(-MAX_HISTORY) : [];
    } catch (_) { return []; }
  }

  function saveHistory(arr) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(-MAX_HISTORY))); } catch (_) { /* ignore */ }
  }

  let history = loadHistory();

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function linkify(s) {
    // Eenvoudige email + URL detectie
    return escapeHtml(s)
      .replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/([\w.+-]+@[\w.-]+\.[a-z]{2,})/gi, '<a href="mailto:$1">$1</a>');
  }

  function appendMessage(role, content) {
    const div = document.createElement('div');
    div.className = 'ofcb-msg ' + role;
    div.innerHTML = role === 'assistant' ? linkify(content) : escapeHtml(content);
    els.msgs.appendChild(div);
    els.msgs.scrollTop = els.msgs.scrollHeight;
  }

  function appendTyping() {
    const div = document.createElement('div');
    div.className = 'ofcb-msg typing';
    div.id = 'ofcb-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    els.msgs.appendChild(div);
    els.msgs.scrollTop = els.msgs.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('ofcb-typing');
    if (t) t.remove();
  }

  function renderHistory() {
    els.msgs.innerHTML = '';
    if (history.length === 0) {
      appendMessage('assistant', 'Hoi! Ik help je graag met vragen over OfficeFlow. Stel maar — over prijzen, Gmail-koppeling, Teams of wat je maar wil weten.');
    } else {
      history.forEach(m => appendMessage(m.role, m.content));
    }
  }

  async function sendMessage(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    if (trimmed.length > 500) return;

    appendMessage('user', trimmed);
    history.push({ role: 'user', content: trimmed });
    saveHistory(history);

    els.input.value = '';
    els.send.disabled = true;
    appendTyping();

    try {
      const res = await fetch(API_BASE + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: history.slice(0, -1).slice(-MAX_HISTORY),
        }),
      });
      const data = await res.json().catch(() => ({}));
      removeTyping();

      if (!res.ok) {
        appendMessage('assistant', data.detail || 'Sorry, dat ging niet goed. Probeer het opnieuw of mail mail@officeflowcompany.com');
        return;
      }
      const reply = data.reply || 'Geen antwoord ontvangen.';
      appendMessage('assistant', reply);
      history.push({ role: 'assistant', content: reply });
      saveHistory(history);
    } catch (err) {
      removeTyping();
      appendMessage('assistant', 'Verbinding mislukt. Probeer het opnieuw.');
    } finally {
      els.send.disabled = false;
      els.input.focus();
    }
  }

  // ---- Events ----
  els.bubble.addEventListener('click', () => {
    wrapper.classList.toggle('ofcb-open');
    if (wrapper.classList.contains('ofcb-open')) {
      renderHistory();
      setTimeout(() => els.input.focus(), 100);
    }
  });

  els.send.addEventListener('click', () => sendMessage(els.input.value));
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(els.input.value);
    }
  });

  els.quick.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quick]');
    if (!btn) return;
    sendMessage(btn.getAttribute('data-quick'));
  });
})();
