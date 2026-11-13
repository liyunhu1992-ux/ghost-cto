# 🆘 零代码主理人防懵手册：常见英文弹窗翻译 & 国内软件一键接入指南

## 一、常见英文弹窗傻瓜翻译卡（看到不再慌）

| 屏幕上跳出的英文 | 大白话真实意思 | 你该点哪个？ |
| :--- | :--- | :--- |
| **`Allow` / `Accept` / `Approve`** | AI 问你：“能不能在当前项目文件夹里改这个文件 / 跑这个检查？” | 🟢 **放心点 Allow / Accept**（只要路径在你的项目文件夹里） |
| **`Run Command` (`npm run build` / `node --test`)** | AI 要把刚改好的界面打包刷新，或者自动测试有没有改坏 | 🟢 **点同意运行** |
| **`Bypass Sandbox` / `Allow Outside Workspace`** | AI 想跨出当前项目文件夹去改系统别的地方，或者联网请求外部接口 | 🟡 **先点 Deny / Cancel（拒绝）**，然后在对话框问它：“请用中文告诉我你为什么要申请外部权限？” |
| **`Overwrite existing file?`** | 准备更新覆盖旧文件 | 🟢 如果刚存过时光机备份，点同意即可 |
| **`EADDRINUSE: address already in use :::8890`** | 昨天开的程序还没关干净，把本地网址的门牌号占住了 | 🟢 直接双击文件夹里的 **`双击启动项目.command`**（苹果）或 **`双击启动项目.bat`**（Windows），自动清理重开！ |
| **`401 Unauthorized`** | 登录过期了，退出重新登录一下就好 | 🟢 重新登录账号 |
| **`404 Not Found`** | 前端按钮调了一个后端根本没写的“断头路接口” | 🔴 把话术发给 AI：“运行影子 CTO 体检修复断头接口” |
| **`500 Internal Server Error`** | 后端代码写劈叉报错了 | 🔴 把话术发给 AI：“运行影子 CTO 体检定位 500 报错” |

---

## 二、国内主流软件（腾讯 WorkBuddy / 豆包 / Trae / CodeBuddy）零门槛用法

当你对项目目录执行过一次初始化（或让任意 AI 帮你执行过 `node bin/ghost-cto.mjs init <你的项目路径>`）后，项目里已经自动生成好所有国内软件专属配置：

### 1. 腾讯 WorkBuddy（桌面端 Agent）
- **自动生效**：用 WorkBuddy 直接打开你的项目文件夹，它会自动识别项目根目录下的 `.workbuddy/skills/`、`.workbuddy/rules/ghost-cto.md` 和 `.workbuddy/mcp.json`。
- **怎么跟它说话**：什么斜杠命令都不用记！直接打中文字：
  - *“帮我体检一下现在有哪些假功能和隐患”*
  - *“先存个档，再帮我把登录页配色改成暖色调”*
  - *“刚才改乱了，用时光机退回上一步”*

### 2. 字节跳动 豆包编程 / Trae IDE（原豆包 MarsCode 升级版）
- **Trae / 豆包 IDE 内打开项目**：自动识别 `.trae/rules/project_rules.md`、`.trae/skills/` 与 `.trae/mcp.json`，开箱即用。
- **豆包独立桌面客户端（聊天客户端 MCP 接入）**：
  1. 打开项目里的 `.vibe/豆包桌面版与WorkBuddy_MCP配置.json` 文件并复制内容；
  2. 在豆包桌面版「设置 -> MCP 服务 -> 导入 JSON 配置」粘贴保存；
  3. 豆包就能直接调用本地 0-Token 的影子 CTO 六大法医工具帮你看项目、查真假、存后悔药！

### 3. 腾讯 CodeBuddy
- 直接用 CodeBuddy 打开项目文件夹，自动加载 `.codebuddy/CODEBUDDY.md`、`.codebuddy/rules/ghost-cto.md`（`alwaysApply: true`）以及 `.codebuddy/skills/`。
