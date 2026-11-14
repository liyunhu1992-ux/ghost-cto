export function buildServerMjs(bp) {
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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
      } catch (parseErr) {
        reject(new Error('提交的数据格式不正确: ' + parseErr.message));
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
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      });
      return res.end();
    }

    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, {
        ok: true,
        app: ${JSON.stringify(bp.appName)},
        productKind: ${JSON.stringify(bp.productKind || 'saas_platform')},
        commercialAuth: ${isCommercial},
        miniProgram: ${Boolean(bp.includeMiniProgram)}
      });
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
