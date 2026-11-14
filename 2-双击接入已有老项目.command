#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================================"
echo "🛡️ 欢迎使用 GhostCTO（影子 CTO）老项目保护接入向导"
echo "请在弹出的窗口中，点击选择您已有的项目文件夹..."
echo "========================================================"

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
node "$SCRIPT_DIR/bin/ghost-cto.mjs" doctor "$TARGET_DIR"

osascript -e "display dialog \"🎉 影子 CTO 保护护栏已接入您的项目！\\n\\n现在用 豆包 / Trae / WorkBuddy / Cursor 打开该项目文件夹，直接说「帮我做一次全面体检」或正常提修改需求即可！\" buttons {\"好的\"} default button 1 with title \"🛡️ 接入完成\"" >/dev/null 2>&1 || true

echo ""
echo "🎉 接入完成！现在用 WorkBuddy / 豆包 / Trae / Antigravity / Cursor 打开该项目即可！"
