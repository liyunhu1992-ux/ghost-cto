/**
 * Visual stylesheet, SOS rescue guide cards, and client-side interactive script
 * for `.vibe/项目体检报告.html` (`boss-dashboard.html`).
 */
export function buildDashboardCss(scoreBg, scoreColor) {
  return `
    :root {
      --bg: #F7F6F3;
      --surface: #FFFFFF;
      --subtle: #FAFAF8;
      --text: #18181B;
      --body: #3F3F46;
      --muted: #64646E;
      --border: #E6E4DF;
      --hairline: #F0EFEA;
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
      padding: 22px 20px 64px;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 1060px; margin: 0 auto; }
    .mode-bar {
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
      padding: 10px 16px; margin-bottom: 14px; display: flex; justify-content: space-between;
      align-items: center; flex-wrap: wrap; gap: 10px; font-size: 13px;
    }
    .mode-badge-offline { color: var(--muted); font-weight: 600; }
    .mode-badge-live { color: var(--green); font-weight: 600; }
    .hero {
      background: var(--surface); border: 1px solid var(--border); border-radius: 18px;
      padding: 24px 28px; display: flex; flex-wrap: wrap; justify-content: space-between;
      align-items: center; gap: 20px; box-shadow: 0 3px 16px rgba(24, 24, 27, 0.03); margin-bottom: 16px;
    }
    .hero-left { flex: 1; min-width: 280px; }
    .hero-left h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 6px; }
    .hero-sub { font-size: 14px; color: var(--muted); margin-bottom: 14px; }
    .port-list { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .port-label { font-size: 13px; color: var(--muted); font-weight: 500; }
    .port-pill {
      display: inline-flex; align-items: center; padding: 6px 13px; border-radius: 999px;
      background: #EFF6FF; color: #1D4ED8; font-size: 13px; font-weight: 600;
      text-decoration: none; border: 1px solid #BFDBFE; font-variant-numeric: tabular-nums;
    }
    .port-pill:hover { background: #DBEAFE; }
    .score-box {
      background: ${scoreBg}; border: 1px solid ${scoreColor}33; border-radius: 14px;
      padding: 16px 24px; text-align: center; min-width: 220px;
    }
    .score-num { font-size: 38px; font-weight: 800; color: ${scoreColor}; font-variant-numeric: tabular-nums; line-height: 1.1; }
    .score-label { font-size: 12.5px; color: var(--muted); margin-top: 4px; }
    .score-delta {
      margin-top: 6px; display: inline-block; background: #ECFDF5; color: #065F46;
      border: 1px solid #A7F3D0; border-radius: 999px; padding: 2px 10px; font-size: 11.5px; font-weight: 700;
    }
    .verdict-banner {
      background: var(--surface); border: 1px solid var(--border); border-left: 4px solid ${scoreColor};
      border-radius: 12px; padding: 14px 18px; font-size: 14.5px; font-weight: 600;
      margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
    }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 20px; }
    .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; }
    .kpi-val { font-size: 26px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }
    .kpi-name { font-size: 13px; color: var(--muted); margin-top: 4px; }
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .tab-btn {
      padding: 9px 16px; border-radius: 10px; border: 1px solid var(--border);
      background: var(--surface); color: var(--muted); font-size: 13.5px; font-weight: 600;
      cursor: pointer; transition: all 0.15s ease;
    }
    .tab-btn:hover { color: var(--text); background: var(--subtle); }
    .tab-btn.active { background: var(--primary); color: #FFF; border-color: var(--primary); }
    .panel { display: none; }
    .panel.active { display: block; }
    .calm-ok-card {
      background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 14px;
      padding: 20px 22px; margin-bottom: 14px; color: #065F46;
    }
    .calm-ok-title { font-size: 17px; font-weight: 700; margin-bottom: 6px; color: #064E3B; }
    .calm-ok-desc { font-size: 14px; line-height: 1.65; color: #065F46; }
    .p2-drawer {
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px;
    }
    .p2-drawer summary {
      cursor: pointer; font-size: 13.5px; font-weight: 600; color: var(--muted); list-style: none;
      display: flex; align-items: center; gap: 6px; user-select: none;
    }
    .p2-drawer summary::-webkit-details-marker { display: none; }
    .p2-drawer summary::before { content: "▸"; font-size: 12px; transition: transform 0.15s ease; }
    .p2-drawer[open] summary::before { transform: rotate(90deg); }
    .p2-drawer-body { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--hairline); }
    .finding-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
      padding: 18px 20px; margin-bottom: 12px;
    }
    .finding-card.sev-p0 { border-left: 4px solid var(--red); }
    .finding-card.sev-p1 { border-left: 4px solid var(--amber); }
    .finding-card.sev-p2 { background: var(--subtle); }
    .finding-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
    .sev-tag { font-size: 12px; font-weight: 600; padding: 3px 9px; border-radius: 6px; }
    .sev-tag.sev-p0 { background: #FEF2F2; color: var(--red); }
    .sev-tag.sev-p1 { background: #FFFBEB; color: var(--amber); }
    .sev-tag.sev-p2 { background: #F4F4F5; color: var(--muted); }
    .sev-tag.sev-master { background: #F4F4F5; color: var(--text); border: 1px solid #E4E4E7; }
    .file-loc { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--muted); margin-left: 8px; }
    .finding-title { font-size: 15.5px; font-weight: 700; margin-bottom: 5px; }
    .finding-desc { font-size: 14px; color: var(--body); margin-bottom: 8px; }
    .prompt-preview { background: var(--subtle); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 12.5px; color: var(--muted); }
    .arsenal-hero { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; margin-bottom: 14px; }
    .topic-input {
      width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid #D4D4D8;
      font-size: 14px; margin-top: 8px; background: var(--subtle); color: var(--text);
    }
    .topic-input:focus { outline: 2px solid var(--accent); border-color: transparent; background: #FFF; }
    .filter-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .filter-pill {
      padding: 5px 12px; border-radius: 999px; border: 1px solid var(--border);
      background: #F4F4F5; color: var(--muted); font-size: 12.5px; font-weight: 600; cursor: pointer;
    }
    .filter-pill.active { background: var(--primary); color: #FFF; border-color: var(--primary); }
    .prompt-details { margin-top: 8px; background: var(--subtle); border: 1px solid var(--border); border-radius: 9px; padding: 8px 12px; }
    .prompt-details summary { font-size: 12.5px; font-weight: 600; color: var(--accent); cursor: pointer; }
    .prompt-raw {
      margin-top: 8px; white-space: pre-wrap; word-break: break-word; font-size: 12.5px;
      line-height: 1.55; color: #27272A; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", monospace;
    }
    .copy-btn, .live-action-btn, .live-only-btn, .jump-btn {
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--primary); color: #FFF; border: 1px solid var(--primary); border-radius: 8px;
      padding: 7px 13px; font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap;
    }
    .live-action-btn { background: var(--green); border-color: var(--green); }
    .copy-btn:hover, .live-action-btn:hover, .live-only-btn:hover, .jump-btn:hover { opacity: 0.9; }
    .ghost-btn, .subtle-btn, .rewind-outline-btn {
      background: var(--surface); color: var(--body); border: 1px solid var(--border);
    }
    .rewind-outline-btn:hover { border-color: #FCA5A5; color: var(--red); background: #FEF2F2; opacity: 1; }
    .subtle-btn:hover, .ghost-btn:hover { background: var(--subtle); opacity: 1; }
    .undo-card-list { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 6px 20px; }
    .undo-row {
      padding: 13px 0; border-bottom: 1px solid var(--hairline);
      display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: nowrap;
    }
    .undo-row:last-child { border-bottom: none; }
    .undo-info { flex: 1; min-width: 0; }
    .undo-name {
      display: block; font-size: 14px; font-weight: 600; color: var(--text);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .undo-time { display: block; font-size: 12px; color: var(--muted); margin-top: 2px; font-variant-numeric: tabular-nums; }
    .undo-actions { flex-shrink: 0; }
    .live-box { background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 14px; padding: 15px 18px; margin-bottom: 14px; display: none; }
    .live-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 8px; }
    .live-row input { flex: 1; min-width: 220px; padding: 8px 12px; border-radius: 8px; border: 1px solid #A7F3D0; font-size: 13.5px; background: #FFF; }
    .impact-result { margin-top: 10px; background: #FFF; border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; font-size: 13px; white-space: pre-wrap; display: none; }
    .table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    th, td { padding: 11px 14px; text-align: left; border-bottom: 1px solid var(--hairline); }
    th { background: var(--subtle); font-weight: 600; color: var(--muted); font-size: 12.5px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: #F4F4F5; padding: 2px 6px; border-radius: 5px; }
    .muted-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: var(--muted); }
    .ide-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .ide-pill { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .dict-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 14px; }
    .dict-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
    .dict-card h4 { font-size: 15px; margin-bottom: 6px; }
    .empty-note { background: var(--surface); border: 1px solid var(--border); padding: 16px; border-radius: 12px; color: var(--muted); font-size: 13.5px; }
    .toast {
      position: fixed; bottom: 24px; right: 24px; background: #18181B; color: #FFF;
      padding: 11px 18px; border-radius: 10px; font-size: 13.5px; font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.18); display: none; z-index: 999;
    }`;
}

export function buildSosPanelHtml() {
  return `
      <div class="dict-grid">
        <div class="dict-card">
          <h4>🟢 看到 Allow / Accept / Run in Sandbox</h4>
          <p class="finding-desc">意思是「允许 AI 在当前项目文件夹里干活或跑测试」。只要没有出现删系统盘字样，放心点同意即可。</p>
        </div>
        <div class="dict-card">
          <h4>🟡 看到 Bypass Sandbox / Outside Workspace</h4>
          <p class="finding-desc">意思是「AI 想访问项目文件夹以外的地方或联网」。不确定就点取消，然后在聊天框问它：「请用中文说一下你刚才为什么要申请外部权限？」</p>
        </div>
        <div class="dict-card">
          <h4>🟠 电脑重启后网页打不开</h4>
          <p class="finding-desc">直接双击项目文件夹里的 <strong>「双击启动项目.command」</strong>（苹果电脑）或 <strong>「双击启动项目.bat」</strong>（Windows），会自动清理旧端口并重新打开网页。</p>
        </div>
        <div class="dict-card">
          <h4>🔵 AI 反问你看不懂的技术词怎么办？</h4>
          <p class="finding-desc">直接回它一句：「技术方案你按最稳妥的拍板，不用问我技术词，只问我业务上怎么用就行。」</p>
        </div>
      </div>`;
}

export function buildDashboardClientJs() {
  return `
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
      const targetPanel = document.getElementById('panel-' + id);
      if (targetPanel) targetPanel.classList.add('active');
      if (btn && btn.classList) {
        btn.classList.add('active');
      } else {
        const matchBtn = document.getElementById('tab-btn-' + id);
        if (matchBtn) matchBtn.classList.add('active');
      }
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
    function getSelectedAudience() {
      const checked = document.querySelector('input[name="starter-audience"]:checked');
      return checked ? checked.value : 'self';
    }
    function copyZeroToOneKickoff() {
      const inp = document.getElementById('starter-idea-input');
      const idea = inp && inp.value && inp.value.trim() ? inp.value.trim() : '做一个真实可用的网站或全栈软件系统';
      const aud = getSelectedAudience();
      const prompt = [
        '我想做：「' + idea + '」（使用场景：' + aud + '）。',
        '请先调用 ghost_incubate_idea 生成产品蓝图与分阶段路线图，按我的真实产品形态量身定制页面与核心功能，技术细节由你拍板，写完调用 ghost_verify_code 确保 0 报错后再交付。'
      ].join('\\n');
      copySafe(prompt);
    }
    function livePreviewIncubate() {
      const inp = document.getElementById('starter-idea-input');
      const out = document.getElementById('incubate-preview-box');
      const idea = inp && inp.value ? inp.value.trim() : '';
      if (!out) return;
      fetch('/__ghost_api/incubate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, audience: getSelectedAudience() })
      })
        .then(r => r.json())
        .then(d => {
          if (!d.ok) return;
          const bp = d.blueprint;
          out.style.display = 'block';
          out.textContent = [
            '🎯 已拆好首版功能清单（' + bp.appName + '）：',
            '1) ' + bp.coreFeatures[0],
            '2) ' + bp.coreFeatures[1],
            '3) ' + bp.coreFeatures[2],
            '4) ' + bp.coreFeatures[3]
          ].join('\\n');
        });
    }
    function liveBootstrapGoldenApp() {
      const inp = document.getElementById('starter-idea-input');
      const idea = inp && inp.value ? inp.value.trim() : '';
      showToastMsg('⏳ 正在生成可运行项目起点...');
      fetch('/__ghost_api/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, audience: getSelectedAudience() })
      })
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            showToastMsg(d.message || '🎉 项目起点已生成！');
            setTimeout(() => window.location.reload(), 900);
          }
        });
    }
    function liveVerifyCode() {
      showToastMsg('⏳ 正在检查代码语法与功能连接...');
      fetch('/__ghost_api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      })
        .then(r => r.json())
        .then(d => {
          if (!d.ok || !d.verification) return;
          const v = d.verification;
          if (v.ok) {
            showToastMsg('✅ 检查通过！共检查 ' + v.filesChecked + ' 个文件，0 报错！');
          } else {
            copySafe(v.aiFixPrompt);
            showToastMsg('⚠️ 发现 ' + (v.syntaxErrors.length + v.p0Findings.length) + ' 个问题，已自动复制修复话术！');
          }
        });
    }
    function copySafe(text) {
      const okMsg = '✅ 已复制！直接去 AI 聊天框粘贴发送即可';
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
      try {
        document.execCommand('copy');
        cb();
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) console.warn(err);
      }
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

    if (typeof window !== 'undefined' && window.location && /^https?:$/i.test(window.location.protocol) && typeof fetch === 'function') {
      fetch('/__ghost_api/ping')
        .then(r => r.json())
        .then(data => {
          if (!data || !data.ok) return;
          const st = document.getElementById('live-status-text');
          if (st) {
            st.className = 'mode-badge-live';
            st.textContent = '🟢 自动保护运行中（平时不用操作本页，直接去 AI 聊天框说大白话提需求即可）';
          }
          const btnAudit = document.getElementById('btn-live-audit');
          if (btnAudit) btnAudit.style.display = 'inline-flex';
          const saveBox = document.getElementById('live-save-box');
          if (saveBox) saveBox.style.display = 'block';
          const impBox = document.getElementById('live-impact-box');
          if (impBox) impBox.style.display = 'block';
          document.querySelectorAll('.live-only-btn').forEach(b => { b.style.display = 'inline-flex'; });
          document.querySelectorAll('.offline-only-btn').forEach(b => { b.style.display = 'none'; });
        })
        .catch(err => Boolean(err));
    }

    function liveRunAudit() {
      showToastMsg('⏳ 正在重新检查项目状态...');
      fetch('/__ghost_api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(r => r.json())
        .then(d => { if (d.ok) window.location.reload(); });
    }
    function liveSaveCheckpoint() {
      const inp = document.getElementById('live-save-label');
      const label = inp && inp.value ? inp.value.trim() : '手动安全备份';
      fetch('/__ghost_api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      })
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            showToastMsg('✅ 已存好代码+数据库新备份');
            setTimeout(() => window.location.reload(), 600);
          }
        });
    }
    function liveRewindCheckpoint(cpId, cpLabel) {
      if (typeof confirm === 'function' && !confirm('确定要把代码和数据库一起退回到「' + cpLabel + '」吗？（退回前会自动保存一份当前状态的急救备份）')) {
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
            showToastMsg('⏪ 已安全退回至「' + cpLabel + '」');
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
          out.textContent = d.ok ? d.founderMarkdown : ('提示：' + d.error);
        });
    }`;
}
