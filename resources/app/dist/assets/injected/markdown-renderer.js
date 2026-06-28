(function() {
  'use strict';

  var STYLE_ID = 'horm-codex-reply-layout-style';
  var observerStarted = false;
  var pendingScanRoot = null;
  var scanTimer = 0;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function injectCodexReplyStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.horm-codex-row-assistant{display:flex!important;justify-content:flex-start!important;align-items:stretch!important;width:100%!important;padding:18px 32px 18px 26px!important;}',
      '.horm-codex-row-user{display:flex!important;justify-content:flex-end!important;align-items:flex-start!important;width:100%!important;padding:10px 20px 10px 26px!important;}',
      '.horm-codex-assistant{position:relative!important;width:min(980px,100%)!important;max-width:min(980px,100%)!important;margin:0!important;padding:0!important;background:transparent!important;background-image:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;color:#202124!important;font-family:"IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;letter-spacing:0!important;text-align:left!important;align-self:flex-start!important;}',
      '.dark .horm-codex-assistant{color:#e8eaed!important;}',
      '.horm-codex-assistant::before{content:none!important;display:none!important;}',
      '.horm-codex-assistant:hover{box-shadow:none!important;transform:none!important;}',
      '.horm-codex-meta{display:flex;align-items:center;gap:8px;margin:0 0 10px!important;min-height:20px;color:#6b7280!important;font-size:11px!important;font-weight:600!important;line-height:1.3!important;font-family:"IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;letter-spacing:0!important;}',
      '.dark .horm-codex-meta{color:#9aa0a6!important;}',
      '.horm-codex-avatar{position:relative;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:transparent;color:var(--horm-ink,#111);font-size:9px;font-weight:800;line-height:1;box-shadow:none;overflow:visible;}',
      '.horm-codex-avatar::before{content:"";width:13px;height:13px;background:currentColor;clip-path:polygon(50% 0,61% 32%,95% 22%,68% 45%,98% 58%,64% 61%,78% 92%,50% 70%,22% 92%,36% 61%,2% 58%,32% 45%,5% 22%,39% 32%);animation:horm-claude-mark 3.1s ease-in-out infinite;}',
      '.horm-codex-avatar::after{content:"";position:absolute;inset:-4px;border:1px solid currentColor;border-radius:999px;opacity:.12;animation:horm-claude-halo 3.1s ease-in-out infinite;}',
      '@keyframes horm-claude-mark{0%,100%{transform:rotate(0deg) scale(1);}50%{transform:rotate(45deg) scale(1.08);}}',
      '@keyframes horm-claude-halo{0%,100%{opacity:.08;transform:scale(.92);}50%{opacity:.26;transform:scale(1.13);}}',
      '.horm-codex-model{max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-transform:capitalize;}',
      '.horm-codex-role{font-size:10px!important;font-weight:700!important;color:#8b949e!important;text-transform:uppercase!important;}',
      '.horm-codex-assistant .whitespace-pre-wrap,.horm-codex-assistant .horm-md,.horm-codex-assistant p,.horm-codex-assistant li{font-family:"IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;font-size:14.5px!important;line-height:1.72!important;letter-spacing:0!important;}',
      '.horm-codex-assistant *{text-align:left!important;}',
      '.horm-codex-assistant p{margin:0 0 10px!important;}',
      '.horm-codex-assistant p:last-child{margin-bottom:0!important;}',
      '.horm-codex-assistant h1,.horm-codex-assistant h2,.horm-codex-assistant h3{font-family:"IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;letter-spacing:0!important;font-weight:700!important;line-height:1.3!important;margin:14px 0 8px!important;color:inherit!important;}',
      '.horm-codex-assistant h1{font-size:20px!important;}.horm-codex-assistant h2{font-size:17px!important;}.horm-codex-assistant h3{font-size:15px!important;}',
      '.horm-codex-assistant ul,.horm-codex-assistant ol{padding-left:22px!important;margin:8px 0 12px!important;}',
      '.horm-codex-assistant li{margin:4px 0!important;}',
      '.horm-codex-assistant blockquote{margin:10px 0!important;padding:8px 0 8px 14px!important;border-left:2px solid rgba(204,90,55,0.45)!important;color:#5f6368!important;background:transparent!important;}',
      '.dark .horm-codex-assistant blockquote{color:#bdc1c6!important;}',
      '.horm-codex-assistant pre{position:relative!important;margin:12px 0!important;padding:12px 14px!important;max-height:520px!important;overflow:auto!important;border:1px solid rgba(128,128,128,0.18)!important;border-radius:8px!important;background:#0f1115!important;color:#f1f5f9!important;box-shadow:none!important;}',
      '.horm-codex-assistant pre code{display:block!important;padding:0!important;background:transparent!important;border:0!important;color:inherit!important;font-size:12.5px!important;line-height:1.58!important;font-family:"JetBrains Mono","Cascadia Code",Consolas,monospace!important;}',
      '.horm-codex-assistant code:not(pre code){font-family:"JetBrains Mono","Cascadia Code",Consolas,monospace!important;font-size:12.5px!important;line-height:1.4!important;background:rgba(0,0,0,0.06)!important;border:1px solid rgba(0,0,0,0.08)!important;border-radius:5px!important;padding:1px 5px!important;}',
      '.dark .horm-codex-assistant code:not(pre code){background:rgba(255,255,255,0.08)!important;border-color:rgba(255,255,255,0.1)!important;}',
      '.horm-codex-assistant table{width:100%!important;border-collapse:collapse!important;margin:12px 0!important;font-size:13px!important;}',
      '.horm-codex-assistant th,.horm-codex-assistant td{border:1px solid rgba(128,128,128,0.2)!important;padding:7px 9px!important;text-align:left!important;}',
      '.horm-codex-assistant th{background:rgba(128,128,128,0.08)!important;font-weight:700!important;}',
      '.horm-codex-assistant details{margin:8px 0!important;}',
      '.horm-codex-assistant .horm-copy-btn{margin-top:10px!important;border-radius:8px!important;font-family:"IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;letter-spacing:0!important;text-transform:none!important;font-size:11px!important;padding:4px 9px!important;}',
      '.horm-codex-user{max-width:min(72%,680px)!important;margin-left:auto!important;border-radius:8px!important;padding:10px 14px!important;box-shadow:none!important;font-family:"IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;font-size:14px!important;line-height:1.55!important;letter-spacing:0!important;}',
      '.horm-codex-user .horm-codex-meta{display:none!important;}',
      '@media (max-width:760px){.horm-codex-row-assistant{padding:14px 14px!important;}.horm-codex-row-user{padding:8px 12px!important;}.horm-codex-assistant{width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;}.horm-codex-user{max-width:88%!important;}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function isUnsafeUrl(attrName, value) {
    var raw = String(value || '').trim();
    if (!raw || raw[0] === '#' || raw[0] === '/' || raw.indexOf('./') === 0 || raw.indexOf('../') === 0) return false;
    if (/^data:image\/(?:png|gif|jpe?g|webp|svg\+xml);/i.test(raw) && /^(src|href|xlink:href)$/i.test(attrName)) return false;
    return !/^(https?:|mailto:)/i.test(raw);
  }

  function sanitizeGeneratedHtml(container) {
    var blocked = container.querySelectorAll('script,style,iframe,object,embed,link,meta,base,form');
    for (var i = 0; i < blocked.length; i++) blocked[i].remove();

    var nodes = container.querySelectorAll('*');
    for (var n = 0; n < nodes.length; n++) {
      var attrs = Array.prototype.slice.call(nodes[n].attributes || []);
      for (var a = 0; a < attrs.length; a++) {
        var name = attrs[a].name;
        var value = attrs[a].value || '';
        if (/^on/i.test(name) || name === 'srcdoc' || name === 'style') {
          nodes[n].removeAttribute(name);
          continue;
        }
        if (/^(href|src|xlink:href)$/i.test(name) && isUnsafeUrl(name, value)) {
          nodes[n].removeAttribute(name);
        }
      }
      if (nodes[n].tagName === 'A') {
        nodes[n].setAttribute('rel', 'noopener noreferrer');
        if (/^https?:/i.test(nodes[n].getAttribute('href') || '')) nodes[n].setAttribute('target', '_blank');
      }
    }
  }

  function hasMarkdown(raw) {
    return raw.indexOf('```') !== -1 ||
      raw.indexOf('#') !== -1 ||
      raw.indexOf('**') !== -1 ||
      raw.indexOf('- ') !== -1 ||
      raw.indexOf('1. ') !== -1 ||
      raw.indexOf('| ') !== -1 ||
      raw.indexOf('`') !== -1;
  }

  function classText(el) {
    return (el && el.className ? String(el.className) : '');
  }

  function skipMessage(el) {
    return !el ||
      el.closest('#horm-usage-widget,.session-item,#horm-search-overlay,#horm-session-history') ||
      el.closest('form') ||
      el.querySelector('.session-item');
  }

  function isUserMessage(el) {
    var cls = classText(el);
    var parentCls = classText(el.parentElement);
    return /bg-claude-accent|god-mode-user-bubble|from-indigo|to-purple|text-white/.test(cls) ||
      /justify-end|items-end/.test(parentCls);
  }

  function brandedModelName(value) {
    var text = String(value || '').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F\u200D]/gu, '').trim();
    var pairs = [
      [/pollinations-free|pollinations ai|claude opus micro \(free\)/i, 'Hormachuelos (free)'],
      [/openrouter-free|openrouter|claude opus code \(free\)/i, 'OpenRouter (free)'],
      [/\bopencode\b|claude opus flash/i, 'OpenCode'],
      [/deepseek-v4-flash|claude opus plus/i, 'DeepSeek V4 Flash'],
      [/deepseek-v4-pro|claude opus max coding/i, 'DeepSeek V4 Pro']
    ];
    for (var i = 0; i < pairs.length; i++) {
      if (pairs[i][0].test(text)) return pairs[i][1];
    }
    return text;
  }

  function modelLabel() {
    try {
      var settings = JSON.parse(localStorage.getItem('opus8-desktop-settings') || '{}');
      if (settings.selectedModel) return brandedModelName(settings.selectedModel);
    } catch (e) {}
    var modelBtn = document.querySelector('button[title="Select AI Model"], button[title*="Model" i]');
    var text = modelBtn ? (modelBtn.textContent || '').replace(/[^\w\s.-]/g, ' ').replace(/\s+/g, ' ').trim() : '';
    return (text && /[a-z0-9]/i.test(text) && text.length > 2) ? brandedModelName(text) : 'AI model';
  }

  function ensureAssistantMeta(msg) {
    var meta = msg.querySelector(':scope > .horm-codex-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'horm-codex-meta';
      meta.innerHTML = '<span class="horm-codex-avatar" aria-hidden="true"></span><span class="horm-codex-model"></span><span class="horm-codex-role">reply</span>';
      msg.insertBefore(meta, msg.firstChild);
    }
    var model = meta.querySelector('.horm-codex-model');
    if (model) model.textContent = modelLabel();
  }

  function upgradeMessage(msg) {
    if (skipMessage(msg)) return;
    var txt = (msg.textContent || '').trim();
    if (txt.length < 1 && !msg.querySelector('pre,details,code')) return;

    var row = msg.parentElement;
    if (row && row.classList) {
      row.classList.toggle('horm-codex-row-user', isUserMessage(msg));
      row.classList.toggle('horm-codex-row-assistant', !isUserMessage(msg));
    }

    if (isUserMessage(msg)) {
      msg.classList.add('horm-codex-user');
      msg.classList.remove('horm-codex-assistant');
      return;
    }

    msg.classList.add('horm-codex-assistant');
    msg.classList.remove('horm-codex-user');
    ensureAssistantMeta(msg);
  }

  function scanReplyLayout(root) {
    injectCodexReplyStyles();
    var scope = root && root.querySelectorAll ? root : document;
    var bubbles = [];
    var seen = [];
    if (scope.matches && (scope.matches('.max-w-\\[80\\%\\]') || classText(scope).indexOf('max-w-[80%]') !== -1)) {
      bubbles.push(scope);
      seen.push(scope);
    }
    var found = scope.querySelectorAll('.max-w-\\[80\\%\\], [class*="max-w-[80%]"]');
    for (var i = 0; i < found.length; i++) {
      if (seen.indexOf(found[i]) === -1) {
        bubbles.push(found[i]);
        seen.push(found[i]);
      }
    }
    for (var b = 0; b < bubbles.length; b++) upgradeMessage(bubbles[b]);
  }

  function scheduleReplyLayout(root) {
    pendingScanRoot = root && root.querySelectorAll ? root : document;
    if (scanTimer) return;
    scanTimer = setTimeout(function() {
      var target = pendingScanRoot || document;
      pendingScanRoot = null;
      scanTimer = 0;
      scanReplyLayout(target);
    }, 80);
  }

  window.applyCodexReplyLayout = function(root) {
    scanReplyLayout(root || document);
  };

  window.renderMarkdownInMessage = function(msg) {
    scanReplyLayout(msg || document);
    if (typeof marked === 'undefined') return;
    if (msg.dataset.hormMdRendered) return;

    var contentEl = msg.querySelector('p.whitespace-pre-wrap') || msg.querySelector('.whitespace-pre-wrap');
    if (!contentEl || contentEl.dataset.hormMdRendered) return;
    if (contentEl.querySelector('.streaming-cursor, .cursor-blink, [class*="cursor"]')) return;
    var fullText = contentEl.textContent || '';
    if (!fullText || fullText.trim().length < 10) return;
    if (!hasMarkdown(fullText)) return;

    contentEl.dataset.hormMdRendered = 'true';
    msg.dataset.hormMdRendered = 'true';
    msg.classList.add('horm-md');

    try {
      marked.setOptions({
        breaks: true,
        gfm: true,
        highlight: function(code, lang) {
          if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
            try { return hljs.highlight(code, { language: lang }).value; } catch(e) {}
          }
          if (typeof hljs !== 'undefined') {
            try { return hljs.highlightAuto(code).value; } catch(e) {}
          }
          return escapeHtml(code);
        }
      });
      var html = marked.parse(fullText);
      var container = document.createElement('div');
      container.innerHTML = html;
      sanitizeGeneratedHtml(container);
      contentEl.replaceWith.apply(contentEl, Array.prototype.slice.call(container.childNodes));
      scanReplyLayout(msg);
    } catch(e) {
      console.warn('Markdown render failed:', e);
    }
  };

  function bootCodexReplyLayout() {
    if (observerStarted) return;
    observerStarted = true;
    scanReplyLayout(document);

    if (window.__horm && typeof window.__horm.onDomChange === 'function') {
      window.__horm.onDomChange(function() { scheduleReplyLayout(document); });
      return;
    }

    var obs = new MutationObserver(function(records) {
      for (var i = 0; i < records.length; i++) {
        for (var n = 0; n < records[i].addedNodes.length; n++) {
          var node = records[i].addedNodes[n];
          if (node && node.nodeType === 1) {
            scheduleReplyLayout(node);
            return;
          }
        }
      }
      scheduleReplyLayout(document);
    });
    var start = function() {
      if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }

  bootCodexReplyLayout();
})();
