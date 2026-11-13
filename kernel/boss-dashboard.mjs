import fs from 'node:fs';
import path from 'node:path';
import { listCheckpoints } from './time-capsule.mjs';
import { detectRuntimeTopology } from './memory-capsule.mjs';
import { buildMasterPromptArsenal } from './prompt-arsenal.mjs';

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
      if (typeof parsed.firstScore === 'number') {
        hist.firstScore = parsed.firstScore;
      }
      if (typeof parsed.currentScore === 'number' && parsed.currentScore !== currentScore) {
        hist.previousScore = parsed.currentScore;
      } else if (typeof parsed.previousScore === 'number') {
        hist.previousScore = parsed.previousScore;
      }
    } catch {
      // ignore malformed history
    }
  }
  hist.currentScore = currentScore;
  hist.updatedAt = new Date().toISOString();
  fs.writeFileSync(histPath, JSON.stringify(hist, null, 2), 'utf8');
  return hist;
}

/**
 * Generate a standalone, dual-mode (Offline `file://` + Live `http://127.0.0.1` 0-Token Interactive)
 * zero-jargon Chinese visual HTML cockpit (`老板全景驾驶舱.html`).
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

  const scoreColor =
    audit.p0Count > 0 ? '#DC2626' : audit.score >= 85 ? '#059669' : '#D97706';
  const scoreBg =
    audit.p0Count > 0 ? '#FEF2F2' : audit.score >= 85 ? '#ECFDF5' : '#FFFBEB';

  const deltaFromFirst = audit.score - scoreHist.firstScore;
  const scoreDeltaHtml =
    deltaFromFirst > 0
      ? `<div class="score-delta">📈 较初检跃升 +${deltaFromFirst} 分（初检 ${scoreHist.firstScore} 分）</div>`
      : '';

  const shareCertificateText = [
    `🛡️ 【${runtime.projectName} · 影子 CTO (GhostCTO) 商用体检战报】`,
    `📊 商用健康总分：${audit.score} / 100 分${deltaFromFirst > 0 ? `（较初检提升 +${deltaFromFirst} 分）` : ''}`,
    `🚦 上线安检结论：${audit.launchVerdict}`,
    `🔬 全栈真假穿透：🟢 真通落库 ${realCount} 条 ｜ 🗄️ 真实数据表 ${audit.lineage.schemaTables.length} 张 ｜ 🔴 404断头路 ${brokenCount} 条`,
    `⚡ 由开源项目 GhostCTO（影子 CTO）0-Token 本地确定性引擎验真生成`
  ].join('\n');

  const portLinksHtml =
    runtime.ports.length > 0
      ? runtime.ports
          .map(
            p =>
              `<a class="port-pill" href="http://127.0.0.1:${p}" target="_blank" rel="noopener">🌐 打开业务端口 :${p}</a>`
          )
          .join('')
      : `<span class="muted">自动端口（双击项目文件夹内的「双击启动项目」即可自动打开网页）</span>`;

  const isZeroCodeStarter = workspace.codeFiles.length === 0;
  const displayVerdict = isZeroCodeStarter
    ? '🌱 零基础起飞画布已就绪！8 大 AI 软件防崩护栏已装好，在下方写一句你的想法即可开启第一次 Vibe Coding！'
    : audit.launchVerdict;

  const findingsHtml = isZeroCodeStarter
    ? `<div class="finding-card" style="border-left: 5px solid #059669; background: #F0FDF4;">
        <h3 class="finding-title" style="font-size: 18px; color: #065F46;">🌱 欢迎开启你的 Vibe Coding 之旅！（当前文件夹还是空白画布）</h3>
        <p class="finding-desc" style="color: #064E3B;">完全不懂代码也没关系！GhostCTO 已经帮你把防崩护栏、数据库真落库铁律和后悔药时光机全部装好了。现在只需<strong>用中文大白话写下你想做的东西</strong>，点下方绿色按钮复制第一句指令，粘贴进豆包 / Trae / 腾讯 WorkBuddy / Cursor 就能稳稳开工：</p>
        <div class="filter-row" style="margin-bottom: 8px;">
          <button type="button" class="filter-pill" onclick="fillStarterIdea('我想做一个清爽好用的门店预约与记账小工具，手机和电脑网页都能打开，数据重启不能丢')">💡 灵感1：预约记账小工具</button>
          <button type="button" class="filter-pill" onclick="fillStarterIdea('我想做一个背单词与每日打卡学习网页，能添加自己的词库并统计连续打卡天数')">💡 灵感2：打卡学习小网站</button>
          <button type="button" class="filter-pill" onclick="fillStarterIdea('我想做一个个人作品集与客户留言收集网站，界面干净高级，后台能查看导出留言')">💡 灵感3：个人主页与表单</button>
        </div>
        <input id="starter-idea-input" class="topic-input" style="background:#FFF; border-color:#86EFAC;" type="text" placeholder="✍️ 在这里用大白话写下你想做的软件、网页或小工具..." />
        <div style="margin-top: 12px;">
          <button type="button" class="live-action-btn" style="padding: 10px 18px; font-size: 14px;" onclick="copyZeroToOneKickoff()">🚀 一键生成并复制「小白第一句 Vibe Coding 开局神令」</button>
        </div>
      </div>`
    : audit.findings.length === 0
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
          <button class="copy-btn master-copy-btn" data-copy="${escHtml(mp.prompt)}" data-template="${escHtml(tplObj.prompt)}">📋 一键复制大师指令（已注入本项目家底）</button>
        </div>
        <h3 class="finding-title">${idx + 1}. ${escHtml(mp.title)}</h3>
        <p class="finding-desc"><strong>什么时候用：</strong>${escHtml(mp.whenToUse)}</p>
        <p class="finding-desc" style="margin-top:-4px;"><strong>为什么管用：</strong>${escHtml(mp.whyItWorks)}</p>
        <details class="prompt-details">
          <summary>👀 点击展开查看完整指令内容（已自动带入 ${escHtml(runtime.projectName)} 的数据表与打包护栏）</summary>
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
      padding: 24px 20px 64px;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 1120px; margin: 0 auto; }
    .mode-bar {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 16px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 13px;
    }
    .mode-badge-offline { color: var(--muted); font-weight: 600; }
    .mode-badge-live { color: var(--green); font-weight: 700; }
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
      min-width: 220px;
    }
    .score-num { font-size: 38px; font-weight: 800; color: ${scoreColor}; font-variant-numeric: tabular-nums; line-height: 1.1; }
    .score-label { font-size: 12.5px; color: var(--muted); margin-top: 4px; }
    .score-delta {
      margin-top: 6px; display: inline-block; background: #ECFDF5; color: #065F46;
      border: 1px solid #A7F3D0; border-radius: 999px; padding: 2px 10px; font-size: 11.5px; font-weight: 700;
    }
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
    .finding-card.prompt-card { border-left: 5px solid #18181B; }
    .finding-head {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;
    }
    .sev-tag { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 6px; }
    .sev-tag.sev-p0 { background: #FEF2F2; color: var(--red); }
    .sev-tag.sev-p1 { background: #FFFBEB; color: var(--amber); }
    .sev-tag.sev-p2 { background: #EFF6FF; color: var(--accent); }
    .sev-tag.sev-master { background: #F4F4F5; color: #18181B; border: 1px solid #E4E4E7; }
    .file-loc { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--muted); margin-left: 8px; }
    .finding-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
    .finding-desc { font-size: 14px; color: #3F3F46; margin-bottom: 10px; }
    .prompt-preview {
      background: #F4F4F5; border-radius: 8px; padding: 9px 12px; font-size: 12.5px; color: #52525B;
    }
    .arsenal-hero {
      background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
      padding: 18px 20px; margin-bottom: 16px;
    }
    .topic-input {
      width: 100%; padding: 11px 14px; border-radius: 10px; border: 1px solid #D4D4D8;
      font-size: 14px; margin-top: 10px; background: #FAFAF9; color: var(--text);
    }
    .topic-input:focus { outline: 2px solid var(--accent); border-color: transparent; background: #FFF; }
    .filter-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .filter-pill {
      padding: 5px 12px; border-radius: 999px; border: 1px solid var(--border);
      background: #F4F4F5; color: var(--muted); font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .filter-pill.active { background: var(--primary); color: #FFF; border-color: var(--primary); }
    .prompt-details { margin-top: 8px; background: #FAFAF9; border: 1px solid var(--border); border-radius: 9px; padding: 8px 12px; }
    .prompt-details summary { font-size: 12.5px; font-weight: 600; color: var(--accent); cursor: pointer; }
    .prompt-raw {
      margin-top: 10px; white-space: pre-wrap; word-break: break-word; font-size: 12.5px;
      line-height: 1.55; color: #27272A; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", monospace;
    }
    .copy-btn, .live-action-btn, .live-only-btn {
      background: var(--primary); color: #FFF; border: none; border-radius: 8px;
      padding: 7px 13px; font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .live-action-btn { background: var(--green); }
    .live-rewind-btn { background: #DC2626; }
    .copy-btn:hover, .live-action-btn:hover, .live-only-btn:hover { opacity: 0.9; }
    .ghost-btn { background: #F4F4F5; color: var(--text); border: 1px solid var(--border); }
    .live-box {
      background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 14px;
      padding: 16px 18px; margin-bottom: 16px; display: none;
    }
    .live-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 8px; }
    .live-row input {
      flex: 1; min-width: 240px; padding: 9px 12px; border-radius: 8px; border: 1px solid #A7F3D0; font-size: 13.5px;
    }
    .impact-result {
      margin-top: 12px; background: #FFF; border: 1px solid var(--border); border-radius: 10px;
      padding: 12px 14px; font-size: 13px; white-space: pre-wrap; display: none;
    }
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
    <div class="mode-bar">
      <span id="live-status-text" class="mode-badge-offline">📄 当前为离线快照模式（双击项目内的「打开实时驾驶舱」即可开启 0-Token 网页一键重测 / 秒备份 / 秒回退）</span>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="btn-live-audit" class="live-action-btn" style="display:none;" onclick="liveRunAudit()">🔄 0-Token 立即重新体检刷新分数</button>
        <button class="copy-btn ghost-btn" data-copy="${escHtml(shareCertificateText)}">🏅 复制项目体检战报（发团队/晒进展）</button>
      </div>
    </div>

    <div class="hero">
      <div class="hero-left">
        <h1>🛡️ ${escHtml(runtime.projectName)} · 影子 CTO 老板全景驾驶舱</h1>
        <div class="hero-sub">不看一行英文代码，30 秒看清你的产品哪些真通、哪些有坑、能不能发给客户用。</div>
        <div class="port-list">${portLinksHtml}</div>
      </div>
      <div class="score-box">
        <div class="score-num">${audit.score}</div>
        <div class="score-label">商用健康总分（满分 100）</div>
        ${scoreDeltaHtml}
      </div>
    </div>

    <div class="verdict-banner">
      <span>🚦 上线安检结论：${escHtml(displayVerdict)}</span>
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
      <button class="tab-btn" onclick="switchTab('prompts', this)">✨ 大师级神级提示词 (${masterPrompts.length})</button>
      <button class="tab-btn" onclick="switchTab('lineage', this)">🔬 全栈功能真假透视表 (${chains.length})</button>
      <button class="tab-btn" onclick="switchTab('timemachine', this)">⏪ 后悔药时光机 & 多软件接力 (${checkpoints.length})</button>
      <button class="tab-btn" onclick="switchTab('sos', this)">🆘 小白英文弹窗 & 打不开急救卡</button>
    </div>

    <div id="panel-risks" class="panel active">
      ${findingsHtml}
    </div>

    <div id="panel-prompts" class="panel">
      <div class="arsenal-hero">
        <h3 class="finding-title">✨ 卡兹克 (KKKKhazix) & 全网封神提示词库（0 平时 Token 消耗 · 已自动注入本项目家底）</h3>
        <p class="finding-desc" style="margin-bottom: 4px;">不用自己背提示词！在下面框里用一句大白话写下你想干的事（不填也能直接复制），点任意卡片的按钮，就会把<strong>你的想法 + 本项目真实数据表与防崩护栏</strong>一起打包复制好，直接粘贴进 WorkBuddy / 豆包 / Trae / Antigravity 即可：</p>
        <input id="boss-topic-input" class="topic-input" type="text" placeholder="✍️ 选填：在这里输入一句你的想法（例如：加一个客户积分兑换功能 / 把管理后台界面改高级一点）..." />
        <div class="filter-row">
          <button class="filter-pill active" onclick="filterPrompts('all', this)">全部精选 (${masterPrompts.length})</button>
          <button class="filter-pill" onclick="filterPrompts('khazix', this)">🔥 卡兹克实战方法论 (4)</button>
          <button class="filter-pill" onclick="filterPrompts('engineering', this)">🔪 Karpathy 防崩与死循环破局 (2)</button>
          <button class="filter-pill" onclick="filterPrompts('design', this)">🎨 去 AI 塑料味高定界面与文案 (2)</button>
        </div>
      </div>
      ${masterPromptsHtml}
    </div>

    <div id="panel-lineage" class="panel">
      <div id="live-impact-box" class="live-box">
        <strong>🔍 中文按钮 / 功能爆炸半径 0-Token 实时反查器</strong>
        <p style="font-size:13px; color:#065F46; margin-top:2px;">输入界面上的任意中文按钮名或模块词（例如“导出订单”、“门店设置”），50 毫秒查出它连着哪个页面、哪个接口、哪张表：</p>
        <div class="live-row">
          <input id="live-impact-input" type="text" placeholder="输入界面中文按钮文字或接口词..." />
          <button class="live-action-btn" onclick="liveQueryImpact()">🔍 立即反查影响范围</button>
        </div>
        <div id="live-impact-result" class="impact-result"></div>
      </div>
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
      <div id="live-save-box" class="live-box">
        <strong>⚡ 实时时光机控制台（0 Token 本地毫秒级双备份：Git 代码 + SQLite 数据库）</strong>
        <div class="live-row">
          <input id="live-save-label" type="text" placeholder="输入存档备注（例如：改首页配色前安全备份）..." />
          <button class="live-action-btn" onclick="liveSaveCheckpoint()">📦 立即创建代码+数据库双备份</button>
        </div>
      </div>
      <div class="finding-card" style="margin-bottom: 18px;">
        <h3 class="finding-title">🔄 国内外 8 大 AI 编程软件已无缝打通（含 Git 提交防泄密门禁）</h3>
        <p class="finding-desc">本项目已写入统一记忆胶囊（<code>.vibe/capsule.md</code>）、原生规则与 Git 密钥防泄露钩子。哪怕某个软件额度用完了，直接用下面任意软件打开同一个文件夹就能无缝接着做：</p>
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

  <div id="toast" class="toast">✅ 已复制指令！直接去 WorkBuddy / 豆包 / Antigravity 粘贴发送即可</div>

  <script>
    function showToastMsg(msg) {
      const t = document.getElementById('toast');
      if (!t) return;
      if (msg) t.textContent = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 2600);
    }
    function switchTab(id, btn) {
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('panel-' + id).classList.add('active');
      btn.classList.add('active');
    }
    function filterPrompts(cat, btn) {
      document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      if (btn && btn.classList) btn.classList.add('active');
      document.querySelectorAll('.prompt-card').forEach(card => {
        const c = card.getAttribute('data-pcat');
        card.style.display = (cat === 'all' || c === cat) ? 'block' : 'none';
      });
    }
    function fillStarterIdea(val) {
      const inp = document.getElementById('starter-idea-input');
      if (inp) inp.value = val;
    }
    function copyZeroToOneKickoff() {
      const inp = document.getElementById('starter-idea-input');
      const idea = inp && inp.value && inp.value.trim() ? inp.value.trim() : '做一个简洁实用的全栈网页小工具，支持真实保存数据';
      const prompt = [
        '我是完全零代码基础的 Vibe Coding 创作者，我想从 0 到 1 做这个作品：「' + idea + '」。',
        '请你作为我的影子 CTO 严格遵守以下规则：',
        '1. 技术选型全由你按最稳、最轻量的本地全栈方案拍板（默认 Node.js + SQLite 真实落库，严禁只存内存假数组，严禁反问我任何英文技术名词）。',
        '2. 先管住手别急着写代码：用大白话每次只问我 1 个最关键的功能选择题（最多问 3 个问题），等我说“开工”后再动手。',
        '3. 界面审美要干净高级（米白底、清晰排版，拒绝廉价紫蓝渐变与假数字），做好后自动跑通 ghost-cto audit 真假体检并让我双击《双击启动项目》就能直接打开网页体验！'
      ].join('\\n');
      copySafe(prompt);
    }
    function copySafe(text) {
      const okMsg = '✅ 已复制指令！直接去 WorkBuddy / 豆包 / Antigravity 粘贴发送即可';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToastMsg(okMsg)).catch(() => fallbackCopy(text, () => showToastMsg(okMsg)));
      } else {
        fallbackCopy(text, () => showToastMsg(okMsg));
      }
    }
    function fallbackCopy(text, cb) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); cb(); } catch (e) {}
      document.body.removeChild(ta);
    }
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const topicInput = document.getElementById('boss-topic-input');
        const customVal = topicInput && topicInput.value ? topicInput.value.trim() : '';
        const tpl = btn.getAttribute('data-template');
        let text = btn.getAttribute('data-copy');
        if (tpl && customVal) {
          text = tpl.split('__BOSS_TOPIC__').join(customVal);
        }
        if (!text) return;
        copySafe(text);
      });
    });

    // Auto-detect Live Interactive Daemon (ghost-cto studio / 打开实时驾驶舱)
    if (typeof window !== 'undefined' && window.location && /^https?:$/i.test(window.location.protocol) && typeof fetch === 'function') {
      fetch('/__ghost_api/ping')
        .then(r => r.json())
        .then(data => {
          if (!data || !data.ok) return;
          const st = document.getElementById('live-status-text');
          if (st) {
            st.className = 'mode-badge-live';
            st.textContent = '🟢 实时引擎已直连（支持 0-Token 网页一键重测、秒存代码+数据库备份、一键秒回退）';
          }
          const btnAudit = document.getElementById('btn-live-audit');
          if (btnAudit) btnAudit.style.display = 'inline-block';
          const saveBox = document.getElementById('live-save-box');
          if (saveBox) saveBox.style.display = 'block';
          const impBox = document.getElementById('live-impact-box');
          if (impBox) impBox.style.display = 'block';
          document.querySelectorAll('.live-only-btn').forEach(b => { b.style.display = 'inline-block'; });
        })
        .catch(() => {});
    }

    function liveRunAudit() {
      showToastMsg('⏳ 正在 0-Token 毫秒级重新扫描全栈代码...');
      fetch('/__ghost_api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(r => r.json())
        .then(d => {
          if (d.ok) window.location.reload();
        });
    }
    function liveSaveCheckpoint() {
      const inp = document.getElementById('live-save-label');
      const label = inp && inp.value ? inp.value.trim() : '驾驶舱网页一键安全备份';
      fetch('/__ghost_api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      })
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            showToastMsg('✅ 双备份存档成功：' + d.id);
            setTimeout(() => window.location.reload(), 600);
          }
        });
    }
    function liveRewindCheckpoint(cpId, cpLabel) {
      if (typeof confirm === 'function' && !confirm('确定要把代码和数据库一起退回到「' + cpLabel + '」吗？（系统会自动先保存一份当前状态的急救备份，绝不丢数据）')) {
        return;
      }
      fetch('/__ghost_api/rewind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpointId: cpId })
      })
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            showToastMsg('⏪ 已安全回退至 ' + d.restoredId);
            setTimeout(() => window.location.reload(), 700);
          }
        });
    }
    function liveQueryImpact() {
      const inp = document.getElementById('live-impact-input');
      const out = document.getElementById('live-impact-result');
      const q = inp && inp.value ? inp.value.trim() : '';
      if (!q || !out) return;
      fetch('/__ghost_api/impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      })
        .then(r => r.json())
        .then(d => {
          out.style.display = 'block';
          out.textContent = d.ok ? d.founderMarkdown : ('查询提示：' + d.error);
        });
    }
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
 * Generate self-healing double-click launcher scripts (`双击启动项目` + `打开实时驾驶舱`)
 * so complete beginners never get stuck when reopening their computer!
 */
export function generateSelfHealingLaunchers(workspace) {
  const runtime = detectRuntimeTopology(workspace);
  const primaryPort = runtime.ports.length > 0 ? runtime.ports[runtime.ports.length - 1] : 3000;
  const portsStr = runtime.ports.join(' ');

  const staleBuildCmds = workspace.staleBuilds
    .map(sb => sb.buildCmd || (sb.appDir === '.' ? 'npm run build' : `npm --prefix "${sb.appDir}" run build`))
    .join('\n');

  // 1. App self-healing launcher (`双击启动项目.command` & `.bat`)
  const macScript = `#!/bin/bash
cd "$(dirname "$0")"
echo "===================================================="
echo "🛡️ 影子 CTO (GhostCTO) 自愈式一键启动器"
echo "正在为您检查并唤醒项目：${runtime.projectName}"
echo "===================================================="

for PORT in ${portsStr || primaryPort}; do
  PID=$(lsof -ti tcp:$PORT 2>/dev/null)
  if [ -n "$PID" ]; then
    echo "🧹 发现端口 $PORT 被旧进程占用，正在自动清理..."
    kill -9 $PID 2>/dev/null || true
  fi
done

if [ -f "package.json" ] && [ ! -d "node_modules" ]; then
  echo "📦 首次运行，正在自动安装依赖包..."
  npm install
fi

${staleBuildCmds ? `echo "🔨 正在同步最新界面打包文件..."\n${staleBuildCmds} || true` : '# 无需静态预打包'}

(sleep 2 && open "http://127.0.0.1:${primaryPort}") &

echo "🚀 服务启动中！浏览器即将自动打开 http://127.0.0.1:${primaryPort}"
echo "（保持本窗口开启即可使用，关闭本窗口即停止服务）"
${runtime.startCmd}
`;

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

  // 2. Live Interactive Cockpit launcher (`打开实时驾驶舱.command` & `.bat`)
  const liveMacScript = `#!/bin/bash
cd "$(dirname "$0")"
echo "🛡️ 正在启动【${runtime.projectName}】0-Token 实时交互版老板全景驾驶舱..."
node ".vibe/engine/bin/ghost-cto.mjs" studio --dir "$(pwd)"
`;

  const liveWinScript = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [GhostCTO] 正在启动 0-Token 实时交互版老板全景驾驶舱...
node ".vibe\\engine\\bin\\ghost-cto.mjs" studio --dir "%cd%"
pause
`;

  const macPath = path.join(workspace.rootDir, '双击启动项目.command');
  const winPath = path.join(workspace.rootDir, '双击启动项目.bat');
  const liveMacPath = path.join(workspace.rootDir, '打开实时驾驶舱.command');
  const liveWinPath = path.join(workspace.rootDir, '打开实时驾驶舱.bat');

  fs.writeFileSync(macPath, macScript, { encoding: 'utf8', mode: 0o755 });
  fs.writeFileSync(liveMacPath, liveMacScript, { encoding: 'utf8', mode: 0o755 });
  try {
    fs.chmodSync(macPath, 0o755);
    fs.chmodSync(liveMacPath, 0o755);
  } catch {
    // ignore chmod on unsupported fs
  }
  fs.writeFileSync(winPath, winScript, 'utf8');
  fs.writeFileSync(liveWinPath, liveWinScript, 'utf8');

  return { macPath, winPath, liveMacPath, liveWinPath, primaryPort, startCmd: runtime.startCmd };
}
