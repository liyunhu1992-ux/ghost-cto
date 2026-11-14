import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { createCleanBeginnerProject } from '../kernel/installer.mjs';
import { bootstrapGoldenApp } from '../kernel/golden-scaffold.mjs';
import { verifyWorkspaceCode } from '../kernel/code-verifier.mjs';
import { scanWorkspace } from '../kernel/scanner.mjs';
import { runRealityAudit } from '../kernel/reality-audit.mjs';

function callAppServer(server, method, url, bodyObj = null, headers = {}) {
  const handler = server.listeners('request')[0];
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));

    let status = 200;
    let respHeaders = {};
    const chunks = [];

    const res = {
      writeHead(code, hdrs = {}) {
        status = code;
        respHeaders = Object.fromEntries(Object.entries(hdrs).map(([k, v]) => [k.toLowerCase(), v]));
        return res;
      },
      end(chunk) {
        if (chunk !== undefined && chunk !== null) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8'));
        }
        const rawBuffer = Buffer.concat(chunks);
        resolve({
          status,
          headers: respHeaders,
          buffer: rawBuffer,
          text: () => rawBuffer.toString('utf8'),
          json: () => JSON.parse(rawBuffer.toString('utf8'))
        });
      }
    };

    Promise.resolve(handler(req, res)).catch(reject);
    setImmediate(() => {
      if (bodyObj !== null) {
        req.emit('data', Buffer.from(JSON.stringify(bodyObj), 'utf8'));
      }
      req.emit('end');
    });
  });
}

test('Adversarial E2E Part 1: Clean Beginner Project Creation + Mode A (Personal) Live Router, Edit, CSV BOM & 100/100 Score', async () => {
  const parentTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-adv-mode-a-'));

  try {
    // 1. Simulate beginner double-clicking `1-双击新建我的空白项目` -> creates clean project folder
    const created = createCleanBeginnerProject('我的美甲小管家', parentTmp);
    assert.equal(path.basename(created.projectDir), '我的美甲小管家');
    assert.ok(fs.existsSync(path.join(created.projectDir, 'AGENTS.md')));
    assert.ok(fs.existsSync(path.join(created.projectDir, '.trae/rules/project_rules.md')));
    assert.ok(fs.existsSync(path.join(created.projectDir, '.workbuddy/rules/ghost-cto.md')));
    assert.ok(fs.existsSync(path.join(created.projectDir, '.cursor/rules/ghost-cto.mdc')));
    // Ensure root is NOT cluttered with old "老板全景驾驶舱.html" or "打开实时驾驶舱.command"
    assert.equal(fs.existsSync(path.join(created.projectDir, '老板全景驾驶舱.html')), false);
    assert.equal(fs.existsSync(path.join(created.projectDir, '打开实时驾驶舱.command')), false);
    // Empty workspace verdict must honestly state it is an empty starter, NOT "ready for customers"
    assert.ok(created.launchVerdict.includes('空白新项目'));

    // 2. Beginner replies "A" (Personal Self-Use Mode) -> Bootstrap Mode A
    const bootA = bootstrapGoldenApp(created.projectDir, '美甲会员预约与次卡记账', { audience: 'self' });
    assert.equal(bootA.scaffolded, true);
    assert.equal(bootA.commercialAuth, false);
    assert.equal(bootA.score, 100, `Mode A Golden App must achieve 100/100 score, got ${bootA.score}`);

    const verA = verifyWorkspaceCode(created.projectDir);
    assert.equal(verA.ok, true, `Mode A verify failed: ${verA.errorLines.join('; ')}`);

    // 3. Load generated `src/server.mjs` and test Create, Inline Update, Toggle, UTF-8 BOM CSV Export, Delete!
    const srvMod = await import(`file://${path.join(created.projectDir, 'src/server.mjs')}`);
    const srv = srvMod.server;

    const list1 = (await callAppServer(srv, 'GET', '/api/records')).json();
    assert.equal(list1.ok, true);
    assert.equal(list1.items.length, 3);

    const addRes = (
      await callAppServer(srv, 'POST', '/api/records/create', {
        title: '周女士 · 纯欲腮红甲',
        note: '13588776655',
        amount: 8
      })
    ).json();
    assert.equal(addRes.ok, true);
    const newId = addRes.item.id;

    // Test inline update (fixing a typo in balance/note)
    const updRes = (
      await callAppServer(srv, 'POST', '/api/records/update', {
        id: newId,
        title: '周女士 · 纯欲腮红甲(升级版)',
        note: '13588776655 VIP',
        amount: 12
      })
    ).json();
    assert.equal(updRes.ok, true);
    assert.equal(updRes.item.amount, 12);

    // Test status filter (`?status=pending`)
    const pendingRes = (await callAppServer(srv, 'GET', '/api/records?status=pending')).json();
    assert.ok(pendingRes.items.every(i => i.status === 'pending'));

    // Test Excel-compatible UTF-8 BOM CSV export
    const csvResp = await callAppServer(srv, 'GET', '/api/records/export.csv');
    assert.equal(csvResp.status, 200);
    // UTF-8 BOM bytes: EF BB BF
    assert.equal(csvResp.buffer[0], 0xef);
    assert.equal(csvResp.buffer[1], 0xbb);
    assert.equal(csvResp.buffer[2], 0xbf);
    const csvText = csvResp.text();
    assert.ok(csvText.includes('周女士 · 纯欲腮红甲(升级版)'));
    assert.ok(csvText.includes('储值余额 / 剩余次数'));

    // Test delete
    const delRes = (await callAppServer(srv, 'POST', '/api/records/delete', { id: newId })).json();
    assert.equal(delRes.ok, true);
  } finally {
    fs.rmSync(parentTmp, { recursive: true, force: true });
  }
});

test('Adversarial E2E Part 2: Mode B (Commercial) Scrypt Password Hashing, 401/403 RBAC, Phone Masking, Audit Logs & Deception Verifier Gates', async () => {
  const parentTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-adv-mode-b-'));

  try {
    const created = createCleanBeginnerProject('连锁美业门店系统', parentTmp);

    // 1. Beginner replies "B" (Commercial Multi-Account Mode) -> Bootstrap Mode B
    const bootB = bootstrapGoldenApp(created.projectDir, '连锁美业客户储值与员工系统', { audience: 'commercial' });
    assert.equal(bootB.scaffolded, true);
    assert.equal(bootB.commercialAuth, true);
    assert.equal(bootB.score, 100, `Mode B Commercial Golden App must achieve 100/100 score, got ${bootB.score}`);
    assert.ok(fs.existsSync(path.join(created.projectDir, 'Dockerfile')));
    assert.ok(fs.existsSync(path.join(created.projectDir, '.env.example')));
    assert.ok(fs.existsSync(path.join(created.projectDir, 'src/auth.mjs')));

    const verB = verifyWorkspaceCode(created.projectDir);
    assert.equal(verB.ok, true, `Mode B verify failed: ${verB.errorLines.join('; ')}`);

    // 2. Load `src/server.mjs` (which initializes `db.mjs` + `auth.mjs` tables) & verify SQLite password hash!
    const srvMod = await import(`file://${path.join(created.projectDir, 'src/server.mjs')}`);
    const dbMod = await import(`file://${path.join(created.projectDir, 'src/db.mjs')}`);
    const srv = srvMod.server;

    if (dbMod.sqliteDb) {
      const adminRow = dbMod.sqliteDb.prepare('SELECT username, password_hash FROM users WHERE username = ?').get('admin');
      assert.ok(adminRow.password_hash.startsWith('scrypt$'), 'Password in SQLite MUST be scrypt salted hash');
      assert.ok(!adminRow.password_hash.includes('Admin@123456'), 'Plaintext password MUST NOT appear in hash');
    }

    // 3. Run adversarial security & RBAC matrix against live Commercial HTTP handler
    // Attack A: Unauthenticated read of business records -> MUST block with 401!
    const unauthRecords = await callAppServer(srv, 'GET', '/api/records');
    assert.equal(unauthRecords.status, 401);

    // Attack B: Unauthenticated access to `/api/admin/users` -> MUST block with 401!
    const unauthAdmin = await callAppServer(srv, 'GET', '/api/admin/users');
    assert.equal(unauthAdmin.status, 401);

    // Attack C: Wrong password login -> MUST reject with 400!
    const badLogin = await callAppServer(srv, 'POST', '/api/auth/login', {
      username: 'admin',
      password: 'wrong-password'
    });
    assert.equal(badLogin.status, 400);

    // Legit Admin Login
    const adminLoginRes = await callAppServer(srv, 'POST', '/api/auth/login', {
      username: 'admin',
      password: 'Admin@123456'
    });
    assert.equal(adminLoginRes.status, 200);
    const setCookie = adminLoginRes.headers['set-cookie'] || '';
    assert.ok(setCookie.includes('HttpOnly'), 'Session cookie MUST be HttpOnly');
    const adminBody = adminLoginRes.json();
    const adminAuthHeader = { authorization: `Bearer ${adminBody.token}` };

    // Admin sees full unmasked customer phone number (`13800138801`)
    const adminRecords = (await callAppServer(srv, 'GET', '/api/records', null, adminAuthHeader)).json();
    assert.ok(
      adminRecords.items.some(it => String(it.note).includes('13800138801')),
      'Admin should view full unmasked phone numbers'
    );

    // Admin creates a `staff` sub-account
    const createStaffRes = await callAppServer(
      srv,
      'POST',
      '/api/admin/users/create',
      { username: 'staff01', displayName: '前台小美', password: 'Staff@123456', role: 'staff' },
      adminAuthHeader
    );
    assert.equal(createStaffRes.status, 200);

    // Staff logs in
    const staffLoginBody = (
      await callAppServer(srv, 'POST', '/api/auth/login', {
        username: 'staff01',
        password: 'Staff@123456'
      })
    ).json();
    const staffAuthHeader = { authorization: `Bearer ${staffLoginBody.token}` };

    // Staff reads records -> Phone numbers MUST be masked (`138****8801`)!
    const staffRecords = (await callAppServer(srv, 'GET', '/api/records', null, staffAuthHeader)).json();
    assert.equal(
      staffRecords.items.some(it => String(it.note).includes('13800138801')),
      false,
      'Staff MUST NOT see raw unmasked customer phone numbers'
    );
    assert.ok(
      staffRecords.items.some(it => String(it.note).includes('138****8801')),
      'Staff MUST receive masked phone numbers (138****8801)'
    );

    // Staff CSV export ALSO masks phone numbers!
    const staffCsvText = (await callAppServer(srv, 'GET', '/api/records/export.csv', null, staffAuthHeader)).text();
    assert.ok(staffCsvText.includes('138****8801'));
    assert.equal(staffCsvText.includes('13800138801'), false);

    // Attack D: Staff tries to access `/api/admin/users` -> MUST block with 403!
    const staffAdminAttempt = await callAppServer(srv, 'GET', '/api/admin/users', null, staffAuthHeader);
    assert.equal(staffAdminAttempt.status, 403);

    // Attack E: Staff tries to delete a customer record -> MUST block with 403!
    const staffDelAttempt = await callAppServer(
      srv,
      'POST',
      '/api/records/delete',
      { id: staffRecords.items[0].id },
      staffAuthHeader
    );
    assert.equal(staffDelAttempt.status, 403);

    // Admin verifies audit logs recorded all sensitive actions
    const logsData = (await callAppServer(srv, 'GET', '/api/admin/audit-logs', null, adminAuthHeader)).json();
    assert.equal(logsData.ok, true);
    assert.ok(logsData.logs.some(l => l.action === '开通子账号' && l.detail.includes('staff01')));

    // 4. Adversarial Verifier Check: Plant fake client-only toast & silent `catch {}` -> `verifyWorkspaceCode` MUST BLOCK!
    const appJsPath = path.join(created.projectDir, 'public/app.js');
    const origAppJs = fs.readFileSync(appJsPath, 'utf8');
    fs.writeFileSync(
      appJsPath,
      origAppJs + '\nfunction fakeSaveTrick() { try { showToast("已保存成功"); } catch {} }\n',
      'utf8'
    );
    const verAfterFake = verifyWorkspaceCode(created.projectDir);
    assert.equal(verAfterFake.ok, false, 'verifyWorkspaceCode MUST fail when AI plants fake client toast or silent catch {}!');
    assert.ok(verAfterFake.aiCompact.includes('FAKE_CLIENT_ONLY_SAVE'));
    assert.ok(verAfterFake.aiCompact.includes('SILENT_CATCH'));

    // 5. Adversarial Verifier Check: Strip `/api/auth/login` from a Mode B Commercial app -> `verifyWorkspaceCode` MUST BLOCK!
    fs.writeFileSync(appJsPath, origAppJs, 'utf8');
    const serverPath = path.join(created.projectDir, 'src/server.mjs');
    const origServer = fs.readFileSync(serverPath, 'utf8');
    fs.writeFileSync(serverPath, origServer.replaceAll('/api/auth/login', '/api/public/ping-noop'), 'utf8');
    const verMissingAuth = verifyWorkspaceCode(created.projectDir);
    assert.equal(verMissingAuth.ok, false, 'verifyWorkspaceCode MUST fail if Commercial Mode B omits /api/auth/login!');
    assert.ok(verMissingAuth.aiCompact.includes('MISSING_COMMERCIAL_AUTH'));

    // Restore clean server -> 100/100 score & PASS!
    fs.writeFileSync(serverPath, origServer, 'utf8');
    const verCleanAgain = verifyWorkspaceCode(created.projectDir);
    assert.equal(verCleanAgain.ok, true);
    const auditFinal = runRealityAudit(scanWorkspace(created.projectDir));
    assert.equal(auditFinal.score, 100);
  } finally {
    fs.rmSync(parentTmp, { recursive: true, force: true });
  }
});

test('Adversarial E2E Part 3: WeChat Mini-Program Dual-End Scaffold (100/100) & Step-2 Lossless SQLite Auto-Migration', async () => {
  const parentTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-adv-miniprogram-'));

  try {
    const created = createCleanBeginnerProject('宠物洗护预约小程序', parentTmp);
    assert.ok(fs.existsSync(path.join(created.projectDir, '.claude/settings.json')), 'Must wire Claude Stop hook');

    // Beginner mentions "小程序" -> auto-scaffolds both Web + native WeChat Mini-Program (`miniprogram/`)
    const bootMp = bootstrapGoldenApp(created.projectDir, '宠物店洗澡美容预约小程序', { audience: 'commercial' });
    assert.equal(bootMp.scaffolded, true);
    assert.equal(bootMp.miniProgram, true);
    assert.equal(bootMp.score, 100, `Mini-Program + Commercial scaffold must achieve 100/100, got ${bootMp.score}`);

    const projCfg = JSON.parse(fs.readFileSync(path.join(created.projectDir, 'miniprogram/project.config.json'), 'utf8'));
    assert.equal(projCfg.appid, 'touristappid', 'Must default to free touristappid so beginners pay 0 RMB');
    assert.equal(projCfg.setting.urlCheck, false);
    assert.ok(fs.existsSync(path.join(created.projectDir, 'miniprogram/pages/index/index.wxml')));
    assert.ok(fs.existsSync(path.join(created.projectDir, 'miniprogram/pages/index/index.js')));

    const verMp = verifyWorkspaceCode(created.projectDir);
    assert.equal(verMp.ok, true, `Mini-Program verify failed: ${verMp.errorLines.join('; ')}`);

    const auditMp = runRealityAudit(scanWorkspace(created.projectDir));
    assert.equal(auditMp.lineage.zombieFiles.length, 0, 'Mini-Program files must have 0 false zombie warnings');
    const mpChains = auditMp.lineage.chains.filter(c => String(c.frontend).startsWith('miniprogram/'));
    assert.ok(mpChains.length >= 5, `Expected >= 5 traced wx.request chains from miniprogram, got ${mpChains.length}`);
    assert.ok(mpChains.every(c => c.status === 'REAL_DB_WRITE' || c.status === 'REAL_DB_READ' || c.status === 'OK_STATELESS'));

    // Simulate Step-2 Beginner Iteration: adding new columns (`wechat` NOT NULL + `pet_breed`) to an ALREADY POPULATED SQLite DB!
    const srvMod = await import(`file://${path.join(created.projectDir, 'src/server.mjs')}`);
    const dbMod = await import(`file://${path.join(created.projectDir, 'src/db.mjs')}`);
    assert.ok(srvMod.server);

    const createdRow = dbMod.createRecord({ title: '柯基豆豆 · 精修洗护', note: '13612345678', amount: 168 });
    assert.ok(createdRow.id >= 4);

    if (dbMod.sqliteDb) {
      const step2SchemaSql = `
        CREATE TABLE IF NOT EXISTS customer_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          note TEXT DEFAULT '',
          amount REAL DEFAULT 0,
          wechat TEXT NOT NULL,
          pet_breed TEXT DEFAULT '通用犬猫',
          status TEXT DEFAULT 'pending',
          updated_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `;
      const migratedCols = dbMod.autoMigrateSqliteSchema(dbMod.sqliteDb, step2SchemaSql);
      assert.deepEqual(migratedCols, ['customer_records.wechat', 'customer_records.pet_breed']);

      // Verify existing customer rows survived intact AND new columns accept INSERT immediately without crashing!
      const now = new Date().toISOString();
      dbMod.sqliteDb
        .prepare(
          'INSERT INTO customer_records (title, note, amount, wechat, pet_breed, status, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run('布偶猫雪球 · 除毛SPA', '13987654321', 228, 'wx_snowball88', '布偶猫', 'pending', now, now);

      const allRows = dbMod.listRecords();
      assert.ok(allRows.some(r => r.title.includes('柯基豆豆')), 'Existing Step-1 customer row MUST NOT be lost!');
      const newCat = allRows.find(r => r.title.includes('布偶猫雪球'));
      assert.equal(newCat.wechat, 'wx_snowball88');
      assert.equal(newCat.pet_breed, '布偶猫');
    }
  } finally {
    fs.rmSync(parentTmp, { recursive: true, force: true });
  }
});

test('Adversarial E2E Part 4: Deep Linker/Package/SQL Column Verifier & Hard IDE Stop-Hook Self-Repair Gate', () => {
  const parentTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-adv-deep-verifier-'));

  try {
    const created = createCleanBeginnerProject('进销存记账台', parentTmp);
    bootstrapGoldenApp(created.projectDir, '茶叶店进销存与记账', { audience: 'self' });

    const serverPath = path.join(created.projectDir, 'src/server.mjs');
    const origServer = fs.readFileSync(serverPath, 'utf8');

    // 1. Inject 4 classic AI hallucinations that `node --check` completely misses:
    //    - Uninstalled npm package (`import express from 'express'`)
    //    - Missing local module (`import './missing-util.mjs'`)
    //    - Non-existent named export (`import { nonExistentHelper } from './db.mjs'`)
    //    - SQL column typo (`INSERT INTO ledger_entries (title, hallucinated_col) VALUES (?, ?)`)
    const sabotaged = [
      `import express from 'express';`,
      `import './missing-util.mjs';`,
      `import { nonExistentHelper } from './db.mjs';`,
      origServer,
      `function badSqlWrite(db) { db.prepare("INSERT INTO ledger_entries (title, hallucinated_col) VALUES (?, ?)").run('a', 'b'); }`
    ].join('\n');
    fs.writeFileSync(serverPath, sabotaged, 'utf8');

    const ver = verifyWorkspaceCode(created.projectDir);
    assert.equal(ver.ok, false);
    const kinds = new Set(ver.syntaxErrors.map(e => e.kind));
    assert.ok(kinds.has('UNINSTALLED_PACKAGE'), `Must catch uninstalled npm package, got ${[...kinds]}`);
    assert.ok(kinds.has('BROKEN_LOCAL_IMPORT'), `Must catch missing local import, got ${[...kinds]}`);
    assert.ok(kinds.has('MISSING_NAMED_EXPORT'), `Must catch missing named export, got ${[...kinds]}`);
    assert.ok(kinds.has('SQL_COLUMN_MISMATCH'), `Must catch SQL column mismatch, got ${[...kinds]}`);

    // 2. Execute `.vibe/ghost-hook-check.mjs` as a real IDE Stop-hook subprocess -> MUST exit code 2 on first broken turn!
    const hookScript = path.join(created.projectDir, '.vibe/ghost-hook-check.mjs');
    const hookRun1 = spawnSync(process.execPath, [hookScript], {
      cwd: created.projectDir,
      encoding: 'utf8'
    });
    assert.equal(hookRun1.status, 2, 'Stop hook MUST exit 2 to block AI from finishing with broken code');
    assert.ok(hookRun1.stderr.includes('UNINSTALLED_PACKAGE') || hookRun1.stderr.includes('express'));

    // 3. Anti-infinite-loop guard: running Stop hook again on the exact same untouched fingerprint MUST exit 0!
    const hookRun2 = spawnSync(process.execPath, [hookScript], {
      cwd: created.projectDir,
      encoding: 'utf8'
    });
    assert.equal(hookRun2.status, 0, 'Stop hook MUST NOT trap user in an infinite loop on identical fingerprint');

    // 4. Restore clean server -> Stop hook exits 0 and verify returns PASS!
    fs.writeFileSync(serverPath, origServer, 'utf8');
    const hookRun3 = spawnSync(process.execPath, [hookScript], {
      cwd: created.projectDir,
      encoding: 'utf8'
    });
    assert.equal(hookRun3.status, 0);
    assert.equal(verifyWorkspaceCode(created.projectDir).ok, true);
  } finally {
    fs.rmSync(parentTmp, { recursive: true, force: true });
  }
});
