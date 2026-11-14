/**
 * Visual stylesheet, SOS rescue guide cards, and client-side interactive script
 * for `.vibe/项目体检报告.html` (`boss-dashboard.html`).
 */
export function buildDashboardCss(scoreBg, scoreColor) {
  return `
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
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
      padding: 10px 16px; margin-bottom: 14px; display: flex; justify-content: space-between;
      align-items: center; flex-wrap: wrap; gap: 10px; font-size: 13px;
    }
    .mode-badge-offline { color: var(--muted); font-weight: 600; }
    .mode-badge-live { color: var(--green); font-weight: 700; }
    .hero {
      background: var(--surface); border: 1px solid var(--border); border-radius: 18px;
      padding: 26px 28px; display: flex; flex-wrap: wrap; justify-content: space-between;
      align-items: center; gap: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); margin-bottom: 20px;
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
      background: var(--surface); border: 1px solid var(--border); border-left: 5px solid ${scoreColor};
      border-radius: 12px; padding: 14px 18px; font-size: 14.5px; font-weight: 600;
      margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
    }
    .roadmap-bar {
      background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
      padding: 14px 18px; margin-bottom: 20px;
    }
    .roadmap-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; margin-top: 10px; }
    .rm-step { border: 1px solid var(--border); border-radius: 10px; padding: 9px 11px; font-size: 12.5px; background: #FAFAF9; }
    .rm-step.active { border-color: var(--green); background: #ECFDF5; color: #065F46; font-weight: 600; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 22px; }
    .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; }
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
      background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
      padding: 18px 20px; margin-bottom: 14px;
    }
    .finding-card.sev-p0 { border-left: 5px solid var(--red); }
    .finding-card.sev-p1 { border-left: 5px solid var(--amber); }
    .finding-card.sev-p2 { border-left: 5px solid var(--accent); }
    .finding-card.prompt-card { border-left: 5px solid #18181B; }
    .finding-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
    .sev-tag { font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 6px; }
    .sev-tag.sev-p0 { background: #FEF2F2; color: var(--red); }
    .sev-tag.sev-p1 { background: #FFFBEB; color: var(--amber); }
    .sev-tag.sev-p2 { background: #EFF6FF; color: var(--accent); }
    .sev-tag.sev-master { background: #F4F4F5; color: #18181B; border: 1px solid #E4E4E7; }
    .file-loc { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--muted); margin-left: 8px; }
    .finding-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
    .finding-desc { font-size: 14px; color: #3F3F46; margin-bottom: 10px; }
    .prompt-preview { background: #F4F4F5; border-radius: 8px; padding: 9px 12px; font-size: 12.5px; color: #52525B; }
    .arsenal-hero { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; margin-bottom: 16px; }
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
    .live-box { background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 14px; padding: 16px 18px; margin-bottom: 16px; display: none; }
    .live-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 8px; }
    .live-row input { flex: 1; min-width: 240px; padding: 9px 12px; border-radius: 8px; border: 1px solid #A7F3D0; font-size: 13.5px; }
    .impact-result { margin-top: 12px; background: #FFF; border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; font-size: 13px; white-space: pre-wrap; display: none; }
    .table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow-x: auto; }
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
    }`;
}

export function buildSosPanelHtml() {
  return `
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
      const idea = inp && inp.value && inp.value.trim() ? inp.value.trim() : '做一个真实可用的网站或全栈软件系统';
      const aud = getSelectedAudience();
      const prompt = [
        '我是做产品的创始人，我想做：「' + idea + '」（使用场景：' + aud + '）。',
        '请你先调用 ghost_incubate_idea 生成 .vibe/blueprint.md 与 0→5 演进路线图（.vibe/roadmap.json），并按以下纪律推进：',
        '1. 不局限于通用 CRUD 列表模板！请根据我的真实产品形态（品牌官网、多模块 AI SaaS 平台、在线互动工具、微信小程序等）量身定制页面结构与核心功能。',
        '2. 技术细节由你拍板并确保真实持久化落库，需要确认产品定位时每次只问 1 个大白话选择题（最多 3 问）。',
        '3. 每次写完代码必须调用 ghost_verify_code 确保语法、依赖、SQL 与接口契约 0 报错后再交付！'
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
            '🎯 已为你生成 0→5 产品施工蓝图（.vibe/blueprint.md & roadmap.json）：',
            '• 产品名称：' + bp.appName + ' （形态：' + bp.archetypeLabel + '）',
            '• 首版核心模块：',
            '  1) ' + bp.coreFeatures[0],
            '  2) ' + bp.coreFeatures[1],
            '  3) ' + bp.coreFeatures[2],
            '  4) ' + bp.coreFeatures[3],
            '• 核心真实数据表：' + bp.tableName + '（后续阶段可按 0→5 路线图无限扩展专属模块与多表）'
          ].join('\\n');
        });
    }
    function liveBootstrapGoldenApp() {
      const inp = document.getElementById('starter-idea-input');
      const idea = inp && inp.value ? inp.value.trim() : '';
      showToastMsg('⏳ 正在根据你的产品形态铺设可运行全栈工程起点...');
      fetch('/__ghost_api/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, audience: getSelectedAudience() })
      })
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            showToastMsg(d.message || '🎉 工程起点已生成！');
            setTimeout(() => window.location.reload(), 900);
          }
        });
    }
    function liveVerifyCode() {
      showToastMsg('⏳ 正在本地 0-Token 检查全部 JS / HTML / JSON 语法与真假契约...');
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
            showToastMsg('🎉 门禁全绿通过！共检查 ' + v.filesChecked + ' 个代码文件，0 语法错误、0 致命假功能！');
          } else {
            copySafe(v.aiFixPrompt);
            showToastMsg('⚠️ 抓到 ' + (v.syntaxErrors.length + v.p0Findings.length) + ' 个错误！已自动复制精准修复指令！');
          }
        });
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
        .catch(err => {
          return Boolean(err);
        });
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
    }`;
}
