#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================================"
echo "🛡️ 欢迎使用 GhostCTO（影子 CTO）零代码双击安装向导"
echo "请在弹出的窗口中，点击选择您要保护的项目文件夹..."
echo "========================================================"

TARGET_DIR=$(osascript -e 'try
  POSIX path of (choose folder with prompt "🛡️ 请选择您要安装「影子 CTO」的项目文件夹：")
on error
  return ""
end try' 2>/dev/null || true)

if [ -z "$TARGET_DIR" ]; then
  echo "ℹ️ 您取消了文件夹选择，未做任何修改。"
  exit 0
fi

# Strip trailing slash unless root
TARGET_DIR="${TARGET_DIR%/}"

node "$SCRIPT_DIR/bin/ghost-cto.mjs" init "$TARGET_DIR"
node "$SCRIPT_DIR/bin/ghost-cto.mjs" doctor "$TARGET_DIR"

if [ -f "$TARGET_DIR/老板全景驾驶舱.html" ]; then
  echo "🚀 正在为您自动打开《老板全景驾驶舱.html》..."
  open "$TARGET_DIR/老板全景驾驶舱.html"
fi

echo ""
echo "🎉 安装大功告成！您现在可以用 WorkBuddy / 豆包 / Trae / Antigravity / Cursor 打开该项目了！"
