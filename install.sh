#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-$(pwd)}"

echo "🛡️ 正在将 GhostCTO（影子 CTO）安装到项目：$TARGET_DIR"
node "$SCRIPT_DIR/bin/ghost-cto.mjs" init "$TARGET_DIR"
node "$SCRIPT_DIR/bin/ghost-cto.mjs" doctor "$TARGET_DIR"
