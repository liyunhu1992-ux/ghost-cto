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

function buildStarterPrimaryCardHtml() {
  return `<section class="primary-card">
    <div class="status-pill pill-start">● 新项目已准备好 · 全品类零碎想法孵化器</div>
    <h1 class="primary-title">直接去 AI 聊天框说你想做什么就行</h1>
    <p class="primary-desc">不用懂代码，也不用背提示词。打开你的 AI 编程软件（豆包 / Trae / WorkBuddy / Cursor / Antigravity），直接用大白话告诉它你想做网站、AI 平台、小工具还是小程序。</p>
    <div style="margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--hairline);">
      <div style="font-size: 13.5px; font-weight: 600; margin-bottom: 8px;">或者在下面写一句想法，帮你生成第一句开局话术（选填）：</div>
      <div class="filter-row" style="margin-top: 0; margin-bottom: 8px;">
        <button type="button" class="filter-pill" onclick="fillStarterIdea('摄影设计工作室品牌展示官网与预约咨询')">示例：品牌官网</button>
        <button type="button" class="filter-pill" onclick="fillStarterIdea('多平台 AI 内容矩阵与智能体工作台系统')">示例：AI 工作台</button>
        <button type="button" class="filter-pill" onclick="fillStarterIdea('在线图文排版与格式转换小工具')">示例：在线小工具</button>
        <button type="button" class="filter-pill" onclick="fillStarterIdea('门店会员预约与微信小程序系统')">示例：小程序系统</button>
      </div>
      <input id="starter-idea-input" class="topic-input" type="text" placeholder="用大白话写一句你想做什么..." />
      <div class="filter-row" style="align-items: center;">
        <span style="font-size:13px; color:var(--muted);">谁来用：</span>
        <label style="font-size:13px; cursor:pointer;"><input type="radio" name="starter-audience" value="self" checked /> 自己用</label>
        <label style="font-size:13px; cursor:pointer;"><input type="radio" name="starter-audience" value="team" /> 团队或商用（带登录）</label>
        <label style="font-size:13px; cursor:pointer;"><input type="radio" name="starter-audience" value="public" /> 公开给访客看</label>
      </div>
      <div style="margin-top: 14px; display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="live-action-btn" onclick="copyZeroToOneKickoff()">复制这句话发给 AI</button>
        <button type="button" class="live-only-btn subtle-btn" style="display:none;" onclick="livePreviewIncubate()">先拆一份功能清单</button>
        <button type="button" class="live-only-btn subtle-btn" style="display:none;" onclick="liveBootstrapGoldenApp()">生成可运行起点（可选）</button>
      </div>
      <div id="incubate-preview-box" class="impact-result"></div>
    </div>
  </section>`;
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
  const brokenCount = chains.filter(c => c.badge.startsWith('🔴')).length;
  const urgentFindings = audit.findings.filter(f => f.severity === 'P0' || f.severity === 'P1');

  const scoreColor = audit.p0Count > 0 ? '#DC2626' : audit.score >= 85 ? '#059669' : '#D97706';
  const scoreBg = audit.p0Count > 0 ? '#FEF2F2' : audit.score >= 85 ? '#ECFDF5' : '#FFFBEB';
  const deltaFromFirst = audit.score - scoreHist.firstScore;

  const shareCertificateText = [
    `【${runtime.projectName} · 影子 CTO 体检摘要】`,
    `工程健康分：${audit.score} / 100${deltaFromFirst > 0 ? `（较初检 +${deltaFromFirst} 分）` : ''}`,
    `结论：${audit.launchVerdict}`,
    `核验功能：${realCount} 条可用 ｜ 数据表 ${audit.lineage.schemaTables.length} 张 ｜ 断头接口 ${brokenCount} 条`
  ].join('\n');

  const portStripHtml =
    runtime.ports.length > 0 || realCount > 0 || audit.lineage.schemaTables.length > 0
      ? `<div class="port-strip">
          <div class="port-list">
            ${
              runtime.ports.length > 0
                ? `<span class="port-label">打开我的网页：</span>` +
                  runtime.ports
                    .map(p => `<a class="port-pill" href="http://127.0.0.1:${p}" target="_blank" rel="noopener">网页 :${p} ↗</a>`)
                    .join('')
                : `<span class="port-label">本项目无固定常驻网页端口</span>`
            }
          </div>
          <span class="quiet-meta">已核验 ${realCount} 个功能 · ${audit.lineage.schemaTables.length} 张表</span>
        </div>`
      : '';

  const isZeroCodeStarter = workspace.codeFiles.length === 0;

  let primaryCardHtml = '';
  if (isZeroCodeStarter) {
    primaryCardHtml = buildStarterPrimaryCardHtml();
  } else if (urgentFindings.length === 0) {
    primaryCardHtml = `<section class="primary-card">
      <div class="status-pill pill-ok">● 状态正常 · 不用发任何指令</div>
      <h1 class="primary-title">一切正常，现在什么都不用点</h1>
      <p class="primary-desc">你平时不需要看这个页面。直接关掉它，回 AI 聊天框用大白话正常说你想加什么、改什么就行（自动备份和防改崩正在后台保护你）。</p>
      ${portStripHtml}
    </section>`;
  } else {
    const combinedUrgentPrompt = [
      '请先存一个备份，然后帮我修好体检发现的以下问题（不要改动其他正常功能）：',
      ...urgentFindings.map((f, i) => `${i + 1}. ${f.oneClickPrompt}`)
    ].join('\n');
    const urgentRowsHtml = urgentFindings
      .map(
        (f, idx) => `<div class="urgent-item">
          <div class="urgent-item-text">
            <div class="urgent-item-title">${idx + 1}. ${escHtml(f.title)}</div>
            <div class="urgent-item-desc">${escHtml(f.founderImpact)}</div>
          </div>
          <button class="copy-btn" data-copy="${escHtml(f.oneClickPrompt)}">复制这句话发给 AI</button>
        </div>`
      )
      .join('\n');

    primaryCardHtml = `<section class="primary-card">
      <div class="status-pill pill-warn">● 发现 ${urgentFindings.length} 个地方需要让 AI 修一下</div>
      <div class="urgent-head">
        <div>
          <h1 class="primary-title">点右边按钮复制话术，发给 AI 就能修好</h1>
          <p class="primary-desc">不用看懂代码细节。点按钮复制后，去 AI 聊天框粘贴发送即可：</p>
        </div>
        ${
          urgentFindings.length > 1
            ? `<button class="copy-btn" data-copy="${escHtml(combinedUrgentPrompt)}">一键复制全部（共 ${urgentFindings.length} 条）</button>`
            : ''
        }
      </div>
      <div class="urgent-list">${urgentRowsHtml}</div>
      ${portStripHtml}
    </section>`;
  }

  const recentCheckpointsHtml =
    checkpoints.length === 0
      ? `<div class="empty-note">目前还没有历史备份，下次让 AI 改代码前会自动创建。</div>`
      : checkpoints
          .slice(0, 3)
          .map(cp => {
            const label = friendlyCpLabel(cp.label);
            return `<div class="undo-row">
              <div class="undo-info">
                <span class="undo-name">${escHtml(label)}</span>
                <span class="undo-time">${escHtml(formatLocalTime(cp.createdAt))}</span>
              </div>
              <div class="undo-actions">
                <button type="button" class="live-only-btn rewind-outline-btn" style="display:none;" onclick="liveRewindCheckpoint('${escHtml(cp.id)}', '${escHtml(label)}')">退回这一版</button>
                <button class="copy-btn ghost-btn offline-only-btn" data-copy="请把代码和数据库一起安全回退到存档点 ${escHtml(cp.id)}（${escHtml(label)}）">复制退回话术</button>
              </div>
            </div>`;
          })
          .join('\n');

  const findingsHtml =
    audit.findings.length === 0
      ? `<div class="empty-ok">当前没有任何代码隐患或体积提醒。</div>`
      : audit.findings
          .map((f, idx) => {
            const sevClass = f.severity === 'P0' ? 'sev-p0' : f.severity === 'P1' ? 'sev-p1' : 'sev-p2';
            const sevLabel =
              f.severity === 'P0' ? '需修复' : f.severity === 'P1' ? '建议上线前修' : '仅代码整理提醒（平时不用管）';
            const btnClass = f.severity === 'P2' ? 'copy-btn ghost-btn' : 'copy-btn';
            return `<div class="finding-card">
              <div class="finding-head">
                <div>
                  <span class="sev-tag ${sevClass}">${sevLabel}</span>
                  <span class="file-loc">${escHtml(f.file)}:${f.line}</span>
                </div>
                <button class="${btnClass}" data-copy="${escHtml(f.oneClickPrompt)}">复制话术</button>
              </div>
              <h3 class="finding-title">${idx + 1}. ${escHtml(f.title)}</h3>
              <p class="finding-desc">${escHtml(f.founderImpact)}</p>
            </div>`;
          })
          .join('\n');

  const chainsRowsHtml = chains
    .map(
      c => `<tr>
        <td>${escHtml(c.badge)}</td>
        <td><code>${escHtml(c.method)} ${escHtml(c.endpoint)}</code></td>
        <td>${escHtml(c.persistence)}</td>
        <td>${escHtml(c.summary)}</td>
      </tr>`
    )
    .join('\n');

  const masterPromptsHtml = masterPrompts
    .map((mp, idx) => {
      const tplObj = masterTemplates[idx];
      return `<div class="finding-card prompt-card" data-pcat="${escHtml(mp.category)}">
        <div class="finding-head">
          <span class="sev-tag sev-master">${escHtml(mp.badge)}</span>
          <button class="copy-btn master-copy-btn" data-copy="${escHtml(mp.prompt)}" data-template="${escHtml(tplObj.prompt)}">复制指令</button>
        </div>
        <h3 class="finding-title">${idx + 1}. ${escHtml(mp.title)}</h3>
        <p class="finding-desc">${escHtml(mp.whenToUse)}</p>
        <details class="prompt-details">
          <summary>查看完整指令内容</summary>
          <pre class="prompt-raw">${escHtml(mp.prompt)}</pre>
        </details>
      </div>`;
    })
    .join('\n');

  const allCheckpointsHtml =
    checkpoints.length === 0
      ? `<div class="empty-note">暂无备份记录。</div>`
      : checkpoints
          .slice(0, 15)
          .map(cp => {
            const label = friendlyCpLabel(cp.label);
            return `<div class="undo-row">
              <div class="undo-info">
                <span class="undo-name">${escHtml(label)}</span>
                <span class="undo-time">${escHtml(formatLocalTime(cp.createdAt))} · <code>${escHtml(cp.id)}</code></span>
              </div>
              <div class="undo-actions">
                <button type="button" class="live-only-btn rewind-outline-btn" style="display:none;" onclick="liveRewindCheckpoint('${escHtml(cp.id)}', '${escHtml(label)}')">退回这一版</button>
                <button class="copy-btn ghost-btn offline-only-btn" data-copy="请把代码和数据库一起安全回退到存档点 ${escHtml(cp.id)}（${escHtml(label)}）">复制退回话术</button>
              </div>
            </div>`;
          })
          .join('\n');

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(runtime.projectName)} · 项目保护看板</title>
  <style>${buildDashboardCss(scoreBg, scoreColor)}</style>
</head>
<body>
  <div class="container">
    <header class="top-bar">
      <div class="brand-row">
        <span class="proj-name">${escHtml(runtime.projectName)}</span>
        <span id="live-status-text" class="mode-badge-offline">● 自动保护已就绪</span>
      </div>
      <button type="button" id="btn-live-audit" class="live-action-btn subtle-btn" style="display:none;" onclick="liveRunAudit()">重新检查</button>
    </header>

    ${primaryCardHtml}

    <section class="undo-card">
      <div class="undo-head">
        <div>
          <h2 class="undo-title">后悔药 · 改坏了退回上一版</h2>
          <p class="undo-sub">万一 AI 把界面改乱了或打不开了，点右边按钮就能把代码和数据一起退回去：</p>
        </div>
        <button type="button" class="live-only-btn subtle-btn" style="display:none;" onclick="liveQuickSave()">+ 存个新备份</button>
      </div>
      ${recentCheckpointsHtml}
    </section>

    <details class="more-drawer">
      <summary class="more-summary">遇到英文弹窗看不懂？或展开进阶工具箱（平时不用点）</summary>
      <div class="more-body">
        <div class="quick-faq">
          <div><strong>弹窗看到 Allow / Accept / Run：</strong>意思是允许 AI 在项目里干活，直接点同意。</div>
          <div><strong>电脑重启后网页打不开：</strong>去项目文件夹双击 <strong>「双击启动项目.command」</strong>（苹果）或 <strong>「.bat」</strong>（Windows）即可。</div>
        </div>

        <div class="tech-strip">
          <span class="score-pill">工程技术得分 ${audit.score} / 100</span>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button type="button" id="btn-live-verify" class="live-only-btn subtle-btn" style="display:none;" onclick="liveVerifyCode()">检查代码语法</button>
            <button class="copy-btn ghost-btn" data-copy="${escHtml(shareCertificateText)}">复制体检摘要</button>
          </div>
        </div>

        <div class="tabs">
          <button class="tab-btn active" onclick="switchTab('risks', this)">技术细节 (${audit.findings.length})</button>
          <button class="tab-btn" onclick="switchTab('prompts', this)">常用话术库 (${masterPrompts.length})</button>
          <button class="tab-btn" onclick="switchTab('lineage', this)">接口连接表 (${chains.length})</button>
          <button class="tab-btn" onclick="switchTab('timemachine', this)">全部备份 (${checkpoints.length})</button>
          <button class="tab-btn" onclick="switchTab('sos', this)">常见弹窗解答</button>
        </div>

        <div id="panel-risks" class="panel active">${findingsHtml}</div>

        <div id="panel-prompts" class="panel">
          <div class="arsenal-hero">
            <p class="finding-desc">需要做大改动或卡住时，可在下方填一句需求再复制对应话术（平时直接聊即可，不用复制）：</p>
            <input id="boss-topic-input" class="topic-input" type="text" placeholder="选填：输入你想加的功能或页面..." />
            <div class="filter-row">
              <button class="filter-pill active" onclick="filterPrompts('all', this)">全部 (${masterPrompts.length})</button>
              <button class="filter-pill" onclick="filterPrompts('khazix', this)">拆需求与审美 (4)</button>
              <button class="filter-pill" onclick="filterPrompts('engineering', this)">防改崩与救急 (2)</button>
              <button class="filter-pill" onclick="filterPrompts('design', this)">界面与文案去塑料味 (2)</button>
            </div>
          </div>
          ${masterPromptsHtml}
        </div>

        <div id="panel-lineage" class="panel">
          <div id="live-impact-box" class="live-box">
            <div style="font-size:13px; font-weight:600;">按按钮或模块词查关联文件</div>
            <div class="live-row">
              <input id="live-impact-input" type="text" placeholder="输入界面上的按钮文字或模块词..." />
              <button type="button" class="live-action-btn" onclick="liveQueryImpact()">查询</button>
            </div>
            <div id="live-impact-result" class="impact-result"></div>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>状态</th><th>接口</th><th>数据去向</th><th>说明</th></tr></thead>
              <tbody>${chainsRowsHtml}</tbody>
            </table>
          </div>
        </div>

        <div id="panel-timemachine" class="panel">
          <div id="live-save-box" class="live-box">
            <div style="font-size:13px; font-weight:600;">带备注保存备份</div>
            <div class="live-row">
              <input id="live-save-label" type="text" placeholder="输入备份备注..." />
              <button type="button" class="live-action-btn" onclick="liveSaveCheckpoint()">保存备份</button>
            </div>
          </div>
          ${allCheckpointsHtml}
        </div>

        <div id="panel-sos" class="panel">${buildSosPanelHtml()}</div>
      </div>
    </details>
  </div>

  <div id="toast" class="toast">已复制，直接去 AI 聊天框粘贴发送即可</div>
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
