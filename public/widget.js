/*!
 * Embeddable RAG chat widget.
 *
 * Branding (name, greeting, suggested questions, colors) is read from
 * window.__CHATBOT_CONFIG, generated from chatbot.config.json into
 * /widget-config.js. Load that BEFORE this file:
 *
 *   <script src="/widget-config.js" defer></script>
 *   <script src="/widget.js" defer></script>
 *
 * For cross-origin use on another site, also point the API at your Worker:
 *   <script src="https://<worker>/widget-config.js" defer></script>
 *   <script src="https://<worker>/widget.js"
 *           data-endpoint="https://<worker>" defer></script>
 *
 * If __CHATBOT_CONFIG is absent the widget still works with neutral defaults.
 */
(function () {
  'use strict';
  if (window.__ragChat) return;
  window.__ragChat = true;

  var CFG = window.__CHATBOT_CONFIG || {};
  var C = CFG.colors || {};
  var col = {
    primary: C.primary || '#4f46e5',
    primaryDark: C.primaryDark || '#4338ca',
    accent: C.accent || '#06b6d4',
    accentLight: C.accentLight || '#a5b4fc',
    darkSurface: C.darkSurface || '#0b1020',
  };
  var assistantName = CFG.assistantName || 'Docs Assistant';
  var subtitle = CFG.subtitle || 'Powered by your docs';
  var greeting = CFG.greeting || 'Hi! Ask me a question.';
  var blurb = CFG.blurb || 'I can answer questions from the docs.';
  var footer = CFG.footer || 'Answers come from the docs.';
  var placeholder = CFG.placeholder || 'Ask a question…';
  var suggested = CFG.suggestedQuestions || [];

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  var ENDPOINT = (script && script.dataset && script.dataset.endpoint) || '';

  var css = [
    '.dc-chat-btn{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;background:' + col.primary + ';color:#fff;border:none;box-shadow:0 6px 18px rgba(15,23,42,.18);cursor:pointer;z-index:2147483646;display:flex;align-items:center;justify-content:center;transition:transform .15s ease,background .15s ease}',
    '.dc-chat-btn:hover{background:' + col.primaryDark + ';transform:translateY(-1px)}',
    '.dc-chat-btn svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.dc-chat-panel{position:fixed;right:20px;bottom:88px;width:380px;height:560px;max-height:calc(100vh - 120px);background:#fff;border-radius:14px;box-shadow:0 20px 50px rgba(15,23,42,.22);display:none;flex-direction:column;overflow:hidden;z-index:2147483647;font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a}',
    '.dc-chat-panel.dc-open{display:flex}',
    '@media (max-width:480px){.dc-chat-panel{right:0;left:0;bottom:0;top:0;width:auto;height:100%;max-height:100%;border-radius:0}}',
    '.dc-chat-header{background:linear-gradient(90deg,' + col.primary + ' 0%,' + col.primaryDark + ' 100%);color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}',
    '.dc-chat-header strong{font-size:15px}',
    '.dc-chat-header small{display:block;opacity:.85;font-size:11px;margin-top:2px}',
    '.dc-chat-close{background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer;padding:0;width:28px;height:28px;line-height:1}',
    '.dc-chat-msgs{flex:1;overflow-y:auto;padding:14px;background:#f8fafc}',
    '.dc-chat-empty{color:#475569;text-align:center;padding:30px 12px}',
    '.dc-chat-empty h3{margin:0 0 8px;color:#0f172a;font-size:16px}',
    '.dc-chat-empty p{margin:0 0 14px;font-size:13px}',
    '.dc-chat-suggest{display:flex;flex-direction:column;gap:8px}',
    '.dc-chat-suggest button{background:#fff;border:1px solid #e2e8f0;color:' + col.primary + ';padding:9px 12px;border-radius:8px;cursor:pointer;font-size:13px;text-align:left;transition:border-color .12s}',
    '.dc-chat-suggest button:hover{border-color:' + col.primary + '}',
    '.dc-msg{margin-bottom:10px;display:flex}',
    '.dc-msg-user{justify-content:flex-end}',
    '.dc-msg-bubble{max-width:85%;padding:9px 12px;border-radius:12px;word-wrap:break-word;white-space:pre-wrap;font-size:13.5px;line-height:1.45}',
    '.dc-msg-user .dc-msg-bubble{background:' + col.primary + ';color:#fff;border-bottom-right-radius:4px}',
    '.dc-msg-bot .dc-msg-bubble{background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-bottom-left-radius:4px}',
    '.dc-msg-bubble code{background:rgba(15,23,42,.08);padding:1px 5px;border-radius:4px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px}',
    '.dc-msg-user .dc-msg-bubble code{background:rgba(255,255,255,.2)}',
    '.dc-msg-bubble pre{background:' + col.darkSurface + ';color:#e2e8f0;padding:8px 10px;border-radius:6px;overflow-x:auto;margin:6px 0;font-size:12px}',
    '.dc-msg-bubble pre code{background:transparent;padding:0}',
    '.dc-msg-bubble a{color:' + col.primaryDark + ';text-decoration:underline}',
    '.dc-msg-user .dc-msg-bubble a{color:' + col.accentLight + '}',
    '.dc-msg-bubble ul,.dc-msg-bubble ol{margin:4px 0;padding-left:20px}',
    '.dc-sources{margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0;font-size:12px}',
    '.dc-sources b{display:block;color:#475569;margin-bottom:4px;font-weight:600}',
    '.dc-sources a{display:block;color:' + col.primary + ';text-decoration:none;padding:2px 0}',
    '.dc-sources a:hover{text-decoration:underline}',
    '.dc-typing{font-style:italic;color:#64748b;font-size:13px}',
    '.dc-chat-form{display:flex;gap:8px;padding:10px 12px;background:#fff;border-top:1px solid #e2e8f0}',
    '.dc-chat-input{flex:1;border:1px solid #cbd5e1;border-radius:20px;padding:8px 14px;font-size:14px;font-family:inherit;outline:none;color:inherit;background:#fff}',
    '.dc-chat-input:focus{border-color:' + col.primary + '}',
    '.dc-chat-send{background:' + col.primary + ';color:#fff;border:none;border-radius:20px;padding:0 16px;cursor:pointer;font-weight:600;font-size:13px}',
    '.dc-chat-send:hover:not(:disabled){background:' + col.primaryDark + '}',
    '.dc-chat-send:disabled{opacity:.5;cursor:not-allowed}',
    '.dc-footer{font-size:11px;color:#94a3b8;text-align:center;padding:4px 0 6px;background:#fff}',
    '@media (prefers-color-scheme: dark){',
    '.dc-chat-panel{background:' + col.darkSurface + ';color:#e2e8f0}',
    '.dc-chat-msgs{background:' + col.darkSurface + '}',
    '.dc-chat-empty{color:#94a3b8}',
    '.dc-chat-empty h3{color:#e2e8f0}',
    '.dc-chat-suggest button{background:#1e293b;border-color:#334155;color:' + col.accentLight + '}',
    '.dc-msg-bot .dc-msg-bubble{background:#1e293b;color:#e2e8f0;border-color:#334155}',
    '.dc-msg-bubble code{background:rgba(255,255,255,.08)}',
    '.dc-sources{border-top-color:#334155}',
    '.dc-sources b{color:#94a3b8}',
    '.dc-chat-form{background:' + col.darkSurface + ';border-top-color:#334155}',
    '.dc-chat-input{background:#1e293b;border-color:#334155;color:#e2e8f0}',
    '.dc-footer{background:' + col.darkSurface + ';color:#475569}',
    '}',
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.className = 'dc-chat-btn';
  btn.setAttribute('aria-label', 'Open chat with ' + assistantName);
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';

  var panel = document.createElement('div');
  panel.className = 'dc-chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', assistantName);

  var suggestHtml = suggested.map(function (q) {
    var safe = escapeHtml(q);
    var attr = escapeAttr(q);
    return '<button data-q="' + attr + '">' + safe + '</button>';
  }).join('');

  panel.innerHTML =
    '<div class="dc-chat-header">' +
      '<div><strong>' + escapeHtml(assistantName) + '</strong><small>' + escapeHtml(subtitle) + '</small></div>' +
      '<button class="dc-chat-close" aria-label="Close chat">&times;</button>' +
    '</div>' +
    '<div class="dc-chat-msgs" id="dcMsgs">' +
      '<div class="dc-chat-empty">' +
        '<h3>' + escapeHtml(greeting) + '</h3>' +
        '<p>' + escapeHtml(blurb) + '</p>' +
        '<div class="dc-chat-suggest">' + suggestHtml + '</div>' +
      '</div>' +
    '</div>' +
    '<form class="dc-chat-form" id="dcForm">' +
      '<input class="dc-chat-input" id="dcInput" placeholder="' + escapeAttr(placeholder) + '" autocomplete="off" maxlength="400" />' +
      '<button type="submit" class="dc-chat-send" id="dcSend">Send</button>' +
    '</form>' +
    '<div class="dc-footer">' + escapeHtml(footer) + '</div>';

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var msgsEl = panel.querySelector('#dcMsgs');
  var form = panel.querySelector('#dcForm');
  var input = panel.querySelector('#dcInput');
  var sendBtn = panel.querySelector('#dcSend');

  var history = [];

  btn.addEventListener('click', function () {
    panel.classList.add('dc-open');
    input.focus();
  });
  panel.querySelector('.dc-chat-close').addEventListener('click', function () {
    panel.classList.remove('dc-open');
  });
  panel.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.tagName === 'BUTTON' && t.dataset && t.dataset.q) {
      input.value = t.dataset.q;
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    input.value = '';
    send(q);
  });

  function send(question) {
    var empty = msgsEl.querySelector('.dc-chat-empty');
    if (empty) empty.remove();
    appendMsg('user', question);
    var typing = appendTyping();
    sendBtn.disabled = true;

    var endpoint = ENDPOINT.replace(/\/$/, '') + '/api/chat';
    fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: question, history: history }),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        typing.remove();
        if (!res.ok) throw new Error((res.j && res.j.error) || 'Request failed');
        var answer = (res.j && res.j.answer) || '(no answer)';
        var sources = (res.j && res.j.sources) || [];
        appendMsg('bot', answer, sources);
        history.push({ role: 'user', content: question });
        history.push({ role: 'assistant', content: answer });
        if (history.length > 12) history = history.slice(-12);
      })
      .catch(function (err) {
        typing.remove();
        appendMsg('bot', 'Sorry, I had trouble answering that. Please try again. (' + err.message + ')');
      })
      .finally(function () {
        sendBtn.disabled = false;
        input.focus();
      });
  }

  function appendMsg(role, text, sources) {
    var row = document.createElement('div');
    row.className = 'dc-msg dc-msg-' + role;
    var bubble = document.createElement('div');
    bubble.className = 'dc-msg-bubble';
    bubble.innerHTML = mdToHtml(text);
    if (role === 'bot' && sources && sources.length) {
      var s = document.createElement('div');
      s.className = 'dc-sources';
      s.innerHTML = '<b>References</b>' + sources.slice(0, 4).map(function (src) {
        var safe = escapeHtml(src.title || src.url);
        var href = escapeAttr(src.url);
        return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + safe + '</a>';
      }).join('');
      bubble.appendChild(s);
    }
    row.appendChild(bubble);
    msgsEl.appendChild(row);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return row;
  }

  function appendTyping() {
    var row = document.createElement('div');
    row.className = 'dc-msg dc-msg-bot';
    row.innerHTML = '<div class="dc-msg-bubble"><span class="dc-typing">Thinking…</span></div>';
    msgsEl.appendChild(row);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return row;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }
  function mdToHtml(src) {
    var s = escapeHtml(src);
    // Fenced code blocks first so their content is not interpreted further.
    s = s.replace(/```([\s\S]*?)```/g, function (_, code) {
      return '<pre><code>' + code.replace(/^\n/, '') + '</code></pre>';
    });
    // Inline code.
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // Bold first, then italic — by the time the italic regex runs,
    // no `**` markers remain (they're all converted), so the italic
    // pattern can't accidentally consume bold delimiters.
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>');
    // Links: [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // Unordered lists.
    s = s.replace(/(^|\n)((?:[ \t]*[-*]\s+[^\n]+\n?)+)/g, function (_, lead, block) {
      var items = block.trim().split(/\n/).map(function (line) {
        return '<li>' + line.replace(/^[ \t]*[-*]\s+/, '') + '</li>';
      }).join('');
      return lead + '<ul>' + items + '</ul>';
    });
    // Paragraph + line breaks.
    s = s.replace(/\n{2,}/g, '<br><br>');
    s = s.replace(/(?<!<\/(?:ul|ol|li|pre)>)\n/g, '<br>');
    return s;
  }
})();
