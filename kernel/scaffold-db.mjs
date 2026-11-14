export function buildGitignore() {
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

export function buildEnvExample(bp) {
  const lines = ['# 服务运行端口', 'PORT=3090'];
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

export function buildDockerfile() {
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

export function buildDbMjs(bp) {
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

function splitSqlColumns(body) {
  const parts = [];
  let cur = '';
  let depth = 0;
  let inQuote = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inQuote) {
      cur += ch;
      if (ch === inQuote && body[i - 1] !== '\\\\') inQuote = '';
      continue;
    }
    if (ch === "'" || ch === '"') {
      inQuote = ch;
      cur += ch;
    } else if (ch === '(') {
      depth++;
      cur += ch;
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
      cur += ch;
    } else if (ch === ',' && depth === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

export function autoMigrateSqliteSchema(db, createSql) {
  if (!db) return [];
  const migrated = [];
  const blockRe = /CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?[\`"'\\[]?([a-zA-Z0-9_]+)[\`"'\\]]?\\s*\\(([\\s\\S]*?)\\)\\s*;?/gi;
  let m;
  while ((m = blockRe.exec(createSql)) !== null) {
    const tbl = m[1];
    const body = m[2];
    const existingCols = new Set(
      db.prepare(\`PRAGMA table_info(\${tbl})\`).all().map(c => String(c.name).toLowerCase())
    );
    for (const colLine of splitSqlColumns(body)) {
      if (!colLine || /^(?:PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\\b/i.test(colLine)) continue;
      const colMatch = colLine.match(/^[\`"'\\[]?([a-zA-Z0-9_]+)[\`"'\\]]?\\s+([\\s\\S]+)$/);
      if (!colMatch) continue;
      const colName = colMatch[1];
      if (existingCols.has(colName.toLowerCase())) continue;
      let safeSpec = colMatch[2]
        .replace(/\\bPRIMARY\\s+KEY(?:\\s+AUTOINCREMENT)?\\b/gi, '')
        .replace(/\\bUNIQUE\\b/gi, '')
        .trim();
      if (/\\bNOT\\s+NULL\\b/i.test(safeSpec) && !/\\bDEFAULT\\b/i.test(safeSpec)) {
        safeSpec += /REAL|INT|NUMERIC|FLOAT|DOUBLE|DECIMAL/i.test(safeSpec) ? ' DEFAULT 0' : " DEFAULT ''";
      }
      db.exec(\`ALTER TABLE \${tbl} ADD COLUMN \${colName} \${safeSpec}\`);
      existingCols.add(colName.toLowerCase());
      migrated.push(\`\${tbl}.\${colName}\`);
    }
  }
  return migrated;
}

export const SCHEMA_SQL = \`
  CREATE TABLE IF NOT EXISTS ${table} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    note TEXT DEFAULT '',
    amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    updated_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
\`;

export let sqliteDb = null;
try {
  const sqliteMod = await import('node:sqlite');
  if (sqliteMod && sqliteMod.DatabaseSync) {
    sqliteDb = new sqliteMod.DatabaseSync(DB_FILE);
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    sqliteDb.exec('PRAGMA busy_timeout = 5000;');
    sqliteDb.exec(SCHEMA_SQL);
    autoMigrateSqliteSchema(sqliteDb, SCHEMA_SQL);
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
  if (/[",\\r\\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
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
  return '\\uFEFF' + lines.join('\\r\\n') + '\\r\\n';
}
`;
}
