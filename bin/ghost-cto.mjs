#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { scanWorkspace } from '../kernel/scanner.mjs';
import { buildLineageGraph, formatLineageReport } from '../kernel/lineage-graph.mjs';
import { runRealityAudit, formatAuditReport, SECRET_PATTERNS } from '../kernel/reality-audit.mjs';
import { computeBlastRadius } from '../kernel/blast-radius.mjs';
import { saveCheckpoint, rewindCheckpoint, listCheckpoints } from '../kernel/time-capsule.mjs';
import { writeMemoryCapsule, learnScar, detectRuntimeTopology } from '../kernel/memory-capsule.mjs';
import { generateBossDashboard, generateSelfHealingLaunchers } from '../kernel/boss-dashboard.mjs';
import { buildMasterPromptArsenal, getMasterPromptById, formatPromptArsenalReport } from '../kernel/prompt-arsenal.mjs';
import { installGhostCTO, createCleanBeginnerProject, GHOST_PACKAGE_ROOT } from '../kernel/installer.mjs';
import { startMcpStdioServer } from '../kernel/mcp-server.mjs';
import { startLiveCockpitServer } from '../kernel/live-server.mjs';
import { runDoctor, runSelfTrial } from '../kernel/doctor.mjs';
import { analyzeSource, estimateTokens } from '../kernel/lexer.mjs';
import { saveIdeaBlueprint } from '../kernel/idea-incubator.mjs';
import { bootstrapGoldenApp } from '../kernel/golden-scaffold.mjs';
import { verifyWorkspaceCode } from '../kernel/code-verifier.mjs';

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
    case 'create':
    case 'new': {
      const name = positional[1] || flags.name || '我的第一个AI作品';
      const parentDir = flags.parent || positional[2] || '';
      const res = createCleanBeginnerProject(name, parentDir);
      console.log(`\n🎉 已为您创建干净的新项目并装好影子 CTO 保护护栏！`);
      console.log(`📂 新项目路径: ${res.projectDir}`);
      console.log(`👉 下一步（无需背任何复杂提示词）：`);
      console.log(`   1. 打开 豆包 / Trae / 腾讯 WorkBuddy / Cursor，点击「打开文件夹」选中：${res.projectDir}`);
      console.log(`   2. 在聊天框直接用大白话告诉 AI 你想做什么（哪怕只有几个字）即可开始！\n`);
      break;
    }

    case 'init':
    case 'sync': {
      const targetDir = resolveTargetDir(1);
      const res = installGhostCTO(targetDir, {
        createInitialCheckpoint: flags['no-checkpoint'] ? false : true,
        allowSelf: Boolean(flags['allow-self'])
      });
      console.log(`\n🛡️  GhostCTO（影子 CTO）v2.0.0 已在项目中激活完毕`);
      console.log(`📂 项目目录: ${res.rootDir}`);
      console.log(`🚦 当前状态: ${res.launchVerdict}`);
      console.log(`📦 初始时光机存档: ${res.initialCheckpointId || '已就绪'}`);
      console.log(`🧠 跨软件记忆胶囊: .vibe/capsule.md (${res.capsuleTokens} tokens)`);
      console.log(`📄 离线体检报告: ${res.dashboardPath}`);
      console.log(`🚀 双击启动项目: ${res.macLauncherPath}`);
      console.log(`✅ 已同步适配 8 大国内外软件（含 Git 提交防泄密门禁）:`);
      for (const p of res.platformsSynced) {
        console.log(`   - ${p}`);
      }
      break;
    }

    case 'studio':
    case 'serve':
    case 'ui': {
      const targetDir = resolveTargetDir(1);
      const portFlag = flags.port ? Number(flags.port) : 9777;
      const info = await startLiveCockpitServer(targetDir, {
        port: portFlag,
        openBrowser: flags['no-open'] ? false : true
      });
      console.log(`\n⚡ GhostCTO 0-Token 实时交互驾驶舱已启动！`);
      console.log(`🌐 访问地址: ${info.url}`);
      console.log(`📂 守护项目: ${targetDir}`);
      console.log(`（支持网页直接点击：0-Token 重新体检 / 一键备份代码+数据库 / 一键秒回退 / 中文按钮影响反查）`);
      console.log(`（按 Ctrl+C 即可停止本驾驶舱窗口）\n`);
      break;
    }

    case 'precommit-check': {
      const targetDir = resolveTargetDir(1);
      let stagedOut = '';
      try {
        stagedOut = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
          cwd: targetDir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
      } catch {
        break;
      }
      if (!stagedOut) break;

      const stagedFiles = stagedOut.split('\n').map(s => s.trim()).filter(Boolean);
      const blocked = [];

      for (const rel of stagedFiles) {
        const base = path.basename(rel);
        if (base === '.env' || (base.startsWith('.env.') && base !== '.env.example')) {
          blocked.push(`- [${rel}] 私密配置文件 (.env) 被意外加入提交，上传会导致全套密码泄密！`);
          continue;
        }
        // Skip vendored engine or test fixtures
        if (rel.startsWith('.vibe/') || /(^|\/)(test|tests|__tests__)\//.test(rel)) continue;
        const ext = path.extname(rel).toLowerCase();
        if (!['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.py', '.html', '.json'].includes(ext)) {
          continue;
        }
        const absFile = path.join(targetDir, rel);
        if (!fs.existsSync(absFile)) continue;
        try {
          const raw = fs.readFileSync(absFile, 'utf8');
          const lex = analyzeSource(raw, ext === '.json' ? '.js' : ext);
          for (const s of lex.strings) {
            for (const pat of SECRET_PATTERNS) {
              if (pat.re.test(s.value)) {
                blocked.push(`- [${rel}:${s.line}] 检测到硬编码真实密钥（${pat.name}）！`);
              }
            }
          }
        } catch {
          // ignore unreadable binary
        }
      }

      if (blocked.length > 0) {
        console.error(`\n🛑 【影子 CTO (GhostCTO) 防泄密急刹车】已为您自动拦截本次危险的 Git 提交！`);
        console.error(`发现以下一旦上传就会被黑客盗刷的敏感信息：`);
        for (const line of blocked) console.error(`  ${line}`);
        console.error(`\n👉 解决办法：请让 AI 把密钥移到 .env 环境变量中并加入 .gitignore，再重新提交。\n`);
        process.exitCode = 1;
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

    case 'incubate': {
      const idea = positional[1] || '';
      const targetDir = resolveTargetDir(2);
      const bp = saveIdeaBlueprint(targetDir, idea, {
        audience: flags.audience || 'self',
        platform: flags.platform || '',
        miniprogram: Boolean(flags.miniprogram)
      });
      console.log(bp.blueprintMarkdown);
      console.log(`\n✅ 清晰产品施工蓝图已写入: ${bp.mdPath}`);
      break;
    }

    case 'bootstrap': {
      const idea = positional[1] || '';
      const targetDir = resolveTargetDir(2);
      const out = bootstrapGoldenApp(targetDir, idea, {
        audience: flags.audience || 'self',
        platform: flags.platform || '',
        miniprogram: Boolean(flags.miniprogram)
      });
      console.log(`\n${out.message}`);
      console.log(`📄 产品施工蓝图: ${out.blueprint.mdPath}`);
      if (out.scaffolded) {
        console.log(`📦 初始防崩存档: ${out.checkpointId}`);
        if (out.miniProgram) {
          console.log(`📱 微信小程序原生目录: ${out.miniProgramDir}（可直接免费导入微信开发者工具）`);
        }
        console.log(`🚀 现在直接双击项目里的「双击启动项目.command / .bat」就能立刻体验真落库应用！\n`);
      }
      break;
    }

    case 'verify': {
      const targetDir = resolveTargetDir(1);
      const ver = verifyWorkspaceCode(targetDir);
      const isOk = flags['syntax-only'] ? ver.syntaxErrors.length === 0 : ver.ok;
      if (flags.ai) {
        console.log(ver.aiCompact);
      } else if (isOk) {
        console.log(`✅ 零出错编译与真假门禁全绿通过！(已检查 ${ver.filesChecked} 个源码文件，0 编译错误，商用健康分 ${ver.score}/100)`);
      } else {
        console.error(`\n🛑 零出错门禁抓到 ${ver.syntaxErrors.length} 处代码/依赖/SQL错误、${ver.p0Findings.length} 处致命断头/假功能：`);
        for (const line of ver.errorLines) console.error(`  ${line}`);
        console.error(`\n👉 直接把上面提示粘贴给 AI 即可精准秒修！\n`);
      }
      if (!isOk) process.exitCode = 1;
      break;
    }

    case 'report':
    case 'dashboard':
    case 'launcher': {
      const targetDir = resolveTargetDir(1);
      const ws = scanWorkspace(targetDir);
      const audit = runRealityAudit(ws);
      writeMemoryCapsule(ws, audit);
      const dash = generateBossDashboard(ws, audit);
      const launch = generateSelfHealingLaunchers(ws);
      console.log(`📄 已更新项目体检报告: ${dash.rootOutPath}`);
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
        const tok = estimateTokens(skPath ? fs.readFileSync(skPath, 'utf8') : '');
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
GhostCTO (影子 CTO) v2.0.0 — 零基础小白从 0 到 5 做产品的保姆级技术合伙人

零命令行用法（直接双击即可）：
  - 新手做新产品：双击「1-双击新建我的空白项目.command」(Mac) 或「.bat」(Windows)
  - 保护已有项目：双击「2-双击接入已有老项目.command」(Mac) 或「.bat」(Windows)

命令行完整参考:
  ghost-cto create "项目名称"           在桌面创建干净新项目并自动装好 8 大 AI 软件保护护栏
  ghost-cto bootstrap "想法" [目录]     一键生成 100 分 SQLite 全栈底座 (--audience self|commercial)
  ghost-cto verify [项目目录]           0-Token 语法编译 + 假按钮/断头路/裸奔后台硬门禁检查
  ghost-cto init [项目目录]             为已有项目同步 8 大国内外软件规则、技能与离线 MCP
  ghost-cto audit [项目目录] [--ai]     0-Token 扫描假落库、假保存、空 catch、裸奔后台与密钥泄漏
  ghost-cto xray [项目目录] [--ai]      0-Token 绘制 前端 -> 后端路由 -> 数据库 真假穿透表
  ghost-cto impact <关键词>             改代码前按中文按钮名或模块名锁定最小修改文件集
  ghost-cto save "存档说明"             原子备份 Git 代码 + SQLite(WAL) 数据库
  ghost-cto rewind [存档编号]           一键后悔药：把代码和数据库一起原子恢复到正常版本
  ghost-cto doctor [项目目录]           21 项真机验证：配置、Token 预算与跨进程 MCP 双协议测试
  ghost-cto try                         在本机沙箱跑一遍 1 秒全自动真机演练
`);
      break;
    }
  }
}

main().catch(err => {
  console.error(`❌ GhostCTO 执行提示: ${err.message || String(err)}`);
  process.exitCode = 1;
});
