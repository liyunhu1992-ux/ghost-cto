export function buildAppJs(bp) {
  const isCommercial = Boolean(bp.needPassword);
  const cfgJson = JSON.stringify({
    commercial: isCommercial,
    doneText: bp.labels.statusActiveText,
    pendingText: bp.labels.statusPendingText,
    amountLabel: bp.labels.amountLabel
  });

  const authClientSection = isCommercial
    ? `
async function checkSession() {
  const res = await apiFetch('/api/auth/me');
  const data = await res.json();
  currentUser = data.user || null;
  if (!currentUser) {
    document.getElementById('login-view').style.display = 'block';
    document.getElementById('app-view').style.display = 'none';
    return false;
  }
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('app-view').style.display = '';
  const roleBadge = document.getElementById('user-role-badge');
  if (roleBadge) {
    roleBadge.textContent = (currentUser.role === 'admin' ? '👑 管理员 · ' : '👤 成员 · ') + currentUser.displayName;
  }
  const adminBtn = document.getElementById('btn-open-admin');
  if (adminBtn) adminBtn.style.display = currentUser.role === 'admin' ? 'inline-block' : 'none';
  return true;
}

document.getElementById('login-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type="submit"]');
  await withLock(btn, async () => {
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    const res = await apiPost('/api/auth/login', { username, password });
    const data = await res.json();
    if (!data.ok) return notify(data.error || '登录失败', true);
    document.getElementById('login-pass').value = '';
    await checkSession();
    await loadItems();
    notify('欢迎回来，' + data.user.displayName);
  });
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await apiPost('/api/auth/logout', {});
  currentUser = null;
  await checkSession();
});

document.getElementById('btn-open-pwd').addEventListener('click', () => {
  document.getElementById('pwd-modal').classList.add('open');
});

document.getElementById('pwd-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type="submit"]');
  await withLock(btn, async () => {
    const oldPassword = document.getElementById('inp-old-pwd').value;
    const newPassword = document.getElementById('inp-new-pwd').value;
    const res = await apiPost('/api/auth/change-password', { oldPassword, newPassword });
    const data = await res.json();
    if (!data.ok) return notify(data.error || '修改失败', true);
    document.getElementById('pwd-modal').classList.remove('open');
    ev.target.reset();
    notify('密码已加密更新');
  });
});

async function refreshAdminPanel() {
  const [uRes, lRes] = await Promise.all([apiFetch('/api/admin/users'), apiFetch('/api/admin/audit-logs')]);
  const uData = await uRes.json();
  const lData = await lRes.json();
  const uBox = document.getElementById('staff-list-box');
  uBox.innerHTML = '';
  (uData.users || []).forEach(u => {
    const row = document.createElement('div');
    row.className = 'item-row';
    const info = document.createElement('div');
    info.textContent = u.display_name + ' (@' + u.username + ') · ' + (u.role === 'admin' ? '管理员' : '普通成员');
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn-ghost';
    toggleBtn.textContent = Number(u.active) ? '停用账号' : '重新启用';
    if (currentUser && u.id === currentUser.id) toggleBtn.disabled = true;
    toggleBtn.onclick = async () => {
      const r = await apiPost('/api/admin/users/toggle', { id: u.id });
      const d = await r.json();
      if (!d.ok) return notify(d.error || '操作失败', true);
      await refreshAdminPanel();
    };
    row.appendChild(info);
    row.appendChild(toggleBtn);
    uBox.appendChild(row);
  });

  const logBox = document.getElementById('audit-log-box');
  logBox.innerHTML = '';
  (lData.logs || []).slice(0, 12).forEach(lg => {
    const p = document.createElement('div');
    p.style.cssText = 'font-size:12.5px;color:#52525B;padding:5px 0;border-top:1px solid #F4F4F5;';
    p.textContent = String(lg.created_at || '').slice(5, 19).replace('T', ' ') + ' · [' + lg.actor + '] ' + lg.action + '：' + lg.detail;
    logBox.appendChild(p);
  });
}

document.getElementById('btn-open-admin').addEventListener('click', async () => {
  document.getElementById('admin-modal').classList.add('open');
  await refreshAdminPanel();
});

document.getElementById('staff-create-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type="submit"]');
  await withLock(btn, async () => {
    const username = document.getElementById('staff-user').value.trim();
    const displayName = document.getElementById('staff-name').value.trim();
    const password = document.getElementById('staff-pass').value;
    const role = document.getElementById('staff-role').value;
    const res = await apiPost('/api/admin/users/create', { username, displayName, password, role });
    const data = await res.json();
    if (!data.ok) return notify(data.error || '开通失败', true);
    ev.target.reset();
    await refreshAdminPanel();
    notify('成员子账号已开通');
  });
});
`
    : '';

  const bootLine = isCommercial
    ? `(async () => { if (await checkSession()) await loadItems(); })();`
    : `loadItems();`;

  return `const CFG = ${cfgJson};
let currentStatus = 'all';
let currentUser = null;

function notify(msg, isErr = false) {
  const el = document.getElementById('toast-bar');
  if (!el) return;
  el.textContent = msg;
  el.style.background = isErr ? '#DC2626' : '#18181B';
  el.style.display = 'block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => { el.style.display = 'none'; }, 2400);
}

async function withLock(btn, fn) {
  if (!btn || btn.disabled) return;
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = '处理中...';
  try {
    await fn();
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

function apiFetch(url) {
  return fetch(url, { credentials: 'same-origin' });
}

function apiPost(url, body) {
  return fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
}

async function loadItems() {
  const q = document.getElementById('inp-search').value.trim();
  const res = await apiFetch('/api/records?q=' + encodeURIComponent(q) + '&status=' + encodeURIComponent(currentStatus));
  if (res.status === 401 && CFG.commercial) {
    document.getElementById('login-view').style.display = 'block';
    document.getElementById('app-view').style.display = 'none';
    return;
  }
  const data = await res.json();
  if (!data.ok) return notify(data.error || '加载失败', true);
  renderItems(data.items || []);
}

function openEditModal(item) {
  document.getElementById('edit-id').value = item.id;
  document.getElementById('edit-title').value = item.title;
  document.getElementById('edit-note').value = item.note || '';
  document.getElementById('edit-amount').value = item.amount ?? 0;
  document.getElementById('edit-modal').classList.add('open');
}

function renderItems(items) {
  document.getElementById('stat-total').textContent = items.length;
  document.getElementById('stat-done').textContent = items.filter(i => i.status === 'done').length;
  const sum = items.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  document.getElementById('stat-amount').textContent = Math.round(sum * 100) / 100;

  const box = document.getElementById('items-box');
  if (items.length === 0) {
    box.innerHTML = '<p style="color:#64646E;padding:18px 0;font-size:14px;">当前筛选下暂无记录，可在上方新增一条试试。</p>';
    return;
  }
  box.innerHTML = '';
  const canDelete = !CFG.commercial || (currentUser && currentUser.role === 'admin');

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'item-row';

    const left = document.createElement('div');
    const titleEl = document.createElement('div');
    titleEl.className = 'item-title';
    titleEl.textContent = item.title + (Number(item.amount) ? ' · ' + CFG.amountLabel + ': ' + item.amount : '');
    const noteEl = document.createElement('div');
    noteEl.className = 'item-note';
    noteEl.textContent = item.note || '无备注';
    left.appendChild(titleEl);
    left.appendChild(noteEl);

    const right = document.createElement('div');
    right.style.cssText = 'display:flex;gap:7px;align-items:center;flex-wrap:wrap;';

    const tag = document.createElement('span');
    tag.className = item.status === 'done' ? 'tag-done' : 'tag-pending';
    tag.textContent = item.status === 'done' ? CFG.doneText : CFG.pendingText;

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-ghost';
    editBtn.textContent = '编辑';
    editBtn.onclick = () => openEditModal(item);

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn-ghost';
    toggleBtn.textContent = item.status === 'done' ? '设为待办' : '标记完成';
    toggleBtn.onclick = () => withLock(toggleBtn, async () => {
      const r = await apiPost('/api/records/toggle', { id: item.id });
      const d = await r.json();
      if (!d.ok) return notify(d.error || '切换失败', true);
      await loadItems();
    });

    right.appendChild(tag);
    right.appendChild(editBtn);
    right.appendChild(toggleBtn);

    if (canDelete) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-del';
      delBtn.textContent = '删除';
      delBtn.onclick = async () => {
        if (!delBtn.classList.contains('confirming')) {
          delBtn.classList.add('confirming');
          delBtn.textContent = '确定删？';
          setTimeout(() => {
            delBtn.classList.remove('confirming');
            delBtn.textContent = '删除';
          }, 3000);
          return;
        }
        await withLock(delBtn, async () => {
          const r = await apiPost('/api/records/delete', { id: item.id });
          const d = await r.json();
          if (!d.ok) return notify(d.error || '删除失败', true);
          await loadItems();
          notify('已安全删除记录');
        });
      };
      right.appendChild(delBtn);
    }

    row.appendChild(left);
    row.appendChild(right);
    box.appendChild(row);
  });
}

document.getElementById('create-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type="submit"]');
  await withLock(btn, async () => {
    const title = document.getElementById('inp-title').value.trim();
    const note = document.getElementById('inp-note').value.trim();
    const amount = document.getElementById('inp-amount').value;
    if (!title) return;
    const res = await apiPost('/api/records/create', { title, note, amount });
    const data = await res.json();
    if (!data.ok) return notify(data.error || '保存失败', true);
    ev.target.reset();
    await loadItems();
    notify('已写入真实 SQLite 数据库');
  });
});

document.getElementById('edit-form').addEventListener('submit', async ev => {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type="submit"]');
  await withLock(btn, async () => {
    const id = document.getElementById('edit-id').value;
    const title = document.getElementById('edit-title').value.trim();
    const note = document.getElementById('edit-note').value.trim();
    const amount = document.getElementById('edit-amount').value;
    const res = await apiPost('/api/records/update', { id, title, note, amount });
    const data = await res.json();
    if (!data.ok) return notify(data.error || '更新失败', true);
    document.getElementById('edit-modal').classList.remove('open');
    await loadItems();
    notify('修改已保存');
  });
});

document.getElementById('btn-export-csv').addEventListener('click', async ev => {
  const btn = ev.currentTarget;
  await withLock(btn, async () => {
    const res = await apiFetch('/api/records/export.csv');
    if (!res.ok) return notify('导出失败', true);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '数据导出明细.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify('Excel 兼容表格已导出');
  });
});

document.querySelectorAll('[data-status-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-status-tab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentStatus = tab.getAttribute('data-status-tab');
    loadItems();
  });
});

document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-close-modal');
    document.getElementById(id).classList.remove('open');
  });
});

document.getElementById('inp-search').addEventListener('input', () => loadItems());
${authClientSection}
${bootLine}
`;
}
