import fs from 'node:fs';
import path from 'node:path';
import { findMatchingBrace, indexToLine } from './lexer.mjs';

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
    } catch (err) {
      if (process.env.GHOST_DEBUG) console.warn('[probe]', err.message);
    }
  }
  return null;
}

export function resolveModuleSpecifier(spec, fromDir, packagesMap) {
  if (!spec) return null;

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

  if (!spec.startsWith('.') && !spec.startsWith('/')) {
    if (packagesMap.has(spec)) {
      return packagesMap.get(spec).entryAbsPath;
    }
    for (const [pkgName, pkgInfo] of packagesMap.entries()) {
      if (spec.startsWith(`${pkgName}/`)) {
        const sub = spec.slice(pkgName.length + 1);
        return probeFileCandidates(path.join(pkgInfo.dir, sub));
      }
    }
    return null;
  }

  const baseCandidate = path.resolve(fromDir, spec);
  return probeFileCandidates(baseCandidate);
}

/**
 * Resolve ES module imports, dynamic `import()`, CJS `require()`, AND barrel re-exports.
 * Uses `lex.skeleton` + `lex.strings` when `lex` is provided so strings/templates never trigger fake imports.
 */
export function extractImportsAndReExports(cleanCode, fromAbsPath, packagesMap, rawSource = '', ext = '', lex = null) {
  const resolved = new Map();
  const reExports = [];
  const fromDir = path.dirname(fromAbsPath);

  if (ext === '.html' && rawSource) {
    const htmlScriptSrcRe = /<script\b[^>]*?\bsrc\s*=\s*['"]([^'"]+)['"][^>]*>/gi;
    let hm;
    while ((hm = htmlScriptSrcRe.exec(rawSource)) !== null) {
      const srcSpec = hm[1].trim().split('?')[0].split('#')[0];
      if (!srcSpec || /^https?:\/\//i.test(srcSpec)) continue;
      const relCandidate = srcSpec.startsWith('/') ? `./${srcSpec.replace(/^\/+/, '')}` : srcSpec.startsWith('.') ? srcSpec : `./${srcSpec}`;
      const targetAbs = resolveModuleSpecifier(relCandidate, fromDir, packagesMap);
      if (targetAbs) {
        resolved.set(`__html_script_${targetAbs}`, { targetAbsPath: targetAbs, exportedName: '*' });
      }
    }
  }

  if (lex && lex.skeleton && Array.isArray(lex.strings)) {
    const strByStart = new Map(lex.strings.map(s => [s.start, s.value]));
    const skel = lex.skeleton;
    let m;

    const impFromRe = /\bimport\s+([\s\S]*?)\s+from\s+(['"])\s*\2/g;
    while ((m = impFromRe.exec(skel)) !== null) {
      const clause = m[1].trim();
      const quotePos = m.index + m[0].lastIndexOf(m[2], m[0].length - 2);
      const spec = (strByStart.get(quotePos) || '').trim();
      const targetAbs = resolveModuleSpecifier(spec, fromDir, packagesMap);
      if (!targetAbs) continue;

      const nsMatch = clause.match(/\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
      if (nsMatch) resolved.set(nsMatch[1], { targetAbsPath: targetAbs, exportedName: '*' });

      const namedMatch = clause.match(/\{([\s\S]*?)\}/);
      if (namedMatch) {
        for (const p of namedMatch[1].split(',').map(s => s.trim()).filter(Boolean)) {
          const [orig, alias] = p.split(/\s+as\s+/).map(x => x.trim());
          if (orig) resolved.set(alias || orig, { targetAbsPath: targetAbs, exportedName: orig });
        }
      }
      const defaultPart = clause.replace(/\{[\s\S]*?\}/, '').replace(/\*\s+as\s+[A-Za-z0-9_$]+/, '').replace(/,/g, '').trim();
      if (defaultPart && !defaultPart.startsWith('*')) {
        resolved.set(defaultPart, { targetAbsPath: targetAbs, exportedName: 'default' });
      }
    }

    const dynRe = /\b(?:import|require)\s*\(\s*(['"])\s*\1\s*\)/g;
    while ((m = dynRe.exec(skel)) !== null) {
      const quotePos = m.index + m[0].indexOf(m[1]);
      const spec = (strByStart.get(quotePos) || '').trim();
      const targetAbs = resolveModuleSpecifier(spec, fromDir, packagesMap);
      if (targetAbs) resolved.set(`__dyn_${targetAbs}`, { targetAbsPath: targetAbs, exportedName: '*' });
    }

    const starRe = /\bexport\s+\*\s+from\s+(['"])\s*\1/g;
    while ((m = starRe.exec(skel)) !== null) {
      const quotePos = m.index + m[0].indexOf(m[1]);
      const spec = (strByStart.get(quotePos) || '').trim();
      const targetAbs = resolveModuleSpecifier(spec, fromDir, packagesMap);
      if (targetAbs) reExports.push({ targetAbsPath: targetAbs, star: true, map: null });
    }

    const namedRe = /\bexport\s+\{([\s\S]*?)\}\s+from\s+(['"])\s*\2/g;
    while ((m = namedRe.exec(skel)) !== null) {
      const quotePos = m.index + m[0].lastIndexOf(m[2], m[0].length - 2);
      const spec = (strByStart.get(quotePos) || '').trim();
      const targetAbs = resolveModuleSpecifier(spec, fromDir, packagesMap);
      if (!targetAbs) continue;
      const map = new Map();
      for (const p of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
        const [orig, alias] = p.split(/\s+as\s+/).map(x => x.trim());
        if (orig) map.set(alias || orig, orig);
      }
      reExports.push({ targetAbsPath: targetAbs, star: false, map });
    }

    const sideRe = /\bimport\s+(['"])\s*\1/g;
    while ((m = sideRe.exec(skel)) !== null) {
      const quotePos = m.index + m[0].indexOf(m[1]);
      const spec = (strByStart.get(quotePos) || '').trim();
      const targetAbs = resolveModuleSpecifier(spec, fromDir, packagesMap);
      if (targetAbs) resolved.set(`__side_effect_${targetAbs}`, { targetAbsPath: targetAbs, exportedName: '*' });
    }

    return { imports: resolved, reExports };
  }

  let m;
  const importRegex = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;
  while ((m = importRegex.exec(cleanCode)) !== null) {
    const clause = m[1].trim();
    const spec = m[2].trim();
    const targetAbs = resolveModuleSpecifier(spec, fromDir, packagesMap);
    if (!targetAbs) continue;
    const nsMatch = clause.match(/\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
    if (nsMatch) resolved.set(nsMatch[1], { targetAbsPath: targetAbs, exportedName: '*' });
    const namedMatch = clause.match(/\{([\s\S]*?)\}/);
    if (namedMatch) {
      for (const p of namedMatch[1].split(',').map(s => s.trim()).filter(Boolean)) {
        const [orig, alias] = p.split(/\s+as\s+/).map(x => x.trim());
        if (orig) resolved.set(alias || orig, { targetAbsPath: targetAbs, exportedName: orig });
      }
    }
    const defaultPart = clause.replace(/\{[\s\S]*?\}/, '').replace(/\*\s+as\s+[A-Za-z0-9_$]+/, '').replace(/,/g, '').trim();
    if (defaultPart && !defaultPart.startsWith('*')) {
      resolved.set(defaultPart, { targetAbsPath: targetAbs, exportedName: 'default' });
    }
  }
  return { imports: resolved, reExports };
}

export function extractFunctions(raw, lex) {
  const fnMap = new Map();
  const { skeleton, cleanCode, lineOffsets } = lex;
  let m;

  const declRe = /(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\([^)]*\)\s*\{/g;
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

export function extractMutableGlobals(lex) {
  const globals = [];
  const { skeleton, cleanCode, lineOffsets } = lex;
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
        if (!/^[A-Z0-9_]+$/.test(varName)) {
          globals.push({ name: varName, line: indexToLine(lineOffsets, charOffset) });
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
