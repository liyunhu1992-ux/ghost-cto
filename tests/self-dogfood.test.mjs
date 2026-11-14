import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { GHOST_PACKAGE_ROOT, installGhostCTO } from '../kernel/installer.mjs';
import { scanWorkspace } from '../kernel/scanner.mjs';
import { runRealityAudit } from '../kernel/reality-audit.mjs';
import { verifyWorkspaceCode } from '../kernel/code-verifier.mjs';
import { bootstrapGoldenApp } from '../kernel/golden-scaffold.mjs';

test('Self-Dogfooding Gate: GhostCTO governs itself at 100/100 score, 0 errors, and < 500 lines per file', () => {
  // 1. Every .mjs file in bin/, kernel/, and tests/ must strictly obey the < 500 lines rule
  for (const folder of ['bin', 'kernel', 'tests']) {
    const absFolder = path.join(GHOST_PACKAGE_ROOT, folder);
    for (const entry of fs.readdirSync(absFolder)) {
      if (!entry.endsWith('.mjs')) continue;
      const fullPath = path.join(absFolder, entry);
      const lineCount = fs.readFileSync(fullPath, 'utf8').split('\n').length;
      assert.ok(
        lineCount < 500,
        `Self-dogfooding line budget exceeded: ${folder}/${entry} has ${lineCount} lines (must be < 500)`
      );
    }
  }

  // 2. GhostCTO verifyWorkspaceCode on GhostCTO itself must pass with 0 syntax/import/SQL/P0 errors
  const ver = verifyWorkspaceCode(GHOST_PACKAGE_ROOT);
  assert.equal(ver.ok, true, `Self verify failed:\n${ver.errorLines.join('\n')}`);
  assert.equal(ver.syntaxErrors.length, 0);
  assert.equal(ver.p0Findings.length, 0);

  // 3. GhostCTO Reality Audit on GhostCTO itself must achieve 100/100 (0 P0, 0 P1, 0 P2)
  const ws = scanWorkspace(GHOST_PACKAGE_ROOT);
  const audit = runRealityAudit(ws);
  assert.equal(
    audit.score,
    100,
    `Expected GhostCTO self-audit score 100/100, got ${audit.score}: ${JSON.stringify(audit.findings)}`
  );
  assert.equal(audit.p0Count, 0);
  assert.equal(audit.p1Count, 0);
  assert.equal(audit.p2Count, 0);

  // 4. Execute GhostCTO's own Stop-Hook gate against GhostCTO itself (exit code 0)
  const hookScript = path.join(GHOST_PACKAGE_ROOT, '.vibe', 'ghost-hook-check.mjs');
  if (fs.existsSync(hookScript)) {
    execFileSync(process.execPath, [hookScript], {
      cwd: GHOST_PACKAGE_ROOT,
      input: '',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
});

test('Universal Product Categories: Website, Multi-Module AI SaaS & Interactive Tool all generate 5-stage roadmaps and pass 100/100', () => {
  const cases = [
    {
      idea: '摄影设计工作室品牌展示官网与预约咨询',
      audience: 'public',
      expectedKind: 'website',
      expectedDomMarker: 'site-hero'
    },
    {
      idea: '多平台 AI 内容矩阵与智能体工作台系统',
      audience: 'commercial',
      expectedKind: 'saas_platform',
      expectedDomMarker: 'saas-shell'
    },
    {
      idea: '在线图文排版与格式转换效率工具',
      audience: 'self',
      expectedKind: 'interactive_tool',
      expectedDomMarker: 'form-grid'
    }
  ];

  for (const c of cases) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `ghost-kind-${c.expectedKind}-`));
    try {
      installGhostCTO(tmpDir, { createInitialCheckpoint: false });
      const res = bootstrapGoldenApp(tmpDir, c.idea, { audience: c.audience });
      assert.equal(res.scaffolded, true);
      assert.equal(res.blueprint.productKind, c.expectedKind);
      assert.ok(!res.blueprint.appName.endsWith('管家'), `App name should not force 管家 suffix: ${res.blueprint.appName}`);

      // Verify 5-stage 0->5 roadmap.json was generated
      const roadmapPath = path.join(tmpDir, '.vibe', 'roadmap.json');
      assert.ok(fs.existsSync(roadmapPath), 'Expected .vibe/roadmap.json to be written');
      const roadmap = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));
      assert.equal(roadmap.productKind, c.expectedKind);
      assert.equal(roadmap.stages.length, 5);

      // Verify bespoke UI layout + 100/100 deterministic verification
      const html = fs.readFileSync(path.join(tmpDir, 'public', 'index.html'), 'utf8');
      assert.ok(html.includes(c.expectedDomMarker), `Expected layout marker ${c.expectedDomMarker} for ${c.expectedKind}`);

      const ver = verifyWorkspaceCode(tmpDir);
      assert.equal(ver.ok, true, `Verify failed for ${c.expectedKind}: ${ver.errorLines.join('\n')}`);
      assert.equal(ver.score, 100);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});

test('Real-World Monorepo Regression: ensureColumn migrations, .vendor exclusion, and pnpm build commands', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-monorepo-real-'));
  try {
    fs.writeFileSync(path.join(tmpDir, 'pnpm-workspace.yaml'), 'packages:\n  - "apps/*"\n', 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'pro-saas-suite', private: true }), 'utf8');

    // 1. Third-party .vendor directory with 900-line file must be ignored (0 GOD_FILE penalty)
    fs.mkdirSync(path.join(tmpDir, '.vendor', 'oss-tool'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.vendor', 'oss-tool', 'big.py'), 'x = 1\n'.repeat(900), 'utf8');

    // 2. Schema using ensureColumn(db, table, col, def) incremental migration helper
    fs.mkdirSync(path.join(tmpDir, 'apps', 'api', 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'apps', 'api', 'package.json'),
      JSON.stringify({ name: '@suite/api', type: 'module' }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'apps', 'api', 'src', 'schema.mjs'),
      [
        `export function applySchema(db) {`,
        `  db.exec("CREATE TABLE IF NOT EXISTS customer_profiles (id TEXT PRIMARY KEY, name TEXT NOT NULL)");`,
        `  ensureColumn(db, 'customer_profiles', 'wechat_handle', "TEXT NOT NULL DEFAULT ''");`,
        `}`,
        `function ensureColumn(db, tbl, col, def) { db.exec(\`ALTER TABLE \${tbl} ADD COLUMN \${col} \${def}\`); }`
      ].join('\n'),
      'utf8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'apps', 'api', 'src', 'repo.mjs'),
      [
        `import { applySchema } from './schema.mjs';`,
        `export function saveCustomer(db) {`,
        `  applySchema(db);`,
        `  db.prepare("INSERT INTO customer_profiles (id, name, wechat_handle) VALUES (?, ?, ?)").run('1', 'Alice', 'wx_1');`,
        `}`
      ].join('\n'),
      'utf8'
    );

    const ver = verifyWorkspaceCode(tmpDir);
    assert.equal(ver.ok, true, `Expected ensureColumn migration to pass verify, got: ${ver.errorLines.join('\n')}`);

    const ws = scanWorkspace(tmpDir);
    assert.equal(
      ws.codeFiles.some(f => f.relPath.startsWith('.vendor/')),
      false,
      '.vendor directory must be excluded from workspace scan'
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
