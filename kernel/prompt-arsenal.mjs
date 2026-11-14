import fs from 'node:fs';
import path from 'node:path';
import { detectRuntimeTopology } from './memory-capsule.mjs';

/**
 * Context-Aware Master Prompt Arsenal (`实战防崩指令库`)
 *
 * Distills the highest-signal Vibe Coding prompts & skills from:
 * - 数字生命卡兹克 (`KKKKhazix/khazix-skills`): 苏格拉底单问澄清法、顶尖专家选角法、`leader` 任务书收敛、`neat-freak` 防脑腐三层同步、去 AI 机器味四检法
 * - Andrej Karpathy (`CLAUDE.md` 4 Laws): 假设显式化、最少代码第一性原理、过度复杂主动劝阻、外科手术级改动边界
 * - Global Elite Design Engineering: Linear/Stripe Anti-AI-Slop UI Discipline & Dead-Loop Bug Breaker
 *
 * Crucially, instead of generic blank templates, every prompt is dynamically injected at 0 LLM tokens
 * with the user's REAL project topology (existing DB tables, ports, static build commands, and health score).
 */
export function buildMasterPromptArsenal(workspace, audit, customTopic = '') {
  const runtime = detectRuntimeTopology(workspace);
  const tables = audit.lineage.schemaTables;
  const tablesSummary =
    tables.length > 0
      ? `现有真实数据表(${tables.length}张)：${tables.slice(0, 10).join(', ')}${tables.length > 10 ? ' 等' : ''}`
      : '当前尚未检测到持久数据库表（严禁再用内存数组充当假数据库，若涉及数据保存必须落盘到真实 SQLite/数据库）';

  const portsSummary =
    runtime.ports.length > 0 ? `本地运行端口：${runtime.ports.map(p => `:${p}`).join(' / ')}` : '本地运行端口：按项目默认配置';

  const buildCmds = workspace.staleBuilds
    .map(sb => sb.buildCmd || (sb.appDir === '.' ? 'npm run build' : `npm --prefix ${sb.appDir} run build`))
    .filter(Boolean);

  // Also detect any build scripts in package.json or build-ui.mjs even when not currently stale
  const extraBuildHints = [];
  if (fs.existsSync(path.join(workspace.rootDir, 'build-ui.mjs'))) {
    extraBuildHints.push('node build-ui.mjs');
  }
  if (fs.existsSync(path.join(workspace.rootDir, 'apps/admin/package.json'))) {
    extraBuildHints.push('npm --prefix apps/admin run build');
  }
  if (fs.existsSync(path.join(workspace.rootDir, 'apps/web/package.json'))) {
    extraBuildHints.push('npm --prefix apps/web run build');
  }
  const mergedBuildList = [
    ...new Set([...buildCmds, ...extraBuildHints].map(cmd => cmd.replace(/"/g, '').trim()))
  ];
  const buildGuardLine =
    mergedBuildList.length > 0
      ? `前端静态构建护栏：若改动了前端源码，结束前必须自动执行 \`${mergedBuildList.join(' && ')}\` 刷新静态包，确保刷新浏览器立即可见。`
      : '前端静态构建护栏：若存在预构建目录（dist/public），改动源码后必须同步重新打包。';

  const topicText = customTopic.trim() || '【在这里用一句大白话写下你想做的事，例如：加一个客户会员储值与消费明细功能】';

  const projectContextBlock = [
    `【当前项目真实家底（GhostCTO 自动注入，严禁违背）】`,
    `- 项目名称：${runtime.projectName}（当前健康分：${audit.score}/100，P0致命隐患：${audit.p0Count}个）`,
    `- ${tablesSummary}`,
    `- ${portsSummary} ｜ 启动命令：\`${runtime.startCmd}\``,
    `- ${buildGuardLine}`
  ].join('\n');

  return [
    {
      id: 'khazix-socratic-mvp',
      category: 'khazix',
      badge: '🔥 卡兹克强推 · 想新功能必用',
      title: '苏格拉底式「单问澄清」立项令',
      inspiration: '融合 数字生命卡兹克「苏格拉底追问法」+ GhostCTO 零黑话铁律',
      whenToUse: '当你脑子里只有一个模糊念头（比如“我想加个分销/积分功能”），怕 AI 瞎猜乱写一通代码时用。',
      whyItWorks: '强迫 AI 先管住写代码的手，每次只问你 1 个最关键的生意规则问题，最多问 4 轮就把需求收得严丝合缝。',
      prompt: `你现在是我的联合创始人兼首席产品架构师。我是一名不懂编程技术的业务创始人，我想在当前项目里做这件事：
「${topicText}」

${projectContextBlock}

请严格按【苏格拉底式单问澄清法】帮我把想法落地，严禁一上来就直接改代码：
1. **先管住手**：在我明确说“确认开工”之前，禁止修改任何代码文件。
2. **每次只问 1 个大白话生意问题**：不要一次性甩给我十几个问题，更不准问我任何技术名词（禁止问框架/数据库/端口/鉴权方案，技术细节全部由你复用现有架构拍板）。每次只针对业务边界、谁能用、钱或数据怎么算，问我 **1 个最关键的选择题**（给好推荐选项）。
3. **最多不超过 4 问**：问清楚后，给我输出一份百字以内的《极简施工确认单》，包含：
   - 准备做成什么样（大白话效果）
   - **第一版坚决先不做什么**（防止过度复杂把老功能改崩）
   - 涉及哪张真实数据表、老数据如何保证不丢
等我回复“开工”后，你再先做时光机存档、锁定爆炸半径并真正写代码落库。`
    },
    {
      id: 'karpathy-surgical-code',
      category: 'engineering',
      badge: '🌍 Karpathy 极简原则 · 日常改代码必用',
      title: 'Karpathy 极简外科手术防崩令',
      inspiration: '融合 Andrej Karpathy 四大编程铁律 + GhostCTO 爆炸半径锁',
      whenToUse: '日常让 AI 加按钮、改逻辑、接数据库，最怕它“戏太多”顺手把旁边好好的功能改崩时用。',
      whyItWorks: '直接封死大模型最爱犯的三大通病：过度设计、脑补需求、乱动无关文件。',
      prompt: `请按【Karpathy 极简外科手术铁律】帮我完成以下修改需求：
「${topicText}」

${projectContextBlock}

动笔写代码前与执行过程中，你必须死守以下 5 条高压线：
1. **最少代码第一性原理（Simplicity First）**：用最少、最直白的代码解决眼前这个真实问题。严禁为了“以后好扩展”去造复杂的抽象层、新框架或多余配置文件。
2. **绕远路主动劝阻（Push Back）**：如果我提的做法会把简单事情搞复杂、或者容易破坏现有功能，请先用大白话直接提醒我：“老板，这样绕远路了，更稳更省事的做法是 X，要不要按 X 来？”
3. **外科手术级隔离（Surgical Diffs）**：先用 \`ghost_save_checkpoint\` 存个档，再用 \`ghost_blast_radius\` 查清影响范围。只准修改与本需求直接相关的文件，**严禁顺手格式化、重构或改动旁边正常工作的无关代码**。
4. **百分百真落库真闭环**：所有新增或修改的数据必须读写项目真实数据库表，严禁使用内存假数组、空 \`catch {}\` 吞报错或只弹提示不发请求。
5. **改完自检并说人话汇报**：如涉及前端静态包请自动重新构建，最后只用 3 句大白话告诉我改好了哪里、怎么在页面上点一下验收。`
    },
    {
      id: 'anti-ai-slop-ui',
      category: 'design',
      badge: '🎨 克制审美 · 告别廉价紫光模板',
      title: '去 AI 塑料味 · Linear/Stripe 高定界面重塑令',
      inspiration: '融合 全网爆火 Anti-AI-Slop 设计宣言 + 商业级高定克制美学',
      whenToUse: '觉得 AI 做出来的网页一股廉价“AI 塑料味”（蓝紫霓虹渐变、满屏乱飞的 Emoji、千篇一律三栏白卡片）时用。',
      whyItWorks: '用明确的视觉黑名单斩断大模型的偷懒默认审美，同时死锁后端接口不准把真按钮改成空壳。',
      prompt: `请担任顶尖产品设计师（对标 Linear、Stripe、Apple 的克制高级感），帮我重塑或美化以下界面：
「${topicText}」

${projectContextBlock}

【绝对禁止的“AI 塑料感”黑名单（出现任意一条即视为不及格）】
1. **严禁廉价蓝紫霓虹渐变**：禁止无意义的紫蓝发光背景球、彩虹渐变标题字、浮夸呼吸灯边框。
2. **严禁 Emoji 泛滥与卡片汤**：禁止拿原始 Emoji 当核心功能图标刷屏，禁止偷懒排一排毫无主次的三等分雷同白卡片，禁止塞满无意义的“✨ AI 赋能 v2.0”胶囊标签。
3. **严禁编造假运营数字**：禁止在页面上凭空捏造“已服务 50,000+ 企业”、“转化率 +47%”等虚假营销数字；所有数字必须来自真实接口，或展示干净真诚的空状态引导。

【必须执行的商业高定准则】
- **色彩与层次**：底色干净沉稳（温润米白或深邃炭黑），靠精准的 \`1px\` 细边框、留白呼吸感和字重对比拉开主次，克制使用单一品牌主色点缀关键行动按钮。
- **数字与排版对齐**：所有金额、余额、统计数字一律开启等宽对齐（\`font-variant-numeric: tabular-nums\`），字号层级清晰。
- **交互细节完整**：每个按钮必须有细腻的悬停（hover）、按下（active）、加载中防连点（loading）与空数据提示（empty state）。
- **铁律护栏**：只升级视觉与交互体验，**严禁删改任何原有的真实 API 请求、登录鉴权与数据库字段绑定**！改完后请自动执行前端打包让我刷新即可看到效果。`
    },
    {
      id: 'deadloop-bug-breaker',
      category: 'engineering',
      badge: '🧯 救命神咒 · 改了3遍还没好必用',
      title: '三连败死循环 · 强制急刹车破局令',
      inspiration: '融合 全网最高赞 Vibe Debugging 破局提示词 + 时光机止损法',
      whenToUse: '当同一个报错或没反应的问题，AI 连续改了 2~3 次还是没修好，甚至越改报错越多时，立刻发这一条！',
      whyItWorks: '强迫陷入局部盲区的大模型立刻停手，跳出打补丁循环，从前端点击 -> 接口 -> 数据库全链路重新找真正病根。',
      prompt: `⛔ 立刻停手！不要再顺着刚才的错误思路继续叠补丁了！
关于这个问题：「${topicText}」，我们已经改了好几次依然没彻底解决。

${projectContextBlock}

现在请你立刻执行【死循环急刹车破局协议】：
1. **禁止立刻写代码**：先停下所有文件修改动作！如果刚才把别的地方改乱了，先询问我要不要用 \`ghost_rewind_checkpoint\` 退回最近一次好用的时光机存档。
2. **全链路捉虫复盘**：不要只盯着表面那一行报错。请顺着「网页按钮点击 -> 前端请求参数 -> 后端路由接收 -> 权限校验 -> 数据库表读写 -> 前端静态包是否重新构建」这 6 个环节逐一核对，找出**真正导致失败的唯一病根**（比如是不是改了源码没重新 build 静态包？是不是接口路径拼错了？是不是被空 catch 吞掉了真实报错？）。
3. **说人话汇报 3 件事**：
   - 之前为什么连改几次都没生效（用一句大白话讲清真凶）
   - 这次准备只改哪 1~2 个文件彻底根治
   - 怎么确保不伤到其他正常功能
4. 等我点头确认后，再一刀切干净地修好，并自己在后台跑通验证后再交给我！`
    },
    {
      id: 'khazix-expert-council',
      category: 'khazix',
      badge: '👑 卡兹克推荐 · 商业与方向决策',
      title: '顶尖领域专家选角 · 商业与产品问诊令',
      inspiration: '源自 数字生命卡兹克「专家选角前置提示词法」',
      whenToUse: '当你纠结产品怎么定价、首页怎么打动客户、哪个功能该砍掉、怎么设计商业闭环时用。',
      whyItWorks: '先让大模型自己匹配该领域最顶尖的实战派专家视角，彻底消灭温吞水式的正确的废话。',
      prompt: `我是一名正在做真实商业产品的创始人，现在遇到这个业务/产品决策问题，想请教最顶尖的内行：
「${topicText}」

${projectContextBlock}

请按【卡兹克式顶尖专家选角法】分两步回答我（全程只说透彻的大白话，严禁写代码或满嘴黑话）：
第一步：**先选出最懂这个问题的 1 位顶尖实战专家角色**，并用 3 句话告诉我为什么在这个具体阶段应该听这位专家的（而不是听普通程序员或泛泛而谈的顾问）。
第二步：**完全代入该专家的毒辣实战视角**，结合我这个项目的真实体量与现状，直接给我：
1. **一针见血的判断**：我现在最容易踩的 1 个伪需求坑是什么？
2. **最小可收钱/可验证方案**：明天就能改出来让真实客户买单的 3 个具体动作是什么？
3. **坚决砍掉的累赘**：哪些看起来很炫但现阶段纯属浪费精力的东西，建议我立刻砍掉？`
    },
    {
      id: 'mvp-negative-blueprint',
      category: 'khazix',
      badge: '🚀 灵感自卡兹克 leader · 长任务不跑偏',
      title: '防跑偏任务书 · 负面边界施工蓝图令',
      inspiration: '融合 `KKKKhazix/khazix-skills` 之 `leader` 技能 + 负面清单边界法',
      whenToUse: '准备让 AI 一次性完成一个完整的新模块或新页面，希望它自己拆解步骤、稳稳做完且绝不跑偏时用。',
      whyItWorks: '用「核心必做 3 件事 + 绝对不做负面清单 + 每步自检闭环」把长程 Agent 锁在铁轨上。',
      prompt: `请按【目标任务书与负面边界协议】帮我规划并稳步落地这个模块：
「${topicText}」

${projectContextBlock}

请严格按以下四步推进：
1. **先立任务书与“负面清单”**：
   - 明确本次只交付最核心的 **1~3 个真闭环功能点**；
   - 明确列出 **【本次绝对不做清单（Out of Scope）】**（禁止私自加无关菜单、禁止改全局配色、禁止发明假开关、禁止省略代码写 \`// ...其余代码省略\`）。
2. **先存档后动刀**：开工前先调用 \`ghost_save_checkpoint\` 备份当前代码与数据库。
3. **小步真落库施工**：按「先建好/对齐真实数据表 -> 再写带权限保护的后端接口 -> 最后接通前端按钮与真实状态反馈」的顺序逐块完成，绝不留任何内存假数据或 404 断头接口。
4. **终局双重自检**：全部写完后，自动调用 \`ghost_reality_audit\` 做一次真假体检并更新《老板全景驾驶舱.html》，确保商用健康分不降反升，再用大白话告诉我验收步骤。`
    },
    {
      id: 'khazix-neat-freak',
      category: 'khazix',
      badge: '🧹 灵感自卡兹克 neat-freak · 防 AI 脑腐',
      title: '代码·记忆·驾驶舱「三层洁癖同步」令',
      inspiration: '融合 `KKKKhazix/khazix-skills` 之 `neat-freak` 防脑腐理念 + GhostCTO 记忆胶囊',
      whenToUse: '当你连续改了好几轮代码、或者准备从当前软件换到 WorkBuddy / 豆包 / Trae / Cursor 接着干活前用。',
      whyItWorks: '彻底解决改了十轮代码后文档过时、换个 AI 软件就“失忆瞎改”的脑腐（Context Rot）顽疾。',
      prompt: `我们已经对项目做了多轮修改（补充说明：「${topicText}」）。为了防止后续对话或切换软件时出现“记忆过时脑腐”，请立即执行【三层洁癖同步（Neat-Freak Sync）】（本次只做盘点与文档记忆同步，严禁破坏任何业务功能代码）：

${projectContextBlock}

1. **第一层（全栈真假体检对齐）**：运行 \`ghost_reality_audit\` 与 \`ghost_boss_dashboard\`，核查最新代码里有没有遗留死文件、未构建的前端静态包或断头接口。
2. **第二层（跨软件记忆胶囊对齐）**：确保 \`.vibe/capsule.md\` 已精确反映当前最新的端口、核心数据表与踩坑红线（保持极简不超 350 tokens，方便 WorkBuddy、豆包、Trae、Antigravity 秒读接力）。
3. **第三层（老板大白话交接单）**：如有 \`README.md\` 或启动说明与现状不符请一并修正，最后给我输出一份 5 行以内的《当前家底交接清单》：已完成哪些真功能、怎么一键启动、下一步最值得做什么。`
    },
    {
      id: 'khazix-human-copy',
      category: 'design',
      badge: '✍️ 灵感自卡兹克四检法 · 高转化说人话',
      title: '去 AI 爹味与黑话 · 商业页面文案洗稿令',
      inspiration: '融合 卡兹克「四层去 AI 味自检体系」+ 高转化落地页文案法则',
      whenToUse: '觉得软件界面上的标题、按钮、空状态提示词全是“赋能、抓手、闭环、生态矩阵”这种让人看不懂的机器废话时用。',
      whyItWorks: '把自嗨的 AI 八股词全部洗成客户一眼看懂“对我有什么好处、点哪里能干嘛”的大白话。',
      prompt: `请按【去 AI 机器味四层洗稿铁律】，帮我把以下页面或模块的界面文案全部洗成“客户一眼看懂、立刻想点”的真人大白话：
「${topicText}」

${projectContextBlock}

【文案清洗四大铁律】
1. **封杀 AI 八股黑话**：全面清剿界面里的“赋能、抓手、全链路闭环、生态矩阵、范式跃迁、底层逻辑、智能中枢”等空洞词汇！
2. **按钮必须写清“动作+结果”**：把含糊的“提交 / 执行 / 处理”改成具体可感知的动作（例如“立即生成报价单”、“保存到门店账本”）。
3. **空状态与报错必须说人话**：没数据时不要冷冰冰显示“暂无数据 / No Data”，要写清“还没有添加门店，点右上角 10 秒建好第一家店”；报错时告诉用户下一步怎么解决，严禁直接把英文堆栈甩在脸上。
4. **只改文案不动骨头**：严格保持原有的函数名、接口地址和数据库字段不变，只替换面向用户展示的中文文案，改完若有静态前端包请自动重新打包。`
    }
  ];
}

export function getMasterPromptById(workspace, audit, promptId, customTopic = '') {
  const list = buildMasterPromptArsenal(workspace, audit, customTopic);
  if (!promptId || promptId === 'all') {
    return list;
  }
  const found = list.find(item => item.id === promptId);
  if (!found) {
    throw new Error(
      `未找到编号为 "${promptId}" 的大师提示词。可选编号: ${list.map(x => x.id).join(', ')}`
    );
  }
  return found;
}

export function formatPromptArsenalReport(prompts, projectName) {
  const lines = [
    `# ✨ ${projectName} · 实战防崩指令库（已自动注入本项目家底）`,
    `> 精选整理 **数字生命卡兹克 (KKKKhazix)**、**Andrej Karpathy** 与工程防崩/界面审美指令，0 常驻 Token 负担，按需复制即用。`,
    ''
  ];

  for (const [idx, p] of prompts.entries()) {
    lines.push(`## ${idx + 1}. ${p.title}  \`[${p.id}]\``);
    lines.push(`- **标签**：${p.badge} ｜ **灵感来源**：${p.inspiration}`);
    lines.push(`- **什么时候用**：${p.whenToUse}`);
    lines.push(`- **为什么管用**：${p.whyItWorks}`);
    lines.push('```text');
    lines.push(p.prompt);
    lines.push('```');
    lines.push('');
  }
  return lines.join('\n');
}
