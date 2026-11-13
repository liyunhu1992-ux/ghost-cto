import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanWorkspace } from '../kernel/scanner.mjs';
import { runRealityAudit } from '../kernel/reality-audit.mjs';
import { runSelfTrial, runDoctor } from '../kernel/doctor.mjs';
import { installGhostCTO } from '../kernel/installer.mjs';

test('Polyglot & Embedded String.raw / HTML / Python FastAPI Reality Audit catches demo shells, fake client toggles, and Python silent except', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-cto-polyglot-'));

  try {
    fs.mkdirSync(path.join(tmpRoot, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'backend'), { recursive: true });

    // Embedded `String.raw` frontend script (like 媒擎OS `mengine-cloud`)
    fs.writeFileSync(
      path.join(tmpRoot, 'src/views-render.mjs'),
      `export const VIEWS_SCRIPT = String.raw\`
      const shelfState = {};
      function toggleShelf(id) {
        shelfState[id] = !shelfState[id];
        showToast('模块已在客户端全网上架');
      }
      async function loadSim() {
        try {
          const r = await fetch('/api/py/simulate?x=1');
        } catch (e) {}
      }
      \`;
      `
    );

    // Python FastAPI backend with no database and `except Exception: pass`
    fs.writeFileSync(
      path.join(tmpRoot, 'backend/main.py'),
      [
        'from fastapi import FastAPI',
        'app = FastAPI()',
        '',
        '@app.get("/api/py/simulate")',
        'def simulate():',
        '    try:',
        '        return {"ok": True}',
        '    except Exception:',
        '        pass'
      ].join('\n')
    );

    const ws = scanWorkspace(tmpRoot);
    const audit = runRealityAudit(ws);
    const ids = audit.findings.map(f => f.id);

    assert.ok(ids.includes('DEMO_SHELL_NO_DATABASE'), 'Expected DEMO_SHELL_NO_DATABASE when zero DB exists');
    assert.ok(ids.includes('FAKE_CLIENT_ONLY_SAVE'), 'Expected FAKE_CLIENT_ONLY_SAVE on toggleShelf');
    const silentCatches = audit.findings.filter(f => f.id === 'SILENT_CATCH');
    assert.equal(silentCatches.length, 2, 'Should catch BOTH embedded JS catch(e){} AND Python except: pass');

    // Verify `/api/py/simulate` matched between embedded JS fetch and Python FastAPI `@app.get`!
    const matched = audit.lineage.chains.find(c => c.endpoint === '/api/py/simulate');
    assert.ok(matched);
    assert.notEqual(matched.status, 'BROKEN_CONTRACT');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Live OS Subprocess MCP Pipe Handshake (Newline + Content-Length) & Full Self-Trial (`ghost-cto try`)', async () => {
  const trialRes = await runSelfTrial();
  assert.equal(trialRes.ok, true);
  assert.equal(trialRes.steps.length, 5);

  const tmpProj = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-cto-doc-'));
  try {
    fs.writeFileSync(path.join(tmpProj, 'package.json'), JSON.stringify({ name: 'doc-check' }));
    installGhostCTO(tmpProj);
    const doc = await runDoctor(tmpProj);
    assert.equal(doc.allPassed, true);
  } finally {
    fs.rmSync(tmpProj, { recursive: true, force: true });
  }
});
