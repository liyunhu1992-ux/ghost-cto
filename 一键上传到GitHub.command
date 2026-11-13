#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

echo "========================================================"
echo "🚀 GhostCTO（影子 CTO）v2.0.0 一键开源发布到 GitHub 向导"
echo "========================================================"

EXISTING_URL=$(git remote get-url origin 2>/dev/null || true)
DEFAULT_INPUT="${EXISTING_URL:-https://github.com/你的用户名/ghost-cto}"

REPO_URL=$(osascript -e "try
  text returned of (display dialog \"第 1 步：在浏览器打开 github.com/new 新建公开仓库（Repository name 填 ghost-cto，选 Public，不要勾选 Add a README）。\n\n第 2 步：把浏览器里的仓库网址粘贴在下方，点【立即开源发布】：\" default answer \"${DEFAULT_INPUT}\" buttons {\"取消\", \"立即开源发布\"} default button \"立即开源发布\" with title \"🚀 一键发布 GhostCTO 到 GitHub\")
on error
  return \"\"
end try" 2>/dev/null || true)

# 去除首尾空格与末尾斜杠
REPO_URL="$(echo "$REPO_URL" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's#/$##')"

if [ -z "$REPO_URL" ] || [[ "$REPO_URL" == *"你的用户名"* ]]; then
  echo "ℹ️ 未输入有效的 GitHub 仓库地址，已安全取消。"
  exit 0
fi

# 如果用户直接复制了浏览器地址栏链接（没有 .git 后缀），自动补齐
if [[ "$REPO_URL" == https://github.com/* ]] && [[ "$REPO_URL" != *.git ]]; then
  REPO_URL="${REPO_URL}.git"
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

git branch -M main
git tag -f v2.0.0

echo ""
echo "📤 正在将 GhostCTO 完整源码与 v2.0.0 版本标签推送到：$REPO_URL ..."
echo "（如弹出 GitHub 登录框，请按提示授权登录）"
echo ""

if git push -u origin main --tags; then
  WEB_URL="${REPO_URL%.git}"
  echo ""
  echo "🎉 恭喜！GhostCTO v2.0.0 已成功开源上线：$WEB_URL"
  osascript -e "display dialog \"🎉 开源发布成功！\n\n你的 GitHub 仓库已上线：\n${WEB_URL}\n\n点击【打开仓库主页】即可查看动态演示大屏！\" buttons {\"打开仓库主页\"} default button \"打开仓库主页\" with title \"GhostCTO 开源成功\"" >/dev/null 2>&1 || true
  open "$WEB_URL" 2>/dev/null || true
else
  echo ""
  echo "⚠️ 首次推送未直接通过，常见原因只有 2 个："
  echo "  1. 你在 GitHub 创建仓库时不小心勾选了 Add README（远端多了一个空白文件）；"
  echo "  2. 你的电脑还没登录 GitHub 账号（可下载 GitHub Desktop 登录一次，或按弹窗输入账号/Token）。"
  echo ""
  FORCE_CHOICE=$(osascript -e 'try
    button returned of (display dialog "推送遇到提示：\n如果你刚才创建仓库时不小心勾选了 Add README，点【覆盖空白初始文件】即可一键推上去；\n如果是还没登录 GitHub，请先点【稍后重试】。" buttons {"稍后重试", "覆盖空白初始文件"} default button "稍后重试" with title "GitHub 推送助手")
  on error
    return "稍后重试"
  end try' 2>/dev/null || true)

  if [ "$FORCE_CHOICE" = "覆盖空白初始文件" ]; then
    if git push -u origin main --tags --force; then
      WEB_URL="${REPO_URL%.git}"
      echo "🎉 覆盖空白初始文件成功！仓库已上线：$WEB_URL"
      open "$WEB_URL" 2>/dev/null || true
    else
      echo "❌ 仍未推送成功，请检查 GitHub 账号登录状态或仓库网址是否正确。"
    fi
  fi
fi

echo ""
read -n 1 -s -r -p "按任意键关闭此窗口..."
echo ""
