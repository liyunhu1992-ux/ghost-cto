import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { installGhostCTO } from '../kernel/installer.mjs';
import { createCockpitHttpHandler } from '../kernel/live-server.mjs';
import { verifyWorkspaceCode } from '../kernel/code-verifier.mjs';
import { handleMcpRequest } from '../kernel/mcp-server.mjs';

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
    setImmediate(() => {
      if (bodyObj !== null) {
        req.emit('data', Buffer.from(JSON.stringify(bodyObj), 'utf8'));
      }
      req.emit('end');
    });
  });
}

test('Vague 5-word beginner idea -> Blueprint -> 97-score Runnable SQLite Golden App -> Syntax Error Gate', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-beginner-flow-'));

  try {
    // 1. Beginner installs GhostCTO on a completely empty folder
    installGhostCTO(tmpDir);
    const initialDash = fs.readFileSync(path.join(tmpDir, '.vibe', '项目体检报告.html'), 'utf8');
    assert.ok(initialDash.includes('零碎想法孵化器'), 'Empty folder should display the Zero-to-One Idea Incubator');

    // 2. Beginner opens Live Cockpit and enters only a vague fragment: "管美甲店会员次卡"
    const handler = createCockpitHttpHandler(tmpDir);

    const incRes = await invokeHandler(
      handler,
      'POST',
      '/__ghost_api/incubate',
      { idea: '我想做个管美甲店会员次卡的', audience: 'team' },
      { origin: 'http://127.0.0.1:9777' }
    );
    const incData = JSON.parse(incRes.body);
    assert.equal(incData.ok, true);
    assert.equal(incData.blueprint.tableName, 'customer_records');
    assert.ok(fs.existsSync(path.join(tmpDir, '.vibe', 'blueprint.md')));

    // 3. Beginner clicks "一键生成 97分零出错真项目底座"
    const bootRes = await invokeHandler(
      handler,
      'POST',
      '/__ghost_api/bootstrap',
      { idea: '我想做个管美甲店会员次卡的', audience: 'team' },
      { origin: 'http://127.0.0.1:9777' }
    );
    const bootData = JSON.parse(bootRes.body);
    assert.equal(bootData.ok, true);
    assert.equal(bootData.scaffolded, true);
    assert.ok(bootData.score >= 95, `Expected Golden App score >= 95, got ${bootData.score}`);
    assert.ok(fs.existsSync(path.join(tmpDir, 'public', 'vibe-shield.js')));

    // 4. Verify the generated Golden App actually runs and persists records to real SQLite!
    const dbMod = await import(`file://${path.join(tmpDir, 'src', 'db.mjs')}`);
    const beforeItems = dbMod.listRecords();
    assert.equal(beforeItems.length, 3, 'Should pre-seed 3 realistic sample records');
    const created = dbMod.createRecord({ title: '赵小姐 · 储值次卡', note: '周末预约', amount: 10 });
    assert.ok(created.id >= 4);
    const afterItems = dbMod.listRecords('赵小姐');
    assert.equal(afterItems.length, 1);

    // 5. Verify 0-Token Compiler & Reality Verifier passes 100% cleanly on Golden App
    const verClean = verifyWorkspaceCode(tmpDir);
    assert.equal(verClean.ok, true);
    assert.equal(verClean.syntaxErrors.length, 0);
    assert.equal(verClean.p0Findings.length, 0);

    // 6. Simulate AI introducing a JS syntax error + HTML <script> syntax error -> Verifier MUST catch both!
    const serverPath = path.join(tmpDir, 'src', 'server.mjs');
    const origServer = fs.readFileSync(serverPath, 'utf8');
    fs.writeFileSync(serverPath, origServer + '\nfunction brokenSyntax( {\n', 'utf8');

    const indexPath = path.join(tmpDir, 'public', 'index.html');
    const origIndex = fs.readFileSync(indexPath, 'utf8');
    fs.writeFileSync(indexPath, origIndex.replace('</body>', '<script>const bad = (;</script></body>'), 'utf8');

    const verBroken = verifyWorkspaceCode(tmpDir);
    assert.equal(verBroken.ok, false);
    assert.equal(verBroken.syntaxErrors.length, 2, 'Should catch BOTH JS syntax error and HTML inline script syntax error');

    // Also test MCP tool ghost_verify_code and HTTP /__ghost_api/verify catch it
    const mcpResp = handleMcpRequest(
      { jsonrpc: '2.0', id: 99, method: 'tools/call', params: { name: 'ghost_verify_code', arguments: {} } },
      tmpDir
    );
    assert.ok(mcpResp.result.content[0].text.includes('GHOST_VERIFY_FAIL'));

    const httpVerRes = await invokeHandler(
      handler,
      'POST',
      '/__ghost_api/verify',
      {},
      { origin: 'http://127.0.0.1:9777' }
    );
    assert.equal(JSON.parse(httpVerRes.body).verification.ok, false);

    // Restore clean files and confirm PASS returns
    fs.writeFileSync(serverPath, origServer, 'utf8');
    fs.writeFileSync(indexPath, origIndex, 'utf8');
    const verRestored = verifyWorkspaceCode(tmpDir);
    assert.equal(verRestored.ok, true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
