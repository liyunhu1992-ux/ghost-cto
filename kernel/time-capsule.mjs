import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { scanWorkspace } from './scanner.mjs';

const DEFAULT_GITIGNORE_LINES = [
  'node_modules/',
  '.env',
  '.env.*',
  '!.env.example',
  '.DS_Store',
  '*.sqlite',
  '*.sqlite-wal',
  '*.sqlite-shm',
  '*.db',
  '*.db-wal',
  '*.db-shm',
  '.vibe/checkpoints/'
];

function runGit(rootDir, args) {
  return execFileSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

/**
 * Ensure `.git` and safe `.gitignore` exist so complete beginners never lose work
 * or accidentally commit `.env` secrets or raw SQLite WAL files.
 */
export function ensureGitSafetyNet(rootDir) {
  const absRoot = path.resolve(rootDir);
  const gitignorePath = path.join(absRoot, '.gitignore');

  let existingIgnore = '';
  if (fs.existsSync(gitignorePath)) {
    existingIgnore = fs.readFileSync(gitignorePath, 'utf8');
  }
  const missingLines = DEFAULT_GITIGNORE_LINES.filter(line => !existingIgnore.includes(line));
  if (missingLines.length > 0) {
    const prefix = existingIgnore && !existingIgnore.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(
      gitignorePath,
      `${existingIgnore}${prefix}# GhostCTO Safety Rules\n${missingLines.join('\n')}\n`,
      'utf8'
    );
  }

  if (!fs.existsSync(path.join(absRoot, '.git'))) {
    runGit(absRoot, ['init']);
    try {
      runGit(absRoot, ['config', 'user.name']);
    } catch {
      runGit(absRoot, ['config', 'user.name', 'GhostCTO TimeMachine']);
      runGit(absRoot, ['config', 'user.email', 'ghost-cto@local.vibe']);
    }
  } else {
    try {
      runGit(absRoot, ['config', 'user.name']);
    } catch {
      runGit(absRoot, ['config', 'user.name', 'GhostCTO TimeMachine']);
      runGit(absRoot, ['config', 'user.email', 'ghost-cto@local.vibe']);
    }
  }
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Create an atomic Code (Git) + Database (SQLite + WAL gzipped with SHA-256) savepoint.
 */
export function saveCheckpoint(rootDir, label = '手动安全存档', options = {}) {
  const absRoot = path.resolve(rootDir);
  ensureGitSafetyNet(absRoot);

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rand = crypto.randomBytes(2).toString('hex');
  const id = options.customId || `CP-${stamp}-${rand}`;

  const cpDir = path.join(absRoot, '.vibe', 'checkpoints', id);
  fs.mkdirSync(cpDir, { recursive: true });

  // 1. Snapshot all SQLite / DB files (including -wal companion files if active!)
  const ws = scanWorkspace(absRoot);
  const dbSnapshots = [];

  for (const dbItem of ws.dbFiles) {
    const companions = [
      { abs: dbItem.absPath, rel: dbItem.relPath },
      { abs: `${dbItem.absPath}-wal`, rel: `${dbItem.relPath}-wal` }
    ];

    for (const target of companions) {
      if (!fs.existsSync(target.abs)) continue;
      const rawBuf = fs.readFileSync(target.abs);
      const hash = sha256Buffer(rawBuf);
      const gzBuf = zlib.gzipSync(rawBuf, { level: 6 });
      const archiveName = target.rel.replace(/[\\/]/g, '__') + '.gz';
      fs.writeFileSync(path.join(cpDir, archiveName), gzBuf);

      dbSnapshots.push({
        relPath: target.rel,
        archiveName,
        sizeBytes: rawBuf.length,
        compressedBytes: gzBuf.length,
        sha256: hash
      });
    }
  }

  // 2. Commit code working tree into Git cleanly
  runGit(absRoot, ['add', '-A']);
  let statusOut = runGit(absRoot, ['status', '--porcelain']);
  if (statusOut.length > 0) {
    runGit(absRoot, ['commit', '-m', `[GhostCTO ${id}] ${label}`]);
  } else {
    // Ensure at least one initial commit exists
    try {
      runGit(absRoot, ['rev-parse', 'HEAD']);
    } catch {
      runGit(absRoot, ['commit', '--allow-empty', '-m', `[GhostCTO ${id}] ${label}`]);
    }
  }
  const gitCommit = runGit(absRoot, ['rev-parse', 'HEAD']);

  const manifest = {
    id,
    label,
    createdAt: now.toISOString(),
    gitCommit,
    dbSnapshots
  };

  fs.writeFileSync(path.join(cpDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  updateCheckpointIndex(absRoot, manifest);

  return manifest;
}

function updateCheckpointIndex(absRoot, manifest) {
  const indexPath = path.join(absRoot, '.vibe', 'checkpoints', 'index.json');
  let list = [];
  if (fs.existsSync(indexPath)) {
    try {
      list = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch {
      list = [];
    }
  }
  list.unshift({
    id: manifest.id,
    label: manifest.label,
    createdAt: manifest.createdAt,
    gitCommit: manifest.gitCommit.slice(0, 8),
    dbCount: manifest.dbSnapshots.filter(d => !d.relPath.endsWith('-wal')).length
  });
  fs.writeFileSync(indexPath, JSON.stringify(list.slice(0, 50), null, 2), 'utf8');
}

export function listCheckpoints(rootDir) {
  const indexPath = path.join(path.resolve(rootDir), '.vibe', 'checkpoints', 'index.json');
  if (!fs.existsSync(indexPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {
    return [];
  }
}

/**
 * Atomically rewind BOTH Code (Git) and SQLite Database files to a checkpoint.
 * Automatically saves a pre-rewind emergency backup first so nothing is ever permanently lost!
 */
export function rewindCheckpoint(rootDir, targetId = 'latest') {
  const absRoot = path.resolve(rootDir);
  const all = listCheckpoints(absRoot);
  if (all.length === 0) {
    throw new Error('当前项目还没有任何时光机存档点，请先运行 ghost-cto save 创建存档。');
  }

  const chosenMeta = targetId === 'latest' ? all[0] : all.find(item => item.id === targetId || item.id.startsWith(targetId));
  if (!chosenMeta) {
    throw new Error(`未找到编号为「${targetId}」的存档点。可用存档：${all.slice(0, 5).map(x => x.id).join(', ')}`);
  }

  const cpDir = path.join(absRoot, '.vibe', 'checkpoints', chosenMeta.id);
  const manifestPath = path.join(cpDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`存档点 ${chosenMeta.id} 的清单文件已损坏或缺失。`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Step 1: Save automatic emergency backup BEFORE rewinding (unless already rewinding to an auto-rescue)
  let rescueCheckpoint = null;
  if (!manifest.label.startsWith('自动急救备份_')) {
    rescueCheckpoint = saveCheckpoint(absRoot, `自动急救备份_回退至_${chosenMeta.id}_前`);
  }

  // Step 2: Restore Git tracked files & clean untracked code files (protecting .vibe/ and ignored files)
  runGit(absRoot, ['checkout', manifest.gitCommit, '--', '.']);
  // Commit restored tree on HEAD so branch stays linear & beginner never enters detached HEAD!
  runGit(absRoot, ['add', '-A']);
  const postCheckoutStatus = runGit(absRoot, ['status', '--porcelain']);
  if (postCheckoutStatus.length > 0) {
    runGit(absRoot, ['commit', '-m', `[GhostCTO Rewind -> ${manifest.id}] 恢复至「${manifest.label}」`]);
  }

  // Step 3: Atomically restore SQLite & WAL files with SHA-256 verification
  const restoredDbs = [];
  // First clear any current WAL/SHM files for snapped DBs so stale frames cannot corrupt restored DB
  for (const snap of manifest.dbSnapshots) {
    if (!snap.relPath.endsWith('-wal')) {
      const baseAbs = path.join(absRoot, snap.relPath);
      for (const suffix of ['-wal', '-shm']) {
        if (fs.existsSync(baseAbs + suffix)) {
          fs.rmSync(baseAbs + suffix, { force: true });
        }
      }
    }
  }

  for (const snap of manifest.dbSnapshots) {
    const archivePath = path.join(cpDir, snap.archiveName);
    const gzBuf = fs.readFileSync(archivePath);
    const rawBuf = zlib.gunzipSync(gzBuf);
    const actualHash = sha256Buffer(rawBuf);
    if (actualHash !== snap.sha256) {
      throw new Error(`数据库快照校验失败 (${snap.relPath})，已中止覆盖以保护数据安全！`);
    }
    const destAbs = path.join(absRoot, snap.relPath);
    fs.mkdirSync(path.dirname(destAbs), { recursive: true });
    fs.writeFileSync(destAbs, rawBuf);
    if (!snap.relPath.endsWith('-wal')) {
      restoredDbs.push(snap.relPath);
    }
  }

  return {
    restoredId: manifest.id,
    restoredLabel: manifest.label,
    restoredAt: new Date().toISOString(),
    restoredDbs,
    rescueId: rescueCheckpoint ? rescueCheckpoint.id : null
  };
}
