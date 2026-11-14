import fs from 'node:fs';
import path from 'node:path';

const ARCHETYPES = [
  {
    id: 'website_brand',
    productKind: 'website',
    label: '🌐 独立品牌官网 / 产品展示站 / 个人主页与线索收集',
    matchRe: /官网|网站|主页|独立站|落地页|landing|作品集|博客|展示站|门户|报名|表单|问卷|留言/,
    defaultName: '品牌展示与客户咨询站',
    nameSuffix: '官网',
    tableName: 'inquiries',
    titleLabel: '访客称呼 / 咨询主题',
    subLabel: '联系方式（微信/手机/邮箱）与具体需求',
    amountLabel: '预算规模 / 意向人数',
    statusActiveText: '已跟进回复',
    statusPendingText: '新收到咨询',
    coreFeatures: [
      '克制高级感多板块官网布局（首屏价值主张 Hero、核心亮点矩阵、案例/作品展示区、FAQ 与底部导航，手机与电脑自适应）',
      '真实在线咨询/预约留资表单（访客提交直接写入 SQLite 真库，防连击锁，绝非只弹提示不落库的假表单）',
      '站长线索管理抽屉/后台（支持查看咨询、搜索筛选、标记已跟进、二次确认删除与导出 Excel 线索表）',
      '后续可平滑扩展多页面路由、文章/案例 CMS 内容库、SEO 元信息与独立域名部署'
    ],
    sampleItems: [
      { title: '张总监 · 咨询企业定制合作方案', note: '13800138801 · 希望本周三下午线上演示', amount: 50000, status: 'pending' },
      { title: '林设计师 · 预约线下展厅参观与交流', note: '微信 lin_studio · 周六下午 2 点到访', amount: 2, status: 'done' },
      { title: '海外渠道伙伴 · 索取最新产品手册', note: 'partner@example.com · 关注多语言版本', amount: 100, status: 'pending' }
    ]
  },
  {
    id: 'saas_ai_platform',
    productKind: 'saas_platform',
    label: '🚀 多模块 AI 工作台 / SaaS 平台 / 内容与矩阵操作系统',
    matchRe: /saas|平台|工作台|矩阵|工作流|agent|智能体|多账号|自媒体|小红书|抖音|公众号|视频号|选题|文案|脚本|ai|生成|创作|编辑器|诊断|引擎|卫士|os/i,
    defaultName: '智能创作与业务操作系统',
    nameSuffix: '平台',
    tableName: 'workspace_projects',
    titleLabel: '任务 / 作品 / 空间名称',
    subLabel: '核心参数、渠道账号或提示词配置',
    amountLabel: '质量评分 / 消耗额度',
    statusActiveText: '已生成交付 🚀',
    statusPendingText: '编排处理中 ⚡',
    coreFeatures: [
      '多模块 SaaS 工作台骨架（左侧模块导航 + 顶部全局状态栏 + 核心工作区，按 0→5 路线图分期点亮真实模块，严禁画空壳假标签页）',
      '项目/任务资产真实持久化（SQLite WAL 真库 + 自动无损字段迁移，刷新或重启绝不丢失创作历史与配置）',
      '支持平滑接入真实大模型 / 外部 API 管道（规范 .env.example 密钥隔离、超时保护与明确中文错误反馈，严禁空 catch 吞错）',
      '支持随时开启多租户/团队账号鉴权（scrypt 密码加盐哈希、管理员/成员分权、审计日志与 Docker 容器化部署）'
    ],
    sampleItems: [
      { title: '多渠道内容自动生成与分发流水线', note: '主账号矩阵组 · 已绑定结构化输出模板', amount: 96, status: 'done' },
      { title: '行业热点追踪与选题策划方案 #12', note: '待补充品牌语气偏好后执行批量生成', amount: 88, status: 'pending' },
      { title: '客户私有知识库问答索引任务', note: '已完成首批文档切片与本地检索校验', amount: 92, status: 'done' }
    ]
  },
  {
    id: 'shop_crm',
    productKind: 'business_app',
    label: '🏪 门店会员 / 客户预约 / CRM 业务系统',
    matchRe: /门店|美甲|美容|理发|宠物|健身|瑜伽|客户|会员|次卡|储值|预约|排班|订单|学员|课程|售后|crm/i,
    defaultName: '客户预约与会员管理系统',
    nameSuffix: '系统',
    tableName: 'customer_records',
    titleLabel: '客户姓名 / 预约项目',
    subLabel: '联系电话或跟进备注',
    amountLabel: '储值余额 / 剩余次数',
    statusActiveText: '已完成核销',
    statusPendingText: '待到店跟进',
    coreFeatures: [
      '客户与预约登记 + 随时在线编辑（姓名、电话备注、次数/余额真实存入 SQLite 数据库）',
      '一键状态流转 + 防误删二次确认（防手滑删错客户档案，重启电脑绝不丢数据）',
      '经营汇总看板 + 状态分组筛选 + 关键词秒搜',
      '一键导出 Excel 兼容表格（UTF-8 BOM .csv，中文零乱码）'
    ],
    sampleItems: [
      { title: '林女士 · 尊享护理套餐预约', note: '13800138801（周六下午3点到店）', amount: 5, status: 'pending' },
      { title: '陈先生 · 年度储值会员卡', note: '13922016699（偏好安静靠窗位）', amount: 1200, status: 'done' },
      { title: '王小姐 · 首次体验预约登记', note: '13766889900（朋友推荐，提前电话确认）', amount: 1, status: 'pending' }
    ]
  },
  {
    id: 'ledger_inventory',
    productKind: 'business_app',
    label: '💰 财务收支 / 进销存库存 / 报价订单系统',
    matchRe: /记账|账本|收支|开销|预算|报销|财务|库存|进销存|货品|商品|仓库|采购|报价|发票|欠款|erp/i,
    defaultName: '收支与进销存管理系统',
    nameSuffix: '系统',
    tableName: 'ledger_entries',
    titleLabel: '账目 / 货品名称',
    subLabel: '分类、往来单位或经手人电话',
    amountLabel: '金额（元）或库存数量',
    statusActiveText: '已结清 / 已入库',
    statusPendingText: '待核对 / 预警中',
    coreFeatures: [
      '极速录入与在线编辑修正（名称、往来备注、金额/数量秒存真实 SQLite 数据库，自带防连击锁）',
      '实时经营汇总看板（自动统计总笔数、已结清数与累计金额/库存合计）',
      '按状态分组筛选 + 关键词秒搜 + 防误删二次确认',
      '一键导出财务/库存 Excel 表格（.csv 零乱码直开）'
    ],
    sampleItems: [
      { title: '首批主营货品入库登记', note: '供应商李经理 13811223344 · 已核对单据', amount: 2680, status: 'done' },
      { title: '季度礼盒装安全库存盘点', note: 'A区货架余量，低于 20 件需补货', amount: 36, status: 'pending' },
      { title: '企业客户定制订单定金', note: '对公收款已确认，月底结算尾款', amount: 1500, status: 'done' }
    ]
  },
  {
    id: 'interactive_tool',
    productKind: 'interactive_tool',
    label: '🛠️ 交互式效率工具 / 学习创作应用 / 个人数字产品',
    matchRe: /工具|计算器|转换|番茄钟|画布|白板|思维导图|简历|单词|英语|学习|考试|刷题|打卡|习惯|阅读|待办|计划|笔记|备忘/,
    defaultName: '数字效率与创作应用',
    nameSuffix: '工具',
    tableName: 'study_tasks',
    titleLabel: '条目 / 任务名称',
    subLabel: '详细内容、规则参数或复盘记录',
    amountLabel: '进度分值 / 时长数值',
    statusActiveText: '已完成 ✅',
    statusPendingText: '进行中 📌',
    coreFeatures: [
      '清爽专注的交互式主界面 + 在线增删改查（真实写入本地 SQLite 数据库，刷新绝不丢记录）',
      '状态一键切换 + 实时累计统计看板 + 防误删二次确认',
      '按状态分组过滤 + 关键词即时检索',
      '一键导出完整数据备份表（Excel 直接打开）'
    ],
    sampleItems: [
      { title: '核心功能模块交互流程体验', note: '点击右侧按钮可随时编辑、切换状态或导出数据', amount: 25, status: 'done' },
      { title: '自定义扩展专属交互组件与计算逻辑', note: '直接用大白话告诉 AI 即可按需增加任意页面板块', amount: 30, status: 'pending' },
      { title: '阶段性成果复盘与数据归档', note: '支持一键时光机备份代码与数据库', amount: 40, status: 'pending' }
    ]
  }
];

const FALLBACK_ARCHETYPE = {
  id: 'custom_product',
  productKind: 'saas_platform',
  label: '🧩 定制化全栈 Web 产品 / 业务系统（不限品类自由演进）',
  defaultName: '我的定制数字产品',
  nameSuffix: '',
  tableName: 'app_records',
  titleLabel: '核心条目 / 模块名称',
  subLabel: '详细说明、配置参数或备注',
  amountLabel: '指标数值 / 权重',
  statusActiveText: '已就绪 ✅',
  statusPendingText: '进行中 ⏳',
  coreFeatures: [
    '可自由定制任意网页、多模块工作台、AI 应用或小程序界面（绝不限制你的产品形态）',
    '内置真实 SQLite(WAL) 持久化底座与自动无损字段升级（二次改需求加表加列绝不崩库丢数据）',
    '全链路零假货门禁保护（自动拦截空按钮、内存假数据、未安装依赖包与断头 404 接口）',
    '内置代码 + 数据库双轨时光机与一键导出备份能力'
  ],
  sampleItems: [
    { title: '第一阶段（v0.1）核心闭环已跑通', note: '按 F5 刷新网页或重启服务，所有真实数据持久保存不丢失', amount: 100, status: 'done' },
    { title: '直接用大白话让 AI 定制你的专属网站或复杂系统', note: '无论是做品牌官网、像多模块 AI 平台还是小程序，都可分阶段稳步长出来', amount: 95, status: 'pending' }
  ]
};

function deriveCleanAppName(rawFragment, archetype) {
  const cleaned = String(rawFragment || '')
    .replace(/^(我想要?做一?个?|我想搞一?个?|我想弄一?个?|帮我做一?个?|想做一?个?|想搞一?个?|做一?个?|搞一?个?|弄一?个?|开发一?个?|写一?个?|不知道做什么[，,]?)/g, '')
    .replace(/^(可以|能够|用来|帮我|像)+/g, '')
    .replace(/(的东西|的吧|吧|呀|呢|啊)+$/gi, '')
    .trim();
  if (!cleaned || cleaned.length < 2) return archetype.defaultName;
  if (/(官网|网站|主页|独立站|平台|系统|工作台|工具|小程序|助手|引擎|卫士|管家|中心|站|OS)$/i.test(cleaned)) {
    return cleaned.slice(0, 20);
  }
  if (cleaned.length <= 15 && archetype.nameSuffix) return `${cleaned}${archetype.nameSuffix}`;
  return cleaned.slice(0, 18);
}

export function normalizeAudienceMode(rawAudience = 'self', needPasswordFlag = false) {
  const val = String(rawAudience || 'self').trim().toLowerCase();
  if (needPasswordFlag || val === 'b' || val === 'commercial' || val === 'team' || val === 'pro' || val === 'saas') {
    return 'commercial';
  }
  if (val === 'public') return 'public';
  return 'self';
}

export function normalizePlatformMode(rawPlatform = '', rawFragment = '', rawAudience = '') {
  const p = String(rawPlatform || '').trim().toLowerCase();
  const aud = String(rawAudience || '').trim().toLowerCase();
  if (
    p === 'miniprogram' ||
    p === 'mp' ||
    p === 'wechat' ||
    p === 'wx' ||
    p === 'both' ||
    aud === 'c' ||
    aud === 'miniprogram' ||
    /小程序|微信端|weapp/i.test(String(rawFragment || ''))
  ) {
    return 'miniprogram';
  }
  return 'web';
}

export function buildFiveStageRoadmap(appName, productKind, needPassword, includeMiniProgram) {
  return [
    {
      stage: 1,
      version: 'v0.1',
      name: '核心骨架与第一条真闭环',
      status: 'in_progress',
      goal:
        productKind === 'website'
          ? `搭建【${appName}】专属视觉主页板块 + 真实可入库的咨询/留资闭环`
          : `搭建【${appName}】专属主界面骨架 + 第 1 个最核心业务模块 100% 真通落库`
    },
    {
      stage: 2,
      version: 'v0.2',
      name: '多板块/多表业务扩展（无损改表）',
      status: 'planned',
      goal: '按需扩展第 2～3 个真实功能页面或新增数据库表/字段（自动无损迁移老数据，单文件严控 < 500 行）'
    },
    {
      stage: 3,
      version: 'v0.3',
      name: '真实外部能力 / AI 接口与异常兜底',
      status: 'planned',
      goal: '按需接入真实大模型 API / 文件导入导出 / 业务自动化计算，配齐 .env.example 与清晰中文报错提示'
    },
    {
      stage: 4,
      version: 'v0.4',
      name: needPassword ? '多角色账号鉴权与数据安全隔离' : '交互细节打磨与数据备份保护',
      status: 'planned',
      goal: needPassword
        ? '核验 scrypt 密码加盐加密、管理员/成员 401/403 权限边界、敏感字段脱敏与审计日志'
        : '打磨移动端响应式排版、防连点锁、防误删二次确认与双轨时光机还原演练'
    },
    {
      stage: 5,
      version: 'v1.0',
      name: '成熟产品体检与正式交付上线',
      status: 'planned',
      goal: `全量通过 ghost-cto verify & audit（100/100 无假按钮、无断头接口、无密钥泄露）${includeMiniProgram ? '，双端联调就绪' : '，打包部署就绪'}`
    }
  ];
}

export function incubateIdea(rawFragment = '', prefs = {}) {
  const text = String(rawFragment || '').trim();
  const matched = ARCHETYPES.find(a => a.matchRe.test(text)) || FALLBACK_ARCHETYPE;
  const productKind = prefs.kind || matched.productKind || 'saas_platform';
  const appName = prefs.appName?.trim() || deriveCleanAppName(text, matched);

  const normalizedMode = normalizeAudienceMode(prefs.audience, prefs.needPassword);
  const needPassword = normalizedMode === 'commercial';
  const audience = prefs.audience || normalizedMode;
  const device = prefs.device || 'both';
  const platform = normalizePlatformMode(prefs.platform, text, prefs.audience);
  const includeMiniProgram = Boolean(prefs.miniprogram) || platform === 'miniprogram';

  const audienceDesc = needPassword
    ? '多账号协作/商用系统模式（内置 scrypt 加密登录、管理员/成员权限隔离、敏感信息脱敏、审计日志与 Docker 部署配置）'
    : normalizedMode === 'public'
    ? '公开访问网站/收集模式（免登录清爽访问 + 真实落库留资 + 管理导出）'
    : '个人/轻量免登录模式（打开即用 + 真实 SQLite 持久化 + 防误删备份）';

  const platformDesc = includeMiniProgram
    ? '微信小程序原生端 (miniprogram/) + 响应式 Web 双端联动'
    : '电脑宽屏与手机竖屏自适应 Web 应用/网站';

  const commercialFeatures = needPassword
    ? [
        '真实加密账号与角色分权（scrypt 加盐哈希密码、管理员/成员 401/403 权限隔离、手机号脱敏与操作审计日志）',
        '标准商用容器化就绪（自动生成 .env.example 与 Dockerfile）'
      ]
    : [];
  const miniProgramFeatures = includeMiniProgram
    ? ['原生微信小程序端（miniprogram/ 免认证 touristappid 配置，真实 wx.request 联通后台）']
    : [];

  const allCoreFeatures = [...matched.coreFeatures, ...commercialFeatures, ...miniProgramFeatures];
  const stages = buildFiveStageRoadmap(appName, productKind, needPassword, includeMiniProgram);

  const cutList = [
    '严禁一次性硬塞十几个没接通后端的假菜单/假按钮（超过 3 个大模块时，第 1 阶段先做通最核心闭环，其余模块记入 .vibe/roadmap.json 分期真做）',
    '严禁使用内存数组充当假数据库或写空 catch {} 静默吞掉接口报错',
    '严禁单文件堆砌超过 500 行代码（复杂网站或多模块 SaaS 必须按页面/组件/路由拆分为清晰小文件）'
  ];

  const stepPlan = stages.map(s => `第 ${s.stage} 阶段 (${s.version} · ${s.name})：${s.goal}`);

  const clarifyingQuestions = [
    {
      q: '1. 我们准备做的这个产品，更接近下面哪种形态？',
      options: [
        'A. 展示/营销官网或个人轻工具（免登录打开即用）',
        'B. 像成熟 SaaS / 多模块工作台一样的完整系统（带加密账号登录、多角色权限与后台管理）',
        'C. 微信小程序 + 电脑管理后台双端联动'
      ]
    },
    {
      q: '2. 第一阶段（v0.1）我们先跑通最核心的哪条主线？',
      options: ['先按推荐方案把主界面和第一条真实数据闭环跑通，再逐步加后续模块', '我想先指定第一版必须包含的专属页面板块']
    }
  ];

  const blueprintMarkdown = `# 🧭 产品 0→5 架构与分期蓝图（.vibe/blueprint.md）
> 由 GhostCTO（影子 CTO）生成。**不限制任何产品品类**（网站、复杂多模块 AI SaaS、效率工具、小程序均可），强制保障每一阶段真通落库、不崩老功能。

- **产品名称**：${appName}
- **原始构想**：${text || '打造一个真正可用、无假按钮的数字产品'}
- **产品形态**：${matched.label}（\`${productKind}\`）
- **运行与权限模式**：${audienceDesc} ｜ ${platformDesc}

## 一、本产品核心能力规划
${allCoreFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## 二、0 → 5 分期演进路线图（严禁一次性画假壳，按阶段真做！）
${stepPlan.map(s => `- ${s}`).join('\n')}

## 三、数据持久化与无损演进契约
- 涉及业务数据保存时，必须落盘到真实数据库（默认内置 \`${matched.tableName}\` 表及 \`autoMigrateSqliteSchema\` 自动无损加列；多模块 SaaS 可在 \`SCHEMA_SQL\` 中自由新增多张关联表）。
${needPassword ? '- **商用鉴权契约**：必须保留或实现 `/api/auth/login`（`scrypt` 加盐哈希密码）、角色权限校验与敏感操作保护。\n' : ''}
## 四、AI 施工硬门禁（违者 verify / Stop Hook 自动拦截）
${cutList.map(c => `- ⛔ ${c}`).join('\n')}
- ✅ 每次修改前执行 \`save\` 存档 + \`impact\` 查爆炸半径；写完代码必须通过 \`verify\`（0 语法错、0 缺包断链、0 假按钮、0 空 catch）。
`;

  const aiStep1Prompt = [
    `请读取 .vibe/blueprint.md 与 .vibe/roadmap.json。`,
    `我要做的产品是：「${text || appName}」（形态：${matched.label}，${audienceDesc}）。`,
    `请不要局限于死板列表模板，严格根据我的真实产品定位设计专属界面与功能模块：先完成 v0.1 核心闭环（100% 真功能、模块化单文件 < 500 行），完成后运行 verify 自检通过！`
  ].join('\n');

  return {
    appName,
    rawIdea: text,
    productKind,
    archetypeId: matched.id,
    archetypeLabel: matched.label,
    audience,
    normalizedMode,
    audienceDesc,
    device,
    deviceDesc: platformDesc,
    platform,
    includeMiniProgram,
    needPassword,
    tableName: matched.tableName,
    labels: {
      titleLabel: matched.titleLabel,
      subLabel: matched.subLabel,
      amountLabel: matched.amountLabel,
      statusActiveText: matched.statusActiveText,
      statusPendingText: matched.statusPendingText
    },
    coreFeatures: allCoreFeatures,
    cutList,
    stepPlan,
    stages,
    clarifyingQuestions,
    sampleItems: matched.sampleItems,
    blueprintMarkdown,
    aiStep1Prompt
  };
}

export function saveIdeaBlueprint(rootDir, rawFragment = '', prefs = {}) {
  const absRoot = path.resolve(rootDir);
  const bp = incubateIdea(rawFragment, prefs);
  const vibeDir = path.join(absRoot, '.vibe');
  fs.mkdirSync(vibeDir, { recursive: true });
  const mdPath = path.join(vibeDir, 'blueprint.md');
  const jsonPath = path.join(vibeDir, 'blueprint.json');
  const roadmapPath = path.join(vibeDir, 'roadmap.json');
  fs.writeFileSync(mdPath, bp.blueprintMarkdown, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(bp, null, 2), 'utf8');
  fs.writeFileSync(
    roadmapPath,
    JSON.stringify({ appName: bp.appName, productKind: bp.productKind, updatedAt: new Date().toISOString(), stages: bp.stages }, null, 2),
    'utf8'
  );
  return { ...bp, mdPath, jsonPath, roadmapPath };
}
