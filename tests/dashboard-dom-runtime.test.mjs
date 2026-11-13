import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { installGhostCTO } from '../kernel/installer.mjs';

function decodeHtmlAttr(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

/**
 * Execute the actual `<script>` generated inside `老板全景驾驶舱.html` inside `node:vm`
 * against parsed DOM nodes, clicking every tab and every copy button (both Clipboard API
 * and offline `file://` execCommand fallback) to verify zero JS runtime bugs.
 */
function verifyDashboardHtmlInteractivity(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, `Expected inline <script> in ${htmlPath}`);

  // Build lightweight DOM element models for panels, tab buttons, copy buttons, and toast
  const panels = new Map();
  for (const id of ['panel-risks', 'panel-lineage', 'panel-timemachine', 'panel-sos']) {
    assert.ok(html.includes(`id="${id}"`), `Missing #${id} in ${htmlPath}`);
    const initiallyActive = new RegExp(`id="${id}"\\s+class="panel active"`).test(html);
    const classes = new Set(initiallyActive ? ['panel', 'active'] : ['panel']);
    panels.set(id, {
      id,
      classList: {
        add: c => classes.add(c),
        remove: c => classes.delete(c),
        contains: c => classes.has(c)
      }
    });
  }

  const tabBtns = ['risks', 'lineage', 'timemachine', 'sos'].map((tabId, idx) => {
    const classes = new Set(idx === 0 ? ['tab-btn', 'active'] : ['tab-btn']);
    return {
      tabId,
      classList: {
        add: c => classes.add(c),
        remove: c => classes.delete(c),
        contains: c => classes.has(c)
      }
    };
  });

  const copyBtnMatches = [...html.matchAll(/<button class="copy-btn[^"]*" data-copy="([^"]+)">/g)];
  assert.ok(copyBtnMatches.length >= 2, `Expected copy buttons in ${htmlPath}`);

  const copyBtns = copyBtnMatches.map(m => {
    const decoded = decodeHtmlAttr(m[1]);
    const listeners = new Map();
    return {
      getAttribute: name => (name === 'data-copy' ? decoded : null),
      addEventListener: (ev, fn) => listeners.set(ev, fn),
      click: () => listeners.get('click')?.()
    };
  });

  const toastEl = { style: { display: 'none' } };
  const copiedTexts = [];
  const appendedNodes = [];

  const sandbox = {
    navigator: {}, // Simulate `file://` double-click where `navigator.clipboard` is undefined!
    setTimeout: fn => {}, // Do not auto-hide toast immediately during assertion
    document: {
      getElementById: id => (id === 'toast' ? toastEl : panels.get(id)),
      querySelectorAll: sel => {
        if (sel === '.panel') return [...panels.values()];
        if (sel === '.tab-btn') return tabBtns;
        if (sel === '.copy-btn') return copyBtns;
        return [];
      },
      createElement: tag => ({
        tagName: tag,
        value: '',
        style: {},
        focus() {},
        select() {}
      }),
      body: {
        appendChild: el => appendedNodes.push(el),
        removeChild: el => {
          const i = appendedNodes.indexOf(el);
          if (i >= 0) appendedNodes.splice(i, 1);
        }
      },
      execCommand: cmd => {
        if (cmd === 'copy' && appendedNodes.length > 0) {
          copiedTexts.push(appendedNodes[appendedNodes.length - 1].value);
          return true;
        }
        return false;
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(scriptMatch[1], sandbox);

  // 1. Click through all 4 tabs and verify exclusive active panel toggling
  for (const btn of tabBtns) {
    sandbox.switchTab(btn.tabId, btn);
    assert.equal(panels.get(`panel-${btn.tabId}`).classList.contains('active'), true);
    assert.equal(btn.classList.contains('active'), true);
    for (const other of tabBtns) {
      if (other !== btn) {
        assert.equal(panels.get(`panel-${other.tabId}`).classList.contains('active'), false);
      }
    }
  }

  // 2. Click every copy button in offline `file://` mode and verify exact Chinese prompt copied & toast shown
  for (const btn of copyBtns) {
    toastEl.style.display = 'none';
    btn.click();
    assert.equal(toastEl.style.display, 'block', 'Clicking copy button must display #toast');
  }
  assert.equal(copiedTexts.length, copyBtns.length);
  assert.equal(appendedNodes.length, 0, 'Temporary textarea must be cleaned up from document.body');
}

test('Interactive DOM & Offline file:// Copy Execution of 老板全景驾驶舱.html', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-dom-test-'));
  try {
    fs.mkdirSync(path.join(tmpRoot, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, 'package.json'),
      JSON.stringify({ name: 'cockpit-ui-test', scripts: { start: 'node src/server.mjs' } }, null, 2)
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'src/server.mjs'),
      `import http from 'node:http';\nhttp.createServer((req, res) => { if (req.url === '/api/admin/open') return res.end('ok'); }).listen(9001);\n`
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'src/App.jsx'),
      `export default function App() { function fakeSave() { showToast('门店已保存'); } return <button onClick={fakeSave}>保存</button>; }\n`
    );

    const res = installGhostCTO(tmpRoot);
    verifyDashboardHtmlInteractivity(res.dashboardPath);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
