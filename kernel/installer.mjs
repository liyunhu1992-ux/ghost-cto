import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanWorkspace } from './scanner.mjs';
import { runRealityAudit, formatAuditReport } from './reality-audit.mjs';
import { formatLineageReport } from './lineage-graph.mjs';
import { saveCheckpoint, listCheckpoints } from './time-capsule.mjs';
import { writeMemoryCapsule, detectRuntimeTopology } from './memory-capsule.mjs';
import { generateBossDashboard, generateSelfHealingLaunchers } from './boss-dashboard.mjs';
import { buildMasterPromptArsenal, formatPromptArsenalReport } from './prompt-arsenal.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const GHOST_PACKAGE_ROOT = path.resolve(__dirname, '..');

function copyDirRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(s, d);
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
}

/**
 * Safely merge `ghost-cto` into an existing `mcp.json` / `mcp_config.json`
 * without wiping out any other MCP servers (e.g. figma, mobbin, supabase) the user already configured.
 */
function upsertMcpJsonFile(filePath, serverEntry) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let base = {};
  if (fs.existsSync(filePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        base = parsed;
      }
    } catch {
      base = {};
    }
  }
  if (!base.mcpServers || typeof base.mcpServers !== 'object' || Array.isArray(base.mcpServers)) {
    base.mcpServers = {};
  }
  base.mcpServers['ghost-cto'] = serverEntry;
  fs.writeFileSync(filePath, JSON.stringify(base, null, 2) + '\n', 'utf8');
}

/**
 * Install & synchronize GhostCTO across ALL 8 Domestic & Overseas AI Coding Tools:
 * - 腾讯 WorkBuddy (.workbuddy/)
 * - 腾讯 CodeBuddy (.codebuddy/)
 * - 字节 豆包编程 / Trae IDE (.trae/ + 豆包桌面版 MCP 配置)
 * - Google Antigravity (.agents/skills/ + .agents/plugins/ghost-cto/ + AGENTS.md)
 * - Cursor (.cursor/)
 * - Claude Code (CLAUDE.md + .claude/ + .mcp.json)
 * - Windsurf (.windsurf/)
 * - OpenAI Codex / Universal (AGENTS.md)
 */
export function installGhostCTO(targetRootDir, options = {}) {
  const absTarget = path.resolve(targetRootDir);
  if (absTarget === GHOST_PACKAGE_ROOT && !options.allowSelf) {
    throw new Error(
      '温馨提示：当前目录是 GhostCTO（影子 CTO）工具本身的安装器源码目录，请勿把业务项目直接混写在这里。\n' +
        '👉 新手做新产品：请直接双击「1-双击新建我的空白项目.command」（苹果）或「.bat」（Windows），自动在桌面为您创建干净新项目！\n' +
        '👉 保护已有项目：请双击「2-双击接入已有老项目.command」（苹果）或「.bat」（Windows）选择您的项目文件夹！'
    );
  }
  fs.mkdirSync(absTarget, { recursive: true });

  const pluginSrc = path.join(GHOST_PACKAGE_ROOT, 'plugin');
  const agentsRuleText = fs.readFileSync(path.join(pluginSrc, 'rules', 'AGENTS.md'), 'utf8');
  const skillsSrcDir = path.join(pluginSrc, 'skills');

  // 1. Vendor zero-dependency self-contained engine into `.vibe/engine/` so MCP & CLI run 100% offline with 0 popups
  const vendoredEngineDir = path.join(absTarget, '.vibe', 'engine');
  copyDirRecursive(path.join(GHOST_PACKAGE_ROOT, 'kernel'), path.join(vendoredEngineDir, 'kernel'));
  copyDirRecursive(path.join(GHOST_PACKAGE_ROOT, 'bin'), path.join(vendoredEngineDir, 'bin'));
  copyDirRecursive(pluginSrc, path.join(vendoredEngineDir, 'plugin'));
  fs.copyFileSync(path.join(GHOST_PACKAGE_ROOT, 'package.json'), path.join(vendoredEngineDir, 'package.json'));

  const vendoredBinAbs = path.join(vendoredEngineDir, 'bin', 'ghost-cto.mjs');
  try {
    fs.chmodSync(vendoredBinAbs, 0o755);
  } catch {
    // ignore
  }

  // Create Stop-hook helper script
  const hookScriptPath = path.join(absTarget, '.vibe', 'ghost-hook-check.mjs');
  fs.writeFileSync(
    hookScriptPath,
    `import { scanWorkspace } from './engine/kernel/scanner.mjs';\n` +
      `import { runRealityAudit } from './engine/kernel/reality-audit.mjs';\n` +
      `import { writeMemoryCapsule } from './engine/kernel/memory-capsule.mjs';\n` +
      `import { generateBossDashboard } from './engine/kernel/boss-dashboard.mjs';\n` +
      `const ws = scanWorkspace(process.cwd());\n` +
      `const audit = runRealityAudit(ws);\n` +
      `writeMemoryCapsule(ws, audit);\n` +
      `generateBossDashboard(ws, audit);\n`,
    'utf8'
  );

  // Use cwd-independent absolute engine + target paths so IDEs spawning from $HOME or / never fail!
  const ghostServerEntry = {
    command: 'node',
    args: [vendoredBinAbs, 'mcp', '--dir', absTarget]
  };

  // 2. Universal / Codex / Antigravity Root `AGENTS.md` (100% byte-immutable for 90% KV Prefix Cache discount!)
  fs.writeFileSync(path.join(absTarget, 'AGENTS.md'), agentsRuleText, 'utf8');

  // 3. 腾讯 WorkBuddy (`.workbuddy/skills/`, `.workbuddy/rules/ghost-cto.md`, `.workbuddy/mcp.json`)
  copyDirRecursive(skillsSrcDir, path.join(absTarget, '.workbuddy', 'skills'));
  fs.mkdirSync(path.join(absTarget, '.workbuddy', 'rules'), { recursive: true });
  fs.writeFileSync(
    path.join(absTarget, '.workbuddy', 'rules', 'ghost-cto.md'),
    `---\ndescription: 影子CTO零代码创始人保护协议\nalwaysApply: true\nenabled: true\n---\n\n${agentsRuleText}`,
    'utf8'
  );
  upsertMcpJsonFile(path.join(absTarget, '.workbuddy', 'mcp.json'), ghostServerEntry);

  // 4. 腾讯 CodeBuddy (`.codebuddy/CODEBUDDY.md`, `.codebuddy/rules/ghost-cto.md`, `.codebuddy/skills/`, `.codebuddy/mcp.json`)
  fs.mkdirSync(path.join(absTarget, '.codebuddy', 'rules'), { recursive: true });
  fs.writeFileSync(path.join(absTarget, '.codebuddy', 'CODEBUDDY.md'), agentsRuleText, 'utf8');
  fs.writeFileSync(
    path.join(absTarget, '.codebuddy', 'rules', 'ghost-cto.md'),
    `---\ndescription: 影子CTO零代码创始人保护协议\nalwaysApply: true\nenabled: true\n---\n\n${agentsRuleText}`,
    'utf8'
  );
  copyDirRecursive(skillsSrcDir, path.join(absTarget, '.codebuddy', 'skills'));
  upsertMcpJsonFile(path.join(absTarget, '.codebuddy', 'mcp.json'), ghostServerEntry);

  // 5. 字节跳动 豆包编程助手 / Trae IDE (`.trae/rules/project_rules.md`, `.trae/skills/`, `.trae/mcp.json` + 豆包桌面版配置)
  fs.mkdirSync(path.join(absTarget, '.trae', 'rules'), { recursive: true });
  fs.writeFileSync(path.join(absTarget, '.trae', 'rules', 'project_rules.md'), agentsRuleText, 'utf8');
  copyDirRecursive(skillsSrcDir, path.join(absTarget, '.trae', 'skills'));
  upsertMcpJsonFile(path.join(absTarget, '.trae', 'mcp.json'), ghostServerEntry);
  upsertMcpJsonFile(path.join(absTarget, '.vibe', '豆包桌面版与WorkBuddy_MCP配置.json'), ghostServerEntry);

  // 6. Google Antigravity Native Workspace Skills + Plugin (`.agents/skills/` + `.agents/plugins/ghost-cto/`)
  copyDirRecursive(skillsSrcDir, path.join(absTarget, '.agents', 'skills'));
  const agyPluginDest = path.join(absTarget, '.agents', 'plugins', 'ghost-cto');
  copyDirRecursive(pluginSrc, agyPluginDest);
  upsertMcpJsonFile(path.join(agyPluginDest, 'mcp_config.json'), ghostServerEntry);

  // 7. Cursor (`.cursor/rules/ghost-cto.mdc` + `.cursor/mcp.json`)
  fs.mkdirSync(path.join(absTarget, '.cursor', 'rules'), { recursive: true });
  fs.writeFileSync(
    path.join(absTarget, '.cursor', 'rules', 'ghost-cto.mdc'),
    `---\ndescription: GhostCTO Founder Reality & Blast-Radius Guard\nglobs: "*"\nalwaysApply: true\n---\n\n${agentsRuleText}`,
    'utf8'
  );
  upsertMcpJsonFile(path.join(absTarget, '.cursor', 'mcp.json'), ghostServerEntry);

  // 8. Claude Code (`CLAUDE.md` pointer + `.claude/skills/` + `.mcp.json`)
  const claudeMdPath = path.join(absTarget, 'CLAUDE.md');
  if (!fs.existsSync(claudeMdPath)) {
    fs.writeFileSync(claudeMdPath, `@AGENTS.md\n`, 'utf8');
  }
  copyDirRecursive(skillsSrcDir, path.join(absTarget, '.claude', 'skills'));
  upsertMcpJsonFile(path.join(absTarget, '.mcp.json'), ghostServerEntry);

  // 9. Windsurf (`.windsurf/rules/ghost-cto.md` + `.windsurf/mcp_config.json`)
  fs.mkdirSync(path.join(absTarget, '.windsurf', 'rules'), { recursive: true });
  fs.writeFileSync(path.join(absTarget, '.windsurf', 'rules', 'ghost-cto.md'), agentsRuleText, 'utf8');
  upsertMcpJsonFile(path.join(absTarget, '.windsurf', 'mcp_config.json'), ghostServerEntry);

  // 10. Create initial Git+SQLite checkpoint (if none exists yet), run full Reality Audit, write Capsule, Boss Dashboard & Launchers!
  let initialCheckpoint = null;
  if (options.createInitialCheckpoint !== false && listCheckpoints(absTarget).length === 0) {
    initialCheckpoint = saveCheckpoint(absTarget, '接入影子CTO初始安全存档');
  }

  const ws = scanWorkspace(absTarget);
  const audit = runRealityAudit(ws);
  const auditReports = formatAuditReport(audit);
  const lineageReports = formatLineageReport(audit.lineage);
  const runtime = detectRuntimeTopology(ws);
  const masterPrompts = buildMasterPromptArsenal(ws, audit, '');

  fs.writeFileSync(path.join(absTarget, '.vibe', '体检报告.md'), auditReports.founderMarkdown + '\n', 'utf8');
  fs.writeFileSync(path.join(absTarget, '.vibe', '全栈真假穿透图.md'), lineageReports.founderMarkdown + '\n', 'utf8');
  fs.writeFileSync(
    path.join(absTarget, '.vibe', '大师级提示词库.md'),
    formatPromptArsenalReport(masterPrompts, runtime.projectName) + '\n',
    'utf8'
  );

  const capsuleInfo = writeMemoryCapsule(ws, audit);
  const dashboardInfo = generateBossDashboard(ws, audit);
  const launcherInfo = generateSelfHealingLaunchers(ws);
  installGitPreCommitGuard(absTarget);

  return {
    rootDir: absTarget,
    score: audit.score,
    p0Count: audit.p0Count,
    p1Count: audit.p1Count,
    p2Count: audit.p2Count,
    launchVerdict: audit.launchVerdict,
    capsuleTokens: capsuleInfo.tokens,
    dashboardPath: dashboardInfo.rootOutPath,
    macLauncherPath: launcherInfo.macPath,
    liveCockpitMacPath: launcherInfo.liveMacPath,
    winLauncherPath: launcherInfo.winPath,
    initialCheckpointId: initialCheckpoint ? initialCheckpoint.id : listCheckpoints(absTarget)[0]?.id || null,
    platformsSynced: [
      '腾讯 WorkBuddy (.workbuddy/)',
      '腾讯 CodeBuddy (.codebuddy/)',
      '字节 豆包编程 / Trae (.trae/ + 豆包MCP)',
      'Google Antigravity (.agents/skills/ + .agents/plugins/ghost-cto/)',
      'Cursor (.cursor/)',
      'Claude Code (CLAUDE.md + .claude/)',
      'Windsurf (.windsurf/)',
      'OpenAI Codex (AGENTS.md)'
    ]
  };
}

/**
 * Non-destructively install a Git pre-commit secret-leak guard (`.git/hooks/pre-commit`)
 * so beginners never accidentally push `.env` files or hardcoded API keys to GitHub.
 */
function installGitPreCommitGuard(absTarget) {
  const hooksDir = path.join(absTarget, '.git', 'hooks');
  if (!fs.existsSync(hooksDir)) return;

  const hookPath = path.join(hooksDir, 'pre-commit');
  const marker = '# GhostCTO Pre-Commit Secret Guard';
  if (fs.existsSync(hookPath)) {
    try {
      const existing = fs.readFileSync(hookPath, 'utf8');
      if (!existing.includes(marker)) {
        // Respect existing user/Husky pre-commit hooks cleanly
        return;
      }
    } catch {
      return;
    }
  }

  const script = `#!/bin/sh
${marker}
if [ -f ".vibe/engine/bin/ghost-cto.mjs" ]; then
  node ".vibe/engine/bin/ghost-cto.mjs" precommit-check --dir "$(pwd)"
fi
`;
  fs.writeFileSync(hookPath, script, { encoding: 'utf8', mode: 0o755 });
  try {
    fs.chmodSync(hookPath, 0o755);
  } catch {
    // ignore
  }
}

/**
 * Create a brand-new, 100% clean beginner workspace folder (defaulting to ~/Desktop/<name>)
 * pre-wired with GhostCTO's 8-IDE rules, skills, offline MCP engine, and Git safety net!
 */
export function createCleanBeginnerProject(rawProjectName = '我的第一个AI作品', parentDir = '') {
  const safeName = String(rawProjectName || '我的第一个AI作品')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/^\.+/, '')
    .trim() || '我的第一个AI作品';

  const baseDir = parentDir
    ? path.resolve(parentDir)
    : path.join(process.env.HOME || process.env.USERPROFILE || process.cwd(), 'Desktop');
  fs.mkdirSync(baseDir, { recursive: true });

  const projectDir = path.join(baseDir, safeName);
  fs.mkdirSync(projectDir, { recursive: true });

  const res = installGhostCTO(projectDir);
  return {
    projectName: safeName,
    projectDir,
    ...res
  };
}
