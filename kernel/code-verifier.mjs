import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { scanWorkspace } from './scanner.mjs';
import { runRealityAudit } from './reality-audit.mjs';
import {
  buildExportIndex,
  checkModuleLinksAndPackages,
  checkSqlColumnConsistency
} from './sql-and-links-check.mjs';

const BLOCKING_AUDIT_IDS = new Set([
  'FAKE_UI_HANDLER',
  'FAKE_CLIENT_ONLY_SAVE',
  'SILENT_CATCH',
  'UNSAFE_PROXY_STREAM',
  'PLAINTEXT_PASSWORD_DB'
]);

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
  } catch (err) {
    if (process.env.GHOST_DEBUG) console.warn('[blueprint-contract]', err.message);
  }
  return [];
}

/**
 * Deterministic 0-Token Compiler, Linker, SQL Schema & Reality Verification Gate (`ghost-cto verify`).
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
