export function buildProjectConfigJson(bp) {
  const safeSlug = String(bp.appName || 'vibe-miniprogram').replace(/\s+/g, '-');
  return (
    JSON.stringify(
      {
        description: `${bp.appName} · GhostCTO 微信小程序端`,
        packOptions: { ignore: [], include: [] },
        setting: {
          urlCheck: false,
          es6: true,
          enhance: true,
          postcss: true,
          minified: true,
          compileWorklet: false
        },
        compileType: 'miniprogram',
        libVersion: 'latest',
        appid: 'touristappid',
        projectname: safeSlug,
        condition: {}
      },
      null,
      2
    ) + '\n'
  );
}

export function buildMpAppJson(bp) {
  return (
    JSON.stringify(
      {
        pages: ['pages/index/index'],
        window: {
          navigationBarTitleText: bp.appName,
          navigationBarBackgroundColor: '#FFFFFF',
          navigationBarTextStyle: 'black',
          backgroundColor: '#F8F7F4'
        },
        style: 'v2',
        sitemapLocation: 'sitemap.json'
      },
      null,
      2
    ) + '\n'
  );
}

export function buildMpSitemapJson() {
  return (
    JSON.stringify(
      {
        desc: '小程序索引规则',
        rules: [{ action: 'allow', page: '*' }]
      },
      null,
      2
    ) + '\n'
  );
}

export function buildMpAppJs(bp) {
  return `App({
  globalData: {
    appName: ${JSON.stringify(bp.appName)},
    apiBase: 'http://127.0.0.1:3090',
    commercial: ${Boolean(bp.needPassword)}
  }
});
`;
}

export function buildMpAppWxss() {
  return `page {
  background-color: #F8F7F4;
  color: #18181B;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
}
.container { padding: 24rpx; padding-bottom: 80rpx; }
.card {
  background: #FFFFFF;
  border: 1rpx solid #E5E4DF;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 22rpx;
}
`;
}

export function buildMpPageJson(bp) {
  return (
    JSON.stringify(
      {
        navigationBarTitleText: bp.appName,
        enablePullDownRefresh: true
      },
      null,
      2
    ) + '\n'
  );
}

export function buildMpPageWxss() {
  return `.stats-grid { display: flex; gap: 16rpx; margin-bottom: 22rpx; }
.stat-box {
  flex: 1; background: #FFFFFF; border: 1rpx solid #E5E4DF;
  border-radius: 20rpx; padding: 22rpx 18rpx;
}
.stat-num { font-size: 40rpx; font-weight: 800; }
.stat-green { color: #059669; }
.stat-label { font-size: 22rpx; color: #64646E; margin-top: 4rpx; }
.sec-title { font-size: 30rpx; font-weight: 700; margin-bottom: 18rpx; }
.inp {
  background: #FAFAF9; border: 1rpx solid #D4D4D8; border-radius: 14rpx;
  padding: 18rpx 22rpx; margin-bottom: 16rpx; font-size: 28rpx;
}
.btn-primary {
  background: #18181B; color: #FFFFFF; border-radius: 14rpx;
  font-size: 28rpx; font-weight: 600; padding: 18rpx 0; text-align: center;
}
.btn-outline {
  background: #F4F4F5; color: #18181B; border-radius: 12rpx;
  font-size: 24rpx; padding: 10rpx 20rpx;
}
.btn-danger {
  background: #FEF2F2; color: #DC2626; border-radius: 12rpx;
  font-size: 24rpx; padding: 10rpx 20rpx;
}
.tabs { display: flex; gap: 12rpx; margin-bottom: 18rpx; flex-wrap: wrap; }
.tab {
  padding: 10rpx 22rpx; border-radius: 999rpx; background: #F4F4F5;
  color: #64646E; font-size: 24rpx; font-weight: 600;
}
.tab-active { background: #18181B; color: #FFFFFF; }
.row { padding: 22rpx 0; border-top: 1rpx solid #E5E4DF; }
.row-title { font-size: 30rpx; font-weight: 650; }
.row-note { font-size: 25rpx; color: #64646E; margin-top: 6rpx; }
.row-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 14rpx; }
.btn-group { display: flex; gap: 12rpx; }
.tag-done {
  background: #ECFDF5; color: #059669; padding: 6rpx 16rpx;
  border-radius: 10rpx; font-size: 22rpx; font-weight: 600;
}
.tag-pending {
  background: #FFFBEB; color: #D97706; padding: 6rpx 16rpx;
  border-radius: 10rpx; font-size: 22rpx; font-weight: 600;
}
.modal-mask {
  position: fixed; inset: 0; background: rgba(24, 24, 27, 0.48);
  display: flex; align-items: center; justify-content: center; padding: 32rpx; z-index: 99;
}
.modal-panel { width: 100%; background: #FFFFFF; border-radius: 24rpx; padding: 32rpx; }
`;
}
