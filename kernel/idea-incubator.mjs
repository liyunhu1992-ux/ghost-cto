import fs from 'node:fs';
import path from 'node:path';

const ARCHETYPES = [
  {
    id: 'shop_crm',
    label: '🏪 门店会员 / 客户预约 / 次卡管理',
    matchRe: /店|美甲|美容|理发|宠物|健身|瑜伽|客户|会员|次卡|储值|预约|排班|订单|学员|课程|售后/,
    defaultName: '门店客户与预约管家',
    tableName: 'customer_records',
    titleLabel: '客户姓名 / 预约项目',
    subLabel: '联系电话或备注需求',
    amountLabel: '储值余额 / 剩余次数',
    statusActiveText: '已到店完成',
    statusPendingText: '待到店跟进',
    coreFeatures: [
      '客户与预约登记（录入姓名、电话备注、次数/金额，真实存入本地数据库）',
      '一键核销 / 切换跟进状态（点击即永久落库，刷新或重启绝不丢失）',
      '顶部今日数据看板（自动统计总客户数、待跟进数与累计金额/次数）',
      '按姓名或手机号关键词秒搜记录 + 误录一键删除'
    ],
    sampleItems: [
      { title: '林女士 · 法式猫眼美甲预约', note: '138-0013-8801（周六下午3点）', amount: 5, status: 'pending' },
      { title: '陈先生 · 年度储值会员卡', note: '139-2201-6699（偏好安静座位）', amount: 1200, status: 'done' },
      { title: '王小姐 · 首次体验套餐', note: '朋友推荐到店，需提前确认时间', amount: 1, status: 'pending' }
    ]
  },
  {
    id: 'ledger_inventory',
    label: '💰 收支记账 / 进销存库存 / 报价单',
    matchRe: /记账|账本|收支|开销|预算|报销|财务|库存|进销存|货品|商品|仓库|采购|报价|发票|欠款/,
    defaultName: '极简收支与库存管家',
    tableName: 'ledger_entries',
    titleLabel: '账目 / 货品名称',
    subLabel: '分类或经手备注',
    amountLabel: '金额（元）或库存数量',
    statusActiveText: '已结清 / 已入库',
    statusPendingText: '待核对 / 预警中',
    coreFeatures: [
      '极速记一笔（录入名称、备注分类、金额或数量，秒存真实 SQLite 数据库）',
      '自动汇总卡片（实时计算总笔数、待核对笔数与金额/库存总计）',
      '状态一键切换（区分已结清/待核对，重启电脑数据依然稳稳保留）',
      '关键词实时筛选查账 + 历史明细管理'
    ],
    sampleItems: [
      { title: '4月门店首批物料采购', note: '供应商顺丰直发 · 已开发票', amount: 2680, status: 'done' },
      { title: '春季礼盒装库存盘点', note: 'A区货架剩余库存，低于20件需补货', amount: 36, status: 'pending' },
      { title: '老客户团购定金收入', note: '微信转账已收讫，月底尾款结算', amount: 1500, status: 'done' }
    ]
  },
  {
    id: 'study_habit',
    label: '📚 学习打卡 / 背单词 / 待办笔记',
    matchRe: /单词|英语|学习|背诵|考试|刷题|错题|打卡|习惯|减肥|健身记录|阅读|读书|待办|计划|日记|笔记|备忘/,
    defaultName: '每日目标与学习打卡站',
    tableName: 'study_tasks',
    titleLabel: '今日打卡目标 / 知识点',
    subLabel: '记忆口诀或复盘心得',
    amountLabel: '专注分钟数 / 掌握度分值',
    statusActiveText: '今日已打卡 ✅',
    statusPendingText: '待攻克 📌',
    coreFeatures: [
      '随时添加学习卡片 / 待办目标（含重点笔记与投入时长，永久存库）',
      '一键点亮打卡完成状态（满满成就感，数据真落库绝不刷新清零）',
      '顶部学习进度总览（自动统计累计积累条数、今日已完成与累计专注时长）',
      '错题 / 笔记关键词秒搜复习'
    ],
    sampleItems: [
      { title: 'Resilience（韧性 / 抗压恢复力）', note: '例句：Build resilience in tough times', amount: 25, status: 'done' },
      { title: '每天晨间拉伸 + 阅读 30 分钟', note: '起床不刷短视频，先喝温水翻书', amount: 30, status: 'pending' },
      { title: '整理本周工作复盘 3 条收获', note: '周日晚上9点前完成归档', amount: 40, status: 'pending' }
    ]
  },
  {
    id: 'ai_tool',
    label: '✨ 自媒体选题 / 文案库 / 效率工具箱',
    matchRe: /小红书|抖音|公众号|视频号|自媒体|选题|爆款|文案|脚本|提示词|prompt|ai|生成|翻译|总结|周报/,
    defaultName: '灵感选题与爆款文案工作台',
    tableName: 'creative_items',
    titleLabel: '爆款标题 / 灵感主题',
    subLabel: '核心金句、钩子或脚本大纲',
    amountLabel: '预期潜力分（1-100）',
    statusActiveText: '已发布上线 🚀',
    statusPendingText: '打磨草稿中 ✍️',
    coreFeatures: [
      '随时捕捉爆款选题与金句大纲（秒存本地数据库，灵感再也不散落各处）',
      '选题潜力打分与「草稿 / 已发布」状态流转管理',
      '创作资产看板（实时统计灵感库总数、已发布篇数与平均潜力值）',
      '按关键词秒搜历史选题与文案素材'
    ],
    sampleItems: [
      { title: '0基础小白第一次用 AI 做小工具避坑实录', note: '开头先晒前后对比图，痛点直击刷新丢数据', amount: 95, status: 'done' },
      { title: '实体小店如何用免费工具管好 300 个老客', note: '真实案例拆解，结尾附模板领取', amount: 88, status: 'pending' },
      { title: '打工人每天省下 1 小时的桌面整理术', note: '周三晚8点黄金档发布，配3张清爽实拍图', amount: 82, status: 'pending' }
    ]
  },
  {
    id: 'portal_form',
    label: '🌐 个人作品主页 / 活动报名 / 留言收集',
    matchRe: /官网|主页|作品集|简历|展示|报名|收集|表单|问卷|反馈|留言|投票|活动|社群/,
    defaultName: '清爽作品展示与报名收集站',
    tableName: 'submissions',
    titleLabel: '访客称呼 / 作品或报名项',
    subLabel: '联系方式或具体留言内容',
    amountLabel: '意向人数 / 优先级分',
    statusActiveText: '已联系确认',
    statusPendingText: '新收到待回复',
    coreFeatures: [
      '高颜值展示与在线登记表单（提交后真实写入本地 SQLite 数据库）',
      '后台处理状态一键标记（区分「新收到待回复」与「已联系确认」）',
      '报名/留言实时统计汇总栏',
      '关键词快速检索访客留言记录'
    ],
    sampleItems: [
      { title: '张同学 · 报名周六线下沙龙', note: '微信号 zhang_design，想交流 AI 提效实战', amount: 2, status: 'pending' },
      { title: '李总 · 咨询定制品牌视觉方案', note: '预算明确，希望下周二上午电话沟通', amount: 90, status: 'done' },
      { title: '赵女士 · 产品体验建议反馈', note: '非常喜欢清爽配色，希望能支持导出表格', amount: 80, status: 'pending' }
    ]
  }
];

const FALLBACK_ARCHETYPE = {
  id: 'general_custom',
  label: '🧩 实用全栈网页小工具（自带真实数据库）',
  defaultName: '我的第一个全栈小工具',
  tableName: 'app_records',
  titleLabel: '项目 / 事项名称',
  subLabel: '详细说明或备注信息',
  amountLabel: '数值 / 数量 / 评分',
  statusActiveText: '已完成 ✅',
  statusPendingText: '进行中 ⏳',
  coreFeatures: [
    '新增与保存记录（真实存入本地 SQLite 数据库，刷新网页或重启电脑绝不丢失）',
    '状态一键切换与删除管理（每个按钮都真实打通后端接口）',
    '顶部核心数据实时汇总看板',
    '按关键词即时搜索过滤记录'
  ],
  sampleItems: [
    { title: '我的第一条真实数据库记录', note: '按 F5 刷新网页试试，我绝对不会消失！', amount: 100, status: 'done' },
    { title: '想改任何功能直接跟 AI 说大白话', note: '影子 CTO 已经在后台替你守住防崩护栏', amount: 95, status: 'pending' },
    { title: '随时可添加你自己的专属字段与页面', note: '代码+数据库已开启双轨后悔药保护', amount: 90, status: 'pending' }
  ]
};

function deriveCleanAppName(rawFragment, archetype) {
  const cleaned = String(rawFragment || '')
    .replace(/^(我想要?做一?个?|我想搞一?个?|我想弄一?个?|帮我做一?个?|想做一?个?|想搞一?个?|做一?个?|搞一?个?|弄一?个?|开发一?个?|写一?个?|不知道做什么[，,]?)/g, '')
    .replace(/^(可以|能够|用来|帮我)+/g, '')
    .replace(/(的东西|的工具|的软件|的系统|的网站|的网页|的小程序|的app|的|吧|呀|呢|啊)+$/gi, '')
    .trim();
  if (!cleaned || cleaned.length < 2) return archetype.defaultName;
  if (cleaned.length <= 14) return `${cleaned}小助手`;
  return `${cleaned.slice(0, 12)}工作台`;
}

/**
 * Turn even a messy 3-word beginner fragment into a crystal-clear, zero-jargon product blueprint
 * + SQLite schema + step-by-step zero-error build plan at 0 LLM tokens.
 */
export function incubateIdea(rawFragment = '', prefs = {}) {
  const text = String(rawFragment || '').trim();
  const matched = ARCHETYPES.find(a => a.matchRe.test(text)) || FALLBACK_ARCHETYPE;
  const appName = prefs.appName?.trim() || deriveCleanAppName(text, matched);

  const audience = prefs.audience || 'self'; // 'self' | 'team' | 'public'
  const device = prefs.device || 'both'; // 'both' | 'mobile' | 'desktop'
  const needPassword = Boolean(prefs.needPassword || audience === 'team');

  const audienceDesc =
    audience === 'team'
      ? '店员/团队内部使用（开启管理员口令保护）'
      : audience === 'public'
      ? '发给客户或朋友访问体验（界面清爽零门槛）'
      : '我自己日常使用（免复杂登录，双击打开即用）';

  const deviceDesc =
    device === 'mobile'
      ? '优先适配手机竖屏点按体验'
      : device === 'desktop'
      ? '优先适配电脑宽屏高效操作'
      : '电脑网页与手机竖屏自动自适应';

  const cutList = [
    '第一版坚决先不接复杂的第三方微信支付/支付宝商户接口（最容易卡资质报错，先跑通核心记账/记录闭环）',
    '第一版坚决先不接收费短信验证码网关（本地免配置直接可用，需要保护时用简洁管理员口令）',
    '第一版坚决不用需要翻墙或装几十个依赖包的重型框架（采用 0 外部依赖原生全栈底座，断网也能秒开不报错）'
  ];

  const stepPlan = [
    '第 1 步（已完成 100% 防崩底座）：铺设零出错 Node.js + SQLite 真实数据库全栈骨架、防白屏报错捕获护盾与首批仿真数据。',
    `第 2 步（按你的想法微调界面与字段）：围绕「${text || appName}」把表单文字、分类标签或专属卡片改成你最顺手的样子（每次只改 1 个小点，改前自动存档）。`,
    '第 3 步（锦上添花加实用小功能）：核心增删改查稳稳跑通后，再按需增加「一键导出 Excel/CSV 表格」或「数据统计小图表」。'
  ];

  const clarifyingQuestions = [
    {
      q: '1. 这个小工具平时主要是谁打开用？',
      options: ['就我自己电脑上用（免登录最省心）', '店里员工/小团队一起用（加个管理口令）', '给客户看或填信息']
    },
    {
      q: '2. 你最核心想存住哪几项信息？',
      options: [
        `用默认推荐就很好（${matched.titleLabel} + ${matched.subLabel} + ${matched.amountLabel}）`,
        '我想自己改几个字段名字'
      ]
    },
    {
      q: '3. 界面操作习惯偏向哪种？',
      options: ['一页看全所有数据和新增按钮（最不容易迷路）', '分成前台展示页和后台管理页']
    }
  ];

  const blueprintMarkdown = `# 🌱 小白 Vibe Coding 产品施工蓝图（.vibe/blueprint.md）
> 由 GhostCTO（影子 CTO）零碎想法孵化器自动生成，供所有 AI 编程软件（豆包 / Trae / WorkBuddy / Antigravity / Cursor / Claude Code）严格遵守执行。

- **作品名称**：${appName}
- **原始零碎想法**：${text || '想做一个清爽实用、能真实保存数据的个人小工具'}
- **识别赛道模板**：${matched.label}
- **使用人群与设备**：${audienceDesc} ｜ ${deviceDesc}
- **后台口令保护**：${needPassword ? '已要求开启口令保护' : '个人轻享免登录'}

## 一、第一版必须 100% 跑通的 4 个核心功能
${matched.coreFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## 二、真实 SQLite 数据库表设计（严禁写内存假数组！）
- **表名**：\`${matched.tableName}\`
- **核心字段**：
  - \`id\`：自增主键
  - \`title\`：${matched.titleLabel}（必填文本）
  - \`note\`：${matched.subLabel}（选填文本）
  - \`amount\`：${matched.amountLabel}（数字，默认 0）
  - \`status\`：状态（\`pending\` = ${matched.statusPendingText}，\`done\` = ${matched.statusActiveText}）
  - \`created_at\`：创建时间

## 三、第一版防翻车「坚决先不做清单」（防止 AI 过度设计写崩代码）
${cutList.map(c => `- ⛔ ${c}`).join('\n')}

## 四、AI 零出错施工铁律
1. 必须在现有零出错底座（\`src/db.mjs\`、\`src/server.mjs\`、\`public/index.html\`）上平滑演进，严禁引入未安装的外部 npm 包导致启动崩溃。
2. 每次修改代码后，必须运行 \`node .vibe/engine/bin/ghost-cto.mjs verify\`，确认 JS 语法、HTML 脚本语法与前后端接口对账 **0 报错** 后才能向用户汇报完成！
`;

  const aiStep1Prompt = [
    `我已经用影子 CTO 生成了产品蓝图（请先读取项目里的 .vibe/blueprint.md）。`,
    `我的想法是：「${text || appName}」（${audienceDesc}，${deviceDesc}）。`,
    `请你严格遵守以下零出错要求帮我定制升级当前项目：`,
    `1. 如果我的想法还有 1～2 个小细节需要确认，请用大白话每次只问我 1 个选择题（严禁问技术名词）；如果已经够清楚，直接在现有零出错底座（src/db.mjs, src/server.mjs, public/index.html）上帮我定制好专属界面与字段！`,
    `2. 严禁引入需要额外 npm install 的重型外部包，所有数据必须真实读写 SQLite 表 ${matched.tableName}。`,
    `3. 改完后你必须自己执行 \`node .vibe/engine/bin/ghost-cto.mjs verify\` 做语法和真假全检，确保 0 语法错误、0 假按钮后再告诉我双击《双击启动项目》体验！`
  ].join('\n');

  return {
    appName,
    rawIdea: text,
    archetypeId: matched.id,
    archetypeLabel: matched.label,
    audience,
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
    coreFeatures: matched.coreFeatures,
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
