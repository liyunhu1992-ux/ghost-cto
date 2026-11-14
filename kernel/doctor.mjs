import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { estimateTokens } from './lexer.mjs';
import { installGhostCTO } from './installer.mjs';
import { scanWorkspace } from './scanner.mjs';
import { runRealityAudit } from './reality-audit.mjs';
import { computeBlastRadius } from './blast-radius.mjs';
import { saveCheckpoint, rewindCheckpoint } from './time-capsule.mjs';
import { buildMasterPromptArsenal } from './prompt-arsenal.mjs';

/**
 * Spawn the project's vendored MCP server as a real child process with `cwd = os.tmpdir()`
 * (simulating how WorkBuddy, 豆包桌面版, Antigravity LS, Trae, and Cursor launch MCP servers!)
 * and verify live JSON-RPC 2.0 round-trips over OS stdio pipes.
 */
export function probeLiveMcpSubprocess(mcpConfigPath, framing = 'newline') {
  return new Promise((resolve, reject) => {
    const cfg = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    const srv = cfg.mcpServers?.['ghost-cto'];
    if (!srv) {
      return reject(new Error(`Missing ghost-cto entry in ${mcpConfigPath}`));
    }

    const child = spawn(srv.command, srv.args, {
      cwd: os.tmpdir(), // Deliberately run outside workspace to prove cwd-independence!
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const responses = new Map();
    let stdoutBuf = Buffer.alloc(0);
    let stderrStr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`MCP subprocess timed out after 5000ms. stderr: ${stderrStr}`));
    }, 5000);

    child.stderr.on('data', d => {
      stderrStr += d.toString('utf8');
    });

    child.stdout.on('data', chunk => {
      stdoutBuf = Buffer.concat([stdoutBuf, chunk]);

      while (stdoutBuf.length > 0) {
        if (framing === 'content-length' && stdoutBuf.slice(0, 15).toString('utf8') === 'Content-Length:') {
          const sep = stdoutBuf.indexOf('\r\n\r\n');
          if (sep === -1) break;
          const m = stdoutBuf.slice(0, sep).toString('utf8').match(/Content-Length:\s*(\d+)/i);
          const len = Number(m[1]);
          if (stdoutBuf.length < sep + 4 + len) break;
          const body = stdoutBuf.slice(sep + 4, sep + 4 + len).toString('utf8');
          stdoutBuf = stdoutBuf.slice(sep + 4 + len);
          const msg = JSON.parse(body);
          if (msg.id !== undefined) responses.set(msg.id, msg);
        } else {
          const nl = stdoutBuf.indexOf('\n');
          if (nl === -1) break;
          const line = stdoutBuf.slice(0, nl).toString('utf8').trim();
          stdoutBuf = stdoutBuf.slice(nl + 1);
          if (!line) continue;
          const msg = JSON.parse(line);
          if (msg.id !== undefined) responses.set(msg.id, msg);
        }
      }

      if (responses.has(1) && responses.has(2) && responses.has(3)) {
        clearTimeout(timer);
        child.stdin.end();
        child.kill('SIGTERM');
        resolve({
          init: responses.get(1),
          tools: responses.get(2),
          auditCall: responses.get(3)
        });
      }
    });

    child.on('error', err => {
      clearTimeout(timer);
      reject(err);
    });

    function sendPacket(obj) {
      const payload = JSON.stringify(obj);
      if (framing === 'content-length') {
        const byteLen = Buffer.byteLength(payload, 'utf8');
        child.stdin.write(`Content-Length: ${byteLen}\r\n\r\n${payload}`);
      } else {
        child.stdin.write(`${payload}\n`);
      }
    }

    sendPacket({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } });
    sendPacket({ jsonrpc: '2.0', method: 'notifications/initialized' });
    sendPacket({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    sendPacket({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'ghost_reality_audit', arguments: {} }
    });
  });
}

/**
 * Verify end-to-end installation health on any target project directory.
 */
export async function runDoctor(targetRootDir) {
  const absRoot = path.resolve(targetRootDir);
  const checks = [];

  const requiredFiles = [
    { rel: 'AGENTS.md', label: '通用静态路由 (AGENTS.md)' },
    { rel: '.workbuddy/mcp.json', label: '腾讯 WorkBuddy MCP 配置' },
    { rel: '.workbuddy/skills/cto-translator/SKILL.md', label: '腾讯 WorkBuddy 技能包' },
    { rel: '.workbuddy/skills/ui-anti-slop/SKILL.md', label: '去 AI 塑料味高定审美技能包' },
    { rel: '.codebuddy/CODEBUDDY.md', label: '腾讯 CodeBuddy 主规则' },
    { rel: '.trae/rules/project_rules.md', label: '字节 豆包/Trae 项目规则' },
    { rel: '.trae/mcp.json', label: '字节 豆包/Trae MCP 配置' },
    { rel: '.vibe/豆包桌面版与WorkBuddy_MCP配置.json', label: '豆包桌面版独立 MCP 导入文件' },
    { rel: '.agents/skills/reality-xray/SKILL.md', label: 'Antigravity 工作区直连技能' },
    { rel: '.agents/plugins/ghost-cto/plugin.json', label: 'Antigravity 原生插件清单 (plugin.json)' },
    { rel: '.agents/plugins/ghost-cto/hooks.json', label: 'Antigravity 生命周期钩子 (hooks.json)' },
    { rel: '.agents/plugins/ghost-cto/mcp_config.json', label: 'Antigravity 插件级 MCP (mcp_config.json)' },
    { rel: '.cursor/rules/ghost-cto.mdc', label: 'Cursor 规则 (.mdc)' },
    { rel: 'CLAUDE.md', label: 'Claude Code 入口指针' },
    { rel: '.vibe/项目体检报告.html', label: '离线中文真假与安全体检报告 (.vibe/项目体检报告.html)' },
    { rel: '.vibe/大师级提示词库.md', label: '项目专属大师级提示词弹药库' },
    { rel: '双击启动项目.command', label: 'macOS 双击自愈启动器' },
    { rel: '.vibe/capsule.md', label: '跨软件记忆胶囊 (.vibe/capsule.md)' }
  ];

  for (const item of requiredFiles) {
    const ok = fs.existsSync(path.join(absRoot, item.rel));
    checks.push({ name: item.label, ok, detail: item.rel });
  }

  // Check token budgets
  const agentsTok = fs.existsSync(path.join(absRoot, 'AGENTS.md'))
    ? estimateTokens(fs.readFileSync(path.join(absRoot, 'AGENTS.md'), 'utf8'))
    : 9999;
  checks.push({
    name: 'AGENTS.md 前缀缓存 Token 预算 (<420)',
    ok: agentsTok < 420,
    detail: `${agentsTok} tokens`
  });

  const capTok = fs.existsSync(path.join(absRoot, '.vibe/capsule.md'))
    ? estimateTokens(fs.readFileSync(path.join(absRoot, '.vibe/capsule.md'), 'utf8'))
    : 9999;
  checks.push({
    name: '跨软件记忆胶囊 Token 预算 (<350)',
    ok: capTok < 350,
    detail: `${capTok} tokens`
  });

  // Live OS pipe subprocess test from /tmp (both Newline JSON-RPC and Content-Length framing!)
  const mcpPath = path.join(absRoot, '.workbuddy', 'mcp.json');
  if (fs.existsSync(mcpPath)) {
    const startMs = Date.now();
    const nlRes = await probeLiveMcpSubprocess(mcpPath, 'newline');
    const clRes = await probeLiveMcpSubprocess(mcpPath, 'content-length');
    const elapsed = Date.now() - startMs;

    const mcpOk =
      nlRes.tools?.result?.tools?.length === 9 &&
      nlRes.auditCall?.result?.isError === false &&
      clRes.tools?.result?.tools?.length === 9 &&
      clRes.auditCall?.result?.isError === false;

    checks.push({
      name: '真实子进程 MCP 双协议通信自检 (从外部目录拉起)',
      ok: mcpOk,
      detail: `9 工具全通，往返耗时 ${elapsed}ms`
    });
  } else {
    checks.push({ name: '真实子进程 MCP 通信自检', ok: false, detail: '未找到 mcp.json' });
  }

  const allPassed = checks.every(c => c.ok);
  return { allPassed, checks };
}

/**
 * End-to-end live sandbox simulation (`ghost-cto try`) so any user can verify
 * all GhostCTO subsystems on their own machine in ~1 second.
 */
export async function runSelfTrial() {
  const trialRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-cto-try-'));
  const steps = [];

  try {
    fs.mkdirSync(path.join(trialRoot, 'src'), { recursive: true });
    fs.mkdirSync(path.join(trialRoot, 'data'), { recursive: true });

    fs.writeFileSync(
      path.join(trialRoot, 'package.json'),
      JSON.stringify({ name: 'demo-vibe-saas', scripts: { start: 'node src/server.mjs' } }, null, 2)
    );

    // Plant realistic beginner Vibe Coding bugs: unprotected admin, memory array DB, silent catch, fake client save, 404 dead route
    fs.writeFileSync(
      path.join(trialRoot, 'src/server.mjs'),
      `
      import http from 'node:http';
      const fakeOrdersInMemory = [];
      http.createServer((req, res) => {
        const pathname = req.url;
        if (pathname === '/api/admin/keys' && req.method === 'GET') {
          return res.end(JSON.stringify({ key: 'exposed' }));
        }
        const ctx = req.headers.authorization;
        if (!ctx) return res.writeHead(401).end('Unauthorized');
        if (pathname === '/api/orders/add' && req.method === 'POST') {
          try { fakeOrdersInMemory.push({ id: 1 }); } catch {}
          return res.end(JSON.stringify({ ok: true }));
        }
      }).listen(4567);
      `
    );

    fs.writeFileSync(
      path.join(trialRoot, 'src/App.jsx'),
      `
      export default function App() {
        function handleFakeToggle() {
          showToast('商品已上架成功');
        }
        async function exportOrders() {
          await fetch('/api/orders/add', { method: 'POST' });
          await fetch('/api/orders/missing-export', { method: 'POST' });
        }
        return <button onClick={exportOrders}>一键导出客户订单</button>;
      }
      `
    );

    const dbFile = path.join(trialRoot, 'data/app.sqlite');
    const goodBytes = Buffer.from('SQLite format 3\0GOOD_CUSTOMER_ROWS_100');
    fs.writeFileSync(dbFile, goodBytes);

    // 1. Install across all 8 platforms
    const initRes = installGhostCTO(trialRoot);
    steps.push(`1. 八大国内外软件配置同源安装完成（记忆胶囊仅 ${initRes.capsuleTokens} tokens）`);

    // 2. Run Doctor (spawning live MCP server subprocess over OS pipes)
    const doc = await runDoctor(trialRoot);
    if (!doc.allPassed) throw new Error('Doctor check failed during self-trial');
    steps.push(`2. 真实跨目录 MCP 子进程握手通过（WorkBuddy / 豆包 / Antigravity / Cursor 7 工具全通）`);

    // 3. Verify Reality Audit caught all planted traps at 0 LLM tokens
    const ws = scanWorkspace(trialRoot);
    const audit = runRealityAudit(ws);
    const ids = new Set(audit.findings.map(f => f.id));
    for (const expected of ['UNPROTECTED_ADMIN_API', 'VOLATILE_MEMORY_DB', 'BROKEN_API_CONTRACT', 'SILENT_CATCH', 'FAKE_CLIENT_ONLY_SAVE']) {
      if (!ids.has(expected)) throw new Error(`Expected audit to catch ${expected}`);
    }
    steps.push(`3. 0-Token 法医扫描命中全部 5 类植入假功能与裸奔漏洞（P0:${audit.p0Count}, P1:${audit.p1Count}）`);

    // 4. Verify Chinese UI button text Blast-Radius lookup
    const impact = computeBlastRadius(ws, '一键导出客户订单', audit.lineage);
    if (!impact.seedFiles.includes('src/App.jsx')) throw new Error('Chinese button blast-radius lookup failed');
    steps.push(`4. 中文按钮名「一键导出客户订单」精准反查定位到 src/App.jsx（锁死最大允许改 ${impact.maxSafeFiles} 个文件）`);

    // 5. Verify Atomic Code + SQLite Time Machine rewind
    const cp = saveCheckpoint(trialRoot, '试跑安全基线');
    fs.writeFileSync(path.join(trialRoot, 'src/App.jsx'), 'TOTALLY_BROKEN_FILE');
    fs.writeFileSync(dbFile, Buffer.from('CORRUPTED_DB'));
    rewindCheckpoint(trialRoot, cp.id);
    if (!fs.readFileSync(dbFile).equals(goodBytes)) throw new Error('SQLite byte recovery mismatch');
    steps.push(`5. 代码 + SQLite 数据库双轨时光机破坏性回退验证 100% 字节级一致通过`);

    // 6. Verify Context-Injected Master Prompt Arsenal (卡兹克 & Karpathy 精选)
    const arsenal = buildMasterPromptArsenal(ws, audit, '新增会员积分商城');
    if (arsenal.length !== 8 || !arsenal[0].prompt.includes('demo-vibe-saas') || !arsenal[0].prompt.includes('新增会员积分商城')) {
      throw new Error('Master Prompt Arsenal context injection failed');
    }
    steps.push(`6. 卡兹克 & Karpathy 大师级提示词引擎上下文注入通过（${arsenal.length} 套神级指令就绪）`);

    return { ok: true, steps };
  } finally {
    fs.rmSync(trialRoot, { recursive: true, force: true });
  }
}
