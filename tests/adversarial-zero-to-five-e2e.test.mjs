import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
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
