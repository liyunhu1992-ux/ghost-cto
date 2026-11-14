import fs from 'node:fs';
import path from 'node:path';
import { listCheckpoints } from './time-capsule.mjs';
import { detectRuntimeTopology } from './memory-capsule.mjs';
import { buildMasterPromptArsenal } from './prompt-arsenal.mjs';
import { buildDashboardCss, buildSosPanelHtml, buildDashboardClientJs } from './dashboard-assets.mjs';
import { generateSelfHealingLaunchers } from './launcher-scripts.mjs';

export { generateSelfHealingLaunchers };

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateAndReadScoreHistory(rootDir, currentScore) {
  const histPath = path.join(rootDir, '.vibe', 'score-history.json');
  fs.mkdirSync(path.dirname(histPath), { recursive: true });
  let hist = { firstScore: currentScore, previousScore: currentScore, currentScore };
  if (fs.existsSync(histPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(histPath, 'utf8'));
      if (typeof parsed.firstScore === 'number') hist.firstScore = parsed.firstScore;
      if (typeof parsed.currentScore === 'number' && parsed.currentScore !== currentScore) {
        hist.previousScore = parsed.currentScore;
      } else if (typeof parsed.previousScore === 'number') {
        hist.previousScore = parsed.previousScore;
      }
    } catch (err) {
      hist = { firstScore: currentScore, previousScore: currentScore, currentScore, resetReason: Boolean(err) };
    }
  }
  hist.currentScore = currentScore;
  hist.updatedAt = new Date().toISOString();
  fs.writeFileSync(histPath, JSON.stringify(hist, null, 2), 'utf8');
  return hist;
}

function readOptionalRoadmap(rootDir) {
  const rmPath = path.join(rootDir, '.vibe', 'roadmap.json');
  if (!fs.existsSync(rmPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(rmPath, 'utf8'));
  } catch (err) {
    return err ? null : null;
  }
}

function buildStarterCanvasHtml() {
  return `<div class="finding-card" style="border-left: 5px solid #059669; background: #F0FDF4;">
    <h3 class="finding-title" style="font-size: 18px; color: #065F46;">🌱 全品类零碎想法孵化器：不限品类，网站、AI SaaS 平台、工具、小程序都能从 0 做到 5</h3>
    <p class="finding-desc" style="color: #064E3B;">说不清楚技术细节没关系！输入你想做的任何产品（独立品牌官网、多模块 AI 创作/矩阵系统、在线互动工具、业务后台、微信小程序等），GhostCTO 会先拆出 <code>0 → 5</code> 演进蓝图，并在全程用确定性代码守住真落库与 0 报错底线：</p>
    <div class="filter-row" style="margin-bottom: 8px;">
      <button type="button" class="filter-pill" onclick="fillStarterIdea('摄影设计工作室品牌展示官网与预约咨询')">🌐 示例1：品牌展示官网</button>
      <button type="button" class="filter-pill" onclick="fillStarterIdea('多平台 AI 内容矩阵与智能体工作台系统')">🤖 示例2：多模块 AI SaaS 平台</button>
      <button type="button" class="filter-pill" onclick="fillStarterIdea('在线图文排版与数据转换效率工具')">⚡ 示例3：在线效率工具</button>
      <button type="button" class="filter-pill" onclick="fillStarterIdea('门店会员预约与微信小程序双端系统')">📱 示例4：业务系统 + 小程序</button>
    </div>
    <input id="starter-idea-input" class="topic-input" style="background:#FFF; border-color:#86EFAC;" type="text" placeholder="✍️ 用大白话写下你想做的任何网站、AI 平台、效率工具或小程序..." />
    <div class="filter-row" style="margin-top: 10px; align-items: center;">
      <span style="font-size:13px; font-weight:700; color:#065F46;">👥 目标使用对象：</span>
      <label style="font-size:13px; cursor:pointer;"><input type="radio" name="starter-audience" value="self" checked /> 个人自用（免登录直达）</label>
      <label style="font-size:13px; cursor:pointer;"><input type="radio" name="starter-audience" value="team" /> 团队 / 多租户商用（含登录鉴权）</label>
      <label style="font-size:13px; cursor:pointer;"><input type="radio" name="starter-audience" value="public" /> 面向访客公开展示与留资</label>
    </div>
    <div style="margin-top: 14px; display:flex; gap:10px; flex-wrap:wrap;">
      <button type="button" class="live-only-btn" style="display:none; background:#2563EB; padding: 10px 16px; font-size: 13.5px;" onclick="livePreviewIncubate()">🪄 第1步：生成 0→5 专属产品蓝图 (0 Token)</button>
      <button type="button" class="live-only-btn" style="display:none; background:#059669; padding: 10px 18px; font-size: 13.5px;" onclick="liveBootstrapGoldenApp()">🚀 第2步：铺设可运行全栈工程起点（可选）</button>
      <button type="button" class="copy-btn" style="padding: 10px 16px; font-size: 13.5px;" onclick="copyZeroToOneKickoff()">📋 复制「全品类定制开局指令」发给 AI</button>
    </div>
    <div id="incubate-preview-box" class="impact-result" style="border-color:#86EFAC; background:#FFFFFF;"></div>
  </div>`;
}

/**
 * Generate standalone, dual-mode (Offline `file://` + Live `http://127.0.0.1` 0-Token Interactive)
 * visual HTML report (`.vibe/项目体检报告.html` and `.vibe/boss-dashboard.html`).
 */
export function generateBossDashboard(workspace, audit) {
  const runtime = detectRuntimeTopology(workspace);
  const checkpoints = listCheckpoints(workspace.rootDir);
  const roadmap = readOptionalRoadmap(workspace.rootDir);
  const chains = audit.lineage.chains;
  const masterPrompts = buildMasterPromptArsenal(workspace, audit, '');
  const masterTemplates = buildMasterPromptArsenal(workspace, audit, '__BOSS_TOPIC__');
  const scoreHist = updateAndReadScoreHistory(workspace.rootDir, audit.score);

  const realCount = chains.filter(c => c.badge.startsWith('🟢')).length;
  const fakeOrWarnCount = chains.filter(c => c.badge.startsWith('🟡')).length;
  const brokenCount = chains.filter(c => c.badge.startsWith('🔴')).length;

  const scoreColor = audit.p0Count > 0 ? '#DC2626' : audit.score >= 85 ? '#059669' : '#D97706';
  const scoreBg = audit.p0Count > 0 ? '#FEF2F2' : audit.score >= 85 ? '#ECFDF5' : '#FFFBEB';

  const deltaFromFirst = audit.score - scoreHist.firstScore;
  const scoreDeltaHtml =
    deltaFromFirst > 0
      ? `<div class="score-delta">📈 较初检提升 +${deltaFromFirst} 分（初检 ${scoreHist.firstScore} 分）</div>`
      : '';

  const shareCertificateText = [
    `🛡️ 【${runtime.projectName} · 影子 CTO (GhostCTO) 工程体检报告】`,
    `📊 工程健康总分：${audit.score} / 100 分${deltaFromFirst > 0 ? `（较初检提升 +${deltaFromFirst} 分）` : ''}`,
    `🚦 上线安检结论：${audit.launchVerdict}`,
    `🔬 全栈真假穿透：🟢 真通落库 ${realCount} 条 ｜ 🗄️ 真实数据表 ${audit.lineage.schemaTables.length} 张 ｜ 🔴 404断头路 ${brokenCount} 条`,
    `⚡ 由开源项目 GhostCTO（影子 CTO）0-Token 本地确定性引擎验真生成`
  ].join('\n');

  const portLinksHtml =
    runtime.ports.length > 0
      ? runtime.ports
          .map(p => `<a class="port-pill" href="http://127.0.0.1:${p}" target="_blank" rel="noopener">🌐 打开业务端口 :${p}</a>`)
          .join('')
      : `<span class="muted">无常驻业务端口或自动分配端口</span>`;

  const isZeroCodeStarter = workspace.codeFiles.length === 0;
  const displayVerdict = isZeroCodeStarter
    ? '🌱 零基础起飞画布已就绪！8 大 AI 软件防崩护栏已装好，网站 / AI SaaS / 工具 / 小程序均可直接开建！'
    : audit.launchVerdict;

  const roadmapHtml =
    roadmap && Array.isArray(roadmap.stages)
      ? `<div class="roadmap-bar">
          <div style="font-size:13.5px; font-weight:700;">🗺️ 0 → 5 持续演进路线图（形态：${escHtml(roadmap.archetypeLabel || roadmap.productKind || '全品类定制')}）</div>
          <div class="roadmap-steps">
            ${roadmap.stages
              .map(
                (st, i) =>
                  `<div class="rm-step ${i === 0 ? 'active' : ''}"><strong>${escHtml(st.stage)}</strong> · ${escHtml(st.name)}</div>`
              )
              .join('')}
          </div>
        </div>`
      : '';

  const findingsHtml = isZeroCodeStarter
    ? buildStarterCanvasHtml()
    : audit.findings.length === 0
      ? `<div class="empty-ok">🎉 当前没有检测到假数据、空吞报错、裸奔管理接口或断头按钮，工程状态健康。</div>`
      : audit.findings
          .map((f, idx) => {
            const sevClass = f.severity === 'P0' ? 'sev-p0' : f.severity === 'P1' ? 'sev-p1' : 'sev-p2';
            const sevLabel =
              f.severity === 'P0'
                ? '🔴 致命问题（请点右侧按钮复制发给 AI 修）'
                : f.severity === 'P1'
                ? '🟠 隐患提醒（正式上线前建议复制发给 AI 修）'
                : '🔵 温和提醒（不影响使用，平时完全不用管）';
            const btnClass = f.severity === 'P2' ? 'copy-btn ghost-btn' : 'copy-btn';
            const btnLabel = f.severity === 'P2' ? '📋 可选：有空想整理时再复制' : '📋 一键复制修复话术（发给 AI）';
            return `
            <div class="finding-card ${sevClass}">
              <div class="finding-head">
                <div>
                  <span class="sev-tag ${sevClass}">${sevLabel}</span>
                  <span class="file-loc">${escHtml(f.file)}:${f.line}</span>
                </div>
                <button class="${btnClass}" data-copy="${escHtml(f.oneClickPrompt)}">${btnLabel}</button>
              </div>
              <h3 class="finding-title">${idx + 1}. ${escHtml(f.title)}</h3>
              <p class="finding-desc"><strong>实际影响：</strong>${escHtml(f.founderImpact)}</p>
              <div class="prompt-preview">💬 发送给 AI 的话术：「${escHtml(f.oneClickPrompt)}」</div>
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

  const masterPromptsHtml = masterPrompts
    .map((mp, idx) => {
      const tplObj = masterTemplates[idx];
      return `
      <div class="finding-card prompt-card" data-pcat="${escHtml(mp.category)}">
        <div class="finding-head">
          <div>
            <span class="sev-tag sev-master">${escHtml(mp.badge)}</span>
            <span class="file-loc">${escHtml(mp.inspiration)}</span>
          </div>
          <button class="copy-btn master-copy-btn" data-copy="${escHtml(mp.prompt)}" data-template="${escHtml(tplObj.prompt)}">📋 一键复制指令（已注入本项目家底）</button>
        </div>
        <h3 class="finding-title">${idx + 1}. ${escHtml(mp.title)}</h3>
        <p class="finding-desc"><strong>什么时候用：</strong>${escHtml(mp.whenToUse)}</p>
        <p class="finding-desc" style="margin-top:-4px;"><strong>为什么管用：</strong>${escHtml(mp.whyItWorks)}</p>
        <details class="prompt-details">
          <summary>👀 点击展开查看完整指令内容（已带入 ${escHtml(runtime.projectName)} 的数据表与架构护栏）</summary>
          <pre class="prompt-raw">${escHtml(mp.prompt)}</pre>
        </details>
      </div>`;
    })
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
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="live-only-btn live-rewind-btn" style="display:none;" onclick="liveRewindCheckpoint('${escHtml(cp.id)}', '${escHtml(cp.label)}')">⚡ 立即秒退回此版本 (0 Token)</button>
              <button class="copy-btn ghost-btn" data-copy="请用时光机把代码和数据库一起安全回退到存档点 ${escHtml(cp.id)}（${escHtml(cp.label)}），不要丢失任何备份">📋 复制回退话术</button>
            </div>
          </div>`
          )
          .join('\n');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(runtime.projectName)} · 影子 CTO 真假与安全体检报告</title>
  <style>${buildDashboardCss(scoreBg, scoreColor)}</style>
</head>
<body>
  <div class="container">
    <div class="finding-card" style="background:#EFF6FF; border-color:#BFDBFE; border-left:5px solid #2563EB; margin-bottom:14px; padding:14px 18px;">
      <div style="font-size:15px; font-weight:700; color:#1E3A8A; margin-bottom:4px;">💡 第一次看一头雾水？其实平时你【根本不用打开这个网页】！</div>
      <div style="font-size:13.5px; color:#1E40AF; line-height:1.65;">
        <strong>日常真正用法只有一步：</strong>直接关掉本页，去你的 AI 编程软件（Trae / 豆包 / WorkBuddy / Cursor / Antigravity）聊天框里<strong>照常说大白话提需求就行</strong>——自动备份、防乱改文件、写完自动查错已经在后台静默生效了。<br/>
        <strong>什么时候才看本页？</strong>① 怀疑 AI 糊弄你时打开看一眼体检分，哪条有问题就点那条右边的「复制话术发给 AI」；② AI 把项目彻底改坏聊不通时，点下方「⏪ 后悔药时光机」一键退回上一版。
      </div>
    </div>

    <div class="mode-bar">
      <span id="live-status-text" class="mode-badge-offline">📄 后台自动守护已开启（日常直接去 AI 聊天框说大白话即可）</span>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="btn-live-verify" class="live-only-btn" style="display:none; background:#2563EB;" onclick="liveVerifyCode()">✅ 检查代码有没有写坏</button>
        <button id="btn-live-audit" class="live-action-btn" style="display:none;" onclick="liveRunAudit()">🔄 刷新体检结果</button>
        <button class="copy-btn ghost-btn" data-copy="${escHtml(shareCertificateText)}">📋 复制体检摘要</button>
      </div>
    </div>

    <div class="hero">
      <div class="hero-left">
        <h1>🛡️ ${escHtml(runtime.projectName)} · 项目真假与安全体检报告</h1>
        <div class="hero-sub">本地确定性引擎 0-Token 扫描结果：核验按钮真假落库、语法依赖错误与上线安全防线。</div>
        <div class="port-list">${portLinksHtml}</div>
      </div>
      <div class="score-box">
        <div class="score-num">${isZeroCodeStarter ? '待建' : audit.score}</div>
        <div class="score-label">${isZeroCodeStarter ? '空白新项目护栏已就绪' : '工程健康总分（满分 100）'}</div>
        ${scoreDeltaHtml}
      </div>
    </div>

    <div class="verdict-banner">
      <span>🚦 上线安检结论：${escHtml(displayVerdict)}</span>
      <button class="copy-btn" data-copy="请读取项目里的体检结果，先存一个时光机备份，然后按优先级帮我修好所有 P0 致命问题，不要改动正常业务！">🚀 复制「一键排雷修复」总指令</button>
    </div>

    ${roadmapHtml}

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
      <button class="tab-btn" onclick="switchTab('prompts', this)">✨ 实战防崩指令库 (${masterPrompts.length})</button>
      <button class="tab-btn" onclick="switchTab('lineage', this)">🔬 全栈功能真假透视表 (${chains.length})</button>
      <button class="tab-btn" onclick="switchTab('timemachine', this)">⏪ 后悔药时光机 & 多软件接力 (${checkpoints.length})</button>
      <button class="tab-btn" onclick="switchTab('sos', this)">🆘 小白英文弹窗 & 打不开急救卡</button>
    </div>

    <div id="panel-risks" class="panel active">${findingsHtml}</div>

    <div id="panel-prompts" class="panel">
      <div class="arsenal-hero">
        <h3 class="finding-title">✨ 卡兹克 (KKKKhazix) & Karpathy 实战防崩指令库（0 平时 Token 消耗 · 已自动注入本项目家底）</h3>
        <p class="finding-desc" style="margin-bottom: 4px;">不用自己背提示词！在下面框里用一句大白话写下你想干的事（不填也能直接复制），点任意卡片按钮，就会把<strong>你的想法 + 本项目真实数据表与防崩护栏</strong>一起打包复制好：</p>
        <input id="boss-topic-input" class="topic-input" type="text" placeholder="✍️ 选填：输入你想加的任何页面或模块（如：新增智能体工作流编排页 / 新增官网案例画廊）..." />
        <div class="filter-row">
          <button class="filter-pill active" onclick="filterPrompts('all', this)">全部精选 (${masterPrompts.length})</button>
          <button class="filter-pill" onclick="filterPrompts('khazix', this)">🔥 卡兹克实战方法论 (4)</button>
          <button class="filter-pill" onclick="filterPrompts('engineering', this)">🔪 Karpathy 防崩与死循环破局 (2)</button>
          <button class="filter-pill" onclick="filterPrompts('design', this)">🎨 去 AI 塑料味克制界面与文案 (2)</button>
        </div>
      </div>
      ${masterPromptsHtml}
    </div>

    <div id="panel-lineage" class="panel">
      <div id="live-impact-box" class="live-box">
        <strong>🔍 中文按钮 / 模块爆炸半径 0-Token 实时反查器</strong>
        <p style="font-size:13px; color:#065F46; margin-top:2px;">输入界面上的任意中文按钮名或模块词，毫秒级查出它连着哪个页面、哪个接口、哪张表：</p>
        <div class="live-row">
          <input id="live-impact-input" type="text" placeholder="输入界面中文按钮文字或模块词..." />
          <button class="live-action-btn" onclick="liveQueryImpact()">🔍 立即反查影响范围</button>
        </div>
        <div id="live-impact-result" class="impact-result"></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>真假状态</th><th>业务接口</th><th>真实数据去向</th><th>大白话解读</th><th>代码追踪坐标</th></tr></thead>
          <tbody>${chainsRowsHtml}</tbody>
        </table>
      </div>
    </div>

    <div id="panel-timemachine" class="panel">
      <div id="live-save-box" class="live-box">
        <strong>⚡ 实时时光机控制台（0 Token 本地毫秒级双备份：Git 代码 + SQLite 数据库）</strong>
        <div class="live-row">
          <input id="live-save-label" type="text" placeholder="输入存档备注（例如：新增智能体模块前安全备份）..." />
          <button class="live-action-btn" onclick="liveSaveCheckpoint()">📦 立即创建代码+数据库双备份</button>
        </div>
      </div>
      <div class="finding-card" style="margin-bottom: 18px;">
        <h3 class="finding-title">🔄 国内外 8 大 AI 编程软件已无缝打通（含 Git 提交防泄密门禁）</h3>
        <p class="finding-desc">本项目已写入统一记忆胶囊（<code>.vibe/capsule.md</code>）、原生规则与 Git 密钥防泄露钩子。任意软件额度用完，直接换另一个软件打开同一文件夹就能接着做：</p>
        <div class="ide-badges">
          <span class="ide-pill">✅ 腾讯 WorkBuddy</span><span class="ide-pill">✅ 腾讯 CodeBuddy</span>
          <span class="ide-pill">✅ 豆包编程 / 字节 Trae</span><span class="ide-pill">✅ Google Antigravity</span>
          <span class="ide-pill">✅ Cursor</span><span class="ide-pill">✅ Claude Code</span>
          <span class="ide-pill">✅ Windsurf</span><span class="ide-pill">✅ OpenAI Codex</span>
        </div>
      </div>
      <h3 style="margin-bottom: 12px; font-size: 16px;">📦 代码 + 数据库双轨时光机存档记录</h3>
      ${checkpointsHtml}
    </div>

    <div id="panel-sos" class="panel">${buildSosPanelHtml()}</div>
  </div>

  <div id="toast" class="toast">✅ 已复制指令！直接去 WorkBuddy / 豆包 / Antigravity 粘贴发送即可</div>
  <script>${buildDashboardClientJs()}</script>
</body>
</html>`;

  const reportOutPath = path.join(workspace.rootDir, '.vibe', '项目体检报告.html');
  const vibeOutPath = path.join(workspace.rootDir, '.vibe', 'boss-dashboard.html');
  fs.mkdirSync(path.dirname(reportOutPath), { recursive: true });
  fs.writeFileSync(reportOutPath, html, 'utf8');
  fs.writeFileSync(vibeOutPath, html, 'utf8');

  return { rootOutPath: reportOutPath, vibeOutPath };
}
