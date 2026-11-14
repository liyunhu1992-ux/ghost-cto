#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================================"
echo "🌱 欢迎使用 GhostCTO（影子 CTO）零基础新项目创建向导"
echo "========================================================"

PROJ_NAME=$(osascript -e 'try
  text returned of (display dialog "给你的新作品起个名字（将自动在您的【桌面】建好干净文件夹并配齐影子 CTO 保护）：" default answer "我的第一个AI小工具" buttons {"取消", "立即创建"} default button "立即创建" with title "🌱 影子 CTO · 新建空白项目")
on error
  return ""
end try' 2>/dev/null || true)

if [ -z "$PROJ_NAME" ]; then
  echo "ℹ️ 已取消创建。"
  exit 0
fi

TARGET_DIR="$HOME/Desktop/$PROJ_NAME"
node "$SCRIPT_DIR/bin/ghost-cto.mjs" create "$PROJ_NAME" --parent "$HOME/Desktop"
node "$SCRIPT_DIR/bin/ghost-cto.mjs" doctor "$TARGET_DIR"

open "$TARGET_DIR" 2>/dev/null || true

osascript -e "display dialog \"🎉 已在【桌面】为您建好干净新项目：\\n$PROJ_NAME\\n\\n👉 下一步（无需背任何提示词）：\\n1. 打开 豆包 / Trae / 腾讯 WorkBuddy / Cursor\\n2. 点击【打开文件夹】，选择桌面上的「$PROJ_NAME」\\n3. 在聊天框直接用大白话告诉 AI 你想做什么即可！\" buttons {\"太棒了，去开聊！\"} default button 1 with title \"🛡️ 影子 CTO 已就绪\"" >/dev/null 2>&1 || true

echo ""
echo "🎉 新项目已就绪：$TARGET_DIR"
echo "👉 现在打开 豆包 / Trae / WorkBuddy / Cursor 选中它，直接在聊天框说一句你想做什么吧！"
