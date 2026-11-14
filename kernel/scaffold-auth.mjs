export function buildVibeShieldBrowserJs() {
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

export function buildAuthMjs() {
  return `import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { sqliteDb, DATA_DIR, autoMigrateSqliteSchema } from './db.mjs';

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

export const AUTH_SCHEMA_SQL = \`
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
\`;

if (sqliteDb) {
  sqliteDb.exec(AUTH_SCHEMA_SQL);
  autoMigrateSqliteSchema(sqliteDb, AUTH_SCHEMA_SQL);
  const userCnt = sqliteDb.prepare('SELECT COUNT(*) AS cnt FROM users').get();
  if (!userCnt || Number(userCnt.cnt) === 0) {
    const now = new Date().toISOString();
    sqliteDb
      .prepare('INSERT INTO users (username, display_name, role, password_hash, active, created_at) VALUES (?, ?, ?, ?, 1, ?)')
      .run(DEFAULT_ADMIN_USER, '管理员', 'admin', hashPassword(DEFAULT_ADMIN_PASS), now);
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
          display_name: '管理员',
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
    res.end(JSON.stringify({ ok: false, error: '权限不足：仅管理员可执行此敏感操作' }));
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
    return sqliteDb.prepare('SELECT id, username, display_name, role, active, created_at FROM users ORDER BY id ASC').all();
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
    throw new Error('成员初始密码至少需要 6 位');
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
    return sqliteDb.prepare('SELECT id, username, display_name, role, active, created_at FROM users WHERE id = ?').get(info.lastInsertRowid);
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
