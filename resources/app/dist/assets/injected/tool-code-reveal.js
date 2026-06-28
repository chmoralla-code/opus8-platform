(function() {
  'use strict';

  var STYLE_ID = 'horm-tool-code-style';
  var SCHEDULED = false;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.horm-tool-code-toggle{display:none!important;}',
      'details.gem-tool-row,details.group,.horm-codex-assistant details{open:true;}',
      'details.gem-tool-row>summary,details.group>summary,.horm-codex-assistant details>summary{cursor:default!important;}',
      'details.gem-tool-row,details.group{margin:10px 0 0!important;padding:10px 12px!important;border:1px solid var(--horm-line,rgba(128,128,128,.18))!important;border-left:2px solid var(--horm-line,rgba(128,128,128,.28))!important;border-radius:8px!important;background:var(--horm-soft,rgba(128,128,128,.06))!important;box-shadow:none!important;}',
      'details.gem-tool-row>summary,details.group>summary{display:block!important;font:600 12px/1.45 "IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif!important;color:var(--horm-text,currentColor)!important;list-style:none!important;}',
      'details.gem-tool-row>summary::-webkit-details-marker,details.group>summary::-webkit-details-marker{display:none!important;}',
      '.gem-code-panel{display:block!important;margin:8px 0 0;padding:0;border:1px solid rgba(255,255,255,.09);border-radius:7px;overflow:hidden;background:#0f1115;}',
      '.gem-code-panel.open{display:block!important;}',
      '.gem-code-panel-label{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.08);font:600 11px/1.3 "IBM Plex Sans","Aptos","Segoe UI Variable","Segoe UI",system-ui,sans-serif;color:#c9d1d9;background:#151922;}',
      '.gem-code-panel pre{margin:0!important;max-height:460px!important;overflow:auto!important;border:0!important;border-radius:0!important;padding:11px 12px!important;white-space:pre-wrap!important;word-break:break-word!important;background:#0f1115!important;color:#f7f7f4!important;}',
      '.gem-code-panel code{font:12px/1.55 "JetBrains Mono","Cascadia Code",Consolas,monospace!important;background:transparent!important;border:0!important;padding:0!important;color:inherit!important;}',
      '.horm-tool-target{display:block!important;margin-top:3px!important;font:600 11px/1.35 "JetBrains Mono","Cascadia Code",Consolas,monospace!important;color:var(--horm-muted,#777)!important;word-break:break-all!important;}',
      '.horm-inline-tool-row{margin:10px 0 0!important;padding:10px 12px!important;border:1px solid var(--horm-line,rgba(128,128,128,.18))!important;border-left:2px solid var(--horm-line,rgba(128,128,128,.28))!important;border-radius:8px!important;background:var(--horm-soft,rgba(128,128,128,.06))!important;box-shadow:none!important;}',
      '.horm-inline-tool-row>.flex,.horm-inline-tool-row>[class*="flex"]{align-items:flex-start!important;gap:8px!important;}',
      '.horm-inline-tool-row button{display:none!important;}',
      '.horm-inline-tool-row pre{margin:5px 0 8px!important;max-height:460px!important;overflow:auto!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:7px!important;background:#0f1115!important;color:#f7f7f4!important;padding:11px 12px!important;font:12px/1.55 "JetBrains Mono","Cascadia Code",Consolas,monospace!important;white-space:pre-wrap!important;word-break:break-word!important;}',
      '.horm-inline-tool-row .mt-1,.horm-inline-tool-row [class*="mt-1"]{display:block!important;margin-top:8px!important;}',
      '.horm-inline-tool-row .opacity-60,.horm-inline-tool-row [class*="opacity-60"]{opacity:1!important;color:var(--horm-muted,#777)!important;font-weight:700!important;}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function textOf(node) {
    return (node && (node.innerText || node.textContent) || '').trim();
  }

  var TOOL_NAME_RE = /(read_file|write_file|edit_file|append_file|delete_file|read_json|list_dir|list_directory|glob_search|grep_search|search_files|find_files|run_command|execute_shell|web_search|web_fetch|fetch_url|open_url|download_file|serve_directory|open_browser|preview_path|preview_url|create_project|spawn_agent|ruflo_memory_store|ruflo_memory_search|ruflo_agent_spawn|ruflo_web_search|ruflo_task_create|system_info|list_processes|kill_process|clipboard_read|clipboard_write|screenshot|zip_directory|unzip_archive|notify|get_env|set_env|check_port|find_open_port|git_init|git_commit|list_tools)/i;
  var TOOL_VERB_RE = /(writing file|reading file|editing file|appending file|deleting file|reading json|listing(?: directory)?|searching(?: files| code| web| memory)?|glob(?:bing)?|grep(?:ping)?|running command|executing command|fetching(?: url| page)?|opening(?: url| browser)?|downloading|starting server|preview(?:ing)?|running agent|spawning agent|storing memory|creating task|inspecting system|listing processes|killing process|reading clipboard|writing clipboard|taking screenshot|capturing screenshot|zipping|unzipping|notifying|reading env|reading environment|setting env|setting environment|checking port|finding open port|using git)/i;

  function cleanCode(raw) {
    return String(raw || '')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()
      .slice(0, 24000);
  }

  function collectCode(details) {
    var chunks = [];
    var bodies = details.querySelectorAll('div.mt-1.space-y-1, .gem-content-preview-body, pre, code');
    for (var i = 0; i < bodies.length; i++) {
      if (bodies[i].closest('.gem-code-panel')) continue;
      var txt = textOf(bodies[i]);
      if (txt && chunks.indexOf(txt) === -1) chunks.push(txt);
    }
    if (chunks.length === 0) {
      var clone = details.cloneNode(true);
      var summary = clone.querySelector('summary');
      var panel = clone.querySelector('.gem-code-panel');
      if (summary) summary.remove();
      if (panel) panel.remove();
      var all = textOf(clone);
      if (all) chunks.push(all);
    }
    return cleanCode(chunks.join('\n\n---\n\n'));
  }

  function parseJsonish(raw) {
    try { return JSON.parse(String(raw || '').trim()); } catch (e) { return null; }
  }

  function toolName(details) {
    var text = textOf(details.querySelector('summary'));
    var known = text.match(TOOL_NAME_RE);
    return known ? known[1] : 'tool';
  }

  function targetSummary(details) {
    var codes = details.querySelectorAll('code, pre');
    for (var i = 0; i < codes.length; i++) {
      if (codes[i].closest('.gem-code-panel')) continue;
      var parsed = parseJsonish(textOf(codes[i]));
      if (!parsed || typeof parsed !== 'object') continue;
      var target = parsed.filePath || parsed.path || parsed.dirPath || parsed.sourceDir || parsed.outputPath ||
        parsed.zipPath || parsed.destDir || parsed.command || parsed.cmd || parsed.url || parsed.destPath ||
        parsed.projectName || parsed.query || parsed.task || parsed.title || parsed.key || parsed.pattern ||
        parsed.dir || parsed.filter || parsed.pid || parsed.port || parsed.startPort;
      if (target) return String(target);
    }
    return '';
  }

  function ensureTargetLine(details) {
    var summary = details.querySelector('summary');
    if (!summary || summary.querySelector('.horm-tool-target')) return;
    var target = targetSummary(details);
    if (!target) return;
    var line = document.createElement('span');
    line.className = 'horm-tool-target';
    line.textContent = toolName(details) + ': ' + target;
    summary.appendChild(line);
  }

  function enhance(details) {
    if (!details) return;
    var summary = details.querySelector('summary');
    if (!summary) return;
    details.open = true;
    ensureTargetLine(details);
    var code = collectCode(details);
    if (!code) return;

    var oldButton = summary.querySelector('.horm-tool-code-toggle');
    if (oldButton) oldButton.remove();

    var panel = details.querySelector(':scope > .gem-code-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'gem-code-panel open';
      panel.innerHTML = '<div class="gem-code-panel-label"><span>Tool execution / arguments / result</span></div><pre><code></code></pre>';
      details.appendChild(panel);
    }
    panel.classList.add('open');
    var codeEl = panel.querySelector('code');
    if (codeEl && codeEl.textContent !== code) codeEl.textContent = code;
    details.dataset.hormCodeReveal = '1';
  }

  function exactText(el) {
    return String(el && el.textContent || '').trim().toLowerCase();
  }

  function looksLikeInlineToolRow(row) {
    if (!row || row.closest('.gem-code-panel')) return false;
    if (row === document.body || row === document.documentElement) return false;
    var text = textOf(row);
    return TOOL_NAME_RE.test(text) && (TOOL_VERB_RE.test(text) || /\b(show|hide|arguments|result)\b/i.test(text));
  }

  function closestInlineToolRow(button) {
    var node = button ? button.parentElement : null;
    var candidate = null;
    for (var i = 0; node && i < 5; i++) {
      if (node.matches && node.matches('.horm-codex-assistant')) break;
      if (looksLikeInlineToolRow(node)) {
        candidate = node;
        if (node.matches && node.matches('.horm-inline-tool-row,[data-tool-call-id],[data-tool-name],div.text-xs,div[class*="text-xs"],div[class*="py-0.5"],div[class*="py-1"]')) break;
      }
      node = node.parentElement;
    }
    return candidate;
  }

  function expandInlineToolRows() {
    var buttons = document.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      var label = exactText(buttons[i]);
      if (label !== 'show' && label !== 'hide') continue;
      var row = closestInlineToolRow(buttons[i]);
      if (!row) continue;
      row.classList.add('horm-inline-tool-row');
      if (label === 'show') {
        try { buttons[i].click(); } catch (e) {}
      }
      buttons[i].textContent = '';
      buttons[i].setAttribute('aria-hidden', 'true');
      buttons[i].tabIndex = -1;
    }

    var rows = document.querySelectorAll('.horm-inline-tool-row');
    for (var r = 0; r < rows.length; r++) {
      var toggles = rows[r].querySelectorAll('button');
      for (var t = 0; t < toggles.length; t++) {
        if (exactText(toggles[t]) === 'show') {
          try { toggles[t].click(); } catch (e2) {}
        }
        if (exactText(toggles[t]) === 'show' || exactText(toggles[t]) === 'hide') {
          toggles[t].textContent = '';
          toggles[t].setAttribute('aria-hidden', 'true');
          toggles[t].tabIndex = -1;
        }
      }
    }
  }

  function scan() {
    SCHEDULED = false;
    injectStyles();
    var rows = document.querySelectorAll('details.gem-tool-row, details.group, .horm-codex-assistant details');
    for (var i = 0; i < rows.length; i++) enhance(rows[i]);
    expandInlineToolRows();
  }

  function schedule() {
    if (SCHEDULED) return;
    SCHEDULED = true;
    setTimeout(scan, 120);
  }

  window.__hormToolCodeReveal = { scan: scan };

  if (window.__horm && typeof window.__horm.onDomChange === 'function') window.__horm.onDomChange(schedule);
  else {
    var obs = new MutationObserver(schedule);
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
})();
