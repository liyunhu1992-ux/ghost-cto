import fs from 'node:fs';
import path from 'node:path';
import {
  buildProjectConfigJson,
  buildMpAppJson,
  buildMpSitemapJson,
  buildMpAppJs,
  buildMpAppWxss,
  buildMpPageJson,
  buildMpPageWxss
} from './miniprogram-styles.mjs';

function buildMpPageWxml(bp) {
  const esc = s =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const loginBlock = bp.needPassword
    ? `  <view wx:if="{{commercial && !user}}" class="card">
    <view class="sec-title">🔐 登录【${esc(bp.appName)}】小程序端</view>
    <input class="inp" placeholder="登录账号（默认管理员：admin）" value="{{loginUser}}" bindinput="onLoginUserInput" />
    <input class="inp" password placeholder="登录密码" value="{{loginPass}}" bindinput="onLoginPassInput" />
    <button class="btn-primary" disabled="{{submitting}}" bindtap="submitLogin">安全登录</button>
    <view style="font-size:23rpx;color:#64646E;margin-top:16rpx;">默认管理员账号 admin，初始密码 Admin@123456</view>
  </view>\n`
    : '';

  const userBar = bp.needPassword
    ? `    <view wx:if="{{user}}" class="card" style="display:flex;justify-content:space-between;align-items:center;">
      <view style="font-size:25rpx;font-weight:600;">当前身份：{{user.role === 'admin' ? '👑 管理员' : '👤 成员'}} · {{user.displayName}}</view>
      <view class="btn-outline" bindtap="handleLogout">退出登录</view>
    </view>\n`
    : '';

  return `<view class="container">
${loginBlock}  <block wx:if="{{!commercial || user}}">
${userBar}    <view class="stats-grid">
      <view class="stat-box">
        <view class="stat-num">{{totalCount}}</view>
        <view class="stat-label">记录总数</view>
      </view>
      <view class="stat-box">
        <view class="stat-num stat-green">{{doneCount}}</view>
        <view class="stat-label">${esc(bp.labels.statusActiveText)}</view>
      </view>
      <view class="stat-box">
        <view class="stat-num">{{sumAmount}}</view>
        <view class="stat-label">${esc(bp.labels.amountLabel)}</view>
      </view>
    </view>

    <view class="card">
      <view class="sec-title">➕ 新增记录（直连 SQLite 真库）</view>
      <input class="inp" placeholder="${esc(bp.labels.titleLabel)}（必填）" value="{{formTitle}}" bindinput="onTitleInput" />
      <input class="inp" placeholder="${esc(bp.labels.subLabel)}" value="{{formNote}}" bindinput="onNoteInput" />
      <input class="inp" type="digit" placeholder="${esc(bp.labels.amountLabel)}" value="{{formAmount}}" bindinput="onAmountInput" />
      <button class="btn-primary" disabled="{{submitting}}" bindtap="submitCreate">{{submitting ? '处理中...' : '保存入库'}}</button>
    </view>

    <view class="card">
      <view class="tabs">
        <view class="tab {{statusFilter === 'all' ? 'tab-active' : ''}}" data-status="all" bindtap="switchTab">全部</view>
        <view class="tab {{statusFilter === 'pending' ? 'tab-active' : ''}}" data-status="pending" bindtap="switchTab">${esc(bp.labels.statusPendingText)}</view>
        <view class="tab {{statusFilter === 'done' ? 'tab-active' : ''}}" data-status="done" bindtap="switchTab">${esc(bp.labels.statusActiveText)}</view>
      </view>
      <input class="inp" placeholder="🔍 搜索名称或备注..." value="{{keyword}}" bindinput="onSearchInput" />

      <view wx:if="{{items.length === 0}}" style="padding:28rpx 0;color:#64646E;">当前暂无记录，可在上方新增一条试试。</view>

      <view wx:for="{{items}}" wx:key="id" class="row">
        <view class="row-title">{{item.title}} <text wx:if="{{item.amount}}">· ${esc(bp.labels.amountLabel)}: {{item.amount}}</text></view>
        <view class="row-note">{{item.note || '无备注'}}</view>
        <view class="row-actions">
          <view class="{{item.status === 'done' ? 'tag-done' : 'tag-pending'}}">{{item.status === 'done' ? '${esc(bp.labels.statusActiveText)}' : '${esc(bp.labels.statusPendingText)}'}}</view>
          <view class="btn-group">
            <view class="btn-outline" data-item="{{item}}" bindtap="openEdit">编辑</view>
            <view class="btn-outline" data-id="{{item.id}}" bindtap="toggleStatus">{{item.status === 'done' ? '设为待办' : '标记完成'}}</view>
            <view wx:if="{{canDelete}}" class="btn-danger" data-id="{{item.id}}" data-title="{{item.title}}" bindtap="confirmDelete">删除</view>
          </view>
        </view>
      </view>
    </view>
  </block>

  <view wx:if="{{editingItem}}" class="modal-mask">
    <view class="modal-panel">
      <view class="sec-title">✏️ 编辑修改记录</view>
      <input class="inp" value="{{editTitle}}" bindinput="onEditTitleInput" placeholder="${esc(bp.labels.titleLabel)}" />
      <input class="inp" value="{{editNote}}" bindinput="onEditNoteInput" placeholder="${esc(bp.labels.subLabel)}" />
      <input class="inp" type="digit" value="{{editAmount}}" bindinput="onEditAmountInput" placeholder="${esc(bp.labels.amountLabel)}" />
      <view style="display:flex;gap:16rpx;margin-top:12rpx;">
        <button class="btn-outline" style="flex:1;" bindtap="closeEdit">取消</button>
        <button class="btn-primary" style="flex:1;" disabled="{{submitting}}" bindtap="submitUpdate">保存修改</button>
      </view>
    </view>
  </view>
</view>
`;
}

function buildMpPageJs(bp) {
  const isCommercial = Boolean(bp.needPassword);
  const authMethods = isCommercial
    ? `,
  onLoginUserInput(e) { this.setData({ loginUser: e.detail.value }); },
  onLoginPassInput(e) { this.setData({ loginPass: e.detail.value }); },
  async checkSession() {
    try {
      const data = await mpFetch('/api/auth/me');
      const user = data.user || null;
      this.setData({ user, canDelete: Boolean(user && user.role === 'admin') });
      return Boolean(user);
    } catch (err) {
      console.warn('[mp-auth]', err);
      this.setData({ user: null, canDelete: false });
      return false;
    }
  },
  async submitLogin() {
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const data = await mpPost('/api/auth/login', {
        username: this.data.loginUser.trim(),
        password: this.data.loginPass
      });
      if (!data.ok) {
        wx.showToast({ title: data.error || '登录失败', icon: 'none' });
        return;
      }
      wx.setStorageSync('vibe_token', data.token || '');
      this.setData({
        loginPass: '',
        user: data.user,
        canDelete: data.user && data.user.role === 'admin'
      });
      await this.loadRecords();
      wx.showToast({ title: '登录成功', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '请先启动本地后台服务', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
  async handleLogout() {
    try {
      await mpPost('/api/auth/logout', {});
    } catch (err) {
      console.warn('[mp-logout]', err);
    }
    wx.removeStorageSync('vibe_token');
    this.setData({ user: null, items: [], canDelete: false });
  }`
    : '';

  const onLoadBody = isCommercial
    ? `const ok = await this.checkSession();
    if (ok) await this.loadRecords();`
    : `await this.loadRecords();`;

  return `const app = getApp();

function mpRequest(apiPath, method, body) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('vibe_token') || '';
    const header = { 'Content-Type': 'application/json' };
    if (token) header.Authorization = 'Bearer ' + token;
    wx.request({
      url: app.globalData.apiBase + apiPath,
      method,
      data: body,
      header,
      success(res) {
        if (res.statusCode === 401) {
          wx.removeStorageSync('vibe_token');
          resolve({ ok: false, unauthorized: true, error: '请先登录账号' });
          return;
        }
        resolve(res.data || { ok: false, error: '返回格式异常' });
      },
      fail(err) {
        reject(new Error((err && err.errMsg) || '请先双击启动本地后台服务'));
      }
    });
  });
}

function mpFetch(apiPath) {
  return mpRequest(apiPath, 'GET');
}

function mpPost(apiPath, body) {
  return mpRequest(apiPath, 'POST', body || {});
}

Page({
  data: {
    commercial: ${isCommercial},
    user: null,
    canDelete: ${!isCommercial},
    loginUser: 'admin',
    loginPass: '',
    items: [],
    totalCount: 0,
    doneCount: 0,
    sumAmount: 0,
    statusFilter: 'all',
    keyword: '',
    formTitle: '',
    formNote: '',
    formAmount: '',
    submitting: false,
    editingItem: null,
    editTitle: '',
    editNote: '',
    editAmount: ''
  },

  async onLoad() {
    ${onLoadBody}
  },

  async onPullDownRefresh() {
    await this.loadRecords();
    wx.stopPullDownRefresh();
  },

  onTitleInput(e) { this.setData({ formTitle: e.detail.value }); },
  onNoteInput(e) { this.setData({ formNote: e.detail.value }); },
  onAmountInput(e) { this.setData({ formAmount: e.detail.value }); },
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
    this.loadRecords();
  },

  switchTab(e) {
    const status = e.currentTarget.dataset.status || 'all';
    this.setData({ statusFilter: status });
    this.loadRecords();
  },

  async loadRecords() {
    try {
      const q = encodeURIComponent(this.data.keyword.trim());
      const st = encodeURIComponent(this.data.statusFilter);
      const data = await mpFetch('/api/records?q=' + q + '&status=' + st);
      if (data.unauthorized && this.data.commercial) {
        this.setData({ user: null, canDelete: false });
        return;
      }
      if (!data.ok) {
        wx.showToast({ title: data.error || '加载失败', icon: 'none' });
        return;
      }
      const list = data.items || [];
      const doneCount = list.filter(i => i.status === 'done').length;
      const sum = Math.round(list.reduce((acc, i) => acc + (Number(i.amount) || 0), 0) * 100) / 100;
      this.setData({
        items: list,
        totalCount: list.length,
        doneCount,
        sumAmount: sum
      });
    } catch (err) {
      wx.showToast({ title: err.message || '请先双击启动项目后台', icon: 'none' });
    }
  },

  async submitCreate() {
    if (this.data.submitting) return;
    const title = this.data.formTitle.trim();
    if (!title) {
      wx.showToast({ title: '请先填写名称', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      const data = await mpPost('/api/records/create', {
        title,
        note: this.data.formNote.trim(),
        amount: this.data.formAmount
      });
      if (!data.ok) {
        wx.showToast({ title: data.error || '保存失败', icon: 'none' });
        return;
      }
      this.setData({ formTitle: '', formNote: '', formAmount: '' });
      await this.loadRecords();
      wx.showToast({ title: '已存入真数据库', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '网络请求失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  openEdit(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    this.setData({
      editingItem: item,
      editTitle: item.title || '',
      editNote: item.note || '',
      editAmount: String(item.amount ?? 0)
    });
  },

  closeEdit() { this.setData({ editingItem: null }); },
  onEditTitleInput(e) { this.setData({ editTitle: e.detail.value }); },
  onEditNoteInput(e) { this.setData({ editNote: e.detail.value }); },
  onEditAmountInput(e) { this.setData({ editAmount: e.detail.value }); },

  async submitUpdate() {
    if (this.data.submitting || !this.data.editingItem) return;
    this.setData({ submitting: true });
    try {
      const data = await mpPost('/api/records/update', {
        id: this.data.editingItem.id,
        title: this.data.editTitle.trim(),
        note: this.data.editNote.trim(),
        amount: this.data.editAmount
      });
      if (!data.ok) {
        wx.showToast({ title: data.error || '修改失败', icon: 'none' });
        return;
      }
      this.setData({ editingItem: null });
      await this.loadRecords();
      wx.showToast({ title: '修改已保存', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.message || '修改异常', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  async toggleStatus(e) {
    if (this.data.submitting) return;
    const id = e.currentTarget.dataset.id;
    this.setData({ submitting: true });
    try {
      const data = await mpPost('/api/records/toggle', { id });
      if (!data.ok) {
        wx.showToast({ title: data.error || '切换失败', icon: 'none' });
        return;
      }
      await this.loadRecords();
    } catch (err) {
      wx.showToast({ title: err.message || '请求失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  confirmDelete(e) {
    const id = e.currentTarget.dataset.id;
    const title = e.currentTarget.dataset.title || '该条记录';
    wx.showModal({
      title: '防误删确认',
      content: '确定要永久删除「' + title + '」吗？',
      confirmColor: '#DC2626',
      success: async modalRes => {
        if (!modalRes.confirm) return;
        try {
          const data = await mpPost('/api/records/delete', { id });
          if (!data.ok) {
            wx.showToast({ title: data.error || '删除失败', icon: 'none' });
            return;
          }
          await this.loadRecords();
          wx.showToast({ title: '已安全删除', icon: 'success' });
        } catch (err) {
          wx.showToast({ title: err.message || '删除异常', icon: 'none' });
        }
      }
    });
  }${authMethods}
});
`;
}

export function writeMiniProgramScaffold(absRoot, bp) {
  const mpRoot = path.join(absRoot, 'miniprogram');
  const pageDir = path.join(mpRoot, 'pages', 'index');
  fs.mkdirSync(pageDir, { recursive: true });

  fs.writeFileSync(path.join(mpRoot, 'project.config.json'), buildProjectConfigJson(bp), 'utf8');
  fs.writeFileSync(path.join(mpRoot, 'app.json'), buildMpAppJson(bp), 'utf8');
  fs.writeFileSync(path.join(mpRoot, 'sitemap.json'), buildMpSitemapJson(), 'utf8');
  fs.writeFileSync(path.join(mpRoot, 'app.js'), buildMpAppJs(bp), 'utf8');
  fs.writeFileSync(path.join(mpRoot, 'app.wxss'), buildMpAppWxss(), 'utf8');

  fs.writeFileSync(path.join(pageDir, 'index.json'), buildMpPageJson(bp), 'utf8');
  fs.writeFileSync(path.join(pageDir, 'index.wxss'), buildMpPageWxss(), 'utf8');
  fs.writeFileSync(path.join(pageDir, 'index.wxml'), buildMpPageWxml(bp), 'utf8');
  fs.writeFileSync(path.join(pageDir, 'index.js'), buildMpPageJs(bp), 'utf8');

  return mpRoot;
}
