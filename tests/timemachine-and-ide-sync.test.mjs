import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installGhostCTO } from '../kernel/installer.mjs';
import { saveCheckpoint, rewindCheckpoint } from '../kernel/time-capsule.mjs';
import { handleMcpRequest } from '../kernel/mcp-server.mjs';

test('8-Platform Domestic/Overseas Sync + Atomic Code & SQLite+WAL Time Machine + Stdio MCP Protocol', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-cto-sync-'));

  try {
    fs.mkdirSync(path.join(tmpRoot, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'data'), { recursive: true });

    fs.writeFileSync(
      path.join(tmpRoot, 'package.json'),
      JSON.stringify({ name: 'beginner-shop', scripts: { dev: 'node src/server.mjs' } }, null, 2)
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'src/server.mjs'),
      `import http from 'node:http';\nhttp.createServer((req, res) => res.end('v1')).listen(3399);\n`
    );

    const dbPath = path.join(tmpRoot, 'data/shop.sqlite');
    const walPath = path.join(tmpRoot, 'data/shop.sqlite-wal');
    const originalDbBytes = Buffer.from('SQLite format 3\0ORIGINAL_CUSTOMER_DATA_V1');
    const originalWalBytes = Buffer.from('WAL_FRAME_ORIGINAL_V1');
    fs.writeFileSync(dbPath, originalDbBytes);
    fs.writeFileSync(walPath, originalWalBytes);

    // Pre-populate an existing user MCP server in `.cursor/mcp.json` to ensure `installGhostCTO` preserves it!
    fs.mkdirSync(path.join(tmpRoot, '.cursor'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, '.cursor/mcp.json'),
      JSON.stringify({ mcpServers: { 'existing-figma': { command: 'npx', args: ['figma-mcp'] } } }, null, 2)
    );

    // 1. Run 8-platform domestic + overseas installation
    const installRes = installGhostCTO(tmpRoot);
    assert.ok(installRes.capsuleTokens < 350, `Capsule must be <350 tokens (got ${installRes.capsuleTokens})`);

    const mergedCursorMcp = JSON.parse(fs.readFileSync(path.join(tmpRoot, '.cursor/mcp.json'), 'utf8'));
    assert.ok(mergedCursorMcp.mcpServers['existing-figma'], 'Must preserve existing MCP servers in mcp.json');
    assert.ok(mergedCursorMcp.mcpServers['ghost-cto'], 'Must inject ghost-cto MCP server into mcp.json');

    // Verify Domestic Chinese AI Tools (WorkBuddy, CodeBuddy, 豆包/Trae) + Global Tools
    const expectedFiles = [
      'AGENTS.md',
      'CLAUDE.md',
      '.mcp.json',
      '.workbuddy/skills/cto-translator/SKILL.md',
      '.workbuddy/rules/ghost-cto.md',
      '.workbuddy/mcp.json',
      '.codebuddy/CODEBUDDY.md',
      '.codebuddy/rules/ghost-cto.md',
      '.codebuddy/skills/reality-xray/SKILL.md',
      '.trae/rules/project_rules.md',
      '.trae/skills/surgical-guard/SKILL.md',
      '.trae/mcp.json',
      '.vibe/豆包桌面版与WorkBuddy_MCP配置.json',
      '.agents/skills/reality-xray/SKILL.md',
      '.agents/plugins/ghost-cto/plugin.json',
      '.agents/plugins/ghost-cto/hooks.json',
      '.agents/plugins/ghost-cto/mcp_config.json',
      '.cursor/rules/ghost-cto.mdc',
      '.windsurf/rules/ghost-cto.md',
      '.windsurf/mcp_config.json',
      '.vibe/项目体检报告.html',
      '双击启动项目.command',
      '双击启动项目.bat'
    ];
    for (const rel of expectedFiles) {
      assert.ok(fs.existsSync(path.join(tmpRoot, rel)), `Missing expected platform file: ${rel}`);
    }

    // 2. Save explicit checkpoint, then simulate AI breaking code AND corrupting SQLite + WAL
    const cpGood = saveCheckpoint(tmpRoot, '上线前完美状态');
    fs.writeFileSync(path.join(tmpRoot, 'src/server.mjs'), 'BROKEN_SYNTAX_ERROR !!!');
    fs.writeFileSync(dbPath, Buffer.from('WIPED_DATABASE'));
    fs.writeFileSync(walPath, Buffer.from('CORRUPTED_WAL'));

    // 3. Rewind and verify atomic recovery + automatic rescue backup
    const rewindRes = rewindCheckpoint(tmpRoot, cpGood.id);
    assert.equal(rewindRes.restoredId, cpGood.id);
    assert.ok(rewindRes.rescueId, 'Expected automatic pre-rewind rescue backup');

    const restoredCode = fs.readFileSync(path.join(tmpRoot, 'src/server.mjs'), 'utf8');
    assert.ok(restoredCode.includes("res.end('v1')"));
    assert.deepEqual(fs.readFileSync(dbPath), originalDbBytes);
    assert.deepEqual(fs.readFileSync(walPath), originalWalBytes);

    // 4. Verify Stdio MCP JSON-RPC 2.0 Server Handshake & Tool Execution
    const initResp = handleMcpRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }, tmpRoot);
    assert.equal(initResp.result.serverInfo.name, 'ghost-cto');

    const toolsResp = handleMcpRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, tmpRoot);
    assert.equal(toolsResp.result.tools.length, 9);

    const auditCall = handleMcpRequest(
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'ghost_reality_audit', arguments: { projectDir: tmpRoot } }
      },
      tmpRoot
    );
    assert.equal(auditCall.result.isError, false);
    assert.ok(auditCall.result.content[0].text.startsWith('GHOST_AUDIT|'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
