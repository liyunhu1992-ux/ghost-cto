import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { scanWorkspace } from './scanner.mjs';
import { runRealityAudit } from './reality-audit.mjs';
import { computeBlastRadius } from './blast-radius.mjs';
import { saveCheckpoint, rewindCheckpoint } from './time-capsule.mjs';
import { writeMemoryCapsule, detectRuntimeTopology } from './memory-capsule.mjs';
import { generateBossDashboard } from './boss-dashboard.mjs';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk.toString('utf8');
      if (raw.length > 256_000) {
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(payload);
}

/**
 * Create a zero-dependency local HTTP handler for the Live Interactive Cockpit (`ghost-cto studio`).
 * Strictly bound to `127.0.0.1` and protected against cross-origin browser CSRF.
 */
export function createCockpitHttpHandler(targetRootDir) {
  const absRoot = path.resolve(targetRootDir);

  return async function cockpitHandler(req, res) {
    const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = urlObj.pathname;

    // Strict CSRF guard on POST endpoints: reject cross-origin browser requests
    if (req.method === 'POST') {
      const origin = req.headers.origin || '';
      if (origin && !/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(origin)) {
        return sendJson(res, 403, { ok: false, error: 'Cross-origin request blocked by GhostCTO local guard' });
      }
    }

    try {
      if (pathname === '/' || pathname === '/index.html') {
        const ws = scanWorkspace(absRoot);
        const audit = runRealityAudit(ws);
        writeMemoryCapsule(ws, audit);
        const dash = generateBossDashboard(ws, audit);
        const html = fs.readFileSync(dash.rootOutPath, 'utf8');
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store'
        });
        return res.end(html);
      }

      if (pathname === '/__ghost_api/ping' && req.method === 'GET') {
        const ws = scanWorkspace(absRoot);
        const runtime = detectRuntimeTopology(ws);
        return sendJson(res, 200, {
          ok: true,
          mode: 'live',
          projectName: runtime.projectName,
          rootDir: absRoot
        });
      }

      if (pathname === '/__ghost_api/audit' && req.method === 'POST') {
        const ws = scanWorkspace(absRoot);
        const audit = runRealityAudit(ws);
        writeMemoryCapsule(ws, audit);
        generateBossDashboard(ws, audit);
        return sendJson(res, 200, {
          ok: true,
          score: audit.score,
          p0Count: audit.p0Count,
          p1Count: audit.p1Count,
          p2Count: audit.p2Count,
          launchVerdict: audit.launchVerdict
        });
      }

      if (pathname === '/__ghost_api/save' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const label = (body.label || '驾驶舱网页一键安全存档').trim();
        const cp = saveCheckpoint(absRoot, label);
        const ws = scanWorkspace(absRoot);
        const audit = runRealityAudit(ws);
        writeMemoryCapsule(ws, audit);
        generateBossDashboard(ws, audit);
        return sendJson(res, 200, {
          ok: true,
          id: cp.id,
          label: cp.label,
          dbCount: cp.dbSnapshots.filter(d => !d.relPath.endsWith('-wal')).length
        });
      }

      if (pathname === '/__ghost_api/rewind' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const cpId = (body.checkpointId || 'latest').trim();
        const resRewind = rewindCheckpoint(absRoot, cpId);
        const ws = scanWorkspace(absRoot);
        const audit = runRealityAudit(ws);
        writeMemoryCapsule(ws, audit);
        generateBossDashboard(ws, audit);
        return sendJson(res, 200, {
          ok: true,
          restoredId: resRewind.restoredId,
          restoredLabel: resRewind.restoredLabel,
          rescueId: resRewind.rescueId
        });
      }

      if (pathname === '/__ghost_api/impact' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const query = (body.query || '').trim();
        if (!query) {
          return sendJson(res, 400, { ok: false, error: '请输入要查询的中文按钮名或功能词' });
        }
        const ws = scanWorkspace(absRoot);
        const impact = computeBlastRadius(ws, query);
        return sendJson(res, 200, {
          ok: true,
          query,
          seedFiles: impact.seedFiles,
          maxSafeFiles: impact.maxSafeFiles,
          matchedRoutes: impact.matchedRoutes,
          matchedTables: impact.matchedTables,
          buildCommands: impact.buildCommands,
          founderMarkdown: impact.founderMarkdown
        });
      }

      return sendJson(res, 404, { ok: false, error: 'Not found' });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message || String(err) });
    }
  };
}

/**
 * Start the Live Interactive Cockpit server on `127.0.0.1`, auto-selecting a free port starting from `preferredPort`.
 */
export function startLiveCockpitServer(targetRootDir, options = {}) {
  const absRoot = path.resolve(targetRootDir);
  const startPort = Number(options.port) || 9777;
  const autoOpen = options.openBrowser !== false;
  const handler = createCockpitHttpHandler(absRoot);

  return new Promise((resolve, reject) => {
    function tryListen(port, attemptsLeft) {
      const server = http.createServer(handler);
      server.once('error', err => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          tryListen(port + 1, attemptsLeft - 1);
        } else {
          reject(err);
        }
      });
      server.listen(port, '127.0.0.1', () => {
        const actualPort = server.address().port;
        const url = `http://127.0.0.1:${actualPort}`;
        if (autoOpen) {
          const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
          const openArgs = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
          execFile(openCmd, openArgs, () => {});
        }
        resolve({ server, port: actualPort, url });
      });
    }

    tryListen(startPort, 15);
  });
}
