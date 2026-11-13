import fs from 'node:fs';
import path from 'node:path';
import { listCheckpoints } from './time-capsule.mjs';
import { detectRuntimeTopology } from './memory-capsule.mjs';

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate a standalone, offline-ready, zero-jargon Chinese visual HTML cockpit (`老板全景驾驶舱.html`)
 * so complete beginners can inspect their entire product without reading a single line of code.
 */
export function generateBossDashboard(workspace, audit) {
  const runtime = detectRuntimeTopology(workspace);
  const checkpoints = listCheckpoints(workspace.rootDir);
  const chains = audit.lineage.chains;

  const realCount = chains.filter(c => c.badge.startsWith('🟢')).length;
  const fakeOrWarnCount = chains.filter(c => c.badge.startsWith('🟡')).length;
  const brokenCount = chains.filter(c => c.badge.startsWith('🔴')).length;

  const scoreColor =
    audit.p0Count > 0 ? '#DC2626' : audit.score >= 85 ? '#059669' : '#D97706';
  const scoreBg =
    audit.p0Count > 0 ? '#FEF2F2' : audit.score >= 85 ? '#ECFDF5' : '#FFFBEB';

  const portLinksHtml =
    runtime.ports.length > 0
      ? runtime.ports
          .map(
            p =>
              `<a class="port-pill" href="http://127.0.0.1:${p}" target="_blank" rel="noopener">🌐 打开本地端口 :${p}</a>`
          )
          .join('')
      : `<span class="muted">自动端口（双击项目文件夹内的「双击启动项目」即可自动打开网页）</span>`;

  const findingsHtml =
    audit.findings.length === 0
      ? `<div class="empty-ok">🎉 太稳了！当前没有检测到假数据、空吞报错、裸奔管理接口或断头按钮，可以放心体验和交付。</div>`
      : audit.findings
          .map((f, idx) => {
            const sevClass = f.severity === 'P0' ? 'sev-p0' : f.severity === 'P1' ? 'sev-p1' : 'sev-p2';
            const sevLabel =
              f.severity === 'P0'
                ? '🔴 致命阻断（上线前必改）'
                : f.severity === 'P1'
                ? '🟠 高危隐患（强烈建议修）'
                : '🔵 结构优化提醒';
            return `
            <div class="finding-card ${sevClass}">
              <div class="finding-head">
                <div>
                  <span class="sev-tag ${sevClass}">${sevLabel}</span>
                  <span class="file-loc">${escHtml(f.file)}:${f.line}</span>
                </div>
                <button class="copy-btn" data-copy="${escHtml(f.oneClickPrompt)}">📋 一键复制修复话术（发给 AI）</button>
              </div>
              <h3 class="finding-title">${idx + 1}. ${escHtml(f.title)}</h3>
              <p class="finding-desc"><strong>对生意的实际影响：</strong>${escHtml(f.founderImpact)}</p>
              <div class="prompt-preview">💬 发送给 WorkBuddy / 豆包 / Antigravity 的话术：「${escHtml(f.oneClickPrompt)}」</div>
            </div>`;
          })
          .join('\n');

  const chainsRowsHtml = chains
    .map(
      c => `
      <tr data-kind="${c.badge.startsWith('🟢') ? 'real' : c.badge.startsWith('🔴') ? 'broken' : 'warn'}">
        <td><span class="chain-badge">${escHtml(c.badge)}</span></td>
        <td><code>${escHtml(c.method)} ${escHtml(c.endpoint)}</code></td>
        <td>${escHtml(c.persistence)}</td>
        <td>${escHtml(c.summary)}</td>
        <td class="muted-code">${escHtml(c.frontend)} → ${escHtml(c.backend)}</td>
      </tr>`
    )
    .join('\n');

  const checkpointsHtml =
    checkpoints.length === 0
      ? `<div class="empty-note">尚未创建时光机存档。把下面这句话发给 AI 即可立即备份：<button class="copy-btn inline-btn" data-copy="帮我存个档备份一下当前代码和数据库">📋 复制「帮我存个档」</button></div>`
      : checkpoints
          .slice(0, 12)
          .map(
            cp => `
          <div class="cp-row">
            <div>
              <strong>📦 ${escHtml(cp.label)}</strong>
              <div class="cp-meta">编号：<code>${escHtml(cp.id)}</code> ｜ 时间：${escHtml(cp.createdAt.replace('T', ' ').slice(0, 19))} ｜ 含数据库备份：${cp.dbCount} 个</div>
            </div>
            <button class="copy-btn ghost-btn" data-copy="请用时光机把代码和数据库一起安全回退到存档点 ${escHtml(cp.id)}（${escHtml(cp.label)}），不要丢失任何备份">⏪ 复制回退指令</button>
          </div>`
          )
          .join('\n');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(runtime.projectName)} · 影子 CTO 老板全景驾驶舱</title>
  <style>
    :root {
      --bg: #F8F7F4;
      --surface: #FFFFFF;
      --text: #18181B;
      --muted: #64646E;
      --border: #E6E4DF;
      --primary: #18181B;
      --accent: #2563EB;
      --green: #059669;
      --amber: #D97706;
      --red: #DC2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 28px 20px 64px;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 1120px; margin: 0 auto; }
    .hero {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 26px 28px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      margin-bottom: 20px;
    }
    .hero-left h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 6px; }
    .hero-sub { font-size: 14px; color: var(--muted); margin-bottom: 12px; }
    .port-list { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .port-pill {
      display: inline-flex; align-items: center; padding: 6px 13px; border-radius: 999px;
      background: #EFF6FF; color: #1D4ED8; font-size: 13px; font-weight: 600; text-decoration: none;
      border: 1px solid #BFDBFE;
    }
    .port-pill:hover { background: #DBEAFE; }
    .score-box {
      background: ${scoreBg};
      border: 1px solid ${scoreColor}33;
      border-radius: 14px;
      padding: 16px 24px;
      text-align: center;
      min-width: 210px;
    }
    .score-num { font-size: 38px; font-weight: 800; color: ${scoreColor}; font-variant-numeric: tabular-nums; line-height: 1.1; }
    .score-label { font-size: 12.5px; color: var(--muted); margin-top: 4px; }
    .verdict-banner {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 5px solid ${scoreColor};
      border-radius: 12px;
      padding: 14px 18px;
      font-size: 14.5px;
      font-weight: 600;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 14px;
      margin-bottom: 22px;
    }
    .kpi-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px 18px;
    }
    .kpi-val { font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .kpi-name { font-size: 13px; color: var(--muted); margin-top: 2px; }
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
    .tab-btn {
      padding: 9px 16px; border-radius: 10px; border: 1px solid var(--border);
      background: var(--surface); color: var(--muted); font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.15s ease;
    }
    .tab-btn.active { background: var(--primary); color: #FFF; border-color: var(--primary); }
    .panel { display: none; }
    .panel.active { display: block; }
    .finding-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 14px;
    }
    .finding-card.sev-p0 { border-left: 5px solid var(--red); }
    .finding-card.sev-p1 { border-left: 5px solid var(--amber); }
    .finding-card.sev-p2 { border-left: 5px solid var(--accent); }
    .finding-head {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;
    }
    .sev-tag { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 6px; }
    .sev-tag.sev-p0 { background: #FEF2F2; color: var(--red); }
    .sev-tag.sev-p1 { background: #FFFBEB; color: var(--amber); }
    .sev-tag.sev-p2 { background: #EFF6FF; color: var(--accent); }
    .file-loc { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--muted); margin-left: 8px; }
    .finding-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
    .finding-desc { font-size: 14px; color: #3F3F46; margin-bottom: 10px; }
    .prompt-preview {
      background: #F4F4F5; border-radius: 8px; padding: 9px 12px; font-size: 12.5px; color: #52525B;
    }
    .copy-btn {
      background: var(--primary); color: #FFF; border: none; border-radius: 8px;
      padding: 7px 13px; font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .copy-btn:hover { opacity: 0.9; }
    .ghost-btn { background: #F4F4F5; color: var(--text); border: 1px solid var(--border); }
    .table-wrap {
      background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow-x: auto;
    }
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--border); }
    th { background: #FAFAF9; font-weight: 600; color: var(--muted); font-size: 12.5px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: #F4F4F5; padding: 2px 6px; border-radius: 5px; }
    .muted-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: var(--muted); }
    .cp-row {
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
      padding: 14px 18px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
    }
    .cp-meta { font-size: 12.5px; color: var(--muted); margin-top: 3px; }
    .ide-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .ide-pill { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; padding: 5px 11px; border-radius: 999px; font-size: 12.5px; font-weight: 600; }
    .dict-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
    .dict-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
    .dict-card h4 { font-size: 15px; margin-bottom: 6px; }
    .empty-ok { background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; padding: 20px; border-radius: 14px; font-weight: 600; }
    .empty-note { background: var(--surface); border: 1px solid var(--border); padding: 18px; border-radius: 12px; }
    .toast {
      position: fixed; bottom: 24px; right: 24px; background: #18181B; color: #FFF;
      padding: 11px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.18); display: none; z-index: 999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <div class="hero-left">
        <h1>🛡️ ${escHtml(runtime.projectName)} · 影子 CTO 老板全景驾驶舱</h1>
        <div class="hero-sub">不看一行英文代码，30 秒看清你的产品哪些真通、哪些有坑、能不能发给客户用。</div>
        <div class="port-list">${portLinksHtml}</div>
      </div>
      <div class="score-box">
        <div class="score-num">${audit.score}</div>
        <div class="score-label">商用健康总分（满分 100）</div>
      </div>
    </div>

    <div class="verdict-banner">
      <span>🚦 上线安检结论：${escHtml(audit.launchVerdict)}</span>
      <button class="copy-btn" data-copy="请读取项目里的体检结果，先存一个时光机备份，然后按优先级帮我修好所有 P0 致命问题，不要改动正常业务！">🚀 复制「一键全自动排雷」总指令</button>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--green);">${realCount} 条</div>
        <div class="kpi-name">🟢 真通落库 / 真实可用功能线</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--amber);">${fakeOrWarnCount} 条</div>
        <div class="kpi-name">🟡 内存假落库 / 疑似演示壳</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--red);">${brokenCount} 条</div>
        <div class="kpi-name">🔴 404 断头路接口（点了必报错）</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">${audit.lineage.schemaTables.length} 张</div>
        <div class="kpi-name">🗄️ 已建真实数据库表（共 ${checkpoints.length} 个时光机备份）</div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('risks', this)">🚨 白话隐患与一键修复 (${audit.findings.length})</button>
      <button class="tab-btn" onclick="switchTab('lineage', this)">🔬 全栈功能真假透视表 (${chains.length})</button>
      <button class="tab-btn" onclick="switchTab('timemachine', this)">⏪ 后悔药时光机 & 多软件接力 (${checkpoints.length})</button>
      <button class="tab-btn" onclick="switchTab('sos', this)">🆘 小白英文弹窗 & 打不开急救卡</button>
    </div>

    <div id="panel-risks" class="panel active">
      ${findingsHtml}
    </div>

    <div id="panel-lineage" class="panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>真假状态</th>
              <th>业务接口</th>
              <th>真实数据去向</th>
              <th>大白话解读</th>
              <th>代码追踪坐标</th>
            </tr>
          </thead>
          <tbody>
            ${chainsRowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <div id="panel-timemachine" class="panel">
      <div class="finding-card" style="margin-bottom: 18px;">
        <h3 class="finding-title">🔄 国内外 8 大 AI 编程软件已无缝打通（随时换软件不失忆）</h3>
        <p class="finding-desc">本项目已写入统一记忆胶囊（<code>.vibe/capsule.md</code>）与原生规则。哪怕某个软件额度用完了，直接用下面任意软件打开同一个文件夹就能无缝接着做：</p>
        <div class="ide-badges">
          <span class="ide-pill">✅ 腾讯 WorkBuddy</span>
          <span class="ide-pill">✅ 腾讯 CodeBuddy</span>
          <span class="ide-pill">✅ 豆包编程 / 字节 Trae</span>
          <span class="ide-pill">✅ Google Antigravity</span>
          <span class="ide-pill">✅ Cursor</span>
          <span class="ide-pill">✅ Claude Code</span>
          <span class="ide-pill">✅ Windsurf</span>
          <span class="ide-pill">✅ OpenAI Codex</span>
        </div>
      </div>
      <h3 style="margin-bottom: 12px; font-size: 16px;">📦 代码 + 数据库双轨时光机存档记录</h3>
      ${checkpointsHtml}
    </div>

    <div id="panel-sos" class="panel">
      <div class="dict-grid">
        <div class="dict-card">
          <h4>🟢 看到 Allow / Accept / Run in Sandbox</h4>
          <p class="finding-desc">意思是「允许 AI 在当前项目文件夹里干活或跑测试」。只要没有出现 <code>rm -rf /</code> 这种删系统盘字样，放心点同意。</p>
        </div>
        <div class="dict-card">
          <h4>🟡 看到 Bypass Sandbox / Allow Outside Workspace</h4>
          <p class="finding-desc">意思是「AI 想跨出项目文件夹或联网」。如果不知道它在干嘛，直接点取消/Deny，然后在对话框问它：「请用中文告诉我你刚才为什么要申请外部权限？」</p>
        </div>
        <div class="dict-card">
          <h4>🟠 关机重启后网页打不开 / 报错 EADDRINUSE</h4>
          <p class="finding-desc">这是因为昨天没启动服务，或者旧窗口占着端口没退干净。直接双击项目文件夹里的 <strong>「双击启动项目.command」</strong>（苹果电脑）或 <strong>「双击启动项目.bat」</strong>（Windows），它会自动清理卡死端口并帮你打开浏览器！</p>
        </div>
        <div class="dict-card">
          <h4>🔵 AI 反问你用什么技术框架（Prisma / JWT / Redis）？</h4>
          <p class="finding-desc">影子 CTO 已经在底层规则里禁止 AI 问技术黑话了。如果它偶尔犯病，直接回它一句：「你是我的 CTO，技术选型你按最稳妥的拍板，只问我业务规则就行。」</p>
        </div>
      </div>
    </div>
  </div>

  <div id="toast" class="toast">✅ 已复制修复话术！直接去 WorkBuddy / 豆包 / Antigravity 粘贴发送即可</div>

  <script>
    function switchTab(id, btn) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('panel-' + id).classList.add('active');
      btn.classList.add('active');
    }
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-copy');
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
          const t = document.getElementById('toast');
          t.style.display = 'block';
          setTimeout(() => { t.style.display = 'none'; }, 2600);
        });
      });
    });
  </script>
</body>
</html>`;

  const rootOutPath = path.join(workspace.rootDir, '老板全景驾驶舱.html');
  const vibeOutPath = path.join(workspace.rootDir, '.vibe', 'boss-dashboard.html');
  fs.mkdirSync(path.dirname(vibeOutPath), { recursive: true });
  fs.writeFileSync(rootOutPath, html, 'utf8');
  fs.writeFileSync(vibeOutPath, html, 'utf8');

  return { rootOutPath, vibeOutPath };
}

/**
 * Generate self-healing double-click launcher scripts (`双击启动项目.command` & `双击启动项目.bat`)
 * so complete beginners never get stuck when reopening their computer the next day!
 */
export function generateSelfHealingLaunchers(workspace) {
  const runtime = detectRuntimeTopology(workspace);
  const primaryPort = runtime.ports.length > 0 ? runtime.ports[runtime.ports.length - 1] : 3000;
  const portsStr = runtime.ports.join(' ');

  const staleBuildCmds = workspace.staleBuilds
    .map(sb => (sb.appDir === '.' ? 'npm run build' : `npm --prefix "${sb.appDir}" run build`))
    .join('\n');

  // macOS double-clickable `.command`
  const macScript = `#!/bin/bash
cd "$(dirname "$0")"
echo "===================================================="
echo "🛡️ 影子 CTO (GhostCTO) 自愈式一键启动器"
echo "正在为您检查并唤醒项目：${runtime.projectName}"
echo "===================================================="

# 1. 自动清理上次卡死占用的本地端口
for PORT in ${portsStr || primaryPort}; do
  PID=$(lsof -ti tcp:$PORT 2>/dev/null)
  if [ -n "$PID" ]; then
    echo "🧹 发现端口 $PORT 被旧进程占用，正在自动清理..."
    kill -9 $PID 2>/dev/null || true
  fi
done

# 2. 若缺依赖则自动安装
if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
  echo "📦 首次运行，正在自动安装依赖包..."
  npm install
fi

# 3. 若存在需要更新的前端静态包则自动检查构建
${staleBuildCmds ? `echo "🔨 正在同步最新界面打包文件..."\n${staleBuildCmds} || true` : '# 无需静态预打包'}

# 4. 延迟 2 秒后自动打开浏览器与驾驶舱
(sleep 2 && open "http://127.0.0.1:${primaryPort}") &

echo "🚀 服务启动中！浏览器即将自动打开 http://127.0.0.1:${primaryPort}"
echo "（保持本窗口开启即可使用，关闭本窗口即停止服务）"
${runtime.startCmd}
`;

  // Windows double-clickable `.bat`
  const winScript = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ====================================================
echo [GhostCTO] 影子 CTO 自愈式一键启动器
echo 正在为您唤醒项目：${runtime.projectName}
echo ====================================================

if exist "package.json" (
  if not exist "node_modules" (
    echo 首次运行，正在自动安装依赖包...
    call npm install
  )
)

start "" "http://127.0.0.1:${primaryPort}"
echo 浏览器正在打开 http://127.0.0.1:${primaryPort} （请保持此窗口开启）
call ${runtime.startCmd}
pause
`;

  const macPath = path.join(workspace.rootDir, '双击启动项目.command');
  const winPath = path.join(workspace.rootDir, '双击启动项目.bat');
  fs.writeFileSync(macPath, macScript, { encoding: 'utf8', mode: 0o755 });
  try {
    fs.chmodSync(macPath, 0o755);
  } catch {
    // ignore chmod on unsupported fs
  }
  fs.writeFileSync(winPath, winScript, 'utf8');

  return { macPath, winPath, primaryPort, startCmd: runtime.startCmd };
}
