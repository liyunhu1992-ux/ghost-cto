import fs from 'node:fs';
import path from 'node:path';

export const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  '.vibe',
  '.agents',
  '.agent',
  '.claude',
  '.cursor',
  '.workbuddy',
  '.codebuddy',
  '.trae',
  '.windsurf',
  'dist',
  'build',
  'out',
  'coverage',
  '__pycache__',
  '.venv',
  'venv'
]);

const CODE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx', '.vue', '.svelte'
]);

const SQL_EXTENSIONS = new Set(['.sql', '.prisma']);

/**
 * Walk a repository safely inside the sandbox, classifying source files,
 * database files, package manifests, and static build directories.
 */
export function scanWorkspace(rootDir) {
  const absRoot = path.resolve(rootDir);
  const codeFiles = [];
  const sqlFiles = [];
  const dbFiles = [];
  const packageJsons = [];
  const envFiles = [];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(absRoot, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      if (entry.name === 'package.json') {
        packageJsons.push({ absPath: fullPath, relPath });
        continue;
      }

      if (entry.name === '.env' || (entry.name.startsWith('.env.') && entry.name !== '.env.example')) {
        envFiles.push({ absPath: fullPath, relPath });
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.sqlite' || ext === '.db' || ext === '.sqlite3') {
        dbFiles.push({ absPath: fullPath, relPath });
        continue;
      }

      if (CODE_EXTENSIONS.has(ext)) {
        const stat = fs.statSync(fullPath);
        if (stat.size > 1_500_000) continue; // skip minified bundles > 1.5MB
        codeFiles.push({
          absPath: fullPath,
          relPath,
          ext,
          mtimeMs: stat.mtimeMs,
          sizeBytes: stat.size,
          role: classifyFileRole(relPath)
        });
      } else if (SQL_EXTENSIONS.has(ext)) {
        sqlFiles.push({ absPath: fullPath, relPath, ext });
      }
    }
  }

  walk(absRoot);

  const packagesMap = buildWorkspacePackageMap(absRoot, packageJsons);
  const staleBuilds = detectStaticBuilds(absRoot, packageJsons, codeFiles);

  return {
    rootDir: absRoot,
    hasGit: fs.existsSync(path.join(absRoot, '.git')),
    hasGitignore: fs.existsSync(path.join(absRoot, '.gitignore')),
    isMonorepo: fs.existsSync(path.join(absRoot, 'pnpm-workspace.yaml')) || packageJsons.length > 1,
    codeFiles,
    sqlFiles,
    dbFiles,
    envFiles,
    packageJsons,
    packagesMap,
    staleBuilds
  };
}

function classifyFileRole(relPath) {
  const lower = relPath.toLowerCase();
  if (/(^|\/)(test|tests|__tests__|spec|sim)\//.test(lower) || /\.(test|spec)\.[a-z]+$/.test(lower)) {
    return 'test';
  }
  if (/(^|\/)scripts\//.test(lower) && /verify|seed|test|bench/.test(lower)) {
    return 'test';
  }
  if (/\.(jsx|tsx|vue|svelte)$/.test(lower)) {
    return 'frontend';
  }
  if (/(^|\/)(apps\/web|apps\/admin|client|frontend|web|pages|components|views|ui)\//.test(lower)) {
    return 'frontend';
  }
  if (/(^|\/)(db|database|prisma|drizzle|models|schema)\//.test(lower)) {
    return 'database';
  }
  if (/(^|\/)(apps\/api|server|backend|api|routes|controllers|engines)/.test(lower) || /server\.[a-z]+$/.test(lower)) {
    return 'backend';
  }
  return 'shared';
}

function buildWorkspacePackageMap(absRoot, packageJsons) {
  const map = new Map();
  for (const pkg of packageJsons) {
    try {
      const parsed = JSON.parse(fs.readFileSync(pkg.absPath, 'utf8'));
      const pkgDir = path.dirname(pkg.absPath);
      if (parsed.name) {
        const mainRel = parsed.main || parsed.module || 'src/index.mjs';
        const entryCandidate = path.resolve(pkgDir, mainRel);
        map.set(parsed.name, {
          name: parsed.name,
          dir: pkgDir,
          relDir: path.relative(absRoot, pkgDir).replace(/\\/g, '/') || '.',
          scripts: parsed.scripts || {},
          entryAbsPath: fs.existsSync(entryCandidate) ? entryCandidate : null
        });
      }
    } catch {
      // ignore malformed package.json
    }
  }
  return map;
}

/**
 * Detect apps where static `dist/` or `build/` directories exist, and compare
 * newest `src/` file modification time against `dist/` modification time.
 */
function detectStaticBuilds(absRoot, packageJsons, codeFiles) {
  const results = [];
  for (const pkg of packageJsons) {
    const appDir = path.dirname(pkg.absPath);
    const relAppDir = path.relative(absRoot, appDir).replace(/\\/g, '/') || '.';
    for (const outFolder of ['dist', 'build']) {
      const distPath = path.join(appDir, outFolder);
      const indexHtml = path.join(distPath, 'index.html');
      if (!fs.existsSync(distPath) || !fs.existsSync(indexHtml)) continue;

      const distStat = fs.statSync(indexHtml);
      const prefix = relAppDir === '.' ? 'src/' : `${relAppDir}/src/`;
      const matchingSrc = codeFiles.filter(f => f.relPath.startsWith(prefix));
      if (matchingSrc.length === 0) continue;

      let newestSrc = matchingSrc[0];
      for (const f of matchingSrc) {
        if (f.mtimeMs > newestSrc.mtimeMs) newestSrc = f;
      }

      const deltaMs = newestSrc.mtimeMs - distStat.mtimeMs;
      results.push({
        appDir: relAppDir,
        distRelPath: path.relative(absRoot, distPath).replace(/\\/g, '/'),
        distMtimeMs: distStat.mtimeMs,
        newestSrcFile: newestSrc.relPath,
        newestSrcMtimeMs: newestSrc.mtimeMs,
        isStale: deltaMs > 1500,
        lagSeconds: Math.max(0, Math.round(deltaMs / 1000))
      });
    }
  }
  return results;
}
