<div align="center">

<img src="./plugin/assets/logo.svg" width="84" height="84" alt="GhostCTO Logo" />

# GhostCTO（影子 CTO）

### **100% 永久免费的零代码防崩工程护栏：让完全不懂代码的小白，在 AI 聊天框里只说大白话，从 `0` 到 `5` 做出真正能用的成熟软件。**

**零第三方依赖（Pure Node.js >= 18）· 0 收费套路 · 一次接入字节 Trae / 豆包、腾讯 WorkBuddy / CodeBuddy、Antigravity、Cursor、Claude Code、Windsurf：**  
**自动拦贪多画饼、支持生成「个人免登录网页 / 多账号分权商用系统 / 原生微信小程序双端」，内置老数据库自动无损升级、IDE 结束回合自动验毒钩子与代码+数据库秒级回退。**

[![Zero Dependencies](https://img.shields.io/badge/外部依赖-0_(纯_Node.js_内置模块)-059669?style=flat-square)](#)
[![Audit Token Cost](https://img.shields.io/badge/本地验真消耗-0_Token_(毫秒级编译与真假门禁)-2563EB?style=flat-square)](#)
[![Always-On Prompt](https://img.shields.io/badge/常驻路由体积-412_Tokens_(命中90%25前缀缓存)-7C3AED?style=flat-square)](#)
[![Tests](https://img.shields.io/badge/自动化对抗测试-15%2F15_全绿通过-059669?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/开源协议-MIT_(100%25永久免费)-18181B?style=flat-square)](./LICENSE)

[**📖 零基础小白与 AI 对话全链路通关手册**](./小白与AI对话全链路通关手册.md) ｜ [**安装与配置指南**](./INSTALL.md) ｜ [**英文弹窗急救词典**](./docs/POPUP_DICTIONARY.md) ｜ [**English README**](./README.en.md) ｜ [**安全说明**](./SECURITY.md)

</div>

<p align="center">
  <img src="./docs/zero-to-five-flow.svg" width="100%" alt="GhostCTO 从 0 到 5 聊天框保姆级全链路守护图" />
</p>

> [!TIP]
> **完全免费开源（无订阅、无内购、不消耗额外 API 费用），也不需要背任何提示词！**  
> 下载解压后双击 **`1-双击新建我的空白项目`**，用你的免费/自有 AI 编程软件打开桌面上自动建好的干净文件夹，直接在聊天框说一句大白话（比如：“我想做个宠物洗护预约小程序”），AI 就会按 `0 → 5` 的正规开发步骤一步步带你做出来。  
> 👉 3 分钟看懂完整对话过程：[**《零基础小白与 AI 对话全链路通关手册》**](./小白与AI对话全链路通关手册.md)

---

## 💡 小白自己做 Vibe Coding 最容易翻在哪？GhostCTO 用什么确定性代码拦住？

| 小白实操常见翻车点 | 没有工程底座时 AI 的表现 | **GhostCTO 本地确定性代码的真实兜底（非纯文本口号）** |
| :--- | :--- | :--- |
| **1. 说不清要什么 / 一上来贪多**<br>只有零碎想法，或一口气要做 20 个模块 | AI 照单全收，写出十几个点不动的假菜单和样板房空壳 | **第 0 步定性反问与急刹车**：超过 3 个模块先收敛核心闭环；主动问清 **A. 自用免登录网页 / B. 商用多账号系统 / C. 微信小程序双端** |
| **2. 想不到专业团队才懂的细节**<br>只知道提“增删改查”，缺权限、缺防误删、缺导出 | 明文裸存密码、手滑点删除直接清空、连点存两条、中文导出乱码 | **第 1 步一键铺设 `100/100` 底座**：内置防连击锁、删除二次确认、在线编辑、UTF-8 BOM 零乱码导出 Excel；选 **B** 配齐 **`scrypt` 加盐密码哈希 + 店长/员工分权 + 手机号脱敏 (`138****8801`) + 审计日志 + `Dockerfile`**；选 **C** 同步生成原生 **`miniprogram/` 微信小程序端** |
| **3. 第二轮加新字段直接崩数据库**<br>第一版跑通后让 AI“加个微信号字段”，一保存报 `no such column` | AI 只改 `CREATE TABLE IF NOT EXISTS`，老 SQLite 库根本不会自动加列 | **内置 `autoMigrateSqliteSchema` 无损自动加列 + SQL 列名静态核对**：启动时自动比对表结构并执行 `ALTER TABLE ADD COLUMN` 补齐新列，老客户数据 0 丢失；SQL 写错列名直接被 `verify` 提前拦下 |
| **4. 表面弹“保存成功”，刷新全丢 / 漏装包崩溃**<br>按钮弹绿框其实没调接口，或 AI 乱引没装的 npm 包导致打不开 | 写内存数组糊弄、`node --check` 查不出未安装的包和错名导出 | **`ghost-cto verify` 编译器级门禁 + IDE `Stop` Hook 双保险**：0-Token 拦截语法错、**未安装的外部包、错误导出名、SQL 字段拼写不一致**、空点击假按钮、假保存弹窗、空 `catch {}`；即使 AI 忘调检查，IDE 结束钩子与《双击启动项目》也会自动拦截并提供一键回退 |
| **5. 问一句“为什么”被乱改 / 越修越崩弃坑**<br>本来只想咨询问题结果被改坏，绝望删文件夹重开 v4 | 分不清问答与改代码；回退代码时把测试攒的数据库弄坏 | **问号只读锁 + 爆炸半径锁 (`<=3` 文件) + 代码&SQLite 双轨时光机**：发一句“退回刚才”，1 秒将 Git 代码和 SQLite（含 `-wal`）字节级原子还原 |
| **6. 隔天端口卡死打不开 / 密钥误传泄密**<br>报 `EADDRINUSE` 黑框英文，或把 `.env` 密钥传上网 | 让你自己去终端敲 `lsof`/`kill -9`；对明文密钥无感知 | **自愈式《双击启动项目》**（自动寻路 Node、清卡死端口、防崩预检、弹浏览器）+ **`.git/hooks/pre-commit` 防泄密急刹车** |

---

## 🚀 30 秒极速开局（零门槛、完全免费）

### 方式一：纯小白双击向导（一行命令都不用敲）
1. 点击本页面右上角绿色 **`Code` -> `Download ZIP`** 下载并解压；
   - *(💡 苹果 Mac 小贴士：首次从网页下载解压后，在 `1-双击新建我的空白项目.command` 上点**鼠标右键 -> 打开**即可；向导随后会自动为你桌面上新建的项目解除苹果安全拦截)*
2. 按你的场景双击对应向导（向导若检测到电脑还没装免费的 `Node.js >= 18`，会自动弹窗引导一键打开官网下载）：
   - 🌱 **从 0 做新产品**：双击 **`1-双击新建我的空白项目.command`**（苹果）或 **`1-双击新建我的空白项目.bat`**（Windows） → 输入作品名 → 自动在**桌面**建好干净文件夹并装好全套保护！
   - 📂 **保护已有老项目**：双击 **`2-双击接入已有老项目.command`**（苹果）或 **`2-双击接入已有老项目.bat`**（Windows） → 选中你的老项目文件夹即可。
3. 打开 **字节 Trae（免费）/ 豆包编程 / 腾讯 WorkBuddy / CodeBuddy / Cursor / Antigravity**，点击 **「打开文件夹」** 选中桌面上的新项目，直接在聊天框用大白话开聊！

### 方式二：终端命令行使用
```bash
git clone https://github.com/liyunhu1992-ux/ghost-cto.git
cd ghost-cto

# 在桌面创建干净的新项目并自动装好 8 大 AI 软件保护护栏
node bin/ghost-cto.mjs create "我的宠物店管家"

# 或者为已有项目安装保护护栏
node bin/ghost-cto.mjs init /path/to/your-project

# 在本机跑一遍全部 15 组自动化功能与破坏性对抗测试
npm test
```

---

## 🏗️ 三种完整产品底座（全部经 `tests/` 下 15 组自动化对抗测试真机验证）

<p align="center">
  <img src="./docs/architecture.svg" width="100%" alt="GhostCTO 零依赖确定性内核架构图" />
</p>

| 维度 | A. 个人免登录网页版 (`--audience self`) | B. 多账号商用分权版 (`--audience commercial`) | C. 微信小程序 + 后台双端 (`--platform miniprogram`) |
| :--- | :--- | :--- | :--- |
| **数据库与二次改表** | 原生 `node:sqlite` (`WAL`) + `autoMigrateSqliteSchema` 无损自动加列 | 原生 `node:sqlite` (`WAL`)：业务表 + `users` + `sessions` + `audit_logs` + 无损加列 | 与 A 或 B 共用同一套真实 SQLite 后台，网页端与小程序端数据实时互通 |
| **账号权限与隐私保护** | 免登录，本地双击秒开即用 | `crypto.scryptSync` 加盐哈希 + `HttpOnly` 会话 + **店长/员工接口级 `401/403` 分权** + 员工视角手机号自动脱敏为 `138****8801` | 支持免登录直连，或开启商用 `Bearer` 会话登录 + 员工手机号脱敏与禁删保护 |
| **交互细节与离线导出** | 防连击锁、删除二次确认、在线编辑、状态筛选、UTF-8 BOM Excel `.csv` 导出、防白屏捕获条 | 同左全配齐 + 在线改密 + 店长开通/停用员工子账号 + 操作审计日志 + `Dockerfile` | 生成完整 `miniprogram/`（`project.config.json` 预置免 300 元认证费的 `touristappid` + WXML/WXSS/JS 真 `wx.request` 闭环） |

---

## 🔍 实事求是：物理前提与边界说明（不吹牛、不隐瞒）

1. **你需要自备的基础环境（均可免费获取）**：
   - 电脑安装免费的 **`Node.js >= 18`**（装一次终身可用；推荐使用 `Node.js 22 LTS` 以启用内置原生 `node:sqlite`，低版本亦会自动降级为磁盘原子 JSON 存储不崩溃）；
   - 任意一款 AI 编程软件（例如国内完全免费的 **字节 Trae / 腾讯 WorkBuddy / CodeBuddy**，或 **Cursor / Claude Code / Antigravity**）；若做微信小程序预览，免费下载安装官方 **微信开发者工具** 导入项目内的 `miniprogram` 目录即可。
2. **本地免费运行 vs 公网正式发布**：
   - 在你自己电脑或店里局域网使用、以及在微信开发者工具里用测试号预览，**全程 0 费用、无需域名备案**；
   - 如果你将来要把商用系统放到公网云服务器给全国陌生用户访问，或把小程序正式提交微信官方审核上架、接入真实微信商户收款，则需要按常规流程自备云服务器/域名备案或微信官方小程序主体账号与商户号资质。

---

## 🛠️ CLI 与 MCP 工具速查表

| 命令 / MCP 工具 | 作用（0 Token 本地确定性执行） |
| :--- | :--- |
| `ghost-cto create "项目名"` | 在桌面创建干净新项目文件夹并自动装好全套 8 平台保护护栏与 Stop Hook |
| `ghost-cto bootstrap "想法" [目录] --audience self\|commercial [--platform miniprogram]` | `ghost_incubate_idea`：生成 `.vibe/blueprint.md` 蓝图并铺设 100 分网页 / 商用 / 微信小程序底座 |
| `ghost-cto verify [目录]` | `ghost_verify_code`：检查语法错、未安装包、错误导出、SQL 错列、假按钮、假保存、空 `catch` 与裸奔后台 |
| `ghost-cto audit [目录]` | `ghost_reality_audit`：10 维真假功能与上线安全扫描（同步更新 `.vibe/项目体检报告.html`） |
| `ghost-cto xray [目录]` | `ghost_xray_lineage`：绘制 `前端/小程序 -> 后端路由 -> 数据库表` 全栈真假穿透表 |
| `ghost-cto impact "按钮中文名"` | `ghost_blast_radius`：改代码前按中文界面词锁定最小修改文件集 |
| `ghost-cto save "说明"` | `ghost_save_checkpoint`：原子快照备份 Git 代码与全部 SQLite（含 `-wal`）数据库 |
| `ghost-cto rewind [编号]` | `ghost_rewind_checkpoint`：自动留急救备份后，1 秒将代码和数据库一起原子恢复 |
| `ghost-cto doctor [目录]` | 23 项真机体检：核验各软件配置、Stop Hook、Token 预算与跨目录 MCP 双协议通信 |
| `ghost-cto try` | 在本机临时沙箱跑完 1 秒全链路破坏性演练 |

---

## 📜 开源协议

本项目基于 [MIT License](./LICENSE) 100% 永久免费开源，欢迎自由使用、修改与分享。
