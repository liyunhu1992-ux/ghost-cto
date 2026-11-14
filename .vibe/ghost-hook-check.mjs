import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanWorkspace } from '../kernel/scanner.mjs';
import { runRealityAudit } from '../kernel/reality-audit.mjs';
import { writeMemoryCapsule } from '../kernel/memory-capsule.mjs';
import { generateBossDashboard } from '../kernel/boss-dashboard.mjs';
import { verifyWorkspaceCode } from '../kernel/code-verifier.mjs';

const vibeDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(vibeDir, '..');
const statePath = path.join(vibeDir, 'hook-retry-state.json');

let stopHookActive = false;
try {
  if (!process.stdin.isTTY) {
    const rawIn = fs.readFileSync(0, 'utf8').trim();
    if (rawIn) {
      const parsed = JSON.parse(rawIn);
      if (parsed && parsed.stop_hook_active) stopHookActive = true;
    }
  }
} catch (err) {
  stopHookActive = Boolean(err) && false;
}

const ws = scanWorkspace(rootDir);
const audit = runRealityAudit(ws);
writeMemoryCapsule(ws, audit);
generateBossDashboard(ws, audit);

if (ws.codeFiles.length > 0) {
  const ver = verifyWorkspaceCode(rootDir);
  if (ver.ok) {
    try { fs.rmSync(statePath, { force: true }); } catch (err) { void err; }
  } else {
    const newestMtime = ws.codeFiles.reduce((m, f) => Math.max(m, Math.round(f.mtimeMs)), 0);
    const fingerprint = newestMtime + '|' + ver.aiCompact;
    let prevFp = '';
    try { prevFp = JSON.parse(fs.readFileSync(statePath, 'utf8')).lastBlockedFingerprint || ''; } catch (err) { prevFp = err ? '' : ''; }
    if (!stopHookActive && prevFp !== fingerprint) {
      fs.writeFileSync(statePath, JSON.stringify({ lastBlockedFingerprint: fingerprint }, null, 2), 'utf8');
      process.stderr.write('\n' + ver.aiFixPrompt + '\n');
      process.exit(2);
    }
  }
}
