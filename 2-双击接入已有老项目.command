#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$HOME/.fnm/current/bin:$PATH"
if ! command -v node >/dev/null 2>&1 && [ -d "$HOME/.nvm/versions/node" ]; then
  NVM_LATEST=$(ls -d "$HOME/.nvm/versions/node/"* 2>/dev/null | tail -n 1)
  [ -n "$NVM_LATEST" ] && export PATH="$NVM_LATEST/bin:$PATH"
fi

echo "========================================================"
echo "🛡️ 欢迎使用 GhostCTO（影子 CTO）老项目保护接入向导"
echo "请在弹出的窗口中，点击选择您已有的项目文件夹..."
echo "========================================================"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ 尚未检测到免费运行环境 Node.js（装一次终身可用）。"
  BTN=$(osascript -e 'button returned of (display dialog "电脑还差一个免费的底层运行环境 Node.js（1分钟即可装好）。\n\n点击下方按钮打开官网，下载左侧 LTS 版本一路点下一步安装后，再双击本文件即可！" buttons {"取消", "打开 Node.js 官网下载"} default button 2 with title "🛡️ 影子 CTO 环境提示")' 2>/dev/null || echo "")
  [ "$BTN" = "打开 Node.js 官网下载" ] && open "https://nodejs.org/zh-cn"
  exit 1
fi

TARGET_DIR=$(osascript -e 'try
  POSIX path of (choose folder with prompt "🛡️ 请选择您已有的业务项目文件夹（切勿选 GhostCTO 安装包本身）：")
on error
  return ""
end try' 2>/dev/null || true)

if [ -z "$TARGET_DIR" ]; then
  echo "ℹ️ 您取消了文件夹选择，未做任何修改。"
  exit 0
fi

TARGET_DIR="${TARGET_DIR%/}"

node "$SCRIPT_DIR/bin/ghost-cto.mjs" init "$TARGET_DIR"
xattr -cr "$TARGET_DIR" 2>/dev/null || true
node "$SCRIPT_DIR/bin/ghost-cto.mjs" doctor "$TARGET_DIR"

osascript -e "display dialog \"✅ 已为您的项目开启自动备份与防改崩保护！\\n\\n接下来怎么做？\\n1. 平时什么按钮都不用额外点，直接在 AI 聊天框照常说大白话提需求就行；\\n2. 万一 AI 把项目改乱了，对 AI 说一句「退回上一版」就能连代码带数据一起恢复。\" buttons {\"明白啦\"} default button 1 with title \"🛡️ 保护已开启\"" >/dev/null 2>&1 || true

echo ""
echo "✅ 保护已开启！平时什么都不用额外点，直接在 AI 聊天框照常说大白话提需求即可；改坏了说一句「退回上一版」就能恢复。"
