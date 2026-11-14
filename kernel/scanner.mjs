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

export const IGNORED_FILES = new Set([
  '项目真假与安全体检报告.html',
  '老板全景驾驶舱.html',
  '双击启动项目.command',
  '双击启动项目.bat',
  '打开实时驾驶舱.command',
  '打开实时驾驶舱.bat',
  '1-双击新建我的空白项目.command',
  '1-双击新建我的空白项目.bat',
  '2-双击接入已有老项目.command',
  '2-双击接入已有老项目.bat',
  '双击安装到我的项目.command',
  '双击安装到我的项目.bat'
]);

const CODE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx', '.vue', '.svelte', '.html', '.py'
]);

const SQL_EXTENSIONS = new Set(['.sql', '.prisma']);

/**
 * Walk a repository safely inside the sandbox, classifying source files
 * (JS/TS/JSX/Vue/HTML/Python), database files, manifests, and static build outputs.
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
      if (IGNORED_FILES.has(entry.name)) continue;

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
        if (stat.size > 1_500_000) continue;
        // Skip compiled `public/index.html` if `build-ui.mjs` exists so we scan the real `src/*-render.mjs` sources instead of duplicating findings!
        if (relPath === 'public/index.html' && fs.existsSync(path.join(absRoot, 'build-ui.mjs'))) {
          continue;
        }
        codeFiles.push({
          absPath: fullPath,
          relPath,
          ext,
          mtimeMs: stat.mtimeMs,
          sizeBytes: stat.size,
          role: classifyFileRole(relPath, ext)
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

function classifyFileRole(relPath, ext) {
  const lower = relPath.toLowerCase();
  const base = path.basename(lower);
  if (/(^|\/)(test|tests|__tests__|spec|sim)\//.test(lower) || /\.(test|spec)\.[a-z]+$/.test(lower)) {
    return 'test';
  }
  if (/(^|\/)scripts\//.test(lower) && /verify|seed|test|bench/.test(lower)) {
    return 'test';
  }
  if (/\.(?:config|conf)\.[mc]?[jt]sx?$/.test(base) || /^build[-_].*\.[mc]?[jt]s$/.test(base) || /\.d\.ts$/.test(base)) {
    return 'config';
  }
  if (ext === '.py') {
    if (/(models|database|db|schema)\.py$/.test(lower)) return 'database';
    return 'backend';
  }
  // Next.js App Router (`app/api/.../route.ts`), Pages Router (`pages/api/...`), & Nuxt `server/api/...` MUST be backend!
  if (/(^|\/)(?:app\/api|pages\/api|server\/api|apps\/api|backend|routes|controllers|engines)\//.test(lower) || /\/route\.[mc]?[jt]sx?$/.test(lower)) {
    return 'backend';
  }
  if (/(^|\/)(db|database|prisma|drizzle|models|schema)\//.test(lower)) {
    return 'database';
  }
  if (ext === '.html' || /\.(jsx|tsx|vue|svelte)$/.test(lower)) {
    return 'frontend';
  }
  if (/(^|\/)(apps\/web|apps\/admin|client|frontend|web|pages|components|views|ui|public)\//.test(lower)) {
    return 'frontend';
  }
  if (/(render|view|studio|widget|canvas|styles)\.[mc]?[jt]s$/.test(lower)) {
    return 'frontend';
  }
  if (/(^|\/)(server|api)\//.test(lower) || /server\.[a-z]+$/.test(lower)) {
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
 * Detect apps where static `dist/`, `build/`, or `build-ui.mjs -> public/index.html` bundles exist,
 * comparing newest `src/` file modification time against compiled HTML modification time.
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
        buildCmd: relAppDir === '.' ? 'npm run build' : `npm --prefix "${relAppDir}" run build`,
        distRelPath: path.relative(absRoot, distPath).replace(/\\/g, '/'),
        distMtimeMs: distStat.mtimeMs,
        newestSrcFile: newestSrc.relPath,
        newestSrcMtimeMs: newestSrc.mtimeMs,
        isStale: deltaMs > 1500,
        lagSeconds: Math.max(0, Math.round(deltaMs / 1000))
      });
    }
  }

  // Custom `build-ui.mjs` -> `public/index.html` static generator pattern
  const customBuilder = path.join(absRoot, 'build-ui.mjs');
  const publicHtml = path.join(absRoot, 'public', 'index.html');
  if (fs.existsSync(customBuilder) && fs.existsSync(publicHtml)) {
    const htmlStat = fs.statSync(publicHtml);
    const matchingSrc = codeFiles.filter(f => f.relPath.startsWith('src/') || f.relPath === 'build-ui.mjs');
    if (matchingSrc.length > 0) {
      let newestSrc = matchingSrc[0];
      for (const f of matchingSrc) {
        if (f.mtimeMs > newestSrc.mtimeMs) newestSrc = f;
      }
      const deltaMs = newestSrc.mtimeMs - htmlStat.mtimeMs;
      results.push({
        appDir: '.',
        buildCmd: 'node build-ui.mjs',
        distRelPath: 'public/index.html',
        distMtimeMs: htmlStat.mtimeMs,
        newestSrcFile: newestSrc.relPath,
        newestSrcMtimeMs: newestSrc.mtimeMs,
        isStale: deltaMs > 1500,
        lagSeconds: Math.max(0, Math.round(deltaMs / 1000))
      });
    }
  }

  return results;
}
