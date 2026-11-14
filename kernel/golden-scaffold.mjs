import fs from 'node:fs';
import path from 'node:path';
import { saveIdeaBlueprint } from './idea-incubator.mjs';
import { scanWorkspace } from './scanner.mjs';
import { runRealityAudit } from './reality-audit.mjs';
import { saveCheckpoint } from './time-capsule.mjs';
import { writeMemoryCapsule } from './memory-capsule.mjs';
import { generateBossDashboard, generateSelfHealingLaunchers } from './boss-dashboard.mjs';

function buildGitignore() {
  return [
    'node_modules/',
    '.DS_Store',
    '.env',
    '.env.*',
    '!.env.example',
    'data/*.sqlite-wal',
    'data/*.sqlite-shm',
    '.vibe/checkpoints/'
  ].join('\n') + '\n';
}

function buildEnvExample(bp) {
  const lines = [
    '# 服务运行端口',
    'PORT=3090'
  ];
  if (bp.needPassword) {
    lines.push(
      '# 首次启动默认管理员账号与初始密码（正式上线前请在网页右上角修改密码或通过 .env 覆盖）',
      'ADMIN_USERNAME=admin',
      'ADMIN_INIT_PASSWORD=Admin@123456',
      'SESSION_TTL_HOURS=168'
    );
  }
  return lines.join('\n') + '\n';
}

function buildDockerfile() {
  return [
    'FROM node:22-alpine',
    'WORKDIR /app',
    'COPY package.json ./',
    'COPY src ./src',
    'COPY public ./public',
    'RUN mkdir -p /app/data',
    'VOLUME ["/app/data"]',
    'ENV NODE_ENV=production',
    'ENV PORT=3090',
    'EXPOSE 3090',
    'CMD ["node", "src/server.mjs"]'
  ].join('\n') + '\n';
}

function buildVibeShieldBrowserJs() {
  return `// 🛡️ GhostCTO 小白防白屏与报错自动捕获护盾 (0 外部依赖)
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
      var fixPrompt = '我的网页刚刚触发了报错，请你精准定位修复（不要乱改其他正常功能），修好后必须执行 ghost-cto verify：\\n[' + kind + '] ' + msg + (where ? ' (' + where + ')' : '');
      banner.innerHTML = '';
      var textSpan = document.createElement('div');
      textSpan.style.cssText = 'flex:1;min-width:220px;line-height:1.5;';
      textSpan.textContent = '🛡️ 影子 CTO 拦截到一个页面异常（应用已保护未白屏）：' + msg;

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
        copyBtn.textContent = '✅ 已复制！去聊天框粘贴给 AI 即可';
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
    } catch (err) {
      console.warn('[vibe-shield]', err);
    }
  }

  window.addEventListener('error', function (ev) {
    var loc = (ev.filename ? ev.filename.split('/').pop() : '') + (ev.lineno ? ':' + ev.lineno : '');
    showRescueBar('前端脚本异常', ev.message || '未知脚本错误', loc);
  });

  window.addEventListener('unhandledrejection', function (ev) {
    var reason = (ev.reason && (ev.reason.message || String(ev.reason))) || '异步请求异常';
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
          }).catch(function (parseErr) {
            console.warn('[vibe-shield]', parseErr);
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
  const labelsJson = JSON.stringify(bp.labels);
  return `import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'app.sqlite');
const JSON_FALLBACK_FILE = path.join(DATA_DIR, 'app-records.json');
const SEED_ITEMS = ${seedJson};
const LABELS = ${labelsJson};

export let sqliteDb = null;
try {
  const sqliteMod = await import('node:sqlite');
  if (sqliteMod && sqliteMod.DatabaseSync) {
    sqliteDb = new sqliteMod.DatabaseSync(DB_FILE);
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    sqliteDb.exec('PRAGMA busy_timeout = 5000;');
    sqliteDb.exec(\`
      CREATE TABLE IF NOT EXISTS ${table} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        note TEXT DEFAULT '',
        amount REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    \`);
    const countRow = sqliteDb.prepare('SELECT COUNT(*) AS cnt FROM ${table}').get();
    if (!countRow || Number(countRow.cnt) === 0) {
      const insertSeed = sqliteDb.prepare(
        'INSERT INTO ${table} (title, note, amount, status, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      );
      const now = new Date().toISOString();
      for (const item of SEED_ITEMS) {
        insertSeed.run(item.title, item.note || '', Number(item.amount) || 0, item.status || 'pending', now, now);
      }
    }
  }
} catch (err) {
  sqliteDb = null;
  if (process.env.DEBUG_SQLITE) console.warn('[db-fallback]', err.message);
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
      updated_at: now,
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

export function maskPhoneNumbers(text) {
  return String(text || '').replace(/(?<!\\d)(1[3-9]\\d)[-\\s]?(\\d{4})[-\\s]?(\\d{4})(?!\\d)/g, '$1****$3');
}

export function listRecords(queryOrOpts = '') {
  const opts = typeof queryOrOpts === 'string' ? { q: queryOrOpts, status: 'all' } : (queryOrOpts || {});
  const q = String(opts.q || '').trim().toLowerCase();
  const statusFilter = opts.status === 'done' || opts.status === 'pending' ? opts.status : 'all';

  let rows;
  if (sqliteDb) {
    rows = sqliteDb.prepare('SELECT * FROM ${table} ORDER BY id DESC').all();
  } else {
    rows = readDiskFallback().sort((a, b) => b.id - a.id);
  }

  return rows.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!q) return true;
    return String(r.title || '').toLowerCase().includes(q) || String(r.note || '').toLowerCase().includes(q);
  });
}

export function createRecord({ title, note = '', amount = 0 }) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('请填写名称后再保存');
  if (cleanTitle.length > 120) throw new Error('名称长度请勿超过 120 字');
  const cleanNote = String(note || '').trim();
  const numAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const now = new Date().toISOString();

  if (sqliteDb) {
    const info = sqliteDb
      .prepare('INSERT INTO ${table} (title, note, amount, status, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(cleanTitle, cleanNote, numAmount, 'pending', now, now);
    return sqliteDb.prepare('SELECT * FROM ${table} WHERE id = ?').get(info.lastInsertRowid);
  }

  const rows = readDiskFallback();
  const nextId = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
  const created = { id: nextId, title: cleanTitle, note: cleanNote, amount: numAmount, status: 'pending', updated_at: now, created_at: now };
  rows.push(created);
  writeDiskFallback(rows);
  return created;
}

export function updateRecord(id, { title, note, amount, status }) {
  const numId = Number(id);
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('名称不能为空');
  const cleanNote = String(note ?? '').trim();
  const numAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const now = new Date().toISOString();

  if (sqliteDb) {
    const existing = sqliteDb.prepare('SELECT * FROM ${table} WHERE id = ?').get(numId);
    if (!existing) throw new Error('未找到该条记录');
    const nextStatus = status === 'done' || status === 'pending' ? status : existing.status;
    sqliteDb
      .prepare('UPDATE ${table} SET title = ?, note = ?, amount = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(cleanTitle, cleanNote, numAmount, nextStatus, now, numId);
    return sqliteDb.prepare('SELECT * FROM ${table} WHERE id = ?').get(numId);
  }

  const rows = readDiskFallback();
  const target = rows.find(r => Number(r.id) === numId);
  if (!target) throw new Error('未找到该条记录');
  target.title = cleanTitle;
  target.note = cleanNote;
  target.amount = numAmount;
  if (status === 'done' || status === 'pending') target.status = status;
  target.updated_at = now;
  writeDiskFallback(rows);
  return target;
}

export function toggleRecord(id) {
  const numId = Number(id);
  const now = new Date().toISOString();
  if (sqliteDb) {
    const existing = sqliteDb.prepare('SELECT * FROM ${table} WHERE id = ?').get(numId);
    if (!existing) throw new Error('未找到该条记录');
    const nextStatus = existing.status === 'done' ? 'pending' : 'done';
    sqliteDb.prepare('UPDATE ${table} SET status = ?, updated_at = ? WHERE id = ?').run(nextStatus, now, numId);
    return sqliteDb.prepare('SELECT * FROM ${table} WHERE id = ?').get(numId);
  }

  const rows = readDiskFallback();
  const target = rows.find(r => Number(r.id) === numId);
  if (!target) throw new Error('未找到该条记录');
  target.status = target.status === 'done' ? 'pending' : 'done';
  target.updated_at = now;
  writeDiskFallback(rows);
  return target;
}

export function deleteRecord(id) {
  const numId = Number(id);
  if (sqliteDb) {
    const existing = sqliteDb.prepare('SELECT * FROM ${table} WHERE id = ?').get(numId);
    if (!existing) throw new Error('未找到要删除的记录');
    sqliteDb.prepare('DELETE FROM ${table} WHERE id = ?').run(numId);
    return { deletedId: numId, deletedTitle: existing.title };
  }
  const before = readDiskFallback();
  const existing = before.find(r => Number(r.id) === numId);
  if (!existing) throw new Error('未找到要删除的记录');
  writeDiskFallback(before.filter(r => Number(r.id) !== numId));
  return { deletedId: numId, deletedTitle: existing.title };
}

function escapeCsvCell(val) {
  const s = String(val ?? '');
  if (/[",\\r\\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function exportRecordsCsv({ maskPhone = false } = {}) {
  const rows = listRecords({ q: '', status: 'all' });
  const header = ['编号', LABELS.titleLabel, LABELS.subLabel, LABELS.amountLabel, '当前状态', '创建时间'];
  const lines = [header.map(escapeCsvCell).join(',')];
  for (const r of rows) {
    const noteText = maskPhone ? maskPhoneNumbers(r.note) : r.note;
    const statusText = r.status === 'done' ? LABELS.statusActiveText : LABELS.statusPendingText;
    lines.push(
      [r.id, r.title, noteText, r.amount, statusText, String(r.created_at || '').slice(0, 19).replace('T', ' ')]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  // Prepend UTF-8 BOM (\\uFEFF) so Microsoft Excel / WPS opens Chinese CSV with 0 garbled text
  return '\\uFEFF' + lines.join('\\r\\n') + '\\r\\n';
}
`;
}

function buildAuthMjs() {
  return `import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { sqliteDb, DATA_DIR } from './db.mjs';

const AUTH_FALLBACK_FILE = path.join(DATA_DIR, 'auth-store.json');
const SESSION_COOKIE = 'vibe_sid';
const DEFAULT_ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASS = process.env.ADMIN_INIT_PASSWORD || 'Admin@123456';
const SESSION_TTL_MS = (Number(process.env.SESSION_TTL_HOURS) || 168) * 3600 * 1000;

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(plain), salt, 64).toString('hex');
  return \`scrypt$\${salt}$\${derived}\`;
}

export function verifyPassword(plain, storedHash) {
  const parts = String(storedHash || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(String(plain), salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

if (sqliteDb) {
  sqliteDb.exec(\`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      password_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  \`);
  const userCnt = sqliteDb.prepare('SELECT COUNT(*) AS cnt FROM users').get();
  if (!userCnt || Number(userCnt.cnt) === 0) {
    const now = new Date().toISOString();
    sqliteDb
      .prepare('INSERT INTO users (username, display_name, role, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)')
      .run(DEFAULT_ADMIN_USER, '店长管理员', 'admin', hashPassword(DEFAULT_ADMIN_PASS), now);
  }
}

function readAuthFallback() {
  if (!fs.existsSync(AUTH_FALLBACK_FILE)) {
    const now = new Date().toISOString();
    const initial = {
      users: [
        {
          id: 1,
          username: DEFAULT_ADMIN_USER,
          display_name: '店长管理员',
          role: 'admin',
          password_hash: hashPassword(DEFAULT_ADMIN_PASS),
          active: 1,
          created_at: now
        }
      ],
      sessions: [],
      audit_logs: []
    };
    fs.writeFileSync(AUTH_FALLBACK_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  return JSON.parse(fs.readFileSync(AUTH_FALLBACK_FILE, 'utf8'));
}

function writeAuthFallback(data) {
  const tmp = AUTH_FALLBACK_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, AUTH_FALLBACK_FILE);
}

export function appendAuditLog(actor, action, detail) {
  const now = new Date().toISOString();
  if (sqliteDb) {
    sqliteDb
      .prepare('INSERT INTO audit_logs (actor, action, detail, created_at) VALUES (?, ?, ?, ?)')
      .run(String(actor), String(action), String(detail), now);
    return;
  }
  const store = readAuthFallback();
  store.audit_logs.unshift({ id: store.audit_logs.length + 1, actor, action, detail, created_at: now });
  store.audit_logs = store.audit_logs.slice(0, 200);
  writeAuthFallback(store);
}

export function listAuditLogs(limit = 30) {
  if (sqliteDb) {
    return sqliteDb.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?').all(Number(limit) || 30);
  }
  return readAuthFallback().audit_logs.slice(0, Number(limit) || 30);
}

export function loginWithPassword(username, password) {
  const cleanUser = String(username || '').trim();
  if (!cleanUser || !password) throw new Error('请输入账号和密码');

  let user = null;
  if (sqliteDb) {
    user = sqliteDb.prepare('SELECT * FROM users WHERE username = ?').get(cleanUser);
  } else {
    user = readAuthFallback().users.find(u => u.username === cleanUser) || null;
  }
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new Error('账号或密码不正确');
  }
  if (!Number(user.active)) {
    throw new Error('该员工账号已被停用，请联系管理员');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  if (sqliteDb) {
    sqliteDb
      .prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .run(token, user.id, expiresAt, now.toISOString());
  } else {
    const store = readAuthFallback();
    store.sessions.push({ token, user_id: user.id, expires_at: expiresAt, created_at: now.toISOString() });
    writeAuthFallback(store);
  }

  appendAuditLog(user.username, '登录系统', \`角色: \${user.role}\`);
  return {
    token,
    cookieHeader: \`\${SESSION_COOKIE}=\${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=\${Math.floor(SESSION_TTL_MS / 1000)}\`,
    user: { id: user.id, username: user.username, displayName: user.display_name, role: user.role }
  };
}

export function extractTokenFromRequest(req) {
  const authHdr = String(req.headers?.authorization || '');
  if (authHdr.toLowerCase().startsWith('bearer ')) {
    return authHdr.slice(7).trim();
  }
  const cookieHdr = String(req.headers?.cookie || '');
  for (const part of cookieHdr.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === SESSION_COOKIE) return rest.join('=').trim();
  }
  return '';
}

export function logoutSession(req) {
  const token = extractTokenFromRequest(req);
  if (token) {
    if (sqliteDb) {
      sqliteDb.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    } else {
      const store = readAuthFallback();
      store.sessions = store.sessions.filter(s => s.token !== token);
      writeAuthFallback(store);
    }
  }
  return \`\${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0\`;
}

export function getAuthUser(req) {
  const token = extractTokenFromRequest(req);
  if (!token) return null;
  const nowIso = new Date().toISOString();

  if (sqliteDb) {
    const row = sqliteDb
      .prepare(
        'SELECT u.id, u.username, u.display_name, u.role, u.active, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?'
      )
      .get(token);
    if (!row || !Number(row.active) || row.expires_at < nowIso) return null;
    return { id: row.id, username: row.username, displayName: row.display_name, role: row.role };
  }

  const store = readAuthFallback();
  const sess = store.sessions.find(s => s.token === token);
  if (!sess || sess.expires_at < nowIso) return null;
  const user = store.users.find(u => u.id === sess.user_id && Number(u.active));
  if (!user) return null;
  return { id: user.id, username: user.username, displayName: user.display_name, role: user.role };
}

export function requireAuth(req, res) {
  const user = getAuthUser(req);
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: '请先登录账号后再操作' }));
    return null;
  }
  return user;
}

export function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: '权限不足：仅店长管理员可执行此敏感操作' }));
    return null;
  }
  return user;
}

export function changeUserPassword(userId, oldPassword, newPassword) {
  const nextPass = String(newPassword || '');
  if (nextPass.length < 6) throw new Error('新密码长度至少需要 6 位');
  if (sqliteDb) {
    const u = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(Number(userId));
    if (!u || !verifyPassword(oldPassword, u.password_hash)) throw new Error('原密码输入不正确');
    sqliteDb.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(nextPass), u.id);
    appendAuditLog(u.username, '修改登录密码', '已完成加密更新');
    return { ok: true };
  }
  const store = readAuthFallback();
  const u = store.users.find(x => x.id === Number(userId));
  if (!u || !verifyPassword(oldPassword, u.password_hash)) throw new Error('原密码输入不正确');
  u.password_hash = hashPassword(nextPass);
  writeAuthFallback(store);
  appendAuditLog(u.username, '修改登录密码', '已完成加密更新');
  return { ok: true };
}

export function listUsers() {
  if (sqliteDb) {
    return sqliteDb
      .prepare('SELECT id, username, display_name, role, active, created_at FROM users ORDER BY id ASC')
      .all();
  }
  return readAuthFallback().users.map(({ password_hash, ...safe }) => safe);
}

export function createStaffUser({ username, displayName, password, role = 'staff' }, actorName = 'admin') {
  const cleanUser = String(username || '').trim();
  const cleanName = String(displayName || cleanUser).trim();
  const safeRole = role === 'admin' ? 'admin' : 'staff';
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(cleanUser)) {
    throw new Error('登录账号请使用 3-32 位字母、数字或下划线');
  }
  if (String(password || '').length < 6) {
    throw new Error('员工初始密码至少需要 6 位');
  }
  const now = new Date().toISOString();
  const hashed = hashPassword(password);

  if (sqliteDb) {
    const dup = sqliteDb.prepare('SELECT id FROM users WHERE username = ?').get(cleanUser);
    if (dup) throw new Error('该登录账号已存在，请换一个用户名');
    const info = sqliteDb
      .prepare('INSERT INTO users (username, display_name, role, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)')
      .run(cleanUser, cleanName, safeRole, hashed, now);
    appendAuditLog(actorName, '开通子账号', \`\${cleanUser} (\${safeRole})\`);
    return sqliteDb
      .prepare('SELECT id, username, display_name, role, active, created_at FROM users WHERE id = ?')
      .get(info.lastInsertRowid);
  }

  const store = readAuthFallback();
  if (store.users.some(u => u.username === cleanUser)) throw new Error('该登录账号已存在');
  const created = {
    id: store.users.reduce((m, u) => Math.max(m, u.id), 0) + 1,
    username: cleanUser,
    display_name: cleanName,
    role: safeRole,
    password_hash: hashed,
    active: 1,
    created_at: now
  };
  store.users.push(created);
  writeAuthFallback(store);
  appendAuditLog(actorName, '开通子账号', \`\${cleanUser} (\${safeRole})\`);
  const { password_hash, ...safe } = created;
  return safe;
}

export function toggleUserActive(targetUserId, currentAdminId, actorName = 'admin') {
  const numId = Number(targetUserId);
  if (numId === Number(currentAdminId)) {
    throw new Error('不能停用当前正在登录的管理员自己');
  }
  if (sqliteDb) {
    const u = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(numId);
    if (!u) throw new Error('未找到该账号');
    const nextActive = Number(u.active) ? 0 : 1;
    sqliteDb.prepare('UPDATE users SET active = ? WHERE id = ?').run(nextActive, numId);
    if (!nextActive) sqliteDb.prepare('DELETE FROM sessions WHERE user_id = ?').run(numId);
    appendAuditLog(actorName, nextActive ? '启用账号' : '停用账号', u.username);
    return sqliteDb.prepare('SELECT id, username, display_name, role, active, created_at FROM users WHERE id = ?').get(numId);
  }
  const store = readAuthFallback();
  const u = store.users.find(x => x.id === numId);
  if (!u) throw new Error('未找到该账号');
  u.active = Number(u.active) ? 0 : 1;
  if (!u.active) store.sessions = store.sessions.filter(s => s.user_id !== numId);
  writeAuthFallback(store);
  appendAuditLog(actorName, u.active ? '启用账号' : '停用账号', u.username);
  const { password_hash, ...safe } = u;
  return safe;
}
`;
}

function buildServerMjs(bp) {
  const isCommercial = Boolean(bp.needPassword);
  const authImport = isCommercial
    ? `import {
  loginWithPassword,
  logoutSession,
  getAuthUser,
  requireAuth,
  requireAdmin,
  changeUserPassword,
  listUsers,
  createStaffUser,
  toggleUserActive,
  appendAuditLog,
  listAuditLogs
} from './auth.mjs';\n`
    : '';

  const authRoutesBlock = isCommercial
    ? `
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = getAuthUser(req);
      return sendJson(res, 200, { ok: true, authRequired: true, user });
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const body = await readJson(req);
      const session = loginWithPassword(body.username, body.password);
      return sendJson(res, 200, { ok: true, user: session.user, token: session.token }, { 'Set-Cookie': session.cookieHeader });
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      const clearCookie = logoutSession(req);
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie });
    }

    if (pathname === '/api/auth/change-password' && req.method === 'POST') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await readJson(req);
      changeUserPassword(user.id, body.oldPassword, body.newPassword);
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === '/api/admin/users' && req.method === 'GET') {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      return sendJson(res, 200, { ok: true, users: listUsers() });
    }

    if (pathname === '/api/admin/users/create' && req.method === 'POST') {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      const body = await readJson(req);
      const created = createStaffUser(body, admin.username);
      return sendJson(res, 200, { ok: true, user: created });
    }

    if (pathname === '/api/admin/users/toggle' && req.method === 'POST') {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      const body = await readJson(req);
      const updated = toggleUserActive(body.id, admin.id, admin.username);
      return sendJson(res, 200, { ok: true, user: updated });
    }

    if (pathname === '/api/admin/audit-logs' && req.method === 'GET') {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      return sendJson(res, 200, { ok: true, logs: listAuditLogs(40) });
    }
`
    : '';

  const recordRoutesBlock = isCommercial
    ? `
    if (pathname === '/api/records' && req.method === 'GET') {
      const user = requireAuth(req, res);
      if (!user) return;
      const q = urlObj.searchParams.get('q') || '';
      const status = urlObj.searchParams.get('status') || 'all';
      const rawItems = listRecords({ q, status });
      const items = user.role === 'admin'
        ? rawItems
        : rawItems.map(it => ({ ...it, note: maskPhoneNumbers(it.note) }));
      return sendJson(res, 200, { ok: true, items, role: user.role });
    }

    if (pathname === '/api/records/create' && req.method === 'POST') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await readJson(req);
      const item = createRecord(body);
      appendAuditLog(user.username, '新增记录', item.title);
      return sendJson(res, 200, { ok: true, item });
    }

    if (pathname === '/api/records/update' && req.method === 'POST') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await readJson(req);
      const item = updateRecord(body.id, body);
      appendAuditLog(user.username, '编辑记录', item.title);
      return sendJson(res, 200, { ok: true, item });
    }

    if (pathname === '/api/records/toggle' && req.method === 'POST') {
      const user = requireAuth(req, res);
      if (!user) return;
      const body = await readJson(req);
      const item = toggleRecord(body.id);
      appendAuditLog(user.username, '切换状态', \`\${item.title} -> \${item.status}\`);
      return sendJson(res, 200, { ok: true, item });
    }

    if (pathname === '/api/records/delete' && req.method === 'POST') {
      const admin = requireAdmin(req, res);
      if (!admin) return;
      const body = await readJson(req);
      const out = deleteRecord(body.id);
      appendAuditLog(admin.username, '删除记录', out.deletedTitle || String(out.deletedId));
      return sendJson(res, 200, { ok: true, ...out });
    }

    if (pathname === '/api/records/export.csv' && req.method === 'GET') {
      const user = requireAuth(req, res);
      if (!user) return;
      const csv = exportRecordsCsv({ maskPhone: user.role !== 'admin' });
      appendAuditLog(user.username, '导出表格', user.role === 'admin' ? '完整表格' : '脱敏表格');
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="records-export.csv"',
        'Cache-Control': 'no-store'
      });
      return res.end(csv);
    }
`
    : `
    if (pathname === '/api/records' && req.method === 'GET') {
      const q = urlObj.searchParams.get('q') || '';
      const status = urlObj.searchParams.get('status') || 'all';
      const items = listRecords({ q, status });
      return sendJson(res, 200, { ok: true, items });
    }

    if (pathname === '/api/records/create' && req.method === 'POST') {
      const body = await readJson(req);
      const item = createRecord(body);
      return sendJson(res, 200, { ok: true, item });
    }

    if (pathname === '/api/records/update' && req.method === 'POST') {
      const body = await readJson(req);
      const item = updateRecord(body.id, body);
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

    if (pathname === '/api/records/export.csv' && req.method === 'GET') {
      const csv = exportRecordsCsv({ maskPhone: false });
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="records-export.csv"',
        'Cache-Control': 'no-store'
      });
      return res.end(csv);
    }
`;

  return `import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listRecords, createRecord, updateRecord, toggleRecord, deleteRecord, exportRecordsCsv, maskPhoneNumbers } from './db.mjs';
${authImport}
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT) || 3090;

process.on('uncaughtException', err => {
  console.error('[防崩护盾] 捕获未处理异常，服务继续运行:', err.message);
});
process.on('unhandledRejection', err => {
  console.error('[防崩护盾] 捕获异步异常:', err);
});

function sendJson(res, status, payload, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    ...extraHeaders
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

  try {
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true, app: ${JSON.stringify(bp.appName)}, commercialAuth: ${isCommercial} });
    }
${authRoutesBlock}${recordRoutesBlock}
    const safeRel = pathname === '/' ? 'index.html' : pathname.replace(/^\\/+/, '');
    const filePath = path.resolve(PUBLIC_DIR, safeRel);
    if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return sendJson(res, 404, { ok: false, error: '未找到页面或接口: ' + pathname });
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(fs.readFileSync(filePath));
  } catch (err) {
    const status = /不正确|请填写|不能为空|已存在|至少需要|不能停用|未找到/.test(err.message || '') ? 400 : 500;
    sendJson(res, status, { ok: false, error: err.message || '服务器处理出错' });
  }
});

if (import.meta.url === \`file://\${process.argv[1]}\`) {
  const host = process.env.HOST || '127.0.0.1';
  server.listen(PORT, host, () => {
    console.log(\`🚀 【${bp.appName}】已启动：http://127.0.0.1:\${PORT}\`);
  });
}
`;
}

function buildStylesCss() {
  return `:root {
  --bg: #F8F7F4;
  --card: #FFFFFF;
  --text: #18181B;
  --muted: #64646E;
  --border: #E5E4DF;
  --primary: #18181B;
  --blue: #2563EB;
  --green: #059669;
  --amber: #D97706;
  --red: #DC2626;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  padding: 26px 16px 84px;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 960px; margin: 0 auto; }
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px 22px;
  margin-bottom: 16px;
}
.header {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
}
.header h1 { font-size: 22px; font-weight: 750; letter-spacing: -0.01em; }
.header p { font-size: 13.5px; color: var(--muted); margin-top: 3px; }
.top-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.badge-ok {
  background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0;
  padding: 5px 11px; border-radius: 999px; font-size: 12px; font-weight: 600;
}
.badge-role {
  background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;
  padding: 5px 11px; border-radius: 999px; font-size: 12px; font-weight: 600;
}
.stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 16px;
}
.stat-card {
  background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px;
}
.stat-num { font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; }
.stat-label { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.form-grid {
  display: grid; grid-template-columns: 2fr 2fr 1.2fr auto; gap: 10px; margin-top: 12px;
}
@media (max-width: 720px) {
  .form-grid { grid-template-columns: 1fr; }
}
input, select {
  width: 100%; padding: 10px 13px; border: 1px solid #D4D4D8; border-radius: 9px;
  font-size: 14px; background: #FAFAF9; color: var(--text);
}
input:focus, select:focus { outline: 2px solid var(--blue); border-color: transparent; background: #FFF; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.btn {
  background: var(--primary); color: #FFF; border: none; border-radius: 9px;
  padding: 10px 16px; font-size: 13.5px; font-weight: 600; cursor: pointer; white-space: nowrap;
}
.btn-outline {
  background: #FFF; color: var(--text); border: 1px solid var(--border);
  padding: 7px 12px; font-size: 12.5px; font-weight: 600; border-radius: 8px; cursor: pointer;
}
.btn-ghost {
  background: #F4F4F5; color: var(--text); border: 1px solid var(--border);
  padding: 5px 10px; font-size: 12px; border-radius: 7px; cursor: pointer;
}
.btn-del {
  background: #FEF2F2; color: var(--red); border: 1px solid #FECACA;
  padding: 5px 10px; font-size: 12px; border-radius: 7px; cursor: pointer;
}
.btn-del.confirming {
  background: var(--red); color: #FFF; border-color: var(--red); font-weight: 700;
}
.toolbar {
  display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;
}
.tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tab-pill {
  background: #F4F4F5; color: var(--muted); border: 1px solid transparent;
  padding: 5px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 600; cursor: pointer;
}
.tab-pill.active { background: var(--primary); color: #FFF; }
.item-row {
  display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 14px 0; border-top: 1px solid var(--border);
}
.item-title { font-size: 15px; font-weight: 650; }
.item-note { font-size: 13px; color: var(--muted); margin-top: 2px; }
.tag-done { background: #ECFDF5; color: var(--green); padding: 3px 9px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.tag-pending { background: #FFFBEB; color: var(--amber); padding: 3px 9px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.login-box { max-width: 430px; margin: 48px auto; }
.hint-box {
  background: #F4F4F5; border-radius: 10px; padding: 10px 12px; font-size: 12.5px; color: var(--muted); margin-top: 12px;
}
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(24,24,27,0.45); display: none;
  align-items: center; justify-content: center; padding: 16px; z-index: 999;
}
.modal-backdrop.open { display: flex; }
.modal-card {
  background: #FFF; border-radius: 16px; max-width: 560px; width: 100%; padding: 22px;
  max-height: 86vh; overflow-y: auto; border: 1px solid var(--border);
}
.toast {
  position: fixed; top: 18px; right: 18px; background: #18181B; color: #FFF;
  padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
  display: none; z-index: 1000; box-shadow: 0 8px 24px rgba(0,0,0,0.16);
}
`;
}

function buildAppJs(bp) {
  const isCommercial = Boolean(bp.needPassword);
  const cfgJson = JSON.stringify({
    commercial: isCommercial,
    doneText: bp.labels.statusActiveText,
    pendingText: bp.labels.statusPendingText,
    amountLabel: bp.labels.amountLabel
  });

  const authClientSection = isCommercial
    ? `
async function checkSession() {
  const res = await apiFetch('/api/auth/me');
  const data = await res.json();
  currentUser = data.user || null;
  if (!currentUser) {
    document.getElementById('login-view').style.display = 'block';
    document.getElementById('app-view').style.display = 'none';
    return false;
  }
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('app-view').style.display = 'block';
  const roleBadge = document.getElementById('user-role-badge');
  if (roleBadge) {
    roleBadge.textContent = (currentUser.role === 'admin' ? '👑 管理员 · ' : '👤 员工 · ') + currentUser.displayName;
  }
  const adminBtn = document.getElementById('btn-open-admin');
  if (adminBtn) adminBtn.style.display = currentUser.role === 'admin' ? 'inline-block' : 'none';
  return true;
}

document.getElementById('login-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type="submit"]');
  await withLock(btn, async () => {
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const res = await apiPost('/api/auth/login', { username, password });
    const data = await res.json();
    if (!data.ok) return notify(data.error || '登录失败', true);
    document.getElementById('login-pass').value = '';
    await checkSession();
    await loadItems();
    notify('欢迎回来，' + data.user.displayName);
  });
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await apiPost('/api/auth/logout', {});
  currentUser = null;
  await checkSession();
});

document.getElementById('btn-open-pwd').addEventListener('click', () => {
  document.getElementById('pwd-modal').classList.add('open');
});

document.getElementById('pwd-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type="submit"]');
  await withLock(btn, async () => {
    const oldPassword = document.getElementById('inp-old-pwd').value;
    const newPassword = document.getElementById('inp-new-pwd').value;
    const res = await apiPost('/api/auth/change-password', { oldPassword, newPassword });
    const data = await res.json();
    if (!data.ok) return notify(data.error || '修改失败', true);
    document.getElementById('pwd-modal').classList.remove('open');
    ev.target.reset();
    notify('密码已加密更新');
  });
});

async function refreshAdminPanel() {
  const [uRes, lRes] = await Promise.all([apiFetch('/api/admin/users'), apiFetch('/api/admin/audit-logs')]);
  const uData = await uRes.json();
  const lData = await lRes.json();
  const uBox = document.getElementById('staff-list-box');
  uBox.innerHTML = '';
  (uData.users || []).forEach(u => {
    const row = document.createElement('div');
    row.className = 'item-row';
    const info = document.createElement('div');
    info.textContent = u.display_name + ' (@' + u.username + ') · ' + (u.role === 'admin' ? '店长管理员' : '普通员工');
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn-ghost';
    toggleBtn.textContent = Number(u.active) ? '停用账号' : '重新启用';
    if (currentUser && u.id === currentUser.id) toggleBtn.disabled = true;
    toggleBtn.onclick = async () => {
      const r = await apiPost('/api/admin/users/toggle', { id: u.id });
      const d = await r.json();
      if (!d.ok) return notify(d.error || '操作失败', true);
      await refreshAdminPanel();
    };
    row.appendChild(info);
    row.appendChild(toggleBtn);
    uBox.appendChild(row);
  });

  const logBox = document.getElementById('audit-log-box');
  logBox.innerHTML = '';
  (lData.logs || []).slice(0, 12).forEach(lg => {
    const p = document.createElement('div');
    p.style.cssText = 'font-size:12.5px;color:#52525B;padding:5px 0;border-top:1px solid #F4F4F5;';
    p.textContent = String(lg.created_at || '').slice(5, 19).replace('T', ' ') + ' · [' + lg.actor + '] ' + lg.action + '：' + lg.detail;
    logBox.appendChild(p);
  });
}

document.getElementById('btn-open-admin').addEventListener('click', async () => {
  document.getElementById('admin-modal').classList.add('open');
  await refreshAdminPanel();
});

document.getElementById('staff-create-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type="submit"]');
  await withLock(btn, async () => {
    const username = document.getElementById('staff-user').value.trim();
    const displayName = document.getElementById('staff-name').value.trim();
    const password = document.getElementById('staff-pass').value;
    const role = document.getElementById('staff-role').value;
    const res = await apiPost('/api/admin/users/create', { username, displayName, password, role });
    const data = await res.json();
    if (!data.ok) return notify(data.error || '开通失败', true);
    ev.target.reset();
    await refreshAdminPanel();
    notify('员工子账号已开通');
  });
});
`
    : '';

  const bootLine = isCommercial
    ? `(async () => { if (await checkSession()) await loadItems(); })();`
    : `loadItems();`;

  return `const CFG = ${cfgJson};
let currentStatus = 'all';
let currentUser = null;

function notify(msg, isErr = false) {
  const el = document.getElementById('toast-bar');
  if (!el) return;
  el.textContent = msg;
  el.style.background = isErr ? '#DC2626' : '#18181B';
  el.style.display = 'block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2400);
}

async function withLock(btn, fn) {
  if (!btn || btn.disabled) return;
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = '处理中...';
  try {
    await fn();
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

function apiFetch(url) {
  return fetch(url, { credentials: 'same-origin' });
}

function apiPost(url, body) {
  return fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
}

async function loadItems() {
  const q = document.getElementById('inp-search').value.trim();
  const res = await apiFetch('/api/records?q=' + encodeURIComponent(q) + '&status=' + encodeURIComponent(currentStatus));
  if (res.status === 401 && CFG.commercial) {
    document.getElementById('login-view').style.display = 'block';
    document.getElementById('app-view').style.display = 'none';
    return;
  }
  const data = await res.json();
  if (!data.ok) return notify(data.error || '加载失败', true);
  renderItems(data.items || []);
}

function openEditModal(item) {
  document.getElementById('edit-id').value = item.id;
  document.getElementById('edit-title').value = item.title;
  document.getElementById('edit-note').value = item.note || '';
  document.getElementById('edit-amount').value = item.amount ?? 0;
  document.getElementById('edit-modal').classList.add('open');
}

function renderItems(items) {
  document.getElementById('stat-total').textContent = items.length;
  document.getElementById('stat-done').textContent = items.filter(i => i.status === 'done').length;
  const sum = items.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  document.getElementById('stat-amount').textContent = Math.round(sum * 100) / 100;

  const box = document.getElementById('items-box');
  if (items.length === 0) {
    box.innerHTML = '<p style="color:#64646E;padding:18px 0;font-size:14px;">当前筛选下暂无记录，可在上方新增一条试试。</p>';
    return;
  }
  box.innerHTML = '';
  const canDelete = !CFG.commercial || (currentUser && currentUser.role === 'admin');

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'item-row';

    const left = document.createElement('div');
    const titleEl = document.createElement('div');
    titleEl.className = 'item-title';
    titleEl.textContent = item.title + (Number(item.amount) ? ' · ' + CFG.amountLabel + ': ' + item.amount : '');
    const noteEl = document.createElement('div');
    noteEl.className = 'item-note';
    noteEl.textContent = item.note || '无备注';
    left.appendChild(titleEl);
    left.appendChild(noteEl);

    const right = document.createElement('div');
    right.style.cssText = 'display:flex;gap:7px;align-items:center;flex-wrap:wrap;';

    const tag = document.createElement('span');
    tag.className = item.status === 'done' ? 'tag-done' : 'tag-pending';
    tag.textContent = item.status === 'done' ? CFG.doneText : CFG.pendingText;

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-ghost';
    editBtn.textContent = '编辑';
    editBtn.onclick = () => openEditModal(item);

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn-ghost';
    toggleBtn.textContent = item.status === 'done' ? '设为待办' : '标记完成';
    toggleBtn.onclick = () => withLock(toggleBtn, async () => {
      const r = await apiPost('/api/records/toggle', { id: item.id });
      const d = await r.json();
      if (!d.ok) return notify(d.error || '切换失败', true);
      await loadItems();
    });

    right.appendChild(tag);
    right.appendChild(editBtn);
    right.appendChild(toggleBtn);

    if (canDelete) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-del';
      delBtn.textContent = '删除';
      delBtn.onclick = async () => {
        if (!delBtn.classList.contains('confirming')) {
          delBtn.classList.add('confirming');
          delBtn.textContent = '确定删？';
          setTimeout(() => {
            delBtn.classList.remove('confirming');
            delBtn.textContent = '删除';
          }, 3000);
          return;
        }
        await withLock(delBtn, async () => {
          const r = await apiPost('/api/records/delete', { id: item.id });
          const d = await r.json();
          if (!d.ok) return notify(d.error || '删除失败', true);
          await loadItems();
          notify('已安全删除记录');
        });
      };
      right.appendChild(delBtn);
    }

    row.appendChild(left);
    row.appendChild(right);
    box.appendChild(row);
  });
}

document.getElementById('create-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type="submit"]');
  await withLock(btn, async () => {
    const title = document.getElementById('inp-title').value.trim();
    const note = document.getElementById('inp-note').value.trim();
    const amount = document.getElementById('inp-amount').value;
    if (!title) return;
    const res = await apiPost('/api/records/create', { title, note, amount });
    const data = await res.json();
    if (!data.ok) return notify(data.error || '保存失败', true);
    ev.target.reset();
    await loadItems();
    notify('已存入本地真实数据库');
  });
});

document.getElementById('edit-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type="submit"]');
  await withLock(btn, async () => {
    const id = document.getElementById('edit-id').value;
    const title = document.getElementById('edit-title').value.trim();
    const note = document.getElementById('edit-note').value.trim();
    const amount = document.getElementById('edit-amount').value;
    const res = await apiPost('/api/records/update', { id, title, note, amount });
    const data = await res.json();
    if (!data.ok) return notify(data.error || '更新失败', true);
    document.getElementById('edit-modal').classList.remove('open');
    await loadItems();
    notify('修改已保存');
  });
});

document.getElementById('btn-export-csv').addEventListener('click', async ev => {
  const btn = ev.currentTarget;
  await withLock(btn, async () => {
    const res = await apiFetch('/api/records/export.csv');
    if (!res.ok) return notify('导出失败', true);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '数据导出明细.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify('Excel 兼容表格已导出');
  });
});

document.querySelectorAll('[data-status-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-status-tab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentStatus = tab.getAttribute('data-status-tab');
    loadItems();
  });
});

document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-close-modal');
    document.getElementById(id).classList.remove('open');
  });
});

document.getElementById('inp-search').addEventListener('input', () => loadItems());
${authClientSection}
${bootLine}
`;
}

function buildIndexHtml(bp) {
  const isCommercial = Boolean(bp.needPassword);
  const esc = s =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const loginSection = isCommercial
    ? `
  <div id="login-view" class="wrap" style="display:none;">
    <div class="card login-box">
      <h2 style="font-size:20px;margin-bottom:6px;">🔐 登录【${esc(bp.appName)}】</h2>
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;">商用多账号加密鉴权版 · 店长管理员与普通员工分权保护</p>
      <form id="login-form" style="display:grid;gap:10px;">
        <input id="login-user" type="text" required placeholder="登录账号（默认店长：admin）" />
        <input id="login-pass" type="password" required placeholder="登录密码" />
        <button type="submit" class="btn">安全登录</button>
      </form>
      <div class="hint-box">
        💡 首次启动默认店长账号：<b>admin</b>，初始密码：<b>Admin@123456</b><br/>
        登录后可在右上角随时修改密码，或开通普通员工子账号（员工端自动对客户手机号脱敏且禁止删库）。
      </div>
    </div>
  </div>`
    : '';

  const headerActions = isCommercial
    ? `<div class="top-actions">
        <span id="user-role-badge" class="badge-role">👑 管理员</span>
        <button id="btn-open-admin" type="button" class="btn-outline">👥 员工与日志</button>
        <button id="btn-open-pwd" type="button" class="btn-outline">🔑 修改密码</button>
        <button id="btn-export-csv" type="button" class="btn-outline">📥 导出 Excel 表格</button>
        <button id="btn-logout" type="button" class="btn-outline">退出</button>
      </div>`
    : `<div class="top-actions">
        <span class="badge-ok">🟢 SQLite 真落库保护中</span>
        <button id="btn-export-csv" type="button" class="btn-outline">📥 导出 Excel 表格 (.csv)</button>
      </div>`;

  const commercialModals = isCommercial
    ? `
  <div id="pwd-modal" class="modal-backdrop">
    <div class="modal-card">
      <h3 style="margin-bottom:12px;">🔑 修改登录密码（scrypt 加盐加密存储）</h3>
      <form id="pwd-form" style="display:grid;gap:10px;">
        <input id="inp-old-pwd" type="password" required placeholder="输入当前原密码" />
        <input id="inp-new-pwd" type="password" required minlength="6" placeholder="输入新密码（至少6位）" />
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
          <button type="button" class="btn-outline" data-close-modal="pwd-modal">取消</button>
          <button type="submit" class="btn">确认更新密码</button>
        </div>
      </form>
    </div>
  </div>

  <div id="admin-modal" class="modal-backdrop">
    <div class="modal-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3>👥 员工子账号管理 & 操作审计日志</h3>
        <button type="button" class="btn-outline" data-close-modal="admin-modal">关闭</button>
      </div>
      <form id="staff-create-form" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
        <input id="staff-user" type="text" required placeholder="登录账号 (如 staff01)" />
        <input id="staff-name" type="text" required placeholder="员工姓名 (如 小林)" />
        <input id="staff-pass" type="password" required minlength="6" placeholder="初始密码 (至少6位)" />
        <select id="staff-role">
          <option value="staff">普通员工（禁删数据·手机号脱敏）</option>
          <option value="admin">店长管理员（完整权限）</option>
        </select>
        <button type="submit" class="btn" style="grid-column:1 / -1;">➕ 开通新账号</button>
      </form>
      <h4 style="font-size:14px;margin-bottom:6px;">现有账号列表</h4>
      <div id="staff-list-box" style="margin-bottom:14px;"></div>
      <h4 style="font-size:14px;margin-bottom:6px;">最近操作留痕日志</h4>
      <div id="audit-log-box"></div>
    </div>
  </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(bp.appName)}</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <div id="toast-bar" class="toast"></div>
${loginSection}
  <div id="app-view" class="wrap" ${isCommercial ? 'style="display:none;"' : ''}>
    <div class="card header">
      <div>
        <h1>${esc(bp.appName)}</h1>
        <p>${esc(bp.archetypeLabel)} · 本地真实 SQLite 数据库（刷新或重启电脑绝不丢数据）</p>
      </div>
      ${headerActions}
    </div>

    <div class="stats">
      <div class="stat-card">
        <div id="stat-total" class="stat-num">0</div>
        <div class="stat-label">当前列表记录数</div>
      </div>
      <div class="stat-card">
        <div id="stat-done" class="stat-num" style="color:var(--green);">0</div>
        <div class="stat-label">${esc(bp.labels.statusActiveText)}</div>
      </div>
      <div class="stat-card">
        <div id="stat-amount" class="stat-num">0</div>
        <div class="stat-label">累计 · ${esc(bp.labels.amountLabel)}</div>
      </div>
    </div>

    <div class="card">
      <h3 style="font-size:16px;">➕ 新增记录</h3>
      <form id="create-form" class="form-grid">
        <input id="inp-title" type="text" required placeholder="${esc(bp.labels.titleLabel)}（必填）" />
        <input id="inp-note" type="text" placeholder="${esc(bp.labels.subLabel)}" />
        <input id="inp-amount" type="number" step="any" placeholder="${esc(bp.labels.amountLabel)}" />
        <button type="submit" class="btn">保存入库</button>
      </form>
    </div>

    <div class="card">
      <div class="toolbar">
        <div class="tabs">
          <button type="button" class="tab-pill active" data-status-tab="all">全部记录</button>
          <button type="button" class="tab-pill" data-status-tab="pending">${esc(bp.labels.statusPendingText)}</button>
          <button type="button" class="tab-pill" data-status-tab="done">${esc(bp.labels.statusActiveText)}</button>
        </div>
        <input id="inp-search" type="text" style="max-width:250px;" placeholder="🔍 搜名称或备注..." />
      </div>
      <div id="items-box">正在读取真实数据库...</div>
    </div>
  </div>

  <div id="edit-modal" class="modal-backdrop">
    <div class="modal-card">
      <h3 style="margin-bottom:12px;">✏️ 编辑修改记录</h3>
      <form id="edit-form" style="display:grid;gap:10px;">
        <input id="edit-id" type="hidden" />
        <input id="edit-title" type="text" required placeholder="${esc(bp.labels.titleLabel)}" />
        <input id="edit-note" type="text" placeholder="${esc(bp.labels.subLabel)}" />
        <input id="edit-amount" type="number" step="any" placeholder="${esc(bp.labels.amountLabel)}" />
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
          <button type="button" class="btn-outline" data-close-modal="edit-modal">取消</button>
          <button type="submit" class="btn">保存修改</button>
        </div>
      </form>
    </div>
  </div>
${commercialModals}
  <script src="/vibe-shield.js"></script>
  <script src="/app.js"></script>
</body>
</html>
`;
}

/**
 * Turn a blank folder + a messy beginner idea into a genuinely mature, crash-armored,
 * SQLite-backed application (Mode A Personal OR Mode B Commercial Scrypt+RBAC+Audit+Docker)!
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
      dev: 'node src/server.mjs',
      verify: 'node .vibe/engine/bin/ghost-cto.mjs verify'
    }
  };

  fs.mkdirSync(path.join(absRoot, 'src'), { recursive: true });
  fs.mkdirSync(path.join(absRoot, 'public'), { recursive: true });
  fs.mkdirSync(path.join(absRoot, 'data'), { recursive: true });

  if (!fs.existsSync(path.join(absRoot, '.gitignore'))) {
    fs.writeFileSync(path.join(absRoot, '.gitignore'), buildGitignore(), 'utf8');
  }
  fs.writeFileSync(path.join(absRoot, '.env.example'), buildEnvExample(bp), 'utf8');
  if (bp.needPassword) {
    fs.writeFileSync(path.join(absRoot, 'Dockerfile'), buildDockerfile(), 'utf8');
  }

  fs.writeFileSync(path.join(absRoot, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(absRoot, 'src', 'db.mjs'), buildDbMjs(bp), 'utf8');
  if (bp.needPassword) {
    fs.writeFileSync(path.join(absRoot, 'src', 'auth.mjs'), buildAuthMjs(), 'utf8');
  }
  fs.writeFileSync(path.join(absRoot, 'src', 'server.mjs'), buildServerMjs(bp), 'utf8');
  fs.writeFileSync(path.join(absRoot, 'public', 'styles.css'), buildStylesCss(), 'utf8');
  fs.writeFileSync(path.join(absRoot, 'public', 'vibe-shield.js'), buildVibeShieldBrowserJs(), 'utf8');
  fs.writeFileSync(path.join(absRoot, 'public', 'app.js'), buildAppJs(bp), 'utf8');
  fs.writeFileSync(path.join(absRoot, 'public', 'index.html'), buildIndexHtml(bp), 'utf8');

  const ws = scanWorkspace(absRoot);
  const audit = runRealityAudit(ws);
  writeMemoryCapsule(ws, audit);
  generateSelfHealingLaunchers(ws);
  const cp = saveCheckpoint(
    absRoot,
    `零出错${bp.needPassword ? '商用多账号' : '轻享'}底座已就绪：${bp.appName}`
  );
  const wsAfter = scanWorkspace(absRoot);
  const auditAfter = runRealityAudit(wsAfter);
  generateBossDashboard(wsAfter, auditAfter);

  return {
    scaffolded: true,
    commercialAuth: bp.needPassword,
    blueprint: bp,
    score: auditAfter.score,
    checkpointId: cp.id,
    startPort: 3090,
    message: `🎉 已为您铺好【${bp.appName}】${bp.needPassword ? '（商用加密登录+员工分权版）' : '（个人电脑免登录版）'}（健康分 ${auditAfter.score}/100 🟢）！`
  };
}
