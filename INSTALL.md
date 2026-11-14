# GhostCTO（影子 CTO）安装与软件配置指南

前置要求：电脑装有基础 **`Node.js >= 18`**（零第三方 npm 依赖，全程无需联网拉取额外包，不会跳英文越权弹窗）。

---

## 一、零命令行双击上手（推荐纯小白使用）

在 GitHub 页面点击右上角绿色 **`Code` -> `Download ZIP`** 下载并解压后，你会看到两个清晰的双击脚本：

### 场景 1：我要从 0 开始做一个新工具 / 新产品
- **苹果电脑 (macOS)**：双击 **`1-双击新建我的空白项目.command`**（若首次打开提示“无法验证开发者”，右键点它选「打开」即可）；
- **Windows 电脑**：双击 **`1-双击新建我的空白项目.bat`**；
- 输入你的新项目名字（例如 `我的美甲管家`），它会自动在你的 **电脑桌面** 创建干净的项目文件夹，并装好全套防崩规则与离线引擎。随后用 AI 软件打开桌面上这个新文件夹即可直接开聊！

### 场景 2：我手里已经有现成的代码文件夹，想加装保护
- **苹果电脑 (macOS)**：双击 **`2-双击接入已有老项目.command`**，在访达窗口选中你的老项目文件夹；
- **Windows 电脑**：双击 **`2-双击接入已有老项目.bat`**，在弹窗选中你的老项目文件夹。

---

## 二、命令行安装方式（适合熟悉终端的用户）

```bash
# 1. 克隆本仓库到本地
git clone https://github.com/liyunhu1992-ux/ghost-cto.git
cd ghost-cto

# 2A. 在桌面创建一个干净的新项目并自动配齐保护护栏
node bin/ghost-cto.mjs create "我的美甲管家"

# 2B. 或者接入你已有的项目文件夹
node bin/ghost-cto.mjs init /你的已有项目路径

# 3. 运行 21 项配置与跨进程 MCP 真机通信自检
node bin/ghost-cto.mjs doctor ~/Desktop/我的美甲管家
```

---

## 三、8 大国内外 AI 编程软件生效说明

`create` 或 `init` 执行一次后，项目文件夹内会自动生成以下原生配置，换软件打开同一个文件夹不会失忆：

| 软件名称 | 自动生成的项目内配置文件 | 你需要手动设置吗？ |
| :--- | :--- | :--- |
| **字节 Trae IDE / 豆包编程** | `.trae/rules/project_rules.md` + `.trae/skills/*` + `.trae/mcp.json` | **不需要**，打开项目文件夹自动生效 |
| **字节 豆包桌面客户端** | `.vibe/豆包桌面版与WorkBuddy_MCP配置.json` | 在豆包桌面版「MCP 设置」导入该 JSON 即可 |
| **腾讯 WorkBuddy** | `.workbuddy/rules/ghost-cto.md` + `.workbuddy/skills/*` + `.workbuddy/mcp.json` | **不需要**，打开项目文件夹自动生效（保留原有 MCP） |
| **腾讯 CodeBuddy** | `.codebuddy/CODEBUDDY.md` + `.codebuddy/rules/ghost-cto.md` + `.codebuddy/mcp.json` | **不需要**，打开项目文件夹自动生效 |
| **Google Antigravity** | `AGENTS.md` + `.agents/skills/*` + `.agents/plugins/ghost-cto/` | **不需要**，打开项目自动挂载 |
| **Cursor** | `.cursor/rules/ghost-cto.mdc` (`alwaysApply: true`) + `.cursor/mcp.json` | **不需要**，打开项目自动生效 |
| **Claude Code** | `CLAUDE.md` (`@AGENTS.md`) + `.claude/skills/*` + `.mcp.json` | **不需要**，启动自动挂载 |
| **Windsurf / OpenAI Codex** | `.windsurf/rules/ghost-cto.md` + `.windsurf/mcp_config.json` + `AGENTS.md` | **不需要**，同时内置 `.vibe/engine` 命令行双通道兜底 |

---

## 四、项目里的《双击启动项目》怎么用？

每次让 AI 做好或改好网页后，打开你的项目文件夹双击 **`双击启动项目.command`**（Mac）或 **`双击启动项目.bat`**（Windows）：
1. 如果之前端口卡死了（`EADDRINUSE`），它会自动清理旧进程；
2. 零外部依赖项目 `0.1 秒` 直接离线拉起服务并打开浏览器；只有当 `package.json` 真正声明了第三方依赖且未安装时才会自动补跑 `npm install`。
