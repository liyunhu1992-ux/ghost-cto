#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { scanWorkspace } from '../kernel/scanner.mjs';
import { buildLineageGraph, formatLineageReport } from '../kernel/lineage-graph.mjs';
import { runRealityAudit, formatAuditReport } from '../kernel/reality-audit.mjs';
import { computeBlastRadius } from '../kernel/blast-radius.mjs';
import { saveCheckpoint, rewindCheckpoint, listCheckpoints } from '../kernel/time-capsule.mjs';
import { writeMemoryCapsule, learnScar, detectRuntimeTopology } from '../kernel/memory-capsule.mjs';
import { generateBossDashboard, generateSelfHealingLaunchers } from '../kernel/boss-dashboard.mjs';
import { buildMasterPromptArsenal, getMasterPromptById, formatPromptArsenalReport } from '../kernel/prompt-arsenal.mjs';
import { installGhostCTO, GHOST_PACKAGE_ROOT } from '../kernel/installer.mjs';
import { startMcpStdioServer } from '../kernel/mcp-server.mjs';
import { runDoctor, runSelfTrial } from '../kernel/doctor.mjs';
import { estimateTokens } from '../kernel/lexer.mjs';

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(token);
    }
  }
  return { positional, flags };
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const cmd = positional[0] || 'help';

function resolveTargetDir(posIndex = 1) {
  return path.resolve(flags.dir || positional[posIndex] || process.cwd());
}

async function main() {
  switch (cmd) {
    case 'init':
    case 'sync': {
      const targetDir = resolveTargetDir(1);
      const res = installGhostCTO(targetDir, {
        createInitialCheckpoint: flags['no-checkpoint'] ? false : true
      });
      console.log(`\n🛡️  GhostCTO（影子 CTO）v1.2.0 已在项目中激活完毕`);
      console.log(`📂 项目目录: ${res.rootDir}`);
      console.log(`📊 商用健康分: ${res.score} / 100 分 （P0致命:${res.p0Count} | P1高危:${res.p1Count} | P2提醒:${res.p2Count}）`);
      console.log(`🚦 上线结论: ${res.launchVerdict}`);
      console.log(`📦 初始时光机存档: ${res.initialCheckpointId || '已就绪'}`);
      console.log(`🧠 跨软件记忆胶囊: .vibe/capsule.md (${res.capsuleTokens} tokens)`);
      console.log(`✨ 大师级提示词库: 已内置 8 套卡兹克/Karpathy 精选指令（自动注入本项目数据表与构建护栏）`);
      console.log(`🖥️  老板可视化驾驶舱: ${res.dashboardPath}`);
      console.log(`🚀 一键自愈启动器: ${res.macLauncherPath}`);
      console.log(`✅ 已同步适配 8 大国内外软件:`);
      for (const p of res.platformsSynced) {
        console.log(`   - ${p}`);
      }
      break;
    }

    case 'doctor': {
      const targetDir = resolveTargetDir(1);
      const doc = await runDoctor(targetDir);
      console.log(`\n🩺 GhostCTO 安装与真机联调自检 (${targetDir}):`);
      for (const c of doc.checks) {
        console.log(`  ${c.ok ? '✔' : '✖'} ${c.name} — ${c.detail}`);
      }
      if (!doc.allPassed) {
        process.exitCode = 1;
      } else {
        console.log(`\n🎉 全部 ${doc.checks.length} 项真机配置、Token 预算与跨进程 MCP 通信测试 100% 通过！`);
      }
      break;
    }

    case 'try': {
      console.log(`🧪 正在你的本机沙箱启动 GhostCTO 全链路真机演练...\n`);
      const res = await runSelfTrial();
      for (const s of res.steps) {
        console.log(`  ✔ ${s}`);
      }
      console.log(`\n🎉 试跑通过！本机所有内核模块、大师提示词引擎、时光机与 MCP 服务均真实可用。`);
      break;
    }

    case 'prompts': {
      const targetDir = resolveTargetDir(1);
      const ws = scanWorkspace(targetDir);
      const audit = runRealityAudit(ws);
      const runtime = detectRuntimeTopology(ws);
      const topic = flags.topic || '';
      if (flags.id && flags.id !== 'all') {
        const single = getMasterPromptById(ws, audit, flags.id, topic);
        console.log(single.prompt);
      } else {
        const list = buildMasterPromptArsenal(ws, audit, topic);
        console.log(formatPromptArsenalReport(list, runtime.projectName));
      }
      break;
    }

    case 'audit': {
      const targetDir = resolveTargetDir(1);
      const ws = scanWorkspace(targetDir);
      const audit = runRealityAudit(ws);
      const formatted = formatAuditReport(audit);
      writeMemoryCapsule(ws, audit);
      generateBossDashboard(ws, audit);
      console.log(flags.ai ? formatted.aiCompact : formatted.founderMarkdown);
      break;
    }

    case 'xray': {
      const targetDir = resolveTargetDir(1);
      const ws = scanWorkspace(targetDir);
      const lineage = buildLineageGraph(ws);
      const formatted = formatLineageReport(lineage);
      console.log(flags.ai ? formatted.aiCompact : formatted.founderMarkdown);
      break;
    }

    case 'impact': {
      const query = positional[1] || flags.query || '';
      const targetDir = path.resolve(flags.dir || positional[2] || process.cwd());
      const ws = scanWorkspace(targetDir);
      const res = computeBlastRadius(ws, query);
      console.log(flags.ai ? res.aiCompact : res.founderMarkdown);
      break;
    }

    case 'save': {
      const label = positional[1] || flags.label || '手动安全存档';
      const targetDir = path.resolve(flags.dir || positional[2] || process.cwd());
      const cp = saveCheckpoint(targetDir, label);
      console.log(`✅ 时光机存档成功！编号: ${cp.id} | 说明: ${cp.label} | 数据库备份数: ${cp.dbSnapshots.length}`);
      break;
    }

    case 'checkpoints': {
      const targetDir = resolveTargetDir(1);
      const list = listCheckpoints(targetDir);
      if (list.length === 0) {
        console.log('暂无时光机存档点。运行 `ghost-cto save "存档说明"` 即可创建。');
      } else {
        for (const item of list) {
          console.log(`${item.id} | ${item.createdAt.slice(0, 19)} | DB:${item.dbCount} | ${item.label}`);
        }
      }
      break;
    }

    case 'rewind': {
      const cpId = positional[1] || flags.id || 'latest';
      const targetDir = path.resolve(flags.dir || positional[2] || process.cwd());
      const res = rewindCheckpoint(targetDir, cpId);
      console.log(`⏪ 已成功回退到存档点 ${res.restoredId}（${res.restoredLabel}）！`);
      if (res.rescueId) {
        console.log(`🛟 回退前的状态也已自动保存在急救存档 ${res.rescueId} 中，绝不丢任何数据。`);
      }
      break;
    }

    case 'learn': {
      const targetDir = path.resolve(flags.dir || process.cwd());
      const scar = learnScar(targetDir, {
        symptom: flags.symptom || positional[1] || '历史踩坑记录',
        rootCause: flags.cause || 'AI改动回归',
        rule: flags.rule || positional[2] || '禁止破坏既有接口与数据库契约',
        pattern: flags.pattern || '',
        fileHint: flags.file || ''
      });
      console.log(`🧬 已写入项目永久免疫铁律 [${scar.id}]: ${scar.rule}`);
      break;
    }

    case 'dashboard':
    case 'launcher': {
      const targetDir = resolveTargetDir(1);
      const ws = scanWorkspace(targetDir);
      const audit = runRealityAudit(ws);
      writeMemoryCapsule(ws, audit);
      const dash = generateBossDashboard(ws, audit);
      const launch = generateSelfHealingLaunchers(ws);
      console.log(`🖥️  已更新老板全景驾驶舱: ${dash.rootOutPath}`);
      console.log(`🚀 已更新双击自愈启动器: ${launch.macPath}`);
      break;
    }

    case 'budget': {
      const agentsPath = path.join(GHOST_PACKAGE_ROOT, 'plugin', 'rules', 'AGENTS.md');
      const agentsTokens = estimateTokens(fs.readFileSync(agentsPath, 'utf8'));
      const skillsDir = path.join(GHOST_PACKAGE_ROOT, 'plugin', 'skills');
      const skillEntries = fs.readdirSync(skillsDir, { withFileTypes: true }).filter(d => d.isDirectory());

      console.log(`💰 GhostCTO Token 经济学预算审计（KV Prefix Cache 90% 折扣验证）`);
      console.log(`- 常驻路由 AGENTS.md: ${agentsTokens} tokens (上限阈值 < 420 tokens) -> ${agentsTokens < 420 ? '✅ 极速缓存达标' : '❌ 超标'}`);
      for (const dir of skillEntries) {
        const skPath = path.join(skillsDir, dir.name, 'SKILL.md');
        const tok = estimateTokens(fs.readFileSync(skPath, 'utf8'));
        console.log(`- 按需技能 ${dir.name}/SKILL.md: ${tok} tokens (上限阈值 < 500 tokens) -> ${tok < 500 ? '✅ 达标' : '❌ 超标'}`);
      }
      break;
    }

    case 'mcp': {
      const targetDir = path.resolve(flags.dir || process.cwd());
      startMcpStdioServer(targetDir);
      break;
    }

    default: {
      console.log(`
GhostCTO (影子 CTO) v1.2.0 — 不懂代码做产品的防忽悠、防改崩「影子 CTO」

常用命令:
  ghost-cto try                        在本机跑一遍 1 秒全自动真机试跑（验证全部 6 大内核模块）
  ghost-cto init [项目目录]            一键激活 8 大国内外软件(WorkBuddy/豆包/Trae/Antigravity/Cursor等) + 生成驾驶舱
  ghost-cto doctor [项目目录]          真机验证已安装项目的 8 大平台配置与跨进程 MCP 通信是否畅通
  ghost-cto prompts [项目目录]         导出自动注入本项目家底的 8 套大师级提示词（卡兹克 & Karpathy 精选）
  ghost-cto audit [项目目录] [--ai]    0-Token 扫描假落库、假开关、空吞错、裸奔后台与断头接口
  ghost-cto xray [项目目录] [--ai]     0-Token 绘制 UI -> API -> 数据库 3D 真假穿透图
  ghost-cto impact <关键词>            改代码前锁定最小修改爆炸半径（支持直接搜中文按钮名）
  ghost-cto save "存档说明"            同时备份 Git 代码 + SQLite 数据库（双轨时光机）
  ghost-cto rewind [存档编号]          一键后悔药：把代码和数据库一起退回好状态
  ghost-cto dashboard [项目目录]       重新生成《老板全景驾驶舱.html》与《双击启动项目》
  ghost-cto mcp                        启动零依赖 Stdio MCP 服务（供豆包桌面版/WorkBuddy/Trae/Cursor调用）
`);
      break;
    }
  }
}

main().catch(err => {
  console.error(`❌ GhostCTO 执行提示: ${err.message || String(err)}`);
  process.exitCode = 1;
});
