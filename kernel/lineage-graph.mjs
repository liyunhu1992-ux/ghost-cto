import fs from 'node:fs';
import path from 'node:path';
import { analyzeSource, findMatchingBrace, indexToLine } from './lexer.mjs';

/**
 * Normalize dynamic API paths so frontend `/api/users/${id}` matches
 * backend `/api/users/:id`, `/api/users/[id]`, or prefix `/api/users/`.
 */
export function normalizeApiPath(rawPath) {
  if (!rawPath) return '';
  let clean = rawPath.trim().split('?')[0].split('#')[0];
  clean = clean.replace(/\$\{[^}]*\}/g, ':param');
  clean = clean.replace(/\[([^\]]+)\]/g, ':param');
  clean = clean.replace(/:[a-zA-Z0-9_]+/g, ':param');
  if (clean.length > 1 && clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

/**
 * Extract exported functions and module-level mutable state from a source file
 * so backend routes can trace inter-procedural calls up to N hops across files & monorepo packages.
 */
function buildModuleSymbolIndex(workspace) {
  const fileDataMap = new Map(); // absPath -> parsed metadata

  for (const file of workspace.codeFiles) {
    if (file.role === 'test') continue;
    let raw;
    try {
      raw = fs.readFileSync(file.absPath, 'utf8');
    } catch {
      continue;
    }
    const lex = analyzeSource(raw, file.ext);
    const { imports, reExports } = extractImportsAndReExports(lex.cleanCode, file.absPath, workspace.packagesMap);
    const functions = extractFunctions(raw, lex);
    const mutableGlobals = extractMutableGlobals(lex);

    fileDataMap.set(file.absPath, {
      file,
      raw,
      lex,
      imports,
      reExports,
      functions,
      mutableGlobals,
      isReachable: true
    });
  }

  markReachability(fileDataMap, workspace);
  return fileDataMap;
}

/**
 * Compute module reachability from entrypoints so unmounted leftover UI files
 * ("zombie components") are flagged instead of generating false-positive broken routes.
 */
function markReachability(fileDataMap, workspace) {
  // Group frontend files by app prefix (e.g., apps/web/src, apps/admin/src, src)
  const entryAbsPaths = new Set();
  const appDirsWithEntry = new Set();

  for (const [absPath, modData] of fileDataMap.entries()) {
    const rel = modData.file.relPath;
    const base = path.basename(rel);
    if (modData.file.role !== 'frontend') {
      entryAbsPaths.add(absPath);
      continue;
    }
    // Standard frontend roots: main.*, index.*, App.* (.jsx/.tsx/.vue/.svelte), *.html, Next.js/Nuxt/SvelteKit pages/ or app/
    if (
      modData.file.ext === '.html' ||
      /^(?:main|index|App)\.(?:[mc]?[jt]sx?|vue|svelte)$/i.test(base) ||
      /^\+(?:page|layout)\.svelte$/i.test(base) ||
      /(?:^|\/)(?:pages|app)\//.test(rel)
    ) {
      entryAbsPaths.add(absPath);
      appDirsWithEntry.add(path.dirname(absPath));
    }
  }

  for (const pkg of workspace.packagesMap.values()) {
    if (pkg.entryAbsPath && fileDataMap.has(pkg.entryAbsPath)) {
      entryAbsPaths.add(pkg.entryAbsPath);
    }
  }

  const visited = new Set();
  const queue = [...entryAbsPaths];
  while (queue.length > 0) {
    const curr = queue.pop();
    if (visited.has(curr)) continue;
    visited.add(curr);
    const mod = fileDataMap.get(curr);
    if (!mod) continue;
    for (const imp of mod.imports.values()) {
      if (!visited.has(imp.targetAbsPath)) queue.push(imp.targetAbsPath);
    }
    for (const re of mod.reExports) {
      if (!visited.has(re.targetAbsPath)) queue.push(re.targetAbsPath);
    }
  }

  for (const [absPath, modData] of fileDataMap.entries()) {
    if (modData.file.role === 'frontend' && modData.file.ext !== '.html') {
      const dir = path.dirname(absPath);
      const hasSiblingEntry = [...appDirsWithEntry].some(
        entryDir => dir === entryDir || dir.startsWith(entryDir + path.sep)
      );
      if (hasSiblingEntry && !visited.has(absPath)) {
        modData.isReachable = false;
      }
    }
  }
}

/**
 * Resolve ES module imports, dynamic `import()`, CJS `require()`, AND barrel re-exports.
 */
export function extractImportsAndReExports(cleanCode, fromAbsPath, packagesMap) {
  const resolved = new Map(); // importedSymbol -> { targetAbsPath, exportedName }
  const reExports = []; // Array<{ targetAbsPath, star: boolean, map: Map<exportedAlias, origName> }>
  const fromDir = path.dirname(fromAbsPath);

  // Named + default + namespace imports: import { a, b as c } from 'spec' / import d from 'spec' / import * as ns from 'spec'
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRegex.exec(cleanCode)) !== null) {
    const clause = m[1].trim();
    const spec = m[2].trim();
    const targetAbs = resolveModuleSpecifier(spec, fromDir, packagesMap);
    if (!targetAbs) continue;

    const nsMatch = clause.match(/\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
    if (nsMatch) {
      resolved.set(nsMatch[1], { targetAbsPath: targetAbs, exportedName: '*' });
    }

    const namedMatch = clause.match(/\{([\s\S]*?)\}/);
    if (namedMatch) {
      const parts = namedMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        const [orig, alias] = p.split(/\s+as\s+/).map(x => x.trim());
        if (orig) {
          resolved.set(alias || orig, { targetAbsPath: targetAbs, exportedName: orig });
        }
      }
    }
    const defaultPart = clause.replace(/\{[\s\S]*?\}/, '').replace(/\*\s+as\s+[A-Za-z0-9_$]+/, '').replace(/,/g, '').trim();
    if (defaultPart && !defaultPart.startsWith('*')) {
      resolved.set(defaultPart, { targetAbsPath: targetAbs, exportedName: 'default' });
    }
  }

  // Dynamic lazy import('...') & CommonJS require('...')
  const dynImportRe = /\b(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dynImportRe.exec(cleanCode)) !== null) {
    const targetAbs = resolveModuleSpecifier(m[1].trim(), fromDir, packagesMap);
    if (targetAbs) {
      resolved.set(`__dyn_${targetAbs}`, { targetAbsPath: targetAbs, exportedName: '*' });
    }
  }

  // Barrel star re-export: export * from './operations.mjs'
  const starExportRe = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = starExportRe.exec(cleanCode)) !== null) {
    const targetAbs = resolveModuleSpecifier(m[1].trim(), fromDir, packagesMap);
    if (targetAbs) {
      reExports.push({ targetAbsPath: targetAbs, star: true, map: null });
    }
  }

  // Named re-export: export { a, b as c } from './operations.mjs'
  const namedExportRe = /export\s+\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = namedExportRe.exec(cleanCode)) !== null) {
    const targetAbs = resolveModuleSpecifier(m[2].trim(), fromDir, packagesMap);
    if (!targetAbs) continue;
    const map = new Map();
    const parts = m[1].split(',').map(s => s.trim()).filter(Boolean);
    for (const p of parts) {
      const [orig, alias] = p.split(/\s+as\s+/).map(x => x.trim());
      if (orig) map.set(alias || orig, orig);
    }
    reExports.push({ targetAbsPath: targetAbs, star: false, map });
  }

  // Side-effect import: import './apps/api/src/server.mjs'
  const sideEffectRegex = /import\s+['"]([^'"]+)['"]/g;
  while ((m = sideEffectRegex.exec(cleanCode)) !== null) {
    const targetAbs = resolveModuleSpecifier(m[1].trim(), fromDir, packagesMap);
    if (targetAbs) {
      resolved.set(`__side_effect_${targetAbs}`, { targetAbsPath: targetAbs, exportedName: '*' });
    }
  }

  return { imports: resolved, reExports };
}

export function resolveModuleSpecifier(spec, fromDir, packagesMap) {
  if (!spec) return null;

  // 0. Next.js / Vite / Nuxt path aliases (`@/components/...` or `~/lib/...`)
  if (spec.startsWith('@/') || spec.startsWith('~/')) {
    const sub = spec.slice(2);
    let cursor = fromDir;
    for (let depth = 0; depth < 7; depth++) {
      if (
        fs.existsSync(path.join(cursor, 'package.json')) ||
        fs.existsSync(path.join(cursor, 'tsconfig.json')) ||
        fs.existsSync(path.join(cursor, 'jsconfig.json'))
      ) {
        const inSrc = probeFileCandidates(path.join(cursor, 'src', sub));
        if (inSrc) return inSrc;
        const inRoot = probeFileCandidates(path.join(cursor, sub));
        if (inRoot) return inRoot;
      }
      const parent = path.dirname(cursor);
      if (parent === cursor) break;
      cursor = parent;
    }
    return null;
  }

  // 1. Workspace package import (e.g. @mengine/db)
  if (!spec.startsWith('.') && !spec.startsWith('/')) {
    if (packagesMap.has(spec)) {
      return packagesMap.get(spec).entryAbsPath;
    }
    // Subpath package import: @scope/pkg/sub
    for (const [pkgName, pkgInfo] of packagesMap.entries()) {
      if (spec.startsWith(`${pkgName}/`)) {
        const sub = spec.slice(pkgName.length + 1);
        return probeFileCandidates(path.join(pkgInfo.dir, sub));
      }
    }
    return null;
  }

  // 2. Relative import
  const baseCandidate = path.resolve(fromDir, spec);
  return probeFileCandidates(baseCandidate);
}

function probeFileCandidates(basePath) {
  const exts = [
    '',
    '.mjs',
    '.js',
    '.ts',
    '.tsx',
    '.jsx',
    '.vue',
    '.svelte',
    '.cjs',
    '/index.mjs',
    '/index.js',
    '/index.ts',
    '/index.tsx',
    '/index.vue'
  ];
  for (const ext of exts) {
    const full = basePath + ext;
    try {
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        return full;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * Extract named functions (`function foo(...) {}`, `export async function foo(...) {}`,
 * `const foo = (...) => {}`) with their clean body text for call-graph inspection.
 */
function extractFunctions(raw, lex) {
  const fnMap = new Map();
  const { skeleton, cleanCode, lineOffsets } = lex;

  // Declaration style: [export] [async] function name(...) {
  const declRe = /(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = declRe.exec(skeleton)) !== null) {
    const name = m[1];
    const openBrace = m.index + m[0].length - 1;
    const closeBrace = findMatchingBrace(skeleton, openBrace);
    if (closeBrace > openBrace) {
      fnMap.set(name, {
        name,
        line: indexToLine(lineOffsets, m.index),
        cleanBody: cleanCode.slice(openBrace, closeBrace + 1),
        skeletonBody: skeleton.slice(openBrace, closeBrace + 1)
      });
    }
  }

  // Arrow / const function expression: [export] const name = [async] (...) => {
  const arrowRe = /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*=>\s*\{/g;
  while ((m = arrowRe.exec(skeleton)) !== null) {
    const name = m[1];
    if (fnMap.has(name)) continue;
    const openBrace = m.index + m[0].length - 1;
    const closeBrace = findMatchingBrace(skeleton, openBrace);
    if (closeBrace > openBrace) {
      fnMap.set(name, {
        name,
        line: indexToLine(lineOffsets, m.index),
        cleanBody: cleanCode.slice(openBrace, closeBrace + 1),
        skeletonBody: skeleton.slice(openBrace, closeBrace + 1)
      });
    }
  }

  return fnMap;
}

/**
 * Detect module-level in-memory arrays / Maps / Sets that act as fake volatile databases.
 */
function extractMutableGlobals(lex) {
  const globals = [];
  const { skeleton, cleanCode, lineOffsets } = lex;

  // Match top-level (brace depth 0) array or Map/Set declarations
  let depth = 0;
  const lines = skeleton.split('\n');
  const cleanLines = cleanCode.split('\n');
  let charOffset = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const sLine = lines[idx];
    const cLine = cleanLines[idx];
    if (depth === 0) {
      const arrMatch = cLine.match(/^\s*(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(\[|\s*new\s+(?:Map|Set)\s*\()/);
      if (arrMatch) {
        const varName = arrMatch[1];
        // Ignore pure uppercase constants like MODULE_CATEGORIES / BASE_PLANS / MIME
        if (!/^[A-Z0-9_]+$/.test(varName)) {
          globals.push({
            name: varName,
            line: indexToLine(lineOffsets, charOffset)
          });
        }
      }
    }
    for (let j = 0; j < sLine.length; j++) {
      if (sLine[j] === '{') depth++;
      else if (sLine[j] === '}') depth = Math.max(0, depth - 1);
    }
    charOffset += sLine.length + 1;
  }

  return globals;
}

/**
 * Extract SQL tables & persistence effects from a clean code snippet.
 */
function inspectEffects(cleanSnippet, mutableGlobalNames) {
  const dbWrites = new Set();
  const dbReads = new Set();
  const memoryMutations = new Set();

  // SQL INSERT / UPDATE / DELETE / REPLACE
  let m;
  const insertRe = /\bINSERT\s+(?:OR\s+\w+\s+)?INTO\s+[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?/gi;
  while ((m = insertRe.exec(cleanSnippet)) !== null) dbWrites.add(m[1]);

  const updateRe = /\bUPDATE\s+[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?\s+SET\b/gi;
  while ((m = updateRe.exec(cleanSnippet)) !== null) dbWrites.add(m[1]);

  const deleteRe = /\bDELETE\s+FROM\s+[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?/gi;
  while ((m = deleteRe.exec(cleanSnippet)) !== null) dbWrites.add(m[1]);

  // SQL SELECT
  const selectRe = /\bSELECT\b[\s\S]{1,220}?\bFROM\s+[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?/gi;
  while ((m = selectRe.exec(cleanSnippet)) !== null) dbReads.add(m[1]);

  // Prisma / ORM patterns: prisma.user.create / update / upsert / delete
  const prismaWriteRe = /\b(?:prisma|db)\.([a-zA-Z0-9_]+)\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/g;
  while ((m = prismaWriteRe.exec(cleanSnippet)) !== null) {
    if (m[1] !== 'prepare') dbWrites.add(m[1]);
  }
  const prismaReadRe = /\b(?:prisma|db)\.([a-zA-Z0-9_]+)\.(?:findUnique|findFirst|findMany|count)\s*\(/g;
  while ((m = prismaReadRe.exec(cleanSnippet)) !== null) {
    if (m[1] !== 'prepare') dbReads.add(m[1]);
  }

  // Supabase JS Client: supabase.from('orders').insert / update / upsert / delete / select
  const supaRe = /\.from\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)\s*\.\s*(insert|update|upsert|delete|select)\s*\(/g;
  while ((m = supaRe.exec(cleanSnippet)) !== null) {
    if (m[2] === 'select') dbReads.add(m[1]);
    else dbWrites.add(m[1]);
  }

  // Drizzle ORM: db.insert(orders) / db.update(orders) / db.delete(orders) / db.select().from(orders)
  const drizzleWriteRe = /\bdb\.(?:insert|update|delete)\s*\(\s*([a-zA-Z0-9_]+)\s*\)/g;
  while ((m = drizzleWriteRe.exec(cleanSnippet)) !== null) dbWrites.add(m[1]);
  const drizzleReadRe = /\bdb\.select\s*\([^)]*\)\s*\.from\s*\(\s*([a-zA-Z0-9_]+)\s*\)/g;
  while ((m = drizzleReadRe.exec(cleanSnippet)) !== null) dbReads.add(m[1]);

  // Mongoose / Sequelize Models: OrderModel.create / findOneAndUpdate / deleteOne / findById
  const mongooseWriteRe = /\b([A-Z][A-Za-z0-9_]*)\.(?:create|insertMany|findOneAndUpdate|findByIdAndUpdate|updateOne|updateMany|deleteOne|deleteMany|findByIdAndDelete)\s*\(/g;
  while ((m = mongooseWriteRe.exec(cleanSnippet)) !== null) {
    if (!['Object', 'Promise', 'Array', 'JSON', 'Math'].includes(m[1])) dbWrites.add(m[1]);
  }
  const mongooseReadRe = /\b([A-Z][A-Za-z0-9_]*)\.(?:find|findOne|findById|countDocuments)\s*\(/g;
  while ((m = mongooseReadRe.exec(cleanSnippet)) !== null) {
    if (!['Object', 'Promise', 'Array', 'JSON', 'Math'].includes(m[1])) dbReads.add(m[1]);
  }

  // Python SQLAlchemy / Django ORM: session.add(...) / Model.objects.create(...) / session.query(Model)
  if (/\b(?:session|db\.session)\.(?:add|add_all|delete|commit)\s*\(/.test(cleanSnippet)) {
    dbWrites.add('sqlalchemy_orm');
  }
  const djangoWriteRe = /\b([A-Z][A-Za-z0-9_]*)\.objects\.(?:create|bulk_create|update_or_create|update|delete)\s*\(/g;
  while ((m = djangoWriteRe.exec(cleanSnippet)) !== null) dbWrites.add(m[1]);
  const pyReadRe = /\b(?:([A-Z][A-Za-z0-9_]*)\.objects\.(?:filter|get|all)|(?:session|db\.session)\.query\s*\(\s*([A-Z][A-Za-z0-9_]*))/g;
  while ((m = pyReadRe.exec(cleanSnippet)) !== null) dbReads.add(m[1] || m[2] || 'orm_query');

  // Volatile in-memory mutations on module-scope variables
  for (const gName of mutableGlobalNames) {
    const mutRe = new RegExp(`\\b${gName}\\.(?:push|unshift|splice|pop|shift|set|add|delete|clear)\\s*\\(`, 'g');
    const reassignRe = new RegExp(`\\b${gName}\\s*=\\s*`, 'g');
    if (mutRe.test(cleanSnippet) || reassignRe.test(cleanSnippet)) {
      memoryMutations.add(gName);
    }
  }

  // Outbound real LLM / External HTTP API detection
  const hasOutboundLlm =
    /\/chat\/completions\b|\/v1\/messages\b|\/v1\/responses\b|generativelanguage\.googleapis|dashscope\.aliyuncs|ark\.cn-beijing\.volces|OpenAI\s*\(|Anthropic\s*\(/.test(cleanSnippet);

  const hasLocalFallback = /fallbackBuilder|local_smart|mockResponse|demoTemplate/.test(cleanSnippet);

  return {
    dbWrites: [...dbWrites],
    dbReads: [...dbReads],
    memoryMutations: [...memoryMutations],
    hasOutboundLlm,
    hasLocalFallback
  };
}

/**
 * Trace up to `maxHops` function calls from a route handler snippet across local & imported modules.
 */
function traceTransitiveEffects(snippet, absPath, fileDataMap, maxHops = 3) {
  const agg = {
    dbWrites: new Set(),
    dbReads: new Set(),
    memoryMutations: new Set(),
    hasOutboundLlm: false,
    hasLocalFallback: false,
    visitedFns: []
  };

  const visited = new Set();

  function walkSnippet(codeText, currentAbsPath, hop) {
    const modData = fileDataMap.get(currentAbsPath);
    const globalNames = modData ? modData.mutableGlobals.map(g => g.name) : [];
    const direct = inspectEffects(codeText, globalNames);

    direct.dbWrites.forEach(t => agg.dbWrites.add(t));
    direct.dbReads.forEach(t => agg.dbReads.add(t));
    direct.memoryMutations.forEach(v => agg.memoryMutations.add(`${ path.basename(currentAbsPath) }:${v}`));
    if (direct.hasOutboundLlm) agg.hasOutboundLlm = true;
    if (direct.hasLocalFallback) agg.hasLocalFallback = true;

    if (hop >= maxHops || !modData) return;

    // Find all identifier calls `fnName(` inside codeText
    const callRe = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
    let m;
    while ((m = callRe.exec(codeText)) !== null) {
      const callee = m[1];
      if (['if', 'for', 'while', 'switch', 'catch', 'return', 'fetch', 'sendJson', 'readJson', 'Number', 'String', 'Boolean', 'Promise', 'JSON'].includes(callee)) {
        continue;
      }

      // 1. Local function in the same file
      if (modData.functions.has(callee)) {
        const key = `${currentAbsPath}#${callee}`;
        if (!visited.has(key)) {
          visited.add(key);
          agg.visitedFns.push(callee);
          walkSnippet(modData.functions.get(callee).cleanBody, currentAbsPath, hop + 1);
        }
      }

      // 2. Imported function from another file or monorepo package (including barrel re-exports!)
      if (modData.imports.has(callee)) {
        const imp = modData.imports.get(callee);
        const resolvedFn = resolveExportedFunction(imp.targetAbsPath, imp.exportedName, fileDataMap);
        if (resolvedFn) {
          const key = `${resolvedFn.absPath}#${resolvedFn.fnObj.name}`;
          if (!visited.has(key)) {
            visited.add(key);
            agg.visitedFns.push(`${callee}`);
            walkSnippet(resolvedFn.fnObj.cleanBody, resolvedFn.absPath, hop + 1);
          }
        }
      }
    }
  }

  walkSnippet(snippet, absPath, 0);

  return {
    dbWrites: [...agg.dbWrites],
    dbReads: [...agg.dbReads],
    memoryMutations: [...agg.memoryMutations],
    hasOutboundLlm: agg.hasOutboundLlm,
    hasLocalFallback: agg.hasLocalFallback,
    tracedHelpers: agg.visitedFns.slice(0, 8)
  };
}

/**
 * Resolve an exported function across direct definitions AND barrel `export *` / `export { x } from` chains.
 */
function resolveExportedFunction(targetAbsPath, exportedName, fileDataMap, seen = new Set()) {
  const visitKey = `${targetAbsPath}::${exportedName}`;
  if (seen.has(visitKey)) return null;
  seen.add(visitKey);

  const mod = fileDataMap.get(targetAbsPath);
  if (!mod) return null;

  if (mod.functions.has(exportedName)) {
    return { absPath: targetAbsPath, fnObj: mod.functions.get(exportedName) };
  }

  for (const re of mod.reExports) {
    if (re.star) {
      const hit = resolveExportedFunction(re.targetAbsPath, exportedName, fileDataMap, seen);
      if (hit) return hit;
    } else if (re.map && re.map.has(exportedName)) {
      const orig = re.map.get(exportedName);
      const hit = resolveExportedFunction(re.targetAbsPath, orig, fileDataMap, seen);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Extract Frontend outbound `/api/...` calls across reachable JSX/TSX/JS/Vue/Svelte files,
 * using parenthesis-balanced call scoping so arguments never bleed across functions.
 */
function extractFrontendCalls(fileDataMap) {
  const calls = [];

  for (const [, modData] of fileDataMap.entries()) {
    const { file, lex, isReachable } = modData;
    if (file.role !== 'frontend' || !isReachable) continue;

    // Inspect extracted string & template literals containing `/api/` (supporting full URLs in wx.request / uni.request too)
    for (const str of lex.strings) {
      const rawTrim = str.value.trim();
      const apiIdx = rawTrim.indexOf('/api/');
      if (apiIdx === -1) continue;
      // Only accept either direct `/api/...` or `http(s)://.../api/...` or `${...}/api/...`
      if (apiIdx > 0 && !/^(?:https?:\/\/[^/]+|\$\{expr\})$/.test(rawTrim.slice(0, apiIdx))) continue;
      const val = rawTrim.slice(apiIdx);

      const ctxBefore = lex.cleanCode.slice(Math.max(0, str.start - 110), str.start);

      // Verify it's part of a network call (fetch, axios, useFetch, useSWR, or WeChat/Uni/Taro `wx.request({ url: '...' })`)
      const isDirectCall = /(?:fetch|useFetch|useSWR|[A-Za-z0-9_$]*(?:Fetch|Api|Post|Put|Patch|Delete|Request|Client)|axios|request|http|sendBeacon|client)\s*(?:\.[a-zA-Z]+)?\s*\(\s*$/i.test(
        ctxBefore
      );
      const isMiniProgramUrlProp = /(?:wx|uni|Taro|my|tt)\.request\s*\(\s*\{[\s\S]{0,90}?\burl\s*:\s*$/i.test(ctxBefore);
      if (!isDirectCall && !isMiniProgramUrlProp) {
        continue;
      }

      // Find the opening `(` immediately preceding `str.start` and balance to its matching `)`
      const openParenIdx = lex.skeleton.lastIndexOf('(', str.start);
      let closeParenIdx = Math.min(lex.cleanCode.length, str.end + 180);
      if (openParenIdx !== -1) {
        let depth = 0;
        for (let k = openParenIdx; k < lex.skeleton.length; k++) {
          if (lex.skeleton[k] === '(') depth++;
          else if (lex.skeleton[k] === ')') {
            depth--;
            if (depth === 0) {
              closeParenIdx = k;
              break;
            }
          }
        }
      }
      const ctxAfter = lex.cleanCode.slice(str.end, closeParenIdx);

      let method = 'GET';
      const methodMatch = ctxAfter.match(/method\s*:\s*['"]([A-Za-z]+)['"]/i);
      if (methodMatch) {
        method = methodMatch[1].toUpperCase();
      } else if (/sendBeacon|\.(?:post)\s*\(\s*$/i.test(ctxBefore) || /apiPost\s*\(\s*$/i.test(ctxBefore)) {
        method = 'POST';
      } else if (/\.(?:put)\s*\(\s*$/i.test(ctxBefore)) {
        method = 'PUT';
      } else if (/\.(?:delete)\s*\(\s*$/i.test(ctxBefore)) {
        method = 'DELETE';
      }

      calls.push({
        rawPath: val,
        normPath: normalizeApiPath(val),
        method,
        file: file.relPath,
        line: str.line
      });
    }
  }

  return calls;
}

/**
 * Extract Backend API routes across `node:http`, Express/Fastify/Hono, and Next.js App Router.
 */
function extractBackendRoutes(fileDataMap) {
  const routes = [];

  for (const [absPath, modData] of fileDataMap.entries()) {
    const { file, lex } = modData;
    if (file.role === 'frontend' || file.role === 'test') continue;

    const { cleanCode, skeleton, lineOffsets } = lex;

    // Detect all sequential or block-scoped auth barriers (`if (!ctx) return ...401`, `if (!adminCtx) return ...401`)
    const authBarriers = [];
    const authGateRe = /if\s*\(\s*![A-Za-z0-9_$]*(?:ctx|session|user|auth|token|admin)[A-Za-z0-9_$]*\b[^)]*\)\s*return\s+[^;]*?(?:401|403|Unauthorized|未登录|登录已失效|口令|鉴权)/gi;
    let ag;
    while ((ag = authGateRe.exec(cleanCode)) !== null) {
      // Find enclosing `{ ... }` block around this auth gate so we know its exact protection range!
      let openB = -1;
      let d = 0;
      for (let k = ag.index; k >= 0; k--) {
        if (skeleton[k] === '}') d++;
        else if (skeleton[k] === '{') {
          if (d === 0) {
            openB = k;
            break;
          }
          d--;
        }
      }
      const closeB = openB !== -1 ? findMatchingBrace(skeleton, openB) : cleanCode.length;
      authBarriers.push({ gateIndex: ag.index, scopeEnd: closeB > openB ? closeB : cleanCode.length });
    }

    // Pattern A: Raw `node:http` conditional routing (`if (pathname === '/api/...' && ...)`)
    const ifHeaderRe = /\bif\s*\(/g;
    let m;
    while ((m = ifHeaderRe.exec(skeleton)) !== null) {
      const openParen = m.index + m[0].length - 1;
      let depth = 0;
      let closeParen = -1;
      for (let k = openParen; k < skeleton.length; k++) {
        if (skeleton[k] === '(') depth++;
        else if (skeleton[k] === ')') {
          depth--;
          if (depth === 0) {
            closeParen = k;
            break;
          }
        }
      }
      if (closeParen === -1) continue;

      const cond = cleanCode.slice(openParen + 1, closeParen);
      const routeMatch = cond.match(/(?:pathname|urlPath|req\.url)\s*(?:===|==|\.startsWith\()\s*['"`](\/api\/[^'"`]+)['"`]/);
      if (!routeMatch) continue;

      const rawRoute = routeMatch[1];
      if (rawRoute === '/api/' || rawRoute === '/api') continue;

      const methodMatch = cond.match(/req\.method\s*===\s*['"]([A-Z]+)['"]/);
      const method = methodMatch ? methodMatch[1].toUpperCase() : 'ANY';
      const isPrefix = cond.includes('.startsWith(');
      const afterCondIdx = closeParen + 1;

      // Extract handler snippet: either `{ ... }` block or single-statement `return ...;`
      let handlerSnippet = '';
      const nextNonWs = skeleton.slice(afterCondIdx).search(/\S/);
      if (nextNonWs !== -1) {
        const bodyStart = afterCondIdx + nextNonWs;
        if (skeleton[bodyStart] === '{') {
          const closeBrace = findMatchingBrace(skeleton, bodyStart);
          if (closeBrace > bodyStart) {
            handlerSnippet = cleanCode.slice(bodyStart, closeBrace + 1);
          }
        } else {
          const semi = cleanCode.indexOf(';', bodyStart);
          if (semi !== -1) {
            handlerSnippet = cleanCode.slice(bodyStart, semi + 1);
          }
        }
      }

      // Skip pure router-group prefix wrappers (`if (pathname.startsWith('/api/admin/')) { if (pathname === ...) }`)
      if (isPrefix && /(?:pathname|urlPath|req\.url)\s*===\s*['"`]\/api\//.test(handlerSnippet)) {
        continue;
      }

      const localHasAuth = /\b(?:ctx|adminCtx|getAuthCtx|getAdminCtx|requireAuth|verifyToken|checkAdmin|session)\b/.test(handlerSnippet);
      const protectedByBarrier = authBarriers.some(b => m.index > b.gateIndex && m.index < b.scopeEnd);
      const isAuthenticated = localHasAuth || protectedByBarrier;

      const effects = traceTransitiveEffects(handlerSnippet, absPath, fileDataMap);

      routes.push({
        rawPath: rawRoute,
        normPath: normalizeApiPath(rawRoute),
        isPrefix,
        method,
        file: file.relPath,
        line: indexToLine(lineOffsets, m.index),
        isAuthenticated,
        ...effects
      });
    }

    // Pattern B: Express / Fastify / Hono / Koa (`app.get('/api/...', ...)` / `router.post('/api/...', ...)`)
    const expressRe = /\b(?:app|router|server|fastify)\.(get|post|put|delete|patch|all)\s*\(\s*['"`](\/api\/[^'"`]+)['"`]/gi;
    while ((m = expressRe.exec(cleanCode)) !== null) {
      const method = m[1].toUpperCase();
      const rawRoute = m[2];
      // Find `{` of route handler callback
      const searchSlice = skeleton.slice(m.index, Math.min(skeleton.length, m.index + 300));
      const braceRel = searchSlice.indexOf('{');
      let handlerSnippet = '';
      if (braceRel !== -1) {
        const openBrace = m.index + braceRel;
        const closeBrace = findMatchingBrace(skeleton, openBrace);
        if (closeBrace > openBrace) {
          handlerSnippet = cleanCode.slice(openBrace, closeBrace + 1);
        }
      }
      const headerSlice = cleanCode.slice(m.index, Math.min(cleanCode.length, m.index + (braceRel !== -1 ? braceRel : 160)));
      const isAuthenticated = /auth|jwt|session|guard|protect|admin/i.test(headerSlice) || /\b(?:getAuthCtx|requireAuth|verifyToken|req\.user)\b/.test(handlerSnippet);
      const effects = traceTransitiveEffects(handlerSnippet, absPath, fileDataMap);

      routes.push({
        rawPath: rawRoute,
        normPath: normalizeApiPath(rawRoute),
        isPrefix: false,
        method: method === 'ALL' ? 'ANY' : method,
        file: file.relPath,
        line: indexToLine(lineOffsets, m.index),
        isAuthenticated,
        ...effects
      });
    }

      // Pattern D: Python FastAPI / Flask (`@app.get("/api/...")`, `@router.post("/api/...")`, `@app.route("/api/...")`)
    if (file.ext === '.py') {
      const pyRouteRe = /@(?:app|router|api|bp)\.(get|post|put|delete|patch|route)\s*\(\s*['"](\/api\/[^'"]+)['"]([^)]*)\)/g;
      while ((m = pyRouteRe.exec(cleanCode)) !== null) {
        let method = m[1].toUpperCase();
        const rawRoute = m[2];
        const extraArgs = m[3] || '';
        if (method === 'ROUTE') {
          const mm = extraArgs.match(/methods\s*=\s*\[['"]([A-Za-z]+)['"]/i);
          method = mm ? mm[1].toUpperCase() : 'ANY';
        }
        const handlerSnippet = cleanCode.slice(m.index, Math.min(cleanCode.length, m.index + 650));
        const isAuthenticated = /Depends\(|current_user|verify_token|login_required|authorization/i.test(handlerSnippet);
        const effects = inspectEffects(handlerSnippet, []);
        routes.push({
          rawPath: rawRoute,
          normPath: normalizeApiPath(rawRoute),
          isPrefix: false,
          method,
          file: file.relPath,
          line: indexToLine(lineOffsets, m.index),
          isAuthenticated,
          ...effects,
          tracedHelpers: []
        });
      }
      continue;
    }

    // Pattern C: Next.js App Router (`app/api/.../route.ts|js`) & Pages Router (`pages/api/...ts|js`)
    const nextMatch = file.relPath.match(/(?:^|\/)app(\/api\/.+)\/route\.[mc]?[jt]sx?$/);
    if (nextMatch) {
      const rawRoute = nextMatch[1];
      const nextFnRe = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*\{/g;
      while ((m = nextFnRe.exec(skeleton)) !== null) {
        const method = m[1].toUpperCase();
        const openBrace = m.index + m[0].length - 1;
        const closeBrace = findMatchingBrace(skeleton, openBrace);
        const handlerSnippet = closeBrace > openBrace ? cleanCode.slice(openBrace, closeBrace + 1) : '';
        const isAuthenticated = /getServerSession|auth\(|verifyToken|cookies\(\)|headers\(\)|currentUser/.test(handlerSnippet);
        const effects = traceTransitiveEffects(handlerSnippet, absPath, fileDataMap);

        routes.push({
          rawPath: rawRoute,
          normPath: normalizeApiPath(rawRoute),
          isPrefix: false,
          method,
          file: file.relPath,
          line: indexToLine(lineOffsets, m.index),
          isAuthenticated,
          ...effects
        });
      }
    }

    const pagesApiMatch = file.relPath.match(/(?:^|\/)pages(\/api\/.+)\.[mc]?[jt]sx?$/);
    if (pagesApiMatch) {
      const rawRoute = pagesApiMatch[1].replace(/\/index$/, '');
      const isAuthenticated = /getServerSession|verifyToken|authorization|req\.cookies|checkAdmin/i.test(cleanCode);
      const effects = traceTransitiveEffects(cleanCode, absPath, fileDataMap);
      routes.push({
        rawPath: rawRoute,
        normPath: normalizeApiPath(rawRoute),
        isPrefix: false,
        method: 'ANY',
        file: file.relPath,
        line: 1,
        isAuthenticated,
        ...effects
      });
    }
  }

  return routes;
}

/**
 * Reconcile Frontend Calls <-> Backend Routes <-> DB Persistence & AI Channels
 * into a complete 3D Product Reality Lineage Graph.
 */
export function buildLineageGraph(workspace) {
  const fileDataMap = buildModuleSymbolIndex(workspace);
  const frontendCalls = extractFrontendCalls(fileDataMap);
  const backendRoutes = extractBackendRoutes(fileDataMap);

  const chains = [];
  const matchedRouteIndices = new Set();

  // Deduplicate frontend calls by method + normPath + file
  const uniqueCalls = [];
  const seenCallKey = new Set();
  for (const c of frontendCalls) {
    const key = `${c.method}|${c.normPath}|${c.file}:${c.line}`;
    if (!seenCallKey.has(key)) {
      seenCallKey.add(key);
      uniqueCalls.push(c);
    }
  }

  for (const call of uniqueCalls) {
    const matchIdx = backendRoutes.findIndex((r, idx) => {
      const methodOk = r.method === 'ANY' || r.method === call.method;
      if (!methodOk) return false;
      if (r.normPath === call.normPath) return true;
      if (r.isPrefix && call.normPath.startsWith(r.normPath)) return true;
      return false;
    });

    if (matchIdx === -1) {
      chains.push({
        status: 'BROKEN_CONTRACT',
        badge: '🔴 断头接口（404）',
        method: call.method,
        endpoint: call.rawPath,
        frontend: `${call.file}:${call.line}`,
        backend: '未找到对应后端接口',
        persistence: '无',
        summary: `前端调用了 ${call.method} ${call.rawPath}，但后端根本没有这个接口，点击必报错或无响应。`
      });
      continue;
    }

    matchedRouteIndices.add(matchIdx);
    const route = backendRoutes[matchIdx];
    chains.push(classifyMatchedChain(call, route));
  }

  // Also classify backend routes not directly triggered from SPA (e.g., H5 callbacks or orphan APIs)
  backendRoutes.forEach((route, idx) => {
    if (matchedRouteIndices.has(idx)) return;
    const isPublicCallback = route.rawPath.startsWith('/api/public/');
    const chain = classifyMatchedChain(null, route);
    if (isPublicCallback) {
      chain.frontend = '外部H5页面回传';
    } else {
      chain.status = chain.status === 'VOLATILE_MEMORY' ? 'VOLATILE_MEMORY' : 'BACKEND_ONLY';
      if (chain.status === 'BACKEND_ONLY') {
        chain.badge = '⚪ 仅后端接口';
      }
      chain.frontend = '前端暂未直接调用';
    }
    chains.push(chain);
  });

  // Extract all SQLite CREATE TABLE definitions across workspace for schema inventory
  const schemaTables = extractSchemaTables(workspace, fileDataMap);
  const zombieFiles = [];
  for (const [, modData] of fileDataMap.entries()) {
    if (!modData.isReachable) {
      zombieFiles.push(modData.file.relPath);
    }
  }

  return {
    schemaTables,
    zombieFiles,
    frontendCallCount: uniqueCalls.length,
    backendRouteCount: backendRoutes.length,
    chains,
    backendRoutes,
    frontendCalls: uniqueCalls,
    fileDataMap
  };
}

function classifyMatchedChain(call, route) {
  const feRef = call ? `${call.file}:${call.line}` : '外部/直接请求';
  const beRef = `${route.file}:${route.line}`;
  const isMutationMethod = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(route.method === 'ANY' && call ? call.method : route.method);
  const methodLabel = call ? call.method : route.method;

  if (route.memoryMutations.length > 0 && route.dbWrites.length === 0) {
    return {
      status: 'VOLATILE_MEMORY',
      badge: '🟡 内存假落库（重启即丢）',
      method: methodLabel,
      endpoint: route.rawPath,
      frontend: feRef,
      backend: beRef,
      persistence: `仅改内存变量 (${route.memoryMutations.join(', ')})`,
      isAuthenticated: route.isAuthenticated,
      summary: `表面操作成功，但数据只存在服务器内存变量里，一旦重启程序或断电，客户数据瞬间清零！`
    };
  }

  if (route.hasOutboundLlm && route.dbWrites.length > 0) {
    return {
      status: 'REAL_AI_AND_DB',
      badge: '🟢 真AI调用 + 真落库',
      method: methodLabel,
      endpoint: route.rawPath,
      frontend: feRef,
      backend: beRef,
      persistence: `外部大模型 + 写库 [${route.dbWrites.join(', ')}]`,
      isAuthenticated: route.isAuthenticated,
      summary: route.hasLocalFallback
        ? `已接通外部大模型并写入 [${route.dbWrites.join(', ')}] 表（未填 Key 时自动降级本地智能模板）。`
        : `已接通真实外部大模型并持久化到 [${route.dbWrites.join(', ')}] 表。`
    };
  }

  if (route.dbWrites.length > 0) {
    return {
      status: 'REAL_DB_WRITE',
      badge: '🟢 真通落库（永久保存）',
      method: methodLabel,
      endpoint: route.rawPath,
      frontend: feRef,
      backend: beRef,
      persistence: `写库 [${route.dbWrites.join(', ')}]`,
      isAuthenticated: route.isAuthenticated,
      summary: `前后端已打通，数据真实写入数据库 [${route.dbWrites.join(', ')}] 表，重启不丢。`
    };
  }

  if (route.dbReads.length > 0) {
    return {
      status: 'REAL_DB_READ',
      badge: '🟢 真查数据库',
      method: methodLabel,
      endpoint: route.rawPath,
      frontend: feRef,
      backend: beRef,
      persistence: `读库 [${route.dbReads.join(', ')}]`,
      isAuthenticated: route.isAuthenticated,
      summary: `从真实数据库 [${route.dbReads.join(', ')}] 表读取实时数据。`
    };
  }

  if (route.hasOutboundLlm) {
    return {
      status: 'REAL_AI_STATELESS',
      badge: '🟢 真连大模型（即时测连）',
      method: methodLabel,
      endpoint: route.rawPath,
      frontend: feRef,
      backend: beRef,
      persistence: '实时外部大模型请求',
      isAuthenticated: route.isAuthenticated,
      summary: '真实请求外部大模型接口返回结果（不落库）。'
    };
  }

  if (isMutationMethod) {
    return {
      status: 'STATELESS_MUTATION_SHELL',
      badge: '🟡 疑似演示壳（未见落库）',
      method: methodLabel,
      endpoint: route.rawPath,
      frontend: feRef,
      backend: beRef,
      persistence: '未检测到数据库写入',
      isAuthenticated: route.isAuthenticated,
      summary: `这是一个提交型接口 (${methodLabel})，但未追踪到数据库写入动作，请确认是否为静态演示数据。`
    };
  }

  return {
    status: 'STATIC_CONFIG',
    badge: '🟢 常量/配置只读',
    method: methodLabel,
    endpoint: route.rawPath,
    frontend: feRef,
    backend: beRef,
    persistence: '静态配置目录',
    isAuthenticated: route.isAuthenticated,
    summary: '返回套餐或系统常量配置。'
  };
}

function extractSchemaTables(workspace, fileDataMap) {
  const tables = new Set();
  const createTableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?/gi;
  const drizzleTableRe = /\b(?:sqliteTable|pgTable|mysqlTable)\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]/g;
  const mongooseModelRe = /\bmongoose\.model\s*\(\s*['"`]([A-Za-z0-9_]+)['"`]/g;
  const pyTableNameRe = /__tablename__\s*=\s*['"]([a-zA-Z0-9_]+)['"]/g;
  const supaFromRe = /\.from\s*\(\s*['"`]([a-zA-Z0-9_]+)['"`]\s*\)\s*\.\s*(?:insert|update|upsert|delete|select)\s*\(/g;

  for (const [, modData] of fileDataMap.entries()) {
    const code = modData.lex.cleanCode;
    let m;
    while ((m = createTableRe.exec(code)) !== null) tables.add(m[1]);
    while ((m = drizzleTableRe.exec(code)) !== null) tables.add(m[1]);
    while ((m = mongooseModelRe.exec(code)) !== null) tables.add(m[1]);
    while ((m = pyTableNameRe.exec(code)) !== null) tables.add(m[1]);
    while ((m = supaFromRe.exec(code)) !== null) tables.add(m[1]);
  }
  for (const sqlFile of workspace.sqlFiles) {
    try {
      const content = fs.readFileSync(sqlFile.absPath, 'utf8');
      let m;
      const prismaModelRe = /^\s*model\s+([A-Za-z0-9_]+)\s*\{/gm;
      while ((m = createTableRe.exec(content)) !== null) tables.add(m[1]);
      while ((m = prismaModelRe.exec(content)) !== null) tables.add(m[1]);
    } catch {
      // ignore
    }
  }
  return [...tables];
}

/**
 * Render dual-mode X-Ray report:
 * - `founderText`: Plain-Chinese human-readable table
 * - `aiCompact`: `< 240 tokens` ultra-dense pipe table for AI agents
 */
export function formatLineageReport(lineage) {
  const broken = lineage.chains.filter(c => c.status === 'BROKEN_CONTRACT');
  const volatile = lineage.chains.filter(c => c.status === 'VOLATILE_MEMORY');
  const realWrite = lineage.chains.filter(c => c.status === 'REAL_DB_WRITE' || c.status === 'REAL_AI_AND_DB');
  const realRead = lineage.chains.filter(c => c.status === 'REAL_DB_READ' || c.status === 'REAL_AI_STATELESS' || c.status === 'STATIC_CONFIG');
  const shell = lineage.chains.filter(c => c.status === 'STATELESS_MUTATION_SHELL');

  const lines = [
    `# 🔬 GhostCTO 全栈真假穿透 X 光报告`,
    `- 数据库真表 (${lineage.schemaTables.length} 张): ${lineage.schemaTables.join(', ') || '未检测到建表语句'}`,
    `- 前端接口调用: ${lineage.frontendCallCount} 处 | 后端注册路由: ${lineage.backendRouteCount} 条`,
    `- 🟢 真通落库/真查库: ${realWrite.length + realRead.length} 条 | 🟡 内存假落库/演示壳: ${volatile.length + shell.length} 条 | 🔴 404断头接口: ${broken.length} 条`,
    ``,
    `| 状态 | 接口 | 前端位置 | 后端位置 | 数据去向 | 大白话结论 |`,
    `| :--- | :--- | :--- | :--- | :--- | :--- |`
  ];

  for (const c of lineage.chains) {
    lines.push(`| ${c.badge} | \`${c.method} ${c.endpoint}\` | \`${c.frontend}\` | \`${c.backend}\` | ${c.persistence} | ${c.summary} |`);
  }

  // Ultra-compact AI format (< 240 tokens when healthy / focused on anomalies + summary)
  const aiLines = [
    `GHOST_XRAY|tables:${lineage.schemaTables.length}|fe:${lineage.frontendCallCount}|be:${lineage.backendRouteCount}|real:${realWrite.length + realRead.length}|volatile:${volatile.length}|broken:${broken.length}`
  ];
  for (const c of [...broken, ...volatile, ...shell].slice(0, 12)) {
    aiLines.push(`${c.status}|${c.method} ${c.endpoint}|fe:${c.frontend}|be:${c.backend}|${c.persistence}`);
  }
  if (broken.length + volatile.length + shell.length === 0) {
    aiLines.push(`ALL_CHAINS_VERIFIED_REAL|sample:${lineage.chains.slice(0, 5).map(c => `${c.method}:${c.endpoint}->${c.persistence}`).join(';')}`);
  }

  return {
    founderMarkdown: lines.join('\n'),
    aiCompact: aiLines.join('\n'),
    stats: {
      tables: lineage.schemaTables.length,
      realCount: realWrite.length + realRead.length,
      volatileCount: volatile.length,
      shellCount: shell.length,
      brokenCount: broken.length
    }
  };
}
