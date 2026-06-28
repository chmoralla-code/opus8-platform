(function() {
  'use strict';

  var STYLE_ID = 'horm-sidebar-drawer-style';
  var BUTTON_ID = 'horm-sidebar-menu-button';
  var OVERLAY_ID = 'horm-sidebar-overlay';
  var CONTEXT_ID = 'horm-sidebar-context';
  var scheduled = false;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#horm-sidebar-menu-button{position:fixed!important;left:12px!important;top:14px!important;z-index:90!important;width:38px!important;height:34px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border:1px solid var(--horm-line,rgba(128,128,128,.28))!important;border-radius:8px!important;background:var(--horm-panel,#fff)!important;color:var(--horm-text,#111)!important;box-shadow:0 8px 24px rgba(0,0,0,.16)!important;cursor:pointer!important;}',
      '#horm-sidebar-menu-button span,#horm-sidebar-menu-button::before,#horm-sidebar-menu-button::after{content:""!important;display:block!important;width:16px!important;height:2px!important;border-radius:999px!important;background:currentColor!important;position:absolute!important;left:10px!important;transition:transform .18s ease,opacity .18s ease!important;}',
      '#horm-sidebar-menu-button span{top:16px!important;}#horm-sidebar-menu-button::before{top:10px!important;}#horm-sidebar-menu-button::after{top:22px!important;}',
      'body.horm-sidebar-open #horm-sidebar-menu-button::before{transform:translateY(6px) rotate(45deg)!important;}body.horm-sidebar-open #horm-sidebar-menu-button span{opacity:0!important;}body.horm-sidebar-open #horm-sidebar-menu-button::after{transform:translateY(-6px) rotate(-45deg)!important;}',
      '#horm-sidebar-overlay{position:fixed!important;inset:0!important;z-index:58!important;background:rgba(0,0,0,.38)!important;backdrop-filter:blur(2px)!important;}',
      'body:not(.horm-sidebar-open) #horm-sidebar-overlay{display:none!important;}',
      'body.horm-sidebar-drawer-ready aside{position:fixed!important;left:0!important;top:52px!important;bottom:0!important;z-index:65!important;width:264px!important;max-width:min(84vw,300px)!important;transform:translateX(-110%)!important;transition:transform .22s ease!important;border-right:1px solid var(--horm-line,rgba(128,128,128,.28))!important;box-shadow:18px 0 42px rgba(0,0,0,.24)!important;}',
      'body.horm-sidebar-drawer-ready.horm-sidebar-open aside{transform:translateX(0)!important;}',
      'body.horm-sidebar-drawer-ready main{margin-left:0!important;width:100%!important;}',
      'body.horm-sidebar-drawer-ready header{padding-left:54px!important;}',
      'body.horm-sidebar-drawer-ready aside .p-4,body.horm-sidebar-drawer-ready aside [class*="p-4"]{padding-top:22px!important;}',
      '.horm-header-context-hidden{flex:1 1 auto!important;min-width:0!important;}',
      '.horm-header-context-hidden>*{display:none!important;}',
      '#horm-sidebar-context{display:flex!important;flex-direction:column!important;gap:8px!important;margin:0 0 14px!important;padding:10px!important;border:1px solid var(--horm-line,rgba(128,128,128,.24))!important;border-radius:8px!important;background:var(--horm-soft,rgba(128,128,128,.055))!important;}',
      '#horm-sidebar-context .horm-sidebar-context-label{font:700 9px/1 "IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:var(--horm-muted,#8f8f8f)!important;}',
      '#horm-sidebar-context button{width:100%!important;min-height:30px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;padding:7px 9px!important;border:1px solid var(--horm-line,rgba(128,128,128,.22))!important;border-radius:8px!important;background:var(--horm-panel,#151515)!important;color:var(--horm-text,#f2f2ef)!important;font:600 12px/1.25 "IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;text-align:left!important;cursor:pointer!important;}',
      '#horm-sidebar-context button:hover{background:var(--horm-panel-2,rgba(128,128,128,.10))!important;}',
      '#horm-sidebar-context button span:first-child{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;}',
      '#horm-sidebar-context button span:last-child{font-size:10px!important;font-weight:600!important;color:var(--horm-muted,#9a9a9a)!important;opacity:.84!important;}',
      '@media (max-width:760px){#horm-sidebar-menu-button{top:10px!important;left:10px!important;}body.horm-sidebar-drawer-ready aside{top:48px!important;width:min(86vw,300px)!important;}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function textOf(node) {
    return String(node && (node.textContent || node.innerText) || '').trim();
  }

  function stripUiIconText(text) {
    return String(text || '')
      .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F\u200D]/gu, '')
      .replace(/[▼▲▾▴]/g, '')
      .replace(/^[\s+＋]+(?=\S)/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function brandedModelName(value) {
    var text = stripUiIconText(value);
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

  function modelFromComposerPlaceholder() {
    var textareas = document.querySelectorAll('textarea[placeholder]');
    for (var i = 0; i < textareas.length; i++) {
      var placeholder = String(textareas[i].getAttribute('placeholder') || '');
      var match = placeholder.match(/(?:Ask|Tell)\s+(.+?)\s+(?:to code|what to build|to build)/i);
      if (match && match[1]) return stripUiIconText(match[1]);
    }
    return '';
  }

  function findHeaderLeftGroup() {
    var header = document.querySelector('header');
    if (!header) return null;
    var inner = header.querySelector(':scope > div') || header.firstElementChild;
    if (!inner || !inner.children || inner.children.length < 1) return null;
    var left = inner.firstElementChild;
    if (!left || !/Claude Opus|Hormachuelos|OpenRouter|OpenCode|DeepSeek|Cyrhiel|Add file path/i.test(textOf(left))) return null;
    return left;
  }

  function findWorkspaceButton() {
    var header = document.querySelector('header');
    if (!header) return null;
    var buttons = header.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      if (/\bCyrhiel\b|\bAdd file path\b/i.test(stripUiIconText(textOf(buttons[i])))) return buttons[i];
    }
    return null;
  }

  function findModelButton() {
    var buttons = document.querySelectorAll('button[title*="Select AI Model" i]');
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].offsetParent !== null || buttons[i].getClientRects().length > 0) return buttons[i];
    }
    return buttons[0] || null;
  }

  function readHeaderContext() {
    var left = findHeaderLeftGroup();
    var workspaceButton = findWorkspaceButton();
    var model = '';
    if (left) {
      var parts = [];
      for (var i = 0; i < left.children.length; i++) {
        var child = left.children[i];
        if (child === workspaceButton) continue;
        var value = stripUiIconText(textOf(child));
        if (/Claude Opus|Hormachuelos|OpenRouter|OpenCode|DeepSeek/i.test(value)) parts.push(value);
      }
      model = parts.join(' ').replace(/\s+/g, ' ').trim();
    }
    if (!model) {
      var modelButton = findModelButton();
      model = stripUiIconText(textOf(modelButton));
    }
    if (!/Claude Opus|Hormachuelos|OpenRouter|OpenCode|DeepSeek/i.test(model)) model = modelFromComposerPlaceholder();
    var workspace = stripUiIconText(textOf(workspaceButton));
    return {
      model: brandedModelName(model || 'Hormachuelos (free)'),
      workspace: workspace || 'Add file path',
      workspaceButton: workspaceButton
    };
  }

  function hideHeaderContext() {
    var left = findHeaderLeftGroup();
    if (left) left.classList.add('horm-header-context-hidden');
  }

  function ensureDrawerContext() {
    var aside = document.querySelector('aside');
    if (!aside) return;
    var body = aside.querySelector('.p-4,[class*="p-4"]') || aside.firstElementChild || aside;
    var context = document.getElementById(CONTEXT_ID);
    if (!context) {
      context = document.createElement('div');
      context.id = CONTEXT_ID;
      context.innerHTML = [
        '<div class="horm-sidebar-context-label">Current setup</div>',
        '<button type="button" data-horm-drawer-model><span></span><span>Model</span></button>',
        '<button type="button" data-horm-drawer-workspace><span></span><span>Folder</span></button>'
      ].join('');
      var first = body.firstElementChild;
      if (first && first.nextSibling) body.insertBefore(context, first.nextSibling);
      else body.insertBefore(context, body.firstChild);
    }

    var info = readHeaderContext();
    var model = context.querySelector('[data-horm-drawer-model]');
    var workspace = context.querySelector('[data-horm-drawer-workspace]');
    if (model) {
      model.querySelector('span').textContent = info.model;
      model.title = info.model;
      model.onclick = function() {
        var target = findModelButton();
        if (target) target.click();
      };
    }
    if (workspace) {
      workspace.querySelector('span').textContent = info.workspace;
      workspace.title = info.workspace;
      workspace.onclick = function() {
        var target = findWorkspaceButton();
        if (target) target.click();
      };
    }
  }

  function ensureButton() {
    var button = document.getElementById(BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.title = 'Open menu';
      button.setAttribute('aria-label', 'Open menu');
      button.innerHTML = '<span></span>';
      button.addEventListener('click', function() { toggleSidebar(); });
      document.body.appendChild(button);
    }
    button.setAttribute('aria-expanded', document.body.classList.contains('horm-sidebar-open') ? 'true' : 'false');
  }

  function ensureOverlay() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.addEventListener('click', function() { closeSidebar(); });
      document.body.appendChild(overlay);
    }
  }

  function closeSidebar() {
    document.body.classList.remove('horm-sidebar-open');
    try { localStorage.setItem('horm-sidebar-open', '0'); } catch (e) {}
    ensureButton();
  }

  function openSidebar() {
    document.body.classList.add('horm-sidebar-open');
    try { localStorage.setItem('horm-sidebar-open', '1'); } catch (e) {}
    ensureButton();
  }

  function toggleSidebar() {
    if (document.body.classList.contains('horm-sidebar-open')) closeSidebar();
    else openSidebar();
  }

  function scan() {
    scheduled = false;
    injectStyles();
    if (!document.querySelector('aside')) return;
    document.body.classList.add('horm-sidebar-drawer-ready');
    hideHeaderContext();
    ensureDrawerContext();
    ensureButton();
    ensureOverlay();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(scan, 100);
  }

  window.__hormSidebarDrawer = {
    scan: scan,
    open: openSidebar,
    close: closeSidebar,
    toggle: toggleSidebar,
    readHeaderContext: readHeaderContext,
    ensureDrawerContext: ensureDrawerContext
  };

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && document.body.classList.contains('horm-sidebar-open')) closeSidebar();
  });
  if (window.__horm && typeof window.__horm.onDomChange === 'function') window.__horm.onDomChange(schedule);
  else if (document.body) new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
})();
