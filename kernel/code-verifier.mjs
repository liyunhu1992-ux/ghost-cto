import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { scanWorkspace } from './scanner.mjs';
import { runRealityAudit } from './reality-audit.mjs';

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
      // Strip top-level ES module import/export keywords lightly if type="module" for vm.Script check
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

function checkJsonFiles(absRoot) {
  const errors = [];
  const candidates = ['package.json', 'tsconfig.json'];
  for (const rel of candidates) {
    const p = path.join(absRoot, rel);
    if (!fs.existsSync(p)) continue;
    try {
      JSON.parse(fs.readFileSync(p, 'utf8'));
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

/**
 * Deterministic 0-Token Compiler & Reality Verification Gate (`ghost-cto verify`).
 * Catches JS syntax errors, HTML <script> syntax errors, broken JSON, 404 dead API contracts,
 * and fake in-memory persistence BEFORE the beginner ever opens the browser!
 */
export function verifyWorkspaceCode(targetRootDir) {
  const absRoot = path.resolve(targetRootDir);
  const ws = scanWorkspace(absRoot);
  const syntaxErrors = [...checkJsonFiles(absRoot)];

  for (const f of ws.codeFiles) {
    if (['.js', '.mjs', '.cjs'].includes(f.ext)) {
      const err = checkJsSyntax(f.absPath, f.relPath);
      if (err) syntaxErrors.push(err);
    } else if (f.ext === '.html') {
      const htmlErrs = checkHtmlInlineScripts(f.absPath, f.relPath);
      syntaxErrors.push(...htmlErrs);
    }
  }

  const audit = runRealityAudit(ws);
  const p0Findings = audit.findings.filter(f => f.severity === 'P0');

  const ok = syntaxErrors.length === 0 && p0Findings.length === 0;

  const errorLines = [
    ...syntaxErrors.map(
      e => `❌ [代码语法错误] ${e.file}:${e.line} — ${e.message}`
    ),
    ...p0Findings.map(
      f => `🔴 [致命假功能/断头路] ${f.file}:${f.line} — ${f.title}`
    )
  ];

  const aiFixPrompt = ok
    ? ''
    : [
        '影子 CTO 零出错门禁（ghost-cto verify）抓到了以下必须立刻修复的错误，请精准修复对应文件行号，严禁破坏其他正常功能：',
        ...errorLines,
        '修好后请再次运行 `node .vibe/engine/bin/ghost-cto.mjs verify` 直到显示 PASS 为止！'
      ].join('\n');

  const aiCompact = ok
    ? `GHOST_VERIFY_PASS|score:${audit.score}/100|files_checked:${ws.codeFiles.length}|syntax_errors:0|p0_blockers:0`
    : [
        `GHOST_VERIFY_FAIL|score:${audit.score}/100|syntax_errors:${syntaxErrors.length}|p0_blockers:${p0Findings.length}`,
        ...syntaxErrors.map(e => `SYNTAX_ERR|${e.file}:${e.line}|${e.message}`),
        ...p0Findings.map(f => `P0_BLOCKER|${f.aiDirective}`)
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
