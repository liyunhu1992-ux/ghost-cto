import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanWorkspace } from './scanner.mjs';
import { runRealityAudit, formatAuditReport } from './reality-audit.mjs';
import { formatLineageReport } from './lineage-graph.mjs';
import { saveCheckpoint, listCheckpoints } from './time-capsule.mjs';
import { writeMemoryCapsule } from './memory-capsule.mjs';
import { generateBossDashboard, generateSelfHealingLaunchers } from './boss-dashboard.mjs';

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
 * Install & synchronize GhostCTO across ALL 8 Domestic & Overseas AI Coding Tools:
 * - 腾讯 WorkBuddy (.workbuddy/)
 * - 腾讯 CodeBuddy (.codebuddy/)
 * - 字节 豆包编程 / Trae IDE (.trae/ + 豆包桌面版 MCP 配置)
 * - Google Antigravity (.agents/plugins/ghost-cto/ + AGENTS.md)
 * - Cursor (.cursor/)
 * - Claude Code (CLAUDE.md + .claude/ + .mcp.json)
 * - Windsurf (.windsurf/)
 * - OpenAI Codex / Universal (AGENTS.md)
 */
export function installGhostCTO(targetRootDir, options = {}) {
  const absTarget = path.resolve(targetRootDir);
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

  // Create lightweight Stop-hook helper script
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

  // Relative MCP command (portable across machines) & Absolute MCP command (for desktop chat apps like 豆包桌面版)
  const portableMcpJson = JSON.stringify(
    {
      mcpServers: {
        'ghost-cto': {
          command: 'node',
          args: ['.vibe/engine/bin/ghost-cto.mjs', 'mcp']
        }
      }
    },
    null,
    2
  );

  const absoluteMcpJson = JSON.stringify(
    {
      mcpServers: {
        'ghost-cto': {
          command: 'node',
          args: [path.join(vendoredEngineDir, 'bin', 'ghost-cto.mjs'), 'mcp', '--dir', absTarget]
        }
      }
    },
    null,
    2
  );

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
  fs.writeFileSync(path.join(absTarget, '.workbuddy', 'mcp.json'), portableMcpJson + '\n', 'utf8');

  // 4. 腾讯 CodeBuddy (`.codebuddy/CODEBUDDY.md`, `.codebuddy/rules/ghost-cto.md`, `.codebuddy/skills/`, `.codebuddy/mcp.json`)
  fs.mkdirSync(path.join(absTarget, '.codebuddy', 'rules'), { recursive: true });
  fs.writeFileSync(path.join(absTarget, '.codebuddy', 'CODEBUDDY.md'), agentsRuleText, 'utf8');
  fs.writeFileSync(
    path.join(absTarget, '.codebuddy', 'rules', 'ghost-cto.md'),
    `---\ndescription: 影子CTO零代码创始人保护协议\nalwaysApply: true\nenabled: true\n---\n\n${agentsRuleText}`,
    'utf8'
  );
  copyDirRecursive(skillsSrcDir, path.join(absTarget, '.codebuddy', 'skills'));
  fs.writeFileSync(path.join(absTarget, '.codebuddy', 'mcp.json'), portableMcpJson + '\n', 'utf8');

  // 5. 字节跳动 豆包编程助手 / Trae IDE (`.trae/rules/project_rules.md`, `.trae/skills/`, `.trae/mcp.json` + 豆包桌面版配置)
  fs.mkdirSync(path.join(absTarget, '.trae', 'rules'), { recursive: true });
  fs.writeFileSync(path.join(absTarget, '.trae', 'rules', 'project_rules.md'), agentsRuleText, 'utf8');
  copyDirRecursive(skillsSrcDir, path.join(absTarget, '.trae', 'skills'));
  fs.writeFileSync(path.join(absTarget, '.trae', 'mcp.json'), portableMcpJson + '\n', 'utf8');
  fs.writeFileSync(
    path.join(absTarget, '.vibe', '豆包桌面版与WorkBuddy_MCP配置.json'),
    absoluteMcpJson + '\n',
    'utf8'
  );

  // 6. Google Antigravity Native Workspace Plugin (`.agents/plugins/ghost-cto/`)
  const agyPluginDest = path.join(absTarget, '.agents', 'plugins', 'ghost-cto');
  copyDirRecursive(pluginSrc, agyPluginDest);
  fs.writeFileSync(path.join(agyPluginDest, '.mcp.json'), portableMcpJson + '\n', 'utf8');

  // 7. Cursor (`.cursor/rules/ghost-cto.mdc` + `.cursor/mcp.json`)
  fs.mkdirSync(path.join(absTarget, '.cursor', 'rules'), { recursive: true });
  fs.writeFileSync(
    path.join(absTarget, '.cursor', 'rules', 'ghost-cto.mdc'),
    `---\ndescription: GhostCTO Founder Reality & Blast-Radius Guard\nglobs: "*"\nalwaysApply: true\n---\n\n${agentsRuleText}`,
    'utf8'
  );
  fs.writeFileSync(path.join(absTarget, '.cursor', 'mcp.json'), portableMcpJson + '\n', 'utf8');

  // 8. Claude Code (`CLAUDE.md` pointer + `.claude/skills/` + `.mcp.json`)
  const claudeMdPath = path.join(absTarget, 'CLAUDE.md');
  if (!fs.existsSync(claudeMdPath)) {
    fs.writeFileSync(claudeMdPath, `@AGENTS.md\n`, 'utf8');
  }
  copyDirRecursive(skillsSrcDir, path.join(absTarget, '.claude', 'skills'));
  fs.writeFileSync(path.join(absTarget, '.mcp.json'), portableMcpJson + '\n', 'utf8');

  // 9. Windsurf (`.windsurf/rules/ghost-cto.md`)
  fs.mkdirSync(path.join(absTarget, '.windsurf', 'rules'), { recursive: true });
  fs.writeFileSync(path.join(absTarget, '.windsurf', 'rules', 'ghost-cto.md'), agentsRuleText, 'utf8');

  // 10. Create initial Git+SQLite checkpoint (if none exists yet), run full Reality Audit, write Capsule, Boss Dashboard & Launchers!
  let initialCheckpoint = null;
  if (options.createInitialCheckpoint !== false && listCheckpoints(absTarget).length === 0) {
    initialCheckpoint = saveCheckpoint(absTarget, '接入影子CTO初始安全存档');
  }

  const ws = scanWorkspace(absTarget);
  const audit = runRealityAudit(ws);
  const auditReports = formatAuditReport(audit);
  const lineageReports = formatLineageReport(audit.lineage);

  fs.writeFileSync(path.join(absTarget, '.vibe', '体检报告.md'), auditReports.founderMarkdown + '\n', 'utf8');
  fs.writeFileSync(path.join(absTarget, '.vibe', '全栈真假穿透图.md'), lineageReports.founderMarkdown + '\n', 'utf8');

  const capsuleInfo = writeMemoryCapsule(ws, audit);
  const dashboardInfo = generateBossDashboard(ws, audit);
  const launcherInfo = generateSelfHealingLaunchers(ws);

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
    winLauncherPath: launcherInfo.winPath,
    initialCheckpointId: initialCheckpoint ? initialCheckpoint.id : listCheckpoints(absTarget)[0]?.id || null,
    platformsSynced: [
      '腾讯 WorkBuddy (.workbuddy/)',
      '腾讯 CodeBuddy (.codebuddy/)',
      '字节 豆包编程 / Trae (.trae/ + 豆包MCP)',
      'Google Antigravity (.agents/plugins/ghost-cto/)',
      'Cursor (.cursor/)',
      'Claude Code (CLAUDE.md + .claude/)',
      'Windsurf (.windsurf/)',
      'OpenAI Codex (AGENTS.md)'
    ]
  };
}
