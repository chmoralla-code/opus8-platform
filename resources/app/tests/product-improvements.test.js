const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { _electron: electron } = require(path.resolve(__dirname, '../../../tests/node_modules/playwright'));
const electronPath = require('electron');

async function launchApp() {
  const app = await electron.launch({
    executablePath: electronPath,
    args: [path.resolve(__dirname, '..')],
    env: { ...process.env, HORMACHUELOS_PLAYWRIGHT: '1' },
  });
  const win = await app.firstWindow();
  await win.waitForSelector('#root > *', { timeout: 25000 });
  await win.waitForFunction(() => window.__hormToolCodeReveal && window.__hormAutoOpenPreview && window.__hormLivePreviewFix && window.__hormProductPolish && window.__hormSidebarDrawer, null, { timeout: 10000 });
  return { app, win };
}

test('main process keeps only one Hormachuelos software session active', () => {
  const mainJs = fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf8');
  const bundleJs = fs.readFileSync(path.resolve(__dirname, '../dist/assets/index-DfJVptcv.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.resolve(__dirname, '../dist/index.html'), 'utf8');
  assert.match(mainJs, /app\.requestSingleInstanceLock\(\)/);
  assert.match(mainJs, /const \{ app, BrowserWindow, ipcMain, dialog, shell, session, clipboard, Notification, Menu \} = require\('electron'\)/);
  assert.match(mainJs, /HORMACHUELOS_PLAYWRIGHT/);
  assert.match(mainJs, /app\.on\('second-instance'/);
  assert.match(mainJs, /mainWindow\.focus\(\)/);
  assert.match(mainJs, /function installApplicationMenu\(\)/);
  assert.match(mainJs, /Menu\.buildFromTemplate\(template\)/);
  assert.match(mainJs, /Open Workspace Manager/);
  assert.match(mainJs, /Copy Last AI Reply/);
  assert.match(mainJs, /Toggle Hamburger Drawer/);
  assert.match(mainJs, /Backend Proxy Status/);
  assert.doesNotMatch(mainJs, /TEMP DEBUG/);
  assert.doesNotMatch(mainJs, /DEBUG_RESULT/);
  assert.match(mainJs, /PORTABLE_EXECUTABLE_DIR/);
  assert.match(mainJs, /PORTABLE_EXECUTABLE_FILE/);
  assert.match(mainJs, /PROXY_HEALTH_URL = 'http:\/\/127\.0\.0\.1:8082\/health'/);
  assert.match(mainJs, /function findProxySourceDir\(\)/);
  assert.match(mainJs, /proxyStartPromise/);
  assert.match(mainJs, /fakeHome = normalized\.match/);
  assert.match(mainJs, /home\\\/\(\?:user\|runner\|sandbox\)/);
  assert.match(mainJs, /path\.resolve\(currentWorkingDir, fakeHome\[1\]/);
  assert.match(mainJs, /ipcMain\.handle\('system_info'/);
  assert.match(mainJs, /ipcMain\.handle\('append_file'/);
  assert.match(mainJs, /ipcMain\.handle\('check_port'/);
  assert.match(mainJs, /function findFilesByName\(/);
  assert.match(mainJs, /function globPatternToRegex\(/);
  assert.match(mainJs, /ipcMain\.handle\('internet_status'/);
  assert.match(bundleJs, /This desktop is Windows/);
  assert.match(bundleJs, /Use relative paths or the active workspace path/);
  assert.match(bundleJs, /use Windows cmd or PowerShell syntax/);
  assert.doesNotMatch(indexHtml, /Ctrl\+N new/);
  assert.match(indexHtml, /if \(hint\) hint\.remove\(\)/);
  assert.match(indexHtml, /return;\s*var btn = document\.createElement\('button'\)/);
});

test('monochrome theme, visible tool execution, and live preview helpers are active', async () => {
  const { app, win } = await launchApp();
  try {
    const menuSummary = await app.evaluate(({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      return menu.items.map((item) => ({
        label: item.label,
        submenu: item.submenu ? item.submenu.items.map((child) => ({
          label: child.label || child.role || child.type || '',
          accelerator: child.accelerator || '',
          type: child.type || '',
        })) : [],
      }));
    });
    const result = await win.evaluate(async () => {
      const opened = [];
      window.__hormAutoOpenPreview.setPreviewApiForTest({
        previewUrl: async (target) => opened.push(['previewUrl', target]),
        openExternal: async (target) => opened.push(['openExternal', target]),
        previewPath: async (target) => opened.push(['previewPath', target]),
        openPath: async (target) => opened.push(['openPath', target]),
      });

      const row = document.createElement('details');
      row.className = 'gem-tool-row';
      row.open = true;
      row.innerHTML = [
        '<summary><span class="tool-success-badge"><span>Writing file</span></span><span>write_file</span></summary>',
        '<div class="mt-1 space-y-1"><pre><code>{"filePath":"C:/Users/Cyrhiel/Pictures/demo/index.html","content":"&lt;h1&gt;Hello&lt;/h1&gt;"}</code></pre></div>',
      ].join('');
      document.body.appendChild(row);
      window.__hormToolCodeReveal.scan();

      const toggle = row.querySelector('.horm-tool-code-toggle');

      const inlineRow = document.createElement('div');
      inlineRow.className = 'text-xs py-0.5';
      inlineRow.innerHTML = [
        '<div class="flex items-center gap-2 flex-wrap">',
        '<span class="font-medium">Writing file</span>',
        '<span class="opacity-60 font-mono">write_file</span>',
        '<button type="button" class="ml-auto opacity-60 hover:opacity-100 underline select-none">Show</button>',
        '</div>',
      ].join('');
      inlineRow.querySelector('button').addEventListener('click', () => {
        if (inlineRow.querySelector('.mt-1')) return;
        const body = document.createElement('div');
        body.className = 'mt-1 space-y-1';
        body.innerHTML = '<div><div class="opacity-60 font-mono mb-0.5">Arguments:</div><pre>{"path":"C:/Users/Cyrhiel/Pictures/demo/index.html","content":"<h1>Hello</h1>"}</pre></div>';
        inlineRow.appendChild(body);
      });
      document.body.appendChild(inlineRow);
      window.__hormToolCodeReveal.scan();

      const toolAssistant = document.createElement('div');
      toolAssistant.className = 'horm-codex-assistant';
      const makeDuplicateToolRow = (verb = 'Writing file', tool = 'write_file') => {
        const item = document.createElement('div');
        item.className = 'text-xs py-0.5';
        item.innerHTML = [
          '<div class="flex items-center gap-2 flex-wrap">',
          `<span class="font-medium">${verb}</span>`,
          `<span class="opacity-60 font-mono">${tool}</span>`,
          '<button type="button" class="ml-auto opacity-60 hover:opacity-100 underline select-none">Show</button>',
          '</div>',
        ].join('');
        item.querySelector('button').addEventListener('click', () => {
          if (item.querySelector('.mt-1')) return;
          const body = document.createElement('div');
          body.className = 'mt-1 space-y-1';
          body.innerHTML = [
            '<div class="italic flex items-center gap-1">Writing file...<span class="wave-dots"><span></span><span></span><span></span></span></div>',
            '<div><div class="opacity-60 font-mono mb-0.5">Arguments:</div><pre>{"path":"C:/Users/Cyrhiel/Pictures/demo/tool-inline.html","content":"<h1>Hello</h1>"}</pre></div>',
          ].join('');
          item.appendChild(body);
        });
        return item;
      };
      const toolRowA = makeDuplicateToolRow();
      const toolRowB = makeDuplicateToolRow();
      const readToolRow = makeDuplicateToolRow('Reading file', 'read_file');
      const searchToolRow = makeDuplicateToolRow('Searching files', 'search_files');
      toolAssistant.appendChild(toolRowA);
      toolAssistant.appendChild(toolRowB);
      toolAssistant.appendChild(readToolRow);
      toolAssistant.appendChild(searchToolRow);
      document.body.appendChild(toolAssistant);
      window.__hormToolCodeReveal.scan();
      window.__hormProductPolish.scan(toolAssistant);

      const tempFile = 'C:/Users/Cyrhiel/AppData/Local/Temp/hormachuelos-specific-file-target.txt';
      await window.opus8.writeFile(tempFile, 'needle-for-hormachuelos-search');
      const oldCwd = await window.opus8.getCwd();
      await window.opus8.setCwd('C:/Users/Cyrhiel/AppData/Local/Temp');
      const fileSearch = await window.opus8.searchFiles('hormachuelos-specific-file-target.txt', 'C:/Users/Cyrhiel/AppData/Local/Temp', { nameOnly: true });
      const globSearch = await window.opus8.globSearch('hormachuelos-specific-file-target.txt', 'C:/Users/Cyrhiel/AppData/Local/Temp');
      const grepSearch = await window.opus8.grepSearch({ pattern: 'hormachuelos-specific-file-target.txt', basePath: 'C:/Users/Cyrhiel/AppData/Local/Temp', nameOnly: true });
      await window.opus8.setCwd(oldCwd);
      const fallbackFile = 'C:/Users/Cyrhiel/Pictures/hormachuelos-specific-file-target.txt';
      await window.opus8.writeFile(fallbackFile, 'needle-for-hormachuelos-search');
      const basenameRead = await window.opus8.readFile('hormachuelos-specific-file-target.txt');
      await window.opus8.deleteFile(tempFile);
      await window.opus8.deleteFile(fallbackFile);

      const msg = document.createElement('div');
      msg.textContent = 'Preview ready at http://localhost:4321 and docs at https://example.com';
      document.body.appendChild(msg);
      localStorage.setItem('horm-auto-opened-targets', JSON.stringify(['http://localhost:3000']));
      await window.__hormAutoOpenPreview.scanNow();

      const assistant = document.createElement('div');
      assistant.className = 'card max-w-[80%] horm-codex-assistant';
      assistant.innerHTML = '<p style="text-align:center">Centered text</p>';
      document.body.appendChild(assistant);
      window.applyCodexReplyLayout(assistant);

      const session = document.createElement('button');
      session.className = 'session-item';
      session.title = 'Snake game';
      session.innerHTML = '<span>Snake game</span><button title="Rename session" type="button"></button>';
      session.querySelector('button').textContent = '\u270e';
      let renameClicks = 0;
      session.querySelector('button').addEventListener('click', (event) => {
        event.stopPropagation();
        renameClicks += 1;
      });
      document.body.appendChild(session);
      window.__hormProductPolish.scan(session);
      session.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));

      const duplicateReply = document.createElement('div');
      duplicateReply.className = 'horm-codex-assistant';
      duplicateReply.innerHTML = [
        '<p>Created a complete Snake game and opened it for you.</p>',
        '<p>Created a complete Snake game and opened it for you.</p>',
        '<p>The game is ready. The game is ready. Use the arrow keys to play.</p>',
        '<div class="flex flex-col gap-1 py-1.5 lightning-border-green"><span>Done Summary</span><span>Snake game created and opened.</span></div>',
        '<div>Here is what is included: files created, preview ready, controls added.</div>',
        '<div>Here is what is included: files created, preview ready, controls added.</div>',
        '<div>Summary 2 files created 1 tool used</div>',
        '<div>Summary 2 files created 1 tool used</div>',
        '<pre>{"success":true,"previewable":true,"url":"http://127.0.0.1:3000/client-test.html","path":"client-test.html"}</pre>',
        '<p>[What I did in my previous turn]:\\n- Wrote snake.html\\n[End of previous turn summary]</p>',
      ].join('');
      document.body.appendChild(duplicateReply);
      window.__hormProductPolish.scan(duplicateReply);

      const rawOnlyReply = document.createElement('div');
      rawOnlyReply.className = 'horm-codex-assistant';
      rawOnlyReply.innerHTML = '<pre>{"success":true}</pre>';
      document.body.appendChild(rawOnlyReply);
      window.__hormProductPolish.scan(rawOnlyReply);

      const genericModelReply = document.createElement('div');
      genericModelReply.className = 'horm-codex-assistant';
      genericModelReply.innerHTML = '<span>AI Model</span><span>REPLY</span><p>Hello</p>';
      document.body.appendChild(genericModelReply);
      window.__hormProductPolish.scan(genericModelReply);

      const previewPane = document.createElement('div');
      previewPane.innerHTML = '<button title="Hide Preview"></button><div>Live Preview</div>';
      document.body.appendChild(previewPane);
      window.__hormLivePreviewFix.ensurePreview('http://127.0.0.1:7777/index.html');
      const previewWidth = window.__hormLivePreviewFix.setPreviewWidthForTest(540);
      const activePreviewPane = window.__hormLivePreviewFix.findPreviewPane();

      window.__hormSidebarDrawer.scan();
      const menuButton = document.getElementById('horm-sidebar-menu-button');
      const overlay = document.getElementById('horm-sidebar-overlay');
      const drawerContext = document.getElementById('horm-sidebar-context');
      const headerContext = document.querySelector('header .horm-header-context-hidden');
      const headerContextChildrenHidden = !!headerContext && Array.from(headerContext.children).length > 0 &&
        Array.from(headerContext.children).every((child) => getComputedStyle(child).display === 'none');
      const realButtons = Array.from(document.querySelectorAll('button'));
      const buttonText = (button) => (button.innerText || button.textContent || '').replace(/\s+/g, ' ').trim();
      window.__hormProductPolish.scan(document);
      window.__hormProductPolish.scan(document);
      const chatTextarea = Array.from(document.querySelectorAll('textarea')).find((textarea) => /ask|tell|coordinate|build|code/i.test(textarea.placeholder || '')) || document.querySelector('textarea');
      chatTextarea?.focus();
      const chatboxShell = chatTextarea?.closest('.horm-chatbox-shell');
      const chatboxRegion = chatTextarea?.closest('.horm-chatbox-region');
      const chatboxRect = chatTextarea?.getBoundingClientRect();
      const chatboxShellStyle = chatboxShell ? getComputedStyle(chatboxShell) : null;
      const chatboxTextareaStyle = chatTextarea ? getComputedStyle(chatTextarea) : null;
      const chatboxRegionStyle = chatboxRegion ? getComputedStyle(chatboxRegion) : null;
      menuButton.click();
      const sidebarOpenAfterClick = document.body.classList.contains('horm-sidebar-open');
      overlay.click();

      const toolbar = document.createElement('div');
      toolbar.id = 'horm-test-toolbar-cleanup';
      toolbar.innerHTML = [
        '<button id="horm-test-new-session" title="Start a new chat session">➕ New Session</button>',
        '<button id="horm-test-send">Send<svg width="12" height="12"><path d="M0 0h12v12H0z"></path></svg></button>',
        '<button id="horm-test-history" class="horm-history-btn" title="View saved sessions">📖 History</button>',
        '<button id="horm-test-model" title="Select AI Model"><svg width="12" height="12"><path d="M0 0h12v12H0z"></path></svg><span>Claude Opus Plus</span></button>',
        '<button id="horm-test-folder"><span>📂</span><span>Cyrhiel</span></button>',
        '<button id="horm-test-preview" title="Toggle live preview">🖥 Preview</button>',
        '<button id="horm-test-light">☀️ Light</button>',
      ].join('');
      document.body.appendChild(toolbar);
      window.__hormProductPolish.scan(toolbar);

      const syntheticComposer = document.createElement('div');
      syntheticComposer.id = 'horm-test-composer-cleanup';
      syntheticComposer.innerHTML = [
        '<div class="horm-chatbox-shell">',
        '<textarea placeholder="Ask Claude Opus Code (Free) to code..."></textarea>',
        '<div><button title="Select AI Model"><svg width="12" height="12"><path d="M0 0h12v12H0z"></path></svg><span>Claude Opus Code (Free)</span></button><button>Send</button></div>',
        '</div>',
      ].join('');
      document.body.appendChild(syntheticComposer);
      window.__hormProductPolish.scan(syntheticComposer);
      const syntheticPlaceholder = syntheticComposer.querySelector('textarea')?.placeholder || '';

      const noisyModelControl = document.createElement('button');
      noisyModelControl.title = 'Select AI Model';
      noisyModelControl.innerHTML = '<span>OpenRouter (free) (free) (free) (free)</span><span>▼</span>';
      document.body.appendChild(noisyModelControl);
      const noisyModelPlaceholder = document.createElement('textarea');
      noisyModelPlaceholder.setAttribute('placeholder', 'Ask OpenRouter (free) (free) (free) what to build...');
      document.body.appendChild(noisyModelPlaceholder);
      for (let n = 0; n < 8; n++) {
        window.__hormProductPolish.scan(noisyModelControl);
        window.__hormProductPolish.scan(noisyModelPlaceholder);
      }
      const noisyModelText = noisyModelControl.querySelector('span')?.textContent || '';
      const noisyModelFullText = noisyModelControl.textContent || '';
      const noisyModelFreeCount = (noisyModelFullText.match(/\(free\)/gi) || []).length;
      const noisyPlaceholderText = noisyModelPlaceholder.getAttribute('placeholder') || '';
      const noisyPlaceholderFreeCount = (noisyPlaceholderText.match(/\(free\)/gi) || []).length;
      const oldModelHeading = document.createElement('h2');
      oldModelHeading.textContent = 'Claude Opus Code (Free)';
      document.body.appendChild(oldModelHeading);
      window.__hormProductPolish.scan(oldModelHeading);

      const confusingChrome = document.createElement('div');
      confusingChrome.id = 'horm-test-confusing-chrome';
      confusingChrome.innerHTML = [
        '<div class="horm-kbd-hint">Ctrl+N new · Ctrl+K search · Esc close · /create = build</div>',
        '<button class="horm-agentic-toggle active" title="Toggle agentic execution panels">🔧</button>',
      ].join('');
      document.body.appendChild(confusingChrome);
      window.__hormProductPolish.scan(confusingChrome);

      window.__hormProductPolish.setOfflineForTest(true);
      await new Promise((resolve) => setTimeout(resolve, 80));
      const offlineScreen = document.getElementById('horm-offline-screen');
      const offlineVisible = offlineScreen && getComputedStyle(offlineScreen).display !== 'none' && offlineScreen.hidden === false;
      const offlineText = offlineScreen?.textContent || '';
      window.__hormProductPolish.setOfflineForTest(false);
      await new Promise((resolve) => setTimeout(resolve, 80));
      const offlineHiddenAfterReset = offlineScreen && (offlineScreen.hidden === true || getComputedStyle(offlineScreen).display === 'none');

      const hasEmoji = (value) => /[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/u.test(value || '');
      const stripUi = (value) => String(value || '').replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F\u200D]/gu, '').replace(/^[\s+＋]+(?=\S)/, '').replace(/\s+/g, ' ').trim();
      const displayOf = (element) => element ? getComputedStyle(element).display : '';

      return {
        themeLoaded: !!document.getElementById('horm-monochrome-theme-style'),
        fontLoaded: !!document.getElementById('horm-monochrome-font'),
        codeButtonExists: !!toggle,
        codePanelOpen: !!row.querySelector('.gem-code-panel.open'),
        codeText: row.querySelector('.gem-code-panel code')?.textContent || '',
        toolTarget: row.querySelector('.horm-tool-target')?.textContent || '',
        inlineToolExpanded: !!inlineRow.querySelector('.mt-1 pre'),
        inlineToolStyled: inlineRow.classList.contains('horm-inline-tool-row'),
        inlineShowVisible: displayOf(inlineRow.querySelector('button')) !== 'none' && displayOf(inlineRow.querySelector('button')) !== '',
        inlineToolText: inlineRow.textContent || '',
        detailsAnimationClass: row.classList.contains('horm-active-tool-row'),
        detailsActionText: row.querySelector('.horm-tool-action')?.textContent || '',
        duplicateToolRows: toolAssistant.querySelectorAll('.horm-duplicate-tool-row').length,
        progressEchoesHidden: toolAssistant.querySelectorAll('.horm-tool-progress-echo').length,
        writingAnimationClass: toolRowA.classList.contains('horm-active-tool-row'),
        readAnimationClass: readToolRow.classList.contains('horm-active-tool-row'),
        searchAnimationClass: searchToolRow.classList.contains('horm-active-tool-row'),
        writingAnimationName: getComputedStyle(toolRowA, '::after').animationName,
        toolActionText: toolRowA.querySelector('.horm-tool-action')?.textContent || '',
        readActionText: readToolRow.querySelector('.horm-tool-action')?.textContent || '',
        searchActionText: searchToolRow.querySelector('.horm-tool-action')?.textContent || '',
        waveDotCount: toolAssistant.querySelectorAll('.horm-wave-dots span').length,
        fileSearchFound: fileSearch.success === true && fileSearch.matches.some((item) => /hormachuelos-specific-file-target\.txt/i.test(item.file || item.path || '')),
        globSearchFound: globSearch.success === true && globSearch.matches.some((item) => /hormachuelos-specific-file-target\.txt/i.test(item.path || item.relativePath || '')),
        grepNameSearchFound: grepSearch.success === true && grepSearch.matches.some((item) => /hormachuelos-specific-file-target\.txt/i.test(item.file || item.path || '')),
        basenameReadFound: basenameRead.success === true && basenameRead.content === 'needle-for-hormachuelos-search' && basenameRead.foundBySearch === true,
        duplicateToolVisible: getComputedStyle(toolRowB).display !== 'none',
        toolProgressVisible: displayOf(toolAssistant.querySelector('.horm-tool-progress-echo')) !== 'none',
        menuButtonExists: !!menuButton,
        menuButtonTop: parseFloat(getComputedStyle(menuButton).top),
        sidebarReady: document.body.classList.contains('horm-sidebar-drawer-ready'),
        drawerContextExists: !!drawerContext,
        drawerModelText: drawerContext?.querySelector('[data-horm-drawer-model] span')?.textContent || '',
        drawerWorkspaceText: drawerContext?.querySelector('[data-horm-drawer-workspace] span')?.textContent || '',
        headerContextHidden: !!headerContext,
        headerContextChildrenHidden,
        sidebarOpenAfterClick,
        sidebarClosedAfterOverlay: !document.body.classList.contains('horm-sidebar-open'),
        chatboxPresent: !!document.querySelector('textarea'),
        chatboxCount: document.querySelectorAll('textarea').length,
        chatboxReady: !!chatTextarea && !!chatboxShell && !!chatboxRegion,
        chatboxVisible: !!chatTextarea && chatboxTextareaStyle.display !== 'none' && chatboxTextareaStyle.visibility !== 'hidden' && Number(chatboxTextareaStyle.opacity) > 0 && chatboxRect.width > 120 && chatboxRect.height >= 40 && chatboxRect.top < window.innerHeight,
        chatboxShellDisplay: chatboxShellStyle?.display || '',
        chatboxRegionDisplay: chatboxRegionStyle?.display || '',
        chatboxShellBoxShadow: chatboxShellStyle?.boxShadow || '',
        chatboxShellOutlineStyle: chatboxShellStyle?.outlineStyle || '',
        chatboxTextareaBoxShadow: chatboxTextareaStyle?.boxShadow || '',
        chatboxTextareaOutlineStyle: chatboxTextareaStyle?.outlineStyle || '',
        chatboxTextareaBackground: chatboxTextareaStyle?.backgroundColor || '',
        chatboxTextareaBorderTopWidth: chatboxTextareaStyle?.borderTopWidth || '',
        chatboxTextareaMinHeight: parseFloat(chatboxTextareaStyle?.minHeight || '0'),
        syntheticComposerTextareaKept: !!syntheticComposer.querySelector('textarea'),
        syntheticPlaceholder,
        noisyModelText,
        noisyModelFreeCount,
        noisyPlaceholderText,
        noisyPlaceholderFreeCount,
        oldModelHeadingText: oldModelHeading.textContent || '',
        syntheticComposerSvgHidden: displayOf(syntheticComposer.querySelector('svg')) === 'none',
        kbdHintHidden: displayOf(confusingChrome.querySelector('.horm-kbd-hint')) === 'none',
        agenticToggleHidden: displayOf(confusingChrome.querySelector('.horm-agentic-toggle')) === 'none',
        offlineVisible,
        offlineText,
        offlineHiddenAfterReset,
        newSessionPresent: realButtons.some((button) => /Start a new chat session/i.test(button.title || '') || /\bNew Session\b/i.test(buttonText(button))),
        sendPresent: realButtons.some((button) => /^Send$/i.test(buttonText(button))),
        previewPresent: realButtons.some((button) => /Toggle live preview/i.test(button.title || '') || /^Preview$/i.test(buttonText(button))),
        themeTogglePresent: realButtons.some((button) => /\b(Light|Dark)\b/i.test(buttonText(button))),
        modelSelectorPresent: realButtons.some((button) => /Select AI Model/i.test(button.title || '')),
        folderControlPresent: realButtons.some((button) => /\b(Cyrhiel|Add file path)\b/i.test(buttonText(button))),
        historyButtonRemoved: displayOf(toolbar.querySelector('#horm-test-history')) === 'none',
        newSessionText: toolbar.querySelector('#horm-test-new-session')?.getAttribute('data-horm-label') || '',
        sendText: toolbar.querySelector('#horm-test-send')?.getAttribute('data-horm-label') || '',
        sendSvgHidden: displayOf(toolbar.querySelector('#horm-test-send svg')) === 'none',
        modelText: toolbar.querySelector('#horm-test-model')?.textContent || '',
        modelBrand: toolbar.querySelector('#horm-test-model')?.getAttribute('data-horm-brand') || '',
        modelSvgHidden: displayOf(toolbar.querySelector('#horm-test-model svg')) === 'none',
        folderText: stripUi(toolbar.querySelector('#horm-test-folder')?.textContent || ''),
        folderIconHidden: displayOf(toolbar.querySelector('#horm-test-folder span')) === 'none',
        previewText: toolbar.querySelector('#horm-test-preview')?.getAttribute('data-horm-label') || '',
        lightText: toolbar.querySelector('#horm-test-light')?.getAttribute('data-horm-label') || '',
        toolbarHasEmoji: hasEmoji(Array.from(toolbar.querySelectorAll('button')).map((button) => button.getAttribute('data-horm-label') || stripUi(button.textContent)).join(' ')),
        opened,
        targets: window.__hormAutoOpenPreview.collectTargets().map((t) => t.value),
        assistantAlign: getComputedStyle(assistant).textAlign,
        assistantMarginLeft: getComputedStyle(assistant).marginLeft,
        assistantPaddingLeft: getComputedStyle(assistant).paddingLeft,
        assistantRailDisplay: getComputedStyle(assistant, '::before').display,
        paragraphAlign: getComputedStyle(assistant.querySelector('p')).textAlign,
        renameButtonText: session.querySelector('button[title="Rename session"]').textContent,
        renameClicks,
        duplicateHidden: duplicateReply.querySelectorAll('.horm-duplicate-reply').length,
        duplicateSummaryHidden: duplicateReply.querySelectorAll('.horm-duplicate-summary').length,
        rawToolResultsHidden: duplicateReply.querySelectorAll('.horm-raw-tool-result').length,
        rawOnlyReplyHidden: rawOnlyReply.classList.contains('horm-empty-assistant'),
        genericModelReplyText: genericModelReply.querySelector('span')?.textContent || '',
        systemLeakHidden: duplicateReply.querySelectorAll('.horm-system-summary-leak').length,
        cleanSummaryText: duplicateReply.querySelector('.horm-clean-summary')?.textContent || '',
        sentenceText: duplicateReply.querySelectorAll('p')[2].textContent,
        previewPaneEnhanced: !!activePreviewPane && activePreviewPane.classList.contains('horm-preview-pane'),
        previewResizerExists: !!activePreviewPane && !!activePreviewPane.querySelector('.horm-preview-resizer'),
        previewWidth,
        previewFrameSrc: document.querySelector('iframe[title="Live Preview"], .horm-live-preview-frame')?.getAttribute('src') || '',
      };
    });

    assert.equal(result.themeLoaded, true);
    const topMenus = menuSummary.map((item) => item.label);
    assert.deepEqual(topMenus, ['File', 'Edit', 'View', 'Window', 'Help']);
    const labelsFor = (label) => menuSummary.find((item) => item.label === label).submenu.map((item) => item.label);
    assert.ok(labelsFor('File').includes('New Session'));
    assert.ok(labelsFor('File').includes('Open Workspace Manager'));
    assert.ok(labelsFor('File').includes('Open Current Workspace in Explorer'));
    assert.ok(labelsFor('Edit').includes('Copy Last AI Reply'));
    assert.ok(labelsFor('Edit').includes('Show Composer Actions'));
    assert.ok(labelsFor('View').includes('Toggle Hamburger Drawer'));
    assert.ok(labelsFor('View').includes('Toggle Live Preview'));
    assert.ok(labelsFor('View').includes('Toggle Terminal'));
    assert.ok(labelsFor('View').includes('Select AI Model'));
    assert.ok(labelsFor('Window').includes('Always on Top'));
    assert.ok(labelsFor('Help').includes('About Hormachuelos'));
    assert.ok(labelsFor('Help').includes('Backend Proxy Status'));
    assert.equal(result.fontLoaded, true);
    assert.equal(result.codeButtonExists, false);
    assert.equal(result.codePanelOpen, true);
    assert.match(result.codeText, /index\.html/);
    assert.match(result.toolTarget, /write_file: C:\/Users\/Cyrhiel\/Pictures\/demo\/index\.html/);
    assert.equal(result.inlineToolExpanded, true);
    assert.equal(result.inlineToolStyled, true);
    assert.equal(result.inlineShowVisible, false);
    assert.doesNotMatch(result.inlineToolText, /\bShow\b/);
    assert.equal(result.detailsAnimationClass, true);
    assert.match(result.detailsActionText, /Writing\.\.\./);
    assert.equal(result.duplicateToolRows, 1);
    assert.equal(result.progressEchoesHidden, 4);
    assert.equal(result.writingAnimationClass, true);
    assert.equal(result.readAnimationClass, true);
    assert.equal(result.searchAnimationClass, true);
    assert.match(result.writingAnimationName, /horm-write-sweep/);
    assert.match(result.toolActionText, /Writing\.\.\./);
    assert.match(result.readActionText, /Reading\.\.\./);
    assert.match(result.searchActionText, /Searching\.\.\./);
    assert.ok(result.waveDotCount >= 9);
    assert.equal(result.fileSearchFound, true);
    assert.equal(result.globSearchFound, true);
    assert.equal(result.grepNameSearchFound, true);
    assert.equal(result.basenameReadFound, true);
    assert.equal(result.duplicateToolVisible, false);
    assert.equal(result.toolProgressVisible, false);
    assert.equal(result.menuButtonExists, true);
    assert.ok(result.menuButtonTop <= 20);
    assert.equal(result.sidebarReady, true);
    assert.equal(result.drawerContextExists, true);
    assert.match(result.drawerModelText, /Hormachuelos|OpenRouter|OpenCode|DeepSeek/);
    assert.match(result.drawerWorkspaceText, /Cyrhiel|Add file path/);
    assert.equal(result.headerContextHidden, true);
    assert.equal(result.headerContextChildrenHidden, true);
    assert.equal(result.sidebarOpenAfterClick, true);
    assert.equal(result.sidebarClosedAfterOverlay, true);
    assert.equal(result.chatboxPresent, true);
    assert.ok(result.chatboxCount >= 1);
    assert.equal(result.chatboxReady, true);
    assert.equal(result.chatboxVisible, true);
    assert.equal(result.chatboxShellDisplay, 'flex');
    assert.equal(result.chatboxRegionDisplay, 'block');
    assert.equal(result.chatboxShellBoxShadow, 'none');
    assert.equal(result.chatboxShellOutlineStyle, 'none');
    assert.equal(result.chatboxTextareaBoxShadow, 'none');
    assert.equal(result.chatboxTextareaOutlineStyle, 'none');
    assert.notEqual(result.chatboxTextareaBackground, 'rgba(0, 0, 0, 0)');
    assert.equal(result.chatboxTextareaBorderTopWidth, '1px');
    assert.ok(result.chatboxTextareaMinHeight >= 64);
    assert.equal(result.syntheticComposerTextareaKept, true);
    assert.match(result.syntheticPlaceholder, /OpenRouter \(free\)/);
    assert.equal(result.noisyModelText, 'OpenRouter (free)');
    assert.equal(result.noisyModelFreeCount, 1);
    assert.match(result.noisyPlaceholderText, /Ask OpenRouter \(free\) what to build/);
    assert.equal(result.noisyPlaceholderFreeCount, 1);
    assert.equal(result.oldModelHeadingText, 'OpenRouter (free)');
    assert.equal(result.syntheticComposerSvgHidden, true);
    assert.equal(result.kbdHintHidden, true);
    assert.equal(result.agenticToggleHidden, true);
    assert.equal(result.offlineVisible, true);
    assert.match(result.offlineText, /No internet/);
    assert.equal(result.offlineHiddenAfterReset, true);
    assert.equal(result.newSessionPresent, true);
    assert.equal(result.sendPresent, true);
    assert.equal(result.previewPresent, true);
    assert.equal(result.themeTogglePresent, true);
    assert.equal(result.modelSelectorPresent, true);
    assert.equal(result.folderControlPresent, true);
    assert.equal(result.historyButtonRemoved, true);
    assert.equal(result.newSessionText, 'New Session');
    assert.equal(result.sendText, 'Send');
    assert.equal(result.sendSvgHidden, true);
    assert.equal(result.modelText, 'DeepSeek V4 Flash');
    assert.equal(result.modelBrand, 'DS');
    assert.equal(result.modelSvgHidden, true);
    assert.equal(result.folderText, 'Cyrhiel');
    assert.equal(result.folderIconHidden, true);
    assert.equal(result.previewText, 'Preview');
    assert.equal(result.lightText, 'Light');
    assert.equal(result.toolbarHasEmoji, false);
    assert.deepEqual(result.opened, [
      ['previewUrl', 'http://localhost:4321'],
      ['openExternal', 'http://localhost:4321'],
    ]);
    assert.ok(result.targets.includes('http://localhost:4321'));
    assert.equal(result.assistantAlign, 'left');
    assert.equal(result.assistantMarginLeft, '0px');
    assert.equal(result.assistantPaddingLeft, '0px');
    assert.equal(result.assistantRailDisplay, 'none');
    assert.equal(result.paragraphAlign, 'left');
    assert.equal(result.renameButtonText, 'Rename');
    assert.equal(result.renameClicks, 1);
    assert.ok(result.duplicateHidden + result.duplicateSummaryHidden >= 4);
    assert.ok(result.duplicateSummaryHidden >= 5);
    assert.ok(result.rawToolResultsHidden >= 1);
    assert.equal(result.rawOnlyReplyHidden, true);
    assert.match(result.genericModelReplyText, /Hormachuelos|OpenRouter|OpenCode|DeepSeek/);
    assert.equal(result.systemLeakHidden, 1);
    assert.match(result.cleanSummaryText, /Created a complete Snake game|Done Summary/);
    assert.equal(result.sentenceText, 'The game is ready. Use the arrow keys to play.');
    assert.equal(result.previewPaneEnhanced, true);
    assert.equal(result.previewResizerExists, true);
    assert.match(result.previewWidth, /\d+px/);
    assert.equal(result.previewFrameSrc, 'http://127.0.0.1:7777/index.html');
  } finally {
    await app.close();
  }
});
