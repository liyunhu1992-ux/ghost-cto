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
      --muted: #71717A;
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
      padding: 28px 18px 72px;
      -webkit-font-smoothing: antialiased;
    }
    .container { max-width: 740px; margin: 0 auto; }
    .top-bar {
      display: flex; justify-content: space-between; align-items: center;
      gap: 12px; margin-bottom: 16px; padding: 0 2px;
    }
    .brand-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .proj-name { font-size: 15px; font-weight: 600; color: var(--text); }
    .mode-badge-offline, .mode-badge-live {
      font-size: 12.5px; color: var(--muted); display: inline-flex; align-items: center; gap: 6px;
    }
    .mode-badge-live { color: var(--green); font-weight: 500; }
    .primary-card, .undo-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
      padding: 26px 28px; box-shadow: 0 1px 4px rgba(24, 24, 27, 0.03);
    }
    .undo-card { margin-top: 14px; padding: 22px 26px; }
    .status-pill {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px;
      border-radius: 999px; font-size: 12.5px; font-weight: 600; margin-bottom: 14px;
    }
    .pill-ok { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
    .pill-warn { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
    .pill-start { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
    .primary-title {
      font-size: 22px; font-weight: 700; letter-spacing: -0.02em;
      line-height: 1.35; color: var(--text); margin-bottom: 8px;
    }
    .primary-desc { font-size: 15px; color: var(--body); line-height: 1.7; }
    .port-strip {
      border-top: 1px solid var(--hairline); margin-top: 20px; padding-top: 16px;
      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;
    }
    .port-list { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .port-label { font-size: 13px; color: var(--muted); }
    .port-pill {
      display: inline-flex; align-items: center; padding: 5px 12px; border-radius: 8px;
      background: var(--subtle); color: var(--text); font-size: 13px; font-weight: 600;
      text-decoration: none; border: 1px solid var(--border); font-variant-numeric: tabular-nums;
    }
    .port-pill:hover { background: #EFECE6; }
    .quiet-meta { font-size: 12.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
    .urgent-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
    .urgent-list { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
    .urgent-item {
      background: var(--subtle); border: 1px solid var(--border); border-radius: 12px;
      padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;
    }
    .urgent-item-text { flex: 1; min-width: 220px; }
    .urgent-item-title { font-size: 14.5px; font-weight: 600; color: var(--text); }
    .urgent-item-desc { font-size: 13px; color: var(--muted); margin-top: 3px; }
    .undo-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
    .undo-title { font-size: 16px; font-weight: 600; color: var(--text); }
    .undo-sub { font-size: 13.5px; color: var(--muted); margin-top: 2px; }
    .undo-row {
      padding: 12px 0; border-top: 1px solid var(--hairline);
      display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
    }
    .undo-name { font-size: 14px; font-weight: 500; color: var(--text); }
    .undo-time { font-size: 12.5px; color: var(--muted); margin-left: 8px; font-variant-numeric: tabular-nums; }
    .copy-btn, .live-action-btn, .live-only-btn {
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--primary); color: #FFF; border: 1px solid var(--primary); border-radius: 8px;
      padding: 7px 13px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
    }
    .copy-btn:hover, .live-action-btn:hover, .live-only-btn:hover { opacity: 0.88; }
    .ghost-btn, .subtle-btn, .rewind-outline-btn {
      background: var(--surface); color: var(--body); border: 1px solid var(--border);
    }
    .rewind-outline-btn:hover { border-color: #FCA5A5; color: var(--red); background: #FEF2F2; opacity: 1; }
    .subtle-btn:hover, .ghost-btn:hover { background: var(--subtle); opacity: 1; }
    .more-drawer { margin-top: 16px; }
    .more-summary {
      list-style: none; cursor: pointer; font-size: 13.5px; color: var(--muted);
      padding: 10px 4px; display: flex; align-items: center; gap: 6px; user-select: none;
    }
    .more-summary::-webkit-details-marker { display: none; }
    .more-summary::before { content: "▸"; font-size: 12px; transition: transform 0.15s ease; }
    .more-drawer[open] .more-summary::before { transform: rotate(90deg); }
    .more-summary:hover { color: var(--text); }
    .more-body {
      margin-top: 8px; background: var(--surface); border: 1px solid var(--border);
      border-radius: 16px; padding: 22px 24px;
    }
    .quick-faq {
      background: var(--subtle); border: 1px solid var(--border); border-radius: 12px;
      padding: 14px 16px; margin-bottom: 18px; font-size: 13.5px; color: var(--body);
    }
    .quick-faq div + div { margin-top: 6px; }
    .tech-strip {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
      gap: 10px; padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px solid var(--hairline);
    }
    .score-pill {
      display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px;
      background: ${scoreBg}; color: ${scoreColor}; font-size: 12.5px; font-weight: 600; font-variant-numeric: tabular-nums;
    }
    .tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
    .tab-btn {
      padding: 7px 13px; border-radius: 8px; border: 1px solid var(--border);
      background: var(--subtle); color: var(--muted); font-size: 13px; font-weight: 500; cursor: pointer;
    }
    .tab-btn.active { background: var(--primary); color: #FFF; border-color: var(--primary); }
    .panel { display: none; }
    .panel.active { display: block; }
    .finding-card {
      background: var(--subtle); border: 1px solid var(--border); border-radius: 12px;
      padding: 16px 18px; margin-bottom: 10px;
    }
    .finding-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .sev-tag { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
    .sev-tag.sev-p0 { background: #FEF2F2; color: var(--red); }
    .sev-tag.sev-p1 { background: #FFFBEB; color: var(--amber); }
    .sev-tag.sev-p2 { background: #F4F4F5; color: var(--muted); }
    .sev-tag.sev-master { background: #F4F4F5; color: var(--text); }
    .file-loc { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: var(--muted); margin-left: 6px; }
    .finding-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .finding-desc { font-size: 13.5px; color: var(--body); margin-bottom: 8px; }
    .prompt-preview { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 8px 11px; font-size: 12px; color: var(--muted); }
    .arsenal-hero { margin-bottom: 14px; }
    .topic-input {
      width: 100%; padding: 10px 13px; border-radius: 9px; border: 1px solid var(--border);
      font-size: 14px; margin-top: 8px; background: var(--subtle); color: var(--text);
    }
    .topic-input:focus { outline: 2px solid var(--accent); border-color: transparent; background: #FFF; }
    .filter-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .filter-pill {
      padding: 5px 11px; border-radius: 999px; border: 1px solid var(--border);
      background: var(--subtle); color: var(--muted); font-size: 12.5px; font-weight: 500; cursor: pointer;
    }
    .filter-pill.active { background: var(--primary); color: #FFF; border-color: var(--primary); }
    .prompt-details { margin-top: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 7px 11px; }
    .prompt-details summary { font-size: 12.5px; font-weight: 500; color: var(--muted); cursor: pointer; }
    .prompt-raw {
      margin-top: 8px; white-space: pre-wrap; word-break: break-word; font-size: 12px;
      line-height: 1.55; color: var(--body); font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", monospace;
    }
    .live-box { background: var(--subtle); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; margin-bottom: 14px; display: none; }
    .live-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 8px; }
    .live-row input { flex: 1; min-width: 200px; padding: 8px 11px; border-radius: 8px; border: 1px solid var(--border); font-size: 13px; background: #FFF; }
    .impact-result { margin-top: 10px; background: #FFF; border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 12.5px; white-space: pre-wrap; display: none; }
    .table-wrap { border: 1px solid var(--border); border-radius: 10px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--hairline); }
    th { background: var(--subtle); font-weight: 600; color: var(--muted); font-size: 12px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; background: #F4F4F5; padding: 2px 5px; border-radius: 4px; }
    .muted-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--muted); }
    .dict-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
    .dict-card { background: var(--subtle); border: 1px solid var(--border); border-radius: 10px; padding: 14px; }
    .dict-card h4 { font-size: 14px; margin-bottom: 4px; }
    .empty-ok { background: #ECFDF5; border: 1px solid #A7F3D0; color: #065F46; padding: 14px 16px; border-radius: 10px; font-size: 13.5px; }
    .empty-note { color: var(--muted); font-size: 13.5px; padding: 12px 0; }
    .toast {
      position: fixed; bottom: 24px; right: 24px; background: #18181B; color: #FFF;
      padding: 11px 16px; border-radius: 10px; font-size: 13.5px; font-weight: 500;
      box-shadow: 0 10px 25px rgba(0,0,0,0.16); display: none; z-index: 999;
    }`;
}

export function buildSosPanelHtml() {
  return `
      <div class="dict-grid">
        <div class="dict-card">
          <h4>看到 Allow / Accept / Run in Sandbox</h4>
          <p class="finding-desc">意思是「允许 AI 在当前项目文件夹里干活或跑测试」。只要没有出现删系统盘字样，直接点同意即可。</p>
        </div>
        <div class="dict-card">
          <h4>看到 Bypass Sandbox / Outside Workspace</h4>
          <p class="finding-desc">意思是「AI 想访问这个项目文件夹以外的地方或联网」。不确定就先点取消，在聊天框问它一句：「请用中文说一下为什么要申请这个权限？」</p>
        </div>
        <div class="dict-card">
          <h4>关机重启后网页打不开</h4>
          <p class="finding-desc">直接双击项目文件夹里的 <strong>「双击启动项目.command」</strong>（苹果电脑）或 <strong>「双击启动项目.bat」</strong>（Windows），会自动清理旧端口并重新打开网页。</p>
        </div>
        <div class="dict-card">
          <h4>AI 问你看不懂的技术名词怎么办？</h4>
          <p class="finding-desc">直接回它一句：「技术方案你按稳妥的定，不用问我技术词，只问我业务上怎么用就行。」</p>
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
    function getSelectedAudience() {
      const checked = document.querySelector('input[name="starter-audience"]:checked');
      return checked ? checked.value : 'self';
    }
    function copyZeroToOneKickoff() {
      const inp = document.getElementById('starter-idea-input');
      const idea = inp && inp.value && inp.value.trim() ? inp.value.trim() : '做一个真实可用的网站或软件工具';
      const aud = getSelectedAudience();
      const prompt = [
        '我想做：「' + idea + '」（使用对象：' + aud + '）。',
        '请先调用 ghost_incubate_idea 生成产品蓝图与分阶段路线图，按我的真实产品形态定制页面和功能，技术细节由你拍板，写完调用 ghost_verify_code 确保没有报错再交付。'
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
            '已拆好首版功能清单（' + bp.appName + '）：',
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
      showToastMsg('正在生成可运行项目起点...');
      fetch('/__ghost_api/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, audience: getSelectedAudience() })
      })
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            showToastMsg(d.message || '已生成可运行起点');
            setTimeout(() => window.location.reload(), 900);
          }
        });
    }
    function liveVerifyCode() {
      showToastMsg('正在检查代码语法与功能连接...');
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
            showToastMsg('检查通过：共检查 ' + v.filesChecked + ' 个文件，没有报错');
          } else {
            copySafe(v.aiFixPrompt);
            showToastMsg('发现 ' + (v.syntaxErrors.length + v.p0Findings.length) + ' 个问题，已自动复制修复话术');
          }
        });
    }
    function copySafe(text) {
      const okMsg = '已复制，直接去 AI 聊天框粘贴发送即可';
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
            st.textContent = '● 自动保护运行中';
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
      showToastMsg('正在重新检查项目状态...');
      fetch('/__ghost_api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(r => r.json())
        .then(d => { if (d.ok) window.location.reload(); });
    }
    function liveQuickSave() {
      showToastMsg('正在保存当前版本备份...');
      fetch('/__ghost_api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: '手动安全备份' })
      })
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            showToastMsg('已存好新备份，随时可退回');
            setTimeout(() => window.location.reload(), 600);
          }
        });
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
            showToastMsg('已存好新备份');
            setTimeout(() => window.location.reload(), 600);
          }
        });
    }
    function liveRewindCheckpoint(cpId, cpLabel) {
      if (typeof confirm === 'function' && !confirm('确定要把代码和数据一起退回到「' + cpLabel + '」吗？（退回前会自动存一份当前状态的备份）')) {
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
            showToastMsg('已退回至「' + cpLabel + '」');
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
