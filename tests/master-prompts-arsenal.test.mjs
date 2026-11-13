import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanWorkspace } from '../kernel/scanner.mjs';
import { runRealityAudit } from '../kernel/reality-audit.mjs';
import { buildMasterPromptArsenal, getMasterPromptById } from '../kernel/prompt-arsenal.mjs';
import { handleMcpRequest } from '../kernel/mcp-server.mjs';

test('Master Prompt Arsenal dynamically injects real SQLite tables, ports, and static build commands at 0 idle tokens', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-arsenal-test-'));

  try {
    fs.mkdirSync(path.join(tmpRoot, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, 'package.json'),
      JSON.stringify({ name: 'merchant-os', scripts: { start: 'node src/server.mjs' } }, null, 2)
    );
    fs.writeFileSync(path.join(tmpRoot, 'build-ui.mjs'), `console.log('build public/index.html');\n`);
    fs.writeFileSync(
      path.join(tmpRoot, 'src/db.mjs'),
      `
      import { DatabaseSync } from 'node:sqlite';
      const db = new DatabaseSync(':memory:');
      db.exec('CREATE TABLE IF NOT EXISTS vip_wallets (id TEXT PRIMARY KEY, balance INTEGER)');
      db.exec('CREATE TABLE IF NOT EXISTS store_orders (id TEXT PRIMARY KEY, total INTEGER)');
      `
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'src/server.mjs'),
      `import http from 'node:http';\nhttp.createServer((req, res) => res.end('ok')).listen(8788);\n`
    );

    const ws = scanWorkspace(tmpRoot);
    const audit = runRealityAudit(ws);
    const prompts = buildMasterPromptArsenal(ws, audit, '增加老客充值返现活动');

    assert.equal(prompts.length, 8);
    const expectedIds = [
      'khazix-socratic-mvp',
      'karpathy-surgical-code',
      'anti-ai-slop-ui',
      'deadloop-bug-breaker',
      'khazix-expert-council',
      'mvp-negative-blueprint',
      'khazix-neat-freak',
      'khazix-human-copy'
    ];
    assert.deepEqual(
      prompts.map(p => p.id),
      expectedIds
    );

    // Every single prompt must include real project context (project name, real DB tables, port :8788, and node build-ui.mjs)
    for (const p of prompts) {
      assert.ok(p.prompt.includes('merchant-os'), `Prompt ${p.id} missing project name`);
      assert.ok(p.prompt.includes('vip_wallets'), `Prompt ${p.id} missing real SQLite table vip_wallets`);
      assert.ok(p.prompt.includes('store_orders'), `Prompt ${p.id} missing real SQLite table store_orders`);
      assert.ok(p.prompt.includes(':8788'), `Prompt ${p.id} missing detected port :8788`);
      assert.ok(p.prompt.includes('node build-ui.mjs'), `Prompt ${p.id} missing static build guard`);
      assert.ok(p.prompt.includes('增加老客充值返现活动'), `Prompt ${p.id} missing custom founder topic`);
    }

    // Verify MCP `ghost_master_prompt` tool call works cleanly
    const mcpSingle = handleMcpRequest(
      {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'ghost_master_prompt',
          arguments: {
            projectDir: tmpRoot,
            scenario: 'anti-ai-slop-ui',
            topic: '把首页看板改成高级黑白极简风'
          }
        }
      },
      tmpRoot
    );
    assert.equal(mcpSingle.result.isError, false);
    assert.ok(mcpSingle.result.content[0].text.includes('把首页看板改成高级黑白极简风'));
    assert.ok(mcpSingle.result.content[0].text.includes('Linear'));
    assert.ok(mcpSingle.result.content[0].text.includes('vip_wallets'));

    // Verify `getMasterPromptById` throws helpful message on unknown ID
    assert.throws(() => getMasterPromptById(ws, audit, 'non-existent-id'), /未找到编号/);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
