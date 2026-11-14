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

function friendlyCpLabel(label) {
  const raw = String(label || '').trim();
  if (!raw || raw === 'Initial GhostCTO baseline snapshot') return '接入保护时的初始备份';
  if (/^(feat|fix|chore|refactor|style|docs|perf|test)(\([^)]*\))?:/i.test(raw)) {
    const cleaned = raw.replace(/^(feat|fix|chore|refactor|style|docs|perf|test)(\([^)]*\))?:\s*/i, '');
    return /[\u4e00-\u9fa5]/.test(cleaned) ? cleaned : `修改自动备份（${cleaned}）`;
  }
  return raw;
}

function formatLocalTime(isoStr) {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr || '').replace('T', ' ').slice(0, 16);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

function buildStarterCanvasHtml() {
  return `<div class="finding-card" style="background: #ECFDF5; border-color: #A7F3D0;">
    <h3 class="finding-title" style="font-size: 18px; color: #064E3B;">🌱 全品类零碎想法孵化器：直接去 AI 聊天框说大白话就能开建</h3>
    <p class="finding-desc" style="color: #065F46;">不用懂代码，也不用背提示词！打开豆包、Trae、WorkBuddy 或 Cursor，直接说你想做什么（网站、多模块 AI 平台、在线小工具、微信小程序均可），或者在下面试着拆一份功能清单：</p>
    <div class="filter-row" style="margin-bottom: 8px;">
      <button type="button" class="filter-pill" onclick="fillStarterIdea('摄影设计工作室品牌展示官网与预约咨询')">🌐 示例：品牌官网</button>
      <button type="button" class="filter-pill" onclick="fillStarterIdea('多平台 AI 内容矩阵与智能体工作台系统')">🤖 示例：AI 工作台</button>
      <button type="button" class="filter-pill" onclick="fillStarterIdea('在线图文排版与格式转换效率工具')">⚡ 示例：在线小工具</button>
      <button type="button" class="filter-pill" onclick="fillStarterIdea('门店会员预约与微信小程序双端系统')">📱 示例：小程序系统</button>
    </div>
    <input id="starter-idea-input" class="topic-input" style="background:#FFF; border-color:#A7F3D0;" type="text" placeholder="✍️ 用一句大白话写下你想做什么..." />
    <div class="filter-row" style="align-items: center;">
      <span style="font-size:13px; font-weight:600; color:#065F46;">👥 谁来用：</span>
      <label style="font-size:13px; cursor:pointer;"><input type="radio" name="starter-audience" value="self" checked /> 个人自用（免登录）</label>
      <label style="font-size:13px; cursor:pointer;"><input type="radio" name="starter-audience" value="team" /> 团队或商用（带登录）</label>
      <label style="font-size:13px; cursor:pointer;"><input type="radio" name="starter-audience" value="public" /> 面向访客公开展示</label>
    </div>
    <div style="margin-top: 14px; display:flex; gap:10px; flex-wrap:wrap;">
      <button type="button" class="live-action-btn" onclick="copyZeroToOneKickoff()">📋 复制开局话术发给 AI</button>
      <button type="button" class="live-only-btn subtle-btn" style="display:none;" onclick="livePreviewIncubate()">🪄 先拆一份功能清单</button>
      <button type="button" class="live-only-btn subtle-btn" style="display:none;" onclick="liveBootstrapGoldenApp()">🚀 生成可运行工程起点（可选）</button>
    </div>
    <div id="incubate-preview-box" class="impact-result"></div>
  </div>`;
}

function renderFindingCard(f, idx) {
  const sevClass = f.severity === 'P0' ? 'sev-p0' : f.severity === 'P1' ? 'sev-p1' : 'sev-p2';
  const sevLabel =
    f.severity === 'P0'
      ? '🔴 需优先修复（点右侧按钮复制发给 AI）'
      : f.severity === 'P1'
      ? '🟠 建议上线前修复'
      : '⚪ 代码体积提醒（不影响使用，平时不用管）';
  const btnClass = f.severity === 'P2' ? 'copy-btn ghost-btn' : 'copy-btn';
  const btnLabel = f.severity === 'P2' ? '可选：以后想整理再复制' : '📋 复制这句话发给 AI 修好';
  return `<div class="finding-card ${sevClass}">
    <div class="finding-head">
      <div>
        <span class="sev-tag ${sevClass}">${sevLabel}</span>
        <span class="file-loc">${escHtml(f.file)}:${f.line}</span>
      </div>
      <button class="${btnClass}" data-copy="${escHtml(f.oneClickPrompt)}">${btnLabel}</button>
    </div>
    <h3 class="finding-title">${idx + 1}. ${escHtml(f.title)}</h3>
    <p class="finding-desc"><strong>大白话说明：</strong>${escHtml(f.founderImpact)}</p>
    ${f.severity === 'P2' ? '' : `<div class="prompt-preview">💬 发送给 AI 的话术：「${escHtml(f.oneClickPrompt)}」</div>`}
  </div>`;
}

/**
 * Generate standalone, dual-mode (Offline `file://` + Live `http://127.0.0.1` Interactive)
 * visual HTML report (`.vibe/项目体检报告.html` and `.vibe/boss-dashboard.html`).
 */
export function generateBossDashboard(workspace, audit) {
  const runtime = detectRuntimeTopology(workspace);
  const checkpoints = listCheckpoints(workspace.rootDir);
  const chains = audit.lineage.chains;
  const masterPrompts = buildMasterPromptArsenal(workspace, audit, '');
  const masterTemplates = buildMasterPromptArsenal(workspace, audit, '__BOSS_TOPIC__');
  const scoreHist = updateAndReadScoreHistory(workspace.rootDir, audit.score);

  const realCount = chains.filter(c => c.badge.startsWith('🟢')).length;
  const fakeOrWarnCount = chains.filter(c => c.badge.startsWith('🟡')).length;
  const brokenCount = chains.filter(c => c.badge.startsWith('🔴')).length;
  const urgentFindings = audit.findings.filter(f => f.severity === 'P0' || f.severity === 'P1');
  const p2Findings = audit.findings.filter(f => f.severity === 'P2');

  const scoreColor = audit.p0Count > 0 ? '#DC2626' : audit.score >= 85 ? '#059669' : '#D97706';
  const scoreBg = audit.p0Count > 0 ? '#FEF2F2' : audit.score >= 85 ? '#ECFDF5' : '#FFFBEB';
  const deltaFromFirst = audit.score - scoreHist.firstScore;
  const scoreDeltaHtml =
    deltaFromFirst > 0
      ? `<div class="score-delta">📈 较初次检查提升 +${deltaFromFirst} 分（初检 ${scoreHist.firstScore} 分）</div>`
      : '';

  const shareCertificateText = [
    `🛡️ 【${runtime.projectName} · 影子 CTO 工程体检报告】`,
    `📊 健康总分：${audit.score} / 100 分${deltaFromFirst > 0 ? `（较初检提升 +${deltaFromFirst} 分）` : ''}`,
    `🚦 结论：${audit.launchVerdict}`,
    `🔬 功能核验：🟢 真功能 ${realCount} 个 ｜ 🗄️ 数据表 ${audit.lineage.schemaTables.length} 张 ｜ 🔴 报错断头路 ${brokenCount} 个`
  ].join('\n');

  const portLinksHtml =
    runtime.ports.length > 0
      ? `<span class="port-label">直接打开我的网页：</span>` +
        runtime.ports
          .map(p => `<a class="port-pill" href="http://127.0.0.1:${p}" target="_blank" rel="noopener">🌐 打开网页 :${p} ↗</a>`)
          .join('')
      : `<span class="port-label">本项目无固定常驻网页端口</span>`;

  const isZeroCodeStarter = workspace.codeFiles.length === 0;

  let verdictBannerHtml = '';
  if (isZeroCodeStarter) {
    verdictBannerHtml = `<div class="verdict-banner">
      <span>🌱 新项目防崩保护已装好！直接打开 AI 聊天框用大白话告诉它你想做什么即可。</span>
    </div>`;
  } else if (urgentFindings.length === 0) {
    verdictBannerHtml = `<div class="verdict-banner">
      <span>🟢 结论：目前一切正常，不用给 AI 发任何修复话术！（直接去聊天框正常提需求就行）</span>
      <button type="button" class="jump-btn ghost-btn" onclick="switchTab('timemachine')">⏪ 打开后悔药退回上一版</button>
    </div>`;
  } else {
    const combinedUrgentPrompt = [
      '请先存一个备份，然后帮我按顺序修好体检发现的以下问题（不要改动其他正常功能）：',
      ...urgentFindings.map((f, i) => `${i + 1}. ${f.oneClickPrompt}`)
    ].join('\n');
    verdictBannerHtml = `<div class="verdict-banner">
      <span>🔴 结论：发现 ${urgentFindings.length} 个问题需要修一下！点右边按钮复制话术，粘贴发给 AI 即可修好</span>
      <button class="copy-btn" data-copy="${escHtml(combinedUrgentPrompt)}">🚀 一键复制全部修复话术（发给 AI）</button>
    </div>`;
  }

  let findingsHtml = '';
  if (isZeroCodeStarter) {
    findingsHtml = buildStarterCanvasHtml();
  } else if (urgentFindings.length === 0) {
    const p2DrawerHtml =
      p2Findings.length > 0
        ? `<details class="p2-drawer">
            <summary>查看 ${p2Findings.length} 条可选的代码体积提醒（不影响正常使用，平时不用管，也不用发给 AI）</summary>
            <div class="p2-drawer-body">${p2Findings.map((f, i) => renderFindingCard(f, i)).join('\n')}</div>
          </details>`
        : '';
    findingsHtml = `<div class="calm-ok-card">
      <div class="calm-ok-title">✅ 核心功能全部正常（0 个报错 · 0 个假按钮），你现在什么都不用点！</div>
      <div class="calm-ok-desc">
        <strong>1. 平时怎么用？</strong> 直接关掉本页，去你的 AI 聊天框里<strong>照常说大白话提需求就行</strong>（自动备份与写完自动查错已在后台保护你）。<br/>
        <strong>2. 万一 AI 把页面改坏了怎么办？</strong> 点上方标签栏的 <strong>「⏪ 后悔药备份」</strong>，一键就能把代码和数据退回上一版。
      </div>
    </div>
    ${p2DrawerHtml}`;
  } else {
    const urgentCardsHtml = urgentFindings.map((f, i) => renderFindingCard(f, i)).join('\n');
    const p2DrawerHtml =
      p2Findings.length > 0
        ? `<details class="p2-drawer" style="margin-top: 14px;">
            <summary>另有 ${p2Findings.length} 条可选的代码体积提醒（不影响使用，修完上面问题后再看即可）</summary>
            <div class="p2-drawer-body">${p2Findings.map((f, i) => renderFindingCard(f, i)).join('\n')}</div>
          </details>`
        : '';
    findingsHtml = urgentCardsHtml + p2DrawerHtml;
  }

  const chainsRowsHtml = chains
    .map(
      c => `<tr>
        <td>${escHtml(c.badge)}</td>
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
      return `<div class="finding-card prompt-card" data-pcat="${escHtml(mp.category)}">
        <div class="finding-head">
          <div>
            <span class="sev-tag sev-master">${escHtml(mp.badge)}</span>
            <span class="file-loc">${escHtml(mp.inspiration)}</span>
          </div>
          <button class="copy-btn master-copy-btn" data-copy="${escHtml(mp.prompt)}" data-template="${escHtml(tplObj.prompt)}">📋 复制这条话术</button>
        </div>
        <h3 class="finding-title">${idx + 1}. ${escHtml(mp.title)}</h3>
        <p class="finding-desc"><strong>什么时候用：</strong>${escHtml(mp.whenToUse)}</p>
        <details class="prompt-details">
          <summary>查看完整话术内容</summary>
          <pre class="prompt-raw">${escHtml(mp.prompt)}</pre>
        </details>
      </div>`;
    })
    .join('\n');

  const checkpointsHtml =
    checkpoints.length === 0
      ? `<div class="empty-note">目前还没有历史备份，下次修改前会自动创建。</div>`
      : `<div class="undo-card-list">` +
        checkpoints
          .slice(0, 12)
          .map(cp => {
            const label = friendlyCpLabel(cp.label);
            return `<div class="undo-row">
              <div class="undo-info">
                <span class="undo-name">📦 ${escHtml(label)}</span>
                <span class="undo-time">${escHtml(formatLocalTime(cp.createdAt))} · 含数据库备份 ${cp.dbCount} 个</span>
              </div>
              <div class="undo-actions">
                <button type="button" class="live-only-btn rewind-outline-btn" style="display:none;" onclick="liveRewindCheckpoint('${escHtml(cp.id)}', '${escHtml(label)}')">⏪ 退回这一版</button>
                <button class="copy-btn ghost-btn offline-only-btn" data-copy="请把代码和数据库一起安全回退到存档点 ${escHtml(cp.id)}（${escHtml(label)}）">📋 复制退回话术</button>
              </div>
            </div>`;
          })
          .join('\n') +
        `</div>`;

  const riskTabBadge = urgentFindings.length > 0 ? `${urgentFindings.length} 项需修` : '一切正常';

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(runtime.projectName)} · 项目保护与体检看板</title>
  <style>${buildDashboardCss(scoreBg, scoreColor)}</style>
</head>
<body>
  <div class="container">
    <div class="mode-bar">
      <span id="live-status-text" class="mode-badge-offline">📄 自动保护已开启（平时不用操作本页，直接去 AI 聊天框说大白话即可）</span>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" id="btn-live-verify" class="live-only-btn subtle-btn" style="display:none;" onclick="liveVerifyCode()">✅ 检查代码有没有写坏</button>
        <button type="button" id="btn-live-audit" class="live-action-btn" style="display:none;" onclick="liveRunAudit()">🔄 重新体检刷新</button>
        <button class="copy-btn ghost-btn" data-copy="${escHtml(shareCertificateText)}">📋 复制体检摘要</button>
      </div>
    </div>

    <div class="hero">
      <div class="hero-left">
        <h1>🛡️ ${escHtml(runtime.projectName)} · 项目保护与真假体检看板</h1>
        <div class="hero-sub">自动备份、防乱改文件、写完自动查错已在后台生效。点击下方按钮可直接打开你的作品网页：</div>
        <div class="port-list">${portLinksHtml}</div>
      </div>
      <div class="score-box">
        <div class="score-num">${isZeroCodeStarter ? '待建' : audit.score}</div>
        <div class="score-label">${isZeroCodeStarter ? '空白新项目护栏已就绪' : '项目健康总分（满分 100）'}</div>
        ${scoreDeltaHtml}
      </div>
    </div>

    ${verdictBannerHtml}

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--green);">${realCount} 个</div>
        <div class="kpi-name">🟢 真实已接通功能（真能存进数据库）</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--amber);">${fakeOrWarnCount} 个</div>
        <div class="kpi-name">🟡 演示假功能（刷新网页会丢数据）</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" style="color: var(--red);">${brokenCount} 个</div>
        <div class="kpi-name">🔴 报错断头路（点了会报 404）</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val">${audit.lineage.schemaTables.length} 张</div>
        <div class="kpi-name">🗄️ 真实数据库表（已存 ${checkpoints.length} 份后悔药备份）</div>
      </div>
    </div>

    <div class="tabs">
      <button id="tab-btn-risks" class="tab-btn active" onclick="switchTab('risks', this)">🩺 体检结果 (${riskTabBadge})</button>
      <button id="tab-btn-prompts" class="tab-btn" onclick="switchTab('prompts', this)">✨ 常用防崩话术 (${masterPrompts.length})</button>
      <button id="tab-btn-lineage" class="tab-btn" onclick="switchTab('lineage', this)">🔬 功能真假透视表 (${chains.length})</button>
      <button id="tab-btn-timemachine" class="tab-btn" onclick="switchTab('timemachine', this)">⏪ 后悔药备份 (${checkpoints.length})</button>
      <button id="tab-btn-sos" class="tab-btn" onclick="switchTab('sos', this)">🆘 英文弹窗急救</button>
    </div>

    <div id="panel-risks" class="panel active">${findingsHtml}</div>

    <div id="panel-prompts" class="panel">
      <div class="arsenal-hero">
        <h3 class="finding-title">✨ 常用防崩话术库（需要做大改动或 AI 死循环修不好时，点一下复制就能用）</h3>
        <p class="finding-desc" style="margin-bottom: 4px;">平时小改直接聊即可；做复杂新模块或修顽固问题时，可在下方填一句需求，点对应按钮自动带入本项目真实数据表：</p>
        <input id="boss-topic-input" class="topic-input" type="text" placeholder="✍️ 选填：输入你想加的功能或页面（如：新增智能体工作流编排页）..." />
        <div class="filter-row">
          <button class="filter-pill active" onclick="filterPrompts('all', this)">全部精选 (${masterPrompts.length})</button>
          <button class="filter-pill" onclick="filterPrompts('khazix', this)">🔥 拆需求与参考图审美 (4)</button>
          <button class="filter-pill" onclick="filterPrompts('engineering', this)">🔪 防改崩与死循环破局 (2)</button>
          <button class="filter-pill" onclick="filterPrompts('design', this)">🎨 界面与文案去塑料味 (2)</button>
        </div>
      </div>
      ${masterPromptsHtml}
    </div>

    <div id="panel-lineage" class="panel">
      <div id="live-impact-box" class="live-box">
        <strong>🔍 查某个按钮连着哪些代码文件（输入界面上的中文词即可）</strong>
        <div class="live-row">
          <input id="live-impact-input" type="text" placeholder="输入界面上的按钮文字或模块名..." />
          <button type="button" class="live-action-btn" onclick="liveQueryImpact()">🔍 查询关联范围</button>
        </div>
        <div id="live-impact-result" class="impact-result"></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>状态</th><th>功能接口</th><th>真实数据去向</th><th>大白话说明</th><th>对应文件</th></tr></thead>
          <tbody>${chainsRowsHtml}</tbody>
        </table>
      </div>
    </div>

    <div id="panel-timemachine" class="panel">
      <div id="live-save-box" class="live-box">
        <strong>⚡ 手动存一份新备份（同时备份代码 + 数据库）</strong>
        <div class="live-row">
          <input id="live-save-label" type="text" placeholder="写一句备注（不填也可以直接点右边按钮）..." />
          <button type="button" class="live-action-btn" onclick="liveSaveCheckpoint()">📦 存个新备份</button>
        </div>
      </div>
      <div class="finding-card" style="margin-bottom: 14px;">
        <h3 class="finding-title">🔄 8 大 AI 编程软件已自动打通（随时换软件接着做）</h3>
        <p class="finding-desc">哪个软件免费额度用完了，直接换另一个软件打开同一个文件夹就能接着做，不用重新交代背景：</p>
        <div class="ide-badges">
          <span class="ide-pill">✅ 腾讯 WorkBuddy</span><span class="ide-pill">✅ 腾讯 CodeBuddy</span>
          <span class="ide-pill">✅ 豆包编程 / 字节 Trae</span><span class="ide-pill">✅ Google Antigravity</span>
          <span class="ide-pill">✅ Cursor</span><span class="ide-pill">✅ Claude Code</span>
          <span class="ide-pill">✅ Windsurf</span><span class="ide-pill">✅ OpenAI Codex</span>
        </div>
      </div>
      ${checkpointsHtml}
    </div>

    <div id="panel-sos" class="panel">${buildSosPanelHtml()}</div>
  </div>

  <div id="toast" class="toast">✅ 已复制！直接去 AI 聊天框粘贴发送即可</div>
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
