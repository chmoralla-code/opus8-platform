(function() {
  'use strict';

  var STYLE_ID = 'horm-product-polish-style';
  var scheduled = false;
  var rememberedToolRows = {};

  function injectStyles() {
    var style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
    }
    style.textContent = [
      'html body .horm-codex-assistant.horm-codex-assistant.horm-codex-assistant.horm-codex-assistant.horm-codex-assistant.horm-codex-assistant{padding:0!important;margin:0!important;border:0!important;background:transparent!important;box-shadow:none!important;}',
      '.session-item{position:relative!important;}',
      '.session-item button[title="Rename session"]{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:42px!important;height:22px!important;padding:0 7px!important;border:1px solid var(--horm-line,rgba(128,128,128,.24))!important;border-radius:999px!important;background:var(--horm-panel,transparent)!important;color:var(--horm-text,currentColor)!important;opacity:1!important;font:600 10px/1 "IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;text-decoration:none!important;}',
      '.session-item button[title="Delete session"]{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:22px!important;height:22px!important;border:1px solid var(--horm-line,rgba(128,128,128,.24))!important;border-radius:999px!important;background:transparent!important;color:var(--horm-muted,currentColor)!important;opacity:1!important;text-decoration:none!important;}',
      '.session-item button[title="Rename session"]:hover,.session-item button[title="Delete session"]:hover{background:var(--horm-panel-2,rgba(128,128,128,.08))!important;color:var(--horm-text,currentColor)!important;}',
      '.horm-history-btn,#horm-session-panel,#horm-session-badge,.horm-history-disabled{display:none!important;}',
      '.horm-kbd-hint,.horm-agentic-toggle{display:none!important;visibility:hidden!important;pointer-events:none!important;}',
      '.horm-duplicate-reply,.horm-duplicate-summary{display:none!important;}',
      '.horm-duplicate-tool-row,.horm-tool-progress-echo,.horm-raw-tool-result,.horm-empty-assistant,.horm-empty-row{display:none!important;}',
      '.horm-system-summary-leak{display:none!important;}',
      '.horm-clean-summary{border:1px solid var(--horm-line,rgba(128,128,128,.2))!important;border-radius:8px!important;background:var(--horm-soft,rgba(128,128,128,.06))!important;padding:8px 10px!important;color:var(--horm-muted,currentColor)!important;}',
      '.gem-code-panel-label span::after{content:" - visible tool details";font-weight:500;opacity:.68;margin-left:4px;}',
      '.gem-code-panel pre,.horm-inline-tool-row pre{max-height:340px!important;}',
      '.horm-inline-tool-row,.gem-tool-row{font-family:"IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;}',
      '.horm-active-tool-row{position:relative!important;overflow:hidden!important;}',
      '.horm-active-tool-row::after{content:""!important;position:absolute!important;inset:0!important;pointer-events:none!important;background:linear-gradient(110deg,transparent 0%,rgba(255,255,255,.10) 45%,rgba(255,255,255,.22) 50%,rgba(255,255,255,.10) 55%,transparent 100%)!important;transform:translateX(-120%)!important;animation:horm-write-sweep 1.6s ease-in-out infinite!important;}',
      '.dark .horm-active-tool-row::after{background:linear-gradient(110deg,transparent 0%,rgba(255,255,255,.08) 45%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.08) 55%,transparent 100%)!important;}',
      '.horm-tool-action{display:inline-flex!important;align-items:center!important;gap:5px!important;font-weight:700!important;color:var(--horm-text,currentColor)!important;}',
      '.horm-wave-dots{display:inline-flex!important;align-items:flex-end!important;gap:2px!important;height:10px!important;}',
      '.horm-wave-dots span{display:block!important;width:3px!important;height:3px!important;border-radius:999px!important;background:currentColor!important;opacity:.45!important;animation:horm-dot-wave 1.05s ease-in-out infinite!important;}',
      '.horm-wave-dots span:nth-child(2){animation-delay:.14s!important;}.horm-wave-dots span:nth-child(3){animation-delay:.28s!important;}',
      '.horm-model-brand{display:inline-flex!important;align-items:center!important;gap:6px!important;}',
      '.horm-model-brand::before{content:attr(data-horm-brand)!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:18px!important;height:18px!important;border:1px solid var(--horm-line,rgba(128,128,128,.28))!important;border-radius:6px!important;background:var(--horm-panel-2,rgba(128,128,128,.10))!important;color:var(--horm-text,currentColor)!important;font:800 8px/1 "IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;letter-spacing:0!important;}',
      '#horm-offline-screen{position:fixed!important;inset:0!important;z-index:100000!important;display:flex!important;align-items:center!important;justify-content:center!important;background:var(--horm-bg,#101010)!important;color:var(--horm-text,#f2f2ef)!important;}',
      '#horm-offline-screen[hidden]{display:none!important;}',
      '.horm-offline-card{display:flex!important;flex-direction:column!important;align-items:center!important;gap:12px!important;text-align:center!important;font-family:"IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;}',
      '.horm-offline-spinner{width:34px!important;height:34px!important;border-radius:999px!important;border:2px solid var(--horm-line,rgba(128,128,128,.25))!important;border-top-color:var(--horm-text,currentColor)!important;animation:horm-spin 1s linear infinite!important;}',
      '.horm-offline-title{font-size:18px!important;font-weight:800!important;letter-spacing:0!important;text-transform:none!important;}',
      '.horm-offline-subtitle{font-size:12px!important;color:var(--horm-muted,#aaa)!important;}',
      '@media (prefers-reduced-motion:reduce){.horm-active-tool-row::after,.horm-wave-dots span,.horm-offline-spinner{animation:none!important;}}',
      '.horm-chatbox-region{display:block!important;visibility:visible!important;opacity:1!important;min-height:164px!important;flex:0 0 auto!important;position:relative!important;z-index:6!important;background:var(--horm-panel,#fff)!important;}',
      '.horm-chatbox-shell{display:flex!important;flex-direction:column!important;gap:10px!important;visibility:visible!important;opacity:1!important;min-height:132px!important;border-color:var(--horm-line,rgba(128,128,128,.26))!important;background:var(--horm-panel,#171717)!important;box-shadow:none!important;outline:0!important;--tw-ring-offset-shadow:0 0 #0000!important;--tw-ring-shadow:0 0 #0000!important;--tw-shadow:0 0 #0000!important;}',
      '.horm-chatbox-shell:hover,.horm-chatbox-shell:focus,.horm-chatbox-shell:focus-within,.horm-chatbox-shell:focus-visible{border-color:var(--horm-line,rgba(128,128,128,.26))!important;box-shadow:none!important;outline:0!important;--tw-ring-offset-shadow:0 0 #0000!important;--tw-ring-shadow:0 0 #0000!important;--tw-shadow:0 0 #0000!important;}',
      '.horm-chatbox-textarea,.horm-chatbox-textarea:focus,.horm-chatbox-textarea:focus-visible{display:block!important;visibility:visible!important;opacity:1!important;width:100%!important;min-height:68px!important;border:1px solid var(--horm-line,rgba(128,128,128,.26))!important;border-radius:8px!important;padding:12px 14px!important;outline:0!important;box-shadow:none!important;background:var(--horm-bg,#0f0f0f)!important;color:var(--horm-text,#f2f2ef)!important;caret-color:var(--horm-text,#f2f2ef)!important;resize:none!important;}',
      '.horm-chatbox-textarea::placeholder{color:var(--horm-muted,#aaa9a4)!important;opacity:1!important;}',
      '.horm-chatbox-shell button:focus,.horm-chatbox-shell button:focus-visible{outline:0!important;box-shadow:none!important;}',
      '.horm-hidden-icon{display:none!important;}',
      '.horm-clean-label{font-size:0!important;}',
      '.horm-clean-label>*{font-size:0!important;}',
      '.horm-clean-label>svg{display:none!important;}',
      '.horm-clean-label::after{content:attr(data-horm-label)!important;font:600 12px/1 "IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;}',
      '@keyframes horm-write-sweep{0%{transform:translateX(-120%);}55%,100%{transform:translateX(120%);}}',
      '@keyframes horm-dot-wave{0%,80%,100%{transform:translateY(0);opacity:.38;}40%{transform:translateY(-4px);opacity:1;}}',
      '@keyframes horm-spin{to{transform:rotate(360deg);}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function installDomSafetyPatches() {
    var proto = window.Node && window.Node.prototype;
    if (!proto || proto.__hormSafeDomPatched) return;
    proto.__hormSafeDomPatched = true;
    var removeChild = proto.removeChild;
    var insertBefore = proto.insertBefore;

    proto.removeChild = function(child) {
      if (child && child.parentNode !== this) return child;
      return removeChild.call(this, child);
    };

    proto.insertBefore = function(newNode, referenceNode) {
      if (referenceNode && referenceNode.parentNode !== this) referenceNode = null;
      return insertBefore.call(this, newNode, referenceNode);
    };
  }

  function textOf(node) {
    return String(node && (node.innerText || node.textContent) || '').trim();
  }

  function normalize(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\b/gi, '')
      .trim()
      .toLowerCase();
  }

  var TOOL_NAME_RE = /(read_file|write_file|edit_file|append_file|delete_file|read_json|list_dir|list_directory|glob_search|grep_search|search_files|find_files|run_command|execute_shell|web_search|web_fetch|fetch_url|open_url|download_file|serve_directory|open_browser|preview_path|preview_url|create_project|spawn_agent|ruflo_memory_store|ruflo_memory_search|ruflo_agent_spawn|ruflo_web_search|ruflo_task_create|system_info|list_processes|kill_process|clipboard_read|clipboard_write|screenshot|zip_directory|unzip_archive|notify|get_env|set_env|check_port|find_open_port|git_init|git_commit|list_tools)/;
  var TOOL_VERB_RE = /(writing file|reading file|editing file|appending file|deleting file|reading json|listing(?: directory)?|searching(?: files| code| web| memory)?|glob(?:bing)?|grep(?:ping)?|running command|executing command|fetching(?: url| page)?|opening(?: url| browser)?|downloading|starting server|preview(?:ing)?|running agent|spawning agent|storing memory|creating task|inspecting system|listing processes|killing process|reading clipboard|writing clipboard|taking screenshot|capturing screenshot|zipping|unzipping|notifying|reading env|reading environment|setting env|setting environment|checking port|finding open port|using git)/;

  function toolNameFromText(text) {
    var match = normalize(text).match(TOOL_NAME_RE);
    return match ? match[1] : '';
  }

  function hasToolSignal(text) {
    var raw = normalize(text);
    return TOOL_NAME_RE.test(raw) || TOOL_VERB_RE.test(raw);
  }

  var MODEL_BRANDS = [
    { match: /pollinations-free|pollinations ai|hormachuelos(?:\s*\(free\))*|claude opus micro(?:\s*\(free\))*/i, replace: /\b(?:pollinations-free|pollinations ai|hormachuelos(?:\s*\(free\))*|claude opus micro(?:\s*\(free\))*)\b/ig, label: 'Hormachuelos (free)', brand: 'H' },
    { match: /openrouter-free|openrouter(?:\s*\(free\))*|claude opus code(?:\s*\(free\))*/i, replace: /\b(?:openrouter-free|openrouter(?:\s*\(free\))*|claude opus code(?:\s*\(free\))*)\b/ig, label: 'OpenRouter (free)', brand: 'OR' },
    { match: /\bopencode\b|claude opus flash/i, replace: /\b(?:opencode|claude opus flash)\b/ig, label: 'OpenCode', brand: 'OC' },
    { match: /deepseek-v4-flash|claude opus plus/i, replace: /\b(?:deepseek-v4-flash|claude opus plus)\b/ig, label: 'DeepSeek V4 Flash', brand: 'DS' },
    { match: /deepseek-v4-pro|claude opus max coding/i, replace: /\b(?:deepseek-v4-pro|claude opus max coding)\b/ig, label: 'DeepSeek V4 Pro', brand: 'DS' }
  ];

  function brandedModelName(value) {
    var text = String(value || '').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F\u200D]/gu, '').trim();
    for (var i = 0; i < MODEL_BRANDS.length; i++) {
      if (MODEL_BRANDS[i].match.test(text)) return MODEL_BRANDS[i];
    }
    return null;
  }

  function replaceModelText(raw) {
    var text = String(raw || '');
    for (var i = 0; i < MODEL_BRANDS.length; i++) {
      text = text.replace(MODEL_BRANDS[i].replace || MODEL_BRANDS[i].match, MODEL_BRANDS[i].label);
    }
    return text
      .replace(/\b(OpenRouter|Hormachuelos)\s*\(free\)(?:\s*\(free\))+/ig, '$1 (free)')
      .replace(/(?:\bOpenRouter\s*\(free\)\s*){2,}/ig, 'OpenRouter (free) ')
      .replace(/(?:\bHormachuelos\s*\(free\)\s*){2,}/ig, 'Hormachuelos (free) ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function activeModelLabel() {
    try {
      var settings = JSON.parse(localStorage.getItem('opus8-desktop-settings') || '{}');
      var brand = brandedModelName(settings.selectedModel);
      if (brand) return brand.label;
    } catch (e) {}
    var candidates = document.querySelectorAll('button[title="Select AI Model"], button[title*="Model" i], .horm-codex-model');
    for (var i = 0; i < candidates.length; i++) {
      var text = replaceModelText(textOf(candidates[i]));
      if (text && !/^ai model$/i.test(text) && /Hormachuelos|OpenRouter|OpenCode|DeepSeek/i.test(text)) return text;
    }
    return 'Hormachuelos (free)';
  }

  function isToolOrMeta(node) {
    return !!(node && node.closest('pre,code,button,summary,details,.gem-code-panel,.horm-inline-tool-row,.horm-codex-meta,.horm-copy-btn'));
  }

  function stripSystemSummaryLeak(text) {
    return String(text || '')
      .replace(/\[What I did in my previous turn\]:[\s\S]*?\[End of previous turn summary\]/gi, '')
      .replace(/What I did in my previous turn:[\s\S]*?End of previous turn summary/gi, '')
      .trim();
  }

  function cleanupLeafText(el) {
    if (!el || el.dataset.hormTextCleanup === '1' || el.children.length > 0 || isToolOrMeta(el)) return;
    var raw = String(el.textContent || '');
    var cleaned = stripSystemSummaryLeak(raw);
    if (cleaned !== raw.trim()) {
      if (cleaned) el.textContent = cleaned;
      else el.classList.add('horm-system-summary-leak');
    }
    el.dataset.hormTextCleanup = '1';
  }

  function dedupeSentences(el) {
    if (!el || el.dataset.hormSentenceDedupe === '1' || el.children.length > 0 || isToolOrMeta(el)) return;
    var raw = textOf(el);
    if (raw.length < 40) return;
    var parts = raw.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    if (!parts || parts.length < 2) return;
    var seen = {};
    var kept = [];
    for (var i = 0; i < parts.length; i++) {
      var piece = parts[i].replace(/\s+/g, ' ').trim();
      var key = normalize(piece);
      if (!key || seen[key]) continue;
      seen[key] = true;
      kept.push(piece);
    }
    if (kept.length > 0 && kept.length < parts.length) {
      el.textContent = kept.join(' ');
    }
    el.dataset.hormSentenceDedupe = '1';
  }

  function isSystemSummaryLeak(el) {
    return /\bwhat i did in my previous turn\b|\bend of previous turn summary\b/i.test(textOf(el));
  }

  function looksLikeTechnicalSummary(el) {
    var text = normalize(textOf(el)).replace(/^[^a-z0-9]+/i, '');
    if (!text) return false;
    if (/\bdone summary\b/i.test(text)) return true;
    if (text.indexOf('summary') === 0) return true;
    if (/^(done|finished|complete|completed|created|updated|built)\b/.test(text) && /\b(file|files|tool|tools|preview|website|app|game|opened|live)\b/.test(text)) return true;
    if (/\b(here'?s what'?s included|what'?s included|included:|files created|tools used|live at|preview ready)\b/.test(text)) return true;
    return /\bsummary\b.*\b(file|files|tool|tools|command|commands|created|updated|modified|changed|generated|wrote|executed|read|ok|failed)\b/.test(text);
  }

  function looksLikeRawToolResult(el) {
    var raw = textOf(el).trim();
    if (!raw || raw.length > 800 || raw[0] !== '{' || raw[raw.length - 1] !== '}') return false;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
      return Object.prototype.hasOwnProperty.call(parsed, 'success') &&
        (Object.prototype.hasOwnProperty.call(parsed, 'previewable') ||
          Object.prototype.hasOwnProperty.call(parsed, 'url') ||
          Object.prototype.hasOwnProperty.call(parsed, 'path') ||
          Object.keys(parsed).length <= 4);
    } catch (e) {
      return false;
    }
  }

  function hideIfEmptyAssistant(message) {
    if (!message || !message.childNodes) return;
    var ignored = '.horm-codex-meta,.horm-copy-btn,.horm-duplicate-summary,.horm-duplicate-reply,.horm-duplicate-tool-row,.horm-tool-progress-echo,.horm-raw-tool-result,.horm-system-summary-leak,button';
    function useful(node) {
      if (!node) return false;
      if (node.nodeType === 3) return !!normalize(node.nodeValue || '');
      if (node.nodeType !== 1) return false;
      if (node.matches && node.matches(ignored)) return false;
      if (node.closest && node.closest(ignored)) return false;
      if (node.matches && node.matches('iframe,img,canvas,svg')) return true;
      for (var i = 0; i < node.childNodes.length; i++) {
        if (useful(node.childNodes[i])) return true;
      }
      return false;
    }
    var hasUseful = false;
    for (var c = 0; c < message.childNodes.length; c++) {
      if (useful(message.childNodes[c])) {
        hasUseful = true;
        break;
      }
    }
    message.classList.toggle('horm-empty-assistant', !hasUseful);
    if (message.parentElement && message.parentElement !== document.body) {
      message.parentElement.classList.toggle('horm-empty-row', !hasUseful);
    }
  }

  function summaryKey(el) {
    var text = normalize(textOf(el)).replace(/^[^a-z0-9]+/i, '');
    if (/\bdone summary\b/i.test(text)) return 'done-summary';
    if (/\b(here'?s what'?s included|what'?s included|included:)\b/i.test(text)) return 'included-summary';
    if (/\blive at\b|\bpreview ready\b/i.test(text)) return 'preview-summary';
    if (text.indexOf('summary') === 0) return 'technical-summary';
    return text
      .replace(/https?:\/\/\S+/g, 'url')
      .replace(/\b\d+\b/g, 'n')
      .slice(0, 110);
  }

  function parseJsonish(raw) {
    try { return JSON.parse(String(raw || '').trim()); } catch (e) { return null; }
  }

  function targetFromToolRow(row) {
    var blocks = row.querySelectorAll('pre,code');
    for (var i = 0; i < blocks.length; i++) {
      var parsed = parseJsonish(textOf(blocks[i]));
      if (!parsed || typeof parsed !== 'object') continue;
      var target = parsed.path || parsed.filePath || parsed.file || parsed.dirPath || parsed.sourceDir || parsed.outputPath ||
        parsed.zipPath || parsed.destDir || parsed.url || parsed.command || parsed.cmd || parsed.query || parsed.task ||
        parsed.title || parsed.key || parsed.pattern || parsed.dir || parsed.filter || parsed.pid || parsed.port || parsed.startPort;
      if (target) return String(target);
    }
    var titleNode = row.querySelector('[title]');
    return titleNode ? String(titleNode.getAttribute('title') || '').trim() : '';
  }

  function looksLikeToolRow(row) {
    if (!row || row.closest('.gem-code-panel,pre,code,summary')) return false;
    var owningDetails = row.closest('details');
    if (owningDetails && owningDetails !== row) return false;
    if (row === document.body || row === document.documentElement) return false;
    var text = normalize(textOf(row));
    if (!text) return false;
    return hasToolSignal(text);
  }

  function toolHeaderText(row) {
    var header = row.firstElementChild || row;
    var clone = header.cloneNode(true);
    var discard = clone.querySelectorAll('button,pre,code,.mt-1,[class*="mt-1"],.horm-tool-progress-echo');
    for (var i = 0; i < discard.length; i++) discard[i].remove();
    return normalize(textOf(clone))
      .replace(/\b(show|hide)\b/g, '')
      .replace(/\s*\.\s*\.\s*\.\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function toolRowKey(row) {
    var header = toolHeaderText(row);
    var tool = toolNameFromText(header);
    var verb = (header.match(TOOL_VERB_RE) || [])[1] || '';
    var target = targetFromToolRow(row);
    return [tool || verb || header, target || header].join(':');
  }

  function rememberToolRow(row, key, localSeen) {
    if (!key || !row || !row.dataset) return;
    if (row.dataset.hormToolPrimary === '1') {
      localSeen[key] = true;
      return;
    }
    if (localSeen[key] || rememberedToolRows[key]) {
      row.classList.add('horm-duplicate-tool-row');
      localSeen[key] = true;
      return;
    }
    row.dataset.hormToolPrimary = '1';
    rememberedToolRows[key] = true;
    localSeen[key] = true;
  }

  function toolActionLabel(text) {
    var raw = normalize(text);
    if (/write_file|writing file/.test(raw)) return 'Writing';
    if (/read_file|reading file/.test(raw)) return 'Reading';
    if (/edit_file|editing file/.test(raw)) return 'Editing';
    if (/append_file|appending file/.test(raw)) return 'Appending';
    if (/delete_file|deleting file/.test(raw)) return 'Deleting';
    if (/read_json|reading json/.test(raw)) return 'Reading JSON';
    if (/list_dir|list_directory|listing/.test(raw)) return 'Listing';
    if (/glob_search|grep_search|search_files|find_files|web_search|ruflo_web_search|ruflo_memory_search|searching|grep|glob|web search/.test(raw)) return 'Searching';
    if (/run_command|execute_shell|running command|executing command/.test(raw)) return 'Running';
    if (/web_fetch|fetch_url|fetching/.test(raw)) return 'Fetching';
    if (/download_file|downloading/.test(raw)) return 'Downloading';
    if (/serve_directory|starting server/.test(raw)) return 'Starting';
    if (/open_url|open_browser|opening url|opening browser/.test(raw)) return 'Opening';
    if (/preview_path|preview_url|preview/.test(raw)) return 'Previewing';
    if (/create_project/.test(raw)) return 'Scaffolding';
    if (/spawn_agent|ruflo_agent_spawn|running agent|spawning agent/.test(raw)) return 'Spawning agent';
    if (/ruflo_memory_store|storing memory/.test(raw)) return 'Storing memory';
    if (/ruflo_task_create|creating task/.test(raw)) return 'Creating task';
    if (/system_info|inspecting system/.test(raw)) return 'Inspecting system';
    if (/list_processes|listing processes/.test(raw)) return 'Listing processes';
    if (/kill_process|killing process/.test(raw)) return 'Killing process';
    if (/clipboard_read|reading clipboard/.test(raw)) return 'Reading clipboard';
    if (/clipboard_write|writing clipboard/.test(raw)) return 'Writing clipboard';
    if (/screenshot|taking screenshot|capturing screenshot/.test(raw)) return 'Capturing';
    if (/zip_directory|zipping/.test(raw)) return 'Zipping';
    if (/unzip_archive|unzipping/.test(raw)) return 'Unzipping';
    if (/notify|notifying/.test(raw)) return 'Notifying';
    if (/get_env|reading env|reading environment/.test(raw)) return 'Reading env';
    if (/set_env|setting env|setting environment/.test(raw)) return 'Setting env';
    if (/check_port|checking port/.test(raw)) return 'Checking port';
    if (/find_open_port|finding open port/.test(raw)) return 'Finding port';
    if (/git_init|git_commit/.test(raw)) return 'Using git';
    return 'Working';
  }

  function decorateToolAction(row) {
    if (!row) return;
    if (row.dataset.hormToolActionReady === '1' && row.querySelector('.horm-tool-action .horm-wave-dots')) return;
    var label = toolActionLabel(toolHeaderText(row) || textOf(row));
    var candidates = row.querySelectorAll('span,div,summary');
    var target = null;
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (el.closest('pre,code,.gem-code-panel') || el.querySelector('pre,code')) continue;
      if (el.children && el.children.length > 0) continue;
      var raw = normalize(textOf(el));
      if (!raw) continue;
      if (hasToolSignal(raw)) {
        target = el;
        break;
      }
    }
    if (!target) {
      var host = row.querySelector('summary') || row.firstElementChild || row;
      target = document.createElement('span');
      host.insertBefore(target, host.firstChild || null);
    }
    target.classList.add('horm-tool-action');
    target.textContent = label + '...';
    var dots = document.createElement('span');
    dots.className = 'horm-wave-dots';
    dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = '<span></span><span></span><span></span>';
    target.appendChild(dots);
    row.dataset.hormToolActionReady = '1';
  }

  function hideToolProgressEcho(row) {
    var nodes = row.querySelectorAll('div,span');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.classList && el.classList.contains('horm-tool-action')) continue;
      if (el === row || el.querySelector('pre,code')) continue;
      var text = normalize(textOf(el)).replace(/\s+/g, ' ').trim();
      if (!text) continue;
      var hasDots = el.querySelector('.wave-dots,[class*="wave-dots"]') || /\.{2,}$/.test(text);
      var isProgress = TOOL_VERB_RE.test(text) || hasToolSignal(text);
      if (hasDots && isProgress) el.classList.add('horm-tool-progress-echo');
    }
  }

  function stripUiIconText(text) {
    return String(text || '')
      .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F\u200D]/gu, '')
      .replace(/^[\s+＋]+(?=\S)/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function controlsIn(scope) {
    var root = scope && scope.querySelectorAll ? scope : document;
    var nodes = [];
    if (root.matches && root.matches('button,[role="button"],a,span,div')) nodes.push(root);
    var found = root.querySelectorAll ? root.querySelectorAll('button,[role="button"],a,span,div') : [];
    for (var i = 0; i < found.length; i++) nodes.push(found[i]);
    return nodes;
  }

  function removeIconChildren(control) {
    if (!control || control.dataset.hormIconsRemoved === '1') return;
    var icons = control.querySelectorAll(':scope > svg');
    for (var i = 0; i < icons.length; i++) icons[i].classList.add('horm-hidden-icon');
    var kids = control.children || [];
    for (var k = 0; k < kids.length; k++) {
      var child = kids[k];
      var clean = stripUiIconText(textOf(child));
      var isField = child.matches && child.matches('input,textarea,select,[contenteditable="true"]');
      var hasField = isField || (child.querySelector && child.querySelector('input,textarea,select,[contenteditable="true"]'));
      if (!clean && !hasField) child.classList.add('horm-hidden-icon');
    }
    control.dataset.hormIconsRemoved = '1';
  }

  function setButtonText(button, label) {
    if (!button || button.dataset.hormCleanLabel === label) return;
    button.classList.add('horm-clean-label');
    button.setAttribute('data-horm-label', label);
    button.setAttribute('aria-label', label);
    button.dataset.hormCleanLabel = label;
  }

  function cleanupToolbarChrome(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var historyNodes = [];
    if (scope.matches && scope.matches('.horm-history-btn,#horm-session-panel,#horm-session-badge')) historyNodes.push(scope);
    var foundHistory = scope.querySelectorAll ? scope.querySelectorAll('.horm-history-btn,#horm-session-panel,#horm-session-badge') : [];
    for (var h = 0; h < foundHistory.length; h++) historyNodes.push(foundHistory[h]);
    for (var hn = 0; hn < historyNodes.length; hn++) historyNodes[hn].classList.add('horm-history-disabled');

    var controls = controlsIn(scope);
    for (var i = 0; i < controls.length; i++) {
      var el = controls[i];
      var raw = textOf(el);
      var title = String(el.getAttribute && el.getAttribute('title') || '');
      if (!raw && !title) continue;

      if (el.matches && el.matches('button,[role="button"],a') && (/\bHistory\b/i.test(raw) || /saved sessions/i.test(title))) {
        el.classList.add('horm-history-disabled');
        continue;
      }

      if (el.matches && el.matches('button,[role="button"],a')) {
        if (/new chat session/i.test(title) || /\bNew Session\b/i.test(raw)) {
          setButtonText(el, 'New Session');
          continue;
        }
        if (/^\s*(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F\u200D]+\s*)?Send\s*$/u.test(raw) || (/\bSend\b/i.test(raw) && el.querySelector('svg'))) {
          setButtonText(el, 'Send');
          continue;
        }
        if (/Toggle live preview/i.test(title) || /\bPreview\b/i.test(raw)) {
          setButtonText(el, 'Preview');
          continue;
        }
        if (/Toggle integrated terminal/i.test(title) || /\bTerminal\b/i.test(raw)) {
          setButtonText(el, 'Terminal');
          continue;
        }
        if (/\b(Light|Dark)\b/i.test(raw) && !/\bPreview\b|\bTerminal\b/i.test(raw)) {
          setButtonText(el, stripUiIconText(raw));
          continue;
        }
        if (/Select AI Model/i.test(title) || /Claude Opus/i.test(raw)) {
          removeIconChildren(el);
          continue;
        }
        if (/\bCyrhiel\b|\bAdd file path\b/i.test(raw)) {
          removeIconChildren(el);
          continue;
        }
      } else if (/Claude Opus/i.test(raw) || /\bCyrhiel\b|\bAdd file path\b/i.test(raw)) {
        removeIconChildren(el);
      }
    }
  }

  function applyModelBranding(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = [];
    if (scope.matches && scope.matches('button,span,div,h1,h2,h3,h4,p,label,small,textarea,.horm-codex-model')) nodes.push(scope);
    var found = scope.querySelectorAll ? scope.querySelectorAll('button,span,div,h1,h2,h3,h4,p,label,small,textarea,.horm-codex-model') : [];
    for (var f = 0; f < found.length; f++) nodes.push(found[f]);

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.matches && node.matches('textarea')) {
        var placeholder = node.getAttribute('placeholder') || '';
        var brandedPlaceholder = replaceModelText(placeholder);
        if (brandedPlaceholder && brandedPlaceholder !== placeholder) node.setAttribute('placeholder', brandedPlaceholder);
        continue;
      }

      var raw = textOf(node);
      if (/^ai model$/i.test(normalize(raw)) && ((node.matches && node.matches('.horm-codex-model')) || (node.closest && node.closest('.horm-codex-assistant')))) {
        var active = activeModelLabel();
        var activeBrand = brandedModelName(active);
        if (activeBrand) {
          node.classList.add('horm-model-brand');
          node.setAttribute('data-horm-brand', activeBrand.brand);
        }
        node.textContent = active;
        continue;
      }
      var brand = brandedModelName(raw);
      if (!brand) continue;
      if (node.closest && node.closest('pre,code,.gem-code-panel')) continue;
      if (node.children && node.children.length > 0 && !(node.matches && node.matches('button,.horm-codex-model'))) continue;

      if (node.matches && node.matches('button,[role="button"],.horm-codex-model')) {
        node.classList.add('horm-model-brand');
        node.setAttribute('data-horm-brand', brand.brand);
      }

      if (node.matches && node.matches('.horm-clean-label')) {
        node.setAttribute('data-horm-label', replaceModelText(node.getAttribute('data-horm-label') || raw));
      } else if (node.children && node.children.length > 0) {
        var leaves = node.querySelectorAll('span,div');
        for (var l = 0; l < leaves.length; l++) {
          if (leaves[l].children.length > 0) continue;
          var next = replaceModelText(leaves[l].textContent || '');
          if (next && next !== (leaves[l].textContent || '').trim()) leaves[l].textContent = next;
        }
      } else {
        var clean = replaceModelText(node.textContent || '');
        if (clean && clean !== (node.textContent || '').trim()) node.textContent = clean;
      }
    }
  }

  var forcedOffline = null;
  var offlineTimerStarted = false;

  function ensureOfflineScreen() {
    var screen = document.getElementById('horm-offline-screen');
    if (screen) return screen;
    screen = document.createElement('div');
    screen.id = 'horm-offline-screen';
    screen.hidden = true;
    screen.setAttribute('role', 'status');
    screen.setAttribute('aria-live', 'polite');
    screen.innerHTML = [
      '<div class="horm-offline-card">',
      '<div class="horm-offline-spinner" aria-hidden="true"></div>',
      '<div class="horm-offline-title">No internet</div>',
      '<div class="horm-offline-subtitle">Waiting for connection<span class="horm-wave-dots" aria-hidden="true"><span></span><span></span><span></span></span></div>',
      '</div>'
    ].join('');
    document.body.appendChild(screen);
    return screen;
  }

  async function detectOffline() {
    if (forcedOffline !== null) return forcedOffline;
    if (navigator && navigator.onLine === false) return true;
    try {
      if (window.opus8 && typeof window.opus8.getInternetStatus === 'function') {
        var status = await window.opus8.getInternetStatus();
        return !!(status && status.online === false);
      }
    } catch (e) {}
    return false;
  }

  function updateOfflineScreen() {
    var screen = ensureOfflineScreen();
    detectOffline().then(function(offline) {
      screen.hidden = !offline;
      document.body.classList.toggle('horm-offline', !!offline);
    });
  }

  function installOfflineWatcher() {
    ensureOfflineScreen();
    if (offlineTimerStarted) return;
    offlineTimerStarted = true;
    window.addEventListener('online', updateOfflineScreen);
    window.addEventListener('offline', updateOfflineScreen);
    setInterval(updateOfflineScreen, 8000);
    updateOfflineScreen();
  }

  function buttonText(button) {
    return normalize((button && (button.getAttribute('title') || '') || '') + ' ' + textOf(button));
  }

  function hasComposerAction(node) {
    if (!node || !node.querySelectorAll) return false;
    var buttons = node.querySelectorAll('button,[role="button"]');
    for (var i = 0; i < buttons.length; i++) {
      if (/\b(send|cancel|new session|select ai model|show actions|voice command|stop voice)\b/i.test(buttonText(buttons[i]))) return true;
    }
    return false;
  }

  function findComposerShell(textarea) {
    var node = textarea && textarea.parentElement;
    var hops = 0;
    while (node && node !== document.body && hops < 5) {
      if (node.querySelector && node.querySelector('textarea') && hasComposerAction(node)) return node;
      node = node.parentElement;
      hops++;
    }
    return textarea ? textarea.parentElement : null;
  }

  function findComposerRegion(shell) {
    var node = shell && shell.parentElement;
    var hops = 0;
    while (node && node !== document.body && hops < 3) {
      if (node.querySelector && node.querySelector('textarea') && hasComposerAction(node)) return node;
      node = node.parentElement;
      hops++;
    }
    return shell ? shell.parentElement : null;
  }

  function enhanceChatbox(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var textareas = [];
    if (scope.matches && scope.matches('textarea')) textareas.push(scope);
    var found = scope.querySelectorAll ? scope.querySelectorAll('textarea') : [];
    for (var i = 0; i < found.length; i++) textareas.push(found[i]);

    for (var t = 0; t < textareas.length; t++) {
      var textarea = textareas[t];
      var placeholder = String(textarea.getAttribute('placeholder') || '');
      if (textarea.id === 'terminal-input') continue;
      if (!/ask|tell|coordinate|build|code/i.test(placeholder) && !hasComposerAction(textarea.parentElement)) continue;

      textarea.classList.add('horm-chatbox-textarea');
      textarea.removeAttribute('aria-hidden');

      var shell = findComposerShell(textarea);
      if (shell) {
        shell.classList.add('horm-chatbox-shell');
        shell.removeAttribute('aria-hidden');
      }

      var region = findComposerRegion(shell);
      if (region) {
        region.classList.add('horm-chatbox-region');
        region.removeAttribute('aria-hidden');
      }
    }
  }

  function removeConfusingChrome(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = [];
    if (scope.matches && scope.matches('.horm-kbd-hint,.horm-agentic-toggle')) nodes.push(scope);
    var found = scope.querySelectorAll ? scope.querySelectorAll('.horm-kbd-hint,.horm-agentic-toggle') : [];
    for (var i = 0; i < found.length; i++) nodes.push(found[i]);
    for (var n = 0; n < nodes.length; n++) {
      nodes[n].classList.add('horm-history-disabled');
      nodes[n].setAttribute('aria-hidden', 'true');
      nodes[n].style.display = 'none';
    }
  }

  function outerToolRow(row) {
    var node = row;
    while (node && node.parentElement && node.parentElement !== document.body) {
      var parent = node.parentElement;
      if (parent.matches && parent.matches('.horm-codex-assistant,details')) break;
      if (parent.matches && parent.matches('.horm-inline-tool-row,[data-tool-call-id],[data-tool-name],div.text-xs,div[class*="text-xs"],div[class*="tool"],li[class*="tool"]') && hasToolSignal(textOf(parent))) {
        node = parent;
        continue;
      }
      break;
    }
    return node || row;
  }

  function cleanupToolRows(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var containers = [];
    if (scope.matches && scope.matches('.horm-codex-assistant')) containers.push(scope);
    var messages = scope.querySelectorAll ? scope.querySelectorAll('.horm-codex-assistant') : [];
    for (var i = 0; i < messages.length; i++) containers.push(messages[i]);
    if (containers.length === 0) containers.push(scope);

    var seen = {};
    var detailRows = scope.querySelectorAll ? scope.querySelectorAll('details.gem-tool-row,details.group,.horm-codex-assistant details') : [];
    for (var d = 0; d < detailRows.length; d++) {
      if (!looksLikeToolRow(detailRows[d])) continue;
      detailRows[d].classList.add('horm-active-tool-row');
      decorateToolAction(detailRows[d]);
      hideToolProgressEcho(detailRows[d]);
      rememberToolRow(detailRows[d], toolRowKey(detailRows[d]), seen);
    }

    for (var c = 0; c < containers.length; c++) {
      var candidates = containers[c].querySelectorAll('.horm-inline-tool-row,[data-tool-call-id],[data-tool-name],div.text-xs,div[class*="text-xs"],div[class*="tool"],li[class*="tool"]');
      var visitedRows = [];
      for (var r = 0; r < candidates.length; r++) {
        var row = outerToolRow(candidates[r]);
        if (visitedRows.indexOf(row) !== -1) continue;
        visitedRows.push(row);
        var parentToolRow = row.parentElement && row.parentElement.closest('.horm-inline-tool-row,.horm-active-tool-row');
        if (parentToolRow && parentToolRow !== row && !(parentToolRow.classList && parentToolRow.classList.contains('horm-codex-assistant'))) continue;
        if (!looksLikeToolRow(row)) continue;
        row.classList.add('horm-inline-tool-row');
        row.classList.add('horm-active-tool-row');
        decorateToolAction(row);
        hideToolProgressEcho(row);
        var key = toolRowKey(row);
        rememberToolRow(row, key, seen);
      }
    }
  }

  function cleanupAssistantReplies(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var messages = [];
    if (scope.matches && scope.matches('.horm-codex-assistant')) messages.push(scope);
    var found = scope.querySelectorAll ? scope.querySelectorAll('.horm-codex-assistant') : [];
    for (var i = 0; i < found.length; i++) messages.push(found[i]);

    for (var m = 0; m < messages.length; m++) {
      var seen = {};
      var summaryKeys = {};
      var nodes = messages[m].querySelectorAll('p,li,div,pre,code');
      for (var n = 0; n < nodes.length; n++) {
        var el = nodes[n];
        if (looksLikeRawToolResult(el)) {
          el.classList.add('horm-raw-tool-result');
          continue;
        }
        if (isToolOrMeta(el)) continue;
        cleanupLeafText(el);
        if (isSystemSummaryLeak(el)) {
          el.classList.add('horm-system-summary-leak');
          continue;
        }
        var text = textOf(el);
        var key = normalize(text);
        if (!key) continue;

        if (looksLikeTechnicalSummary(el)) {
          var sk = summaryKey(el);
          if (summaryKeys[sk] || Object.keys(summaryKeys).length > 0) el.classList.add('horm-duplicate-summary');
          else {
            summaryKeys[sk] = true;
            el.classList.add('horm-clean-summary');
          }
          continue;
        }

        if ((el.matches('p,li') || el.children.length === 0) && key.length > 34) {
          if (seen[key]) el.classList.add('horm-duplicate-reply');
          else seen[key] = true;
          dedupeSentences(el);
        }
      }
      hideIfEmptyAssistant(messages[m]);
    }
  }

  function enhanceSessionNames(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var sessions = [];
    if (scope.matches && scope.matches('.session-item')) sessions.push(scope);
    var found = scope.querySelectorAll ? scope.querySelectorAll('.session-item') : [];
    for (var i = 0; i < found.length; i++) sessions.push(found[i]);

    for (var s = 0; s < sessions.length; s++) {
      var session = sessions[s];
      var rename = session.querySelector('button[title="Rename session"]');
      if (rename) {
        var label = textOf(rename);
        if (!label || label === '\u270e') rename.textContent = 'Rename';
        rename.setAttribute('aria-label', 'Rename session');
      }
      if (session.dataset.hormRenameReady === '1') continue;
      session.dataset.hormRenameReady = '1';
      session.title = (session.title ? session.title + ' - ' : '') + 'double-click to rename';
      session.addEventListener('dblclick', function(event) {
        var actionButton = event.target && event.target.closest ? event.target.closest('button') : null;
        if (actionButton && actionButton !== this) return;
        var btn = this.querySelector('button[title="Rename session"]');
        if (!btn) return;
        event.preventDefault();
        event.stopPropagation();
        btn.click();
      });
    }
  }

  function scan(root) {
    scheduled = false;
    installDomSafetyPatches();
    injectStyles();
    if (typeof window.applyCodexReplyLayout === 'function') {
      try { window.applyCodexReplyLayout(root || document); } catch (e) {}
    }
    enhanceSessionNames(root || document);
    enhanceChatbox(root || document);
    cleanupToolbarChrome(root || document);
    applyModelBranding(root || document);
    installOfflineWatcher();
    removeConfusingChrome(root || document);
    cleanupToolRows(root || document);
    cleanupAssistantReplies(root || document);
  }

  function schedule(root) {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function() { scan(root || document); }, 100);
  }

  window.__hormProductPolish = {
    scan: scan,
    enhanceSessionNames: enhanceSessionNames,
    enhanceChatbox: enhanceChatbox,
    cleanupToolbarChrome: cleanupToolbarChrome,
    applyModelBranding: applyModelBranding,
    setOfflineForTest: function(value) { forcedOffline = value === null ? null : !!value; updateOfflineScreen(); },
    updateOfflineScreen: updateOfflineScreen,
    removeConfusingChrome: removeConfusingChrome,
    cleanupToolRows: cleanupToolRows,
    cleanupAssistantReplies: cleanupAssistantReplies
  };

  if (window.__horm && typeof window.__horm.onDomChange === 'function') window.__horm.onDomChange(function() { schedule(document); });
  else {
    var obs = new MutationObserver(function(records) {
      for (var i = 0; i < records.length; i++) {
        for (var n = 0; n < records[i].addedNodes.length; n++) {
          var node = records[i].addedNodes[n];
          if (node && node.nodeType === 1) {
            schedule(node);
            return;
          }
        }
      }
      schedule(document);
    });
    if (document.body) obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function() { schedule(document); });
  else schedule(document);
})();
