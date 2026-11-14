import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { analyzeSource, indexToLine } from './lexer.mjs';
import { resolveModuleSpecifier } from './module-resolver.mjs';

const NODE_BUILTINS = new Set(builtinModules.flatMap(m => [m, m.replace(/^node:/, '')]));

export function buildExportIndex(ws) {
  const exportTable = new Map();
  for (const f of ws.codeFiles) {
    if (f.role === 'test') continue;
    if (!['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx'].includes(f.ext)) continue;
    let raw = '';
    try {
      raw = fs.readFileSync(f.absPath, 'utf8');
    } catch (err) {
      if (process.env.GHOST_DEBUG) console.warn('[export-index]', err.message);
      continue;
    }
    const lex = analyzeSource(raw, f.ext);
    const skel = lex.skeleton;
    const strByStart = new Map(lex.strings.map(s => [s.start, s.value]));
    const exportsSet = new Set();
    const starTargets = [];
    const namedReExports = [];
    const fromDir = path.dirname(f.absPath);
    const isCjs = /\bmodule\.exports\b|\bexports\.[A-Za-z_$]/.test(skel);

    let m;
    const fnRe = /\bexport\s+(default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][A-Za-z0-9_$]*)?/g;
    while ((m = fnRe.exec(skel)) !== null) {
      if (m[1]) exportsSet.add('default');
      if (m[2]) exportsSet.add(m[2]);
    }

    const varRe = /\bexport\s+(default\s+)?(?:const|let|var|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
    while ((m = varRe.exec(skel)) !== null) {
      if (m[1]) exportsSet.add('default');
      if (m[2]) exportsSet.add(m[2]);
    }

    if (/\bexport\s+default\b/.test(skel)) {
      exportsSet.add('default');
    }

    const localExportListRe = /\bexport\s*\{([^}]+)\}(?!\s*from\b)/g;
    while ((m = localExportListRe.exec(skel)) !== null) {
      for (const part of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
        const cleanedPart = part.replace(/^type\s+/, '').trim();
        const [orig, alias] = cleanedPart.split(/\s+as\s+/).map(x => x.trim());
        if (alias || orig) exportsSet.add(alias || orig);
      }
    }

    const reExportListRe = /\bexport\s*\{([^}]+)\}\s*from\s*(['"])\s*\2/g;
    while ((m = reExportListRe.exec(skel)) !== null) {
      const quotePos = m.index + m[0].lastIndexOf(m[2], m[0].length - 2);
      const spec = (strByStart.get(quotePos) || '').trim();
      const targetAbs = resolveModuleSpecifier(spec, fromDir, ws.packagesMap);
      const map = new Map();
      for (const part of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
        const cleanedPart = part.replace(/^type\s+/, '').trim();
        const [orig, alias] = cleanedPart.split(/\s+as\s+/).map(x => x.trim());
        if (orig) map.set(alias || orig, orig);
      }
      if (targetAbs) namedReExports.push({ targetAbsPath: targetAbs, map });
      else {
        for (const k of map.keys()) exportsSet.add(k);
      }
    }

    const starRe = /\bexport\s*\*\s*(?:as\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+)?from\s*(['"])\s*\2/g;
    while ((m = starRe.exec(skel)) !== null) {
      if (m[1]) {
        exportsSet.add(m[1]);
      } else {
        const quotePos = m.index + m[0].lastIndexOf(m[2], m[0].length - 2);
        const spec = (strByStart.get(quotePos) || '').trim();
        const targetAbs = resolveModuleSpecifier(spec, fromDir, ws.packagesMap);
        if (targetAbs) starTargets.push(targetAbs);
      }
    }

    exportTable.set(f.absPath, {
      file: f,
      lex,
      strByStart,
      exportsSet,
      starTargets,
      namedReExports,
      isCjs
    });
  }
  return exportTable;
}

function hasExportedSymbol(absPath, symName, exportTable, seen = new Set()) {
  const key = `${absPath}::${symName}`;
  if (seen.has(key)) return false;
  seen.add(key);

  const info = exportTable.get(absPath);
  if (!info) return true;
  if (info.isCjs || info.exportsSet.has(symName)) return true;

  for (const re of info.namedReExports) {
    if (re.map.has(symName)) {
      return hasExportedSymbol(re.targetAbsPath, re.map.get(symName), exportTable, seen);
    }
  }
  for (const st of info.starTargets) {
    if (hasExportedSymbol(st, symName, exportTable, seen)) return true;
  }
  return false;
}

/**
 * Deterministically catch runtime crashers using lexical `skeleton` + `strByStart`
 * so template literals / comments NEVER trigger false positives.
 */
export function checkModuleLinksAndPackages(absRoot, ws, exportTable) {
  const errors = [];
  const declaredDeps = new Set();
  for (const pkg of ws.packageJsons) {
    try {
      const parsed = JSON.parse(fs.readFileSync(pkg.absPath, 'utf8'));
      for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        if (parsed?.[field] && typeof parsed[field] === 'object') {
          for (const depName of Object.keys(parsed[field])) declaredDeps.add(depName);
        }
      }
    } catch (err) {
      if (process.env.GHOST_DEBUG) console.warn('[pkg-parse]', err.message);
    }
  }

  const isZeroDepBlueprint = fs.existsSync(path.join(absRoot, '.vibe', 'blueprint.json'));

  function checkBareSpec(spec, f, line) {
    if (
      !spec ||
      spec.startsWith('.') ||
      spec.startsWith('/') ||
      spec.startsWith('node:') ||
      spec.startsWith('@/') ||
      spec.startsWith('~/') ||
      /^https?:\/\//i.test(spec)
    ) {
      return;
    }
    const pkgRoot = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (NODE_BUILTINS.has(spec) || NODE_BUILTINS.has(pkgRoot)) return;
    if (ws.packagesMap.has(spec) || ws.packagesMap.has(pkgRoot)) return;

    const installedInRoot = fs.existsSync(path.join(absRoot, 'node_modules', pkgRoot));
    const installedNearFile = fs.existsSync(path.join(path.dirname(f.absPath), '..', 'node_modules', pkgRoot));
    if (installedInRoot || installedNearFile) return;

    if (isZeroDepBlueprint || !declaredDeps.has(pkgRoot)) {
      errors.push({
        kind: 'UNINSTALLED_PACKAGE',
        file: f.relPath,
        line,
        message: `引入了未安装的外部依赖包 '${pkgRoot}'（启动会直接崩溃报 ERR_MODULE_NOT_FOUND！请改用 Node.js 内置模块实现或先安装该包）`
      });
    }
  }

  for (const [absPath, info] of exportTable.entries()) {
    const { file: f, lex, strByStart } = info;
    if (!['.js', '.mjs', '.cjs'].includes(f.ext)) continue;
    const skel = lex.skeleton;
    const fromDir = path.dirname(absPath);

    const importFromRe = /\bimport\s+([^;'"`]*?)\s+from\s+(['"])\s*\2/g;
    let m;
    while ((m = importFromRe.exec(skel)) !== null) {
      const clause = m[1].trim();
      const quotePos = m.index + m[0].lastIndexOf(m[2], m[0].length - 2);
      const spec = (strByStart.get(quotePos) || '').trim();
      if (!spec || /^type\s+/.test(clause)) continue;
      const line = indexToLine(lex.lineOffsets, m.index);

      if (spec.startsWith('.') || spec.startsWith('@/') || spec.startsWith('~/')) {
        const targetAbs = resolveModuleSpecifier(spec, fromDir, ws.packagesMap);
        if (!targetAbs) {
          errors.push({
            kind: 'BROKEN_LOCAL_IMPORT',
            file: f.relPath,
            line,
            message: `找不到本地导入文件 '${spec}'（启动会报 ERR_MODULE_NOT_FOUND）`
          });
          continue;
        }
        const namedMatch = clause.match(/\{([^}]+)\}/);
        if (namedMatch) {
          for (const part of namedMatch[1].split(',').map(s => s.trim()).filter(Boolean)) {
            if (/^type\s+/.test(part)) continue;
            const [orig] = part.split(/\s+as\s+/).map(x => x.trim());
            if (orig && !hasExportedSymbol(targetAbs, orig, exportTable)) {
              errors.push({
                kind: 'MISSING_NAMED_EXPORT',
                file: f.relPath,
                line,
                message: `导入错误：模块 '${spec}' 并未导出 '${orig}'（启动会报 SyntaxError: does not provide an export named '${orig}'）`
              });
            }
          }
        }
      } else {
        checkBareSpec(spec, f, line);
      }
    }

    const sideOrReqRe = /\b(?:import\s+(['"])\s*\1|require\s*\(\s*(['"])\s*\2\s*\))/g;
    while ((m = sideOrReqRe.exec(skel)) !== null) {
      const quoteChar = m[1] || m[2];
      const quotePos = m.index + m[0].indexOf(quoteChar);
      const spec = (strByStart.get(quotePos) || '').trim();
      if (!spec) continue;
      const line = indexToLine(lex.lineOffsets, m.index);
      if (spec.startsWith('.')) {
        const targetAbs = resolveModuleSpecifier(spec, fromDir, ws.packagesMap);
        if (!targetAbs) {
          errors.push({
            kind: 'BROKEN_LOCAL_IMPORT',
            file: f.relPath,
            line,
            message: `找不到本地导入文件 '${spec}'（启动会报 ERR_MODULE_NOT_FOUND）`
          });
        }
      } else {
        checkBareSpec(spec, f, line);
      }
    }
  }

  return errors;
}

function splitSqlColumns(body) {
  const parts = [];
  let cur = '';
  let depth = 0;
  let inQuote = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inQuote) {
      cur += ch;
      if (ch === inQuote && body[i - 1] !== '\\') inQuote = '';
      continue;
    }
    if (ch === "'" || ch === '"') {
      inQuote = ch;
      cur += ch;
    } else if (ch === '(') {
      depth++;
      cur += ch;
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
      cur += ch;
    } else if (ch === ',' && depth === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

export function checkSqlColumnConsistency(ws, exportTable) {
  const tableCols = new Map();

  function collectCreateTables(sqlSource) {
    const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?\s*\(([\s\S]*?)\)\s*;?/gi;
    let m;
    while ((m = createRe.exec(sqlSource)) !== null) {
      const tbl = m[1].toLowerCase();
      if (!tableCols.has(tbl)) tableCols.set(tbl, new Set());
      const set = tableCols.get(tbl);
      for (const colLine of splitSqlColumns(m[2])) {
        if (!colLine || /^(?:PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b/i.test(colLine)) continue;
        const cm = colLine.match(/^[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?\s+/);
        if (cm) set.add(cm[1].toLowerCase());
      }
    }
  }

  function collectAlterAndHelperColumns(sqlSource) {
    let m;
    const alterRe = /ALTER\s+TABLE\s+[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?\s+ADD\s+(?:COLUMN\s+)?[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?/gi;
    while ((m = alterRe.exec(sqlSource)) !== null) {
      const tbl = m[1].toLowerCase();
      const col = m[2].toLowerCase();
      if (tableCols.has(tbl)) tableCols.get(tbl).add(col);
    }

    const helperRe = /\b(?:ensure|add|migrate|safeAdd|patch)Col(?:umn)?\s*\(\s*(?:[a-zA-Z0-9_$.]+\s*,\s*)?['"`]([a-zA-Z0-9_]+)['"`]\s*,\s*['"`]([a-zA-Z0-9_]+)['"`]/gi;
    while ((m = helperRe.exec(sqlSource)) !== null) {
      const tbl = m[1].toLowerCase();
      const col = m[2].toLowerCase();
      if (tableCols.has(tbl)) tableCols.get(tbl).add(col);
    }
  }

  const allSources = [];
  for (const info of exportTable.values()) {
    allSources.push(info.lex.cleanCode);
  }
  for (const sf of ws.sqlFiles) {
    try {
      allSources.push(fs.readFileSync(sf.absPath, 'utf8'));
    } catch (err) {
      if (process.env.GHOST_DEBUG) console.warn('[sql-check]', err.message);
    }
  }
  for (const src of allSources) collectCreateTables(src);
  for (const src of allSources) collectAlterAndHelperColumns(src);

  if (tableCols.size === 0) return [];

  const errors = [];
  for (const info of exportTable.values()) {
    const { file: f, lex } = info;
    const clean = lex.cleanCode;

    const insRe = /\bINSERT\s+(?:OR\s+\w+\s+)?INTO\s+[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?\s*\(([^)$]+)\)\s*VALUES\b/gi;
    let m;
    while ((m = insRe.exec(clean)) !== null) {
      const tblRaw = m[1];
      const known = tableCols.get(tblRaw.toLowerCase());
      if (!known) continue;
      const line = indexToLine(lex.lineOffsets, m.index);
      const cols = m[2]
        .split(',')
        .map(c => c.replace(/[`"'[\]]/g, '').trim())
        .filter(Boolean);
      for (const c of cols) {
        if (/^[a-zA-Z0-9_]+$/.test(c) && !known.has(c.toLowerCase())) {
          errors.push({
            kind: 'SQL_COLUMN_MISMATCH',
            file: f.relPath,
            line,
            message: `数据库字段不一致：INSERT 写入了表 '${tblRaw}' 中未定义的字段 '${c}'（请在 CREATE TABLE 中同步声明该字段）`
          });
        }
      }
    }

    const updRe = /\bUPDATE\s+[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?\s+SET\s+([^;$]{1,260}?)\bWHERE\b/gi;
    while ((m = updRe.exec(clean)) !== null) {
      const tblRaw = m[1];
      const known = tableCols.get(tblRaw.toLowerCase());
      if (!known) continue;
      const line = indexToLine(lex.lineOffsets, m.index);
      const assignRe = /(?:^|,)\s*[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?\s*=/g;
      let am;
      while ((am = assignRe.exec(m[2])) !== null) {
        const c = am[1];
        if (!known.has(c.toLowerCase())) {
          errors.push({
            kind: 'SQL_COLUMN_MISMATCH',
            file: f.relPath,
            line,
            message: `数据库字段不一致：UPDATE 更新了表 '${tblRaw}' 中未定义的字段 '${c}'（请在 CREATE TABLE 中同步声明该字段）`
          });
        }
      }
    }
  }

  return errors;
}
