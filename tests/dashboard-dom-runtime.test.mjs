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
 * against parsed DOM nodes, clicking all 5 tabs, category filters, and every copy button
 * (including live `#boss-topic-input` dynamic topic injection in offline `file://` mode).
 */
export function verifyDashboardHtmlInteractivity(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, `Expected inline <script> in ${htmlPath}`);

  // Build lightweight DOM element models for all 5 panels
  const tabIds = ['risks', 'prompts', 'lineage', 'timemachine', 'sos'];
  const panels = new Map();
  for (const t of tabIds) {
    const id = `panel-${t}`;
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

  const tabBtns = tabIds.map((tabId, idx) => {
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

  // Parse prompt cards and category filter pills
  const promptCardMatches = [...html.matchAll(/<div class="finding-card prompt-card" data-pcat="([^"]+)">/g)];
  assert.equal(promptCardMatches.length, 8, `Expected 8 Master Prompt cards in ${htmlPath}`);
  const promptCards = promptCardMatches.map(m => ({
    cat: m[1],
    style: { display: 'block' },
    getAttribute: name => (name === 'data-pcat' ? m[1] : null)
  }));

  const filterPills = ['all', 'khazix', 'engineering', 'design'].map((cat, idx) => {
    const classes = new Set(idx === 0 ? ['filter-pill', 'active'] : ['filter-pill']);
    return {
      cat,
      classList: {
        add: c => classes.add(c),
        remove: c => classes.delete(c),
        contains: c => classes.has(c)
      }
    };
  });

  // Parse all copy buttons (supporting optional `data-template`)
  const copyBtnRegex = /<button class="copy-btn[^"]*" data-copy="([^"]+)"(?:\s+data-template="([^"]+)")?>/g;
  const copyBtnMatches = [...html.matchAll(copyBtnRegex)];
  assert.ok(copyBtnMatches.length >= 9, `Expected findings + 8 master prompt copy buttons in ${htmlPath}`);

  const copyBtns = copyBtnMatches.map(m => {
    const decodedCopy = decodeHtmlAttr(m[1]);
    const decodedTpl = m[2] ? decodeHtmlAttr(m[2]) : null;
    const listeners = new Map();
    return {
      isMaster: Boolean(decodedTpl),
      getAttribute: name => {
        if (name === 'data-copy') return decodedCopy;
        if (name === 'data-template') return decodedTpl;
        return null;
      },
      addEventListener: (ev, fn) => listeners.set(ev, fn),
      click: () => listeners.get('click')?.()
    };
  });

  const toastEl = { style: { display: 'none' } };
  const topicInputEl = { value: '' };
  const copiedTexts = [];
  const appendedNodes = [];

  const sandbox = {
    navigator: {}, // Simulate `file://` double-click where `navigator.clipboard` is undefined!
    setTimeout: () => {},
    document: {
      getElementById: id => {
        if (id === 'toast') return toastEl;
        if (id === 'boss-topic-input') return topicInputEl;
        return panels.get(id);
      },
      querySelectorAll: sel => {
        if (sel === '.panel') return [...panels.values()];
        if (sel === '.tab-btn') return tabBtns;
        if (sel === '.copy-btn') return copyBtns;
        if (sel === '.prompt-card') return promptCards;
        if (sel === '.filter-pill') return filterPills;
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

  // 1. Click through all 5 tabs and verify exclusive active panel toggling
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

  // 2. Click category filters in `#panel-prompts` and verify card filtering
  sandbox.filterPrompts('khazix', filterPills[1]);
  assert.equal(promptCards.filter(c => c.style.display === 'block').length, 4);
  sandbox.filterPrompts('engineering', filterPills[2]);
  assert.equal(promptCards.filter(c => c.style.display === 'block').length, 2);
  sandbox.filterPrompts('design', filterPills[3]);
  assert.equal(promptCards.filter(c => c.style.display === 'block').length, 2);
  sandbox.filterPrompts('all', filterPills[0]);
  assert.equal(promptCards.filter(c => c.style.display === 'block').length, 8);

  // 3. Click every copy button with default empty input first
  for (const btn of copyBtns) {
    toastEl.style.display = 'none';
    btn.click();
    assert.equal(toastEl.style.display, 'block', 'Clicking copy button must display #toast');
  }
  assert.equal(copiedTexts.length, copyBtns.length);
  assert.equal(appendedNodes.length, 0, 'Temporary textarea must be cleaned up from document.body');

  // 4. Type a custom founder idea into `#boss-topic-input` and verify dynamic injection into all 8 Master Prompts!
  topicInputEl.value = '新增VIP客户储值卡与积分流水账本';
  const masterBtns = copyBtns.filter(b => b.isMaster);
  assert.equal(masterBtns.length, 8);
  for (const mBtn of masterBtns) {
    mBtn.click();
    const latestCopied = copiedTexts[copiedTexts.length - 1];
    assert.ok(
      latestCopied.includes('新增VIP客户储值卡与积分流水账本'),
      'Master prompt copy button must inject live #boss-topic-input text'
    );
    assert.ok(!latestCopied.includes('__BOSS_TOPIC__'), 'Template token must be cleanly replaced');
  }
}

test('Interactive DOM, 5-Tab Switching & Live Master Prompt Injection in 老板全景驾驶舱.html', () => {
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

    // P0 project must surface urgent fix action right in the primary card
    const brokenHtml = fs.readFileSync(res.dashboardPath, 'utf8');
    const brokenPrimary = brokenHtml.match(/<section class="primary-card">[\s\S]*?<\/section>/)?.[0] || '';
    assert.ok(brokenPrimary.includes('点右边按钮复制话术，发给 AI 就能修好'));
    assert.ok(brokenPrimary.includes('复制这句话发给 AI'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Beginner Clarity Gate: Healthy project with only P2 developer notes shows calm zero-action card without black fix buttons', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-calm-ui-'));
  try {
    fs.mkdirSync(path.join(tmpRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpRoot, 'package.json'), JSON.stringify({ name: 'calm-project' }), 'utf8');
    // 620-line valid file triggers only a P2 file-size note (0 P0, 0 P1)
    const lines = Array.from({ length: 620 }, (_, i) => `export const v${i} = ${i};`).join('\n');
    fs.writeFileSync(path.join(tmpRoot, 'src/large.mjs'), lines, 'utf8');

    const res = installGhostCTO(tmpRoot);
    const html = fs.readFileSync(res.dashboardPath, 'utf8');
    const primaryCard = html.match(/<section class="primary-card">[\s\S]*?<\/section>/)?.[0] || '';

    assert.ok(primaryCard.includes('一切正常，现在什么都不用点'), 'Healthy project must tell beginner nothing needs clicking');
    assert.equal(primaryCard.includes('copy-btn'), false, 'Healthy primary card must NOT show any copy-fix prompt button');
    assert.equal(primaryCard.includes('src/large.mjs'), false, 'P2 file coordinates must NOT clutter primary card');
    assert.ok(html.includes('<details class="more-drawer">'), 'Advanced details must be tucked inside collapsed drawer');
    verifyDashboardHtmlInteractivity(res.dashboardPath);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
