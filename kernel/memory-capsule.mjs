import fs from 'node:fs';
import path from 'node:path';
import { estimateTokens } from './lexer.mjs';
import { listCheckpoints } from './time-capsule.mjs';

/**
 * Detect project ports and start commands from root `package.json` & entry scripts
 * so both `.vibe/capsule.md` and `双击启动项目.command` know exactly how to boot the app!
 */
export function detectRuntimeTopology(workspace) {
  let projectName = path.basename(workspace.rootDir);
  let startCmd = 'npm run dev';
  const ports = new Set();

  const rootPkgPath = path.join(workspace.rootDir, 'package.json');
  if (fs.existsSync(rootPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
      if (pkg.name) projectName = pkg.name;
      const scripts = pkg.scripts || {};
      if (fs.existsSync(path.join(workspace.rootDir, 'start-all.mjs'))) {
        startCmd = 'node start-all.mjs';
      } else if (scripts.dev) {
        startCmd = 'npm run dev';
      } else if (scripts.start) {
        startCmd = 'npm start';
      }
    } catch {
      // ignore
    }
  } else if (fs.existsSync(path.join(workspace.rootDir, 'start-all.mjs'))) {
    startCmd = 'node start-all.mjs';
  } else if (fs.existsSync(path.join(workspace.rootDir, 'main.py'))) {
    startCmd = 'uvicorn main:app --reload';
  } else if (fs.existsSync(path.join(workspace.rootDir, 'app.py'))) {
    startCmd = 'python3 app.py';
  }

  // Scan top-level and server files for explicit `.listen(PORT` or port numbers
  for (const f of workspace.codeFiles) {
    if (f.role === 'test') continue;
    try {
      const src = fs.readFileSync(f.absPath, 'utf8');
      const portRe = /(?:\.listen\s*\(\s*|PORT\s*\|\|\s*|port\s*:\s*)(\d{4,5})\b/g;
      let m;
      while ((m = portRe.exec(src)) !== null) {
        const p = Number(m[1]);
        if (p >= 1024 && p <= 65535) ports.add(p);
      }
      // Also detect helper calls like `createStaticWithApiProxy(..., 8891, ...)`
      const helperPortRe = /,\s*(8\d{3}|3\d{3}|4\d{3}|517\d)\s*,/g;
      while ((m = helperPortRe.exec(src)) !== null) {
        ports.add(Number(m[1]));
      }
    } catch {
      // ignore
    }
  }

  return {
    projectName,
    startCmd,
    ports: [...ports].sort((a, b) => a - b)
  };
}

/**
 * Write `.vibe/capsule.md` — strictly `< 350 tokens` Cross-IDE Project Memory Capsule.
 * Read on-demand when switching between WorkBuddy, 豆包/Trae, Antigravity, Cursor, or Claude Code.
 */
export function writeMemoryCapsule(workspace, audit) {
  const vibeDir = path.join(workspace.rootDir, '.vibe');
  fs.mkdirSync(vibeDir, { recursive: true });

  const runtime = detectRuntimeTopology(workspace);
  const checkpoints = listCheckpoints(workspace.rootDir);
  const latestCp = checkpoints[0] ? `${checkpoints[0].id} (${checkpoints[0].label})` : 'NONE';
  const buildApps = workspace.staleBuilds.map(b => b.appDir).join(',') || 'NONE';

  const topFindings = audit.findings
    .slice(0, 5)
    .map(f => `- [${f.severity}] ${f.file}:${f.line} -> ${f.id}`)
    .join('\n');

  const immuneRules = loadImmuneScars(workspace.rootDir);
  const scarLines = immuneRules
    .slice(0, 3)
    .map(r => `- SCAR: ${r.rule}`)
    .join('\n');

  const capsuleText = [
    `# GhostCTO Cross-IDE Capsule (<350 tok)`,
    `PROJ: ${runtime.projectName} | MONOREPO: ${workspace.isMonorepo} | SCORE: ${audit.score}/100`,
    `BOOT: \`${runtime.startCmd}\` | PORTS: ${runtime.ports.join(', ') || 'auto'} | STATIC_BUILD_APPS: ${buildApps}`,
    `DB_FILES: ${workspace.dbFiles.map(d => d.relPath).join(', ') || 'NONE'}`,
    `TABLES(${audit.lineage.schemaTables.length}): ${audit.lineage.schemaTables.slice(0, 14).join(', ') || 'NONE'}`,
    `APIS: fe=${audit.lineage.frontendCallCount}, be=${audit.lineage.backendRouteCount}`,
    `LATEST_CHECKPOINT: ${latestCp}`,
    `ACTIVE_RISKS:`,
    topFindings || '- CLEAN',
    ...(scarLines ? [`IMMUNE_TABOOS:`, scarLines] : [])
  ].join('\n');

  const capsulePath = path.join(vibeDir, 'capsule.md');
  fs.writeFileSync(capsulePath, capsuleText + '\n', 'utf8');

  return {
    capsulePath,
    tokens: estimateTokens(capsuleText),
    runtime
  };
}

export function loadImmuneScars(rootDir) {
  const immunePath = path.join(path.resolve(rootDir), '.vibe', 'immune-rules.json');
  if (!fs.existsSync(immunePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(immunePath, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Record a permanently learned project lesson / scar so no AI ever repeats the same bug.
 */
export function learnScar(rootDir, { symptom, rootCause, rule, pattern = '', fileHint = '' }) {
  const absRoot = path.resolve(rootDir);
  const vibeDir = path.join(absRoot, '.vibe');
  fs.mkdirSync(vibeDir, { recursive: true });
  const immunePath = path.join(vibeDir, 'immune-rules.json');

  const existing = loadImmuneScars(absRoot);
  const entry = {
    id: `S${existing.length + 1}`,
    createdAt: new Date().toISOString(),
    symptom: symptom || '历史线上故障',
    rootCause: rootCause || 'AI 改动引发回归',
    rule: rule || '禁止破坏既有契约',
    pattern,
    fileHint
  };
  existing.unshift(entry);
  fs.writeFileSync(immunePath, JSON.stringify(existing.slice(0, 30), null, 2), 'utf8');
  return entry;
}
