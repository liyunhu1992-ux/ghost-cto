import fs from 'node:fs';
import path from 'node:path';
import { saveIdeaBlueprint } from './idea-incubator.mjs';
import { scanWorkspace } from './scanner.mjs';
import { runRealityAudit } from './reality-audit.mjs';
import { saveCheckpoint } from './time-capsule.mjs';
import { writeMemoryCapsule } from './memory-capsule.mjs';
import { generateBossDashboard, generateSelfHealingLaunchers } from './boss-dashboard.mjs';

function buildVibeShieldBrowserJs() {
  return `// 🛡️ GhostCTO 小白防白屏与报错自动捕获黑匣子 (0 外部依赖)
// 一旦页面代码或后端接口出错，不让小白面对空白屏发懵，自动在底部弹出中文提示与「一键复制报错给 AI 秒修」按钮！
(function () {
  var banner = null;
  function showRescueBar(kind, msg, where) {
    try {
      if (!document.body) return;
      if (!banner) {
        banner = document.createElement('div');
        banner.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;background:#18181B;color:#FFF;padding:14px 18px;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,0.22);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;font-size:13.5px;border-left:5px solid #EF4444;';
        document.body.appendChild(banner);
      }
      var fixPrompt = '我的网页刚刚触发了报错，请你精准定位修复（不要乱改其他正常功能），修好后跑一次 ghost-cto verify：\\n[' + kind + '] ' + msg + (where ? ' (' + where + ')' : '');
      banner.innerHTML = '';
      var textSpan = document.createElement('div');
      textSpan.style.cssText = 'flex:1;min-width:220px;line-height:1.5;';
      textSpan.textContent = '🛡️ 影子 CTO 抓到一个小报错（页面已保护未崩溃）：' + msg;

      var btnWrap = document.createElement('div');
      btnWrap.style.cssText = 'display:flex;gap:8px;align-items:center;';

      var copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.textContent = '📋 一键复制报错发给 AI 秒修';
      copyBtn.style.cssText = 'background:#2563EB;color:#FFF;border:none;border-radius:8px;padding:8px 14px;font-size:12.5px;font-weight:700;cursor:pointer;';
      copyBtn.onclick = function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(fixPrompt);
        }
        copyBtn.textContent = '✅ 已复制！去粘贴给 AI 即可';
        setTimeout(function () { copyBtn.textContent = '📋 一键复制报错发给 AI 秒修'; }, 2200);
      };

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '关闭';
      closeBtn.style.cssText = 'background:#3F3F46;color:#E4E4E7;border:none;border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer;';
      closeBtn.onclick = function () { banner.style.display = 'none'; };

      btnWrap.appendChild(copyBtn);
      btnWrap.appendChild(closeBtn);
      banner.appendChild(textSpan);
      banner.appendChild(btnWrap);
      banner.style.display = 'flex';
    } catch (_) {}
  }

  window.addEventListener('error', function (ev) {
    var loc = (ev.filename ? ev.filename.split('/').pop() : '') + (ev.lineno ? ':' + ev.lineno : '');
    showRescueBar('前端脚本错误', ev.message || '未知脚本异常', loc);
  });

  window.addEventListener('unhandledrejection', function (ev) {
    var reason = ev.reason && (ev.reason.message || String(ev.reason)) || '异步请求未处理异常';
    showRescueBar('异步请求异常', reason, '');
  });

  if (typeof window.fetch === 'function') {
    var origFetch = window.fetch.bind(window);
    window.fetch = function () {
      var urlArg = arguments[0];
      return origFetch.apply(null, arguments).then(function (res) {
        if (res.status >= 500) {
          res.clone().json().then(function (d) {
            showRescueBar('后端接口报错 ' + res.status, (d && d.error) || res.statusText, String(urlArg));
          }).catch(function () {
            showRescueBar('后端接口报错 ' + res.status, res.statusText || '服务器内部错误', String(urlArg));
          });
        }
        return res;
      });
    };
  }
})();
`;
}

function buildDbMjs(bp) {
  const table = bp.tableName;
  const seedJson = JSON.stringify(bp.sampleItems, null, 2);
  return `import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'app.sqlite');
const JSON_FALLBACK_FILE = path.join(DATA_DIR, 'app-records.json');

const SEED_ITEMS = ${seedJson};

// 优先使用 Node.js 内置原生 SQLite（0 外部依赖，WAL 防丢数据）；若旧版 Node 无 node:sqlite 自动降级磁盘原子文件存储
let sqliteDb = null;
try {
  const sqliteMod = await import('node:sqlite');
  if (sqliteMod && sqliteMod.DatabaseSync) {
    sqliteDb = new sqliteMod.DatabaseSync(DB_FILE);
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    sqliteDb.exec(\`
      CREATE TABLE IF NOT EXISTS ${table} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        note TEXT DEFAULT '',
        amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL
      );
    \`);
    const countRow = sqliteDb.prepare('SELECT COUNT(*) AS cnt FROM ${table}').get();
    if (!countRow || Number(countRow.cnt) === 0) {
      const insertSeed = sqliteDb.prepare(
        'INSERT INTO ${table} (title, note, amount, status, created_at) VALUES (?, ?, ?, ?, ?)'
      );
      const now = new Date().toISOString();
      for (const item of SEED_ITEMS) {
        insertSeed.run(item.title, item.note, Number(item.amount) || 0, item.status || 'pending', now);
      }
    }
  }
} catch {
  sqliteDb = null;
}

function readDiskFallback() {
  if (!fs.existsSync(JSON_FALLBACK_FILE)) {
    const now = new Date().toISOString();
    const seeded = SEED_ITEMS.map((it, idx) => ({
      id: idx + 1,
      title: it.title,
      note: it.note || '',
      amount: Number(it.amount) || 0,
      status: it.status || 'pending',
      created_at: now
    }));
    fs.writeFileSync(JSON_FALLBACK_FILE, JSON.stringify(seeded, null, 2), 'utf8');
    return seeded;
  }
  return JSON.parse(fs.readFileSync(JSON_FALLBACK_FILE, 'utf8'));
}

function writeDiskFallback(rows) {
  const tmp = JSON_FALLBACK_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2), 'utf8');
  fs.renameSync(tmp, JSON_FALLBACK_FILE);
}

export function listRecords(keyword = '') {
  const q = String(keyword || '').trim().toLowerCase();
  if (sqliteDb) {
    if (q) {
      return sqliteDb
        .prepare('SELECT * FROM ${table} WHERE LOWER(title) LIKE ? OR LOWER(note) LIKE ? ORDER BY id DESC')
        .all(\`%\${q}%\`, \`%\${q}%\`);
    }
    return sqliteDb.prepare('SELECT * FROM ${table} ORDER BY id DESC').all();
  }
  const rows = readDiskFallback();
  const filtered = q
    ? rows.filter(r => r.title.toLowerCase().includes(q) || (r.note || '').toLowerCase().includes(q))
    : rows;
  return filtered.sort((a, b) => b.id - a.id);
}

export function createRecord({ title, note = '', amount = 0 }) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('请填写名称后再保存');
  const cleanNote = String(note || '').trim();
  const numAmount = Number(amount) || 0;
  const now = new Date().toISOString();

  if (sqliteDb) {
    const info = sqliteDb
      .prepare('INSERT INTO ${table} (title, note, amount, status, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(cleanTitle, cleanNote, numAmount, 'pending', now);
    return sqliteDb.prepare('SELECT * FROM ${table} WHERE id = ?').get(info.lastInsertRowid);
  }

  const rows = readDiskFallback();
  const nextId = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
  const created = { id: nextId, title: cleanTitle, note: cleanNote, amount: numAmount, status: 'pending', created_at: now };
  rows.push(created);
  writeDiskFallback(rows);
  return created;
}

export function toggleRecord(id) {
  const numId = Number(id);
  if (sqliteDb) {
    const existing = sqliteDb.prepare('SELECT * FROM ${table} WHERE id = ?').get(numId);
    if (!existing) throw new Error('未找到该条记录');
    const nextStatus = existing.status === 'done' ? 'pending' : 'done';
    sqliteDb.prepare('UPDATE ${table} SET status = ? WHERE id = ?').run(nextStatus, numId);
    return sqliteDb.prepare('SELECT * FROM ${table} WHERE id = ?').get(numId);
  }

  const rows = readDiskFallback();
  const target = rows.find(r => Number(r.id) === numId);
  if (!target) throw new Error('未找到该条记录');
  target.status = target.status === 'done' ? 'pending' : 'done';
  writeDiskFallback(rows);
  return target;
}

export function deleteRecord(id) {
  const numId = Number(id);
  if (sqliteDb) {
    sqliteDb.prepare('DELETE FROM ${table} WHERE id = ?').run(numId);
    return { deletedId: numId };
  }
  const rows = readDiskFallback().filter(r => Number(r.id) !== numId);
  writeDiskFallback(rows);
  return { deletedId: numId };
}
`;
}

function buildServerMjs(bp) {
  return `import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listRecords, createRecord, toggleRecord, deleteRecord } from './db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT) || 3090;

// 🛡️ 全局防崩装甲：哪怕某处异步报错，绝不让整个服务进程直接死机退出
process.on('uncaughtException', err => {
  console.error('[GhostCTO 防崩护盾] 捕获未处理异常，服务继续安全运行:', err.message);
});
process.on('unhandledRejection', err => {
  console.error('[GhostCTO 防崩护盾] 捕获未处理 Promise 异常:', err);
});

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk.toString('utf8');
      if (raw.length > 512_000) reject(new Error('提交内容过大'));
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('提交的数据格式不正确'));
      }
    });
    req.on('error', reject);
  });
}

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8'
};

export const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || '/', \`http://127.0.0.1:\${PORT}\`);
  const pathname = urlObj.pathname;

  // 🛡️ 路由级防崩保护罩：任何单接口报错都会返回清晰中文 JSON，绝不挂机
  try {
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true, app: ${JSON.stringify(bp.appName)} });
    }

    if (pathname === '/api/records' && req.method === 'GET') {
      const q = urlObj.searchParams.get('q') || '';
      const items = listRecords(q);
      return sendJson(res, 200, { ok: true, items });
    }

    if (pathname === '/api/records/create' && req.method === 'POST') {
      const body = await readJson(req);
      const item = createRecord(body);
      return sendJson(res, 200, { ok: true, item });
    }

    if (pathname === '/api/records/toggle' && req.method === 'POST') {
      const body = await readJson(req);
      const item = toggleRecord(body.id);
      return sendJson(res, 200, { ok: true, item });
    }

    if (pathname === '/api/records/delete' && req.method === 'POST') {
      const body = await readJson(req);
      const out = deleteRecord(body.id);
      return sendJson(res, 200, { ok: true, ...out });
    }

    // 静态页面服务
    const safeRel = pathname === '/' ? 'index.html' : pathname.replace(/^\\/+/, '');
    const filePath = path.resolve(PUBLIC_DIR, safeRel);
    if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return sendJson(res, 404, { ok: false, error: '未找到页面或接口: ' + pathname });
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_MAP[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(filePath));
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message || '服务器处理出错' });
  }
});

if (import.meta.url === \`file://\${process.argv[1]}\`) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(\`🚀 【${bp.appName}】已成功启动：http://127.0.0.1:\${PORT}\`);
  });
}
`;
}

function buildIndexHtml(bp) {
  const esc = s =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(bp.appName)}</title>
  <style>
    :root {
      --bg: #F8F7F4;
      --card: #FFFFFF;
      --text: #18181B;
      --muted: #64646E;
      --border: #E5E4DF;
      --primary: #18181B;
      --green: #059669;
      --amber: #D97706;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 28px 18px 80px;
      -webkit-font-smoothing: antialiased;
    }
    .wrap { max-width: 920px; margin: 0 auto; }
    .header {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px 26px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .header h1 { font-size: 22px; font-weight: 700; }
    .header p { font-size: 13.5px; color: var(--muted); margin-top: 4px; }
    .badge-ok {
      background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0;
      padding: 6px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 600;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px;
      margin-bottom: 18px;
    }
    .stat-card {
      background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px;
    }
    .stat-num { font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .stat-label { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
    .form-card, .list-card {
      background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 20px 22px; margin-bottom: 18px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 2fr 2fr 1.2fr auto;
      gap: 10px;
      margin-top: 12px;
    }
    @media (max-width: 720px) {
      .form-grid { grid-template-columns: 1fr; }
    }
    input {
      width: 100%; padding: 10px 13px; border: 1px solid #D4D4D8; border-radius: 9px;
      font-size: 14px; background: #FAFAF9; color: var(--text);
    }
    input:focus { outline: 2px solid #2563EB; border-color: transparent; background: #FFF; }
    .btn {
      background: var(--primary); color: #FFF; border: none; border-radius: 9px;
      padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap;
    }
    .btn:hover { opacity: 0.9; }
    .btn-ghost {
      background: #F4F4F5; color: var(--text); border: 1px solid var(--border);
      padding: 5px 11px; font-size: 12.5px; border-radius: 7px; cursor: pointer;
    }
    .btn-del {
      background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA;
      padding: 5px 10px; font-size: 12px; border-radius: 7px; cursor: pointer;
    }
    .toolbar {
      display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;
    }
    .item-row {
      display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
      padding: 14px 0; border-top: 1px solid var(--border);
    }
    .item-title { font-size: 15.5px; font-weight: 600; }
    .item-note { font-size: 13px; color: var(--muted); margin-top: 2px; }
    .tag-done { background: #ECFDF5; color: var(--green); padding: 3px 9px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .tag-pending { background: #FFFBEB; color: var(--amber); padding: 3px 9px; border-radius: 6px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div>
        <h1>${esc(bp.appName)}</h1>
        <p>${esc(bp.archetypeLabel)} · 数据已连通本地真实 SQLite 数据库（按 F5 刷新或重启电脑绝不丢失）</p>
      </div>
      <span class="badge-ok">🟢 真落库防崩保护中</span>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div id="stat-total" class="stat-num">0</div>
        <div class="stat-label">全部记录总数</div>
      </div>
      <div class="stat-card">
        <div id="stat-done" class="stat-num" style="color: var(--green);">0</div>
        <div class="stat-label">${esc(bp.labels.statusActiveText)}</div>
      </div>
      <div class="stat-card">
        <div id="stat-amount" class="stat-num">0</div>
        <div class="stat-label">累计 · ${esc(bp.labels.amountLabel)}</div>
      </div>
    </div>

    <div class="form-card">
      <h3 style="font-size: 16px;">➕ 新增一条记录</h3>
      <form id="create-form" class="form-grid">
        <input id="inp-title" type="text" required placeholder="${esc(bp.labels.titleLabel)}（必填）" />
        <input id="inp-note" type="text" placeholder="${esc(bp.labels.subLabel)}" />
        <input id="inp-amount" type="number" step="any" placeholder="${esc(bp.labels.amountLabel)}" />
        <button type="submit" class="btn">真实保存入库</button>
      </form>
    </div>

    <div class="list-card">
      <div class="toolbar">
        <h3 style="font-size: 16px;">📋 全部数据明细</h3>
        <input id="inp-search" type="text" style="max-width: 260px;" placeholder="🔍 输入关键词筛选..." />
      </div>
      <div id="items-box">正在加载真实数据库记录...</div>
    </div>
  </div>

  <script src="/vibe-shield.js"></script>
  <script>
    const DONE_TEXT = ${JSON.stringify(bp.labels.statusActiveText)};
    const PENDING_TEXT = ${JSON.stringify(bp.labels.statusPendingText)};
    const AMOUNT_LABEL = ${JSON.stringify(bp.labels.amountLabel)};

    async function loadItems(q = '') {
      const res = await fetch('/api/records?q=' + encodeURIComponent(q));
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '加载失败');
      renderItems(data.items || []);
    }

    function renderItems(items) {
      document.getElementById('stat-total').textContent = items.length;
      document.getElementById('stat-done').textContent = items.filter(i => i.status === 'done').length;
      const sum = items.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      document.getElementById('stat-amount').textContent = Math.round(sum * 100) / 100;

      const box = document.getElementById('items-box');
      if (items.length === 0) {
        box.innerHTML = '<p style="color:#64646E;padding:16px 0;font-size:14px;">暂无匹配记录，在上方填一行试试吧！</p>';
        return;
      }
      box.innerHTML = '';
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'item-row';

        const left = document.createElement('div');
        const titleEl = document.createElement('div');
        titleEl.className = 'item-title';
        titleEl.textContent = item.title + (Number(item.amount) ? ' · ' + AMOUNT_LABEL + ': ' + item.amount : '');
        const noteEl = document.createElement('div');
        noteEl.className = 'item-note';
        noteEl.textContent = item.note || '无备注';
        left.appendChild(titleEl);
        left.appendChild(noteEl);

        const right = document.createElement('div');
        right.style.cssText = 'display:flex;gap:8px;align-items:center;';

        const tag = document.createElement('span');
        tag.className = item.status === 'done' ? 'tag-done' : 'tag-pending';
        tag.textContent = item.status === 'done' ? DONE_TEXT : PENDING_TEXT;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn-ghost';
        toggleBtn.textContent = item.status === 'done' ? '设为待处理' : '标记完成';
        toggleBtn.onclick = async () => {
          await fetch('/api/records/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id })
          });
          loadItems(document.getElementById('inp-search').value);
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'btn-del';
        delBtn.textContent = '删除';
        delBtn.onclick = async () => {
          await fetch('/api/records/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id })
          });
          loadItems(document.getElementById('inp-search').value);
        };

        right.appendChild(tag);
        right.appendChild(toggleBtn);
        right.appendChild(delBtn);

        row.appendChild(left);
        row.appendChild(right);
        box.appendChild(row);
      });
    }

    document.getElementById('create-form').addEventListener('submit', async ev => {
      ev.preventDefault();
      const title = document.getElementById('inp-title').value.trim();
      const note = document.getElementById('inp-note').value.trim();
      const amount = document.getElementById('inp-amount').value;
      if (!title) return;
      const res = await fetch('/api/records/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, note, amount })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || '保存失败');
      document.getElementById('inp-title').value = '';
      document.getElementById('inp-note').value = '';
      document.getElementById('inp-amount').value = '';
      loadItems(document.getElementById('inp-search').value);
    });

    document.getElementById('inp-search').addEventListener('input', ev => {
      loadItems(ev.target.value);
    });

    loadItems();
  </script>
</body>
</html>
`;
}

/**
 * Turn a blank folder + a messy 3-word beginner idea into a working, crash-armored,
 * SQLite-backed Golden Starter App + `.vibe/blueprint.md` + Time Machine Checkpoint!
 */
export function bootstrapGoldenApp(targetRootDir, rawFragment = '', prefs = {}) {
  const absRoot = path.resolve(targetRootDir);
  fs.mkdirSync(absRoot, { recursive: true });

  const bp = saveIdeaBlueprint(absRoot, rawFragment, prefs);
  const existingWs = scanWorkspace(absRoot);

  // Safety guard: never clobber an existing project that already has business code!
  if (existingWs.codeFiles.length > 0 && !prefs.force) {
    return {
      scaffolded: false,
      reason: 'EXISTING_CODE_PRESERVED',
      blueprint: bp,
      message: '当前文件夹已有业务代码，已为您安全生成 `.vibe/blueprint.md` 施工蓝图（未覆盖任何现有代码）。'
    };
  }

  const pkgJson = {
    name: 'my-vibe-app',
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: {
      start: 'node src/server.mjs',
      verify: 'node .vibe/engine/bin/ghost-cto.mjs verify'
    }
  };

  fs.mkdirSync(path.join(absRoot, 'src'), { recursive: true });
  fs.mkdirSync(path.join(absRoot, 'public'), { recursive: true });
  fs.mkdirSync(path.join(absRoot, 'data'), { recursive: true });

  fs.writeFileSync(path.join(absRoot, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(absRoot, 'src', 'db.mjs'), buildDbMjs(bp), 'utf8');
  fs.writeFileSync(path.join(absRoot, 'src', 'server.mjs'), buildServerMjs(bp), 'utf8');
  fs.writeFileSync(path.join(absRoot, 'public', 'vibe-shield.js'), buildVibeShieldBrowserJs(), 'utf8');
  fs.writeFileSync(path.join(absRoot, 'public', 'index.html'), buildIndexHtml(bp), 'utf8');

  const ws = scanWorkspace(absRoot);
  const audit = runRealityAudit(ws);
  writeMemoryCapsule(ws, audit);
  generateSelfHealingLaunchers(ws);
  const cp = saveCheckpoint(absRoot, `零出错黄金底座已就绪：${bp.appName}`);
  const wsAfter = scanWorkspace(absRoot);
  const auditAfter = runRealityAudit(wsAfter);
  generateBossDashboard(wsAfter, auditAfter);

  return {
    scaffolded: true,
    blueprint: bp,
    score: auditAfter.score,
    checkpointId: cp.id,
    startPort: 3090,
    message: `🎉 已把你的零碎想法变成真能跑、真存库的零出错底座【${bp.appName}】（商用健康分 ${auditAfter.score} 分 🟢）！`
  };
}
