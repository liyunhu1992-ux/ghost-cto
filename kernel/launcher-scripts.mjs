import fs from 'node:fs';
import path from 'node:path';
import { detectRuntimeTopology } from './memory-capsule.mjs';

function logNonFatal(err) {
  if (process.env.GHOST_DEBUG) {
    console.error('[ghost-cto:launcher]', err?.message || err);
  }
}

/**
 * Generate self-healing double-click launcher scripts (`双击启动项目.command` & `双击启动项目.bat`)
 * keeping the user's project root clean, zero-dependency offline-fast, and friendly even before Step 1.
 */
export function generateSelfHealingLaunchers(workspace, options = {}) {
  const runtime = detectRuntimeTopology(workspace);
  const primaryPort = runtime.ports.length > 0 ? runtime.ports[runtime.ports.length - 1] : 3090;
  const portsStr = runtime.ports.join(' ');

  const staleBuildCmds = workspace.staleBuilds
    .map(sb => sb.buildCmd || (sb.appDir === '.' ? 'npm run build' : `npm --prefix "${sb.appDir}" run build`))
    .join('\n');

  const macScript = `#!/bin/bash
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$HOME/.fnm/current/bin:$PATH"
if ! command -v node >/dev/null 2>&1 && [ -d "$HOME/.nvm/versions/node" ]; then
  NVM_LATEST=$(ls -d "$HOME/.nvm/versions/node/"* 2>/dev/null | tail -n 1)
  [ -n "$NVM_LATEST" ] && export PATH="$NVM_LATEST/bin:$PATH"
fi

echo "===================================================="
echo "🛡️ 影子 CTO (GhostCTO) 自愈式一键启动器"
echo "项目：${runtime.projectName}"
echo "===================================================="

if ! command -v node >/dev/null 2>&1; then
  echo "❌ 尚未检测到免费运行环境 Node.js（装一次终身可用）。"
  BTN=$(osascript -e 'button returned of (display dialog "电脑还差一个免费的底层运行环境 Node.js（1分钟即可装好）。\\n\\n点击下方按钮打开官网，下载左侧 LTS 版本一路点下一步安装即可！" buttons {"稍后", "打开 Node.js 官网下载"} default button 2 with title "影子 CTO 环境提示")' 2>/dev/null || echo "")
  [ "$BTN" = "打开 Node.js 官网下载" ] && open "https://nodejs.org/zh-cn"
  exit 1
fi

if [ ! -f "package.json" ] && [ ! -f "src/server.mjs" ] && [ ! -f "main.py" ] && [ ! -f "app.py" ] && [ ! -f "index.html" ]; then
  echo ""
  echo "🌱 当前新项目的防崩护栏已经装好啦，还没有生成产品代码哦！"
  echo "👉 下一步超简单："
  echo "   1. 打开 豆包 / Trae / 腾讯 WorkBuddy / Cursor / Antigravity，点击「打开文件夹」选中当前文件夹；"
  echo "   2. 在聊天框直接用大白话告诉 AI 你想做什么（品牌官网、多模块 AI SaaS 平台、效率工具、微信小程序均可）；"
  echo "   3. 等 AI 替你做好第一版后，再回来双击我就能直接打开网页体验啦！"
  echo ""
  osascript -e 'display dialog "🌱 保护护栏已就绪！\\n\\n请先用 豆包 / Trae / WorkBuddy / Cursor / Antigravity 打开本文件夹，在聊天框告诉 AI 你想做什么（官网、SaaS 系统、工具、小程序均可）。生成后再双击启动即可！" buttons {"明白啦"} default button 1 with title "影子 CTO 温馨提示"' >/dev/null 2>&1 || true
  exit 0
fi

for PORT in ${portsStr || primaryPort}; do
  PID=$(lsof -ti tcp:$PORT 2>/dev/null)
  if [ -n "$PID" ]; then
    echo "🧹 发现端口 $PORT 被旧进程占用，正在自动清理..."
    kill -9 $PID 2>/dev/null || true
  fi
done

if [ -f "package.json" ] && [ ! -d "node_modules" ] && grep -Eq '"(dependencies|devDependencies)"' package.json; then
  echo "📦 首次运行，正在安装项目依赖包..."
  npm install
fi

GHOST_CLI=""
if [ -f ".vibe/engine/bin/ghost-cto.mjs" ]; then
  GHOST_CLI=".vibe/engine/bin/ghost-cto.mjs"
elif [ -f "bin/ghost-cto.mjs" ]; then
  GHOST_CLI="bin/ghost-cto.mjs"
fi

if [ -n "$GHOST_CLI" ]; then
  VERIFY_ERR=$(node "$GHOST_CLI" verify --syntax-only --dir "$(pwd)" 2>&1 >/dev/null || true)
  if [ -n "$VERIFY_ERR" ]; then
    echo "$VERIFY_ERR"
    printf "我的项目启动前抓到了以下错误，请精准修复并通过 verify：\\n%s\\n" "$VERIFY_ERR" | pbcopy 2>/dev/null || true
    CHOICE=$(osascript -e 'button returned of (display dialog "🛡️ 影子 CTO 抓到 AI 刚才写漏了一个代码错误（已自动把精准修复话术复制到您的剪贴板）！\\n\\n您可以：\\n1. 去聊天框直接粘贴（Cmd+V）让 AI 秒修；\\n2. 或者点「一键退回上一版并启动」立刻恢复正常使用！" buttons {"去粘贴让AI修", "⏪ 一键退回上一版并启动"} default button 2 with title "🛡️ 影子 CTO 防崩拦截")' 2>/dev/null || echo "")
    if [ "$CHOICE" = "⏪ 一键退回上一版并启动" ]; then
      node "$GHOST_CLI" rewind latest --dir "$(pwd)"
    else
      exit 1
    fi
  fi
fi

${staleBuildCmds ? `echo "🔨 正在同步最新界面打包文件..."\n${staleBuildCmds} || true` : '# 无需静态预打包'}

if [ -f "miniprogram/project.config.json" ]; then
  echo "📱 检测到本项目已同步生成【微信小程序原生端】(miniprogram/ 目录)！"
  echo "   保持本窗口开启，用免费的「微信开发者工具」导入本项目里的 miniprogram 文件夹即可真机预览小程序！"
fi

(sleep 1.2 && open "http://127.0.0.1:${primaryPort}") &

echo "🚀 服务启动中！浏览器即将自动打开 http://127.0.0.1:${primaryPort}"
echo "（保持本窗口开启即可使用，关闭本窗口即停止服务）"
if [ -f "src/server.mjs" ] && ! grep -Eq '"dependencies"' package.json 2>/dev/null; then
  node src/server.mjs
else
  ${runtime.startCmd}
fi
`;

  const winScript = `@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ====================================================
echo [GhostCTO] 影子 CTO 自愈式一键启动器
echo 项目：${runtime.projectName}
echo ====================================================

where node >nul 2>&1
if errorlevel 1 (
  echo [环境提示] 尚未检测到免费的底层运行环境 Node.js（1分钟即可安装）。
  echo 正在为您打开 Node.js 中文官网，请下载 LTS 版本安装后再双击启动！
  start "" "https://nodejs.org/zh-cn"
  pause
  exit /b 1
)

if not exist "package.json" if not exist "src\\server.mjs" if not exist "main.py" if not exist "app.py" (
  echo.
  echo [温馨提示] 当前新项目的防崩护栏已装好，尚未生成产品代码！
  echo 请先用 豆包 / Trae / 腾讯 WorkBuddy / Cursor / Antigravity 打开本文件夹，在聊天框告诉 AI 你想做什么。
  echo 等 AI 做好第一版后，再双击本脚本即可自动打开网页！
  echo.
  pause
  exit /b 0
)

if exist "package.json" (
  if not exist "node_modules" (
    findstr /i "\\"dependencies\\" \\"devDependencies\\"" package.json >nul 2>&1
    if not errorlevel 1 (
      echo 首次运行，正在安装项目依赖包...
      call npm install
    )
  )
)

if exist ".vibe\\engine\\bin\\ghost-cto.mjs" (
  node ".vibe\\engine\\bin\\ghost-cto.mjs" verify --syntax-only --dir "%cd%" >nul
  if errorlevel 1 (
    echo.
    echo [防崩拦截] 检测到 AI 留有语法或依赖缺失错误！请把上方红色报错复制粘贴给 AI 修复，或对 AI 说“退回上一版”。
    pause
    exit /b 1
  )
)

if exist "miniprogram\\project.config.json" (
  echo [小程序端已就绪] 保持本窗口开启，用免费的“微信开发者工具”导入 miniprogram 文件夹即可预览小程序！
)

start "" "http://127.0.0.1:${primaryPort}"
echo 浏览器正在打开 http://127.0.0.1:${primaryPort} （请保持此窗口开启）
if exist "src\\server.mjs" (
  findstr /i "\\"dependencies\\"" package.json >nul 2>&1
  if errorlevel 1 (
    node src\\server.mjs
    pause
    exit /b 0
  )
)
call ${runtime.startCmd}
pause
`;

  const macPath = path.join(workspace.rootDir, '双击启动项目.command');
  const winPath = path.join(workspace.rootDir, '双击启动项目.bat');
  const liveMacPath = path.join(workspace.rootDir, '.vibe', '打开体检报告看板.command');
  const liveWinPath = path.join(workspace.rootDir, '.vibe', '打开体检报告看板.bat');
  fs.mkdirSync(path.join(workspace.rootDir, '.vibe'), { recursive: true });

  const cliEntryPosix = fs.existsSync(path.join(workspace.rootDir, '.vibe', 'engine', 'bin', 'ghost-cto.mjs'))
    ? '.vibe/engine/bin/ghost-cto.mjs'
    : 'bin/ghost-cto.mjs';
  const cliEntryWin = cliEntryPosix.replace(/\//g, '\\');

  const liveMacScript = `#!/bin/bash\ncd "$(dirname "$0")/.."\nnode "${cliEntryPosix}" studio --dir "$(pwd)"\n`;
  const liveWinScript = `@echo off\nchcp 65001 >nul\ncd /d "%~dp0\\.."\nnode "${cliEntryWin}" studio --dir "%cd%"\npause\n`;

  fs.writeFileSync(liveMacPath, liveMacScript, { encoding: 'utf8', mode: 0o755 });
  fs.writeFileSync(liveWinPath, liveWinScript, 'utf8');
  try {
    fs.chmodSync(liveMacPath, 0o755);
  } catch (err) {
    logNonFatal(err);
  }

  if (!options.skipRootLaunchers) {
    fs.writeFileSync(macPath, macScript, { encoding: 'utf8', mode: 0o755 });
    fs.writeFileSync(winPath, winScript, 'utf8');
    try {
      fs.chmodSync(macPath, 0o755);
    } catch (err) {
      logNonFatal(err);
    }
  }

  return { macPath, winPath, liveMacPath, liveWinPath, primaryPort, startCmd: runtime.startCmd };
}
