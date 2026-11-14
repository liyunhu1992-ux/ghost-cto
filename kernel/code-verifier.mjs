import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { builtinModules } from 'node:module';
import { execFileSync } from 'node:child_process';
import { scanWorkspace } from './scanner.mjs';
import { runRealityAudit } from './reality-audit.mjs';
import { analyzeSource, indexToLine } from './lexer.mjs';
import { resolveModuleSpecifier } from './lineage-graph.mjs';

const BLOCKING_AUDIT_IDS = new Set([
  'FAKE_UI_HANDLER',
  'FAKE_CLIENT_ONLY_SAVE',
  'SILENT_CATCH',
  'UNSAFE_PROXY_STREAM',
  'PLAINTEXT_PASSWORD_DB'
]);

const NODE_BUILTINS = new Set(
  builtinModules.flatMap(m => [m, m.replace(/^node:/, '')])
);

/**
 * Extract inline <script> blocks from an HTML file while preserving 1-based line offsets
 * so `vm.Script` reports the exact HTML line number if AI writes a browser JS syntax typo!
 */
function checkHtmlInlineScripts(absPath, relPath) {
  const errors = [];
  const html = fs.readFileSync(absPath, 'utf8');
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    const attrs = match[1] || '';
    const body = match[2] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const typeMatch = attrs.match(/\btype\s*=\s*['"]([^'"]+)['"]/i);
    const scriptType = typeMatch ? typeMatch[1].toLowerCase().trim() : 'text/javascript';
    if (
      scriptType &&
      scriptType !== 'text/javascript' &&
      scriptType !== 'application/javascript' &&
      scriptType !== 'module'
    ) {
      continue;
    }
    if (!body.trim()) continue;

    // Pad preceding lines with newlines so vm.Script line numbers match the exact HTML file line!
    const prefix = html.slice(0, match.index);
    const startLineOffset = prefix.split('\n').length - 1;
    const paddedCode = '\n'.repeat(startLineOffset) + body;

    try {
      const checkCode =
        scriptType === 'module'
          ? paddedCode
              .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?/gm, m => ' '.repeat(m.length))
              .replace(/^\s*export\s+(default\s+)?/gm, m => ' '.repeat(m.length))
          : paddedCode;
      new vm.Script(checkCode, { filename: relPath });
    } catch (err) {
      const stackStr = String(err?.stack || err?.message || err);
      const lineMatch = stackStr.match(new RegExp(`${relPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+)`));
      const line = lineMatch ? Number(lineMatch[1]) : startLineOffset + 1;
      errors.push({
        kind: 'HTML_SCRIPT_SYNTAX',
        file: relPath,
        line,
        message: err.message || '网页内嵌脚本语法错误'
      });
    }
  }
  return errors;
}

function checkJsSyntax(absPath, relPath) {
  try {
    execFileSync(process.execPath, ['--check', absPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000
    });
    return null;
  } catch (err) {
    const stderr = String(err.stderr || err.message || '');
    const lineMatch = stderr.match(/:(\d+)\r?\n/);
    const line = lineMatch ? Number(lineMatch[1]) : 1;
    const msgLine = stderr.split('\n').find(l => /SyntaxError:/i.test(l)) || stderr.split('\n')[0] || 'JS 语法错误';
    return {
      kind: 'JS_SYNTAX',
      file: relPath,
      line,
      message: msgLine.trim()
    };
  }
}

function checkJsonAndMiniProgramFiles(absRoot) {
  const errors = [];
  const candidates = [
    'package.json',
    'tsconfig.json',
    'miniprogram/app.json',
    'miniprogram/project.config.json',
    'miniprogram/sitemap.json'
  ];
  for (const rel of candidates) {
    const p = path.join(absRoot, rel);
    if (!fs.existsSync(p)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (rel === 'miniprogram/app.json' && Array.isArray(parsed?.pages)) {
        for (const pageRel of parsed.pages) {
          const jsPath = path.join(absRoot, 'miniprogram', `${pageRel}.js`);
          const wxmlPath = path.join(absRoot, 'miniprogram', `${pageRel}.wxml`);
          if (!fs.existsSync(jsPath) || !fs.existsSync(wxmlPath)) {
            errors.push({
              kind: 'MISSING_MINIPROGRAM_PAGE',
              file: rel,
              line: 1,
              message: `微信小程序页面缺失: app.json 注册了 '${pageRel}'，但缺少对应的 .js 或 .wxml 文件`
            });
          }
        }
      }
    } catch (err) {
      errors.push({
        kind: 'JSON_SYNTAX',
        file: rel,
        line: 1,
        message: `JSON 配置文件格式损坏: ${err.message}`
      });
    }
  }
  return errors;
}

function buildExportIndex(ws) {
  const exportTable = new Map();
  for (const f of ws.codeFiles) {
    if (f.role === 'test') continue;
    if (!['.js', '.mjs', '.cjs', '.jsx', '.ts', '.mts', '.cts', '.tsx'].includes(f.ext)) continue;
    let raw;
    try {
      raw = fs.readFileSync(f.absPath, 'utf8');
    } catch {
      continue;
    }
    const lex = analyzeSource(raw, f.ext);
    const clean = lex.cleanCode;
    const exportsSet = new Set();
    const starTargets = [];
    const namedReExports = [];
    const fromDir = path.dirname(f.absPath);
    const isCjs = /\bmodule\.exports\b|\bexports\.[A-Za-z_$]/.test(clean);

    let m;
    const fnRe = /\bexport\s+(default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][A-Za-z0-9_$]*)?/g;
    while ((m = fnRe.exec(clean)) !== null) {
      if (m[1]) exportsSet.add('default');
      if (m[2]) exportsSet.add(m[2]);
    }

    const varRe = /\bexport\s+(default\s+)?(?:const|let|var|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
    while ((m = varRe.exec(clean)) !== null) {
      if (m[1]) exportsSet.add('default');
      if (m[2]) exportsSet.add(m[2]);
    }

    if (/\bexport\s+default\b/.test(clean)) {
      exportsSet.add('default');
    }

    const localExportListRe = /\bexport\s*\{([^}]+)\}(?!\s*from\b)/g;
    while ((m = localExportListRe.exec(clean)) !== null) {
      for (const part of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
        const cleanedPart = part.replace(/^type\s+/, '').trim();
        const [orig, alias] = cleanedPart.split(/\s+as\s+/).map(x => x.trim());
        if (alias || orig) exportsSet.add(alias || orig);
      }
    }

    const reExportListRe = /\bexport\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
    while ((m = reExportListRe.exec(clean)) !== null) {
      const targetAbs = resolveModuleSpecifier(m[2].trim(), fromDir, ws.packagesMap);
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

    const starRe = /\bexport\s*\*\s*(?:as\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+)?from\s*['"]([^'"]+)['"]/g;
    while ((m = starRe.exec(clean)) !== null) {
      if (m[1]) {
        exportsSet.add(m[1]);
      } else {
        const targetAbs = resolveModuleSpecifier(m[2].trim(), fromDir, ws.packagesMap);
        if (targetAbs) starTargets.push(targetAbs);
      }
    }

    exportTable.set(f.absPath, {
      file: f,
      lex,
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
  if (!info) return true; // non-indexed external/asset target
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
 * Deterministically catch runtime crashers that `node --check` misses:
 * - Uninstalled / hallucinated bare npm packages (`import express from 'express'`)
 * - Missing local module files (`import './non-existent.mjs'`)
 * - Broken named ESM imports (`import { missingFn } from './db.mjs'`)
 */
function checkModuleLinksAndPackages(absRoot, ws, exportTable) {
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
    } catch {
      // handled by checkJsonAndMiniProgramFiles
    }
  }

  const isGoldenProject = fs.existsSync(path.join(absRoot, '.vibe', 'blueprint.json'));

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

    if (isGoldenProject || !declaredDeps.has(pkgRoot)) {
      errors.push({
        kind: 'UNINSTALLED_PACKAGE',
        file: f.relPath,
        line,
        message: `引入了未安装的外部依赖包 '${pkgRoot}'（启动会直接崩溃报 ERR_MODULE_NOT_FOUND！请改用 Node.js 内置模块实现或先安装该包）`
      });
    }
  }

  for (const [absPath, info] of exportTable.entries()) {
    const { file: f, lex } = info;
    if (!['.js', '.mjs', '.cjs'].includes(f.ext)) continue;
    const clean = lex.cleanCode;
    const fromDir = path.dirname(absPath);

    // 1. `import <clause> from '<spec>'`
    const importFromRe = /\bimport\s+([^;'"]*?)\s+from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = importFromRe.exec(clean)) !== null) {
      const clause = m[1].trim();
      const spec = m[2].trim();
      if (/^type\s+/.test(clause)) continue;
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

    // 2. Side-effect `import '<spec>'` & CommonJS `require('<spec>')`
    const sideOrReqRe = /\b(?:import\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
    while ((m = sideOrReqRe.exec(clean)) !== null) {
      const spec = (m[1] || m[2] || '').trim();
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

/**
 * Catch Step-2 SQL schema-vs-query column typos before runtime (`SqliteError: table X has no column named Y`)!
 */
function checkSqlColumnConsistency(ws, exportTable) {
  const tableCols = new Map(); // tableLower -> Set<colLower>

  function collectSchemaFromText(sqlSource) {
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

    const alterRe = /ALTER\s+TABLE\s+[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?\s+ADD\s+(?:COLUMN\s+)?[`"'[]?([a-zA-Z0-9_]+)[`"'\]]?/gi;
    while ((m = alterRe.exec(sqlSource)) !== null) {
      const tbl = m[1].toLowerCase();
      const col = m[2].toLowerCase();
      if (tableCols.has(tbl)) tableCols.get(tbl).add(col);
    }
  }

  for (const info of exportTable.values()) {
    collectSchemaFromText(info.lex.cleanCode);
  }
  for (const sf of ws.sqlFiles) {
    try {
      collectSchemaFromText(fs.readFileSync(sf.absPath, 'utf8'));
    } catch {
      // ignore
    }
  }

  if (tableCols.size === 0) return [];

  const errors = [];
  for (const info of exportTable.values()) {
    const { file: f, lex } = info;
    const clean = lex.cleanCode;

    // Check INSERT INTO <table> (c1, c2, ...) VALUES
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

    // Check UPDATE <table> SET c1 = ?, c2 = ? WHERE
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

function checkBlueprintContract(absRoot, ws, audit) {
  const bpPath = path.join(absRoot, '.vibe', 'blueprint.json');
  if (!fs.existsSync(bpPath) || ws.codeFiles.length === 0) return [];
  try {
    const bp = JSON.parse(fs.readFileSync(bpPath, 'utf8'));
    if (bp && bp.needPassword) {
      const hasLoginRoute = audit.lineage.backendRoutes.some(r =>
        /\/api\/(?:auth\/login|login|admin\/login)/i.test(r.rawPath)
      );
      if (!hasLoginRoute) {
        return [
          {
            id: 'MISSING_COMMERCIAL_AUTH',
            severity: 'P0',
            file: 'src/server.mjs',
            line: 1,
            title: '商用模式契约未兑现：蓝图要求开启账号登录权限保护，但后端缺失 /api/auth/login 登录鉴权接口',
            aiDirective: 'src/server.mjs:1|MISSING_COMMERCIAL_AUTH|Blueprint requires commercial auth (needPassword=true); implement scrypt login & session auth'
          }
        ];
      }
    }
  } catch {
    // ignore malformed blueprint
  }
  return [];
}

/**
 * Deterministic 0-Token Compiler, Linker, SQL Schema & Reality Verification Gate (`ghost-cto verify`).
 * Blocks:
 * 1. JS/MJS/CJS syntax errors (`node --check`)
 * 2. HTML inline `<script>` syntax errors (`vm.Script` with exact line offset)
 * 3. Broken JSON & WeChat Mini-Program manifests (`package.json`, `tsconfig.json`, `miniprogram/app.json`)
 * 4. Uninstalled npm packages (`UNINSTALLED_PACKAGE`), missing local modules (`BROKEN_LOCAL_IMPORT`), & broken named exports (`MISSING_NAMED_EXPORT`)
 * 5. SQL schema-vs-query column mismatches (`SQL_COLUMN_MISMATCH`)
 * 6. All P0 blockers & deception traps (`FAKE_UI_HANDLER`, `FAKE_CLIENT_ONLY_SAVE`, `SILENT_CATCH`, `PLAINTEXT_PASSWORD_DB`, `MISSING_COMMERCIAL_AUTH`)
 */
export function verifyWorkspaceCode(targetRootDir) {
  const absRoot = path.resolve(targetRootDir);
  const ws = scanWorkspace(absRoot);
  const syntaxErrors = [...checkJsonAndMiniProgramFiles(absRoot)];

  for (const f of ws.codeFiles) {
    if (['.js', '.mjs', '.cjs'].includes(f.ext)) {
      const err = checkJsSyntax(f.absPath, f.relPath);
      if (err) syntaxErrors.push(err);
    } else if (f.ext === '.html') {
      const htmlErrs = checkHtmlInlineScripts(f.absPath, f.relPath);
      syntaxErrors.push(...htmlErrs);
    }
  }

  const exportTable = buildExportIndex(ws);
  syntaxErrors.push(...checkModuleLinksAndPackages(absRoot, ws, exportTable));
  syntaxErrors.push(...checkSqlColumnConsistency(ws, exportTable));

  const audit = runRealityAudit(ws);
  const contractBlockers = checkBlueprintContract(absRoot, ws, audit);
  const p0Findings = [
    ...contractBlockers,
    ...audit.findings.filter(f => f.severity === 'P0' || BLOCKING_AUDIT_IDS.has(f.id))
  ];

  const ok = syntaxErrors.length === 0 && p0Findings.length === 0;

  const errorLines = [
    ...syntaxErrors.map(e => `❌ [代码/依赖/SQL编译错误] ${e.file}:${e.line} — ${e.message}`),
    ...p0Findings.map(f => `🔴 [真假与安全门禁阻断] ${f.file}:${f.line} — ${f.title}`)
  ];

  const aiFixPrompt = ok
    ? ''
    : [
        '影子 CTO 零出错门禁（ghost-cto verify）抓到了以下必须立刻修复的错误，请精准修复对应文件行号，严禁引入未安装包、严禁写空按钮/假保存/空 catch {}，严禁破坏其他正常功能：',
        ...errorLines,
        '修好后请再次运行 `node .vibe/engine/bin/ghost-cto.mjs verify` 直到显示 PASS 为止！'
      ].join('\n');

  const aiCompact = ok
    ? `GHOST_VERIFY_PASS|score:${audit.score}/100|files_checked:${ws.codeFiles.length}|syntax_errors:0|blockers:0`
    : [
        `GHOST_VERIFY_FAIL|score:${audit.score}/100|syntax_errors:${syntaxErrors.length}|blockers:${p0Findings.length}`,
        ...syntaxErrors.map(e => `${e.kind}|${e.file}:${e.line}|${e.message}`),
        ...p0Findings.map(f => `BLOCKER|${f.aiDirective}`)
      ].join('\n');

  return {
    ok,
    filesChecked: ws.codeFiles.length,
    score: audit.score,
    syntaxErrors,
    p0Findings,
    errorLines,
    aiFixPrompt,
    aiCompact
  };
}
