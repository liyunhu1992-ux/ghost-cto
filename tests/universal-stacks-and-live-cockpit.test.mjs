import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';
import { scanWorkspace } from '../kernel/scanner.mjs';
import { runRealityAudit } from '../kernel/reality-audit.mjs';
import { installGhostCTO, GHOST_PACKAGE_ROOT } from '../kernel/installer.mjs';
import { createCockpitHttpHandler } from '../kernel/live-server.mjs';

function invokeHandler(handler, method, url, bodyObj = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = headers;

    let statusCode = 200;
    let respHeaders = {};
    let respBody = '';

    const res = {
      writeHead(code, hdrs = {}) {
        statusCode = code;
        respHeaders = hdrs;
        return res;
      },
      end(chunk = '') {
        respBody += String(chunk);
        resolve({ statusCode, headers: respHeaders, body: respBody });
      }
    };

    Promise.resolve(handler(req, res)).catch(reject);

    process.nextTick(() => {
      if (bodyObj !== null) {
        req.emit('data', Buffer.from(JSON.stringify(bodyObj), 'utf8'));
      }
      req.emit('end');
    });
  });
}

test('Next.js App Router + @/ Path Alias + Supabase + Vue .vue + WeChat wx.request + Drizzle ORM full lineage', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-universal-stack-'));

  try {
    fs.mkdirSync(path.join(tmpRoot, 'src/app/api/orders'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'src/components'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'src/lib'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'pages/api'), { recursive: true });

    fs.writeFileSync(
      path.join(tmpRoot, 'package.json'),
      JSON.stringify({ name: 'nextjs-supabase-shop', dependencies: { next: '15.0.0', '@supabase/supabase-js': '2.0.0' } })
    );
    fs.writeFileSync(path.join(tmpRoot, 'tsconfig.json'), JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }));

    // Next.js Entry Page importing `@/components/OrderPanel.vue` via `@/` alias!
    fs.writeFileSync(
      path.join(tmpRoot, 'src/app/page.tsx'),
      `import OrderPanel from '@/components/OrderPanel.vue';\nexport default function Home() { return <OrderPanel />; }\n`
    );

    // Vue 3 SFC using WeChat `wx.request` + empty `@click="() => {}"`
    fs.writeFileSync(
      path.join(tmpRoot, 'src/components/OrderPanel.vue'),
      [
        '<template>',
        '  <button @click="() => {}">空壳按钮</button>',
        '  <button @click="submitOrder">小程序下单</button>',
        '</template>',
        '<script setup>',
        'function submitOrder() {',
        '  wx.request({ url: "https://shop.example.com/api/orders", method: "POST" });',
        '  uni.request({ url: "/api/legacy-sync", method: "POST" });',
        '}',
        '</script>'
      ].join('\n')
    );

    // Shared Supabase helper imported via `@/lib/supa`
    fs.writeFileSync(
      path.join(tmpRoot, 'src/lib/supa.ts'),
      `import { pgTable } from 'drizzle-orm/pg-core';\nexport const coupons = pgTable('coupons', {});\nexport async function saveOrderToSupabase(supabase) {\n  return await supabase.from('orders').insert({ amount: 99 });\n}\n`
    );

    // Next.js App Router API route (`src/app/api/orders/route.ts`) calling `@/lib/supa`
    fs.writeFileSync(
      path.join(tmpRoot, 'src/app/api/orders/route.ts'),
      `import { saveOrderToSupabase } from '@/lib/supa';\nexport async function POST(req) {\n  const user = auth();\n  await saveOrderToSupabase(supabase);\n  return Response.json({ ok: true });\n}\n`
    );

    // Next.js Pages Router API route (`pages/api/legacy-sync.ts`) using Drizzle ORM `db.insert(coupons)`
    fs.writeFileSync(
      path.join(tmpRoot, 'pages/api/legacy-sync.ts'),
      `export default async function handler(req, res) {\n  await db.insert(coupons).values({ code: 'VIP' });\n  res.json({ ok: true });\n}\n`
    );

    const ws = scanWorkspace(tmpRoot);
    const audit = runRealityAudit(ws);

    // 1. `@/components/OrderPanel.vue` was resolved via `@/` alias -> ZERO false-positive zombie warning!
    assert.equal(audit.lineage.zombieFiles.length, 0, `Expected 0 zombie files with @/ alias, got ${audit.lineage.zombieFiles}`);

    // 2. Both `/api/orders` (Supabase via `@/lib/supa`) and `/api/legacy-sync` (Pages Router + Drizzle) matched as REAL_DB_WRITE!
    const ordersChain = audit.lineage.chains.find(c => c.endpoint === '/api/orders');
    assert.ok(ordersChain, 'Expected /api/orders chain from Vue wx.request -> Next App Router');
    assert.equal(ordersChain.status, 'REAL_DB_WRITE');

    const legacyChain = audit.lineage.chains.find(c => c.endpoint === '/api/legacy-sync');
    assert.ok(legacyChain, 'Expected /api/legacy-sync chain from uni.request -> Pages Router');
    assert.equal(legacyChain.status, 'REAL_DB_WRITE');

    // 3. Schema tables extracted from Supabase `.from('orders')` AND Drizzle `pgTable('coupons')`
    assert.ok(audit.lineage.schemaTables.includes('orders'));
    assert.ok(audit.lineage.schemaTables.includes('coupons'));

    // 4. Vue `<template>` `@click="() => {}"` noop caught at exact line 2!
    const vueNoop = audit.findings.find(f => f.id === 'FAKE_UI_HANDLER');
    assert.ok(vueNoop, 'Expected Vue @click noop finding');
    assert.equal(vueNoop.line, 2);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Self-Install Guard, Git Pre-Commit Secret Blocker & Live Cockpit HTTP Server (Audit / Save / Rewind / Impact / CSRF)', async () => {
  // 1. Self-install guard prevents polluting GhostCTO's own source directory
  assert.throws(
    () => installGhostCTO(GHOST_PACKAGE_ROOT),
    /当前目录是 GhostCTO/,
    'Must block accidental self-installation onto GHOST_PACKAGE_ROOT'
  );

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-live-cockpit-'));
  try {
    fs.mkdirSync(path.join(tmpRoot, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'data'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, 'package.json'),
      JSON.stringify({ name: 'live-studio-app', scripts: { start: 'node src/server.mjs' } })
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'src/server.mjs'),
      `import http from 'node:http';\nhttp.createServer((req, res) => res.end('v1')).listen(7001);\n`
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'src/App.jsx'),
      `export default function App() { return <button>立即开通旗舰门店</button>; }\n`
    );
    const dbPath = path.join(tmpRoot, 'data/store.sqlite');
    const v1Bytes = Buffer.from('SQLite format 3\0LIVE_STUDIO_GOOD_DB');
    fs.writeFileSync(dbPath, v1Bytes);

    installGhostCTO(tmpRoot);
    assert.ok(fs.existsSync(path.join(tmpRoot, '.vibe/项目体检报告.html')));
    assert.ok(fs.existsSync(path.join(tmpRoot, '.git/hooks/pre-commit')));

    // 2. Verify Git pre-commit hook BLOCKS committing hardcoded Aliyun AccessKey (`LTAI...`)!
    const leakyFile = path.join(tmpRoot, 'src/aliyun-leak.js');
    fs.writeFileSync(leakyFile, `export const ALIYUN_KEY = "LTAI5t8x9ABCDEFGH123456";\n`);
    execFileSync('git', ['add', 'src/aliyun-leak.js'], { cwd: tmpRoot });

    let commitBlocked = false;
    try {
      execFileSync('git', ['commit', '-m', 'accidental secret commit'], { cwd: tmpRoot, stdio: 'pipe' });
    } catch (err) {
      commitBlocked = true;
      const stderr = err.stderr?.toString('utf8') || '';
      assert.ok(stderr.includes('防泄密急刹车'), `Expected Chinese pre-commit block message, got: ${stderr}`);
    }
    assert.equal(commitBlocked, true, 'Git pre-commit hook MUST block hardcoded Aliyun LTAI key!');

    // Clean up leaky file so working tree is clean
    execFileSync('git', ['reset', 'HEAD', 'src/aliyun-leak.js'], { cwd: tmpRoot });
    fs.rmSync(leakyFile, { force: true });

    // 3. Test Live Interactive Cockpit HTTP Endpoints + CSRF protection
    const handler = createCockpitHttpHandler(tmpRoot);

    // Cross-origin POST must be rejected with 403
    const csrfRes = await invokeHandler(handler, 'POST', '/__ghost_api/save', { label: 'hack' }, { origin: 'https://evil.attacker.com' });
    assert.equal(csrfRes.statusCode, 403);

    // Ping endpoint
    const pingRes = await invokeHandler(handler, 'GET', '/__ghost_api/ping');
    assert.equal(pingRes.statusCode, 200);
    assert.equal(JSON.parse(pingRes.body).mode, 'live');

    // Live Save Checkpoint
    const saveRes = await invokeHandler(
      handler,
      'POST',
      '/__ghost_api/save',
      { label: '网页实时备份点' },
      { origin: 'http://127.0.0.1:9777' }
    );
    const saveData = JSON.parse(saveRes.body);
    assert.equal(saveData.ok, true);
    assert.equal(saveData.dbCount, 1);

    // Corrupt SQLite DB, then trigger Live Rewind via HTTP API!
    fs.writeFileSync(dbPath, Buffer.from('WIPED_BY_MISTAKE'));
    const rewindRes = await invokeHandler(
      handler,
      'POST',
      '/__ghost_api/rewind',
      { checkpointId: saveData.id },
      { origin: 'http://127.0.0.1:9777' }
    );
    assert.equal(JSON.parse(rewindRes.body).ok, true);
    assert.deepEqual(fs.readFileSync(dbPath), v1Bytes, 'Live Cockpit HTTP rewind must atomically restore SQLite bytes!');

    // Live Chinese Button Impact Query
    const impactRes = await invokeHandler(
      handler,
      'POST',
      '/__ghost_api/impact',
      { query: '立即开通旗舰门店' },
      { origin: 'http://127.0.0.1:9777' }
    );
    const impactData = JSON.parse(impactRes.body);
    assert.equal(impactData.ok, true);
    assert.ok(impactData.seedFiles.includes('src/App.jsx'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
