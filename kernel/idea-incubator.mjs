import fs from 'node:fs';
import path from 'node:path';

const ARCHETYPES = [
  {
    id: 'shop_crm',
    label: '🏪 门店会员 / 客户预约 / 次卡储值管理',
    matchRe: /店|美甲|美容|理发|宠物|健身|瑜伽|客户|会员|次卡|储值|预约|排班|订单|学员|课程|售后/,
    defaultName: '门店客户与预约管家',
    tableName: 'customer_records',
    titleLabel: '客户姓名 / 预约项目',
    subLabel: '联系电话或到店备注',
    amountLabel: '储值余额 / 剩余次数',
    statusActiveText: '已到店完成',
    statusPendingText: '待到店跟进',
    coreFeatures: [
      '客户与预约登记 + 随时编辑修改（姓名、电话备注、次数/余额真实存入 SQLite 本地数据库）',
      '一键核销切换状态 + 防误删二次确认（防手滑误删客户余额，刷新或重启电脑绝不丢数据）',
      '顶部核心经营汇总看板 + 状态分组（全部 / 待跟进 / 已完成）+ 关键词秒搜',
      '一键导出 Excel 兼容表格（UTF-8 BOM 格式 .csv，中文零乱码）'
    ],
    sampleItems: [
      { title: '林女士 · 法式猫眼美甲预约', note: '13800138801（周六下午3点到店）', amount: 5, status: 'pending' },
      { title: '陈先生 · 年度储值会员卡', note: '13922016699（偏好安静靠窗位）', amount: 1200, status: 'done' },
      { title: '王小姐 · 首次体验护理套餐', note: '13766889900（朋友推荐，提前电话确认）', amount: 1, status: 'pending' }
    ]
  },
  {
    id: 'ledger_inventory',
    label: '💰 收支记账 / 进销存库存 / 报价台账',
    matchRe: /记账|账本|收支|开销|预算|报销|财务|库存|进销存|货品|商品|仓库|采购|报价|发票|欠款/,
    defaultName: '极简收支与库存管家',
    tableName: 'ledger_entries',
    titleLabel: '账目 / 货品名称',
    subLabel: '分类、供应商或经手人电话',
    amountLabel: '金额（元）或库存数量',
    statusActiveText: '已结清 / 已入库',
    statusPendingText: '待核对 / 预警中',
    coreFeatures: [
      '极速记一笔 + 随时编辑修正（名称、备注、金额/数量秒存真实 SQLite 数据库，自带防连击锁）',
      '自动汇总看板（实时统计总笔数、已结清笔数与累计金额/库存总计）',
      '按状态分组筛选 + 关键词实时查账 + 防误删二次确认',
      '一键导出财务/库存 Excel 表格（.csv 零乱码直开）'
    ],
    sampleItems: [
      { title: '门店首批耗材物料采购', note: '供应商李经理 13811223344 · 已开专票', amount: 2680, status: 'done' },
      { title: '春季礼盒装库存盘点', note: 'A区货架余量，低于20件需补货', amount: 36, status: 'pending' },
      { title: '老客户团购定金收入', note: '对公转账已收讫，月底结算尾款', amount: 1500, status: 'done' }
    ]
  },
  {
    id: 'study_habit',
    label: '📚 学习打卡 / 背单词 / 目标待办笔记',
    matchRe: /单词|英语|学习|背诵|考试|刷题|错题|打卡|习惯|减肥|健身记录|阅读|读书|待办|计划|日记|笔记|备忘/,
    defaultName: '每日目标与学习打卡站',
    tableName: 'study_tasks',
    titleLabel: '打卡目标 / 核心知识点',
    subLabel: '记忆口诀或复盘心得',
    amountLabel: '专注分钟数 / 掌握分值',
    statusActiveText: '已完成打卡 ✅',
    statusPendingText: '待攻克 📌',
    coreFeatures: [
      '随时添加与编辑学习卡片 / 待办目标（真实落库永久保存，防重复连击）',
      '一键切换打卡状态 + 顶部累计成长进度看板',
      '按「待攻克 / 已打卡」分组专注复习 + 关键词秒搜错题',
      '一键导出完整学习复盘表格（Excel 直接打开备份）'
    ],
    sampleItems: [
      { title: 'Resilience（韧性 / 抗压恢复力）', note: '例句：Build resilience in tough times', amount: 25, status: 'done' },
      { title: '每天晨间拉伸 + 深度阅读 30 分钟', note: '起床先喝温水翻书，不刷短视频', amount: 30, status: 'pending' },
      { title: '整理本周工作复盘 3 条关键收获', note: '周日晚上9点前归档', amount: 40, status: 'pending' }
    ]
  },
  {
    id: 'ai_tool',
    label: '✨ 自媒体选题 / 爆款文案库 / 效率工作台',
    matchRe: /小红书|抖音|公众号|视频号|自媒体|选题|爆款|文案|脚本|提示词|prompt|ai|生成|翻译|总结|周报/,
    defaultName: '灵感选题与爆款文案工作台',
    tableName: 'creative_items',
    titleLabel: '爆款标题 / 灵感主题',
    subLabel: '黄金前3秒钩子或脚本大纲',
    amountLabel: '预期潜力分（1-100）',
    statusActiveText: '已发布上线 🚀',
    statusPendingText: '打磨草稿中 ✍️',
    coreFeatures: [
      '随时捕捉与二次编辑爆款选题、钩子金句（真实存入本地 SQLite 数据库）',
      '选题潜力打分与「草稿中 / 已发布」状态一键流转',
      '创作资产统计看板 + 关键词秒搜历史素材 + 防误删保护',
      '一键导出选题排期表（.csv 团队共享零乱码）'
    ],
    sampleItems: [
      { title: '零基础第一次用 AI 做小工具避坑实录', note: '开头晒真落库效果，痛点直击刷新丢数据', amount: 95, status: 'done' },
      { title: '实体小店如何用轻工具管好 300 个老客', note: '真实案例拆解，结尾附实操步骤', amount: 88, status: 'pending' },
      { title: '每天省下 1 小时的工作流整理术', note: '周三晚8点发布，配清爽实拍图', amount: 82, status: 'pending' }
    ]
  },
  {
    id: 'portal_form',
    label: '🌐 作品展示主页 / 活动报名 / 线索收集站',
    matchRe: /官网|主页|作品集|简历|展示|报名|收集|表单|问卷|反馈|留言|投票|活动|社群/,
    defaultName: '清爽展示与报名线索管理站',
    tableName: 'submissions',
    titleLabel: '访客称呼 / 报名事项',
    subLabel: '手机号/微信号或具体留言',
    amountLabel: '意向人数 / 优先级分',
    statusActiveText: '已联系确认',
    statusPendingText: '新收到待跟进',
    coreFeatures: [
      '清爽在线登记与修改（提交即写入 SQLite 真库，防连击重复提交）',
      '跟进状态一键标记（区分「新收到待跟进」与「已联系确认」）',
      '报名线索实时统计汇总 + 关键词检索 + 防误删二次确认',
      '一键导出全部报名线索 Excel 表'
    ],
    sampleItems: [
      { title: '张同学 · 报名周六线下交流沙龙', note: '13688990011，想交流 AI 提效实战', amount: 2, status: 'pending' },
      { title: '李总 · 咨询定制品牌视觉方案', note: '13900112233，希望周二上午电话沟通', amount: 90, status: 'done' },
      { title: '赵女士 · 产品体验建议反馈', note: '喜欢清爽无广告界面，希望能导出表格', amount: 80, status: 'pending' }
    ]
  }
];

const FALLBACK_ARCHETYPE = {
  id: 'general_custom',
  label: '🧩 实用全栈管理工作台（自带真实 SQLite 数据库）',
  defaultName: '我的全栈业务小管家',
  tableName: 'app_records',
  titleLabel: '项目 / 事项名称',
  subLabel: '详细说明、备注或联系电话',
  amountLabel: '数值 / 金额 / 数量',
  statusActiveText: '已完成 ✅',
  statusPendingText: '进行中 ⏳',
  coreFeatures: [
    '新增与随时编辑修改记录（真实写入本地 SQLite 数据库，刷新或重启绝不丢失，自带防连击锁）',
    '状态切换 + 防误删二次确认（防止手滑误删重要记录）',
    '顶部核心数据实时看板 + 状态分组筛选 + 关键词秒搜',
    '一键导出 Excel 兼容表格（UTF-8 BOM .csv）'
  ],
  sampleItems: [
    { title: '第一条真实 SQLite 数据库记录', note: '按 F5 刷新网页或重启服务，这条记录绝对不会丢！', amount: 100, status: 'done' },
    { title: '点右侧「编辑」可随时修改内容', note: '点「删除」有防手滑二次确认，点「导出表格」直出 Excel', amount: 95, status: 'pending' },
    { title: '想改字段或加新功能直接跟 AI 说大白话', note: '影子 CTO 会在后台自动先存档、锁范围、验语法', amount: 90, status: 'pending' }
  ]
};

function deriveCleanAppName(rawFragment, archetype) {
  const cleaned = String(rawFragment || '')
    .replace(/^(我想要?做一?个?|我想搞一?个?|我想弄一?个?|帮我做一?个?|想做一?个?|想搞一?个?|做一?个?|搞一?个?|弄一?个?|开发一?个?|写一?个?|不知道做什么[，,]?)/g, '')
    .replace(/^(可以|能够|用来|帮我)+/g, '')
    .replace(/(的东西|的工具|的软件|的系统|的网站|的网页|的小程序|的app|的|吧|呀|呢|啊)+$/gi, '')
    .trim();
  if (!cleaned || cleaned.length < 2) return archetype.defaultName;
  if (cleaned.length <= 14) return `${cleaned}管家`;
  return `${cleaned.slice(0, 12)}工作台`;
}

export function normalizeAudienceMode(rawAudience = 'self', needPasswordFlag = false) {
  const val = String(rawAudience || 'self').trim().toLowerCase();
  if (needPasswordFlag || val === 'b' || val === 'commercial' || val === 'team' || val === 'pro' || val === 'saas') {
    return 'commercial';
  }
  if (val === 'public') return 'public';
  return 'self';
}

/**
 * Turn even a messy 3-word beginner fragment into a crystal-clear, zero-jargon 0-to-5 product blueprint
 * + SQLite schema + pro-dev-team standard checklist at 0 LLM tokens.
 */
export function incubateIdea(rawFragment = '', prefs = {}) {
  const text = String(rawFragment || '').trim();
  const matched = ARCHETYPES.find(a => a.matchRe.test(text)) || FALLBACK_ARCHETYPE;
  const appName = prefs.appName?.trim() || deriveCleanAppName(text, matched);

  const normalizedMode = normalizeAudienceMode(prefs.audience, prefs.needPassword);
  const needPassword = normalizedMode === 'commercial';
  const audience = prefs.audience || normalizedMode;
  const device = prefs.device || 'both';

  const audienceDesc = needPassword
    ? '方案 B · 商用/多账号协作版（内置 scrypt 加密登录、店长管理员/员工权限隔离、手机号脱敏、操作审计日志与 Docker 部署包）'
    : normalizedMode === 'public'
    ? '公开访问收集版（清爽零门槛提交 + 本地真落库 + Excel 导出）'
    : '方案 A · 个人电脑日常版（免登录双击即用 + 真落库 + 防误删 + Excel 导出）';

  const deviceDesc =
    device === 'mobile'
      ? '优先适配手机竖屏点按体验'
      : device === 'desktop'
      ? '优先适配电脑宽屏高效操作'
      : '电脑宽屏与手机竖屏自动响应式适配';

  const commercialFeatures = needPassword
    ? [
        '真实加密账号体系（node:crypto scrypt 加盐哈希存储密码，HttpOnly 会话登录与改密，严禁明文存密码）',
        '角色权限隔离（管理员可管理员工子账号、删除数据与查看完整手机号；普通员工仅可日常录入核销，手机号自动脱敏为 138****8801）',
        '关键操作留痕审计日志（自动记录谁在什么时间新增、修改、删除了哪条业务数据）',
        '标准上线部署就绪（自动配备 .env.example 环境变量模板与 Dockerfile 容器配置）'
      ]
    : [];

  const allCoreFeatures = [...matched.coreFeatures, ...commercialFeatures];

  const cutList = [
    '第一版先不接需要营业执照与商户证书的真实微信支付/支付宝收款接口（先把业务台账与核心闭环 100% 跑稳，绝不画假支付按钮糊弄人）',
    '第一版先不接按条计费的第三方短信验证码网关（本地/商用账号版直接采用高安全加密账号口令登录，零外部配置立即可用）',
    '第一版严禁一次性堆砌十几个空壳菜单或引入未安装的第三方重型包（坚持 0 外部依赖原生全栈底座，断网也能秒开零报错）'
  ];

  const stepPlan = [
    '第 0 步（需求收敛与定性）：砍掉容易烂尾的伪需求，明确「方案 A 自用免登录」或「方案 B 商用带账号权限」。',
    `第 1 步（100 分专业底座已自动生成）：真实 SQLite(WAL) 落库、防连击、防误删、在线编辑、Excel 导出${needPassword ? '、scrypt 加密登录与管理员/员工权限隔离' : ''}已一次配齐。`,
    `第 2 步（按你的业务微调专属字段）：围绕「${text || appName}」小步调整字段名称、分类选项或页面配色（每次改动自动存档 + 锁定 <=3 个文件）。`,
    '第 3 步（补齐个性化业务规则）：按需增加专属统计卡片、打印排版或业务校验逻辑，严禁出现空按钮或假提示。',
    '第 4 步（异常与后悔药演练）：任何改乱或报错随时一键秒退回上一版代码+数据库，绝不推倒重开新文件夹。',
    `第 5 步（验收交付）：跑通 ghost-cto verify 与 audit（0 语法错、0 假按钮、0 裸奔接口、0 密钥泄露）后正式投入日常或商用部署。`
  ];

  const clarifyingQuestions = [
    {
      q: '1. 这个作品平时主要是怎么用？（回复 A 或 B 即可）',
      options: [
        'A. 我自己电脑上日常用（免登录最省心，打开就能记账管理）',
        'B. 店员团队协作或发给客户用的商用版（带加密账号登录、管理员/员工权限与操作日志）'
      ]
    },
    {
      q: '2. 第一版默认存这几项核心信息够用吗？',
      options: [
        `够用，先跑起来看效果（${matched.titleLabel} + ${matched.subLabel} + ${matched.amountLabel}）`,
        '我想顺便改几个专属字段名'
      ]
    }
  ];

  const authSchemaSection = needPassword
    ? `\n### 商用权限与审计表（已内置真实加密鉴权）
- \`users\`：\`id\`, \`username\`(唯一), \`display_name\`, \`role\`(\`admin\` 店长管理员 | \`staff\` 普通员工), \`password_hash\`(\`scrypt\` 加盐哈希), \`active\`, \`created_at\`
- \`sessions\`：\`token\`(主键), \`user_id\`, \`expires_at\`, \`created_at\`
- \`audit_logs\`：\`id\`, \`actor\`, \`action\`, \`detail\`, \`created_at\`\n`
    : '';

  const blueprintMarkdown = `# 🌱 产品 0→5 施工蓝图（.vibe/blueprint.md）
> 由 GhostCTO（影子 CTO）自动生成，供豆包 / Trae / WorkBuddy / CodeBuddy / Antigravity / Cursor / Claude Code 严格遵守。

- **作品名称**：${appName}
- **原始想法**：${text || '做一个清爽稳定、能真实保存数据的业务管理工具'}
- **赛道模型**：${matched.label}
- **工程模式**：${audienceDesc} ｜ ${deviceDesc}
- **账号权限要求**：${needPassword ? '必须开启 scrypt 加密登录与 /api/admin/* 管理员鉴权（严禁明文密码与裸奔后台）' : '个人本地免登录模式'}

## 一、第一版已配齐的专业团队级功能清单
${allCoreFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## 二、真实 SQLite 数据库表契约（严禁改用内存假数组！）
### 核心业务表：\`${matched.tableName}\`
- \`id\`：自增主键
- \`title\`：${matched.titleLabel}（必填文本）
- \`note\`：${matched.subLabel}（选填文本${needPassword ? '，员工视角自动对手机号脱敏' : ''}）
- \`amount\`：${matched.amountLabel}（数值，默认 0）
- \`status\`：状态（\`pending\` = ${matched.statusPendingText}，\`done\` = ${matched.statusActiveText}）
- \`updated_at\` / \`created_at\`：更新时间与创建时间
${authSchemaSection}
## 三、防烂尾「第一版暂缓清单」（防止贪多写出一堆假按钮）
${cutList.map(c => `- ⛔ ${c}`).join('\n')}

## 四、从 0 到 5 渐进式交付路线
${stepPlan.map(s => `- ${s}`).join('\n')}

## 五、AI 施工硬门禁（违者 verify 直接拦截）
1. 在现有模块化文件（\`src/db.mjs\`${needPassword ? ', `src/auth.mjs`' : ''}, \`src/server.mjs\`, \`public/index.html\`, \`public/app.js\`, \`public/styles.css\`）上平滑演进；单文件严禁超过 500 行，严禁引入未安装的外部 npm 包。
2. 必须保留专业细节：提交按钮防连击锁、删除二次确认、空状态提示、UTF-8 BOM Excel 导出${needPassword ? '、管理员与员工权限边界' : ''}。
3. 每次改完代码后，必须执行 \`node .vibe/engine/bin/ghost-cto.mjs verify\`，确认 **GHOST_VERIFY_PASS** 后才能交差！
`;

  const aiStep1Prompt = [
    `请先读取项目里的 .vibe/blueprint.md 施工蓝图。`,
    `我的需求是：「${text || appName}」（${audienceDesc}）。`,
    `请严格在现有零出错 SQLite 模块化底座上定制界面与字段，每次修改前先运行存档与影响分析，改完必须运行 \`node .vibe/engine/bin/ghost-cto.mjs verify\` 通过后再让我刷新网页验收。`
  ].join('\n');

  return {
    appName,
    rawIdea: text,
    archetypeId: matched.id,
    archetypeLabel: matched.label,
    audience,
    normalizedMode,
    audienceDesc,
    device,
    deviceDesc,
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
  fs.writeFileSync(mdPath, bp.blueprintMarkdown, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(bp, null, 2), 'utf8');
  return { ...bp, mdPath, jsonPath };
}
