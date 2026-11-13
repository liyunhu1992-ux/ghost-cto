import path from 'node:path';
import { scanWorkspace } from './scanner.mjs';
import { buildLineageGraph, formatLineageReport } from './lineage-graph.mjs';
import { runRealityAudit, formatAuditReport } from './reality-audit.mjs';
import { computeBlastRadius } from './blast-radius.mjs';
import { saveCheckpoint, rewindCheckpoint, listCheckpoints } from './time-capsule.mjs';
import { writeMemoryCapsule, learnScar } from './memory-capsule.mjs';
import { generateBossDashboard } from './boss-dashboard.mjs';
import { buildMasterPromptArsenal, getMasterPromptById } from './prompt-arsenal.mjs';

const MCP_TOOLS = [
  {
    name: 'ghost_reality_audit',
    description:
      '【0-Token 真假功能与上线体检】扫描项目假落库(存内存重启即丢)、空catch吞错、裸奔管理后台、断头API与未刷新dist包，返回压缩修复坐标表。当老板问项目有什么问题、能不能上线、为什么没反应时调用。',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: { type: 'string', description: '项目根目录路径（默认当前工作区）' }
      }
    }
  },
  {
    name: 'ghost_xray_lineage',
    description:
      '【0-Token 3D全栈穿透X光】追踪 前端请求 -> 后端路由 -> 跨包函数 -> SQLite真表/外部大模型 的完整真假血缘。',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: { type: 'string', description: '项目根目录路径（默认当前工作区）' }
      }
    }
  },
  {
    name: 'ghost_blast_radius',
    description:
      '【防改A崩B爆炸半径锁定】改代码前必调！输入业务词、界面中文文案或文件名，锁定最小允许修改文件范围、关联接口契约与必跑打包命令。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '要修改的功能关键词、界面按钮中文名或文件路径' },
        projectDir: { type: 'string', description: '项目根目录路径（默认当前工作区）' }
      },
      required: ['query']
    }
  },
  {
    name: 'ghost_save_checkpoint',
    description:
      '【代码+SQLite双轨原子存档】大改代码前或老板说“存个档”时调用，同时快照 Git 代码与 SQLite/WAL 数据库。',
    inputSchema: {
      type: 'object',
      properties: {
        label: { type: 'string', description: '中文存档说明，例如“修改门店管理后台前备份”' },
        projectDir: { type: 'string', description: '项目根目录路径（默认当前工作区）' }
      }
    }
  },
  {
    name: 'ghost_rewind_checkpoint',
    description:
      '【一键后悔药回退】老板说“改坏了退回刚才”时调用，自动先做急救备份，再把代码和SQLite数据库一起原子恢复。',
    inputSchema: {
      type: 'object',
      properties: {
        checkpointId: { type: 'string', description: '存档编号（传 latest 恢复最近一次存档）' },
        projectDir: { type: 'string', description: '项目根目录路径（默认当前工作区）' }
      }
    }
  },
  {
    name: 'ghost_boss_dashboard',
    description:
      '【刷新老板中文全景驾驶舱】生成或更新《老板全景驾驶舱.html》与跨软件记忆胶囊(.vibe/capsule.md)。支持腾讯WorkBuddy、豆包、Trae、Antigravity无缝接力。',
    inputSchema: {
      type: 'object',
      properties: {
        projectDir: { type: 'string', description: '项目根目录路径（默认当前工作区）' },
        learnRule: { type: 'string', description: '可选：顺便记录一条本次修好的踩坑铁律到免疫库' }
      }
    }
  },
  {
    name: 'ghost_master_prompt',
    description:
      '【卡兹克 & Karpathy 大师级提示词引擎】按需提取自动注入本项目真实数据表、端口与静态打包护栏的 8 套神级防崩提示词（苏格拉底单问立项、Karpathy外科手术、去AI塑料味UI、死循环破局、专家选角、防脑腐同步等）。',
    inputSchema: {
      type: 'object',
      properties: {
        scenario: {
          type: 'string',
          description:
            '可选场景编号: khazix-socratic-mvp | karpathy-surgical-code | anti-ai-slop-ui | deadloop-bug-breaker | khazix-expert-council | mvp-negative-blueprint | khazix-neat-freak | khazix-human-copy | all'
        },
        topic: { type: 'string', description: '老板想做的具体事项（一句大白话）' },
        projectDir: { type: 'string', description: '项目根目录路径（默认当前工作区）' }
      }
    }
  }
];

export function handleMcpRequest(msg, defaultRootDir = process.cwd()) {
  if (!msg || typeof msg !== 'object') return null;

  const { id, method, params = {} } = msg;

  // Notifications have no `id` and require no response
  if (id === undefined || id === null) {
    return null;
  }

  try {
    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: params.protocolVersion || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'ghost-cto',
            version: '2.0.0'
          }
        }
      };
    }

    if (method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS }
      };
    }

    if (method === 'tools/call') {
      const toolName = params.name;
      const args = params.arguments || {};
      const rootDir = path.resolve(args.projectDir || defaultRootDir);
      const textOut = executeToolCall(toolName, args, rootDir);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: textOut }],
          isError: false
        }
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` }
    };
  } catch (err) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: `GHOST_ERROR: ${err.message || String(err)}` }],
        isError: true
      }
    };
  }
}

function executeToolCall(toolName, args, rootDir) {
  switch (toolName) {
    case 'ghost_reality_audit': {
      const ws = scanWorkspace(rootDir);
      const audit = runRealityAudit(ws);
      writeMemoryCapsule(ws, audit);
      generateBossDashboard(ws, audit);
      const formatted = formatAuditReport(audit);
      return formatted.aiCompact;
    }
    case 'ghost_xray_lineage': {
      const ws = scanWorkspace(rootDir);
      const lineage = buildLineageGraph(ws);
      return formatLineageReport(lineage).aiCompact;
    }
    case 'ghost_blast_radius': {
      const ws = scanWorkspace(rootDir);
      const impact = computeBlastRadius(ws, args.query || '');
      return impact.aiCompact;
    }
    case 'ghost_save_checkpoint': {
      const cp = saveCheckpoint(rootDir, args.label || 'AI自动安全存档');
      const all = listCheckpoints(rootDir);
      return `GHOST_SAVED|id:${cp.id}|label:${cp.label}|git:${cp.gitCommit.slice(0, 8)}|dbs:${cp.dbSnapshots.length}|total_checkpoints:${all.length}`;
    }
    case 'ghost_rewind_checkpoint': {
      const res = rewindCheckpoint(rootDir, args.checkpointId || 'latest');
      return `GHOST_REWOUND|restored:${res.restoredId}|label:${res.restoredLabel}|dbs:${res.restoredDbs.join(',') || 'NONE'}|rescue_backup:${res.rescueId || 'NONE'}`;
    }
    case 'ghost_boss_dashboard': {
      if (args.learnRule) {
        learnScar(rootDir, {
          symptom: 'AI修复复盘',
          rootCause: '历史易错点',
          rule: args.learnRule
        });
      }
      const ws = scanWorkspace(rootDir);
      const audit = runRealityAudit(ws);
      const cap = writeMemoryCapsule(ws, audit);
      const dash = generateBossDashboard(ws, audit);
      return `GHOST_DASHBOARD_READY|score:${audit.score}/100|dashboard:${path.basename(dash.rootOutPath)}|capsule_tokens:${cap.tokens}`;
    }
    case 'ghost_master_prompt': {
      const ws = scanWorkspace(rootDir);
      const audit = runRealityAudit(ws);
      const scenario = args.scenario || 'all';
      if (scenario === 'all') {
        const list = buildMasterPromptArsenal(ws, audit, args.topic || '');
        return list.map(p => `[${p.id}] ${p.title} — ${p.whenToUse}`).join('\n');
      }
      const item = getMasterPromptById(ws, audit, scenario, args.topic || '');
      return item.prompt;
    }
    default:
      throw new Error(`Unknown GhostCTO tool: ${toolName}`);
  }
}

/**
 * Start Stdio MCP Server supporting BOTH newline-delimited JSON-RPC (MCP 2024-11-05+)
 * AND Content-Length header framing automatically.
 */
export function startMcpStdioServer(defaultRootDir = process.cwd()) {
  let rawBuffer = Buffer.alloc(0);
  let useContentLength = false;

  function sendResponse(obj) {
    if (!obj) return;
    const json = JSON.stringify(obj);
    if (useContentLength) {
      const byteLen = Buffer.byteLength(json, 'utf8');
      process.stdout.write(`Content-Length: ${byteLen}\r\n\r\n${json}`);
    } else {
      process.stdout.write(`${json}\n`);
    }
  }

  process.stdin.on('data', chunk => {
    rawBuffer = Buffer.concat([rawBuffer, chunk]);

    while (rawBuffer.length > 0) {
      const preview = rawBuffer.slice(0, 32).toString('utf8');

      // Framing mode 1: Content-Length header
      if (preview.startsWith('Content-Length:')) {
        useContentLength = true;
        const headerEnd = rawBuffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;
        const headerStr = rawBuffer.slice(0, headerEnd).toString('utf8');
        const m = headerStr.match(/Content-Length:\s*(\d+)/i);
        if (!m) {
          rawBuffer = rawBuffer.slice(headerEnd + 4);
          continue;
        }
        const bodyLen = Number(m[1]);
        const totalNeeded = headerEnd + 4 + bodyLen;
        if (rawBuffer.length < totalNeeded) break;

        const bodyStr = rawBuffer.slice(headerEnd + 4, totalNeeded).toString('utf8');
        rawBuffer = rawBuffer.slice(totalNeeded);
        try {
          const parsed = JSON.parse(bodyStr);
          sendResponse(handleMcpRequest(parsed, defaultRootDir));
        } catch {
          // ignore malformed packet
        }
        continue;
      }

      // Framing mode 2: Newline-delimited JSON-RPC
      const nlIdx = rawBuffer.indexOf('\n');
      if (nlIdx === -1) break;
      const lineStr = rawBuffer.slice(0, nlIdx).toString('utf8').trim();
      rawBuffer = rawBuffer.slice(nlIdx + 1);
      if (!lineStr) continue;

      try {
        const parsed = JSON.parse(lineStr);
        sendResponse(handleMcpRequest(parsed, defaultRootDir));
      } catch {
        // ignore blank/noise lines
      }
    }
  });
}
