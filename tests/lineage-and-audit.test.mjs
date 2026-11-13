import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanWorkspace } from '../kernel/scanner.mjs';
import { buildLineageGraph } from '../kernel/lineage-graph.mjs';
import { runRealityAudit } from '../kernel/reality-audit.mjs';
import { computeBlastRadius } from '../kernel/blast-radius.mjs';

test('3D Lineage & Reality Audit accurately distinguish real DB writes, volatile memory traps, broken APIs, and unprotected admin routes', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-cto-audit-'));

  try {
    fs.mkdirSync(path.join(tmpRoot, 'packages/db/src'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'apps/api/src'), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, 'apps/web/src'), { recursive: true });

    fs.writeFileSync(
      path.join(tmpRoot, 'packages/db/package.json'),
      JSON.stringify({ name: '@demo/db', main: './src/index.mjs' })
    );
    fs.writeFileSync(
      path.join(tmpRoot, 'packages/db/src/index.mjs'),
      `
      export const db = { prepare: () => ({ run: () => {}, all: () => [] }), exec: () => {} };
      db.exec('CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, title TEXT);');
      export function insertOrder(data) {
        return db.prepare('INSERT INTO orders (id, title) VALUES (?, ?)').run(data.id, data.title);
      }
      `
    );

    fs.writeFileSync(
      path.join(tmpRoot, 'apps/api/src/server.mjs'),
      `
      import http from 'node:http';
      import { insertOrder } from '@demo/db';

      const volatileDrafts = [];

      // Commented out catch {} must NOT cause a false positive:
      // try { foo(); } catch {}

      const server = http.createServer(async (req, res) => {
        const pathname = req.url;
        if (pathname === '/api/admin/secret-config' && req.method === 'GET') {
          return res.end(JSON.stringify({ ok: true }));
        }

        const ctx = req.headers.authorization;
        if (!ctx) return res.writeHead(401).end('Unauthorized');

        if (pathname === '/api/orders/create' && req.method === 'POST') {
          insertOrder({ id: '1', title: 'VIP' });
          return res.end(JSON.stringify({ ok: true }));
        }

        if (pathname === '/api/drafts/save' && req.method === 'POST') {
          try {
            volatileDrafts.push({ id: Date.now() });
          } catch {}
          return res.end(JSON.stringify({ ok: true }));
        }
      });
      `
    );

    fs.writeFileSync(
      path.join(tmpRoot, 'apps/web/src/App.jsx'),
      `
      export default function App() {
        async function createOrder() {
          await apiFetch('/api/orders/create', { method: 'POST' });
          await fetch('/api/drafts/save', { method: 'POST' });
          await fetch('/api/non-existent-dead-route', { method: 'POST' });
        }
        return <button onClick={createOrder}>立即开通旗舰门店</button>;
      }
      `
    );

    fs.writeFileSync(
      path.join(tmpRoot, 'gateway.mjs'),
      `
      import http from 'node:http';
      http.createServer((req, res) => {
        const p = http.request({ hostname: '127.0.0.1', port: 8080, path: req.url }, r => r.pipe(res));
        req.pipe(p);
      });
      `
    );

    const ws = scanWorkspace(tmpRoot);
    const lineage = buildLineageGraph(ws);
    const audit = runRealityAudit(ws, lineage);

    // Verify 3D Lineage classification across @demo/db monorepo boundary
    const realChain = lineage.chains.find(c => c.endpoint === '/api/orders/create');
    assert.ok(realChain, 'Expected /api/orders/create chain');
    assert.equal(realChain.status, 'REAL_DB_WRITE');
    assert.ok(realChain.persistence.includes('orders'));

    const volatileChain = lineage.chains.find(c => c.endpoint === '/api/drafts/save');
    assert.ok(volatileChain);
    assert.equal(volatileChain.status, 'VOLATILE_MEMORY');

    const brokenChain = lineage.chains.find(c => c.endpoint === '/api/non-existent-dead-route');
    assert.ok(brokenChain);
    assert.equal(brokenChain.status, 'BROKEN_CONTRACT');

    // Verify Forensic Findings (and zero false positive on commented-out catch {})
    const ids = audit.findings.map(f => f.id);
    assert.ok(ids.includes('UNPROTECTED_ADMIN_API'));
    assert.ok(ids.includes('VOLATILE_MEMORY_DB'));
    assert.ok(ids.includes('BROKEN_API_CONTRACT'));
    assert.ok(ids.includes('UNSAFE_PROXY_STREAM'));

    const silentCatches = audit.findings.filter(f => f.id === 'SILENT_CATCH');
    assert.equal(silentCatches.length, 1, 'Only the real empty catch {} should be flagged, not comments');

    // Verify Blast Radius matches Chinese UI button label at 0 LLM tokens
    const impact = computeBlastRadius(ws, '立即开通旗舰门店', lineage);
    assert.ok(impact.seedFiles.includes('apps/web/src/App.jsx'));
    assert.ok(impact.linkedApis.some(a => a.includes('/api/orders/create')));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
