export function buildStylesCss() {
  return `:root {
  --bg: #F8F7F4;
  --card: #FFFFFF;
  --text: #18181B;
  --muted: #64646E;
  --border: #E5E4DF;
  --primary: #18181B;
  --blue: #2563EB;
  --green: #059669;
  --amber: #D97706;
  --red: #DC2626;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  padding: 26px 16px 84px;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 1080px; margin: 0 auto; }
.saas-shell { display: grid; grid-template-columns: 230px 1fr; gap: 18px; align-items: start; }
.saas-side {
  background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 18px 16px;
}
.side-stage {
  font-size: 12.5px; color: var(--muted); padding: 7px 9px; border-radius: 8px; margin-top: 6px; background: #FAFAF9;
}
.side-stage.current { background: #ECFDF5; color: #065F46; font-weight: 700; border: 1px solid #A7F3D0; }
.site-hero {
  background: linear-gradient(180deg, #FFFFFF 0%, #F4F3EE 100%);
  border: 1px solid var(--border); border-radius: 20px; padding: 38px 32px; margin-bottom: 18px;
}
.site-hero h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.25; }
.site-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 18px;
}
.card {
  background: var(--card); border: 1px solid var(--border); border-radius: 16px;
  padding: 20px 22px; margin-bottom: 16px;
}
.header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.header h1 { font-size: 22px; font-weight: 750; letter-spacing: -0.01em; }
.header p { font-size: 13.5px; color: var(--muted); margin-top: 3px; }
.top-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.badge-ok {
  background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0;
  padding: 5px 11px; border-radius: 999px; font-size: 12px; font-weight: 600;
}
.badge-role {
  background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;
  padding: 5px 11px; border-radius: 999px; font-size: 12px; font-weight: 600;
}
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat-card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 16px 18px; }
.stat-num { font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; }
.stat-label { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
.form-grid { display: grid; grid-template-columns: 2fr 2fr 1.2fr auto; gap: 10px; margin-top: 12px; }
@media (max-width: 820px) {
  .form-grid { grid-template-columns: 1fr; }
  .saas-shell { grid-template-columns: 1fr; }
}
input, select {
  width: 100%; padding: 10px 13px; border: 1px solid #D4D4D8; border-radius: 9px;
  font-size: 14px; background: #FAFAF9; color: var(--text);
}
input:focus, select:focus { outline: 2px solid var(--blue); border-color: transparent; background: #FFF; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
.btn {
  background: var(--primary); color: #FFF; border: none; border-radius: 9px;
  padding: 10px 16px; font-size: 13.5px; font-weight: 600; cursor: pointer; white-space: nowrap; text-decoration: none; display: inline-block;
}
.btn-outline {
  background: #FFF; color: var(--text); border: 1px solid var(--border);
  padding: 7px 12px; font-size: 12.5px; font-weight: 600; border-radius: 8px; cursor: pointer;
}
.btn-ghost {
  background: #F4F4F5; color: var(--text); border: 1px solid var(--border);
  padding: 5px 10px; font-size: 12px; border-radius: 7px; cursor: pointer;
}
.btn-del {
  background: #FEF2F2; color: var(--red); border: 1px solid #FECACA;
  padding: 5px 10px; font-size: 12px; border-radius: 7px; cursor: pointer;
}
.btn-del.confirming { background: var(--red); color: #FFF; border-color: var(--red); font-weight: 700; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.tab-pill {
  background: #F4F4F5; color: var(--muted); border: 1px solid transparent;
  padding: 5px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 600; cursor: pointer;
}
.tab-pill.active { background: var(--primary); color: #FFF; }
.item-row {
  display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 14px 0; border-top: 1px solid var(--border);
}
.item-title { font-size: 15px; font-weight: 650; }
.item-note { font-size: 13px; color: var(--muted); margin-top: 2px; }
.tag-done { background: #ECFDF5; color: var(--green); padding: 3px 9px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.tag-pending { background: #FFFBEB; color: var(--amber); padding: 3px 9px; border-radius: 6px; font-size: 12px; font-weight: 600; }
.login-box { max-width: 430px; margin: 48px auto; }
.hint-box { background: #F4F4F5; border-radius: 10px; padding: 10px 12px; font-size: 12.5px; color: var(--muted); margin-top: 12px; }
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(24,24,27,0.45); display: none;
  align-items: center; justify-content: center; padding: 16px; z-index: 999;
}
.modal-backdrop.open { display: flex; }
.modal-card {
  background: #FFF; border-radius: 16px; max-width: 560px; width: 100%; padding: 22px;
  max-height: 86vh; overflow-y: auto; border: 1px solid var(--border);
}
.toast {
  position: fixed; top: 18px; right: 18px; background: #18181B; color: #FFF;
  padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
  display: none; z-index: 1000; box-shadow: 0 8px 24px rgba(0,0,0,0.16);
}
`;
}

export function buildIndexHtml(bp) {
  const isCommercial = Boolean(bp.needPassword);
  const kind = bp.productKind || 'business_app';
  const esc = s =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const loginSection = isCommercial
    ? `
  <div id="login-view" class="wrap" style="display:none;">
    <div class="card login-box">
      <h2 style="font-size:20px;margin-bottom:6px;">🔐 登录【${esc(bp.appName)}】</h2>
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;">多账号加密鉴权版 · 管理员与成员分权保护</p>
      <form id="login-form" style="display:grid;gap:10px;">
        <input id="login-user" type="text" required placeholder="登录账号（默认管理员：admin）" />
        <input id="login-pass" type="password" required placeholder="登录密码" />
        <button type="submit" class="btn">安全登录</button>
      </form>
      <div class="hint-box">
        💡 首次启动默认管理员账号：<b>admin</b>，初始密码：<b>Admin@123456</b><br/>
        登录后可在右上角修改密码，或开通成员子账号（普通成员自动对手机号脱敏且禁止删除记录）。
      </div>
    </div>
  </div>`
    : '';

  const headerActions = isCommercial
    ? `<div class="top-actions">
        <span id="user-role-badge" class="badge-role">👑 管理员</span>
        <button id="btn-open-admin" type="button" class="btn-outline">👥 成员与日志</button>
        <button id="btn-open-pwd" type="button" class="btn-outline">🔑 修改密码</button>
        <button id="btn-export-csv" type="button" class="btn-outline">📥 导出 Excel</button>
        <button id="btn-logout" type="button" class="btn-outline">退出</button>
      </div>`
    : `<div class="top-actions">
        <span class="badge-ok">🟢 SQLite 真落库保护中</span>
        <button id="btn-export-csv" type="button" class="btn-outline">📥 导出 Excel (.csv)</button>
      </div>`;

  const websiteHeroHtml =
    kind === 'website'
      ? `
    <section class="site-hero">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;">
        <div style="max-width:660px;">
          <span class="badge-ok" style="display:inline-block;margin-bottom:12px;">🌐 官方展示与在线合作通道</span>
          <h1>${esc(bp.appName)}</h1>
          <p style="font-size:15.5px;color:var(--muted);margin:10px 0 18px;">${esc(bp.rawIdea || bp.archetypeLabel)} —— 支持直接向 AI 口述继续定制品牌视觉、案例画廊与多页面板块。</p>
          <a href="#consult-section" class="btn">立即在线预约 / 留言咨询 ↓</a>
        </div>
        ${headerActions}
      </div>
    </section>
    <section class="site-grid">
      <div class="card" style="margin-bottom:0;"><h3 style="font-size:16px;margin-bottom:6px;">01 · 核心价值展示</h3><p style="font-size:13.5px;color:var(--muted);">克制干净的视觉排版，自适应手机竖屏与电脑宽屏浏览。</p></div>
      <div class="card" style="margin-bottom:0;"><h3 style="font-size:16px;margin-bottom:6px;">02 · 真实客户留资入库</h3><p style="font-size:13.5px;color:var(--muted);">访客提交咨询即时写入 SQLite 数据库，绝非静态假表单。</p></div>
      <div class="card" style="margin-bottom:0;"><h3 style="font-size:16px;margin-bottom:6px;">03 · 随时随心扩展板块</h3><p style="font-size:13.5px;color:var(--muted);">直接在聊天框告诉 AI 即可增加作品集、价格方案或文章页面。</p></div>
    </section>`
      : '';

  const coreWorkspaceHtml = `
    ${
      kind === 'website'
        ? ''
        : `<div class="card header">
      <div>
        <h1>${esc(bp.appName)}</h1>
        <p>${esc(bp.archetypeLabel)} · 真实 SQLite 持久化底座（可向 AI 口述自由扩展任意专属页面与接口）</p>
      </div>
      ${headerActions}
    </div>`
    }

    <div class="stats">
      <div class="stat-card">
        <div id="stat-total" class="stat-num">0</div>
        <div class="stat-label">累计记录总数</div>
      </div>
      <div class="stat-card">
        <div id="stat-done" class="stat-num" style="color:var(--green);">0</div>
        <div class="stat-label">${esc(bp.labels.statusActiveText)}</div>
      </div>
      <div class="stat-card">
        <div id="stat-amount" class="stat-num">0</div>
        <div class="stat-label">合计 · ${esc(bp.labels.amountLabel)}</div>
      </div>
    </div>

    <div id="consult-section" class="card">
      <h3 style="font-size:16px;">${kind === 'website' ? '📩 在线咨询 / 合作登记' : '➕ 新建条目'}</h3>
      <form id="create-form" class="form-grid">
        <input id="inp-title" type="text" required placeholder="${esc(bp.labels.titleLabel)}（必填）" />
        <input id="inp-note" type="text" placeholder="${esc(bp.labels.subLabel)}" />
        <input id="inp-amount" type="number" step="any" placeholder="${esc(bp.labels.amountLabel)}" />
        <button type="submit" class="btn">${kind === 'website' ? '提交咨询' : '保存入库'}</button>
      </form>
    </div>

    <div class="card">
      <div class="toolbar">
        <div class="tabs">
          <button type="button" class="tab-pill active" data-status-tab="all">全部</button>
          <button type="button" class="tab-pill" data-status-tab="pending">${esc(bp.labels.statusPendingText)}</button>
          <button type="button" class="tab-pill" data-status-tab="done">${esc(bp.labels.statusActiveText)}</button>
        </div>
        <input id="inp-search" type="text" style="max-width:250px;" placeholder="🔍 搜索关键词..." />
      </div>
      <div id="items-box">正在读取真实数据库...</div>
    </div>`;

  const bodyMainHtml =
    kind === 'saas_platform'
      ? `<div class="saas-shell">
      <aside class="saas-side">
        <div style="font-weight:800;font-size:15px;margin-bottom:4px;">🧭 产品演进工作台</div>
        <p style="font-size:12px;color:var(--muted);margin-bottom:10px;">按阶段真做，严禁假按钮空壳：</p>
        <div class="side-stage current">🟢 v0.1 核心工作台闭环</div>
        <div class="side-stage">⏳ v0.2 扩展多板块与多表</div>
        <div class="side-stage">⏳ v0.3 接入真实 AI / 外部接口</div>
        <div class="side-stage">⏳ v0.4 权限与安全审计</div>
        <div class="side-stage">⏳ v1.0 打包部署上线</div>
      </aside>
      <main>${coreWorkspaceHtml}</main>
    </div>`
      : `${websiteHeroHtml}${coreWorkspaceHtml}`;

  const commercialModals = isCommercial
    ? `
  <div id="pwd-modal" class="modal-backdrop">
    <div class="modal-card">
      <h3 style="margin-bottom:12px;">🔑 修改登录密码（scrypt 加盐加密存储）</h3>
      <form id="pwd-form" style="display:grid;gap:10px;">
        <input id="inp-old-pwd" type="password" required placeholder="输入当前原密码" />
        <input id="inp-new-pwd" type="password" required minlength="6" placeholder="输入新密码（至少6位）" />
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
          <button type="button" class="btn-outline" data-close-modal="pwd-modal">取消</button>
          <button type="submit" class="btn">确认更新密码</button>
        </div>
      </form>
    </div>
  </div>

  <div id="admin-modal" class="modal-backdrop">
    <div class="modal-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3>👥 成员子账号管理 & 操作审计日志</h3>
        <button type="button" class="btn-outline" data-close-modal="admin-modal">关闭</button>
      </div>
      <form id="staff-create-form" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
        <input id="staff-user" type="text" required placeholder="登录账号 (如 staff01)" />
        <input id="staff-name" type="text" required placeholder="成员姓名 (如 小林)" />
        <input id="staff-pass" type="password" required minlength="6" placeholder="初始密码 (至少6位)" />
        <select id="staff-role">
          <option value="staff">普通成员（禁删数据·手机号脱敏）</option>
          <option value="admin">管理员（完整权限）</option>
        </select>
        <button type="submit" class="btn" style="grid-column:1 / -1;">➕ 开通新账号</button>
      </form>
      <h4 style="font-size:14px;margin-bottom:6px;">现有账号列表</h4>
      <div id="staff-list-box" style="margin-bottom:14px;"></div>
      <h4 style="font-size:14px;margin-bottom:6px;">最近操作留痕日志</h4>
      <div id="audit-log-box"></div>
    </div>
  </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(bp.appName)}</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <div id="toast-bar" class="toast"></div>
${loginSection}
  <div id="app-view" class="wrap" ${isCommercial ? 'style="display:none;"' : ''}>
    ${bodyMainHtml}
  </div>

  <div id="edit-modal" class="modal-backdrop">
    <div class="modal-card">
      <h3 style="margin-bottom:12px;">✏️ 编辑修改内容</h3>
      <form id="edit-form" style="display:grid;gap:10px;">
        <input id="edit-id" type="hidden" />
        <input id="edit-title" type="text" required placeholder="${esc(bp.labels.titleLabel)}" />
        <input id="edit-note" type="text" placeholder="${esc(bp.labels.subLabel)}" />
        <input id="edit-amount" type="number" step="any" placeholder="${esc(bp.labels.amountLabel)}" />
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:6px;">
          <button type="button" class="btn-outline" data-close-modal="edit-modal">取消</button>
          <button type="submit" class="btn">保存修改</button>
        </div>
      </form>
    </div>
  </div>
${commercialModals}
  <script src="/vibe-shield.js"></script>
  <script src="/app.js"></script>
</body>
</html>
`;
}
