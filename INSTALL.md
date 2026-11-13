# GhostCTO（影子 CTO）安装与国内软件配置指南

只需要电脑装有基础 `Node.js >= 18`，**零第三方依赖、不需要联网下载额外包、不会弹出英文越权弹窗**。

---

## 1. 先跑一次 1 秒本机真机自检（可选）

想确认自己电脑能不能正常跑 GhostCTO 的全部功能，直接运行：

```bash
node bin/ghost-cto.mjs try
```

它会在临时目录自动创建一个带假功能、假落库和 SQLite 数据库的沙箱项目，实测 8 大软件安装、跨进程 MCP 握手、法医扫描、爆炸半径反查与数据库时光机回退，跑完自动清理干净。

---

## 2. 给你的商业项目装上「影子 CTO」

### 最省心方式（连命令都不用自己敲）
打开你正在用的 **腾讯 WorkBuddy / 豆包编程 / Trae / Antigravity / Cursor**，直接发一句中文：

> 请运行 `node /path/to/ghost-cto/bin/ghost-cto.mjs init` 帮当前项目装上影子 CTO，并跑一遍 `doctor` 自检。

### 命令行一键方式

macOS / Linux：
```bash
./install.sh /你的项目文件夹路径
```

Windows PowerShell：
```powershell
.\install.ps1 C:\你的项目文件夹路径
```

或者直接用 Node / npx：
```bash
npx ghost-cto init /你的项目文件夹路径
npx ghost-cto doctor /你的项目文件夹路径
```

---

## 3. 各大国内外软件打开后的效果

| 你用的软件 | 你需要手动做什么吗？ | 生效机制 |
| :--- | :--- | :--- |
| **腾讯 WorkBuddy** | **不需要**，直接打开项目文件夹即可 | 自动识别 `.workbuddy/rules/`、`.workbuddy/skills/` 与 `.workbuddy/mcp.json` |
| **腾讯 CodeBuddy** | **不需要**，直接打开项目文件夹即可 | 自动识别 `.codebuddy/CODEBUDDY.md`、`.codebuddy/skills/` 与 `.codebuddy/mcp.json` |
| **字节 Trae IDE / 豆包编程插件** | **不需要**，直接打开项目文件夹即可 | 自动识别 `.trae/rules/project_rules.md`、`.trae/skills/` 与 `.trae/mcp.json` |
| **字节 豆包桌面客户端** | 在豆包桌面版「MCP 设置」导入 `.vibe/豆包桌面版与WorkBuddy_MCP配置.json` | 导入后即可在豆包对话里直接调用 6 个影子 CTO 体检与时光机工具 |
| **Google Antigravity** | **不需要**，打开项目自动生效 | 自动加载根目录 `AGENTS.md`、`.agents/skills/` 与 `.agents/plugins/ghost-cto/` |
| **Cursor / Claude Code / Windsurf** | **不需要**，打开项目自动生效 | 自动挂载 `.cursor/rules/`、`CLAUDE.md`、`.mcp.json` 与 `.windsurf/rules/` |

---

## 4. 装完后先看哪两个文件？

打开你的项目文件夹，你会直接看到两个中文文件：

1. **`老板全景驾驶舱.html`**：双击用浏览器打开。不用看任何英文代码，直接看项目能打几分、哪些接口是真落库、哪些按钮是糊弄你的假开关，点一下右上角**「一键复制修复话术」**粘贴给 AI 就能修好。
2. **`双击启动项目.command`（苹果电脑）/ `双击启动项目.bat`（Windows）**：隔天重启电脑网页打不开、或者端口卡死时，双击它自动清理端口、自动同步最新打包并打开浏览器。
