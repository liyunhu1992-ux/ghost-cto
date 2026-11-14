<div align="center">

<img src="./plugin/assets/logo.svg" width="84" height="84" alt="GhostCTO Logo" />

# GhostCTO（影子 CTO）

### **100% 永久免费的全品类 AI 编程工程护栏：不限制你做什么产品，让不懂代码的人在聊天框说大白话，也能从 `0` 到 `5` 做出真能跑的网站、AI SaaS 平台、在线工具与小程序。**

**零第三方依赖（Pure Node.js >= 18）· 支持字节 Trae / 豆包、腾讯 WorkBuddy / CodeBuddy、Antigravity、Cursor、Claude Code、Windsurf · 本仓库自身即由 GhostCTO 自举管控（实测健康分 `100 / 100`）。**

[![Zero Dependencies](https://img.shields.io/badge/外部依赖-0_(纯_Node.js_内置模块)-059669?style=flat-square)](#)
[![Self Dogfooding](https://img.shields.io/badge/自举体检得分-100%2F100_(GhostCTO_管控自身)-059669?style=flat-square)](#)
[![Always-On Prompt](https://img.shields.io/badge/常驻路由体积-402_Tokens_(命中90%25前缀缓存)-7C3AED?style=flat-square)](#)
[![Tests](https://img.shields.io/badge/自动化与对抗测试-19%2F19_全绿通过-2563EB?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/开源协议-MIT_(100%25免费开源)-18181B?style=flat-square)](./LICENSE)

[**📖 与 AI 对话全链路手册**](./小白与AI对话全链路通关手册.md) ｜ [**安装与配置指南**](./INSTALL.md) ｜ [**英文弹窗急救词典**](./docs/POPUP_DICTIONARY.md) ｜ [**English README**](./README.en.md) ｜ [**安全说明**](./SECURITY.md)

</div>

> **💡 零基础小白 10 秒看懂怎么用：**
> 1. **只装一次**：双击脚本把它装进你的项目文件夹；
> 2. **平时不用管它**：不用背提示词，也不用看复杂报表，直接在 AI 聊天框照常说大白话提需求就行（自动存档与防改崩已在后台静默保护）；
> 3. **改坏了一键退回**：万一 AI 把页面改乱了，对 AI 说一句**「退回上一版」**（或打开体检页点**「退回这一版」**），代码和数据一起恢复。

<p align="center">
  <img src="./docs/zero-to-five-flow.svg" width="100%" alt="GhostCTO 从 0 到 5 聊天框全链路守护图" />
</p>

---

## 🎯 它能帮你做什么？（不设品类上限，绝不把你锁死在单一列表模板里）

GhostCTO **不是**一个只能做“记账本”的死模板，而是一套装在项目文件夹里的**本地确定性工程护栏 + 分阶段孵化引擎**：

| 你想做的产品类型 | GhostCTO 如何配合你的 AI 一步步做出来 |
| :--- | :--- |
| **🌐 独立品牌官网 / 产品着陆页**<br>摄影设计工作室官网、企业门户、作品集、活动预约页 | 生成多屏视觉官网布局（首屏主视觉、能力矩阵、方案展示、真实落库的访客留资表单），支持自由定制任意页面风格 |
| **🤖 多模块 AI SaaS 与智能体系统**<br>多平台内容矩阵、AI 工作流工作台、多租户算力/积分后台 | 按 `v0.1 → v1.0` 五阶段路线图（`.vibe/roadmap.json`）逐块推进：左侧多模块工作台、多表 SQLite/Postgres 持久化、外部大模型 `.env` 密钥隔离、角色分权与操作审计 |
| **⚡ 在线交互工具 / 创意生成器**<br>排版转换器、计算器、效率画布、本地桌面 Web 工具 | 零配置启动，内置防连击锁、防白屏报错捕获条、历史作品本地持久化与一键导出 |
| **📱 业务管理系统 + 微信小程序双端**<br>客户预约、会员资产、门店协同、原生小程序 | 可一键铺设免登录版、多账号 `scrypt` 加密分权版（含员工端手机号脱敏 `138****8801`），或同步生成原生 `miniprogram/` 微信小程序目录 |
| **🛠️ 开源工程 / CLI / 开发者工具**<br>Node.js / Next.js / Vue / Python FastAPI 任意栈项目 | **GhostCTO 本身就是用 GhostCTO 做出来的**：用自身的 `save`、`impact`、`verify`、`audit` 把全仓所有模块控制在 `< 500` 行/文件、0 空 `catch {}`、健康总分 `100 / 100` |

---

## 🛡️ 本地确定性代码到底拦住了哪些翻车点？

1. **分阶段防贪多（`incubate` -> `.vibe/roadmap.json`）**：一次提十几个模块时，不写点不动的空壳样板房，而是先拆出 `v0.1 → v1.0` 五阶段路线图，把第 1 阶段跑通落库后再逐阶段扩建专属页面与多表结构。
2. **编译器级硬门禁 + IDE `Stop` 钩子（`verify` + `.vibe/ghost-hook-check.mjs`）**：0-Token 静态拦截 JS/HTML/JSON 语法错、**未安装的 npm 包、错误的本地导入路径、错写的导出函数名、SQL 字段名拼写不一致**、空点击假按钮、假保存弹窗、空 `catch {}` 与裸奔 `/api/admin` 接口。即使模型漏调检查，回合结束钩子也会自动拦截逼它修好。
3. **二次改需求老数据不崩（`autoMigrateSqliteSchema`）**：给已有 SQLite 表新增字段时，启动自动比对并执行 `ALTER TABLE ADD COLUMN` 无损加列，不报 `no such column`，已有数据零丢失。
4. **爆炸半径锁 + 代码&数据库双轨时光机（`impact` + `save` + `rewind`）**：改代码前按中文按钮或模块名锁定最小文件集（单文件严格控制在 `< 500` 行防 AI 改崩）；改坏了一句话 1 秒将 Git 代码和 SQLite（含 `-wal`）字节级同时还原。
5. **自愈式双击启动 + Git 提交防泄密（`pre-commit`）**：自动清理卡死端口并打开浏览器；提交代码时自动拦截 `.env` 与硬编码云密钥，防止密钥传上公网。

---

## 🚀 30 秒快速开始（完全免费，无需背提示词）

### 方式一：零命令行双击向导
1. 点击右上角绿色 **`Code` -> `Download ZIP`** 下载并解压（*Mac 首次打开网页下载脚本时，右键点击 `.command` 文件选「打开」即可*）；
2. 双击 **`1-双击新建我的空白项目.command`**（Mac）或 **`.bat`**（Windows），输入项目名，自动在**桌面**建好带全套护栏的干净文件夹（若未装免费 `Node.js >= 18` 会自动弹窗引导下载）；已有老项目则双击 **`2-双击接入已有老项目`**；
3. 用 **字节 Trae / 豆包 / 腾讯 WorkBuddy / CodeBuddy / Cursor / Antigravity / Claude Code** 打开桌面上的文件夹，直接在聊天框用大白话告诉 AI 你想做什么即可。

### 方式二：命令行与自举验证（用 GhostCTO 检查 GhostCTO 自己）
```bash
git clone https://github.com/liyunhu1992-ux/ghost-cto.git
cd ghost-cto

# 1. 验证 GhostCTO 对自身的 0-Token 编译门禁与真假体检（实测 100/100 分）
npm run self:verify
npm run self:audit

# 2. 运行全部 19 组单元测试、破坏性对抗测试与自举锁死测试
npm test

# 3. 为你的新项目或已有项目接入护栏
node bin/ghost-cto.mjs create "我的新产品"
node bin/ghost-cto.mjs init /path/to/your-project
```

---

## 🔍 物理前提与边界说明（实事求是）

- **本地免费运行前提**：电脑需安装免费的 `Node.js >= 18`（推荐 `Node.js 22 LTS` 以启用内置原生 `node:sqlite`，低版本自动降级为原子 JSON 存储），并配合任意一款 AI 编程工具使用。若预览微信小程序，免费安装官方「微信开发者工具」导入 `miniprogram/` 目录即可。
- **公网正式上线前提**：本机或局域网使用全程 0 费用；若需部署到公网供全国外部用户访问、或正式上架微信小程序及开通微信支付，需按常规流程自备云服务器/域名备案或微信官方小程序主体与商户资质。

---

## 📜 开源协议

本项目基于 [MIT License](./LICENSE) 100% 永久免费开源。
