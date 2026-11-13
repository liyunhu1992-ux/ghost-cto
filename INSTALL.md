# GhostCTO（影子 CTO）v2.0 安装与国内软件配置指南

只需要电脑装有基础 `Node.js >= 18`，**零第三方依赖、不需要联网下载额外包、不会弹出英文越权弹窗**。

---

## 1. 纯小白最推荐方式：双击弹窗选文件夹（一行命令都不敲！）

如果你从 GitHub 下载并解压了本仓库：
- **苹果电脑 (macOS)**：直接双击文件夹里的 **`双击安装到我的项目.command`**，在弹出的访达（Finder）窗口中点选你的业务项目文件夹，它会自动完成 8 大软件安装、22 项真机自检，并自动为你打开《老板全景驾驶舱.html》！
- **Windows 电脑**：直接双击文件夹里的 **`双击安装到我的项目.bat`**，在弹出的窗口中点选你的业务项目文件夹即可！

---

## 2. 让 AI 替你装 / 命令行一键安装

### 发一句话给 AI 软件替你装
打开你正在用的 **腾讯 WorkBuddy / 豆包编程 / Trae / Antigravity / Cursor**，直接发一句中文：

> 请运行 `npx ghost-cto init` 帮当前项目装上影子 CTO，并跑一遍 `doctor` 自检。

### 终端一行命令
macOS / Linux：
```bash
./install.sh /你的项目文件夹路径
```
Windows PowerShell：
```powershell
.\install.ps1 C:\你的项目文件夹路径
```
或者直接用 `npx`：
```bash
npx ghost-cto try                      # 1秒沙箱全链路真机演练
npx ghost-cto init /你的项目文件夹路径  # 一键安装到你的项目
npx ghost-cto studio /你的项目文件夹路径 # 启动 0-Token 实时交互版网页驾驶舱
```

---

## 3. 各大国内外软件打开后的效果

| 你用的软件 | 你需要手动做什么吗？ | 生效机制 |
| :--- | :--- | :--- |
| **腾讯 WorkBuddy** | **不需要**，直接打开项目文件夹即可 | 自动识别 `.workbuddy/rules/`、`.workbuddy/skills/` 与 `.workbuddy/mcp.json`（无损保留原有 MCP） |
| **腾讯 CodeBuddy** | **不需要**，直接打开项目文件夹即可 | 自动识别 `.codebuddy/CODEBUDDY.md`、`.codebuddy/skills/` 与 `.codebuddy/mcp.json` |
| **字节 Trae IDE / 豆包编程插件** | **不需要**，直接打开项目文件夹即可 | 自动识别 `.trae/rules/project_rules.md`、`.trae/skills/` 与 `.trae/mcp.json` |
| **字节 豆包桌面客户端** | 在豆包桌面版「MCP 设置」导入 `.vibe/豆包桌面版与WorkBuddy_MCP配置.json` | 导入后即可在豆包对话里直接调用全部 7 个影子 CTO 体检、大师提示词与时光机工具 |
| **Google Antigravity** | **不需要**，打开项目自动生效 | 自动加载根目录 `AGENTS.md`、`.agents/skills/` 与 `.agents/plugins/ghost-cto/` |
| **Cursor / Claude Code / Windsurf** | **不需要**，打开项目自动生效 | 自动挂载 `.cursor/rules/`、`CLAUDE.md`、`.mcp.json` 与 `.windsurf/rules/` |

---

## 4. 装完后项目里多出来的 3 个中文神器怎么用？

1. **`老板全景驾驶舱.html`（离线快照版）**：随时双击打开。不用看一行代码，直接看健康分、较初检涨了多少分、8 套自动带入你项目数据表的卡兹克/Karpathy 大师提示词，以及一键复制修复话术。
2. **`打开实时驾驶舱.command` / `.bat`（0-Token 实时交互版）**：双击启动本地引擎直连！不花 1 个大模型 Token，直接在网页上点按钮即可**「立即重新体检刷新分数」**、**「一键双备份代码+数据库」**、**「一键秒退回历史好版本」**、**「搜中文按钮名秒查影响范围」**！
3. **`双击启动项目.command` / `.bat`（防打不开自愈启动器）**：隔天重启电脑网页打不开、或者端口卡死报错 `EADDRINUSE` 时，双击它自动清理旧端口、自动补打包并打开浏览器。
