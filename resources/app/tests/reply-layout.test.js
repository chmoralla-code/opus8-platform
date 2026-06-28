const assert = require('node:assert/strict');
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
  await win.waitForFunction(() => typeof window.renderMarkdownInMessage === 'function', null, { timeout: 10000 });
  return { app, win };
}

test('Codex reply layout renders markdown safely', async () => {
  const { app, win } = await launchApp();
  try {
    const result = await win.evaluate(() => {
      window.marked = {
        setOptions() {},
        parse() {
          return [
            '<h1 onclick="alert(1)">Plan</h1>',
            '<p>Use <code>npm test</code>.</p>',
            '<a href="javascript:alert(1)">bad link</a>',
            '<a href="https://example.com/docs">good link</a>',
            '<img src="data:text/html,<script>alert(1)</script>">',
            '<script>window.__hormUnsafe = true;</script>',
          ].join('');
        },
      };

      const assistantRow = document.createElement('div');
      assistantRow.className = 'flex justify-start';
      const assistant = document.createElement('div');
      assistant.className = 'card max-w-[80%]';
      const copy = document.createElement('button');
      copy.className = 'horm-copy-btn';
      copy.textContent = 'Copy';
      const content = document.createElement('p');
      content.className = 'whitespace-pre-wrap';
      content.textContent = '# Plan\n\n- run tests';
      assistant.appendChild(content);
      assistant.appendChild(copy);
      assistantRow.appendChild(assistant);
      document.body.appendChild(assistantRow);

      const userRow = document.createElement('div');
      userRow.className = 'flex justify-end';
      const user = document.createElement('div');
      user.className = 'bg-claude-accent text-white max-w-[80%]';
      user.textContent = 'Please fix this';
      userRow.appendChild(user);
      document.body.appendChild(userRow);

      const deepseekRow = document.createElement('div');
      deepseekRow.className = 'flex justify-end';
      const deepseek = document.createElement('div');
      deepseek.className = 'god-mode-bubble text-white max-w-[80%]';
      deepseek.innerHTML = '<div>God Mode</div><p>DeepSeek V4 Pro reply should stay left.</p>';
      deepseekRow.appendChild(deepseek);
      document.body.appendChild(deepseekRow);

      const godUserRow = document.createElement('div');
      godUserRow.className = 'flex justify-end';
      const godUser = document.createElement('div');
      godUser.className = 'god-mode-user-bubble text-white max-w-[80%]';
      godUser.textContent = 'Client message in DeepSeek mode';
      godUserRow.appendChild(godUser);
      document.body.appendChild(godUserRow);

      window.renderMarkdownInMessage(assistant);
      window.applyCodexReplyLayout(document);

      const badLink = assistant.querySelector('a:first-of-type');
      const goodLink = assistant.querySelector('a[href^="https://"]');
      const badImg = assistant.querySelector('img');

      return {
        styleLoaded: !!document.getElementById('horm-codex-reply-layout-style'),
        assistantClass: assistant.className,
        assistantRowClass: assistantRow.className,
        userClass: user.className,
        userRowClass: userRow.className,
        deepseekClass: deepseek.className,
        deepseekRowClass: deepseekRow.className,
        deepseekMeta: !!deepseek.querySelector('.horm-codex-meta'),
        deepseekJustify: getComputedStyle(deepseekRow).justifyContent,
        godUserClass: godUser.className,
        godUserRowClass: godUserRow.className,
        hasMeta: !!assistant.querySelector('.horm-codex-meta'),
        copyPreserved: !!assistant.querySelector('.horm-copy-btn'),
        hasHeading: !!assistant.querySelector('h1'),
        scriptCount: assistant.querySelectorAll('script').length,
        unsafeGlobal: !!window.__hormUnsafe,
        headingHasOnClick: assistant.querySelector('h1').hasAttribute('onclick'),
        badHref: badLink ? badLink.getAttribute('href') : null,
        goodHref: goodLink ? goodLink.getAttribute('href') : null,
        goodRel: goodLink ? goodLink.getAttribute('rel') : null,
        goodTarget: goodLink ? goodLink.getAttribute('target') : null,
        badImgSrc: badImg ? badImg.getAttribute('src') : null,
      };
    });

    assert.equal(result.styleLoaded, true);
    assert.match(result.assistantClass, /horm-codex-assistant/);
    assert.match(result.assistantRowClass, /horm-codex-row-assistant/);
    assert.match(result.userClass, /horm-codex-user/);
    assert.match(result.userRowClass, /horm-codex-row-user/);
    assert.match(result.deepseekClass, /horm-codex-assistant/);
    assert.doesNotMatch(result.deepseekClass, /horm-codex-user/);
    assert.match(result.deepseekRowClass, /horm-codex-row-assistant/);
    assert.doesNotMatch(result.deepseekRowClass, /horm-codex-row-user/);
    assert.equal(result.deepseekMeta, true);
    assert.equal(result.deepseekJustify, 'flex-start');
    assert.match(result.godUserClass, /horm-codex-user/);
    assert.match(result.godUserRowClass, /horm-codex-row-user/);
    assert.equal(result.hasMeta, true);
    assert.equal(result.copyPreserved, true);
    assert.equal(result.hasHeading, true);
    assert.equal(result.scriptCount, 0);
    assert.equal(result.unsafeGlobal, false);
    assert.equal(result.headingHasOnClick, false);
    assert.equal(result.badHref, null);
    assert.equal(result.goodHref, 'https://example.com/docs');
    assert.equal(result.goodRel, 'noopener noreferrer');
    assert.equal(result.goodTarget, '_blank');
    assert.equal(result.badImgSrc, null);
  } finally {
    await app.close();
  }
});
